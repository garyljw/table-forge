import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useApi } from "./useApi.js";

afterEach(cleanup);

describe("useApi", () => {
  it("reports loading, not the old data, as soon as the key changes", async () => {
    const { result, rerender } = renderHook(({ k }) => useApi(async () => `data-${k}`, k), { initialProps: { k: "a" } });
    await waitFor(() => expect(result.current).toEqual({ status: "ok", data: "data-a" }));
    let sawStale = false;
    act(() => rerender({ k: "b" }));
    // Right after the key changed, before the new request resolves, the old data must not be returned.
    if (result.current.status === "ok" && result.current.data === "data-a") sawStale = true;
    expect(sawStale).toBe(false);
    await waitFor(() => expect(result.current).toEqual({ status: "ok", data: "data-b" }));
  });
});
