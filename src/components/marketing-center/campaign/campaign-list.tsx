"use client"

import { useCallback, useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { InlineError } from "@/components/ui/inline-error"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { Megaphone } from "@/components/ui/icon-set/megaphone"
import { Plus } from "@/components/ui/icon-set/plus"
import { formatDate, formatDateTime } from "@/lib/i18n/formatters"
import {
  CAMPAIGN_OBJECTIVE_LABELS,
  CAMPAIGN_STATUS_LABELS,
  type Campaign,
  type CampaignStatus,
} from "@/modules/marketing-center/domain/campaign"
import { campaignApi } from "./campaign-api"

interface CampaignListProps {
  onSelectCampaign: (id: string) => void
  onCreateCampaign: () => void
}

const STATUS_TABS: { id: CampaignStatus | "ALL"; label: string }[] = [
  { id: "ALL", label: "Tất cả" },
  { id: "ACTIVE", label: "Đang chạy" },
  { id: "DRAFT", label: "Bản nháp" },
  { id: "PAUSED", label: "Tạm dừng" },
  { id: "COMPLETED", label: "Hoàn thành" },
]

export function CampaignList({ onSelectCampaign, onCreateCampaign }: CampaignListProps) {
  const [filter, setFilter] = useState<CampaignStatus | undefined>(undefined)
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null)
  const [counts, setCounts] = useState<Record<string, number> | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchCampaigns = useCallback(async () => {
    setError(null)
    try {
      const res = await campaignApi.list({ status: filter })
      setCampaigns(res.data)
      setCounts(res.counts)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách chiến dịch")
    }
  }, [filter])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu từ API khi mount/đổi tham số; setState nằm trong hàm tải (nợ #149)
    void fetchCampaigns()
  }, [fetchCampaigns])

  const getStatusCount = (s: CampaignStatus | "ALL") => {
    if (!counts) return 0
    if (s === "ALL") return Object.values(counts).reduce((a, b) => a + b, 0)
    return counts[s] ?? 0
  }

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-h2 font-bold text-text">Chiến dịch quảng bá</h2>
          <p className="text-body-sm text-text-muted">
            Quản lý các chiến dịch theo dịp, gán tư liệu, thu hút khách tiềm năng và theo dõi chuyển đổi đơn hàng.
          </p>
        </div>
        <Button type="button" variant="primary" onClick={onCreateCampaign} className="shrink-0">
          <Plus className="mr-1.5 h-4 w-4" /> Tạo chiến dịch mới
        </Button>
      </div>

      {/* Filter Tabs */}
      <div role="group" aria-label="Lọc trạng thái chiến dịch" className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const isSelected = (tab.id === "ALL" && filter === undefined) || filter === tab.id
          const count = getStatusCount(tab.id)
          return (
            <Button variant="ghost"
              type="button"
              key={tab.id}
              aria-pressed={isSelected}
              onClick={() => {
                setCampaigns(null)
                setFilter(tab.id === "ALL" ? undefined : tab.id)
              }}
              className={`text-[length:inherit] h-auto justify-start font-[inherit] gap-0 flex h-9 cursor-pointer items-center gap-1.5 rounded-xl px-3.5 text-body-sm font-medium transition-colors ${
                isSelected
                  ? "bg-primary text-white"
                  : "border border-border bg-surface text-text hover:bg-surface"
              }`}
            >
              <span>{tab.label}</span>
              {count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-caption ${
                    isSelected ? "bg-white/20 text-white" : "bg-surface-alt text-text-muted"
                  }`}
                >
                  {count}
                </span>
              )}
            </Button>
          )
        })}
      </div>

      {error && <InlineError message={error} onRetry={fetchCampaigns} />}
      {campaigns === null && !error && <SkeletonBlock lines={4} label="Đang tải danh sách chiến dịch..." />}

      {campaigns?.length === 0 && (
        <EmptyState
          icon={Megaphone}
          title={filter ? `Chưa có chiến dịch ở trạng thái "${CAMPAIGN_STATUS_LABELS[filter]}"` : "Chưa có chiến dịch quảng bá nào"}
          reason="Tạo chiến dịch theo các dịp lễ, sự kiện để kết nối tư liệu và thu hút khách hàng tiềm năng."
        />
      )}

      {campaigns && campaigns.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((camp) => {
            const statusTone =
              camp.status === "ACTIVE"
                ? "success"
                : camp.status === "PAUSED"
                  ? "warning"
                  : camp.status === "COMPLETED"
                    ? "accent"
                    : "neutral"

            return (
              <div
                key={camp.id}
                className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-sm hover:border-primary/50 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <Badge tone={statusTone}>{CAMPAIGN_STATUS_LABELS[camp.status]}</Badge>
                    <span className="rounded-lg bg-surface px-2 py-0.5 text-caption font-medium text-text-muted border border-border">
                      {CAMPAIGN_OBJECTIVE_LABELS[camp.objective]}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-body font-semibold text-text">{camp.name}</h3>
                    <p className="mt-1 text-caption text-text-muted">
                      {camp.occasionCode ? `Dịp: ${camp.occasionCode} · ` : ""}
                      Tạo lúc {formatDateTime(camp.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-caption text-text-muted">
                    {camp.startsAt ? `Bắt đầu: ${formatDate(camp.startsAt)}` : "Chưa đặt lịch"}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectCampaign(camp.id)}
                  >
                    Xem chi tiết
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
