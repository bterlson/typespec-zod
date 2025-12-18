import { Refkey } from "@alloy-js/core";
import { Children } from "@alloy-js/core/jsx-runtime";
import { FunctionCallExpression, MemberExpression } from "@alloy-js/typescript";
import { Program, Type } from "@typespec/compiler";
import { $ } from "@typespec/compiler/typekit";
import { SCCSet } from "@typespec/emitter-framework";
import {
  getEmitOptionsForType,
  ZodOptionsContext,
} from "./context/zod-options.js";
import { zod } from "./external-packages/zod.js";

export const refkeySym = Symbol.for("typespec-zod.refkey");

/**
 * Returns true if the given type is a declaration or an instantiation of a
 * declaration.
 */
export function isDeclaration(program: Program, type: Type): boolean {
  switch (type.kind) {
    case "Namespace":
    case "Interface":
    case "Operation":
    case "EnumMember":
      // TODO: this should reference the enum member via
      // target.enum.Name
      return false;
    case "UnionVariant":
      return false;

    case "Model":
      if (
        ($(program).array.is(type) || $(program).record.is(type)) &&
        isBuiltIn(program, type)
      ) {
        return false;
      }

      return Boolean(type.name);
    case "Union":
      return Boolean(type.name);
    case "Enum":
      return true;
    case "Scalar":
      return true;
    default:
      return false;
  }
}

// typekit doesn't consider things which have properties as records
// even though they are?
export function isRecord(program: Program, type: Type): boolean {
  return (
    type.kind === "Model" &&
    !!type.indexer &&
    type.indexer.key === $(program).builtin.string
  );
}

export function shouldReference(
  program: Program,
  type: Type,
  options?: ZodOptionsContext,
) {
  return (
    isDeclaration(program, type) &&
    !isBuiltIn(program, type) &&
    (!options ||
      !getEmitOptionsForType(program, type, options?.customEmit)?.noDeclaration)
  );
}

export function isBuiltIn(program: Program, type: Type) {
  if (type.kind === "ModelProperty" && type.model) {
    type = type.model;
  }

  if (!("namespace" in type) || type.namespace === undefined) {
    return false;
  }

  const globalNs = program.getGlobalNamespaceType();
  let tln = type.namespace;
  if (tln === globalNs) {
    return false;
  }

  while (tln.namespace !== globalNs) {
    tln = tln.namespace!;
  }

  return tln === globalNs.namespaces.get("TypeSpec");
}

interface TypeCollector {
  collectType: (type: Type) => void;
  get types(): Type[];
}

export function newTopologicalTypeCollector(program: Program): TypeCollector {
  const types = new SCCSet<Type>(referencedTypes);

  function referencedTypes(type: Type): Type[] {
    switch (type.kind) {
      case "Model":
        return [
          ...(type.baseModel ? [type.baseModel] : []),
          ...(type.indexer ? [type.indexer.key, type.indexer.value] : []),
          ...[...type.properties.values()].map((p) => p.type),
        ].filter((t) => shouldReference(program, t));

      case "Union":
        return [...type.variants.values()]
          .map((v) => (v.kind === "UnionVariant" ? v.type : v))
          .filter((t) => shouldReference(program, t));
      case "UnionVariant":
        return shouldReference(program, type.type) ? [type.type] : [];
      case "Interface":
        return [...type.operations.values()].filter((t) =>
          shouldReference(program, t),
        );
      case "Operation":
        return [type.parameters, type.returnType].filter((t) =>
          shouldReference(program, t),
        );
      case "Enum":
        return [];
      case "Scalar":
        return type.baseScalar && shouldReference(program, type.baseScalar)
          ? [type.baseScalar]
          : [];
      case "Tuple":
        return type.values.filter((t) => shouldReference(program, t));
      case "Namespace":
        return [
          ...type.operations.values(),
          ...type.scalars.values(),
          ...type.models.values(),
          ...type.enums.values(),
          ...type.interfaces.values(),
          ...type.namespaces.values(),
        ].filter((t) => shouldReference(program, t));
      default:
        return [];
    }
  }

  return {
    collectType(type: Type) {
      if (shouldReference(program, type)) {
        types.add(type);
      }
    },
    get types() {
      return types.items;
    },
  };
}

export function call(target: string, ...args: Children[]) {
  return <FunctionCallExpression target={target} args={args} />;
}

export function memberExpr(...parts: Children[]) {
  return <MemberExpression children={parts} />;
}

export function zodMemberExpr(...parts: Children[]) {
  return memberExpr(refkeyPart(zod.z), ...parts);
}

export function idPart(id: string) {
  return <MemberExpression.Part id={id} />;
}

export function refkeyPart(refkey: Refkey) {
  return <MemberExpression.Part refkey={refkey} />;
}

export function callPart(target: string | Refkey, ...args: Children[]) {
  return (
    <MemberExpression>
      {typeof target === "string" ? idPart(target) : refkeyPart(target)}
      <MemberExpression.Part args={args} />;
    </MemberExpression>
  );
}
