import * as React from "react"
import { useFormField } from "@/components/ui/form-field"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  inputSize?: "default" | "sm"
  hasError?: boolean
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = "text",
      inputSize = "default",
      hasError: explicitHasError,
      id: explicitId,
      name: explicitName,
      required: explicitRequired,
      disabled: explicitDisabled,
      ...props
    },
    ref
  ) => {
    const field = useFormField()

    const id = explicitId || field?.id
    const name = explicitName || field?.name
    const isRequired = explicitRequired ?? field?.required
    const isDisabled = explicitDisabled ?? field?.disabled
    const hasError = explicitHasError ?? field?.hasError ?? false

    const describedBy = [
      props["aria-describedby"],
      field?.descriptionId,
      hasError ? field?.errorId : undefined,
    ]
      .filter(Boolean)
      .join(" ") || undefined

    const sizeClasses = {
      default: "h-12 px-3.5 py-2.5 text-body",
      sm: "h-9 px-3 py-1.5 text-body-sm",
    }

    return (
      <input
        ref={ref}
        id={id}
        name={name}
        type={type}
        required={isRequired}
        disabled={isDisabled}
        aria-invalid={hasError ? "true" : undefined}
        aria-describedby={describedBy}
        className={cn(
          "flex w-full rounded-xl border bg-surface text-text transition-colors",
          "placeholder:text-text-muted",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          "disabled:cursor-not-allowed disabled:opacity-50",
          hasError
            ? "border-danger focus-visible:outline-danger"
            : "border-border hover:border-primary/40",
          sizeClasses[inputSize],
          className
        )}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"
