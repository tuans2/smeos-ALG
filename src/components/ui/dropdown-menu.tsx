"use client"

import * as React from "react"
import { Menu as BaseMenu } from "@base-ui/react/menu"
import { cn } from "@/lib/utils"

export const DropdownMenu = BaseMenu.Root
export const DropdownMenuTrigger = BaseMenu.Trigger
export const DropdownMenuGroup = BaseMenu.Group

export interface DropdownMenuContentProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseMenu.Popup>, "className"> {
  sideOffset?: number | undefined
  align?: "start" | "center" | "end" | undefined
  className?: string | undefined
}

export const DropdownMenuContent = React.forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({ className, children, sideOffset = 4, align = "start", ...props }, ref) => (
    <BaseMenu.Portal>
      <BaseMenu.Positioner sideOffset={sideOffset} align={align} className="z-[var(--z-overlay)]">
        <BaseMenu.Popup
          ref={ref}
          className={cn(
            "min-w-[12rem] overflow-hidden rounded-xl border border-border bg-surface p-1 text-text shadow-xl",
            "animate-in fade-in-50 zoom-in-95",
            className
          )}
          {...props}
        >
          {children}
        </BaseMenu.Popup>
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  )
)
DropdownMenuContent.displayName = "DropdownMenuContent"

export interface DropdownMenuItemProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseMenu.Item>, "className"> {
  destructive?: boolean | undefined
  className?: string | undefined
}

export const DropdownMenuItem = React.forwardRef<HTMLDivElement, DropdownMenuItemProps>(
  ({ className, destructive, children, ...props }, ref) => (
    <BaseMenu.Item
      ref={ref}
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-2 text-body-sm text-text outline-none transition-colors",
        "hover:bg-surface-alt focus:bg-surface-alt",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        destructive && "text-danger hover:bg-danger/10 focus:bg-danger/10",
        className
      )}
      {...props}
    >
      {children}
    </BaseMenu.Item>
  )
)
DropdownMenuItem.displayName = "DropdownMenuItem"

export interface DropdownMenuLabelProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseMenu.GroupLabel>, "className"> {
  className?: string | undefined
}

export const DropdownMenuLabel = React.forwardRef<HTMLDivElement, DropdownMenuLabelProps>(
  ({ className, ...props }, ref) => (
    <BaseMenu.GroupLabel
      ref={ref}
      className={cn("px-2.5 py-1 text-caption font-semibold text-text-muted uppercase tracking-wider", className)}
      {...props}
    />
  )
)
DropdownMenuLabel.displayName = "DropdownMenuLabel"

export interface DropdownMenuSeparatorProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseMenu.Separator>, "className"> {
  className?: string | undefined
}

export const DropdownMenuSeparator = React.forwardRef<HTMLDivElement, DropdownMenuSeparatorProps>(
  ({ className, ...props }, ref) => (
    <BaseMenu.Separator
      ref={ref}
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
)
DropdownMenuSeparator.displayName = "DropdownMenuSeparator"
