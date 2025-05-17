import { Children, ComponentDefinition } from "@alloy-js/core/jsx-runtime";
import { ModelProperty, Type } from "@typespec/compiler";
import { useTsp } from "@typespec/emitter-framework";
import {
  getEmitOptionsForType,
  getEmitOptionsForTypeKind,
  useZodOptions,
} from "../context/zod-options.js";
import { zodBaseSchemaParts } from "../zodBaseSchema.jsx";
import { zodConstraintsParts } from "../zodConstraintsParts.jsx";
import { zodDescriptionParts } from "../zodDescriptionParts.jsx";
import { zodMemberParts } from "../zodMemberParts.jsx";

export interface ZodCustomTypeComponentCommonProps<T extends Type> {
  /**
   * The TypeSpec type to render.
   */
  type: T;

  /**
   * The default rendering.
   */
  children: Children;
}

export interface ZodCustomTypeComponentDeclarationProps<
  T extends Type,
  U extends ComponentDefinition<any>,
> extends ZodCustomTypeComponentCommonProps<T> {
  /**
   * Pass when rendering a declaration for the provided type or type kind.
   */
  declare: true;

  /**
   * The props passed to VarDeclaration to declare this type.
   */
  declarationProps: U extends ComponentDefinition<infer P> ? P : never;

  /**
   * The component to use to declare this type.
   */
  Declaration: U;
}
export interface ZodCustomTypeComponentReferenceProps<T extends Type>
  extends ZodCustomTypeComponentCommonProps<T> {
  /**
   * Pass when rendering a reference to the provided type or type kind.
   */
  reference: true;

  /**
   * The member this type is referenced from, if any. This member may contain
   * additional metadata that should be represented in the emitted output.
   */
  member?: ModelProperty;
}

export type ZodCustomTypeComponentProps<
  T extends Type,
  U extends ComponentDefinition<any>,
> =
  | ZodCustomTypeComponentDeclarationProps<T, U>
  | ZodCustomTypeComponentReferenceProps<T>;

export function ZodCustomTypeComponent<
  T extends Type,
  U extends ComponentDefinition<any>,
>(props: ZodCustomTypeComponentProps<T, U>) {
  const options = useZodOptions();
  const { $ } = useTsp();
  const descriptor =
    getEmitOptionsForType($.program, props.type, options.customEmit) ??
    getEmitOptionsForTypeKind($.program, props.type.kind, options.customEmit);

  if (!descriptor) {
    return <>{props.children}</>;
  }

  if ("declare" in props && props.declare && descriptor.declare) {
    const CustomComponent = descriptor.declare;
    const baseSchemaParts = () => zodBaseSchemaParts(props.type);
    const constraintParts = () => zodConstraintsParts(props.type);
    const descriptionParts = () => zodDescriptionParts(props.type);

    return (
      <CustomComponent
        type={props.type}
        default={props.children}
        baseSchemaParts={baseSchemaParts}
        constraintParts={constraintParts}
        descriptionParts={descriptionParts}
        declarationProps={props.declarationProps}
        Declaration={props.Declaration}
      />
    );
  } else if ("reference" in props && props.reference && descriptor.reference) {
    const CustomComponent = descriptor.reference;
    const baseSchemaParts = () =>
      zodBaseSchemaParts(props.member ?? props.type);
    const constraintParts = () => zodConstraintsParts(props.type, props.member);
    const descriptionParts = () =>
      zodDescriptionParts(props.type, props.member);
    const memberParts = () => zodMemberParts(props.member);
    return (
      <CustomComponent
        type={props.type}
        member={props.member}
        default={props.children}
        baseSchemaParts={baseSchemaParts}
        constraintParts={constraintParts}
        descriptionParts={descriptionParts}
        memberParts={memberParts}
      />
    );
  }

  return <>{props.children}</>;
}
