import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProfileUpdates } from "./useProfileUpdates";

const mock = vi.hoisted(() => ({ on: vi.fn(), subscribe: vi.fn(), removeChannel: vi.fn(), channel: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: mock }));

beforeEach(() => {
  vi.clearAllMocks();
  mock.channel.mockReturnValue(mock);
  mock.on.mockReturnValue(mock);
  mock.subscribe.mockReturnValue(mock);
});

describe("live profile updates in chats", () => {
  it("refreshes the displayed profile after its photo or description changes", () => {
    const refresh = vi.fn();
    renderHook(() => useProfileUpdates(["ilya"], refresh));
    expect(mock.on.mock.calls[0][1]).toEqual({ event: "UPDATE", schema: "public", table: "profiles", filter: "user_id=eq.ilya" });
    act(() => mock.on.mock.calls[0][2]({ new: { avatar_url: "new-photo", bio: "New description" } }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("removes the old subscription when leaving the chat", () => {
    const { unmount } = renderHook(() => useProfileUpdates(["ilya"], vi.fn()));
    unmount();
    expect(mock.removeChannel).toHaveBeenCalledWith(mock);
  });

  it("refreshes on reconnect to catch edits made while disconnected", () => {
    const refresh = vi.fn();
    renderHook(() => useProfileUpdates(["ilya"], refresh));
    act(() => mock.subscribe.mock.calls[0][0]("SUBSCRIBED"));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});