import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none cursor-pointer select-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 hover:shadow hover:shadow-primary/30 active:bg-primary active:shadow-none",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm shadow-destructive/25 hover:bg-destructive/90 hover:shadow hover:shadow-destructive/30 active:bg-destructive active:shadow-none",
        outline:
          "border border-input bg-background text-foreground shadow-sm hover:bg-primary/10 hover:text-primary hover:border-primary/50 active:bg-primary/15",
        secondary:
          "bg-muted text-foreground border border-border/60 shadow-sm hover:bg-muted/80 hover:text-foreground hover:border-border active:bg-muted/95",
        ghost:
          "text-foreground hover:bg-primary/10 hover:text-primary active:bg-primary/15",
        accent:
          "bg-accent text-accent-foreground shadow-sm shadow-accent/25 hover:bg-accent/90 hover:shadow hover:shadow-accent/30 active:bg-accent active:shadow-none",
        link:
          "text-primary underline-offset-4 hover:underline active:scale-100 p-0 h-auto font-medium",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6 text-sm font-semibold sm:text-base",
        icon: "h-9 w-9 p-0",
        iconSm: "h-8 w-8 p-0 text-xs",
        iconLg: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && !asChild ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
            {children}
          </>
        ) : (
          children
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
