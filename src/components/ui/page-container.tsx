import * as React from "react"
import { cn } from "@/lib/utils"

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "default" | "fluid" | "narrow"
}

export const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(
  function PageContainer({ className, size = "default", ...props }, ref) {
    const sizeClasses = {
      default: "max-w-7xl",
      fluid: "max-w-full",
      narrow: "max-w-4xl",
    }

    return (
      <div
        ref={ref}
        className={cn(
          "w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6",
          sizeClasses[size],
          className
        )}
        {...props}
      />
    )
  }
)
PageContainer.displayName = "PageContainer"
