import { ComponentContext, createContext, useContext } from "@alloy-js/core";
import { Children, ComponentDefinition } from "@alloy-js/core/jsx-runtime";
import { ObjectPropertyProps, VarDeclarationProps } from "@alloy-js/typescript";
import {
  Enum,
  EnumMember,
  Model,
  ModelProperty,
  Program,
  Scalar,
  Type,
  Union,
  UnionVariant,
} from "@typespec/compiler";
import { $ } from "@typespec/compiler/typekit";
import { isBuiltIn } from "../utils.jsx";

const getEmitOptionsForTypeSym: unique symbol = Symbol.for(
  "typespec-zod:getEmitOptionsForType",
);

const getEmitOptionsForTypeKindSym: unique symbol = Symbol.for(
  "typespec-zod:getEmitOptionsForTypeKind",
);

export type ZodCustomEmitOptions = ZodCustomEmitOptionsClass;
export const ZodCustomEmitOptions = function () {
  return new ZodCustomEmitOptionsClass();
} as {
  new (): ZodCustomEmitOptionsClass;
  (): ZodCustomEmitOptionsClass;
};

export class ZodCustomEmitOptionsClass {
  #typeEmitOptions: Map<Type, ZodCustomEmitOptionsBase<any>> = new Map();
  #typeKindEmitOptions: Map<Type["kind"], ZodCustomEmitOptionsBase<any>> =
    new Map();

  forType<const T extends Type>(type: T, options: ZodCustomEmitOptionsBase<T>) {
    this.#typeEmitOptions.set(type, options);

    return this;
  }

  forTypeKind<const TKind extends Type["kind"]>(
    typeKind: TKind,
    options: ZodCustomEmitOptionsBase<Extract<Type, { kind: TKind }>>,
  ) {
    this.#typeKindEmitOptions.set(typeKind, options);

    return this;
  }

  /**
   * @internal
   */
  [getEmitOptionsForTypeSym](program: Program, type: Type) {
    let options = this.#typeEmitOptions.get(type);
    if (options || !$(program).scalar.is(type) || isBuiltIn(program, type)) {
      return options;
    }

    // have a scalar, it's not a built-in scalar, and didn't find options, so
    // see if we have options for a base scalar.
    let currentScalar: Scalar | undefined = type;
    while (
      currentScalar &&
      !isBuiltIn(program, currentScalar) &&
      !this.#typeEmitOptions.has(currentScalar)
    ) {
      currentScalar = currentScalar?.baseScalar;
    }

    if (!currentScalar) {
      return undefined;
    }

    return this.#typeEmitOptions.get(currentScalar);
  }

  /**
   * @internal
   */
  [getEmitOptionsForTypeKindSym](program: Program, typeKind: Type["kind"]) {
    return this.#typeKindEmitOptions.get(typeKind);
  }
}

export interface ZodCustomEmitPropsBase {
  /**
   * The TypeSpec type to render.
   */
  type: Type;

  /**
   * The default emitted output for this type.
   */
  default: Children;

  /**
   * The default base schema parts for this type, e.g. `z.string()`. Place
   * inside a MemberExpression component.
   */
  baseSchemaParts: () => Children;

  /**
   * The default constraint parts for this type, e.g. `min(1).max(10)`. Place
   * inside a member expression component.
   */
  constraintParts: () => Children;

  /**
   * The default description parts for this type, e.g. `describe("docs"). Place
   * inside a member expression component.
   *
   */
  descriptionParts: () => Children;
}

export type CustomTypeToProps<TCustomType extends Type> =
  TCustomType extends ModelProperty
    ? ObjectPropertyProps
    : TCustomType extends EnumMember
      ? {}
      : TCustomType extends UnionVariant
        ? {}
        : TCustomType extends Model | Scalar | Union | Enum
          ? VarDeclarationProps
          : VarDeclarationProps | ObjectPropertyProps;

export interface ZodCustomEmitReferenceProps extends ZodCustomEmitPropsBase {
  /**
   * The member this type is referenced from, if any. This member may contain
   * additional metadata that should be represented in the emitted output.
   */
  member?: ModelProperty;

  /**
   * The default member parts for this type, e.g. `optional().default(42)`.
   * Place inside a member expression component.
   */
  memberParts: () => Children;
}

export interface ZodCustomEmitDeclareProps<TCustomType extends Type>
  extends ZodCustomEmitPropsBase {
  Declaration: ComponentDefinition<CustomTypeToProps<TCustomType>>;
  declarationProps: CustomTypeToProps<TCustomType>;
}

export type ZodCustomDeclarationComponent<TCustomType extends Type> =
  ComponentDefinition<ZodCustomEmitDeclareProps<TCustomType>>;

export type ZodCustomReferenceComponent =
  ComponentDefinition<ZodCustomEmitReferenceProps>;

export interface ZodCustomEmitOptionsBase<TCustomType extends Type> {
  declare?: ZodCustomDeclarationComponent<TCustomType>;
  reference?: ZodCustomReferenceComponent;
  noDeclaration?: boolean;
}

export interface ZodOptionsContext {
  customEmit?: ZodCustomEmitOptions;
}
/**
 * Context for setting Zod options that control how Zod schemas are rendered.
 */
export const ZodOptionsContext: ComponentContext<ZodOptionsContext> =
  createContext({});

export function useZodOptions(): ZodOptionsContext {
  return useContext(ZodOptionsContext)!;
}

export function getEmitOptionsForType(
  program: Program,
  type: Type,
  options?: ZodCustomEmitOptions,
) {
  return options?.[getEmitOptionsForTypeSym](program, type);
}

export function getEmitOptionsForTypeKind(
  program: Program,
  typeKind: Type["kind"],
  options?: ZodCustomEmitOptions,
) {
  return options?.[getEmitOptionsForTypeKindSym](program, typeKind);
}
