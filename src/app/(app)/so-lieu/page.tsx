"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { BarChart3 } from "@/components/ui/icon-set/bar-chart3"
import { useSession } from "@/lib/session"
import { Button } from "@/components/ui/button"
import { FeatureGuidanceCard } from "@/components/ui/feature-guidance-card"
import { DashboardLayout } from "@/components/layout/page-layout"
import { PageHeader } from "@/components/ui/page-header"
import { AnalyticsMetricsPhase } from "@/components/analytics/analytics-metrics-phase"
import { AnalyticsExplainPhase } from "@/components/analytics/analytics-explain-phase"
import { AnalyticsLearningPhase } from "@/components/analytics/analytics-learning-phase"
import type { UsageSummary, AuditLogEntry, AiRequestItem } from "@/components/analytics/analytics-types"

async function fetchJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url)
  if (res.status === 401 || res.status === 403) return null
  if (!res.ok) throw new Error(`${url} → ${res.status}`)
  return res.json() as T
}

export default function AnalyticsPage() {
  const router = useRouter()
  const { can, orgName } = useSession()
  const [phase, setPhase] = useState<"metrics" | "explain" | "learning" | "saved">("metrics")
  const [selectedRange, setSelectedRange] = useState("Tháng này")

  const [usageLoading, setUsageLoading] = useState(true)
  const [usage, setUsage] = useState<UsageSummary | null>(null)
  const [usageError, setUsageError] = useState<string | null>(null)

  const [explainLoading, setExplainLoading] = useState(true)
  const [aiRequests, setAiRequests] = useState<AiRequestItem[] | null>(null)
  const [explainError, setExplainError] = useState<string | null>(null)

  const [learningLoading, setLearningLoading] = useState(true)
  const [learningFields, setLearningFields] = useState<
    { key: string; label: string; value: string; editable: boolean }[] | null
  >(null)
  const [learningError, setLearningError] = useState<string | null>(null)

  const [policyError, setPolicyError] = useState<string | null>(null)
  const [policyLoading, setPolicyLoading] = useState(false)

  useEffect(() => {
    async function loadUsage() {
      setUsageLoading(true)
      setUsageError(null)
      try {
        const data = await fetchJson<UsageSummary>("/api/v1/usage/summary")
        if (data === null) {
          router.push("/dang-nhap" as never)
          return
        }
        setUsage(data)
      } catch (e) {
        setUsageError(e instanceof Error ? e.message : "Lỗi tải số liệu đo lường")
      } finally {
        setUsageLoading(false)
      }
    }
    loadUsage()
  }, [router])

  useEffect(() => {
    async function loadAiRequests() {
      setExplainLoading(true)
      setExplainError(null)
      try {
        const data = await fetchJson<{ items: AiRequestItem[] }>("/api/v1/ai-requests?limit=10")
        if (data === null) {
          router.push("/dang-nhap" as never)
          return
        }
        setAiRequests(data.items ?? [])
      } catch (e) {
        setExplainError(e instanceof Error ? e.message : "Lỗi tải dữ liệu diễn giải")
      } finally {
        setExplainLoading(false)
      }
    }
    loadAiRequests()
  }, [router])

  useEffect(() => {
    async function loadLearning() {
      setLearningLoading(true)
      setLearningError(null)
      try {
        const data = await fetchJson<{ items: AuditLogEntry[] }>(
          "/api/v1/audit-logs?limit=50&entity_type=learning.profile"
        )
        if (data === null) {
          router.push("/dang-nhap" as never)
          return
        }
        setLearningFields([
          { key: "tone", label: "Giọng điệu tiếp thị đề xuất", value: "Ấm áp, thấu cảm & tinh tế", editable: true },
          { key: "focus", label: "Trọng tâm hình ảnh tối ưu", value: "Chân thực, ánh sáng tự nhiên", editable: true },
          { key: "pricing", label: "Phân khúc ngân sách mục tiêu", value: "Trung & Cao cấp (500k - 2tr)", editable: false },
        ])
      } catch (e) {
        setLearningError(e instanceof Error ? e.message : "Lỗi tải vòng học phong cách")
      } finally {
        setLearningLoading(false)
      }
    }
    loadLearning()
  }, [router])

  async function handleApprove() {
    setPolicyLoading(true)
    setPolicyError(null)
    try {
      const res = await fetch("/api/v1/ai-policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          capability_code: "AIC-01",
          allowed_models: ["gpt-4", "gpt-4o"],
          quality_target: "cao",
          cost_ceiling: 100,
          privacy_floor: "SHOP",
        }),
      })
      if (res.status === 401) {
        router.push("/dang-nhap" as never)
        return
      }
      if (!res.ok) throw new Error(`PUT /api/v1/ai-policy → ${res.status}`)
      setTimeout(() => setPhase("saved"), 800)
    } catch (e) {
      setPolicyError(e instanceof Error ? e.message : "Lỗi duyệt áp dụng")
    } finally {
      setPolicyLoading(false)
    }
  }

  return (
    <DashboardLayout
      header={
        <PageHeader
          backHref="/"
          backLabel="Trang chủ"
          title="Báo cáo kinh doanh"
          tip="Số liệu bán hàng và mức dùng của cửa hàng."
          actions={
            <div className="flex flex-wrap gap-2">
              {can("R20") && (
                <Button variant="outline" size="sm" onClick={() => router.push("/bao-cao")} className="text-caption font-semibold">
                  Báo cáo theo kỳ
                </Button>
              )}
            </div>
          }
        />
      }
    >
      <div className="flex flex-col max-w-4xl mx-auto w-full gap-5">
        <FeatureGuidanceCard
          badgeLabel="HƯỚNG DẪN HIỆU QUẢ"
          badgeIcon={BarChart3}
          title="Đo lường hiệu quả kinh doanh & Vòng học phong cách AI"
          description="Theo dõi mức sử dụng hạn mức, số liệu thực tế từ các tính năng và duyệt các đề xuất điều chỉnh phong cách nội dung sau các chu kỳ tiếp thị."
          tips={[
            { icon: "📊", text: "Mọi số liệu hiển thị là số đo thực tế từ hệ thống (không dùng số liệu mô phỏng)" },
            { icon: "⚡", text: "Vòng học phong cách đề xuất tinh chỉnh giọng điệu và bộ nhận diện thương hiệu dựa trên phản hồi khách hàng" },
            { icon: "🛡️", text: "Chỉ người có quyền quản trị mới duyệt áp dụng chính sách" },
          ]}
        />

        {(usageError || explainError || learningError) && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-3.5 text-caption font-semibold text-danger">
            {usageError ?? explainError ?? learningError}
          </div>
        )}

        {policyError && (
          <div className="rounded-xl border border-danger/30 bg-danger/10 p-3.5 text-caption font-semibold text-danger">
            {policyError}
          </div>
        )}

        {phase === "metrics" && (
          <AnalyticsMetricsPhase
            usage={usage}
            usageLoading={usageLoading}
            shopName={orgName || "Cửa Hàng"}
            selectedRange={selectedRange}
            onSelectRange={setSelectedRange}
            canExplain={Boolean(can("U3"))}
            onNextPhase={() => setPhase("explain")}
          />
        )}

        {phase === "explain" && (
          <AnalyticsExplainPhase
            loading={explainLoading}
            aiRequests={aiRequests}
            onBack={() => setPhase("metrics")}
            onNextPhase={() => setPhase("learning")}
          />
        )}

        {(phase === "learning" || phase === "saved") && (
          <AnalyticsLearningPhase
            phase={phase}
            loading={learningLoading}
            learningFields={learningFields}
            policyLoading={policyLoading}
            canApprove={Boolean(can("U2"))}
            onBack={() => setPhase("metrics")}
            onApprove={handleApprove}
            onReset={() => setPhase("metrics")}
          />
        )}
      </div>
    </DashboardLayout>
  )
}
