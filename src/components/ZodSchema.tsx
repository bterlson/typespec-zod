import { Children, refkey } from "@alloy-js/core";
import { MemberExpression } from "@alloy-js/typescript";
import { Type } from "@typespec/compiler";
import { useTsp } from "@typespec/emitter-framework";
import { refkeySym, shouldReference } from "../utils.jsx";
import { zodBaseSchemaParts } from "../zodBaseSchema.jsx";
import { zodConstraintsParts } from "../zodConstraintsParts.jsx";
import { zodDescriptionParts } from "../zodDescriptionParts.jsx";
import { zodMemberParts } from "../zodMemberParts.jsx";
import { ZodCustomTypeComponent } from "./ZodCustomTypeComponent.jsx";
export interface ZodSchemaProps {
  readonly type: Type;
  readonly nested?: boolean;
}

/**
 * Component that translates a TypeSpec type into the Zod type
 */
export function ZodSchema(props: ZodSchemaProps): Children {
  const { $ } = useTsp();

  if (!props.nested) {
    // we are making a declaration
    return (
      <MemberExpression>
        {zodBaseSchemaParts(props.type)}
        {zodConstraintsParts(props.type)}
        {zodDescriptionParts(props.type)}
      </MemberExpression>
    );
  }

  // we are in reference context
  const { member, type } = $.modelProperty.is(props.type)
    ? { member: props.type, type: props.type.type }
    : { type: props.type };

  if (shouldReference($.program, type)) {
    return (
      <ZodCustomTypeComponent type={type} member={member} reference>
        <MemberExpression>
          <MemberExpression.Part refkey={refkey(type, refkeySym)} />
          {zodConstraintsParts(type, member)}
          {zodMemberParts(member)}
          {zodDescriptionParts(type, member)}
        </MemberExpression>
      </ZodCustomTypeComponent>
    );
  }

  return (
    <ZodCustomTypeComponent type={type} member={member} reference>
      <MemberExpression>
        {zodBaseSchemaParts(type)}
        {zodConstraintsParts(type, member)}
        {zodMemberParts(member)}
        {zodDescriptionParts(type, member)}
      </MemberExpression>
    </ZodCustomTypeComponent>
  );
}
