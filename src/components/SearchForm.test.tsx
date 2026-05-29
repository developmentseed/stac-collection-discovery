import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SearchForm from "./SearchForm";

function buildExpectedDatetime(start: Date, end: Date) {
  const startDate = new Date(start);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(end);
  endDate.setHours(23, 59, 59, 999);

  return `${startDate.toISOString().replace(".000Z", "") + "Z"}/${
    endDate.toISOString().replace(".999Z", "") + "Z"
  }`;
}

vi.mock("./ui/date-picker", () => ({
  DatePicker: ({
    date,
    onSelect,
    placeholder,
  }: {
    date?: Date | null;
    onSelect?: (date: Date | undefined) => void;
    placeholder?: string;
  }) => (
    <button
      type="button"
      onClick={() =>
        onSelect?.(
          placeholder === "start date"
            ? new Date("2024-01-02T12:00:00Z")
            : new Date("2024-01-05T12:00:00Z")
        )
      }
    >
      {date ? date.toISOString().slice(0, 10) : placeholder}
    </button>
  ),
}));

vi.mock("./MapModal", () => ({
  default: () => null,
}));

describe("src/components/SearchForm.tsx", () => {
  it("initializes fields from URL parameters", () => {
    window.history.pushState(
      {},
      "",
      "/?q=forest&bbox=1,2,3,4&datetime=2024-01-02T00:00:00Z/2024-01-05T23:59:59Z"
    );

    render(<SearchForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/text search/i)).toHaveValue("forest");
    expect(screen.getByPlaceholderText("Enter bounding box")).toHaveValue(
      "1,2,3,4"
    );
    expect(screen.getByRole("button", { name: "2024-01-02" })).toBeVisible();
    expect(screen.getByRole("button", { name: "2024-01-05" })).toBeVisible();
  });

  it("blocks submit for invalid bbox input and shows a validation message", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<SearchForm onSubmit={onSubmit} />);

    await user.type(screen.getByPlaceholderText("Enter bounding box"), "1,2,3");
    await user.click(
      screen.getByRole("button", { name: "Search for collections" })
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Please enter exactly 4 numbers"
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("disables free-text search when conformance says it is unsupported", () => {
    render(
      <SearchForm
        onSubmit={vi.fn()}
        conformanceCapabilities={{
          hasCollectionSearch: true,
          hasFreeText: false,
        }}
      />
    );

    expect(screen.getByLabelText(/text search/i)).toBeDisabled();
    expect(
      screen.getByText(
        "Text search is disabled - no upstream APIs support free-text search"
      )
    ).toBeVisible();
  });

  it("submits the expected datetime interval string", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<SearchForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/text search/i), "forest");
    await user.type(
      screen.getByPlaceholderText("Enter bounding box"),
      "1,2,3,4"
    );
    await user.click(screen.getByRole("button", { name: "start date" }));
    await user.click(screen.getByRole("button", { name: "end date" }));
    await user.click(
      screen.getByRole("button", { name: "Search for collections" })
    );

    const expectedDatetime = buildExpectedDatetime(
      new Date("2024-01-02T12:00:00Z"),
      new Date("2024-01-05T12:00:00Z")
    );

    expect(onSubmit).toHaveBeenCalledWith({
      bbox: "1,2,3,4",
      datetime: expectedDatetime,
      q: "forest",
    });
    expect(window.location.search).toBe(
      `?q=forest&bbox=1%2C2%2C3%2C4&datetime=${encodeURIComponent(expectedDatetime)}`
    );
  });
});
