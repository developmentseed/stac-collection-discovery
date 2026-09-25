import { useState } from "react";
import { cn } from "../utils/utils";
import { useDarkMode, toggleColorMode } from "../utils/hooks";
import { Button } from "@/components/ui/button";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  ExternalLink,
  FileText,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
} from "lucide-react";
import GitHubLogo from "../assets/github-mark.svg";
import Logo from "../assets/logo-text.svg";
import { hstack, touchTarget, container } from "@/utils/responsive";

interface GlobalHeaderProps {
  stacApis: string[];
  isMobileSearchOpen: boolean;
  setIsMobileSearchOpen: (open: boolean) => void;
  setIsDocOpen: (open: boolean) => void;
  setIsApiConfigOpen: (open: boolean) => void;
}

const GlobalHeader = ({
  stacApis,
  isMobileSearchOpen,
  setIsMobileSearchOpen,
  setIsDocOpen,
  setIsApiConfigOpen,
}: GlobalHeaderProps) => {
  // Mobile hamburger menu state - holds nav items relocated from the footer
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isDark = useDarkMode();
  return (
    <header className="flex-none border-b bg-background">
      <div
        className={cn(
          "flex items-center justify-between gap-4",
          container({ maxWidth: "custom" }),
          "mx-auto py-2 sm:py-3"
        )}
      >
        <button
          onClick={() => (window.location.href = "/")}
          className={cn(
            hstack({ gap: "sm" }),
            "cursor-pointer hover:opacity-80 transition-opacity text-left"
          )}
          aria-label="Return to home page"
        >
          <img
            src={Logo}
            alt="STAC Collection Discovery"
            className="h-10 w-auto"
          />
          <span className="hidden sm:flex sm:flex-col sm:gap-1">
            <span className="text-lg font-semibold leading-tight">
              STAC Collection Discovery
            </span>
            <span className="text-sm text-muted-foreground leading-tight">
              Search across {stacApis.length} configured STAC APIs
            </span>
          </span>
        </button>
        <div className={cn(hstack({ gap: "sm" }), "sm:hidden")}>
          <Button
            variant="outline"
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
            className={cn(touchTarget(), "gap-2 px-3")}
            aria-label={
              isMobileSearchOpen ? "Hide search panel" : "Show search panel"
            }
            aria-expanded={isMobileSearchOpen}
            aria-controls="mobile-search-panel"
          >
            <Search className="h-5 w-5" aria-hidden="true" />
            Search
          </Button>
          {/* Mobile Menu */}
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={touchTarget({ size: "icon-lg" })}
                aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="flex w-4/5 max-w-xs flex-col p-4"
              aria-describedby={undefined}
            >
              <SheetHeader>
                <SheetTitle>STAC Collection Discovery</SheetTitle>
              </SheetHeader>
              <nav
                className="flex flex-1 flex-col"
                aria-label="Mobile navigation"
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsDocOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    hstack({ gap: "sm" }),
                    "rounded-md px-3 py-3 text-sm text-left hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  API Documentation
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsApiConfigOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    hstack({ gap: "sm" }),
                    "rounded-md px-3 py-3 text-sm text-left hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Settings className="h-4 w-4" aria-hidden="true" />
                  API Settings
                </button>
                <a
                  href="https://github.com/developmentseed/stac-collection-discovery"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    hstack({ gap: "sm" }),
                    "rounded-md px-3 py-3 text-sm hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <img
                    src={GitHubLogo}
                    className="size-4 dark:invert"
                    alt=""
                    aria-hidden="true"
                  />
                  Source Code
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
                <button
                  type="button"
                  onClick={() => {
                    toggleColorMode();
                    setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    hstack({ gap: "sm" }),
                    "rounded-md px-3 py-3 text-sm text-left hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  {isDark ? (
                    <Sun className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Moon className="h-4 w-4" aria-hidden="true" />
                  )}
                  Theme
                </button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default GlobalHeader;
