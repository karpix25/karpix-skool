import { cva } from "class-variance-authority"

export const buttonVariants = cva(
    "inline-flex min-h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-[background-color,border-color,color,box-shadow,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 disabled:pointer-events-none disabled:opacity-45 active:scale-[0.99] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    {
        variants: {
            variant: {
                default:
                    "bg-primary text-primary-foreground shadow-[0_1px_2px_rgba(15,23,42,0.10)] hover:bg-primary/90",
                destructive:
                    "bg-destructive text-destructive-foreground shadow-[0_1px_2px_rgba(15,23,42,0.10)] hover:bg-destructive/90",
                outline:
                    "border border-input bg-card text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-primary/30 hover:bg-accent/70 hover:text-accent-foreground",
                secondary:
                    "border border-border/70 bg-secondary text-secondary-foreground hover:bg-secondary/80",
                ghost: "text-muted-foreground hover:bg-accent/70 hover:text-accent-foreground",
                link: "text-primary underline-offset-4 hover:underline",
            },
            size: {
                default: "h-11 px-4 py-2",
                sm: "h-11 min-h-11 rounded-lg px-3",
                lg: "h-12 min-h-12 rounded-lg px-5",
                icon: "h-11 w-11 min-h-11 min-w-11 rounded-lg",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)
