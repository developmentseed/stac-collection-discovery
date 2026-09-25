import React, { useState, useRef, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Map from "ol/Map";
import FullScreen from "ol/control/FullScreen.js";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import STAC from "ol-stac";
import proj4 from "proj4";
import { register } from "ol/proj/proj4";
import { transformExtent } from "ol/proj";
import "ol/ol.css";
import "ol-layerswitcher/dist/ol-layerswitcher.css";
import ReactMarkdown from "react-markdown";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ChevronDown,
  Loader2,
  AlertCircle,
  Info,
  Copy,
  Check,
  ExternalLink,
  Columns3,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/utils/utils";
import { stack, hstack, touchTarget, dialog } from "@/utils/responsive";
import { useDarkMode } from "@/utils/hooks";
import {
  getBasemapSource,
  createAttributionControl,
  getStacBoundsStyle,
} from "@/utils/map-utils";
import logoSvg from "@/assets/logo.svg";

register(proj4);

interface HintFormat {
  [hint_package: string]: string;
}

const formatTemporalRange = (ranges: any[]): string => {
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "Open";
    const date = new Date(dateString);
    return isNaN(date.getTime())
      ? "Invalid Date"
      : date.toISOString().split("T")[0];
  };

  const formatSingleRange = (range: any[]): string => {
    if (!Array.isArray(range) || range.length < 2) {
      return "Invalid range";
    }

    const [start, end] = range;
    const formattedStart = formatDate(start);
    const formattedEnd = formatDate(end);

    if (formattedStart === "Open" && formattedEnd === "Open") {
      return "Undefined range";
    } else if (formattedStart === "Open") {
      return `- ${formattedEnd}`;
    } else if (formattedEnd === "Open") {
      return `${formattedStart} - `;
    } else {
      return `${formattedStart} - ${formattedEnd}`;
    }
  };

  if (!Array.isArray(ranges) || ranges.length === 0) {
    return "No temporal extent data";
  }

  return ranges.map(formatSingleRange).join(", ");
};

const extractCatalogUrl = (collection: Record<string, any>): string => {
  // First check if there's already a catalog_url key (backward compatibility)
  if (collection.catalog_url) {
    return collection.catalog_url;
  }

  // Extract href from links array where rel="root"
  if (collection.links && Array.isArray(collection.links)) {
    const rootLink = collection.links.find((link: any) => link.rel === "root");
    if (rootLink && rootLink.href) {
      return rootLink.href;
    }
  }

  return "N/A";
};

const formatProviders = (providers: any[]): React.JSX.Element => {
  if (!Array.isArray(providers) || providers.length === 0) {
    return <p className="text-sm">No providers</p>;
  }

  return (
    <div className={stack({ gap: "sm" })}>
      {providers.map((provider: any, index: number) => (
        <div key={index}>
          <div className={hstack({ gap: "sm" })}>
            <span className="font-semibold">
              {provider.name || "Unknown Provider"}
            </span>
            {provider.roles && Array.isArray(provider.roles) && (
              <div className="flex flex-wrap gap-1">
                {provider.roles.map((role: string, roleIndex: number) => (
                  <Badge key={roleIndex} variant="secondary">
                    {role}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          {provider.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {provider.description}
            </p>
          )}
          {provider.url && (
            <a
              href={provider.url}
              className="text-sm text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {provider.url}
            </a>
          )}
        </div>
      ))}
    </div>
  );
};

const getPythonCodeHint = (apiUrl: string, collectionId: string): string => {
  return `# set up an item search with pystac_client
import pystac_client

catalog = pystac_client.Client.open("${apiUrl}")

# get a sample of 10 items
search = catalog.search(
    collections="${collectionId}",
    max_items=10,
)
items = search.items()

# consider using the bbox and/or datetime filters for a more targeted search.`;
};

const getRCodeHint = (apiUrl: string, collectionId: string): string => {
  return `# set up an item search with rstac
library(rstac)

catalog <- stac("${apiUrl}")

# get a sample of 10 items
items <- catalog |>
  stac_search(
    collections = "${collectionId}",
    limit = 10
  ) |>
  get_request()

# consider using the bbox and/or datetime args for a more targeted search`;
};

interface Props {
  data: Array<Record<string, any>>;
  hasNextPage?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  hasSearched?: boolean;
  failedApis?: string[];
  stacApis?: string[];
}

interface ColumnDef {
  key: string;
  label: string;
  alwaysVisible?: boolean;
  width: string;
}

const COLUMN_DEFS: ColumnDef[] = [
  { key: "title", label: "Title", alwaysVisible: true, width: "w-64 max-w-64" },
  { key: "id", label: "id", width: "w-48 max-w-48" },
  { key: "dateRange", label: "Date Range", width: "w-56 max-w-56" },
  { key: "api", label: "API", width: "w-56 max-w-56" },
  {
    key: "actions",
    label: "Actions",
    alwaysVisible: true,
    width: "w-36 max-w-36",
  },
];

const getFirstIntervalDate = (
  collection: Record<string, any>
): string | null => {
  const interval = collection.extent?.temporal?.interval;
  if (!Array.isArray(interval) || !Array.isArray(interval[0])) return null;
  return interval[0][0] || null;
};

const ResultsTable: React.FC<Props> = ({
  data,
  hasNextPage = false,
  isLoadingMore = false,
  onLoadMore,
  hasSearched = false,
  failedApis = [],
  stacApis = [],
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<Record<
    string,
    any | HintFormat
  > | null>(null);

  // State for collapsible sections
  const [showLinks, setShowLinks] = useState(false);
  const [showJSON, setShowJSON] = useState(false);

  // Column visibility (title and actions are always shown)
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const visibleColumns = COLUMN_DEFS.filter(
    (col) => col.alwaysVisible || !hiddenColumns.has(col.key)
  );
  const toggleColumn = (key: string) => {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Copy-to-clipboard feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const handleCopy = (row: Record<string, any>, rowKey: string) => {
    navigator.clipboard.writeText(JSON.stringify(row, null, 2));
    setCopiedId(rowKey);
    setTimeout(
      () => setCopiedId((current) => (current === rowKey ? null : current)),
      1500
    );
  };

  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Sort handler
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortOrder("asc");
    }
  };

  // Sorting data
  const sortedData = React.useMemo(() => {
    if (!sortColumn) return data;

    const getSortValue = (row: Record<string, any>): any => {
      if (sortColumn === "dateRange") return getFirstIntervalDate(row) || "";
      if (sortColumn === "api") return extractCatalogUrl(row);
      return row[sortColumn];
    };

    const sortedArray = [...data].sort((a, b) => {
      const aValue = getSortValue(a);
      const bValue = getSortValue(b);
      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return sortedArray;
  }, [sortColumn, sortOrder, data]);

  const renderCell = (header: string, row: Record<string, any>) => {
    if (header === "api") {
      return extractCatalogUrl(row);
    } else if (header === "dateRange") {
      const interval = row.extent?.temporal?.interval;
      return Array.isArray(interval) ? formatTemporalRange(interval) : "";
    } else if (Array.isArray(row[header])) {
      return row[header].join(", ");
    }
    return row[header];
  };

  const handleButtonClick = (record: Record<string, any>) => {
    setSelectedRecord(record);
    setIsOpen(true);
  };

  // Mobile card view renderer
  const renderCard = (row: Record<string, any>, rowIndex: number) => {
    const rowKey = row.id || String(rowIndex);
    const interval = row.extent?.temporal?.interval;

    return (
      <div
        key={rowKey}
        role="button"
        tabIndex={0}
        onClick={() => handleButtonClick(row)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleButtonClick(row);
          }
        }}
        aria-label={`View details for ${row.title || "Untitled"}`}
        className={cn(
          "shrink-0 border border-border rounded-lg p-4 cursor-pointer bg-card hover:bg-row-hover transition-colors duration-150 w-full text-left",
          stack({ gap: "sm" }),
          touchTarget()
        )}
      >
        <div>
          <h3 className="font-medium text-base mb-1">
            {row.title || "Untitled"}
          </h3>
          {row.id && (
            <p className="text-sm text-muted-foreground font-mono break-all">
              {row.id}
            </p>
          )}
        </div>
        {row.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {row.description}
          </p>
        )}
        <div className="text-sm">
          <span className="text-muted-foreground">API: </span>
          <span className="break-all">{extractCatalogUrl(row)}</span>
        </div>
        {Array.isArray(interval) && (
          <div className="text-sm">
            <span className="text-muted-foreground">Date range: </span>
            {formatTemporalRange(interval)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn(stack({ gap: "sm" }), "h-full min-h-0")}>
      <div className={cn(stack({ gap: "sm" }), "flex-none")}>
        {failedApis.length > 0 && (
          <Alert variant="warning">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              The following API{failedApis.length > 1 ? "s" : ""} did not
              respond and results may be incomplete:
              <ul className="mt-1 list-disc list-inside">
                {failedApis.map((api) => (
                  <li key={api} className="break-all">
                    {api}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {data.length > 0 && (
          <div className="flex items-center justify-between gap-2">
            <p
              className="text-sm text-foreground"
              role="status"
              aria-live="polite"
            >
              {data.length} {data.length === 1 ? "result" : "results"}
            </p>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden gap-2 sm:inline-flex"
                >
                  <Columns3 className="h-4 w-4" aria-hidden="true" />
                  Columns
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-56">
                <div className={stack({ gap: "sm" })}>
                  {COLUMN_DEFS.filter((col) => !col.alwaysVisible).map(
                    (col) => (
                      <label
                        key={col.key}
                        className={cn(hstack({ gap: "sm" }), "text-sm")}
                      >
                        <input
                          type="checkbox"
                          checked={!hiddenColumns.has(col.key)}
                          onChange={() => toggleColumn(col.key)}
                        />
                        {col.label}
                      </label>
                    )
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      <div className="w-full flex-1 min-h-0 flex flex-col overflow-hidden sm:rounded-lg sm:border sm:bg-card">
        {data.length === 0 ? (
          !hasSearched ? (
            <div
              className="flex-1 min-h-0 overflow-auto flex flex-col items-center justify-center p-16 text-center"
              role="status"
            >
              <img
                src={logoSvg}
                className="h-20 w-20 mb-6"
                aria-hidden="true"
                alt=""
              />
              <h3 className="text-xl font-semibold mb-3">
                Search for collections
              </h3>
              <p className="text-sm text-muted-foreground max-w-lg mb-4">
                Search across all configured STAC APIs:
              </p>
              {stacApis.length > 0 && (
                <ul className="text-sm text-muted-foreground space-y-2 max-w-lg text-left">
                  {stacApis.map((api, index) => (
                    <li key={index} className="break-all font-mono">
                      {api}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div
              className="flex-1 min-h-0 overflow-auto flex flex-col items-center justify-center p-16 text-center"
              role="status"
            >
              <img
                src={logoSvg}
                className="h-20 w-20 mb-6"
                aria-hidden="true"
                alt=""
              />
              <h3 className="text-xl font-semibold mb-3">
                No collections found
              </h3>
              <p className="text-sm text-muted-foreground max-w-lg mb-2">
                Try adjusting your search criteria or check your API
                configuration to find collections.
              </p>
              <p className="text-xs text-muted-foreground">
                You can modify bounding box coordinates, date ranges, or search
                terms to broaden your search.
              </p>
            </div>
          )
        ) : (
          <>
            {/* Mobile card view */}
            <div
              className={cn(
                "sm:hidden flex-1 min-h-0 overflow-auto",
                stack({ gap: "sm" })
              )}
              role="list"
              aria-label="Search results"
            >
              {sortedData.map((row, rowIndex) => renderCard(row, rowIndex))}
            </div>

            <Table containerClassName="hidden sm:block flex-1 min-h-0 h-full overflow-auto">
              <TableHeader>
                <TableRow>
                  {visibleColumns.map((col) => (
                    <TableHead
                      key={col.key}
                      className={cn(
                        "group sticky top-0 z-10 bg-background py-2 px-3 font-semibold border-b border-border whitespace-nowrap",
                        col.width,
                        col.key !== "actions" &&
                          "cursor-pointer hover:bg-muted",
                        col.key === "actions" && "text-center",
                        col.key === "title" &&
                          "left-0 z-20 border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]"
                      )}
                      onClick={
                        col.key !== "actions"
                          ? () => handleSort(col.key)
                          : undefined
                      }
                      role="columnheader"
                      aria-sort={
                        sortColumn === col.key
                          ? sortOrder === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                      tabIndex={col.key !== "actions" ? 0 : undefined}
                      onKeyDown={(e) => {
                        if (
                          col.key !== "actions" &&
                          (e.key === "Enter" || e.key === " ")
                        ) {
                          e.preventDefault();
                          handleSort(col.key);
                        }
                      }}
                    >
                      {col.key === "actions" ? (
                        <span className="sr-only">{col.label}</span>
                      ) : (
                        <div className="flex items-center gap-1">
                          {col.label}
                          {sortColumn === col.key ? (
                            sortOrder === "asc" ? (
                              <ArrowUp
                                className="h-3.5 w-3.5 shrink-0"
                                aria-hidden="true"
                              />
                            ) : (
                              <ArrowDown
                                className="h-3.5 w-3.5 shrink-0"
                                aria-hidden="true"
                              />
                            )
                          ) : (
                            <ArrowUp
                              className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-50"
                              aria-hidden="true"
                            />
                          )}
                        </div>
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((row, rowIndex) => {
                  const rowKey = row.id || String(rowIndex);
                  const rowBg =
                    rowIndex % 2 === 1 ? "bg-row-stripe" : "bg-card";
                  return (
                    <TableRow
                      key={rowKey}
                      onClick={() => handleButtonClick(row)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleButtonClick(row);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`View details for ${row.title || "Untitled"}`}
                      className={cn(
                        "group cursor-pointer transition-colors duration-150 hover:bg-row-hover",
                        rowIndex % 2 === 1 && "bg-row-stripe"
                      )}
                    >
                      {visibleColumns.map((col) => (
                        <TableCell
                          key={col.key}
                          className={cn(
                            "py-2 px-3 whitespace-nowrap",
                            col.width,
                            col.key !== "actions" && "truncate",
                            col.key === "title" &&
                              cn(
                                "sticky left-0 z-[1] border-r shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)] group-hover:bg-row-hover",
                                rowBg
                              )
                          )}
                        >
                          {col.key === "actions" ? (
                            <div
                              className={cn(
                                hstack({ gap: "xs" }),
                                "justify-center"
                              )}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleButtonClick(row)}
                                aria-label={`View details for ${row.title || "Untitled"}`}
                                title="View full collection details"
                              >
                                <Info className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleCopy(row, rowKey)}
                                aria-label={`Copy raw JSON for ${row.title || "Untitled"}`}
                                title="Copy raw JSON"
                              >
                                {copiedId === rowKey ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                  window.open(
                                    extractCatalogUrl(row),
                                    "_blank",
                                    "noopener,noreferrer"
                                  )
                                }
                                aria-label={`Open API link for ${row.title || "Untitled"}`}
                                title="Open API link"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : col.key === "title" ? (
                            <span className="font-medium">
                              {renderCell(col.key, row)}
                            </span>
                          ) : (
                            <span className="text-sm">
                              {renderCell(col.key, row)}
                            </span>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        )}

        {/* Load More Button */}
        {hasNextPage && (
          <div className="flex-none text-center p-2 sm:p-4 sm:border-t sm:border-border">
            <Button
              onClick={onLoadMore}
              disabled={isLoadingMore}
              variant="outline"
              size="sm"
              className={cn(
                "h-8 min-w-0 px-3 text-xs",
                "sm:h-auto sm:min-h-[44px] sm:min-w-[120px] sm:px-4 sm:text-sm"
              )}
              aria-label={
                isLoadingMore ? "Loading more results" : "Load more results"
              }
            >
              {isLoadingMore ? (
                <>
                  <Loader2
                    className="mr-1 h-3.5 w-3.5 animate-spin sm:mr-2 sm:h-4 sm:w-4"
                    aria-hidden="true"
                  />
                  Loading more...
                </>
              ) : (
                "Load More"
              )}
            </Button>
          </div>
        )}
      </div>

      {selectedRecord && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent
            className={cn(dialog({ size: "lg" }), "overflow-x-hidden")}
          >
            <DialogHeader>
              <DialogTitle>Collection Details</DialogTitle>
            </DialogHeader>
            <div className={cn(stack({ gap: "md" }), "overflow-x-hidden")}>
              {/* Core Information */}
              <div className="grid grid-cols-1 gap-3">
                {/* ID */}
                {selectedRecord.id && (
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                      ID
                    </p>
                    <p className="text-sm font-mono break-all">
                      {selectedRecord.id}
                    </p>
                  </div>
                )}

                {/* Source API */}
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                    API
                  </p>
                  <a
                    href={extractCatalogUrl(selectedRecord)}
                    className="text-sm text-primary hover:underline break-all"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {extractCatalogUrl(selectedRecord)}
                  </a>
                </div>

                {/* Title */}
                {selectedRecord.title && (
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                      Title
                    </p>
                    <p className="text-sm font-medium">
                      {selectedRecord.title}
                    </p>
                  </div>
                )}

                {/* Spatial and Temporal Extents */}
                {selectedRecord.extent && (
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                      Extents
                    </p>
                    <div className={stack({ gap: "sm" })}>
                      {selectedRecord.extent?.spatial?.bbox && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Spatial
                          </p>
                          <MapDisplay stacData={selectedRecord} />
                        </div>
                      )}
                      {selectedRecord.extent?.temporal?.interval && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Temporal
                          </p>
                          <p className="text-sm">
                            {formatTemporalRange(
                              selectedRecord.extent.temporal.interval
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Providers */}
                {selectedRecord.providers && (
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                      Providers
                    </p>
                    <div>{formatProviders(selectedRecord.providers)}</div>
                  </div>
                )}

                {/* Description */}
                {selectedRecord.description && (
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                      Description
                    </p>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown
                        components={{
                          a: ({ href, children }) => (
                            <a
                              href={href}
                              className="text-primary underline"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {selectedRecord.description}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-border" />

              {/* STAC Item Search Code Hints */}
              <div className="overflow-x-hidden">
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                  STAC Item Search Code Hints
                </p>
                <Tabs defaultValue="python">
                  <TabsList>
                    <TabsTrigger value="python">Python</TabsTrigger>
                    <TabsTrigger value="r">R</TabsTrigger>
                  </TabsList>
                  <TabsContent value="python" className="mt-4 overflow-x-auto">
                    <pre className="rounded-md bg-muted p-4 text-xs overflow-x-auto">
                      <code className="font-mono">
                        {getPythonCodeHint(
                          extractCatalogUrl(selectedRecord),
                          selectedRecord.id || "collection-id"
                        )}
                      </code>
                    </pre>
                  </TabsContent>
                  <TabsContent value="r" className="mt-4 overflow-x-auto">
                    <pre className="rounded-md bg-muted p-4 text-xs overflow-x-auto">
                      <code className="font-mono">
                        {getRCodeHint(
                          extractCatalogUrl(selectedRecord),
                          selectedRecord.id || "collection-id"
                        )}
                      </code>
                    </pre>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Collapsible Links Section */}
              {selectedRecord.links && Array.isArray(selectedRecord.links) && (
                <Collapsible open={showLinks} onOpenChange={setShowLinks}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between"
                      aria-expanded={showLinks}
                      aria-controls="links-content"
                    >
                      <span>
                        {showLinks ? "Hide" : "Show"} Links (
                        {selectedRecord.links.length})
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition-transform duration-200",
                          showLinks && "rotate-180"
                        )}
                        aria-hidden="true"
                      />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent
                    id="links-content"
                    className="mt-2 transition-all duration-200"
                  >
                    <div
                      className={cn(
                        "rounded-md bg-muted p-3",
                        stack({ gap: "sm" })
                      )}
                    >
                      {selectedRecord.links.map((link: any, index: number) => (
                        <div key={index}>
                          <div className={hstack({ gap: "sm" })}>
                            <Badge variant="outline">
                              {link.rel || "unknown"}
                            </Badge>
                            {link.href && (
                              <a
                                href={link.href}
                                className="text-sm text-primary hover:underline break-all"
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`${link.rel || "unknown"} link: ${link.title || link.href}`}
                              >
                                {link.href}
                              </a>
                            )}
                          </div>
                          {link.title && (
                            <p className="text-sm text-muted-foreground ml-2 mt-1">
                              {link.title}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Collapsible JSON Section */}
              <Collapsible open={showJSON} onOpenChange={setShowJSON}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between"
                    aria-expanded={showJSON}
                    aria-controls="json-content"
                  >
                    <span>{showJSON ? "Hide" : "Show"} Raw JSON</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        showJSON && "rotate-180"
                      )}
                      aria-hidden="true"
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent
                  id="json-content"
                  className="mt-2 transition-all duration-200 overflow-x-auto"
                >
                  <pre className="rounded-md bg-muted p-4 text-xs overflow-x-auto">
                    <code className="font-mono">
                      {JSON.stringify(selectedRecord, null, 2)}
                    </code>
                  </pre>
                </CollapsibleContent>
              </Collapsible>
            </div>
            <DialogFooter>
              <Button
                onClick={() => setIsOpen(false)}
                className={touchTarget()}
                aria-label="Close details dialog"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

interface MapDisplayProps {
  stacData?: any;
}

const MapDisplay: React.FC<MapDisplayProps> = ({ stacData }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Map | null>(null);
  const isDark = useDarkMode();

  useEffect(() => {
    if (mapRef.current && !mapInstanceRef.current) {
      // Use dark basemap in dark mode
      const tileSource = getBasemapSource(isDark);

      const background = new TileLayer({
        source: tileSource,
      });

      const layers: any[] = [background];
      let stacLayer: any = null;

      if (stacData) {
        stacLayer = new STAC({
          displayWebMapLink: true,
          data: stacData,
          boundsStyle: getStacBoundsStyle(),
        });
        // Configure STAC layer properties for layer switcher
        stacLayer.set("title", stacData.title || stacData.id || "STAC Layer");
        stacLayer.set("type", "overlay");
        layers.push(stacLayer);
      }

      const map = new Map({
        target: mapRef.current,
        layers,
        view: new View({
          center: [0, 0],
          zoom: 0,
          showFullExtent: true,
        }),
        controls: [createAttributionControl(isDark), new FullScreen()],
      });

      if (stacLayer) {
        // Try to fit extent from STAC data directly
        if (
          stacData.extent &&
          stacData.extent.spatial &&
          stacData.extent.spatial.bbox
        ) {
          const bbox = stacData.extent.spatial.bbox[0]; // Get first bbox
          if (bbox && bbox.length === 4) {
            let [minX, minY, maxX, maxY] = bbox;

            // Validate that all values are valid numbers
            if (
              [minX, minY, maxX, maxY].every(
                (val) => typeof val === "number" && isFinite(val)
              )
            ) {
              // Fix coordinate order if min/max are swapped
              if (minX > maxX) [minX, maxX] = [maxX, minX];
              if (minY > maxY) [minY, maxY] = [maxY, minY];

              // Check that extent is not empty
              if (minX !== maxX || minY !== maxY) {
                const extent4326 = [minX, minY, maxX, maxY];
                const extent3857 = transformExtent(
                  extent4326,
                  "EPSG:4326",
                  "EPSG:3857"
                );
                console.log(
                  "Fitting to extent from STAC data (4326):",
                  extent4326
                );
                console.log("Transformed extent (3857):", extent3857);
                map.getView().fit(extent3857, {
                  padding: [50, 50, 50, 50],
                });
              } else {
                console.warn("Empty extent in STAC data:", bbox);
              }
            } else {
              console.warn("Invalid extent values in STAC data:", bbox);
            }
          }
        }

        // Also listen for ready event as fallback
        stacLayer.on("ready", () => {
          console.log("STAC layer ready event fired");
          let extent = stacLayer.getExtent();
          console.log("STAC layer extent:", extent);

          if (
            extent &&
            Array.isArray(extent) &&
            extent.length === 4 &&
            extent.every((val) => typeof val === "number" && isFinite(val))
          ) {
            // Fix coordinate order if min/max are swapped
            let [minX, minY, maxX, maxY] = extent;
            if (minX > maxX) [minX, maxX] = [maxX, minX];
            if (minY > maxY) [minY, maxY] = [maxY, minY];

            // Check that extent is not empty
            if (minX !== maxX || minY !== maxY) {
              map.getView().fit([minX, minY, maxX, maxY], {
                padding: [20, 20, 20, 20],
                maxZoom: 18,
              });
            } else {
              console.warn("Empty extent from STAC layer:", extent);
            }
          } else {
            console.warn("Invalid extent from STAC layer:", extent);
          }
        });
      }
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.dispose();
        mapInstanceRef.current = null;
      }
    };
  }, [stacData]);

  return (
    <div
      className="h-[500px]"
      ref={mapRef}
      role="img"
      aria-label={`Map showing spatial extent for ${stacData?.title || "collection"}`}
    />
  );
};

export default ResultsTable;
