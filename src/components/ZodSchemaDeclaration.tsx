import * as ay from "@alloy-js/core";
import * as ts from "@alloy-js/typescript";
import { refkeySym } from "../utils.jsx";
import { ZodSchema, ZodSchemaProps } from "./ZodSchema.jsx";

interface ZodSchemaDeclarationProps
  extends Omit<ts.VarDeclarationProps, "type" | "name" | "value" | "kind">,
    ZodSchemaProps {
  readonly name?: string;
}

/**
 * Declare a Zod schema.
 */
export function ZodSchemaDeclaration(props: ZodSchemaDeclarationProps) {
  const internalRk = ay.refkey(props.type, refkeySym);

  const [zodSchemaProps, varDeclProps] = ay.splitProps(props, [
    "type",
    "nested",
  ]) as [ZodSchemaDeclarationProps, ts.VarDeclarationProps];

  const refkeys = [props.refkey ?? []].flat();
  refkeys.push(internalRk);
  const newProps = ay.mergeProps(varDeclProps, {
    refkey: refkeys,
    name:
      props.name ||
      ("name" in props.type &&
        typeof props.type.name === "string" &&
        props.type.name) ||
      props.type.kind,
  });

  return (
    <ts.VarDeclaration {...newProps}>
      <ZodSchema {...zodSchemaProps} />
    </ts.VarDeclaration>
  );
}
