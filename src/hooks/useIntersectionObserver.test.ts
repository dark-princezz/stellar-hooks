import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useIntersectionObserver } from "./useIntersectionObserver";

let mockObserve: ReturnType<typeof vi.fn>;
let mockDisconnect: ReturnType<typeof vi.fn>;
let intersectionCallback: (entries: IntersectionObserverEntry[]) => void;

beforeEach(() => {
  mockObserve = vi.fn();
  mockDisconnect = vi.fn();

  vi.stubGlobal(
    "IntersectionObserver",
    vi.fn((callback: (entries: IntersectionObserverEntry[]) => void) => {
      intersectionCallback = callback;
      return {
        observe: mockObserve,
        disconnect: mockDisconnect,
        unobserve: vi.fn(),
        takeRecords: vi.fn(),
      };
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useIntersectionObserver", () => {
  it("creates an observer with default options when no options provided", () => {
    const { result } = renderHook(() => useIntersectionObserver());

    act(() => {
      result.current.ref(document.createElement("div"));
    });

    expect(IntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ threshold: 0, rootMargin: "0px", root: null }),
    );
  });

  it("passes custom options to IntersectionObserver", () => {
    const root = document.createElement("div");
    const { result } = renderHook(() =>
      useIntersectionObserver({
        threshold: 0.5,
        rootMargin: "10px",
        root,
        triggerOnce: true,
      }),
    );

    act(() => {
      result.current.ref(document.createElement("div"));
    });

    expect(IntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ threshold: 0.5, rootMargin: "10px", root }),
    );
  });

  it("observes the element when ref is attached", () => {
    const { result } = renderHook(() => useIntersectionObserver());
    const element = document.createElement("div");

    act(() => {
      result.current.ref(element);
    });

    expect(mockObserve).toHaveBeenCalledWith(element);
  });

  it("sets isIntersecting to true when entry is intersecting", () => {
    const { result } = renderHook(() => useIntersectionObserver());

    act(() => {
      result.current.ref(document.createElement("div"));
    });

    act(() => {
      intersectionCallback([
        { isIntersecting: true } as IntersectionObserverEntry,
      ]);
    });

    expect(result.current.isIntersecting).toBe(true);
    expect(result.current.entry).not.toBeNull();
  });

  it("sets isIntersecting to false when entry is not intersecting", () => {
    const { result } = renderHook(() => useIntersectionObserver());

    act(() => {
      result.current.ref(document.createElement("div"));
    });

    act(() => {
      intersectionCallback([
        { isIntersecting: false } as IntersectionObserverEntry,
      ]);
    });

    expect(result.current.isIntersecting).toBe(false);
  });

  it("disconnects observer on unmount", () => {
    const { result, unmount } = renderHook(() => useIntersectionObserver());

    act(() => {
      result.current.ref(document.createElement("div"));
    });

    unmount();

    expect(mockDisconnect).toHaveBeenCalled();
  });

  it("stops observing after first intersection when triggerOnce is true", () => {
    const { result } = renderHook(() =>
      useIntersectionObserver({ triggerOnce: true }),
    );

    act(() => {
      result.current.ref(document.createElement("div"));
    });

    act(() => {
      intersectionCallback([
        { isIntersecting: true } as IntersectionObserverEntry,
      ]);
    });

    expect(result.current.isIntersecting).toBe(true);

    act(() => {
      intersectionCallback([
        { isIntersecting: false } as IntersectionObserverEntry,
      ]);
    });

    expect(result.current.isIntersecting).toBe(true);
  });

  it("handles ref reassignment to a different element", () => {
    const { result } = renderHook(() => useIntersectionObserver());
    const element1 = document.createElement("div");
    const element2 = document.createElement("div");

    act(() => {
      result.current.ref(element1);
    });
    expect(mockObserve).toHaveBeenCalledWith(element1);

    act(() => {
      result.current.ref(element2);
    });
    expect(mockObserve).toHaveBeenCalledWith(element2);
  });
});
