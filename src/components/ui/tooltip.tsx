"use client"

import * as React from "react"
import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip"
import { cn } from "@/lib/utils"

export interface TooltipProviderProps {
  delayDuration?: number | undefined
  children: React.ReactNode
}

export function TooltipProvider({ children }: TooltipProviderProps) {
  return <BaseTooltip.Provider>{children}</BaseTooltip.Provider>
}

export interface TooltipProps {
  open?: boolean | undefined
  defaultOpen?: boolean | undefined
  onOpenChange?: ((open: boolean) => void) | undefined
  children?: React.ReactNode
}

export function Tooltip({ open, defaultOpen, onOpenChange, children }: TooltipProps) {
  return (
    <BaseTooltip.Root
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={(next) => onOpenChange?.(next)}
    >
      {children}
    </BaseTooltip.Root>
  )
}

export interface TooltipTriggerProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseTooltip.Trigger>, "className"> {
  asChild?: boolean | undefined
  className?: string | undefined
}

export const TooltipTrigger = React.forwardRef<HTMLButtonElement, TooltipTriggerProps>(
  ({ asChild, children, ...props }, ref) => {
    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<Record<string, unknown>>
      return (
        <BaseTooltip.Trigger ref={ref} {...props} render={child} />
      )
    }
    return (
      <BaseTooltip.Trigger ref={ref} {...props}>
        {children}
      </BaseTooltip.Trigger>
    )
  }
)
TooltipTrigger.displayName = "TooltipTrigger"

export interface TooltipContentProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseTooltip.Popup>, "className"> {
  side?: "top" | "right" | "bottom" | "left" | undefined
  align?: "start" | "center" | "end" | undefined
  sideOffset?: number | undefined
  className?: string | undefined
}

export const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  ({ className, children, side = "top", align = "center", sideOffset = 4, ...props }, ref) => (
    <BaseTooltip.Portal>
      <BaseTooltip.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        className="z-[var(--z-tooltip)]"
      >
        <BaseTooltip.Popup
          ref={ref}
          className={cn(
            "z-50 overflow-hidden rounded-xl border border-border bg-surface px-3 py-1.5 text-body-sm text-text shadow-lg",
            "animate-in fade-in-50 zoom-in-95",
            className
          )}
          {...props}
        >
          {children}
        </BaseTooltip.Popup>
      </BaseTooltip.Positioner>
    </BaseTooltip.Portal>
  )
)
TooltipContent.displayName = "TooltipContent"
