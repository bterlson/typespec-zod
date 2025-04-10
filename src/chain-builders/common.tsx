import { Children } from "@alloy-js/core/jsx-runtime";
import {
  getFormat,
  getPattern,
  Model,
  ModelProperty,
  Scalar,
  Type,
} from "@typespec/compiler";
import { $ } from "@typespec/compiler/experimental/typekit";
import { call } from "../utils.jsx";

export function stringConstraints(type: Scalar | ModelProperty) {
  const components = [];
  const minLength = $.type.minLength(type);
  const maxLength = $.type.maxLength(type);
  const pattern = getPattern($.program, type);
  const format = getFormat($.program, type);

  if (minLength !== undefined) {
    components.push(call("min", minLength));
  }

  if (maxLength !== undefined) {
    components.push(call("max", maxLength));
  }

  if (pattern !== undefined) {
    components.push(call("regex", "/" + pattern + "/"));
  }

  if (format) {
    components.push(call(format));
  }

  return components;
}

export function numericConstraints(
  type: Scalar | ModelProperty,
  intrinsicMin: number | bigint | string | undefined,
  intrinsicMax: number | bigint | string | undefined,
) {
  const components: Children[] = [];
  const decoratorConstraints = {
    min: $.type.minValue(type),
    minExclusive: $.type.minValueExclusive(type),
    max: $.type.maxValue(type),
    maxExclusive: $.type.maxValueExclusive(type),
  };
  if (
    decoratorConstraints.min === undefined &&
    decoratorConstraints.minExclusive === undefined
  ) {
    intrinsicMin !== undefined &&
      components.push(call("gte", String(intrinsicMin)));
  } else {
    if (decoratorConstraints.min !== undefined) {
      components.push(call("gte", decoratorConstraints.min));
    }

    if (decoratorConstraints.minExclusive !== undefined) {
      components.push(call("gt", decoratorConstraints.minExclusive));
    }
  }

  if (
    decoratorConstraints.max === undefined &&
    decoratorConstraints.maxExclusive === undefined
  ) {
    intrinsicMax !== undefined &&
      components.push(call("lte", String(intrinsicMax)));
  } else {
    if (decoratorConstraints.max !== undefined) {
      components.push(call("lte", decoratorConstraints.max));
    }

    if (decoratorConstraints.maxExclusive !== undefined) {
      components.push(call("lt", decoratorConstraints.maxExclusive));
    }
  }

  return components;
}

export function arrayConstraints(type: Model | ModelProperty) {
  const components: Children[] = [];
  const minItems = $.type.minItems(type);
  const maxItems = $.type.maxItems(type);

  if (minItems !== undefined) {
    components.push(call("min", minItems));
  }

  if (maxItems !== undefined) {
    components.push(call("max", maxItems));
  }

  return components;
}

export function docBuilder(type: Type): Children[] {
  const doc = $.type.getDoc(type);
  if (doc) {
    return [call("describe", `"${doc.replace(/\n+/g, " ")}"`)];
  }

  return [];
}
