"use client"

// AI Quota & Mức Dùng Toàn Hệ Thống (TN-08, AI-05, P25a).
// Giám sát trần hạn mức chi phí AI, cảnh báo tiêu thụ và phân tích mức dùng từng tổ chức.

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { Coins } from "@/components/ui/icon-set/coins"
import { Building2 } from "@/components/ui/icon-set/building2"
import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { ArrowUpRight } from "@/components/ui/icon-set/arrow-up-right"
import { Filter } from "@/components/ui/icon-set/filter"
import { StatTile } from "@/components/ui/stat-tile"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/select"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { formatNumber } from "@/lib/i18n/formatters"
import { PageHeader } from "@/components/ui/page-header"
import { CreditPricingCard } from "@/components/platform/credit-pricing-card"
import { PlatformMarginCard } from "@/components/platform/platform-margin-card"
import { BillingAccountCard } from "@/components/platform/billing-account-card"

type PlatformUsageRow = {
  organizationId: string
  organizationName: string
  feature: string
  quantity: number
  costCredit: number
}

async function layJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url)
  if (!res.ok) return null
  return (await res.json()) as T
}

export default function MucDungPage() {
  const [rows, setRows] = useState<PlatformUsageRow[] | null>(null)
  const [loi, setLoi] = useState<string | null>(null)
  const [selectedFeature, setSelectedFeature] = useState<string>("ALL")
  const [searchOrg, setSearchOrg] = useState<string>("")

  useEffect(() => {
    void (async () => {
      const res = await layJson<{ data: PlatformUsageRow[] }>("/api/v1/platform/usage")
      if (!res) {
        setLoi("Không tải được dữ liệu mức dùng.")
        return
      }
      setRows(res.data)
    })()
  }, [])

  // Danh sách tính năng độc nhất cho bộ lọc
  const featuresList = useMemo(() => {
    if (!rows) return []
    const set = new Set(rows.map((r) => r.feature))
    return Array.from(set)
  }, [rows])

  // Thống kê tổng hợp (KPIs)
  const metrics = useMemo(() => {
    if (!rows) return { totalCredits: 0, totalCalls: 0, activeOrgs: 0, topConsumers: [] }
    const totalCredits = rows.reduce((sum, r) => sum + (r.costCredit || 0), 0)
    const totalCalls = rows.reduce((sum, r) => sum + (r.quantity || 0), 0)
    const orgMap = new Map<string, { id: string; name: string; credits: number; calls: number }>()

    for (const r of rows) {
      const cur = orgMap.get(r.organizationId) || { id: r.organizationId, name: r.organizationName, credits: 0, calls: 0 }
      cur.credits += r.costCredit || 0
      cur.calls += r.quantity || 0
      orgMap.set(r.organizationId, cur)
    }

    const orgsList = Array.from(orgMap.values()).sort((a, b) => b.credits - a.credits)
    return {
      totalCredits,
      totalCalls,
      activeOrgs: orgMap.size,
      topConsumers: orgsList.slice(0, 3),
    }
  }, [rows])

  // Dữ liệu sau lọc
  const filteredRows = useMemo(() => {
    if (!rows) return []
    return rows.filter((r) => {
      const matchesFeature = selectedFeature === "ALL" || r.feature === selectedFeature
      const matchesSearch = !searchOrg.trim() || r.organizationName.toLowerCase().includes(searchOrg.toLowerCase().trim())
      return matchesFeature && matchesSearch
    })
  }, [rows, selectedFeature, searchOrg])

  if (loi) return <p className="text-body-sm text-danger">{loi}</p>
  if (!rows) return <div className="py-4"><SkeletonBlock lines={6} /></div>

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <PageHeader
        className="pb-2 border-b border-border"
        title="Mức dùng & Chi phí"
        tip="Theo dõi lưu lượng gọi AI, Credit tiêu thụ và kiểm soát hạn mức theo từng tổ chức."
        actions={
          <span className="self-start sm:self-auto rounded-lg bg-surface-alt px-3 py-1 text-caption font-semibold text-text-muted border border-border">
            Phạm vi: SuperAdmin Nền tảng
          </span>
        }
      />

      {/* 2. Thẻ KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatTile
          label="Tổng Credit"
          value={formatNumber(metrics.totalCredits)}
          tip="Tổng lượng Credit AI đã tiêu thụ trên toàn nền tảng"
          icon={<Coins className="w-4 h-4 text-primary" aria-hidden />}
        />
        <StatTile
          label="Lượt gọi AI"
          value={formatNumber(metrics.totalCalls)}
          tip="Tổng số lần các tổ chức gọi mô hình AI"
          icon={<Sparkles className="w-4 h-4 text-primary" aria-hidden />}
        />
        <StatTile
          label="Tổ chức hoạt động"
          value={metrics.activeOrgs}
          tip="Số tổ chức đã sử dụng ít nhất 1 tính năng AI trong kỳ"
          icon={<Building2 className="w-4 h-4 text-primary" aria-hidden />}
        />
      </div>

      <CreditPricingCard />

      <PlatformMarginCard />

      <BillingAccountCard />

      {/* 3. Cảnh báo trần hạn mức Quota (AI-05) */}
      {metrics.topConsumers.length > 0 && (
        <Card className="p-4 rounded-xl border border-warning/30 bg-warning-bg/50 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-warning-text" />
            <h3 className="text-body-sm font-bold text-text">Theo dõi tiêu thụ Credit cao nhất</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {metrics.topConsumers.map((org, idx) => (
              <div key={org.id} className="rounded-lg bg-surface p-3 border border-border flex items-center justify-between">
                <div>
                  <div className="text-caption font-bold text-text truncate max-w-[160px]">{org.name}</div>
                  <div className="text-caption text-text-muted">{org.calls} lượt gọi AI</div>
                </div>
                <div className="text-right">
                  <div className="text-body-sm font-extrabold text-primary">{org.credits}</div>
                  <Link href={`/van-hanh/to-chuc/${org.id}` as never} className="text-caption font-semibold text-primary hover:underline inline-flex items-center gap-0.5">
                    Chi tiết <ArrowUpRight size={11} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 4. Bộ lọc & Bảng chi tiết */}
      <Card className="p-4 rounded-2xl border border-border bg-surface shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-text-muted" />
            <span className="text-body-sm font-bold text-text">Chi tiết mức dùng theo tính năng</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="text"
              placeholder="Tìm theo tên tổ chức..."
              value={searchOrg}
              onChange={(e) => setSearchOrg(e.target.value)}
              className="w-48 sm:w-64"
            />
            <NativeSelect
              value={selectedFeature}
              onChange={(e) => setSelectedFeature(e.target.value)}
              className="w-auto"
            >
              <option value="ALL">Tất cả tính năng ({featuresList.length})</option>
              {featuresList.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </NativeSelect>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-body-sm">
            <thead>
              <tr className="border-b border-border text-text-muted text-caption">
                <th className="py-2.5 pr-4 font-semibold">Tổ chức</th>
                <th className="py-2.5 pr-4 font-semibold">Tính năng</th>
                <th className="py-2.5 pr-4 font-semibold text-center">Số lượt</th>
                <th className="py-2.5 pr-4 font-semibold text-right">Credit tiêu thụ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRows.map((row, i) => (
                <tr key={`${row.organizationId}-${row.feature}-${i}`} className="hover:bg-surface-alt transition-colors">
                  <td className="py-3 pr-4">
                    <Link href={`/van-hanh/to-chuc/${row.organizationId}` as never} className="font-semibold text-text hover:text-primary transition-colors">
                      {row.organizationName}
                    </Link>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="rounded-md bg-surface-alt px-2 py-0.5 text-caption font-medium text-text">
                      {row.feature}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-center font-medium text-text">{row.quantity}</td>
                  <td className="py-3 pr-4 text-right font-bold text-primary">{row.costCredit}</td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-text-muted">
                    Không tìm thấy dữ liệu mức dùng phù hợp với bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
