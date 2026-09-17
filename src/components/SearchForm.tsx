import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { DatePicker } from "./ui/date-picker";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { cn } from "../utils/utils";
import { hstack, touchTarget } from "../utils/responsive";
import { Calendar, Scan, Search, X } from "lucide-react";

const MapModal = React.lazy(() => import("./MapModal"));

type FormData = {
  bbox: string;
  datetime: string;
  q: string;
};

interface Props {
  onSubmit: (data: FormData) => void;
  apiError?: string | null;
  isLoading?: boolean;
  conformanceCapabilities?: {
    hasCollectionSearch: boolean;
    hasFreeText: boolean;
  } | null;
  conformanceLoading?: boolean;
  results?: Array<Record<string, any>>;
  stacApis?: string[];
  selectedProviders?: string[];
  selectedHosts?: string[];
  onProvidersChange?: (providers: string[]) => void;
  onHostsChange?: (hosts: string[]) => void;
}

// Parse datetime interval from URL parameter
const parseDatetimeInterval = (
  datetime: string
): { start: Date | null; end: Date | null } => {
  if (!datetime) return { start: null, end: null };

  const parts = datetime.split("/");
  const start = parts[0] && parts[0] !== ".." ? new Date(parts[0]) : null;
  const end = parts[1] && parts[1] !== ".." ? new Date(parts[1]) : null;

  return { start, end };
};

// Initialize form data from URL parameters
const getInitialFormData = () => {
  const params = new URLSearchParams(window.location.search);
  const datetime = params.get("datetime") || "";
  const { start, end } = parseDatetimeInterval(datetime);

  return {
    bbox: params.get("bbox") || "",
    startDatetime: start,
    endDatetime: end,
    q: params.get("q") || "",
  };
};

const getHostname = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

const getUniqueProviders = (results: Array<Record<string, any>>): string[] => {
  const names = new Set<string>();
  results.forEach((collection) => {
    if (Array.isArray(collection.providers)) {
      collection.providers.forEach((provider: any) => {
        if (provider?.name) names.add(provider.name);
      });
    }
  });
  return Array.from(names).sort();
};

const SearchForm: React.FC<Props> = ({
  onSubmit,
  isLoading,
  conformanceCapabilities,
  results = [],
  stacApis = [],
  selectedProviders = [],
  selectedHosts = [],
  onProvidersChange,
  onHostsChange,
}) => {
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isBboxOpen, setIsBboxOpen] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);

  const [formData, setFormData] = useState<
    Omit<FormData, "datetime"> & {
      startDatetime: Date | null;
      endDatetime: Date | null;
    }
  >(getInitialFormData);

  const [bboxError, setBboxError] = useState<string>("");

  const validateBbox = (value: string): boolean => {
    if (!value) return true;

    const cleanedValue = value.replace(/\s+/g, " ").trim();
    const coordinates = cleanedValue.split(/[\s,]+/);

    if (coordinates.length !== 4) {
      setBboxError("Please enter exactly 4 numbers");
      return false;
    }

    const isValid = coordinates.every((coord) => {
      const num = Number(coord);
      return !isNaN(num) && isFinite(num);
    });

    if (!isValid) {
      setBboxError("All values must be valid numbers");
      return false;
    }

    setBboxError("");
    return true;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === "bbox") {
      validateBbox(value);
    }
    setFormData({ ...formData, [name]: value });
  };

  const handleDateChange = (
    date: Date | null,
    field: "startDatetime" | "endDatetime"
  ) => {
    setFormData({ ...formData, [field]: date });
  };

  const formatDateInterval = (start: Date | null, end: Date | null): string => {
    const dateFormatter = (date: Date | null, isStart = true) => {
      if (!date) return "..";
      const formattedDate = new Date(date);
      if (isStart) {
        formattedDate.setHours(0, 0, 0, 0);
      } else {
        formattedDate.setHours(23, 59, 59, 999);
      }
      return (
        formattedDate.toISOString().replace(".999Z", "").replace(".000Z", "") +
        "Z"
      );
    };
    if (!start && !end) return "";
    return `${dateFormatter(start)}/${dateFormatter(end, false)}`;
  };

  const submitWith = (data: typeof formData) => {
    const datetime = formatDateInterval(data.startDatetime, data.endDatetime);
    const submitData = {
      bbox: data.bbox,
      datetime,
      q: data.q,
    };

    // Update URL with search parameters
    const params = new URLSearchParams();
    if (submitData.q) params.set("q", submitData.q);
    if (submitData.bbox) params.set("bbox", submitData.bbox);
    if (submitData.datetime) params.set("datetime", submitData.datetime);

    const newUrl = `${window.location.pathname}${params.toString() ? "?" + params.toString() : ""}`;
    window.history.pushState({}, "", newUrl);

    onSubmit(submitData);
  };

  const handleSubmit = (event?: React.FormEvent) => {
    event?.preventDefault();

    if (!validateBbox(formData.bbox)) {
      setIsBboxOpen(true);
      return;
    }

    submitWith(formData);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLFormElement>) => {
    if (event.key === "Enter") {
      handleSubmit();
    }
  };

  const updateBoundingBox = (bbox: string) => {
    setFormData({ ...formData, bbox });
    setIsMapOpen(false);
  };

  const toggleSelection = (
    value: string,
    selected: string[],
    onChange?: (values: string[]) => void
  ) => {
    if (!onChange) return;
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const clearAll = () => {
    const cleared = {
      bbox: "",
      startDatetime: null,
      endDatetime: null,
      q: formData.q,
    };
    setFormData(cleared);
    setBboxError("");
    onProvidersChange?.([]);
    onHostsChange?.([]);
    submitWith(cleared);
  };

  const removeBbox = () => {
    const next = { ...formData, bbox: "" };
    setFormData(next);
    setBboxError("");
    submitWith(next);
  };

  const removeDateRange = () => {
    const next = { ...formData, startDatetime: null, endDatetime: null };
    setFormData(next);
    submitWith(next);
  };

  const removeProvider = (provider: string) => {
    onProvidersChange?.(selectedProviders.filter((p) => p !== provider));
  };

  const removeHost = (host: string) => {
    onHostsChange?.(selectedHosts.filter((h) => h !== host));
  };

  const today = new Date();
  const isTextSearchDisabled = conformanceCapabilities
    ? !conformanceCapabilities.hasFreeText
    : false;

  const hasDateRange = !!(formData.startDatetime || formData.endDatetime);
  const providerOptions = getUniqueProviders(results);
  const hostOptions = stacApis;

  const formatDateShort = (date: Date | null) =>
    date ? date.toISOString().split("T")[0] : "..";

  const hasActiveFilters =
    !!formData.bbox ||
    hasDateRange ||
    selectedProviders.length > 0 ||
    selectedHosts.length > 0;

  return (
    <form
      onKeyDown={handleKeyDown}
      onSubmit={handleSubmit}
      className="flex flex-col gap-3"
      aria-label="Collection search form"
    >
      <div className="flex flex-wrap items-start gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Label htmlFor="q" className="sr-only">
            Keywords
          </Label>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="q"
            name="q"
            value={formData.q}
            onChange={handleChange}
            placeholder={
              isTextSearchDisabled
                ? "Text search not available"
                : "Enter keywords to search descriptions"
            }
            disabled={isTextSearchDisabled}
            className="pl-9"
            aria-describedby={isTextSearchDisabled ? "q-help" : undefined}
          />
          {isTextSearchDisabled && (
            <p id="q-help" className="sr-only">
              Text search is disabled - no upstream APIs support free-text
              search
            </p>
          )}
        </div>

        <Popover open={isBboxOpen} onOpenChange={setIsBboxOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="relative h-10 gap-2"
            >
              <Scan className="h-4 w-4" aria-hidden="true" />
              Bounding Box
              {!!formData.bbox && (
                <span
                  className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-blue-500 ring-2 ring-background"
                  aria-hidden="true"
                />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-80 max-w-[calc(100vw-2rem)]"
            align="start"
            collisionPadding={16}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="bbox" className="font-semibold text-sm">
                bounding box{" "}
                <span className="font-normal text-xs text-muted-foreground">
                  (xmin, ymin, xmax, ymax; EPSG:4326)
                </span>
              </Label>
              <Input
                id="bbox"
                name="bbox"
                value={formData.bbox}
                onChange={handleChange}
                placeholder="Enter bounding box"
                className={cn(bboxError && "border-destructive")}
                aria-invalid={!!bboxError}
                aria-describedby={bboxError ? "bbox-error" : "bbox-help"}
              />
              <span id="bbox-help" className="sr-only">
                Format: xmin, ymin, xmax, ymax in EPSG:4326
              </span>
              {bboxError && (
                <p
                  id="bbox-error"
                  className="text-sm text-destructive"
                  role="alert"
                >
                  {bboxError}
                </p>
              )}
              <Button
                type="button"
                onClick={() => setIsMapOpen(true)}
                variant="outline"
                size="sm"
                className={touchTarget()}
                aria-label="Open map to draw bounding box"
              >
                Draw on Map
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="relative h-10 gap-2"
            >
              <Calendar className="h-4 w-4" aria-hidden="true" />
              Date Range
              {hasDateRange && (
                <span
                  className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-blue-500 ring-2 ring-background"
                  aria-hidden="true"
                />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto max-w-[calc(100vw-2rem)]"
            align="start"
            collisionPadding={16}
          >
            <fieldset className="flex flex-col gap-2">
              <legend className="font-semibold text-sm mb-1">
                temporal range
              </legend>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1">
                  <Label htmlFor="start-date" className="sr-only">
                    Start date
                  </Label>
                  <DatePicker
                    date={formData.startDatetime}
                    onSelect={(date) =>
                      handleDateChange(date || null, "startDatetime")
                    }
                    maxDate={today}
                    placeholder="start date"
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="end-date" className="sr-only">
                    End date
                  </Label>
                  <DatePicker
                    date={formData.endDatetime}
                    onSelect={(date) =>
                      handleDateChange(date || null, "endDatetime")
                    }
                    maxDate={today}
                    placeholder="end date"
                  />
                </div>
              </div>
            </fieldset>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" className="h-10 gap-2">
              Provider
              {selectedProviders.length > 0 && (
                <span
                  className="h-2 w-2 rounded-full bg-primary"
                  aria-hidden="true"
                />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-64 max-w-[calc(100vw-2rem)]"
            align="start"
            collisionPadding={16}
          >
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-sm">provider</p>
              {providerOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Search to see available providers
                </p>
              ) : (
                providerOptions.map((provider) => (
                  <label
                    key={provider}
                    className={cn(
                      hstack({ gap: "sm" }),
                      "text-sm text-muted-foreground break-words"
                    )}
                  >
                    <input
                      type="checkbox"
                      className="shrink-0"
                      checked={selectedProviders.includes(provider)}
                      onChange={() =>
                        toggleSelection(
                          provider,
                          selectedProviders,
                          onProvidersChange
                        )
                      }
                    />
                    {provider}
                  </label>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" className="h-10 gap-2">
              Host
              {selectedHosts.length > 0 && (
                <span
                  className="h-2 w-2 rounded-full bg-primary"
                  aria-hidden="true"
                />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-64 max-w-[calc(100vw-2rem)]"
            align="start"
            collisionPadding={16}
          >
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-sm">host</p>
              {hostOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No APIs configured
                </p>
              ) : (
                hostOptions.map((api) => (
                  <label
                    key={api}
                    className={cn(
                      hstack({ gap: "sm" }),
                      "text-sm text-muted-foreground"
                    )}
                  >
                    <input
                      type="checkbox"
                      className="shrink-0"
                      checked={selectedHosts.includes(api)}
                      onChange={() =>
                        toggleSelection(api, selectedHosts, onHostsChange)
                      }
                    />
                    <span className="break-all">{getHostname(api)}</span>
                  </label>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        <Button
          type="submit"
          disabled={isLoading}
          className="h-10 min-w-[100px]"
          aria-label={
            isLoading ? "Searching collections" : "Search for collections"
          }
        >
          {isLoading ? "Searching..." : "Search"}
        </Button>
      </div>

      {hasActiveFilters && (
        <div className={cn(hstack({ gap: "sm" }), "flex-wrap")}>
          {selectedHosts.map((host) => (
            <Badge key={host} variant="secondary" className="gap-1">
              {getHostname(host)}
              <button
                type="button"
                onClick={() => removeHost(host)}
                aria-label={`Remove host filter ${getHostname(host)}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {selectedProviders.map((provider) => (
            <Badge key={provider} variant="secondary" className="gap-1">
              {provider}
              <button
                type="button"
                onClick={() => removeProvider(provider)}
                aria-label={`Remove provider filter ${provider}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {!!formData.bbox && (
            <Badge variant="secondary" className="gap-1">
              {formData.bbox}
              <button
                type="button"
                onClick={removeBbox}
                aria-label="Remove bounding box filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {hasDateRange && (
            <Badge variant="secondary" className="gap-1">
              {formatDateShort(formData.startDatetime)} -{" "}
              {formatDateShort(formData.endDatetime)}
              <button
                type="button"
                onClick={removeDateRange}
                aria-label="Remove date range filter"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          <button
            type="button"
            onClick={clearAll}
            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      <React.Suspense fallback={null}>
        <MapModal
          isOpen={isMapOpen}
          onClose={() => setIsMapOpen(false)}
          onSubmit={(bbox) => {
            updateBoundingBox(bbox);
            setIsMapOpen(false);
          }}
        />
      </React.Suspense>
    </form>
  );
};

export default SearchForm;
