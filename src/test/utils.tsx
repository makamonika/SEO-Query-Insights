import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement } from "react";

/**
 * Custom render function that wraps components with any providers
 * This can be extended with context providers, theme providers, etc.
 */
const customRender = (ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) => {
  return render(ui, {
    ...options,
  });
};

export * from "@testing-library/react";
export { customRender as render };
