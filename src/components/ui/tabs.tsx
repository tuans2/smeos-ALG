"use client"

import * as React from "react"
import { Tabs as BaseTabs } from "@base-ui/react/tabs"
import { cn } from "@/lib/utils"

export const Tabs = BaseTabs.Root

export interface TabsListProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseTabs.List>, "className"> {
  className?: string | undefined
}

export const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, ...props }, ref) => (
    <BaseTabs.List
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-2xl border border-border bg-surface-alt/80 p-1.5 text-text",
        className
      )}
      {...props}
    />
  )
)
TabsList.displayName = "TabsList"

export interface TabsTriggerProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseTabs.Tab>, "className"> {
  className?: string | undefined
}

export const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, ...props }, ref) => (
    <BaseTabs.Tab
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-body-sm font-semibold transition-all",
        "text-text-muted hover:text-text hover:bg-surface/50",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        // Base UI đánh dấu tab đang mở bằng `data-active` (không có `data-selected`) — audit-log AUD-02, 07/11/2026
        "data-[active]:bg-surface data-[active]:text-primary data-[active]:shadow-sm data-[active]:border data-[active]:border-border",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
)
TabsTrigger.displayName = "TabsTrigger"

export interface TabsContentProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseTabs.Panel>, "className"> {
  className?: string | undefined
}

export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, ...props }, ref) => (
    <BaseTabs.Panel
      ref={ref}
      className={cn(
        "mt-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        className
      )}
      {...props}
    />
  )
)
TabsContent.displayName = "TabsContent"
