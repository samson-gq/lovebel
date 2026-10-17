import { describe, expect, it } from "vitest";
import { getInvite } from "./invite";

describe("friend invitations", () => {
  it("opens public signup without exposing account identifiers", () => {
    const url = new URL(getInvite().url);
    expect(url.origin).toBe("https://lovebel.lovable.app");
    expect(url.pathname).toBe("/auth");
    expect(url.search).toBe("");
  });
});