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
            className="relative gap-2"
          >
            Provider
            <ChevronDown
              className={cn("h-4 w-4 transition-transform duration-200")}
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
            className="relative gap-2"
          >
            Host
            <ChevronDown
              className={cn("h-4 w-4 transition-transform duration-200")}
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
