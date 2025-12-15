import {
  Output as AlloyOutput,
  ContentOutputFile,
  render,
} from "@alloy-js/core";
import { Children } from "@alloy-js/core/jsx-runtime";
import { SourceFile } from "@alloy-js/typescript";
import { Program } from "@typespec/compiler";
import {
  createTestHost as coreCreateTestHost,
  createTestWrapper,
} from "@typespec/compiler/testing";
import { Output } from "@typespec/emitter-framework";
import { HttpTestLibrary } from "@typespec/http/testing";
import { expect } from "vitest";
import { zod } from "../src/index.js";
import { TypeSpecZodTestLibrary } from "../src/testing/index.js";

export function expectRender(
  program: Program,
  children: Children,
  expected: string,
) {
  const template = (
    <Output program={program} externals={[zod]}>
      <SourceFile path="test.ts">{children}</SourceFile>
    </Output>
  );

  const output = render(template, { insertFinalNewLine: false });
  expect(
    (output.contents[0] as ContentOutputFile).contents
      .split(/\n/)
      .slice(2)
      .join("\n"),
  ).toBe(expected);
}

export function expectRenderPure(children: Children, expected: string) {
  const template = (
    <AlloyOutput externals={[zod]}>
      <SourceFile path="test.ts">{children}</SourceFile>
    </AlloyOutput>
  );

  const output = render(template, { insertFinalNewLine: false });
  expect(
    (output.contents[0] as ContentOutputFile).contents
      .split(/\n/)
      .slice(2)
      .join("\n"),
  ).toBe(expected);
}

export async function createTestHost(includeHttp = false) {
  return coreCreateTestHost({
    libraries: [
      TypeSpecZodTestLibrary,
      ...(includeHttp ? [HttpTestLibrary] : []),
    ],
  });
}

export async function createTestRunner() {
  const host = await createTestHost();
  const importAndUsings = "";
  return createTestWrapper(host, {
    wrapper: (code) => `${importAndUsings} ${code}`,
  });
}

export async function createEmitterTestRunner(
  emitterOptions?: {},
  includeHttp = false,
) {
  const host = await createTestHost(includeHttp);

  const importAndUsings = includeHttp
    ? `import "@typespec/http"; using Http;\n`
    : ``;

  return createTestWrapper(host, {
    wrapper: (code) => `${importAndUsings} ${code}`,
    compilerOptions: {
      emit: ["typespec-zod"],
      options: {
        "typespec-zod": { ...emitterOptions },
      },
    },
  });
}
