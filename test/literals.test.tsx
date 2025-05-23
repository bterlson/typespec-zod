import { ModelProperty } from "@typespec/compiler";
import { it } from "vitest";
import { ZodSchema } from "../src/components/ZodSchema.jsx";
import { createTestRunner, expectRender } from "./utils.jsx";

it("works with literals", async () => {
  const runner = await createTestRunner();
  const { stringProp, numberProp, booleanProp } = (await runner.compile(`
    model Test {
      @test
      stringProp: "hello",

      @test
      numberProp: 123,

      @test
      booleanProp: true,
    }
  `)) as Record<string, ModelProperty>;

  expectRender(
    runner.program,
    <ZodSchema type={stringProp.type} />,
    'z.literal("hello")',
  );
  expectRender(
    runner.program,
    <ZodSchema type={numberProp.type} />,
    "z.literal(123)",
  );
  expectRender(
    runner.program,
    <ZodSchema type={booleanProp.type} />,
    "z.literal(true)",
  );
});
