"use client"

import * as React from "react"
import { Select as BaseSelect } from "@base-ui/react/select"
import { ChevronDown } from "@/components/ui/icon-set/chevron-down"
import { Check } from "@/components/ui/icon-set/check"
import { cn } from "@/lib/utils"

export interface SelectProps<T extends string = string> {
  value?: T | null | undefined
  defaultValue?: T | null | undefined
  onValueChange?: ((value: T) => void) | undefined
  open?: boolean | undefined
  defaultOpen?: boolean | undefined
  onOpenChange?: ((open: boolean) => void) | undefined
  disabled?: boolean | undefined
  required?: boolean | undefined
  name?: string | undefined
  children?: React.ReactNode
}

export function Select<T extends string = string>({
  value,
  defaultValue,
  onValueChange,
  children,
  ...props
}: SelectProps<T>) {
  return (
    <BaseSelect.Root
      value={value ?? undefined}
      defaultValue={defaultValue ?? undefined}
      onValueChange={(val) => {
        if (val !== null && onValueChange) {
          (onValueChange as (v: T) => void)(val as T)
        }
      }}
      {...props}
    >
      {children}
    </BaseSelect.Root>
  )
}

export const SelectGroup = BaseSelect.Group
export const SelectValue = BaseSelect.Value

export interface SelectTriggerProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseSelect.Trigger>, "className"> {
  error?: boolean | undefined
  className?: string | undefined
}

export const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
  ({ className, children, error, ...props }, ref) => (
    <BaseSelect.Trigger
      ref={ref}
      className={cn(
        "flex h-11 w-full items-center justify-between rounded-xl border border-border bg-surface px-3.5 py-2 text-body-sm text-text transition-colors",
        "placeholder:text-text-muted hover:border-primary/40",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        "disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
        error && "border-danger focus-visible:outline-danger",
        className
      )}
      {...props}
    >
      {children}
      <BaseSelect.Icon>
        <ChevronDown className="h-4 w-4 text-text-muted opacity-70" />
      </BaseSelect.Icon>
    </BaseSelect.Trigger>
  )
)
SelectTrigger.displayName = "SelectTrigger"

export interface SelectContentProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseSelect.Popup>, "className"> {
  sideOffset?: number | undefined
  side?: "top" | "right" | "bottom" | "left" | undefined
  align?: "start" | "center" | "end" | undefined
  position?: "popper" | "item-aligned" | undefined
  className?: string | undefined
}

export const SelectContent = React.forwardRef<HTMLDivElement, SelectContentProps>(
  ({ className, children, sideOffset = 4, side = "bottom", align = "start", position: _position, ...props }, ref) => (
    <BaseSelect.Portal>
      <BaseSelect.Positioner
        sideOffset={sideOffset}
        side={side}
        align={align}
        className="z-[var(--z-overlay)]"
      >
        <BaseSelect.Popup
          ref={ref}
          className={cn(
            "relative max-h-96 min-w-[8rem] overflow-hidden rounded-xl border border-border bg-surface p-1 text-text shadow-lg",
            "animate-in fade-in-50 zoom-in-95",
            className
          )}
          {...props}
        >
          {children}
        </BaseSelect.Popup>
      </BaseSelect.Positioner>
    </BaseSelect.Portal>
  )
)
SelectContent.displayName = "SelectContent"

export interface SelectLabelProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseSelect.GroupLabel>, "className"> {
  className?: string | undefined
}

export const SelectLabel = React.forwardRef<HTMLDivElement, SelectLabelProps>(
  ({ className, ...props }, ref) => (
    <BaseSelect.GroupLabel
      ref={ref}
      className={cn("py-1.5 pl-8 pr-2 text-caption font-semibold text-text-muted", className)}
      {...props}
    />
  )
)
SelectLabel.displayName = "SelectLabel"

export interface SelectItemProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseSelect.Item>, "className"> {
  className?: string | undefined
}

export const SelectItem = React.forwardRef<HTMLDivElement, SelectItemProps>(
  ({ className, children, ...props }, ref) => (
    <BaseSelect.Item
      ref={ref}
      className={cn(
        "relative flex w-full cursor-pointer select-none items-center rounded-lg py-2 pl-8 pr-2.5 text-body-sm text-text outline-none transition-colors",
        "hover:bg-surface-alt focus:bg-surface-alt",
        "data-[selected]:font-semibold data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-4 w-4 items-center justify-center text-primary">
        <BaseSelect.ItemIndicator>
          <Check className="h-3.5 w-3.5" />
        </BaseSelect.ItemIndicator>
      </span>
      <BaseSelect.ItemText>{children}</BaseSelect.ItemText>
    </BaseSelect.Item>
  )
)
SelectItem.displayName = "SelectItem"

export interface SelectSeparatorProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseSelect.Separator>, "className"> {
  className?: string | undefined
}

export const SelectSeparator = React.forwardRef<HTMLDivElement, SelectSeparatorProps>(
  ({ className, ...props }, ref) => (
    <BaseSelect.Separator
      ref={ref}
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
)
SelectSeparator.displayName = "SelectSeparator"

export interface NativeSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean | undefined
}

export const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, error, children, ...props }, ref) => (
    <div className="relative w-full">
      <select
        ref={ref}
        className={cn(
          "flex h-11 w-full appearance-none items-center rounded-xl border border-border bg-surface px-3.5 py-2 pr-9 text-body-sm text-text transition-colors",
          "hover:border-primary/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-danger focus:border-danger focus:ring-danger/20",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted opacity-70" />
    </div>
  )
)
NativeSelect.displayName = "NativeSelect"
