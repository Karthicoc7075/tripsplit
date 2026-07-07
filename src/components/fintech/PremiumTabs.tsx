import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

const PremiumTabs = TabsPrimitive.Root;

const PremiumTabsList = ({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) => (
  <TabsPrimitive.List
    className={cn(
      "flex w-full flex-wrap gap-0.5 border-b border-border/60 sm:flex-nowrap sm:gap-1",
      className
    )}
    {...props}
  />
);

const PremiumTabsTrigger = ({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) => (
  <TabsPrimitive.Trigger
    className={cn("premium-tab-trigger shrink-0 px-3 py-2 sm:px-4 sm:py-2.5 text-xs sm:text-sm flex items-center justify-center", className)}
    {...props}
  />
);

const PremiumTabsContent = ({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) => (
  <TabsPrimitive.Content className={cn("mt-6 focus-visible:outline-none", className)} {...props} />
);

export { PremiumTabs, PremiumTabsList, PremiumTabsTrigger, PremiumTabsContent };