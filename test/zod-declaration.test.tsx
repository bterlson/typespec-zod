import { d } from "@alloy-js/core/testing";
import { FunctionCallExpression, SourceFile } from "@alloy-js/typescript";
import { it } from "vitest";
import { ZodExpression } from "../src/components/ZodExpression.jsx";
import {
  createEmitterTestRunner,
  createTestRunner,
  expectRender,
} from "./utils.jsx";
import { Output, refkey } from "@alloy-js/core";
import { ZodSchemaDeclaration } from "../src/index.js";

it("allows specifying refkey", async () => {
  const rk = refkey();
  const runner = await createTestRunner();
  const { MyModel } = await runner.compile(`
    @test model MyModel {
      id: string;
    }
  `);

  const template = (
    <>
      <ZodSchemaDeclaration type={MyModel} name="foo" refkey={rk} />;<hbr />
      {rk};
    </>
  );

  expectRender(
    template,
    d`
      const foo = z.object({
        id: z.string(),
      });
      foo;
    `,
  );
});

// https://github.com/bterlson/typespec-zod/issues/3
it.skip("allows specifying a refkey dynamically", async () => {
  const runner = await createTestRunner();
  const { MyModel } = await runner.compile(`
    @test model MyModel {
      id: string;
    }
  `);

  const template = (
    <>
      <ZodSchemaDeclaration type={MyModel} name="foo" refkey={refkey()} />;
      <hbr />
    </>
  );

  expectRender(
    template,
    d`
      const foo = z.object({
        id: z.string(),
      });
      foo;
    `,
  );
});
