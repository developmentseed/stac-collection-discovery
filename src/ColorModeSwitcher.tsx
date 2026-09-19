import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/utils/utils";
import { useDarkMode, toggleColorMode } from "@/utils/hooks";

interface ColorModeSwitcherProps {
  className?: string;
}

export const ColorModeSwitcher: React.FC<ColorModeSwitcherProps> = ({
  className,
}) => {
  const isDark = useDarkMode();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleColorMode}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      className={cn("min-h-[44px] min-w-[44px]", className)}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
};
