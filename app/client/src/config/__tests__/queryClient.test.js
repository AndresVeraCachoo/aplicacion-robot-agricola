import { describe, it, expect } from "vitest";
import { queryClient } from "../queryClient";

describe("queryClient config", () => {
  it("debe estar definido y ser una instancia válida de QueryClient", () => {
    expect(queryClient).toBeDefined();
    expect(typeof queryClient.getQueryCache).toBe("function");
  });

  it("debe tener configuraciones predeterminadas correctas (staleTime, retry)", () => {
    const defaultOptions = queryClient.getDefaultOptions();
    
    expect(defaultOptions.queries).toBeDefined();
    expect(defaultOptions.queries.refetchOnWindowFocus).toBe(false);
    expect(defaultOptions.queries.retry).toBe(1);
    expect(defaultOptions.queries.staleTime).toBe(300000); // 5 * 60 * 1000
  });
});
