"use client"

import { useI18n } from "@/lib/i18n"
import { useEffect, useState, useCallback } from "react"
import { WalletCards } from "@/components/ui/icon-set/wallet-cards"
import { Coins } from "@/components/ui/icon-set/coins"
import { Activity } from "@/components/ui/icon-set/activity"
import { Layers } from "@/components/ui/icon-set/layers"
import { RefreshCw } from "@/components/ui/icon-set/refresh-cw"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { Calendar } from "@/components/ui/icon-set/calendar"
import { useSession } from "@/lib/session"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { FeatureGuidanceCard } from "@/components/templates/shared/feature-guidance-card"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { MonthlyLimitCard } from "@/components/usage/monthly-limit-card"
import { SubscriptionCard } from "@/components/usage/subscription-card"
import { Input } from "@/components/ui/input"
import { formatNumber } from "@/lib/i18n/formatters"

interface UsageSummary {
  by_feature: Array<{
    feature: string
    quantity: number
    cost_credit: number
  }>
  credit_used: number
  credit_balance: number
  /** Có khi lọc theo tháng (checklist ALG 6.9) */
  period?: string
  monthly_limit?: number | null
  plan?: { code: string; included_credits_monthly: number } | null
}

interface UsageRow {
  id: string
  created_at: string
  feature: string
  quantity: number
  cost_credit: number
  status: "ENQUEUED" | "COMPLETED" | "REFUNDED" | "PARTIAL_REFUND"
}

export default function MucDungPage() {
  const { t } = useI18n()
  const { can, orgName } = useSession()
  const canView = can("G8")

  const [summary, setSummary] = useState<UsageSummary | null>(null)
  const [history, setHistory] = useState<UsageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState("")

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [sumRes, listRes] = await Promise.all([
        fetch(period ? `/api/v1/usage/summary?period=${period}` : "/api/v1/usage/summary"),
        fetch("/api/v1/usage?limit=30"),
      ])

      if (!sumRes.ok || !listRes.ok) {
        throw new Error("Không thể tải thông tin mức dùng của tổ chức.")
      }

      const sumData = (await sumRes.json()) as UsageSummary
      const listData = (await listRes.json()) as { data: UsageRow[] }

      setSummary(sumData)
      setHistory(listData.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi khi tải dữ liệu.")
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    if (canView) {
      void fetchData()
    }
  }, [canView, fetchData])

  if (!canView) {
    return (
      <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
        <PageHeader title="Mức dùng" />
        <EmptyState kind="forbidden" reason="Tài khoản của bạn chưa được cấp quyền xem mức dùng và hạn mức credit của tổ chức." />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto w-full">
      {/* 1. Hướng dẫn K1 duy nhất */}
      <FeatureGuidanceCard
        badgeLabel="QUẢN TRỊ TÀI NGUYÊN & CREDIT"
        badgeIcon={WalletCards}
        title="Báo Cáo Mức Dùng & Tiêu Thụ Credit Của Tiệm"
        titleIcon={Coins}
        description="Theo dõi chi tiết số lượt sử dụng và chi phí credit theo từng phân hệ. Số liệu được ghi nhận theo thời gian thực tại thời điểm phát sinh tác vụ."
        tips={[
          "⚡ Toàn bộ tác vụ AI (nhận diện ảnh, kịch bản, video, audio) được trừ credit theo biểu giá chuẩn",
          "🛡️ Lượt tác vụ bị Identity Guard từ chối sẽ được hoàn trả credit tự động (trạng thái REFUNDED)",
          "📊 Số liệu phản ánh lượt đo thực tế của tổ chức, không suy đoán hay ước lượng",
        ]}
      />

      {/* Thông báo lỗi */}
      {error && (
        <div className="flex items-center gap-2 p-3 text-caption bg-warning-bg text-warning-text border border-warning/30 rounded-xl">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* Top Header & Tải lại */}
      <div className="flex items-center justify-between">
        <PageHeader
          title="Mức dùng"
          description={<>Tổ chức: <span className="font-semibold text-text">{orgName || "Mặc định"}</span></>}
        />
        <div className="flex items-center gap-2">
        <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="h-9 w-40" aria-label="Xem theo tháng" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => void fetchData()}
          disabled={loading}
          className="text-caption flex items-center gap-1.5"
        >
          <RefreshCw size={13} className={loading ? "animate-spin motion-reduce:animate-none" : ""} />
          Làm mới
        </Button>
        </div>
      </div>

      {/* 2. Thẻ số liệu tổng quan (Metric Rules: số đo thực tế từ backend) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl border border-border bg-surface flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Coins size={24} />
          </div>
          <div>
            <div className="text-caption text-text-muted font-medium">Số dư Credit khả dụng</div>
            <div className="text-display font-black text-text mt-0.5">
              {loading ? "..." : (summary?.credit_balance ?? 0).toLocaleString("vi-VN")}
            </div>
            <div className="text-caption text-text-muted mt-0.5">Dùng cho toàn bộ các lượt gọi AI của tiệm</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-border bg-surface flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-accent/10 text-accent-text flex items-center justify-center shrink-0">
            <Activity size={24} />
          </div>
          <div>
            <div className="text-caption text-text-muted font-medium">{summary?.period ? `Credit đã dùng tháng ${summary.period.slice(5)}/${summary.period.slice(0, 4)}` : "Tổng Credit đã sử dụng"}</div>
            <div className="text-display font-black text-text mt-0.5">
              {loading ? "..." : (summary?.credit_used ?? 0).toLocaleString("vi-VN")}
            </div>
            <div className="text-caption text-text-muted mt-0.5">
              {summary?.period
                ? `Hạn mức tháng: ${summary.monthly_limit == null ? "không giới hạn" : formatNumber(summary.monthly_limit)}${summary.plan ? ` · gói tặng ${formatNumber(summary.plan.included_credits_monthly)} credit/tháng` : ""}`
                : "Tính trên tất cả các tính năng đã chạy"}
            </div>
          </div>
        </div>
      </div>

      {can("D1") && <SubscriptionCard />}

      <MonthlyLimitCard canSetAi={can("U2")} />

      {/* 3. Phân bổ theo tính năng (By Feature) */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-body-sm font-bold text-text flex items-center gap-2">
          <Layers size={16} className="text-primary" /> Phân Bổ Theo Phân Hệ
        </h2>

        {loading ? (
          <div className="py-4"><SkeletonBlock lines={3} label="Đang tải phân bổ..." /></div>
        ) : !summary || summary.by_feature.length === 0 ? (
          <p className="text-caption text-text-muted py-3">Chưa có lượt sử dụng nào được ghi nhận.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-caption border-collapse">
              <caption className="sr-only">Bảng phân bổ chi phí credit theo phân hệ</caption>
              <thead>
                <tr className="border-b border-border text-text-muted text-caption uppercase font-bold">
                  <th scope="col" className="py-2.5 px-3">Phân hệ</th>
                  <th scope="col" className="py-2.5 px-3 text-right">Số lượt thực thi</th>
                  <th scope="col" className="py-2.5 px-3 text-right">Credit tiêu thụ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {summary.by_feature.map((row) => (
                  <tr key={row.feature} className="hover:bg-surface-alt/50 transition-colors">
                    <th scope="row" className="py-2.5 px-3 font-semibold text-text font-mono">
                      {row.feature}
                    </th>
                    <td className="py-2.5 px-3 text-right text-text">
                      {row.quantity.toLocaleString("vi-VN")} lượt
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-primary">
                      {row.cost_credit.toLocaleString("vi-VN")} credit
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Nhật ký sử dụng chi tiết gần nhất */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-body-sm font-bold text-text flex items-center gap-2">
          <Calendar size={16} className="text-primary" /> Lịch Sử Giao Dịch Gần Nhất
        </h2>

        {loading ? (
          <div className="py-4"><SkeletonBlock lines={4} label="Đang tải lịch sử giao dịch..." /></div>
        ) : history.length === 0 ? (
          <p className="text-caption text-text-muted py-3">Chưa có giao dịch nào gần đây.</p>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-caption border-collapse">
                <caption className="sr-only">Lịch sử giao dịch sử dụng credit gần nhất</caption>
                <thead>
                  <tr className="border-b border-border text-text-muted text-caption uppercase font-bold">
                    <th scope="col" className="py-2.5 px-3">Thời gian</th>
                    <th scope="col" className="py-2.5 px-3">Phân hệ / Tác vụ</th>
                    <th scope="col" className="py-2.5 px-3 text-right">Số lượng</th>
                    <th scope="col" className="py-2.5 px-3 text-right">Credit</th>
                    <th scope="col" className="py-2.5 px-3 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-alt/50 transition-colors">
                      <td className="py-2.5 px-3 text-text-muted">
                        {new Date(item.created_at).toLocaleString("vi-VN")}
                      </td>
                      <th scope="row" className="py-2.5 px-3 font-mono font-medium text-text">
                        {item.feature}
                      </th>
                      <td className="py-2.5 px-3 text-right text-text">
                        {item.quantity}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-text">
                        {item.cost_credit}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge
                          tone={
                            item.status === "COMPLETED"
                              ? "success"
                              : item.status === "REFUNDED"
                              ? "warning"
                              : "neutral"
                          }
                          className="text-caption"
                        >
                          {item.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View (390px) */}
            <div className="sm:hidden flex flex-col gap-2.5">
              {history.map((item) => (
                <div key={item.id} className="p-3 rounded-xl border border-border bg-surface-alt/40 flex flex-col gap-1.5 text-caption">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-text">{item.feature}</span>
                    <Badge
                      tone={
                        item.status === "COMPLETED"
                          ? "success"
                          : item.status === "REFUNDED"
                          ? "warning"
                          : "neutral"
                      }
                      className="text-caption"
                    >
                      {item.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-text-muted text-caption">
                    <span>{new Date(item.created_at).toLocaleString("vi-VN")}</span>
                    <span className="font-bold text-primary">{item.cost_credit} credit</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
