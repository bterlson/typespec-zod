import { refkey } from "@alloy-js/core";
import { Children } from "@alloy-js/core/jsx-runtime";
import { MemberChainExpression, ObjectExpression } from "@alloy-js/typescript";
import { Model, ModelProperty } from "@typespec/compiler";
import { $ } from "@typespec/compiler/experimental/typekit";
import { TSValueExpression } from "../components/TSValueExpression.jsx";
import { ZodExpression } from "../components/ZodExpression.jsx";
import { ZodType } from "../components/ZodType.jsx";
import { call, isDeclaration, isRecord, refkeySym, shouldReference } from "../utils.jsx";
import { arrayConstraints, docBuilder, numericConstraints, stringConstraints } from "./common.jsx";
import { typeBuilder } from "./type.jsx";

export function modelBuilder(type: Model) {
  if ($.array.is(type)) {
    return [
      call("array", <ZodType type={type.indexer!.value} nested />),
      ...arrayConstraints(type as Model),
      ...docBuilder(type),
    ];
  }
  let components: Children[] = [];

  let recordPart: Children[] | null = null;
  let objectPart: Children[] | null = null;

  if (
    isRecord(type) ||
    (!!type.baseModel && isRecord(type.baseModel) && !isDeclaration(type.baseModel))
  ) {
    recordPart = [
      call(
        "record",
        <ZodType type={(type.indexer ?? type.baseModel!.indexer)!.key} nested />,
        <ZodType type={(type.indexer ?? type.baseModel!.indexer)!.value} nested />,
      ),
    ];
  }

  if (!recordPart || type.properties.size > 0) {
    const membersSpec: Record<string, () => Children> = {};

    for (const member of type.properties.values()) {
      const memberComponents = [
        shouldReference(member.type) ? refkey(member.type, refkeySym) : typeBuilder(member.type),
        ...($.scalar.extendsString(member.type) ? stringConstraints(member) : []),
        ...($.scalar.extendsNumeric(member.type)
          ? numericConstraints(member, undefined, undefined)
          : []),
        ...($.array.is(member.type) ? arrayConstraints(member) : []),
        ...(member.optional ? [call("optional")] : []),
        ...defaultBuilder(member),
        ...docBuilder(member),
      ];

      membersSpec[member.name] = () => {
        if (shouldReference(member.type)) {
          return <MemberChainExpression>{memberComponents}</MemberChainExpression>;
        }

        return <ZodExpression>{memberComponents}</ZodExpression>;
      };
    }
    objectPart = [call("object", [<ObjectExpression jsValue={membersSpec} />])];
  }

  if (recordPart && objectPart) {
    components = [
      call(
        "intersection",
        <ZodExpression>{objectPart}</ZodExpression>,
        <ZodExpression>{recordPart}</ZodExpression>,
      ),
    ];
  } else {
    components = objectPart ?? recordPart ?? [];
  }

  if (type.baseModel && (!isRecord(type.baseModel) || isDeclaration(type.baseModel))) {
    if (isDeclaration(type.baseModel)) {
      const nestedComponents = components;
      components = [
        refkey(type.baseModel, refkeySym),
        call("merge", <ZodExpression>{nestedComponents}</ZodExpression>),
      ];
    } else {
      components.push(...modelBuilder(type.baseModel));
    }
  }

  components.push(...docBuilder(type));

  return components;
}

function defaultBuilder(prop: ModelProperty) {
  if (!prop.defaultValue) {
    return [];
  }

  return [call("default", <TSValueExpression value={prop.defaultValue} />)];
}
