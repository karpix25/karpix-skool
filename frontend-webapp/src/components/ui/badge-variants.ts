import { cva } from "class-variance-authority"

export const badgeVariants = cva(
    "inline-flex min-h-7 items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring/25",
    {
        variants: {
            variant: {
                default:
                    "border-primary/20 bg-primary/10 text-primary hover:bg-primary/15",
                secondary:
                    "border-border/70 bg-secondary text-secondary-foreground hover:bg-secondary/80",
                destructive:
                    "border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/15",
                outline: "border-border/80 bg-card text-muted-foreground",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)
