"use client"

import * as React from "react"
import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox"
import { Check } from "@/components/ui/icon-set/check"
import { cn } from "@/lib/utils"

export interface CheckboxProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseCheckbox.Root>, "className"> {
  className?: string | undefined
}

export const Checkbox = React.forwardRef<HTMLSpanElement, CheckboxProps>(
  ({ className, ...props }, ref) => (
    <BaseCheckbox.Root
      ref={ref}
      className={cn(
        "peer relative inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-white transition-colors",
        // Vùng bấm ≥ 24px (WCAG 2.5.8), 44px trên màn cảm ứng; không đổi kích thước hiển thị
        "after:absolute after:-inset-0.5 [@media(pointer:coarse)]:after:-inset-3",
        "hover:border-primary/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        "data-[checked]:bg-primary data-[checked]:border-primary",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className
      )}
      {...props}
    >
      <BaseCheckbox.Indicator className="flex items-center justify-center text-white">
        <Check className="h-3.5 w-3.5 stroke-[3]" />
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  )
)
Checkbox.displayName = "Checkbox"
