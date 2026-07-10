import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "../../lib/utils"

const buttonVariants = {
  default: "bg-zarewa-teal text-white hover:brightness-110 shadow-lg shadow-teal-900/10",
  secondary: "bg-teal-50 text-zarewa-teal hover:bg-teal-100",
  outline: "border border-gray-200 bg-white text-zarewa-teal hover:bg-gray-50",
  ghost: "text-gray-600 hover:bg-gray-100/50 hover:text-zarewa-teal",
  destructive: "bg-red-50 text-red-600 hover:bg-red-100",
  link: "text-zarewa-teal underline-offset-4 hover:underline shadow-none px-0 h-auto min-h-0",
}

const buttonSizes = {
  default: "h-10 min-h-10 px-6 py-2 pb-2.5 text-sm",
  sm: "h-9 min-h-9 px-3 text-xs",
  lg: "h-12 min-h-12 px-8 text-sm",
  icon: "h-10 w-10 min-h-10 min-w-10 p-0",
}

const Button = React.forwardRef(({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"

  const classString = cn(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 disabled:pointer-events-none disabled:opacity-50 text-sm text-center active:scale-[0.98]",
    buttonVariants[variant],
    buttonSizes[size],
    className
  )

  return <Comp className={classString} ref={ref} {...props} />
})
Button.displayName = "Button"

export { Button }
