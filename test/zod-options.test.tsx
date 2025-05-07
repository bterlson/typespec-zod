import { StatementList } from "@alloy-js/core";
import { d } from "@alloy-js/core/testing";
import { Model } from "@typespec/compiler";
import { $ } from "@typespec/compiler/typekit";
import { it } from "vitest";
import { ZodOptions } from "../src/components/ZodOptions.jsx";
import { ZodTypeEmitOptions } from "../src/context/zod-options.js";
import { ZodSchemaDeclaration } from "../src/index.js";
import { createTestRunner, expectRender } from "./utils.jsx";

it("allows providing custom zod options to control how a type renders", async () => {
  const runner = await createTestRunner();
  const { MyModel, MyModel2, MyModel3, MyModel4, shortString } =
    await runner.compile(`
    @maxLength(10)
    @test
    scalar shortString extends string;

    @minLength(5)
    scalar longerShortString extends shortString;

    @test model MyModel {
      id: string;
      m2: MyModel2;
    }

    @test model MyModel2 {
      prop: string;
    }

    @test model MyModel3 {
      prop1: [string];
      prop2: string[];
      prop3: string | int32;
      prop4: string;
      prop5: shortString;
      prop6: longerShortString;
    }
    
    @test model MyModel4 {
    }
  `);

  const customTypeEmit: ZodTypeEmitOptions[] = [
    { type: MyModel2, reference: () => <>/* MyModel2 */</> },
    {
      type: $(runner.program).builtin.string,
      reference: () => <>/* string */</>,
    },
    {
      type: (MyModel3 as Model).properties.get("prop4")!,
      declare: () => "prop 4!!",
    },
    {
      type: MyModel4,
      declare(props) {
        return (
          <>
            // This is a comment for the declaration.
            <hbr />
            {props.default}
          </>
        );
      },
    },
    {
      type: shortString,
      noDeclaration: true,
      reference(props) {
        return <>/* {props.default} */ null</>;
      },
    },
  ];

  const template = (
    <ZodOptions typeEmitOptions={customTypeEmit}>
      <StatementList>
        <ZodSchemaDeclaration type={MyModel} />
        <ZodSchemaDeclaration type={MyModel2} />
        <ZodSchemaDeclaration type={MyModel3} />
        <ZodSchemaDeclaration type={MyModel4} />
      </StatementList>
    </ZodOptions>
  );

  expectRender(
    runner.program,
    template,
    d`
      const MyModel = z.object({
        id: /* string */,
        m2: /* MyModel2 */,
      });
      const MyModel2 = /* MyModel2 */;
      const MyModel3 = z.object({
        prop1: z.tuple([/* string */]),
        prop2: z.array(/* string */),
        prop3: z.union([
          /* string */,
          z.number().int().gte(-2147483648).lte(2147483647)
        ]),
        prop 4!!,
        prop5: /* z.string().max(10) */ null,
        prop6: /* z.string().min(5).max(10) */ null,
      });
      // This is a comment for the declaration.
      const MyModel4 = z.object({});
    `,
  );
});
