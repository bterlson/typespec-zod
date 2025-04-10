import { For } from "@alloy-js/core";
import { ArrayExpression } from "@alloy-js/typescript";
import {
  getDiscriminatedUnion,
  ignoreDiagnostics,
  Union,
} from "@typespec/compiler";
import { $ } from "@typespec/compiler/experimental/typekit";
import { ZodSchema } from "../components/ZodSchema.jsx";
import { call } from "../utils.jsx";
import { zod } from "../external-packages/zod.js";

export function unionBuilder(type: Union) {
  const discriminated = ignoreDiagnostics(
    getDiscriminatedUnion($.program, type),
  );

  if ($.union.isExpression(type) || !discriminated) {
    return [
      zod.z,
      call(
        "union",
        <ArrayExpression>
          <For each={Array.from(type.variants.values())} comma line>
            {(variant) => <ZodSchema type={variant.type} nested />}
          </For>
        </ArrayExpression>,
      ),
    ];
  }

  const propKey = discriminated.options.discriminatorPropertyName;
  const envKey = discriminated.options.envelopePropertyName;
  const unionArgs = [
    `"${propKey}"`,
    <ArrayExpression>
      <For each={Array.from(type.variants.values())} comma line>
        {(variant) => {
          if (discriminated.options.envelope === "object") {
            const envelope = $.model.create({
              properties: {
                [propKey]: $.modelProperty.create({
                  name: propKey,
                  type: $.literal.create(variant.name as string),
                }),
                [envKey]: $.modelProperty.create({
                  name: envKey,
                  type: variant.type,
                }),
              },
            });
            return <ZodSchema type={envelope} nested />;
          } else {
            return <ZodSchema type={variant.type} nested />;
          }
        }}
      </For>
    </ArrayExpression>,
  ];

  return [zod.z, call("discriminatedUnion", ...unionArgs)];
}
