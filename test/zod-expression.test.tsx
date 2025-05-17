import { d } from "@alloy-js/core/testing";
import { MemberExpression } from "@alloy-js/typescript";
import { it } from "vitest";
import { ZodExpression } from "../src/components/ZodExpression.jsx";
import { expectRenderPure } from "./utils.jsx";

it("creates zod expressions", () => {
  const expression = (
    <ZodExpression>
      <MemberExpression.Part id="null" />
      <MemberExpression.Part args />
      <MemberExpression.Part id="optional" />
      <MemberExpression.Part args />
    </ZodExpression>
  );

  expectRenderPure(
    expression,
    d`
      z.null().optional()
    `,
  );
});
