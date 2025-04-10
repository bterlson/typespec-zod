import * as ay from "@alloy-js/core";
import * as ts from "@alloy-js/typescript";
import {
  EmitContext,
  Enum,
  ListenerFlow,
  navigateProgram,
  navigateType,
  Program,
  Type,
} from "@typespec/compiler";
import { $ } from "@typespec/compiler/experimental/typekit";
import { writeOutput } from "@typespec/emitter-framework";
import { ZodSchemaDeclaration } from "./components/ZodSchemaDeclaration.jsx";
import { zod } from "./external-packages/zod.js";
import {
  createCycleSets,
  isBuiltIn,
  isDeclaration,
  shouldReference,
} from "./utils.jsx";

export async function $onEmit(context: EmitContext) {
  const types = createCycleSets(getAllDataTypes(context.program)).flat(1);
  const tsNamePolicy = ts.createTSNamePolicy();

  writeOutput(
    <ay.Output namePolicy={tsNamePolicy} externals={[zod]}>
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
    </ay.Output>,
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
    if (shouldReference(type)) {
      types.push(type);
    }
  }

  const globalNs = $.program.getGlobalNamespaceType();

  navigateProgram(
    program,
    {
      namespace(n) {
        if (n !== globalNs && !$.type.isUserDefined(n)) {
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
