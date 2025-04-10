import { Children } from "@alloy-js/core/jsx-runtime";
import { Type } from "@typespec/compiler";
import { $ } from "@typespec/compiler/experimental/typekit";
import { call } from "../utils.jsx";
import { enumBuilder } from "./enum.jsx";
import { intrinsicBuilder } from "./intrinsic.jsx";
import { literalBuilder } from "./literal.jsx";
import { modelBuilder } from "./model.jsx";
import { scalarBuilder } from "./scalar.jsx";
import { tupleBuilder } from "./tuple.jsx";
import { unionBuilder } from "./union.jsx";
import { zod } from "../external-packages/zod.js";

export function typeBuilder(type: Type): Children[] {
  const components: Children[] = [];
  switch (type.kind) {
    case "Intrinsic":
      components.push(...intrinsicBuilder(type));
      break;
    case "String":
    case "Number":
    case "Boolean":
      components.push(...literalBuilder(type));
      break;
    case "Scalar":
      components.push(...scalarBuilder(type));
      break;
    case "Model":
      components.push(...modelBuilder(type));
      break;
    case "Union":
      components.push(...unionBuilder(type));
      break;
    case "Enum":
      components.push(...enumBuilder(type));
      break;
    case "ModelProperty":
      components.push(...typeBuilder(type.type));
      break;
    case "EnumMember":
      components.push(
        ...(type.value
          ? [literalBuilder($.literal.create(type.value))]
          : [literalBuilder($.literal.create(type.name))]),
      );
      break;
    case "Tuple":
      components.push(...tupleBuilder(type));
      break;
    default:
      components.push(zod.z, call("any"));
  }

  return components;
}
