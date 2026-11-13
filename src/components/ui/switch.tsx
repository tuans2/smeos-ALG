"use client"

import * as React from "react"
import { Switch as BaseSwitch } from "@base-ui/react/switch"
import { cn } from "@/lib/utils"

export interface SwitchProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseSwitch.Root>, "className"> {
  className?: string | undefined
}

export const Switch = React.forwardRef<HTMLSpanElement, SwitchProps>(
  ({ className, ...props }, ref) => (
    <BaseSwitch.Root
      ref={ref}
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
        "bg-surface-alt hover:bg-border/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        "data-[checked]:bg-primary",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className
      )}
      {...props}
    >
      <BaseSwitch.Thumb
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform",
          "data-[checked]:translate-x-5 data-[unchecked]:translate-x-0"
        )}
      />
    </BaseSwitch.Root>
  )
)
Switch.displayName = "Switch"
