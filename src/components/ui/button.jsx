import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "../../lib/utils"

const buttonVariants = {
  default:
    "bg-zarewa-teal text-white hover:bg-zarewa-teal-hover shadow-md shadow-zarewa-teal/15",
  secondary: "bg-zarewa-teal-soft/40 text-zarewa-teal hover:bg-zarewa-teal-soft/70",
  outline:
    "border border-[var(--z-border)] bg-white text-zarewa-teal hover:bg-[var(--z-surface-muted)]",
  ghost: "text-[var(--z-text-muted)] hover:bg-[var(--z-surface-muted)] hover:text-zarewa-teal",
  destructive: "bg-[var(--z-error-container)] text-[var(--z-error)] hover:brightness-95",
  link: "text-zarewa-teal underline-offset-4 hover:underline shadow-none px-0 h-auto min-h-0",
}

const buttonSizes = {
  default: "h-10 min-h-10 px-5 py-2 text-sm",
  sm: "h-9 min-h-9 px-3 text-xs",
  lg: "h-12 min-h-12 px-8 text-sm",
  icon: "h-10 w-10 min-h-10 min-w-10 p-0",
}

const Button = React.forwardRef(({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"

  const classString = cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zarewa-teal/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 text-center active:scale-[0.98]",
    buttonVariants[variant],
    buttonSizes[size],
    className
  )

  return <Comp className={classString} ref={ref} {...props} />
})
Button.displayName = "Button"

export { Button }
