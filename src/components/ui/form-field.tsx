import * as React from "react"
import { cn } from "@/lib/utils"

export interface FormFieldContextValue {
  id: string
  name?: string | undefined
  errorId: string
  descriptionId: string
  hasError: boolean
  required: boolean
  disabled: boolean
}

export const FormFieldContext = React.createContext<FormFieldContextValue | null>(null)

export function useFormField() {
  return React.useContext(FormFieldContext)
}

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  id?: string | undefined
  name?: string | undefined
  error?: string | boolean | null | undefined
  required?: boolean | undefined
  disabled?: boolean | undefined
  children: React.ReactNode
}

export function FormField({
  id: explicitId,
  name,
  error,
  required = false,
  disabled = false,
  className,
  children,
  ...props
}: FormFieldProps) {
  const generatedId = React.useId()
  const id = explicitId || generatedId
  const errorId = `${id}-error`
  const descriptionId = `${id}-description`
  const hasError = Boolean(error)

  const contextValue = React.useMemo<FormFieldContextValue>(
    () => ({
      id,
      name,
      errorId,
      descriptionId,
      hasError,
      required,
      disabled,
    }),
    [id, name, errorId, descriptionId, hasError, required, disabled]
  )

  return (
    <FormFieldContext.Provider value={contextValue}>
      <div className={cn("space-y-1.5", className)} {...props}>
        {children}
      </div>
    </FormFieldContext.Provider>
  )
}

export function RequiredMark() {
  return (
    <span className="text-danger ml-0.5 select-none" aria-hidden="true">
      *
    </span>
  )
}

export interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  optionalText?: string | undefined
  showOptional?: boolean | undefined
}

export const FormLabel = React.forwardRef<HTMLLabelElement, FormLabelProps>(
  ({ className, children, optionalText = "(Tuỳ chọn)", showOptional = false, ...props }, ref) => {
    const field = useFormField()
    const id = props.htmlFor || field?.id
    const isRequired = field?.required

    return (
      <label
        ref={ref}
        htmlFor={id}
        className={cn(
          "block text-body-sm font-semibold text-text",
          field?.disabled && "cursor-not-allowed opacity-60",
          className
        )}
        {...props}
      >
        {children}
        {isRequired ? (
          <RequiredMark />
        ) : showOptional ? (
          <span className="ml-1 text-caption font-normal text-text-muted">{optionalText}</span>
        ) : null}
      </label>
    )
  }
)
FormLabel.displayName = "FormLabel"

export type FormDescriptionProps = React.HTMLAttributes<HTMLParagraphElement>

export const FormDescription = React.forwardRef<HTMLParagraphElement, FormDescriptionProps>(
  ({ className, id: explicitId, ...props }, ref) => {
    const field = useFormField()
    const id = explicitId || field?.descriptionId

    return (
      <p
        ref={ref}
        id={id}
        className={cn("text-body-sm text-text-muted leading-relaxed", className)}
        {...props}
      />
    )
  }
)
FormDescription.displayName = "FormDescription"

export interface FormMessageProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children?: React.ReactNode | undefined
}

export const FormMessage = React.forwardRef<HTMLParagraphElement, FormMessageProps>(
  ({ className, children, id: explicitId, ...props }, ref) => {
    const field = useFormField()
    const id = explicitId || field?.errorId

    if (!children && !field?.hasError) {
      return null
    }

    return (
      <p
        ref={ref}
        id={id}
        role="alert"
        aria-live="polite"
        className={cn("text-body-sm font-medium text-danger animate-in fade-in-50", className)}
        {...props}
      >
        {children}
      </p>
    )
  }
)
FormMessage.displayName = "FormMessage"
