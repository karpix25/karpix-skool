import * as React from "react"

import { cn } from "../../lib/utils"

interface HorizontalRailProps extends React.HTMLAttributes<HTMLDivElement> {
    contentClassName?: string;
}

const HorizontalRail = React.forwardRef<HTMLDivElement, HorizontalRailProps>(
    ({ className, contentClassName, children, ...props }, ref) => (
        <div
            ref={ref}
            className={cn(
                "no-scrollbar -mx-4 overflow-x-auto overscroll-x-contain px-4",
                className
            )}
            {...props}
        >
            <div className={cn("flex w-max min-w-full gap-3", contentClassName)}>
                {children}
            </div>
        </div>
    )
)
HorizontalRail.displayName = "HorizontalRail"

export { HorizontalRail }
