"use client"

import Link from "next/link"
import type { Route } from "next"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { CatalogItem } from "@/modules/integration-hub/use-cases/get-integration-hub"
import { AVAILABILITY_LABEL } from "./integration-labels"

interface ConnectorCardProps {
  item: CatalogItem
  onConnect: (item: CatalogItem) => void
  onManage: (item: CatalogItem) => void
}

/** Thẻ một dịch vụ trong danh mục: tên, mô tả một dòng, trạng thái và đúng một hành động. */
export function ConnectorCard({ item, onConnect, onManage }: ConnectorCardProps) {
  const label = item.availability === "HIDDEN" ? null : AVAILABILITY_LABEL[item.availability]
  return (
    <div className="flex h-full flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-title-sm font-bold text-text">{item.label}</h3>
        {label && <Badge tone={label.tone}>{label.text}</Badge>}
      </div>
      <p className="flex-1 text-body-sm text-text-muted">{item.description}</p>
      {item.panel ? (
        <Button
          size="sm"
          variant={item.availability === "CONNECTED" ? "outline" : "primary"}
          onClick={() => onManage(item)}
          aria-label={`${item.availability === "CONNECTED" ? "Quản lý" : "Thiết lập"} ${item.label}`}
        >
          {item.availability === "CONNECTED" ? "Quản lý" : "Thiết lập"}
        </Button>
      ) : item.canConnect ? (
        <Button size="sm" onClick={() => onConnect(item)} aria-label={`Kết nối ${item.label}`}>
          Kết nối
        </Button>
      ) : item.availability === "LEGACY" && item.legacyHref ? (
        <Link
          href={item.legacyHref as Route}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-border px-4 text-body-sm font-semibold text-text hover:bg-surface-alt"
        >
          Mở trang quản lý
        </Link>
      ) : item.availability === "NEEDS_UPGRADE" ? (
        <p className="text-body-sm text-warning-text">Có ở gói Chuyên nghiệp trở lên.</p>
      ) : null}
    </div>
  )
}
