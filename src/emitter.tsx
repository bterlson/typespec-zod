import * as ay from "@alloy-js/core";
import * as ts from "@alloy-js/typescript";
import {
  EmitContext,
  ListenerFlow,
  navigateProgram,
  Program,
  Type,
} from "@typespec/compiler";
import { $ } from "@typespec/compiler/typekit";
import { Output, writeOutput } from "@typespec/emitter-framework";
import { ZodSchemaDeclaration } from "./components/ZodSchemaDeclaration.jsx";
import { zod } from "./external-packages/zod.js";
import { createCycleSets, shouldReference } from "./utils.jsx";

export async function $onEmit(context: EmitContext) {
  const types = createCycleSets(getAllDataTypes(context.program)).flat(1);
  const tsNamePolicy = ts.createTSNamePolicy();

  writeOutput(
    context.program,
    <Output
      program={context.program}
      namePolicy={tsNamePolicy}
      externals={[zod]}
    >
      <ts.SourceFile path="models.ts">
        <ay.For
          each={types}
          ender={";"}
          joiner={
            <>
              ;
              <hbr />
              <hbr />
            </>
          }
        >
          {(type) => <ZodSchemaDeclaration type={type} export />}
        </ay.For>
      </ts.SourceFile>
    </Output>,
    context.emitterOutputDir,
  );
}

/**
 * Collects all the models defined in the spec
 * @returns A collection of all defined models in the spec
 */
function getAllDataTypes(program: Program) {
  const types: Type[] = [];
  function collectType(type: Type) {
    if (shouldReference(program, type)) {
      types.push(type);
    }
  }

  const globalNs = program.getGlobalNamespaceType();

  navigateProgram(
    program,
    {
      namespace(n) {
        if (n !== globalNs && !$(program).type.isUserDefined(n)) {
          return ListenerFlow.NoRecursion;
        }
      },
      model: collectType,
      enum: collectType,
      union: collectType,
      scalar: collectType,
    },
    { includeTemplateDeclaration: false },
  );

  return types;
}
