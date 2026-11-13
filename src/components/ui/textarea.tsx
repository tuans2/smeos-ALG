import * as React from "react"
import { useFormField } from "@/components/ui/form-field"
import { cn } from "@/lib/utils"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      hasError: explicitHasError,
      id: explicitId,
      name: explicitName,
      required: explicitRequired,
      disabled: explicitDisabled,
      rows = 3,
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

    return (
      <textarea
        ref={ref}
        id={id}
        name={name}
        rows={rows}
        required={isRequired}
        disabled={isDisabled}
        aria-invalid={hasError ? "true" : undefined}
        aria-describedby={describedBy}
        className={cn(
          "flex min-h-[80px] w-full rounded-xl border bg-surface px-3.5 py-2.5 text-body text-text transition-colors",
          "placeholder:text-text-muted",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          "disabled:cursor-not-allowed disabled:opacity-50 resize-y",
          hasError
            ? "border-danger focus-visible:outline-danger"
            : "border-border hover:border-primary/40",
          className
        )}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"
