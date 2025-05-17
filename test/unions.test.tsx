import { d } from "@alloy-js/core/testing";
import { Model, Union } from "@typespec/compiler";
import { it } from "vitest";
import { ZodSchema } from "../src/index.js";
import { createTestRunner, expectRender } from "./utils.jsx";

it("works with union expressions", async () => {
  const runner = await createTestRunner();
  const { Test } = (await runner.compile(`
    @test model Test {
      prop: "hi" | "ho" | "ha"
    }
  `)) as Record<string, Model>;

  expectRender(
    runner.program,
    <ZodSchema type={Test} />,
    d`
      z.object({
        prop: z.union([z.literal("hi"), z.literal("ho"), z.literal("ha")]),
      })
    `,
  );
});

it("works with discriminated unions with envelope", async () => {
  const runner = await createTestRunner();
  const { Test } = (await runner.compile(`
    @discriminated
    @test union Test {
      one: { oneItem: true },
      two: true
    }
  `)) as Record<string, Union>;

  expectRender(
    runner.program,
    <ZodSchema type={Test} />,
    d`
      z.discriminatedUnion(
        "kind",
        [
          z.object({
            kind: z.literal("one"),
            value: z.object({
              oneItem: z.literal(true),
            }),
          }),
          z.object({
            kind: z.literal("two"),
            value: z.literal(true),
          })
        ]
      )
    `,
  );
});

it("works with discriminated unions without envelope", async () => {
  const runner = await createTestRunner();
  const { Test } = (await runner.compile(`
    @discriminated(#{ envelope: "none" })
    @test union Test {
      one: { kind: "one", value: 1 };
      two: { kind: "two", value: 2 };
    }
  `)) as Record<string, Union>;

  expectRender(
    runner.program,
    <ZodSchema type={Test} />,
    d`
      z.discriminatedUnion(
        "kind",
        [
          z.object({
            kind: z.literal("one"),
            value: z.literal(1),
          }),
          z.object({
            kind: z.literal("two"),
            value: z.literal(2),
          })
        ]
      )
    `,
  );
});

it("works with non-discriminated unions", async () => {
  const runner = await createTestRunner();
  const { Test } = (await runner.compile(`
    @test union Test {
      one: { oneItem: true },
      two: true
    }
  `)) as Record<string, Union>;

  expectRender(
    runner.program,
    <ZodSchema type={Test} />,
    d`
      z.union([
        z.object({
          oneItem: z.literal(true),
        }),
        z.literal(true)
      ])
    `,
  );
});

it("works with the unknown variant (by not emitting it)");
