import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"
import { cn } from "../../../src/lib/utils"

const Switch = React.forwardRef<
    React.ElementRef<typeof SwitchPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
    <SwitchPrimitive.Root
        className={cn(
            "group peer relative inline-flex h-11 w-[52px] shrink-0 cursor-pointer items-center rounded-full bg-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-50",
            className
        )}
        {...props}
        ref={ref}
    >
        <span className="pointer-events-none absolute left-0 top-1/2 h-7 w-12 -translate-y-1/2 rounded-full border border-border/80 bg-input transition-colors group-data-[state=checked]:border-primary/40 group-data-[state=checked]:bg-primary group-data-[state=unchecked]:bg-muted" />
        <SwitchPrimitive.Thumb
            className={cn(
                "pointer-events-none relative z-10 block h-5 w-5 rounded-full bg-card shadow-[0_1px_3px_rgba(15,23,42,0.18)] ring-0 transition-transform data-[state=checked]:translate-x-6 data-[state=unchecked]:translate-x-1"
            )}
        />
    </SwitchPrimitive.Root>
))
Switch.displayName = SwitchPrimitive.Root.displayName

export { Switch }
