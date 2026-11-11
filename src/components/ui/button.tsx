import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-button)] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-40 select-none",
  {
    variants: {
      variant: {
        primary: "bg-primary text-white hover:bg-primary-dark active:opacity-90",
        secondary: "bg-surface text-primary border border-border hover:border-primary active:bg-surface-alt",
        outline: "border border-border bg-transparent text-text hover:bg-surface-alt active:bg-border/30",
        ghost: "text-text hover:bg-surface-alt active:bg-border/30",
        warning: "bg-warning text-text hover:opacity-90 active:opacity-80",
        danger: "bg-danger text-white hover:opacity-90 active:opacity-80",
        subtle: "bg-surface-alt text-text hover:bg-border/70 border border-transparent active:bg-border",
      },
      size: {
        default: "h-12 px-5 text-title-sm",
        sm: "h-11 px-4 text-sm",
        xs: "h-8 px-2.5 text-caption rounded-[var(--radius-button)] [@media(pointer:coarse)]:min-h-[44px]",
        lg: "h-14 px-6 text-base",
        icon: "h-11 w-11",
        "icon-sm": "h-8 w-8 rounded-[var(--radius-button)] [@media(pointer:coarse)]:min-h-[44px] [@media(pointer:coarse)]:min-w-[44px]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      disabled,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    const spinner = loading ? (
      <svg
        className="h-4 w-4 animate-spin motion-reduce:hidden text-current"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    ) : null

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{
        className?: string
        children?: React.ReactNode
        [key: string]: unknown
      }>
      return React.cloneElement(child, {
        ...props,
        ...child.props,
        ref,
        className: cn(buttonVariants({ variant, size }), className, child.props.className),
        "aria-busy": loading ? true : undefined,
        "aria-disabled": isDisabled ? true : undefined,
        children: (
          <>
            {spinner}
            {child.props.children}
          </>
        ),
      })
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-busy={loading ? true : undefined}
        onClick={props.onClick}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {spinner}
        {children}
      </button>
    )
  }
)
Button.displayName = "Button"
