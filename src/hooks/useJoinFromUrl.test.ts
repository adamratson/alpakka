import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useJoinFromUrl } from "./useJoinFromUrl";

beforeEach(() => {
  history.replaceState(null, "", "/");
});
afterEach(() => {
  history.replaceState(null, "", "/");
});

describe("useJoinFromUrl", () => {
  it("returns null when no #join fragment is present", () => {
    const { result } = renderHook(() => useJoinFromUrl());
    expect(result.current[0]).toBeNull();
  });

  it("captures the session id from #join= on mount", () => {
    history.replaceState(null, "", "/#join=abc-123");
    const { result } = renderHook(() => useJoinFromUrl());
    expect(result.current[0]).toBe("abc-123");
  });

  it("decodes a percent-encoded session id", () => {
    history.replaceState(null, "", "/#join=" + encodeURIComponent("a b/c"));
    const { result } = renderHook(() => useJoinFromUrl());
    expect(result.current[0]).toBe("a b/c");
  });

  it("strips the join fragment from the URL once captured", () => {
    history.replaceState(null, "", "/somepath?x=1#join=zzz");
    renderHook(() => useJoinFromUrl());
    expect(window.location.hash).toBe("");
    expect(window.location.pathname).toBe("/somepath");
    expect(window.location.search).toBe("?x=1");
  });

  it("ignores hashes that are not #join=", () => {
    history.replaceState(null, "", "/#other=foo");
    const { result } = renderHook(() => useJoinFromUrl());
    expect(result.current[0]).toBeNull();
  });

  it("picks up a #join hash that arrives after mount via hashchange", () => {
    const { result } = renderHook(() => useJoinFromUrl());
    expect(result.current[0]).toBeNull();

    act(() => {
      history.replaceState(null, "", "/#join=later");
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });

    expect(result.current[0]).toBe("later");
  });

  it("setter clears the captured value", () => {
    history.replaceState(null, "", "/#join=abc");
    const { result } = renderHook(() => useJoinFromUrl());
    expect(result.current[0]).toBe("abc");
    act(() => result.current[1](null));
    expect(result.current[0]).toBeNull();
  });

  it("removes the hashchange listener on unmount", () => {
    const { unmount } = renderHook(() => useJoinFromUrl());
    unmount();
    // After unmount, dispatching hashchange should not throw and there's no
    // hook to update; we can at least confirm history navigation still works.
    history.replaceState(null, "", "/#join=after-unmount");
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    expect(window.location.hash).toBe("#join=after-unmount");
  });
});
