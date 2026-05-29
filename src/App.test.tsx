import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { server } from "@/test/server";

vi.mock("./components/SearchForm", () => ({
  default: ({
    onSubmit,
    isLoading,
  }: {
    onSubmit: (data: { bbox: string; datetime: string; q: string }) => void;
    isLoading?: boolean;
  }) => (
    <div>
      <button
        type="button"
        onClick={() => onSubmit({ bbox: "1,2,3,4", datetime: "", q: "forest" })}
      >
        {isLoading ? "Searching..." : "Run search"}
      </button>
    </div>
  ),
}));

vi.mock("./components/ResultsTable", () => ({
  default: ({
    data,
    hasNextPage,
    onLoadMore,
    failedApis,
  }: {
    data: Array<{ id: string; title: string }>;
    hasNextPage?: boolean;
    onLoadMore?: () => void;
    failedApis?: string[];
  }) => (
    <div>
      <ul aria-label="Rendered results">
        {data.map((collection) => (
          <li key={collection.id}>{collection.title}</li>
        ))}
      </ul>
      {failedApis?.map((api) => (
        <p key={api}>{api}</p>
      ))}
      {hasNextPage && (
        <button type="button" onClick={onLoadMore}>
          Load More
        </button>
      )}
    </div>
  ),
}));

vi.mock("./components/ApiConfigPanel", () => ({
  default: () => <div>API Config Panel</div>,
}));

vi.mock("./components/ApiDocModal", () => ({
  default: () => null,
}));

function buildCollection(id: string, title = id) {
  return {
    id,
    title,
    links: [{ rel: "root", href: "https://stac.maap-project.org/" }],
  };
}

describe("src/App.tsx", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  it("renders the search surface after startup requests succeed", async () => {
    server.use(
      http.get("http://localhost:8000/api", () =>
        HttpResponse.json({ info: { summary: "Docs summary" } })
      ),
      http.get("http://localhost:8000/conformance", () =>
        HttpResponse.json({
          conformsTo: [
            "https://api.stacspec.org/v1.0.0/collection-search",
            "https://api.stacspec.org/v1.0.0/collection-search#free-text",
          ],
        })
      )
    );

    render(<App />);

    expect(await screen.findByText("Docs summary")).toBeInTheDocument();
    expect(screen.getByText("API Config Panel")).toBeInTheDocument();
    expect(screen.getByText("Run search")).toBeInTheDocument();
    expect(screen.queryByText(/Failed to load API documentation/i)).toBeNull();
    expect(screen.queryByText(/Failed to load API conformance/i)).toBeNull();
  });

  it("renders search results and failed upstream APIs after a successful search", async () => {
    window.history.pushState({}, "", "/?q=forest");

    server.use(
      http.get("http://localhost:8000/api", () =>
        HttpResponse.json({ info: { summary: "Docs summary" } })
      ),
      http.get("http://localhost:8000/conformance", () =>
        HttpResponse.json({
          conformsTo: [
            "https://api.stacspec.org/v1.0.0/collection-search",
            "https://api.stacspec.org/v1.0.0/collection-search#free-text",
          ],
        })
      ),
      http.get("http://localhost:8000/collections", () =>
        HttpResponse.json(
          {
            collections: [buildCollection("alpha", "Alpha")],
            links: [],
          },
          {
            headers: {
              "X-Failed-Upstream-Apis": "https://failed.example.com",
            },
          }
        )
      )
    );

    render(<App />);

    expect(await screen.findByText("Alpha")).toBeVisible();
    expect(screen.getByText("https://failed.example.com")).toBeVisible();
    expect(screen.getByText("Found 1 result")).toBeVisible();
  });

  it("shows surfaced API errors and exits the loading state after a failed search", async () => {
    window.history.pushState({}, "", "/?q=forest");

    server.use(
      http.get("http://localhost:8000/api", () =>
        HttpResponse.json({ info: { summary: "Docs summary" } })
      ),
      http.get("http://localhost:8000/conformance", () =>
        HttpResponse.json({
          conformsTo: [
            "https://api.stacspec.org/v1.0.0/collection-search",
            "https://api.stacspec.org/v1.0.0/collection-search#free-text",
          ],
        })
      ),
      http.get("http://localhost:8000/collections", () =>
        HttpResponse.json({ detail: "Search exploded" }, { status: 400 })
      )
    );

    render(<App />);

    expect(await screen.findByText("Search exploded")).toBeVisible();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Run search" })).toBeVisible();
    });
  });

  it("appends additional collections when loading more results", async () => {
    const user = userEvent.setup();
    window.history.pushState({}, "", "/?q=forest");

    server.use(
      http.get("http://localhost:8000/api", () =>
        HttpResponse.json({ info: { summary: "Docs summary" } })
      ),
      http.get("http://localhost:8000/conformance", () =>
        HttpResponse.json({
          conformsTo: [
            "https://api.stacspec.org/v1.0.0/collection-search",
            "https://api.stacspec.org/v1.0.0/collection-search#free-text",
          ],
        })
      ),
      http.get("http://localhost:8000/collections", () =>
        HttpResponse.json({
          collections: [buildCollection("alpha", "Alpha")],
          links: [{ rel: "next", href: "https://example.com/page-2" }],
        })
      ),
      http.get("https://example.com/page-2", () =>
        HttpResponse.json({
          collections: [buildCollection("beta", "Beta")],
          links: [],
        })
      )
    );

    render(<App />);

    expect(await screen.findByText("Alpha")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Load More" }));

    expect(await screen.findByText("Beta")).toBeVisible();
    expect(
      screen.getByRole("list", { name: "Rendered results" })
    ).toHaveTextContent("Alpha");
    expect(
      screen.getByRole("list", { name: "Rendered results" })
    ).toHaveTextContent("Beta");
    expect(screen.getByText("Found 2 results")).toBeVisible();
  });

  it("triggers the initial search once from URL parameters after STAC APIs initialize", async () => {
    window.history.pushState({}, "", "/?q=initial");
    let searchRequests = 0;

    server.use(
      http.get("http://localhost:8000/api", () =>
        HttpResponse.json({ info: { summary: "Docs summary" } })
      ),
      http.get("http://localhost:8000/conformance", () =>
        HttpResponse.json({
          conformsTo: [
            "https://api.stacspec.org/v1.0.0/collection-search",
            "https://api.stacspec.org/v1.0.0/collection-search#free-text",
          ],
        })
      ),
      http.get("http://localhost:8000/collections", ({ request }) => {
        searchRequests += 1;
        const url = new URL(request.url);
        expect(url.searchParams.get("q")).toBe("initial");

        return HttpResponse.json({
          collections: [buildCollection("initial", "Initial")],
          links: [],
        });
      })
    );

    render(<App />);

    expect(await screen.findByText("Initial")).toBeVisible();
    await waitFor(() => {
      expect(searchRequests).toBe(1);
    });
  });
});
