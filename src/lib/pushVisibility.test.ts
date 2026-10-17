import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

const runPush = async (visibilityState: string | null) => {
  const handlers: Record<string, (event: unknown) => void> = {};
  const showNotification = vi.fn().mockResolvedValue(undefined);
  runInNewContext(readFileSync("public/push-sw.js", "utf8"), {
    self: {
      addEventListener: (name: string, handler: (event: unknown) => void) => { handlers[name] = handler; },
      clients: { matchAll: async () => visibilityState ? [{ visibilityState }] : [] },
      registration: { showNotification },
    },
  });
  let pending: Promise<unknown> = Promise.resolve();
  handlers.push({
    data: { json: () => ({ title: "LoveBel", body: "Incoming like", url: "/likes" }) },
    waitUntil: (promise: Promise<unknown>) => { pending = promise; },
  });
  await pending;
  return showNotification;
};

describe("push visibility", () => {
  it("does not interrupt a visible app", async () => {
    expect(await runPush("visible")).not.toHaveBeenCalled();
  });
  it("notifies when the app is minimized", async () => {
    expect(await runPush("hidden")).toHaveBeenCalledOnce();
  });
  it("notifies when no app window is open", async () => {
    expect(await runPush(null)).toHaveBeenCalledOnce();
  });
});