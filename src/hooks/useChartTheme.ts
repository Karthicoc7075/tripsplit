import { useTheme } from "@/components/ThemeProvider";

export function useChartTheme() {
  const { theme } = useTheme();
  const isDark =
    theme === "dark" ||
    (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  return {
    isDark,
    colors: isDark
      ? ["#14B8A6", "#FBBF24", "#34D399", "#F87171", "#A78BFA"]
      : ["#0F766E", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6"],
    primary: isDark ? "#14B8A6" : "#0F766E",
    grid: isDark ? "#1a1a1a" : "#f1f5f9",
    text: isDark ? "#94A3B8" : "#64748B",
    tooltip: {
      bg: isDark ? "#0F0F0F" : "#ffffff",
      border: isDark ? "#2A2A2A" : "#e2e8f0",
    },
  };
}