import { Children } from "@alloy-js/core/jsx-runtime";
import {
  ZodCustomEmitOptions,
  ZodOptionsContext,
} from "../context/zod-options.js";

export interface ZodOptionsProps {
  /**
   * Provide custom component for rendering a specific TypeSpec type.
   */
  customEmit: ZodCustomEmitOptions;

  children: Children;
}

/**
 * Set ZodOptions for the children of this component.
 */
export function ZodOptions(props: ZodOptionsProps) {
  const context: ZodOptionsContext = {
    customEmit: props.customEmit,
  };

  return (
    <ZodOptionsContext.Provider value={context}>
      {props.children}
    </ZodOptionsContext.Provider>
  );
}
