import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SwipeFilters, { type FilterValues } from "./SwipeFilters";

// Stub usePopularCities so the component renders deterministic suggestions
// without touching the network.
vi.mock("@/hooks/usePopularCities", () => ({
  usePopularCities: () => ["Москва", "Санкт-Петербург", "Новосибирск", "Казань"],
}));

const baseFilters: FilterValues = {
  ageRange: [18, 45],
  maxDistance: 50,
  gender: "all",
  city: "",
};

const setup = (initial: FilterValues = baseFilters) => {
  let value = initial;
  const onChange = vi.fn((next: FilterValues) => {
    value = next;
  });
  const utils = render(<SwipeFilters filters={value} onChange={onChange} />);
  return { ...utils, onChange, get value() { return value; } };
};

describe("SwipeFilters — accessibility & city autocomplete", () => {
  beforeEach(() => {
    // Open the panel for each test (filters render closed by default).
  });

  const openPanel = async (user: ReturnType<typeof userEvent.setup>) => {
    const trigger = screen.getByRole("button");
    await user.click(trigger);
  };

  it("city input exposes correct ARIA combobox roles", async () => {
    const user = userEvent.setup();
    setup();
    await openPanel(user);

    const combobox = screen.getByRole("combobox");
    expect(combobox).toHaveAttribute("aria-expanded", "false");
    expect(combobox).toHaveAttribute("aria-controls", "city-suggestions");

    await user.click(combobox);
    await waitFor(() =>
      expect(combobox).toHaveAttribute("aria-expanded", "true"),
    );

    const listbox = screen.getByRole("listbox");
    expect(listbox).toBeInTheDocument();
    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThan(0);
  });

  it("ArrowDown / ArrowUp move highlight and aria-activedescendant updates", async () => {
    const user = userEvent.setup();
    setup();
    await openPanel(user);

    const combobox = screen.getByRole("combobox");
    await user.click(combobox);

    // First option highlighted by default
    expect(combobox).toHaveAttribute("aria-activedescendant", "city-opt-0");
    let active = screen.getByRole("option", { selected: true });
    expect(active).toHaveAttribute("id", "city-opt-0");

    await user.keyboard("{ArrowDown}");
    expect(combobox).toHaveAttribute("aria-activedescendant", "city-opt-1");
    active = screen.getByRole("option", { selected: true });
    expect(active).toHaveAttribute("id", "city-opt-1");

    await user.keyboard("{ArrowUp}");
    expect(combobox).toHaveAttribute("aria-activedescendant", "city-opt-0");
  });

  it("Enter selects the highlighted option and closes the listbox", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SwipeFilters filters={baseFilters} onChange={onChange} />);
    await user.click(screen.getByRole("button")); // open panel

    const combobox = screen.getByRole("combobox");
    await user.click(combobox);
    await user.keyboard("{ArrowDown}{Enter}");

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ city: "Санкт-Петербург" }),
    );
    await waitFor(() =>
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument(),
    );
  });

  it("Escape closes the listbox without changing the value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SwipeFilters filters={baseFilters} onChange={onChange} />);
    await user.click(screen.getByRole("button"));

    const combobox = screen.getByRole("combobox");
    await user.click(combobox);
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument(),
    );
    expect(onChange).not.toHaveBeenCalled();
  });
});
