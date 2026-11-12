"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import type { Route } from "next"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { InlineError } from "@/components/ui/inline-error"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { ArrowLeft } from "@/components/ui/icon-set/arrow-left"
import { Megaphone } from "@/components/ui/icon-set/megaphone"
import { Plus } from "@/components/ui/icon-set/plus"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { formatDateTime } from "@/lib/i18n/formatters"
import {
  CAMPAIGN_OBJECTIVE_LABELS,
  CAMPAIGN_STATUS_LABELS,
  type CampaignStatus,
} from "@/modules/marketing-center/domain/campaign"
import { CTA_REGISTRY, type CtaCode } from "@/modules/marketing-center/domain/cta-registry"
import { campaignApi, type CampaignDetailsData } from "./campaign-api"

interface CampaignDetailsViewProps {
  campaignId: string
  onBack: () => void
}

export function CampaignDetailsView({ campaignId, onBack }: CampaignDetailsViewProps) {
  const [data, setData] = useState<CampaignDetailsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await campaignApi.getDetails(campaignId)
      setData(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải chi tiết chiến dịch")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu từ API khi mount/đổi tham số; setState nằm trong hàm tải (nợ #149)
    void loadData()
  }, [campaignId])

  const handleStatusChange = async (nextStatus: CampaignStatus) => {
    setUpdating(true)
    try {
      await campaignApi.update(campaignId, { status: nextStatus })
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể đổi trạng thái")
    } finally {
      setUpdating(false)
    }
  }

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="h-auto p-0 flex items-center gap-2 text-body-sm text-text-muted hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" /> Quay lại danh sách
        </Button>
        <SkeletonBlock lines={4} label="Đang tải chiến dịch..." />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="h-auto p-0 flex items-center gap-2 text-body-sm text-text-muted hover:text-text"
        >
          <ArrowLeft className="h-4 w-4" /> Quay lại danh sách
        </Button>
        {error && <InlineError message={error} onRetry={loadData} />}
      </div>
    )
  }

  const { campaign, stats, usages } = data
  const statusTone =
    campaign.status === "ACTIVE"
      ? "success"
      : campaign.status === "PAUSED"
        ? "warning"
        : campaign.status === "COMPLETED"
          ? "accent"
          : "neutral"

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="h-auto p-0 flex items-center gap-1.5 text-caption font-medium text-text-muted hover:text-text"
          >
            <ArrowLeft className="h-4 w-4" /> Danh sách chiến dịch
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-h2 font-bold text-text">{campaign.name}</h2>
            <Badge tone={statusTone}>{CAMPAIGN_STATUS_LABELS[campaign.status]}</Badge>
            <span className="rounded-lg bg-surface px-2 py-0.5 text-caption text-text-muted border border-border">
              {CAMPAIGN_OBJECTIVE_LABELS[campaign.objective]}
            </span>
          </div>
          <p className="text-caption text-text-muted">
            {campaign.occasionCode ? `Dịp: ${campaign.occasionCode} · ` : ""}
            Tạo ngày: {formatDateTime(campaign.createdAt)}
            {campaign.startsAt ? ` · Chạy từ: ${formatDateTime(campaign.startsAt)}` : ""}
            {campaign.endsAt ? ` đến ${formatDateTime(campaign.endsAt)}` : ""}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {campaign.status === "DRAFT" && (
            <Button
              type="button"
              variant="primary"
              disabled={updating}
              onClick={() => handleStatusChange("ACTIVE")}
            >
              Kích hoạt chiến dịch
            </Button>
          )}
          {campaign.status === "ACTIVE" && (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={updating}
                onClick={() => handleStatusChange("PAUSED")}
              >
                Tạm dừng
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={updating}
                onClick={() => handleStatusChange("COMPLETED")}
              >
                Hoàn thành
              </Button>
            </>
          )}
          {campaign.status === "PAUSED" && (
            <Button
              type="button"
              variant="outline"
              disabled={updating}
              onClick={() => handleStatusChange("ACTIVE")}
            >
              Tiếp tục chạy
            </Button>
          )}
        </div>
      </div>

      {error && <InlineError message={error} onRetry={loadData} />}

      {/* KPI Cards (Chỉ số thật) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="text-caption font-medium text-text-muted">Tư liệu & Nơi dùng</div>
          <div className="mt-1 text-h2 font-bold text-text">{stats.totalUsages}</div>
          <div className="text-caption text-text-muted">Ấn phẩm & link gắn chiến dịch</div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="text-caption font-medium text-text-muted">Lượt quét / Xem</div>
          <div className="mt-1 text-h2 font-bold text-primary">{stats.totalScans}</div>
          <div className="text-caption text-text-muted">Lượt bấm link & quét QR thật</div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="text-caption font-medium text-text-muted">Khách tiềm năng (Lead)</div>
          <div className="mt-1 text-h2 font-bold text-success">{stats.totalLeads}</div>
          <div className="text-caption text-text-muted">Khách để lại thông tin</div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="text-caption font-medium text-text-muted">Đơn hàng chuyển đổi</div>
          <div className="mt-1 text-h2 font-bold text-text">{stats.convertedOrders}</div>
          <div className="text-caption text-text-muted">Đơn thành công từ lead</div>
        </div>
      </div>

      {/* Usages Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-h3 font-semibold text-text">Tư liệu & Nơi dùng trong chiến dịch</h2>
          <div className="flex gap-2">
            <Link
              href={"/kho-du-lieu" as Route}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-caption font-medium text-text hover:bg-surface"
            >
              <Plus className="h-4 w-4" /> Chọn từ kho dữ liệu
            </Link>
            <Link
              href={"/cong-cu" as Route}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-caption font-medium text-white hover:bg-primary-dark"
            >
              <Sparkles className="h-4 w-4" /> Tạo mới từ công cụ
            </Link>
          </div>
        </div>

        {usages.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="Chưa có tư liệu nào trong chiến dịch này"
            reason="Mở Kho dữ liệu hoặc Công cụ quảng bá, chọn tư liệu và bấm 'Dùng' để gán vào chiến dịch này."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {usages.map((usage) => {
              const cta = CTA_REGISTRY[usage.ctaCode as CtaCode]
              return (
                <div
                  key={usage.id}
                  className="rounded-2xl border border-border bg-surface p-4 space-y-2 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-body font-semibold text-text truncate">{usage.title}</div>
                      <div className="text-caption text-text-muted">
                        Mã tư liệu: <span className="font-mono text-text">{usage.assetTypeCode}</span> · Đích: {usage.destination}
                      </div>
                    </div>
                    <Badge tone={usage.status === "ACTIVE" ? "success" : "neutral"}>
                      {usage.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-border/50 text-caption text-text-muted">
                    <span>Kêu gọi: <strong className="text-text">{cta?.label ?? usage.ctaCode}</strong></span>
                    {usage.shortLinkId && (
                      <span className="ml-auto text-primary font-medium">Link/QR đã kích hoạt</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
