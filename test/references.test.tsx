import { d } from "@alloy-js/core/testing";
import { Model } from "@typespec/compiler";
import { it } from "vitest";
import { ZodSchema } from "../src/components/ZodSchema.jsx";
import { createTestRunner, expectRender } from "./utils.jsx";

it("works with enums", async () => {
  const runner = await createTestRunner();
  const { Refs } = (await runner.compile(`
    enum Test1 {
      A
    }

    enum Test2 {
      A: 1
    }

    enum Test3 {
      A: "one"
    }

    @test model Refs {
      a: Test1.A,
      b: Test2.A,
      c: Test3.A
    }
  `)) as Record<string, Model>;

  expectRender(
    <ZodSchema type={Refs} />,
    d`
      z.object({
        a: z.literal("A"),
        b: z.literal(1),
        c: z.literal("one"),
      })
    `,
  );
});
