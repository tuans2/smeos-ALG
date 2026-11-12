"use client"

import { useI18n } from "@/lib/i18n"
import React, { useEffect, useState } from "react"
import { Shield } from "@/components/ui/icon-set/shield"
import { Cpu } from "@/components/ui/icon-set/cpu"
import { Lock } from "@/components/ui/icon-set/lock"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { Layers } from "@/components/ui/icon-set/layers"
import { Settings2 } from "@/components/ui/icon-set/settings2"
import { RefreshCw } from "@/components/ui/icon-set/refresh-cw"
import { Server } from "@/components/ui/icon-set/server"
import { DollarSign } from "@/components/ui/icon-set/dollar-sign"
import { Sliders } from "@/components/ui/icon-set/sliders"
import { useSession } from "@/lib/session"
import { FeatureGuidanceCard } from "@/components/templates/shared/feature-guidance-card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { ProviderOrderSettings } from "@/components/creative-studio/provider-order-settings"
import { PageHeader } from "@/components/ui/page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { InfoTip } from "@/components/ui/info-tip"
import { modelDescription } from "./model-label"

interface AllowedModel {
  key: string
  display_name: string
  measure_state: string
  leaves_infra: boolean
  cost_class: string
  quality_class: string
}

interface CapabilityPolicy {
  capability_code: string
  capability_name: string
  module: string
  kind: string
  needs_approval: boolean
  allowed_models: AllowedModel[]
  privacy_floor: "PUBLIC" | "SHOP" | "SENSITIVE"
  quality_target: string | null
  cost_ceiling: number | null
  accept_threshold: number | null
  requires_vision_engine_capability: boolean
}

export default function AiSettingsPage() {
  const { t } = useI18n()
  const { can, orgName } = useSession()
  const canView = can("U1")
  const canEdit = can("U2")

  const [policies, setPolicies] = useState<CapabilityPolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [savingCode, setSavingCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!canView) return
    fetchPolicies()
  }, [canView])

  async function fetchPolicies() {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch("/api/v1/ai-policy")
      if (!res.ok) {
        throw new Error("Không thể tải cấu hình chính sách AI.")
      }
      const data = await res.json()
      setPolicies(data.capabilities || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi khi tải cấu hình.")
    } finally {
      setLoading(false)
    }
  }

  async function handleTogglePrivacy(code: string, current: string) {
    if (!canEdit) return
    const nextPrivacy = current === "PUBLIC" ? "SHOP" : "PUBLIC"
    try {
      setSavingCode(code)
      setSuccessMsg(null)
      const target = policies.find((p) => p.capability_code === code)
      if (!target) return

      const res = await fetch("/api/v1/ai-policy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          capability_code: code,
          allowed_models: target.allowed_models.map((m) => m.key),
          privacy_floor: nextPrivacy,
          cost_ceiling: target.cost_ceiling,
          quality_target: target.quality_target,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error?.message || "Không thể cập nhật chính sách.")
      }

      setPolicies((prev) =>
        prev.map((item) =>
          item.capability_code === code
            ? { ...item, privacy_floor: nextPrivacy as "PUBLIC" | "SHOP" | "SENSITIVE" }
            : item
        )
      )
      setSuccessMsg(`Đã cập nhật mức bảo mật cho năng lực ${code}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Cập nhật thất bại")
    } finally {
      setSavingCode(null)
    }
  }

  if (!canView) {
    return (
      <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
        <PageHeader title="Cấu hình AI" />
        <EmptyState kind="forbidden" reason="Tài khoản của bạn chưa được cấp quyền xem cấu hình chính sách AI của tổ chức." />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
      {/* Guidance Card chuẩn hoá */}
      <FeatureGuidanceCard
        badgeLabel="Cấu hình AI"
        badgeIcon={Shield}
        title="Chính sách & hạn mức AI"
        titleIcon={Cpu}
        description="Kiểm soát mô hình AI được phép chạy, sàn bảo vệ thông tin khách hàng và trần chi phí theo từng phân hệ nghiệp vụ."
        tips={[
          "🔒 Năng lực chạm dữ liệu khách hàng luôn bị khoá sàn bảo mật (Luật YC-K1)",
          "⚡ Mô hình chỉ được gọi khi vượt qua 4 tiêu chuẩn cấp phép thương mại",
          "🛡️ Phân quyền xem và chỉnh sửa giải từ phiên máy chủ",
        ]}
      />

      {/* Thông báo trạng thái */}
      {error && (
        <div className="flex items-center gap-2 p-3 text-caption bg-danger/10 text-danger-text border border-danger/30 rounded-xl">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2 p-3 text-caption bg-success/10 text-success border border-success/30 rounded-xl">
          <CheckCircle2 size={15} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Nhà cung cấp Creative Studio — PO 25/09/2026: nhà cung cấp trước, cục bộ là dự phòng */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-title-sm font-extrabold text-text">Nhà cung cấp AI cho Creative Studio</h2>
          <p className="text-caption text-text-muted">
            Thứ tự ưu tiên của tiệm cho nội dung, ảnh, video, giọng đọc và nhạc nền. Bên đầu tiên được thử trước; mỗi lượt tạo vẫn chọn được bên khác.
          </p>
        </div>
        <ProviderOrderSettings canEdit={canEdit} />
      </section>

      {/* Header hành động */}
      <div className="flex items-center justify-between">
        <PageHeader
          title="Cấu hình AI"
          description={<>Tổ chức: <span className="font-semibold text-text">{orgName || "Mặc định"}</span> (Phạm vi áp dụng chỉ trong tổ chức hiện tại)</>}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={fetchPolicies}
          disabled={loading}
          className="flex items-center gap-1.5 text-caption"
        >
          <RefreshCw size={13} className={loading ? "animate-spin motion-reduce:animate-none" : ""} />
          Tải lại
        </Button>
      </div>

      {/* Danh sách năng lực */}
      {loading ? (
        <div className="py-6">
          <SkeletonBlock lines={4} label="Đang tải dữ liệu chính sách AI của tổ chức..." />
        </div>
      ) : policies.length === 0 ? (
        <div className="py-12 text-center text-caption text-text-muted border border-dashed rounded-xl">
          Chưa có năng lực AI nào được cấu hình cho tổ chức.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {policies.map((cap) => {
            const isSensitive = cap.privacy_floor === "SENSITIVE"
            const isSaving = savingCode === cap.capability_code

            return (
              <div
                key={cap.capability_code}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-surface hover:border-primary/40 transition-colors"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-body-sm font-bold text-text">{cap.capability_name}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-caption text-text-muted pt-1">
                    <span className="flex items-center gap-1">
                      <Server size={12} />
                      Mô hình:{" "}
                      <span className="font-medium text-text">
                        {cap.allowed_models.length > 0
                          ? cap.allowed_models.map((m) => modelDescription(m.key, m.display_name)).join(", ")
                          : "Toàn bộ mô hình đạt chuẩn"}
                      </span>
                      {cap.allowed_models.length > 0 && (
                        <InfoTip label={`Mô hình của ${cap.capability_name}`}>
                          Tên mô hình: {cap.allowed_models.map((m) => m.display_name).join(", ")}
                        </InfoTip>
                      )}
                    </span>

                    {cap.cost_ceiling && (
                      <span className="flex items-center gap-1">
                        <DollarSign size={12} />
                        Trần: <span className="font-medium text-text">{cap.cost_ceiling} credit</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Sàn bảo mật & Thao tác */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex flex-col items-end">
                    <span className="text-caption text-text-muted uppercase font-bold">Sàn bảo mật</span>
                    {isSensitive ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning/10 text-warning-text text-caption font-bold border border-warning/30">
                        <Lock size={10} />
                        SENSITIVE (Khóa cứng)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success text-caption font-bold border border-success/30">
                        <Shield size={10} />
                        {cap.privacy_floor}
                      </span>
                    )}
                  </div>

                  {canEdit && !isSensitive && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isSaving}
                      onClick={() => handleTogglePrivacy(cap.capability_code, cap.privacy_floor)}
                      className="text-caption"
                    >
                      {isSaving ? "Đang lưu..." : "Đổi sàn bảo mật"}
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
