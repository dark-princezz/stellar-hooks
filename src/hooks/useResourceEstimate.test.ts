import { describe, expect, it } from "vitest";
import { renderHook } from "@testing-library/react";
import { useResourceEstimate } from "./useResourceEstimate";

describe("useResourceEstimate", () => {
  it("returns an empty result without a simulation", () => {
    const { result } = renderHook(() => useResourceEstimate(null));
    expect(result.current).toEqual({ estimate: null, warnings: [], isNearLimit: false, exceedsLimit: false });
  });

  it("flags near-limit usage and accepts custom limits", () => {
    const sim = { cost: { cpuInsns: "90000000", memBytes: "1" } };
    const { result, rerender } = renderHook(({ limits }: { limits?: { cpuInstructions: number } }) => useResourceEstimate(sim, limits ? { limits } : {}), {
      initialProps: {} as { limits?: { cpuInstructions: number } },
    });
    expect(result.current.isNearLimit).toBe(true);
    expect(result.current.exceedsLimit).toBe(false);

    rerender({ limits: { cpuInstructions: 50_000_000 } });
    expect(result.current.exceedsLimit).toBe(true);
    expect(result.current.estimate?.cpuInstructions).toBe(90_000_000);
  });
});
