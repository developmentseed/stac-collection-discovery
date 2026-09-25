import * as React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import GitHubLogo from "./assets/github-mark.svg";
import { cn } from "@/utils/utils";
import { stack, hstack, touchTarget, container } from "@/utils/responsive";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useMediaQuery } from "@/utils/hooks";

import { ColorModeSwitcher } from "./ColorModeSwitcher";
import {
  getApiDocs,
  searchApi,
  fetchNextPage,
  getApiConformance,
  ConformanceResponse,
  hasCollectionSearchSupport,
  hasFreeTextSupport,
} from "./api/search";
import { getApiConfigurations } from "./utils/api-config";
import GlobalHeader from "./components/GlobalHeader";

type ApiError = string | null;

const SearchForm = React.lazy(() => import("./components/SearchForm"));
const ResultsTable = React.lazy(() => import("./components/ResultsTable"));
const ApiConfigPanel = React.lazy(() => import("./components/ApiConfigPanel"));
const ApiDocModal = React.lazy(() => import("./components/ApiDocModal"));

export const App = () => {
  const [results, setResults] = React.useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [loadingMore, setLoadingMore] = React.useState<boolean>(false);
  const [apiError, setApiError] = React.useState<ApiError>(null); // For 400/500 errors
  const [failedApis, setFailedApis] = React.useState<string[]>([]);
  const [nextPageUrl, setNextPageUrl] = React.useState<string | null>(null);
  const [hasSearched, setHasSearched] = React.useState<boolean>(false);
  const hasRunInitialSearch = React.useRef(false);

  const [, setDocsLoading] = React.useState(true);
  const [apiDocs, setApiDocs] = React.useState<any | null>(null);
  const [docsError, setDocsError] = React.useState<string | null>(null);

  // STAC APIs management
  const [stacApis, setStacApis] = React.useState<string[]>([]);

  // API docs modal state
  const [isDocOpen, setIsDocOpen] = React.useState(false);

  // API config modal state - hoisted to prevent loss when stacApis changes
  const [isApiConfigOpen, setIsApiConfigOpen] = React.useState(false);

  // Mobile search accordion state - open by default so first-time visitors
  // see the search tools/filters; collapses once a search has been run
  // (see handleSearch) and can be reopened via the header's toggle button
  const [isMobileSearchOpen, setIsMobileSearchOpen] = React.useState(true);
  const isDesktop = useMediaQuery("(min-width: 640px)");

  // Client-side facet filters applied to fetched results
  const [selectedHosts, setSelectedHosts] = React.useState<string[]>([]);
  const [selectedProviders, setSelectedProviders] = React.useState<string[]>(
    []
  );

  // Conformance management
  const [conformanceLoading, setConformanceLoading] = React.useState(true);
  const [conformanceData, setConformanceData] =
    React.useState<ConformanceResponse | null>(null);
  const [conformanceError, setConformanceError] = React.useState<string | null>(
    null
  );

  // Initialize STAC APIs from config (session-based, no localStorage)
  React.useEffect(() => {
    const defaultApis = getApiConfigurations().map((config) => config.url);
    setStacApis(defaultApis);
  }, []);

  React.useEffect(() => {
    async function fetchApiDocs() {
      try {
        setDocsLoading(true);
        setDocsError(null);
        const apiDocs = await getApiDocs();
        setApiDocs(apiDocs);
      } catch (err) {
        console.error("Failed to fetch API documentation", err);
        setDocsError(
          "Failed to load API documentation. Please try refreshing the page."
        );
      } finally {
        setDocsLoading(false);
      }
    }

    fetchApiDocs();
  }, []);

  // Fetch conformance data when STAC APIs change
  React.useEffect(() => {
    async function fetchConformanceData() {
      if (stacApis.length === 0) {
        setConformanceLoading(false);
        return;
      }

      try {
        setConformanceLoading(true);
        setConformanceError(null);
        const conformance = await getApiConformance(stacApis);
        setConformanceData(conformance);
      } catch (err) {
        setConformanceError(
          "Failed to load API conformance. Collection search features may not work as expected."
        );
      } finally {
        setConformanceLoading(false);
      }
    }

    fetchConformanceData();
  }, [stacApis]);

  const handleSearch = async (formData: {
    bbox: string;
    datetime: string;
    q: string;
  }) => {
    setLoading(true);
    setApiError(null);
    setResults([]);
    setFailedApis([]);
    setIsMobileSearchOpen(false); // Collapse the mobile search panel on search

    try {
      const { data: searchData, failedApis: failures } = await searchApi(
        formData,
        stacApis
      );
      setResults(searchData.collections);
      setFailedApis(failures);
      setHasSearched(true);

      // Extract next page URL from links
      const nextLink = searchData.links?.find(
        (link: any) => link.rel === "next"
      );
      setNextPageUrl(nextLink?.href || null);
    } catch (error) {
      console.error("Search error:", error);
      setApiError(
        error instanceof Error ? error.message : "An unexpected error occurred"
      );
      setHasSearched(true);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (!nextPageUrl || loadingMore) return;

    setLoadingMore(true);
    setApiError(null);

    try {
      const { data: pageData, failedApis: failures } =
        await fetchNextPage(nextPageUrl);

      // Append new results to existing ones
      setResults((prevResults) => [...prevResults, ...pageData.collections]);
      setFailedApis((prev) => [...new Set([...prev, ...failures])]);

      // Update next page URL for potential further pagination
      const nextLink = pageData.links?.find((link: any) => link.rel === "next");
      setNextPageUrl(nextLink?.href || null);
    } catch (error) {
      console.error("Load more error:", error);
      setApiError(
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while loading more results"
      );
    } finally {
      setLoadingMore(false);
    }
  };

  const handleUpdateStacApis = React.useCallback((newApis: string[]) => {
    setStacApis(newApis);
  }, []);

  // Trigger search on mount if URL has search parameters
  React.useEffect(() => {
    if (hasRunInitialSearch.current || stacApis.length === 0) return;

    const params = new URLSearchParams(window.location.search);
    if (params.has("q") || params.has("bbox") || params.has("datetime")) {
      hasRunInitialSearch.current = true;
      handleSearch({
        q: params.get("q") || "",
        bbox: params.get("bbox") || "",
        datetime: params.get("datetime") || "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stacApis]); // Run when stacApis are initialized

  // Calculate conformance capabilities
  const conformanceCapabilities = React.useMemo(() => {
    // Only restrict features when we have explicit conformance data showing lack of support
    if (!conformanceData || stacApis.length === 0) {
      return null; // No restrictions
    }

    return {
      hasCollectionSearch: hasCollectionSearchSupport(
        conformanceData.conformsTo
      ),
      hasFreeText: hasFreeTextSupport(conformanceData.conformsTo),
    };
  }, [conformanceData, stacApis]);

  const getCollectionApiUrl = (collection: Record<string, any>): string => {
    if (collection.catalog_url) return collection.catalog_url;
    const rootLink = collection.links?.find((link: any) => link.rel === "root");
    return rootLink?.href || "";
  };

  // Apply client-side Host/Provider facet filters to the fetched results
  const filteredResults = React.useMemo(() => {
    return results.filter((collection) => {
      if (selectedHosts.length > 0) {
        const apiUrl = getCollectionApiUrl(collection);
        if (!selectedHosts.includes(apiUrl)) return false;
      }
      if (selectedProviders.length > 0) {
        const providerNames = Array.isArray(collection.providers)
          ? collection.providers.map((p: any) => p.name)
          : [];
        if (!selectedProviders.some((p) => providerNames.includes(p)))
          return false;
      }
      return true;
    });
  }, [results, selectedHosts, selectedProviders]);

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-background text-foreground">
      {/* Skip to main content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-100 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        Skip to main content
      </a>
      <GlobalHeader
        stacApis={stacApis}
        isMobileSearchOpen={isMobileSearchOpen}
        setIsMobileSearchOpen={setIsMobileSearchOpen}
        setIsDocOpen={setIsDocOpen}
        setIsApiConfigOpen={setIsApiConfigOpen}
      />

      <main
        id="main-content"
        className={cn(
          "flex-1 min-h-0 flex flex-col",
          container({ maxWidth: "custom" }),
          stack({ gap: "xs" }),
          "mx-auto"
        )}
      >
        {docsError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{docsError}</AlertDescription>
          </Alert>
        )}

        {conformanceError && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{conformanceError}</AlertDescription>
          </Alert>
        )}

        {conformanceCapabilities &&
          !conformanceCapabilities.hasCollectionSearch && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                The current set of configured upstream APIs does not support
                collection search. Please check your STAC API configuration.
              </AlertDescription>
            </Alert>
          )}

        {apiError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{apiError}</AlertDescription>
          </Alert>
        )}
        <div
          id="mobile-search-panel"
          className={cn(
            "grid flex-none transition-[grid-template-rows] duration-300 ease-in-out sm:grid-rows-[1fr]",
            isMobileSearchOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          )}
          inert={!isDesktop && !isMobileSearchOpen ? true : undefined}
        >
          <div className="min-h-0 overflow-hidden">
            <div className={cn(stack({ gap: "sm" }), "pb-1")}>
              <React.Suspense fallback={<LoadingSpinner size="sm" />}>
                <SearchForm
                  onSubmit={handleSearch}
                  apiError={apiError}
                  isLoading={loading}
                  conformanceCapabilities={conformanceCapabilities}
                  conformanceLoading={conformanceLoading}
                  results={results}
                  stacApis={stacApis}
                  selectedProviders={selectedProviders}
                  selectedHosts={selectedHosts}
                  onProvidersChange={setSelectedProviders}
                  onHostsChange={setSelectedHosts}
                />
              </React.Suspense>
            </div>
          </div>
        </div>

        <section
          aria-label="Search results"
          className="flex-1 min-h-0 flex flex-col"
        >
          {loading ? (
            <div className="flex flex-1 items-center justify-center">
              <LoadingSpinner size="lg" text="Searching collections..." />
            </div>
          ) : (
            <React.Suspense fallback={<LoadingSpinner size="lg" />}>
              <ResultsTable
                data={filteredResults}
                hasNextPage={!!nextPageUrl}
                isLoadingMore={loadingMore}
                onLoadMore={handleLoadMore}
                hasSearched={hasSearched}
                failedApis={failedApis}
                stacApis={stacApis}
              />
            </React.Suspense>
          )}
        </section>
      </main>

      {/* Footer with links */}
      <footer className="flex-none bg-background border-t">
        <nav
          className={cn(
            "flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2",
            container({ maxWidth: "custom", padding: "none" }),
            "p-1 sm:p-3 mx-auto"
          )}
          aria-label="Footer navigation"
        >
          <div className={cn(hstack({ gap: "sm" }), "flex-wrap w-full")}>
            <React.Suspense fallback={null}>
              <ApiConfigPanel
                variant="compact"
                stacApis={stacApis}
                onUpdate={handleUpdateStacApis}
                isOpen={isApiConfigOpen}
                onOpenChange={setIsApiConfigOpen}
                failedApis={failedApis}
              />
            </React.Suspense>
            <Button
              onClick={() => setIsDocOpen(true)}
              variant="outline"
              size="sm"
              className={cn(touchTarget(), "hidden sm:inline-flex ml-auto")}
              aria-label="View API documentation"
            >
              API Documentation
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              className={cn(touchTarget(), "hidden sm:inline-flex")}
            >
              <a
                href="https://github.com/developmentseed/stac-collection-discovery"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(hstack({ gap: "sm" }), "justify-center")}
                aria-label="View source code on GitHub"
              >
                <img
                  src={GitHubLogo}
                  className="size-4 dark:invert"
                  alt=""
                  aria-hidden="true"
                />
                <span className="sm:inline">Source Code</span>
              </a>
            </Button>
          </div>
          <div className="hidden sm:flex sm:justify-end">
            <ColorModeSwitcher />
          </div>
        </nav>
      </footer>

      {/* API Documentation Modal */}
      <React.Suspense fallback={null}>
        <ApiDocModal
          isOpen={isDocOpen}
          onClose={() => setIsDocOpen(false)}
          apiDocs={apiDocs}
        />
      </React.Suspense>
    </div>
  );
};
