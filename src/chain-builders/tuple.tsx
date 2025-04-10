import { For } from "@alloy-js/core";
import { ArrayExpression } from "@alloy-js/typescript";
import { Tuple } from "@typespec/compiler";
import { ZodSchema } from "../components/ZodSchema.jsx";
import { call } from "../utils.jsx";
import { zod } from "../external-packages/zod.js";

export function tupleBuilder(type: Tuple) {
  return [
    zod.z,
    call(
      "tuple",
      <ArrayExpression>
        <For each={Array.from(type.values)} comma line>
          {(value) => {
            return <ZodSchema type={value} nested />;
          }}
        </For>
      </ArrayExpression>,
    ),
  ];
}
