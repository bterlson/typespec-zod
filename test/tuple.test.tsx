import { StatementList } from "@alloy-js/core";
import { d } from "@alloy-js/core/testing";
import { ModelProperty } from "@typespec/compiler";
import { it } from "vitest";
import { ZodSchemaDeclaration } from "../src/index.js";
import { createTestRunner, expectRender } from "./utils.jsx";

it("works", async () => {
  const runner = await createTestRunner();
  const { Test, Ref } = (await runner.compile(`
    @test model Ref {}

    model Container {
      @test Test: ["one", { a: 1, b: 2 }, Ref];
    }
  `)) as Record<string, ModelProperty>;

  expectRender(
    <StatementList>
      <ZodSchemaDeclaration type={Ref} />
      <ZodSchemaDeclaration type={Test.type} name="tuple" />
    </StatementList>,
    d`
      const Ref = z.object({});
      const tuple = z.tuple([
        z.literal("one"),
        z.object({
          a: z.literal(1),
          b: z.literal(2),
        }),
        Ref
      ]);
    `,
  );
});
