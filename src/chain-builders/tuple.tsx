import { For } from "@alloy-js/core";
import { ArrayExpression } from "@alloy-js/typescript";
import { Tuple } from "@typespec/compiler";
import { ZodSchema } from "../components/ZodSchema.jsx";
import { call } from "../utils.jsx";

export function tupleBuilder(type: Tuple) {
  return [
    call(
      "tuple",
      <ArrayExpression>
        <For each={Array.from(type.values)} comma line>
          {(value) => {
            return <ZodSchema type={value} nested />;
          }}
        </For>
      </ArrayExpression>
    ),
  ];
}
