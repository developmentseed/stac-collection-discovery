import React from "react";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { cn, getHostname } from "../utils/utils";
import { hstack } from "../utils/responsive";
import { ChevronDown } from "lucide-react";

interface Props {
  providerOptions: string[];
  hostOptions: string[];
  selectedProviders: string[];
  selectedHosts: string[];
  onProvidersChange?: (providers: string[]) => void;
  onHostsChange?: (hosts: string[]) => void;
}

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

// Filters that narrow the collections already loaded in the results table,
// as opposed to SearchForm's fields which change the upstream query.
const ResultsFilters: React.FC<Props> = ({
  providerOptions,
  hostOptions,
  selectedProviders,
  selectedHosts,
  onProvidersChange,
  onHostsChange,
}) => {
  return (
    <div className={cn(hstack({ gap: "sm" }), "flex-wrap")}>
      <span className="text-sm font-medium text-muted-foreground">
        Filters:
      </span>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "relative gap-1 px-2 text-xs has-[>svg]:px-2",
              "sm:gap-1.5 sm:px-3 sm:text-sm sm:has-[>svg]:px-2.5"
            )}
          >
            Provider
            <ChevronDown
              className="h-3.5 w-3.5 transition-transform duration-200 sm:h-4 sm:w-4"
              aria-hidden="true"
            />
            {selectedProviders.length > 0 && (
              <span
                className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-blue-500 ring-2 ring-background"
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
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn(
              "relative gap-1 px-2 text-xs has-[>svg]:px-2",
              "sm:gap-1.5 sm:px-3 sm:text-sm sm:has-[>svg]:px-2.5"
            )}
          >
            Host
            <ChevronDown
              className="h-3.5 w-3.5 transition-transform duration-200 sm:h-4 sm:w-4"
              aria-hidden="true"
            />
            {selectedHosts.length > 0 && (
              <span
                className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-blue-500 ring-2 ring-background"
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
    </div>
  );
};

export default ResultsFilters;
