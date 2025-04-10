import { For } from "@alloy-js/core";
import { ArrayExpression, ValueExpression } from "@alloy-js/typescript";
import { Enum } from "@typespec/compiler";
import { call } from "../utils.jsx";
import { zod } from "../external-packages/zod.js";

export function enumBuilder(en: Enum) {
  return [
    zod.z,
    call(
      "enum",
      <ArrayExpression>
        <For each={Array.from(en.members.values())} comma line>
          {(member) => {
            return (
              <ValueExpression
                jsValue={
                  member.value === undefined ? member.name : member.value
                }
              />
            );
          }}
        </For>
      </ArrayExpression>,
    ),
  ];
}
