import { Children } from "@alloy-js/core/jsx-runtime";
import { MemberExpression } from "@alloy-js/typescript";
import { zod } from "../external-packages/zod.js";

export interface ZodExpressionSimpleProps {
  /**
   * The target of the expression.
   */
  target: string;
}
export interface ZodExpression {
  /**
   * The subsequent call chain expression children to construct this zod type.
   */
  children?: Children;
}

export function ZodExpression(props: ZodExpression) {
  return (
    <MemberExpression>
      <MemberExpression.Part refkey={zod.z} />
      {props.children}
    </MemberExpression>
  );
}
