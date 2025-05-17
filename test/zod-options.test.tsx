import { For, render, StatementList } from "@alloy-js/core";
import { d } from "@alloy-js/core/testing";
import { MemberExpression, SourceFile } from "@alloy-js/typescript";
import { Model, Program, Type } from "@typespec/compiler";
import { $ } from "@typespec/compiler/typekit";
import { Output } from "@typespec/emitter-framework";
import { describe, expect, test } from "vitest";
import { ZodOptions } from "../src/components/ZodOptions.jsx";
import {
  zod,
  ZodCustomEmitOptions,
  ZodSchemaDeclaration,
} from "../src/index.js";
import { createTestRunner } from "./utils.jsx";
interface GenericTestDescriptor {
  program: Program;
  types: Type[];
}
interface DeclTestDescriptor {
  type?: Type;
  refType: Type;
  refContainer: Model;
  program: Program;
  reference?: string;
}

type TestDescriptor = DeclTestDescriptor | GenericTestDescriptor;
async function testFor(
  code: string,
  options: { types: true },
): Promise<GenericTestDescriptor>;
async function testFor(
  code: string,
  options?: { referenceOnly?: true; reference?: string },
): Promise<DeclTestDescriptor>;
async function testFor(
  code: string,
  options: {
    referenceOnly?: boolean;
    reference?: string;
    types?: boolean;
  } = {},
): Promise<TestDescriptor> {
  options.reference ??= "Test";
  const runner = await createTestRunner();
  let testCode: string;

  if (options.types) {
    testCode = code;
  } else if (options.referenceOnly) {
    testCode = `@test model RefTest { ref: ${code} }`;
  } else {
    testCode =
      `@test ` + code + `\n@test model RefTest { ref: ${options.reference} }`;
  }

  if (options.types) {
    const typeRecord = await runner.compile(testCode);
    const types = Object.values(typeRecord);
    return {
      program: runner.program,
      types,
    };
  } else {
    const { Test, RefTest } = (await runner.compile(testCode)) as {
      Test: Type;
      RefTest: Model;
    };

    return {
      type: Test,
      refContainer: RefTest,
      refType: RefTest.properties.values().next().value!.type,
      program: runner.program,
      reference: options.reference,
    };
  }
}

export function expectOptionRender(
  test: TestDescriptor,
  options: ZodCustomEmitOptions,
  expected: string,
) {
  let template;
  if ("types" in test) {
    template = (
      <Output program={test.program} externals={[zod]}>
        <SourceFile path="test.ts">
          <ZodOptions customEmit={options}>
            <For each={test.types} semicolon hardline enderPunctuation>
              {(type) => <ZodSchemaDeclaration type={type} />}
            </For>
          </ZodOptions>
        </SourceFile>
      </Output>
    );
  } else {
    template = (
      <Output program={test.program} externals={[zod]}>
        <SourceFile path="test.ts">
          <ZodOptions customEmit={options}>
            <StatementList>
              {test.type && <ZodSchemaDeclaration type={test.type!} />}
              <ZodSchemaDeclaration type={test.refContainer} />
            </StatementList>
          </ZodOptions>
        </SourceFile>
      </Output>
    );
  }
  const output = render(template);
  let contents = output.contents[0].contents as string;
  if (contents.startsWith("import")) {
    contents = contents.split(/\n/).slice(2).join("\n");
  }
  expect(contents).toBe(d([expected] as any));
}

describe("customizing type kinds", () => {
  function typeKindOption(kind: Type["kind"]): ZodCustomEmitOptions {
    return ZodCustomEmitOptions().forTypeKind(kind, {
      declare() {
        return <>/* decl */</>;
      },
      reference() {
        return <>/* ref */</>;
      },
    });
  }

  test("Boolean", async () => {
    const test = await testFor(`true`, { referenceOnly: true });
    expectOptionRender(
      test,
      typeKindOption("Boolean"),
      `
        const RefTest = z.object({
          ref: /* ref */,
        });
      `,
    );
  });

  test("Enum", async () => {
    const test = await testFor(`enum Test {}`);
    expectOptionRender(
      test,
      typeKindOption("Enum"),
      `
        /* decl */;
        const RefTest = z.object({
          ref: /* ref */,
        });
      `,
    );
  });

  test("EnumMember", async () => {
    const test = await testFor(`enum Test { a: 1 }`, { reference: "Test.a" });
    expectOptionRender(
      test,
      typeKindOption("EnumMember"),
      `
        const Test = z.enum([/* decl */]);
        const RefTest = z.object({
          ref: /* ref */,
        });
      `,
    );
  });

  test("Intrinsic", async () => {
    const test = await testFor("null", { referenceOnly: true });
    expectOptionRender(
      test,
      typeKindOption("Intrinsic"),
      `
        const RefTest = z.object({
          ref: /* ref */,
        });
      `,
    );
  });

  test("Model", async () => {
    const test = await testFor(`model Test {}`);
    expectOptionRender(
      test,
      ZodCustomEmitOptions().forTypeKind("Model", {
        declare: (props) => <>/* A model */ {props.default}</>,
        reference: (props) => <>/* ref to a model */</>,
      }),
      `
        /* A model */ const Test = z.object({});
        /* A model */ const RefTest = z.object({
          ref: /* ref to a model */,
        });
      `,
    );
  });

  test("ModelProperty", async () => {
    const test = await testFor(`model Test { foo: string }`, {
      reference: "Test.foo",
    });
    expectOptionRender(
      test,
      ZodCustomEmitOptions().forTypeKind("ModelProperty", {
        declare: (props) => <>/* decl */ {props.default}</>,
        reference: (props) => <>/* ref */</>,
      }),
      `
        const Test = z.object({
          /* decl */ foo: z.string(),
        });
        const RefTest = z.object({
          /* decl */ ref: /* ref */,
        });
      `,
    );
  });

  test("Number", async () => {
    const test = await testFor("1", { referenceOnly: true });
    expectOptionRender(
      test,
      typeKindOption("Number"),
      `
        const RefTest = z.object({
          ref: /* ref */,
        });
      `,
    );
  });

  test("Scalar", async () => {
    const test = await testFor(`scalar Test;`);
    expectOptionRender(
      test,
      typeKindOption("Scalar"),
      `
        /* decl */;
        const RefTest = z.object({
          ref: /* ref */,
        });
      `,
    );
  });

  test("String", async () => {
    const test = await testFor(`"hi"`, { referenceOnly: true });
    expectOptionRender(
      test,
      typeKindOption("String"),
      `
        const RefTest = z.object({
          ref: /* ref */,
        });
      `,
    );
  });

  test("Tuple", async () => {
    const test = await testFor(`[1,2,3]`, { referenceOnly: true });
    expectOptionRender(
      test,
      typeKindOption("Tuple"),
      `
        const RefTest = z.object({
          ref: /* ref */,
        });
      `,
    );
  });

  test("Union", async () => {
    const test = await testFor(`union Test { variant: string }`);
    expectOptionRender(
      test,
      typeKindOption("Union"),
      `
        /* decl */;
        const RefTest = z.object({
          ref: /* ref */,
        });
      `,
    );
  });

  test("UnionVariant", async () => {
    const test = await testFor(`union Test { a: 1 }`, { reference: "Test.a" });
    expectOptionRender(
      test,
      typeKindOption("UnionVariant"),
      `
        const Test = z.union([z.literal(1)]);
        const RefTest = z.object({
          ref: /* ref */,
        });
      `,
    );
  });
});

describe("customizing specific types", () => {
  function typeOption(type: Type): ZodCustomEmitOptions {
    return ZodCustomEmitOptions().forType(type, {
      declare: (props) => <>/* decl */</>,
      reference: (props) => <>/* ref */</>,
    });
  }

  test("built-in", async () => {
    const test = await testFor(`boolean`, { referenceOnly: true });
    expectOptionRender(
      test,
      typeOption($(test.program).builtin.boolean),
      `
        const RefTest = z.object({
          ref: /* ref */,
        });
      `,
    );
  });

  test("enum", async () => {
    const test = await testFor(`enum Test {}`);
    expectOptionRender(
      test,
      typeOption(test.type!),
      `
        /* decl */;
        const RefTest = z.object({
          ref: /* ref */,
        });
      `,
    );
  });

  test("enum member", async () => {
    const test = await testFor(`enum Test { x: 1 }`, { reference: "Test.x" });
    expectOptionRender(
      test,
      typeOption(test.refType),
      `
        const Test = z.enum([/* decl */]);
        const RefTest = z.object({
          ref: /* ref */,
        });
      `,
    );
  });

  test("intrinsic", async () => {
    const test = await testFor(`null`, { referenceOnly: true });
    expectOptionRender(
      test,
      typeOption($(test.program).intrinsic.null),
      `
        const RefTest = z.object({
          ref: /* ref */,
        });
      `,
    );
  });

  test("model", async () => {
    const test = await testFor(`model Test {}`);
    expectOptionRender(
      test,
      ZodCustomEmitOptions().forType(test.type!, {
        declare: (props) => <>/* A model */ {props.default}</>,
        reference: (props) => <>/* ref to a model */</>,
      }),
      `
        /* A model */ const Test = z.object({});
        const RefTest = z.object({
          ref: /* ref to a model */,
        });
      `,
    );
  });

  test("model property", async () => {
    const test = await testFor(`model Test { prop: string }`, {
      reference: "Test.prop",
    });
    expectOptionRender(
      test,
      ZodCustomEmitOptions().forType(test.refType, {
        declare: (props) => <>/* A model property */</>,
        reference: (props) => <>/* ref to a model property */</>,
      }),
      `
        const Test = z.object({
          /* A model property */,
        });
        const RefTest = z.object({
          ref: /* ref to a model property */,
        });
      `,
    );
  });

  test("scalar", async () => {
    const test = await testFor(`scalar Test;`);
    expectOptionRender(
      test,
      typeOption(test.type!),
      `
        /* decl */;
        const RefTest = z.object({
          ref: /* ref */,
        });
      `,
    );
  });

  test("tuple", async () => {
    const test = await testFor(`[1]`, { referenceOnly: true });
    expectOptionRender(
      test,
      typeOption(test.refType),
      `
        const RefTest = z.object({
          ref: /* ref */,
        });
      `,
    );
  });

  test("union", async () => {
    const test = await testFor(`union Test {}`);
    expectOptionRender(
      test,
      typeOption(test.type!),
      `
        /* decl */;
        const RefTest = z.object({
          ref: /* ref */,
        });
      `,
    );
  });

  test("union variant", async () => {
    const test = await testFor(`union Test { x: 1 }`, { reference: "Test.x" });
    expectOptionRender(
      test,
      typeOption(test.refType),
      `
        const Test = z.union([z.literal(1)]);
        const RefTest = z.object({
          ref: /* ref */,
        });
      `,
    );
  });
});

describe("type customization signatures", () => {
  describe("customizing a variable declaration", () => {
    test("props.default", async () => {
      const test = await testFor(`@test model Test {}`, { types: true });
      const options = ZodCustomEmitOptions().forTypeKind("Model", {
        declare(props) {
          return (
            <>
              // a model declaration
              <hbr />
              {props.default}
            </>
          );
        },
      });

      await expectOptionRender(
        test,
        options,
        `
        // a model declaration
        const Test = z.object({});
        `,
      );
    });

    test("props.declarationProps & props.Declaration", async () => {
      const test = await testFor(`@test model Test {}`, { types: true });

      const options = ZodCustomEmitOptions().forTypeKind("Model", {
        declare(props) {
          expect(props.declarationProps.refkey).toBeDefined();
          expect(props.declarationProps.name).toBe("Test");
          return (
            <>
              // a model declaration
              <hbr />
              <props.Declaration {...props.declarationProps}>
                /* a declaration! */
              </props.Declaration>
            </>
          );
        },
      });

      await expectOptionRender(
        test,
        options,
        `
        // a model declaration
        const Test = /* a declaration! */;
        `,
      );
    });

    test("assembling parts", async () => {
      const test = await testFor(
        `
          /**
           * A scalar value is pretty neat!
           */
          @test @minValue(12) scalar Test extends int32;
        `,
        { types: true },
      );
      const options = ZodCustomEmitOptions().forTypeKind("Scalar", {
        declare(props) {
          return (
            <props.Declaration {...props.declarationProps}>
              <MemberExpression>
                {props.baseSchemaParts()}
                {props.constraintParts()}
                {props.descriptionParts()}
                <MemberExpression.Part id="nifty" />
              </MemberExpression>
            </props.Declaration>
          );
        },
      });

      await expectOptionRender(
        test,
        options,
        `
          const Test = z
            .number()
            .int()
            .gte(12)
            .lte(2147483647)
            .describe("A scalar value is pretty neat!")
            .nifty;
        `,
      );
    });
  });

  describe("customizing a reference", () => {
    test("default", async () => {
      const test = await testFor(`@test model Test {}`);

      const options = ZodCustomEmitOptions().forTypeKind("Model", {
        reference(props) {
          return <>/* a reference */{props.default}</>;
        },
      });

      expectOptionRender(
        test,
        options,
        `
          const Test = z.object({});
          const RefTest = z.object({
            ref: /* a reference */Test,
          });
        `,
      );
    });
    test("props.type and props.member", async () => {
      const test = await testFor(
        `@test model Test {
          /**
           * description of a model property
           */
          @maxLength(10)
          ref?: string;
        }`,
        { types: true },
      );
      const options = ZodCustomEmitOptions().forType(
        $(test.program).builtin.string,
        {
          reference(props) {
            expect(props.type).toStrictEqual($(test.program).builtin.string);
            expect(props.member).toBeDefined();
            expect(props.member!.name).toBe("ref");
            return <>/* a reference */{props.default}</>;
          },
        },
      );

      expectOptionRender(
        test,
        options,
        `
          const Test = z.object({
            ref: /* a reference */z
              .string()
              .max(10)
              .optional()
              .describe("description of a model property"),
          });
        `,
      );
    });

    test("assembling parts", async () => {
      const test = await testFor(
        `@test model Test {
          /**
           * description of a model property
           */
          @maxLength(10)
          ref?: string;
        }`,
        { types: true },
      );

      const options = ZodCustomEmitOptions().forType(
        $(test.program).builtin.string,
        {
          reference(props) {
            return (
              <MemberExpression>
                {props.baseSchemaParts}
                <MemberExpression.Part id="member" />
                {props.memberParts}
                <MemberExpression.Part id="constraint" />
                {props.constraintParts}
                <MemberExpression.Part id="description" />
                {props.descriptionParts}
              </MemberExpression>
            );
          },
        },
      );

      await expectOptionRender(
        test,
        options,
        `
          const Test = z.object({
            ref: z
              .string()
              .member.optional()
              .constraint.max(10)
              .description.describe("description of a model property"),
          });
        `,
      );
    });
  });
});
