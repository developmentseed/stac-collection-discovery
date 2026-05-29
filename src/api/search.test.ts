import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchNextPage,
  getApiConformance,
  hasCollectionSearchSupport,
  hasFreeTextSupport,
  searchApi,
} from "./search";
import { server } from "@/test/server";

function buildCollection(
  id: string,
  rootHref = "https://stac.maap-project.org/"
) {
  return {
    id,
    title: id,
    links: [{ rel: "root", href: rootHref }],
  };
}

describe("src/api/search.ts", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "log").mockImplementation(() => undefined);
  });

  it("normalizes plain free-text terms and preserves params and apis", async () => {
    let capturedRequestUrl: string | null = null;

    server.use(
      http.get("http://localhost:8000/collections", ({ request }) => {
        capturedRequestUrl = request.url;
        return HttpResponse.json({
          collections: [buildCollection("first")],
          links: [],
        });
      })
    );

    const result = await searchApi(
      {
        bbox: "1,2,3,4",
        datetime: "2024-01-01T00:00:00Z/2024-01-31T23:59:59Z",
        q: "red fox",
      },
      ["https://api-a.example.com", "https://api-b.example.com"]
    );

    expect(capturedRequestUrl).not.toBeNull();
    if (!capturedRequestUrl) {
      throw new Error("Expected search request URL to be captured");
    }

    const requestUrl = new URL(capturedRequestUrl);

    expect(requestUrl.searchParams.get("bbox")).toBe("1,2,3,4");
    expect(requestUrl.searchParams.get("datetime")).toBe(
      "2024-01-01T00:00:00Z/2024-01-31T23:59:59Z"
    );
    expect(requestUrl.searchParams.get("q")).toBe("red AND fox");
    expect(requestUrl.searchParams.getAll("apis")).toEqual([
      "https://api-a.example.com",
      "https://api-b.example.com",
    ]);
    expect(result.failedApis).toEqual([]);
    expect(result.data.collections).toHaveLength(1);
  });

  it("leaves operator-bearing free-text input intact", async () => {
    let capturedRequestUrl: string | null = null;

    server.use(
      http.get("http://localhost:8000/collections", ({ request }) => {
        capturedRequestUrl = request.url;
        return HttpResponse.json({
          collections: [buildCollection("first")],
          links: [],
        });
      })
    );

    await searchApi({ bbox: "", datetime: "", q: "red OR fox" });

    expect(capturedRequestUrl).not.toBeNull();
    if (!capturedRequestUrl) {
      throw new Error("Expected search request URL to be captured");
    }

    const requestUrl = new URL(capturedRequestUrl);

    expect(requestUrl.searchParams.get("q")).toBe("red OR fox");
  });

  it("parses failed upstream APIs on paginated responses", async () => {
    server.use(
      http.get("https://example.com/page-2", () =>
        HttpResponse.json(
          {
            collections: [buildCollection("page-2")],
            links: [],
          },
          {
            headers: {
              "X-Failed-Upstream-Apis":
                " https://a.example , , https://b.example ",
            },
          }
        )
      )
    );

    const result = await fetchNextPage("https://example.com/page-2");

    expect(result.failedApis).toEqual([
      "https://a.example",
      "https://b.example",
    ]);
    expect(result.data.collections.map((collection) => collection.id)).toEqual([
      "page-2",
    ]);
  });

  it("ignores empty failed-upstream header values", async () => {
    server.use(
      http.get("http://localhost:8000/collections", () =>
        HttpResponse.json(
          {
            collections: [buildCollection("first")],
            links: [],
          },
          {
            headers: { "X-Failed-Upstream-Apis": " ,  , " },
          }
        )
      )
    );

    const result = await searchApi({ bbox: "", datetime: "", q: "forest" });

    expect(result.failedApis).toEqual([]);
  });

  it("surfaces API detail messages for failed searches", async () => {
    server.use(
      http.get("http://localhost:8000/collections", () =>
        HttpResponse.json({ detail: "Bad bbox" }, { status: 400 })
      )
    );

    await expect(
      searchApi({ bbox: "bad", datetime: "", q: "forest" })
    ).rejects.toThrow("Bad bbox");
  });

  it("surfaces a fallback message for failed pagination without detail", async () => {
    server.use(
      http.get("https://example.com/page-2", () =>
        HttpResponse.json({}, { status: 502, statusText: "Bad Gateway" })
      )
    );

    await expect(fetchNextPage("https://example.com/page-2")).rejects.toThrow(
      "Failed to fetch next page with status 502: Bad Gateway"
    );
  });

  it("classifies collection search and free-text conformance", async () => {
    server.use(
      http.get("http://localhost:8000/conformance", ({ request }) => {
        const url = new URL(request.url);
        expect(url.searchParams.getAll("apis")).toEqual([
          "https://api-a.example.com",
        ]);

        return HttpResponse.json({
          conformsTo: [
            "https://api.stacspec.org/v1.0.0/collection-search",
            "https://api.stacspec.org/v1.0.0/collection-search#free-text",
          ],
        });
      })
    );

    const conformance = await getApiConformance(["https://api-a.example.com"]);

    expect(hasCollectionSearchSupport(conformance.conformsTo)).toBe(true);
    expect(hasFreeTextSupport(conformance.conformsTo)).toBe(true);
    expect(
      hasCollectionSearchSupport(["https://api.stacspec.org/v1.0.0/core"])
    ).toBe(false);
    expect(
      hasFreeTextSupport(["https://api.stacspec.org/v1.0.0/collection-search"])
    ).toBe(false);
  });
});
