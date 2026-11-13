"use client"

import * as React from "react"
import { Radio as BaseRadio, RadioGroup as BaseRadioGroup } from "@base-ui/react"
import { cn } from "@/lib/utils"

export interface RadioGroupProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseRadioGroup>, "className"> {
  className?: string | undefined
}

export const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, ...props }, ref) => (
    <BaseRadioGroup
      ref={ref}
      className={cn("grid gap-2.5", className)}
      {...props}
    />
  )
)
RadioGroup.displayName = "RadioGroup"

export interface RadioGroupItemProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseRadio.Root>, "className"> {
  value: string
  disabled?: boolean | undefined
  className?: string | undefined
}

export const RadioGroupItem = React.forwardRef<HTMLSpanElement, RadioGroupItemProps>(
  ({ className, ...props }, ref) => (
    <BaseRadio.Root
      ref={ref}
      className={cn(
        "peer inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-surface transition-colors",
        "hover:border-primary/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        "data-[checked]:border-primary",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className
      )}
      {...props}
    >
      <BaseRadio.Indicator className="flex items-center justify-center">
        <span className="h-2.5 w-2.5 rounded-full bg-primary" />
      </BaseRadio.Indicator>
    </BaseRadio.Root>
  )
)
RadioGroupItem.displayName = "RadioGroupItem"
