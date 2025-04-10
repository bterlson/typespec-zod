import { Children } from "@alloy-js/core/jsx-runtime";
import { ModelProperty, Scalar } from "@typespec/compiler";
import { $ } from "@typespec/compiler/experimental/typekit";
import { call, isBuiltIn } from "../utils.jsx";
import {
  docBuilder,
  numericConstraints,
  stringConstraints,
} from "./common.jsx";
import { zod } from "../external-packages/zod.js";

export function scalarBuilder(type: Scalar): Children[] {
  let components: Children[] = [];
  if ($.scalar.extendsBoolean(type)) {
    components = [zod.z, call("boolean")];
  } else if ($.scalar.extendsString(type)) {
    components = stringBuilder(type);
  } else if ($.scalar.extendsNumeric(type)) {
    components = numericBuilder(type);
  } else if ($.scalar.extendsBytes(type)) {
    components = [zod.z, call("any")];
  } else if ($.scalar.extendsPlainDate(type)) {
    components = [zod.z, "coerce", call("date")];
  } else if ($.scalar.extendsPlainTime(type)) {
    components = [zod.z, call("string"), call("time")];
  } else if ($.scalar.extendsUtcDateTime(type)) {
    const encoding = $.scalar.getEncoding(type);
    if (encoding === undefined) {
      components = [zod.z, "coerce", call("date")];
    } else if (encoding.encoding === "unixTimestamp") {
      components = numericBuilder(encoding.type);
    } else if (encoding.encoding === "rfc3339") {
      components = [zod.z, call("string"), call("datetime")];
    } else {
      components = scalarBuilder(encoding.type);
    }
  } else if ($.scalar.extendsOffsetDateTime(type)) {
    const encoding = $.scalar.getEncoding(type);
    if (encoding === undefined) {
      components = [zod.z, "coerce", call("date")];
    } else if (encoding.encoding === "rfc3339") {
      components = [zod.z, call("string"), call("datetime")];
    } else {
      components = scalarBuilder(encoding.type);
    }
  } else if ($.scalar.extendsDuration(type)) {
    const encoding = $.scalar.getEncoding(type);
    if (encoding === undefined || encoding.encoding === "ISO8601") {
      components = [zod.z, call("string"), call("duration")];
    } else {
      components = scalarBuilder(encoding.type);
    }
  }

  if (components.length === 0) {
    components.push(zod.z, call("any"));
  }

  if (!isBuiltIn(type)) {
    components.push(...docBuilder(type));
  }

  return components;
}

export function stringBuilder(type: Scalar): Children[] {
  const baseComponents = [zod.z, call("string")];

  if ($.scalar.extendsUrl(type)) {
    baseComponents.push(call("url"));
  }

  baseComponents.push(...stringConstraints(type));
  return baseComponents;
}

export function numericBuilder(type: Scalar | ModelProperty): Children[] {
  if ($.scalar.extendsInt8(type)) {
    return [
      zod.z,
      call("number"),
      call("int"),
      ...numericConstraints(type, -(1 << 7), (1 << 7) - 1),
    ];
  } else if ($.scalar.extendsInt16(type)) {
    return [
      zod.z,
      call("number"),
      call("int"),
      ...numericConstraints(type, -(1 << 15), (1 << 15) - 1),
    ];
  } else if ($.scalar.extendsInt16(type)) {
    return [
      zod.z,
      call("number"),
      call("int"),
      ...numericConstraints(type, -(1 << 15), (1 << 15) - 1),
    ];
  } else if ($.scalar.extendsInt32(type)) {
    return [
      zod.z,
      call("number"),
      call("int"),
      ...numericConstraints(type, -(1n << 31n), (1n << 31n) - 1n),
    ];
  } else if ($.scalar.extendsSafeint(type)) {
    return [
      zod.z,
      call("number"),
      call("int"),
      call("safe"),
      ...numericConstraints(type, undefined, undefined),
    ];
  } else if ($.scalar.extendsInt64(type)) {
    return [
      zod.z,
      call("bigint"),
      ...numericConstraints(
        type,
        String(-(1n << 63n)) + "n",
        String((1n << 63n) - 1n) + "n",
      ),
    ];
  } else if ($.scalar.extendsUint8(type)) {
    return [
      zod.z,
      call("number"),
      call("int"),
      call("nonnegative"),
      ...numericConstraints(type, undefined, (1 << 8) - 1),
    ];
  } else if ($.scalar.extendsUint16(type)) {
    return [
      zod.z,
      call("number"),
      call("int"),
      call("nonnegative"),
      ...numericConstraints(type, undefined, (1 << 16) - 1),
    ];
  } else if ($.scalar.extendsUint32(type)) {
    return [
      zod.z,
      call("number"),
      call("int"),
      call("nonnegative"),
      ...numericConstraints(type, undefined, (1n << 32n) - 1n),
    ];
  } else if ($.scalar.extendsUint64(type)) {
    return [
      zod.z,
      call("bigint"),
      call("nonnegative"),
      ...numericConstraints(type, undefined, (1n << 64n) - 1n),
    ];
  } else if ($.scalar.extendsInteger(type)) {
    return [
      zod.z,
      call("bigint"),
      ...numericConstraints(type, undefined, undefined),
    ];
  } else if ($.scalar.extendsFloat32(type)) {
    return [
      zod.z,
      call("number"),
      ...numericConstraints(type, -3.4028235e38, 3.4028235e38),
    ];
  } else if (
    $.scalar.extendsFloat64(type) ||
    $.scalar.extendsFloat(type) ||
    $.scalar.extendsDecimal(type) ||
    $.scalar.extendsDecimal128(type)
  ) {
    // don't bother with min/max for these types. decimal and decimal128 are
    // especially problematic since JS has no decimal type.
    return [
      zod.z,
      call("number"),
      ...numericConstraints(type, undefined, undefined),
    ];
  }

  return [
    zod.z,
    call("number"),
    ...numericConstraints(type, undefined, undefined),
  ];
}
