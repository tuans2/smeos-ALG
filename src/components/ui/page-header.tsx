import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { InfoTip } from "@/components/ui/info-tip"
import { ChevronLeft } from "@/components/ui/icon-set/chevron-left"
import { ChevronRight } from "@/components/ui/icon-set/chevron-right"

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title: React.ReactNode
  description?: React.ReactNode
  breadcrumbs?: React.ReactNode
  breadcrumbItems?: BreadcrumbItem[]
  badge?: React.ReactNode
  actions?: React.ReactNode
  /** Giải thích chi tiết đặt trong dấu "?" cạnh tiêu đề (OPERATING_PRINCIPLES §6.1) */
  tip?: React.ReactNode
  /** Đường dẫn quay lại màn trước */
  backHref?: string
  backLabel?: string
}

export const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  function PageHeader(
    {
      className,
      title,
      description,
      breadcrumbs,
      breadcrumbItems,
      badge,
      actions,
      tip,
      backHref,
      backLabel = "Quay lại",
      ...props
    },
    ref
  ) {
    const renderBreadcrumbs = () => {
      if (breadcrumbs) {
        return <div className="text-caption text-text-muted mb-1">{breadcrumbs}</div>
      }
      if (breadcrumbItems && breadcrumbItems.length > 0) {
        return (
          <nav aria-label="Breadcrumb" className="mb-1 flex items-center gap-1.5 text-caption text-text-muted">
            {breadcrumbItems.map((item, index) => {
              const isLast = index === breadcrumbItems.length - 1
              return (
                <React.Fragment key={index}>
                  {item.href && !isLast ? (
                    <Link
                      href={item.href as never}
                      className="hover:text-text transition-colors hover:underline"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span className={cn(isLast && "font-medium text-text")}>{item.label}</span>
                  )}
                  {!isLast && <ChevronRight size={12} className="text-text-muted/60" aria-hidden="true" />}
                </React.Fragment>
              )
            })}
          </nav>
        )
      }
      return null
    }

    return (
      <header
        ref={ref}
        className={cn(
          "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-1",
          className
        )}
        {...props}
      >
        <div className="min-w-0 flex-1 space-y-1">
          {renderBreadcrumbs()}
          <div className="flex flex-wrap items-center gap-2">
            {backHref && (
              <Link
                href={backHref as never}
                className="mr-1 inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-button)] text-text-muted hover:bg-surface-alt hover:text-text focus-visible:outline-2 focus-visible:outline-primary transition-colors"
                aria-label={backLabel}
                title={backLabel}
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </Link>
            )}
            <h1 className="text-display font-bold text-text tracking-tight truncate">
              {title}
            </h1>
            {badge}
            {tip && <InfoTip label={typeof title === "string" ? title : "Giải thích"}>{tip}</InfoTip>}
          </div>
          {description && (
            <p className="text-body-sm text-text-muted max-w-3xl">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex min-w-0 flex-wrap items-center gap-2 pt-1 sm:pt-0">
            {actions}
          </div>
        )}
      </header>
    )
  }
)
PageHeader.displayName = "PageHeader"
