"use client"

import { useI18n } from "@/lib/i18n"
import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle } from "@/components/ui/icon-set/alert-triangle"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Download } from "@/components/ui/icon-set/download"
import { Edit } from "@/components/ui/icon-set/edit"
import { RefreshCw } from "@/components/ui/icon-set/refresh-cw"
import { Folder } from "@/components/ui/icon-set/folder"
import { Camera } from "@/components/ui/icon-set/camera"
import { Card } from "@/components/ui/card"
import { TabActionHeader } from "@/components/ui/tab-header"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { useAnnounce } from "@/components/ui/live-region"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import type { Route } from "next"
import {
  AnalysesApprovalPanel,
  OptimizationsApprovalPanel,
  ProductCopiesApprovalPanel,
  type PendingAnalysis,
  type PendingOptimization,
  type PendingProductCopy,
} from "./approval-tab-panels"
import { PageHeader } from "@/components/ui/page-header"
import { isHrefInPhase } from "@/lib/delivery/delivery-phase"

export default function DuyetPage() {
  const { t } = useI18n()
  const router = useRouter()
  const { announce } = useAnnounce()
  const [confirm, confirmDialog] = useConfirmDialog()
  const [analyses, setAnalyses] = useState<PendingAnalysis[] | null>(null)
  const [optimizations, setOptimizations] = useState<PendingOptimization[] | null>(null)
  const [productCopies, setProductCopies] = useState<PendingProductCopy[] | null>(null)
  const [activeTab, setActiveTab] = useState<"analyses" | "optimizations" | "productCopies">("analyses")
  const [khongCoQuyenNao, setKhongCoQuyenNao] = useState(false)
  const [loi, setLoi] = useState<string | null>(null)
  const [dangDuyet, setDangDuyet] = useState<string | null>(null)

  const napLai = useCallback(async () => {
    const [resAnalyses, resOptimizations, resProductCopies] = await Promise.all([
      fetch("/api/v1/vision/analyses?limit=20"),
      fetch("/api/v1/media/optimizations?limit=20"),
      fetch("/api/v1/product-copies?approval_state=PENDING&limit=20"),
    ])

    if (resAnalyses.status === 401 || resOptimizations.status === 401 || resProductCopies.status === 401) {
      router.push("/dang-nhap")
      return
    }

    if (resAnalyses.ok) {
      const data = (await resAnalyses.json()) as { data: PendingAnalysis[] }
      setAnalyses(data.data)
    } else if (resAnalyses.status === 403) {
      setAnalyses(null)
    }

    if (resOptimizations.ok) {
      const data = (await resOptimizations.json()) as { data: PendingOptimization[] }
      setOptimizations(data.data)
    } else if (resOptimizations.status === 403) {
      setOptimizations(null)
    }

    if (resProductCopies.ok) {
      const data = (await resProductCopies.json()) as { data: PendingProductCopy[] }
      setProductCopies(data.data)
    } else if (resProductCopies.status === 403) {
      setProductCopies(null)
    }

    setKhongCoQuyenNao(
      resAnalyses.status === 403 &&
      resOptimizations.status === 403 &&
      resProductCopies.status === 403
    )
  }, [router])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        await napLai()
      } catch (e) {
        if (!cancelled) setLoi(e instanceof Error ? e.message : "Không tải được hàng chờ duyệt")
      }
    }
    load()
    return () => { cancelled = true }
  }, [napLai])

  async function duyetPhanTich(id: string) {
    setDangDuyet(id)
    try {
      const res = await fetch(`/api/v1/vision/analyses/${id}/approve`, { method: "POST" })
      if (!res.ok) throw new Error(`Duyệt thất bại (${res.status})`)
      announce(`Đã duyệt phân tích #${id.slice(0, 8)}`)
      await napLai()
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Duyệt thất bại")
    } finally {
      setDangDuyet(null)
    }
  }

  async function duyetToiUu(jobId: string, canhBaoTruoc: boolean) {
    if (
      canhBaoTruoc &&
      !(await confirm({
        title: "Xác nhận duyệt ảnh cảnh báo?",
        consequence: "Ảnh này ở mức CẢNH BÁO về chất lượng hoặc tiêu chuẩn, bạn có chắc chắn muốn duyệt?",
        confirmLabel: "Vẫn duyệt",
        tone: "danger",
      }))
    ) {
      return
    }
    setDangDuyet(jobId)
    try {
      const res = await fetch(`/api/v1/media/optimizations/${jobId}/approve`, { method: "POST" })
      if (!res.ok) throw new Error(`Duyệt thất bại (${res.status})`)
      announce(`Đã duyệt ảnh tối ưu #${jobId.slice(0, 8)}`)
      await napLai()
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Duyệt thất bại")
    } finally {
      setDangDuyet(null)
    }
  }

  async function duyetProductCopy(id: string, name: string) {
    setDangDuyet(id)
    try {
      const res = await fetch(`/api/v1/product-copies/${id}/approve`, { method: "POST" })
      if (!res.ok) throw new Error(`Duyệt thất bại (${res.status})`)
      announce(`Đã duyệt dữ liệu bán hàng: ${name}`)
      await napLai()
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Duyệt thất bại")
    } finally {
      setDangDuyet(null)
    }
  }

  async function boPhanTich(id: string) {
    setLoi(null)
    setDangDuyet(id)
    try {
      const res = await fetch(`/api/v1/vision/analyses/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ly_do: null }),
      })
      if (!res.ok) throw new Error(`Không bỏ được kết quả (${res.status})`)
      announce(`Đã từ chối phân tích #${id.slice(0, 8)}`)
      await napLai()
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không bỏ được kết quả")
    } finally {
      setDangDuyet(null)
    }
  }

  async function boProductCopy(id: string, name: string) {
    setLoi(null)
    setDangDuyet(id)
    try {
      const res = await fetch(`/api/v1/product-copies/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Không phù hợp" }),
      })
      if (!res.ok) throw new Error(`Không bỏ được dữ liệu bán hàng (${res.status})`)
      announce(`Đã từ chối dữ liệu bán hàng: ${name}`)
      await napLai()
    } catch (e) {
      setLoi(e instanceof Error ? e.message : "Không bỏ được dữ liệu bán hàng")
    } finally {
      setDangDuyet(null)
    }
  }

  const dangTai = analyses === null && optimizations === null && productCopies === null && !khongCoQuyenNao

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-shrink-0 items-center border-b border-border bg-surface px-4 py-4">
        <PageHeader
          title="Hàng đợi duyệt"
        />
      </div>

      <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto p-4">
        {loi && (
          <div className="rounded-xl border border-danger/30 bg-danger-bg px-3.5 py-2.5 text-body-sm font-medium text-danger">
            {loi}
          </div>
        )}

        {dangTai && <div className="py-4"><SkeletonBlock lines={4} /></div>}

        {khongCoQuyenNao && (
          <Card className="flex flex-col items-center gap-2 p-8 text-center">
            <div className="text-body-sm font-semibold">Tài khoản này chưa có quyền duyệt</div>
            <div className="text-caption text-text-muted">Cần năng lực H3 (duyệt phân tích), I2 (duyệt ảnh tối ưu) hoặc H6 (duyệt dữ liệu bán hàng).</div>
          </Card>
        )}

        <TabActionHeader
          tabs={[
            {
              id: "analyses",
              label: "Phân tích ảnh",
              icon: CheckCircle2,
              badge: analyses?.length ?? 0,
              badgeTone: "accent",
            },
            {
              id: "optimizations",
              label: "Ảnh tối ưu",
              icon: AlertTriangle,
              badge: optimizations?.length ?? 0,
              badgeTone: "warning",
            },
            {
              id: "productCopies",
              label: "Dữ liệu bán hàng",
              icon: Edit,
              badge: productCopies?.length ?? 0,
              badgeTone: "success",
            },
          ]}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as "analyses" | "optimizations" | "productCopies")}
          primaryActions={[
            {
              id: "refresh-queue",
              label: "Làm mới hàng đợi",
              icon: RefreshCw,
              variant: "outline",
              onClick: napLai,
            },
          ]}
          overflowActions={[
            {
              id: "export-analyses",
              label: "Tải toàn bộ lượt phân tích (CSV)",
              icon: Download,
              onClick: () => {
                const a = document.createElement("a")
                a.href = "/api/v1/vision/analyses/export"
                a.download = ""
                a.click()
              },
            },
            {
              id: "goto-kho",
              label: "Chuyển tới Kho Dữ Liệu",
              icon: Folder,
              onClick: () => router.push("/tai-anh?tab=storage" as Route),
            },
            {
              id: "goto-tai-anh",
              label: "Chuyển tới Tải ảnh",
              icon: Camera,
              onClick: () => router.push("/tai-anh"),
            },
          ]}
        />

        {activeTab === "analyses" && analyses !== null && (
          <AnalysesApprovalPanel
            analyses={analyses}
            dangDuyet={dangDuyet}
            onApprove={duyetPhanTich}
            onReject={boPhanTich}
            onNavigateUpload={() => router.push("/tai-anh")}
          />
        )}

        {activeTab === "optimizations" && optimizations !== null && (
          <OptimizationsApprovalPanel
            optimizations={optimizations}
            dangDuyet={dangDuyet}
            onApprove={duyetToiUu}
            onNavigateStudio={isHrefInPhase("/creative-studio") ? () => router.push("/creative-studio" as never) : undefined}
          />
        )}

        {activeTab === "productCopies" && productCopies !== null && (
          <ProductCopiesApprovalPanel
            productCopies={productCopies}
            dangDuyet={dangDuyet}
            onApprove={duyetProductCopy}
            onReject={boProductCopy}
            onViewDetail={(productId, id) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              router.push(`/san-pham/${productId ?? "unknown"}/tinh-nang/product-copy/${id}?return=${encodeURIComponent(window.location.pathname)}` as any)
            }}
            onNavigateCreate={() => router.push("/tai-anh?tab=m01b" as never)}
          />
        )}
      </div>
      {confirmDialog}
    </div>
  )
}
