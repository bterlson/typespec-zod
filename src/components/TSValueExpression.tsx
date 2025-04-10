import { For } from "@alloy-js/core";
import { ArrayExpression } from "@alloy-js/typescript";
import { Value } from "@typespec/compiler";

// todo: this should be in emitter framework
interface TSValueExpressionProps {
  value: Value;
}

export function TSValueExpression(props: TSValueExpressionProps) {
  switch (props.value.valueKind) {
    case "StringValue":
      return JSON.stringify(props.value.value);
    case "NumericValue":
      return String(props.value.value.asBigInt());
    case "BooleanValue":
      return String(props.value.value);
    case "NullValue":
      return "null";
    case "ArrayValue":
      return (
        <ArrayExpression>
          <For each={props.value.values} comma line>
            {(value) => {
              return <TSValueExpression value={value} />;
            }}
          </For>
        </ArrayExpression>
      );
    case "ScalarValue":
      if (props.value.value.name === "fromISO") {
        return <TSValueExpression value={props.value.value.args[0]} />;
      } else {
        throw new Error(
          "Unsupported scalar constructor: " + props.value.value.name,
        );
      }
    default:
      throw new Error("Unsupported value kind: " + props.value.valueKind);
  }
}
