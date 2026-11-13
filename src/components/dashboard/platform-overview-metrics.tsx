"use client"

import React from "react"
import Link from "next/link"
import { StatTile } from "@/components/ui/stat-tile"
import { Building2 } from "@/components/ui/icon-set/building2"
import { Clock } from "@/components/ui/icon-set/clock"
import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { ArrowRight } from "@/components/ui/icon-set/arrow-right"
import { SubscriptionOverviewCard } from "@/components/platform/subscription-overview-card"

export interface PlatformOrganizationSummary {
  id: string
  name: string
  slug: string
  type: string
  creditBalance: number
  createdAt: string
  memberCount: number
}

export interface PlatformSystemHealth {
  jobCountsByStatus: Record<string, number>
  stuckJobs: Array<{ id: string; organizationId: string; feature: string; startedAt: string | null }>
}

interface PlatformOverviewMetricsProps {
  orgs: PlatformOrganizationSummary[]
  health: PlatformSystemHealth
}

function moiTrong7Ngay(orgs: PlatformOrganizationSummary[]): number {
  const nguong = Date.now() - 7 * 24 * 60 * 60 * 1000
  return orgs.filter((o) => new Date(o.createdAt).getTime() >= nguong).length
}

export function PlatformOverviewMetrics({
  orgs,
  health,
}: PlatformOverviewMetricsProps) {
  return (
    <div className="space-y-6">
      {/* 3 Metric Cards - Chuẩn StatTile */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          label="Tổng tổ chức"
          value={orgs.length}
          tip="Tổng số doanh nghiệp, chuỗi và cửa hàng đã đăng ký trên nền tảng"
          icon={<Building2 className="w-4 h-4 text-primary" aria-hidden="true" />}
        />

        <StatTile
          label="Tổ chức mới"
          value={moiTrong7Ngay(orgs)}
          tip="Số lượng tổ chức mới tạo trong vòng 7 ngày qua"
          icon={<Clock className="w-4 h-4 text-primary" aria-hidden="true" />}
        />

        <StatTile
          label="Tác vụ tồn đọng"
          value={<span className={health.stuckJobs.length > 0 ? "text-warning-text" : "text-text"}>{health.stuckJobs.length}</span>}
          tip="Các tác vụ xử lý ảnh/video nền bị treo hoặc cần can thiệp hệ thống"
          icon={<AlertTriangle className="w-4 h-4 text-warning-text" aria-hidden="true" />}
        />
      </div>

      {/* Thuê bao & doanh thu (checklist ALG 9.8) — nạp credit làm ở trang chi tiết từng tổ chức */}
      <SubscriptionOverviewCard />

      {/* Danh sách tổ chức gần đây */}
      <div className="p-5 rounded-2xl bg-surface border border-border shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div>
            <h3 className="text-title-sm font-bold text-text">
              Tổ chức hoạt động gần đây
            </h3>
            <p className="text-caption text-text-muted mt-0.5">
              Các đơn vị đăng ký và sử dụng hệ thống mới nhất
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={"/van-hanh/to-chuc" as never}
              className="inline-flex items-center gap-1.5 text-body-sm font-semibold text-primary hover:underline"
            >
              <span>Xem tất cả tổ chức</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="divide-y divide-border">
          {orgs.slice(0, 8).map((org) => (
            <Link
              key={org.id}
              href={`/van-hanh/to-chuc/${org.id}` as never}
              className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-surface-alt transition-colors group"
            >
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-primary" aria-hidden="true" />
                <span className="text-body-sm font-semibold text-text group-hover:text-primary transition-colors">
                  {org.name}
                </span>
              </div>
              <span className="text-caption text-text-muted">
                {org.type} · {org.memberCount} thành viên
              </span>
            </Link>
          ))}
          {orgs.length === 0 && (
            <p className="py-6 text-center text-body-sm text-text-muted">
              Chưa có tổ chức nào trong hệ thống.
            </p>
          )}
        </div>
      </div>

    </div>
  )
}
