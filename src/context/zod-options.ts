import { ComponentContext, createContext, useContext } from "@alloy-js/core";
import { Children, ComponentDefinition } from "@alloy-js/core/jsx-runtime";
import { Program, Scalar, Type } from "@typespec/compiler";
import { $ } from "@typespec/compiler/typekit";
import { isBuiltIn } from "../utils.jsx";

export type ZodCustomTypeComponent = ComponentDefinition<{
  type: Type;
  default: Children;
}>;

export interface ZodTypeEmitOptions {
  type: Type;
  declare?: ZodCustomTypeComponent;
  reference?: ZodCustomTypeComponent;
  noDeclaration?: boolean;
}

export type ZodCustomTypeComponentsMap = Map<Type, ZodTypeEmitOptions>;

export interface ZodOptionsContext {
  /**
   * Provide custom component for rendering a specific TypeSpec type.
   */
  typeEmitOptions: Map<Type, ZodTypeEmitOptions>;
  /**
   * Get emit options for a specific type.
   */
  getEmitOptionsFor(
    program: Program,
    type: Type,
  ): ZodTypeEmitOptions | undefined;
}

/**
 * Context for setting Zod options that control how Zod schemas are rendered.
 */
export const ZodOptionsContext: ComponentContext<ZodOptionsContext> =
  createContext(createZodOptionsContext());

export function useZodOptions(): ZodOptionsContext {
  return useContext(ZodOptionsContext)!;
}

export function createZodOptionsContext(): ZodOptionsContext {
  return {
    typeEmitOptions: new Map(),
    getEmitOptionsFor(program, type) {
      let options = this.typeEmitOptions.get(type);
      if (options || !$(program).scalar.is(type) || isBuiltIn(program, type)) {
        return options;
      }

      // have a scalar, it's not a built-in scalar, and didn't find options, so
      // see if we have options for a base scalar.
      let currentScalar: Scalar | undefined = type;
      while (
        currentScalar &&
        !isBuiltIn(program, currentScalar) &&
        !this.typeEmitOptions.has(currentScalar)
      ) {
        currentScalar = currentScalar?.baseScalar;
      }

      if (!currentScalar) {
        return undefined;
      }

      return this.typeEmitOptions.get(currentScalar);
    },
  };
}
