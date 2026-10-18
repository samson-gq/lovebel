import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LikeFriends from "./LikeFriends";

vi.mock("@/components/SignedImg", () => ({ SignedImg: () => null }));
vi.mock("@/components/InviteFriend", () => ({ default: () => null }));

describe("manual friend likes", () => {
  it("sends no automatic likes and likes only the chosen person", async () => {
    const onLike = vi.fn().mockResolvedValue(true);
    render(<LikeFriends loading={false} onOpenChange={vi.fn()} onLike={onLike} profiles={[
      { id: "ilya", name: "Илья", age: 30, bio: "", distance: "Минск", image: "", images: [], interests: [] },
      { id: "alina", name: "Алина", age: 28, bio: "", distance: "Минск", image: "", images: [], interests: [] },
    ]} />);
    fireEvent.click(screen.getByRole("button", { name: "Лайкнуть друзей" }));
    expect(onLike).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Лайкнуть Илья" }));
    await waitFor(() => expect(onLike).toHaveBeenCalledExactlyOnceWith("ilya"));
  });
});