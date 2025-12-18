import { expect, it } from "vitest";
import { newTopologicalTypeCollector } from "../src/utils.js";
import { createTestRunner } from "./utils.jsx";

it("topologically sorts types with cycles", async () => {
  const runner = await createTestRunner();
  const { Test, Test2, Test3 } = await runner.compile(`
    @test model Test {
      prop: Test2;
      prop2: string;
    }

    @test model Test2 {
      prop: Test3;
      prop3: numeric;
    }

    @test model Test3 {
      prop: Test2
    }
  `);

  const collector = newTopologicalTypeCollector(runner.program);
  collector.collectType(Test);
  collector.collectType(Test2);
  collector.collectType(Test3);

  const types = collector.types;

  // Test3 and Test2 form a cycle, so they should appear before Test
  // The exact order of Test3 and Test2 within the cycle may vary
  const test3Index = types.indexOf(Test3);
  const test2Index = types.indexOf(Test2);
  const testIndex = types.indexOf(Test);

  // Both Test3 and Test2 should come before Test
  expect(test3Index).toBeLessThan(testIndex);
  expect(test2Index).toBeLessThan(testIndex);

  // Test is at the end since it depends on Test2 (which is in a cycle with Test3)
  expect(types[types.length - 1]).toBe(Test);
});
