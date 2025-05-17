import { Children, For, refkey } from "@alloy-js/core";
import {
  ArrayExpression,
  MemberExpression,
  ObjectExpression,
  ObjectProperty,
} from "@alloy-js/typescript";
import {
  Enum,
  LiteralType,
  Model,
  Scalar,
  Tuple,
  Type,
  Union,
} from "@typespec/compiler";
import { Typekit } from "@typespec/compiler/typekit";
import { useTsp } from "@typespec/emitter-framework";
import { ZodCustomTypeComponent } from "./components/ZodCustomTypeComponent.jsx";
import { ZodSchema } from "./components/ZodSchema.jsx";
import {
  callPart,
  idPart,
  isDeclaration,
  isRecord,
  refkeySym,
  shouldReference,
  zodMemberExpr,
} from "./utils.jsx";

/**
 * Returns the identifier parts for the base Zod schema for a given TypeSpec
 * type.
 */
export function zodBaseSchemaParts(type: Type) {
  const { $ } = useTsp();

  switch (type.kind) {
    case "Intrinsic":
      return intrinsicBaseType(type);
    case "String":
    case "Number":
    case "Boolean":
      return literalBaseType($, type);
    case "Scalar":
      return scalarBaseType($, type);
    case "Model":
      return modelBaseType(type);
    case "Union":
      return unionBaseType(type);
    case "Enum":
      return enumBaseType(type);
    case "ModelProperty":
      return zodBaseSchemaParts(type.type);
    case "EnumMember":
      return type.value
        ? literalBaseType($, $.literal.create(type.value))
        : literalBaseType($, $.literal.create(type.name));
    case "Tuple":
      return tupleBaseType(type);
    default:
      return zodMemberExpr(callPart("any"));
  }
}

function literalBaseType($: Typekit, type: LiteralType) {
  switch (type.kind) {
    case "String":
      return zodMemberExpr(callPart("literal", `"${type.value}"`));
    case "Number":
    case "Boolean":
      return zodMemberExpr(callPart("literal", `${type.value}`));
  }
}

function scalarBaseType($: Typekit, type: Scalar) {
  if ($.scalar.extendsBoolean(type)) {
    return zodMemberExpr(callPart("boolean"));
  } else if ($.scalar.extendsNumeric(type)) {
    if ($.scalar.extendsInteger(type)) {
      if (
        $.scalar.extendsInt32(type) ||
        $.scalar.extendsUint32(type) ||
        $.scalar.extendsSafeint(type)
      ) {
        return zodMemberExpr(callPart("number"), callPart("int"));
      } else {
        return zodMemberExpr(callPart("bigint"));
      }
    } else {
      // floats and such, best we can do here lacking a decimal type.
      return zodMemberExpr(callPart("number"));
    }
  } else if ($.scalar.extendsString(type)) {
    if ($.scalar.extendsUrl(type)) {
      return zodMemberExpr(callPart("string"), callPart("url"));
    }
    return zodMemberExpr(callPart("string"));
  } else if ($.scalar.extendsBytes(type)) {
    return zodMemberExpr(callPart("any"));
  } else if ($.scalar.extendsPlainDate(type)) {
    return zodMemberExpr(idPart("coerce"), callPart("date"));
  } else if ($.scalar.extendsPlainTime(type)) {
    return zodMemberExpr(callPart("string"), callPart("time"));
  } else if ($.scalar.extendsUtcDateTime(type)) {
    const encoding = $.scalar.getEncoding(type);
    if (encoding === undefined) {
      return zodMemberExpr(idPart("coerce"), callPart("date"));
    } else if (encoding.encoding === "unixTimestamp") {
      return scalarBaseType($, encoding.type);
    } else if (encoding.encoding === "rfc3339") {
      return zodMemberExpr(callPart("string"), callPart("datetime"));
    } else {
      return scalarBaseType($, encoding.type);
    }
  } else if ($.scalar.extendsOffsetDateTime(type)) {
    const encoding = $.scalar.getEncoding(type);
    if (encoding === undefined) {
      return zodMemberExpr(idPart("coerce"), callPart("date"));
    } else if (encoding.encoding === "rfc3339") {
      return zodMemberExpr(callPart("string"), callPart("datetime"));
    } else {
      return scalarBaseType($, encoding.type);
    }
  } else if ($.scalar.extendsDuration(type)) {
    const encoding = $.scalar.getEncoding(type);
    if (encoding === undefined || encoding.encoding === "ISO8601") {
      return zodMemberExpr(callPart("string"), callPart("duration"));
    } else {
      return scalarBaseType($, encoding.type);
    }
  } else {
    return zodMemberExpr(callPart("any"));
  }
}

function enumBaseType(type: Enum) {
  // Only the base z.enum([...])
  // We want: zodMemberExpr(callPart("enum", ...))
  const values = Array.from(type.members.values()).map(
    (member) => member.value ?? member.name,
  );
  return zodMemberExpr(
    callPart(
      "enum",
      <ArrayExpression>
        <For each={type.members.values()} comma line>
          {(member) => (
            <ZodCustomTypeComponent
              type={member}
              Declaration={(props: { children?: Children }) => props.children}
              declarationProps={{}}
              declare
            >
              {JSON.stringify(member.value ?? member.name)}
            </ZodCustomTypeComponent>
          )}
        </For>
      </ArrayExpression>,
    ),
  );
}

function tupleBaseType(type: Tuple) {
  // Only the base z.tuple([...])
  // We want: zodMemberExpr(callPart("tuple", ...))
  return zodMemberExpr(
    callPart(
      "tuple",
      <ArrayExpression>
        <For each={type.values} comma line>
          {(item) => <ZodSchema type={item} nested />}
        </For>
      </ArrayExpression>,
    ),
  );
}

function modelBaseType(type: Model) {
  const { $ } = useTsp();

  if ($.array.is(type)) {
    return zodMemberExpr(
      callPart("array", <ZodSchema type={type.indexer!.value} nested />),
    );
  }

  let recordPart: Children | undefined;
  if (
    isRecord($.program, type) ||
    (!!type.baseModel &&
      isRecord($.program, type.baseModel) &&
      !isDeclaration($.program, type.baseModel))
  ) {
    recordPart = zodMemberExpr(
      callPart(
        "record",
        <ZodSchema
          type={(type.indexer ?? type.baseModel!.indexer)!.key}
          nested
        />,
        <ZodSchema
          type={(type.indexer ?? type.baseModel!.indexer)!.value}
          nested
        />,
      ),
    );
  }

  let memberPart: Children | undefined;
  if (type.properties.size > 0) {
    const members = (
      <ObjectExpression>
        <For each={type.properties.values()} comma hardline enderPunctuation>
          {(prop) => (
            <ZodCustomTypeComponent
              type={prop}
              declare
              Declaration={ObjectProperty}
              declarationProps={{ name: prop.name }}
            >
              <ObjectProperty name={prop.name}>
                <ZodSchema type={prop} nested />
              </ObjectProperty>
            </ZodCustomTypeComponent>
          )}
        </For>
      </ObjectExpression>
    );
    memberPart = zodMemberExpr(callPart("object", members));
  }

  let parts: Children;

  if (!memberPart && !recordPart) {
    parts = zodMemberExpr(callPart("object", <ObjectExpression />));
  } else if (memberPart && recordPart) {
    parts = zodMemberExpr(callPart("intersection", memberPart, recordPart));
  } else {
    parts = memberPart ?? recordPart;
  }

  if (type.baseModel && shouldReference($.program, type.baseModel)) {
    return (
      <MemberExpression>
        <MemberExpression.Part refkey={refkey(type.baseModel, refkeySym)} />
        <MemberExpression.Part id="merge" />
        <MemberExpression.Part args={[parts]} />
      </MemberExpression>
    );
  }

  return parts;
}

function unionBaseType(type: Union) {
  const { $ } = useTsp();

  const discriminated = $.union.getDiscriminatedUnion(type);

  if ($.union.isExpression(type) || !discriminated) {
    return zodMemberExpr(
      callPart(
        "union",
        <ArrayExpression>
          <For each={type.variants} comma line>
            {(name, variant) => {
              return <ZodSchema type={variant.type} nested />;
            }}
          </For>
        </ArrayExpression>,
      ),
    );
  }

  const propKey = discriminated.options.discriminatorPropertyName;
  const envKey = discriminated.options.envelopePropertyName;
  const unionArgs = [
    `"${propKey}"`,
    <ArrayExpression>
      <For each={Array.from(type.variants.values())} comma line>
        {(variant) => {
          if (discriminated.options.envelope === "object") {
            const envelope = $.model.create({
              properties: {
                [propKey]: $.modelProperty.create({
                  name: propKey,
                  type: $.literal.create(variant.name as string),
                }),
                [envKey]: $.modelProperty.create({
                  name: envKey,
                  type: variant.type,
                }),
              },
            });
            return <ZodSchema type={envelope} nested />;
          } else {
            return <ZodSchema type={variant.type} nested />;
          }
        }}
      </For>
    </ArrayExpression>,
  ];

  return zodMemberExpr(callPart("discriminatedUnion", ...unionArgs));
}

function intrinsicBaseType(type: Type) {
  // Only the base z.null(), z.never(), etc.
  if (type.kind === "Intrinsic") {
    switch (type.name) {
      case "null":
        return zodMemberExpr(callPart("null"));
      case "never":
        return zodMemberExpr(callPart("never"));
      case "unknown":
        return zodMemberExpr(callPart("unknown"));
      case "void":
        return zodMemberExpr(callPart("void"));
      default:
        return zodMemberExpr(callPart("any"));
    }
  }
  return zodMemberExpr(callPart("any"));
}
