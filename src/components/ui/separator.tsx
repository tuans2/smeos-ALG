"use client"

import * as React from "react"
import { Separator as BaseSeparator } from "@base-ui/react/separator"
import { cn } from "@/lib/utils"

export interface SeparatorProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseSeparator>, "className"> {
  orientation?: "horizontal" | "vertical" | undefined
  decorative?: boolean | undefined
  className?: string | undefined
}

export const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className, orientation = "horizontal", decorative: _decorative, ...props }, ref) => (
    <BaseSeparator
      ref={ref}
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className
      )}
      {...props}
    />
  )
)
Separator.displayName = "Separator"
