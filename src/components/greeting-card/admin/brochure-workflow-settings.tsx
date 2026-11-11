"use client"

import { NativeSelect } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import React, { useState } from "react"
import {
  SlidersHorizontal,
  Zap,
  ShieldCheck,
  Building2,
  ChevronDown,
  ChevronUp,
  Save,
  Loader2,
  CheckCircle2,
  Lock,
} from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { apiSend, useApi } from "@/components/greeting-card/greeting-api"
import {
  BROCHURE_WORKFLOW_POLICY_KEY,
  LEAN_WORKFLOW_POLICY,
  STANDARD_WORKFLOW_POLICY,
  STRICT_WORKFLOW_POLICY,
  isChainOrganizationType,
  parseBrochureWorkflowPolicy,
  serializeWorkflowPolicy,
  detectWorkflowPreset,
  type BrochureWorkflowPolicy,
  type WorkflowPreset,
} from "@/modules/greeting-card/domain/brochure-workflow-policy"

export function BrochureWorkflowSettings() {
  const org = useApi<{ type?: string; settings?: Record<string, unknown> | null }>("/api/v1/organizations/current")
  const [draft, setDraft] = useState<BrochureWorkflowPolicy | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const policy = draft ?? (org.data ? parseBrochureWorkflowPolicy(org.data.settings, org.data.type) : null)

  const handleApplyPreset = (preset: "LEAN" | "STANDARD" | "STRICT") => {
    let newPolicy: BrochureWorkflowPolicy
    if (preset === "LEAN") newPolicy = { ...LEAN_WORKFLOW_POLICY }
    else if (preset === "STRICT") newPolicy = { ...STRICT_WORKFLOW_POLICY }
    else newPolicy = { ...STANDARD_WORKFLOW_POLICY }

    // Chế độ Chuỗi theo loại tổ chức Admin SaaS đã duyệt — gói không đổi được
    setDraft({ ...newPolicy, requireCoordinatorAcceptance: isChainOrganizationType(org.data?.type) })
    setMessage(null)
  }

  const handleToggle = (key: keyof Omit<BrochureWorkflowPolicy, "preset">, val: unknown) => {
    if (!policy) return
    const updated = { ...policy, [key]: val }
    const detected = detectWorkflowPreset(updated)
    setDraft({ ...updated, preset: detected })
    setMessage(null)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!policy) return
    setSaving(true)
    setMessage(null)
    try {
      const existingLegacy = ((org.data?.settings?.["brochure_policy"] as Record<string, unknown>) || {})
      const legacySync = {
        ...existingLegacy,
        require_full_before_dispatch: policy.requireFullPaymentBeforeDispatch,
        require_product_photo_qc: policy.requireFinishedPhoto,
        require_recipient_photo: policy.requireDeliveryProofPhoto,
        tracking_trigger_policy: policy.requireAdminDepositApproval ? "PAYMENT_ONLY" : "PAYMENT_OR_COORDINATOR",
        balance_payment_trigger_policy: policy.requireAdminDepositApproval ? "PAYMENT_ONLY" : "PAYMENT_OR_COORDINATOR",
      }

      await apiSend(
        "/api/v1/organizations/current",
        "PATCH",
        {
          settings: {
            [BROCHURE_WORKFLOW_POLICY_KEY]: serializeWorkflowPolicy(policy),
            brochure_policy: legacySync,
          },
        },
        "Không lưu được ma trận quy trình",
      )
      await org.mutate()
      setDraft(null)
      setMessage({ ok: true, text: "Đã lưu ma trận quy trình vận hành." })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Lỗi lưu cấu hình" })
    } finally {
      setSaving(false)
    }
  }

  if (!policy) {
    return <div className="h-44 rounded-2xl bg-surface-muted animate-pulse motion-reduce:animate-none" aria-busy="true" />
  }

  const PRESETS: Array<{ id: WorkflowPreset; title: string; subtitle: string; desc: string; icon: React.ReactNode }> = [
    { id: "LEAN", title: "Tinh Gọn (Tốc Độ)", subtitle: "Tiệm 1–3 người", desc: "3 chạm là giao. Bỏ chặn duyệt cọc, tự động nhận đơn sản xuất, ảnh tùy chọn, giao trước thu COD sau.", icon: <Zap size={18} className="text-warning-text" /> },
    { id: "STANDARD", title: "Tiêu Chuẩn", subtitle: "Tiệm vừa 4–10 người", desc: "Mặc định 1 cửa hàng. Điều hành duyệt cọc & tự động nhận đơn, ảnh thành phẩm đếm ngược 10p, thu đủ trước khi giao.", icon: <ShieldCheck size={18} className="text-primary" /> },
    { id: "STRICT", title: "Nghiêm Ngặt", subtitle: "Chuỗi lớn & Cao cấp", desc: "Kiểm soát tuyệt đối. Bắt buộc Điều hành duyệt tiền, Điều phối liên hệ chuỗi nhận đơn, bắt buộc 2 lần ảnh.", icon: <Building2 size={18} className="text-text" /> },
  ]

  return (
    <form onSubmit={handleSave} className="bg-surface rounded-2xl border border-border p-5 shadow-xs flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={18} className="text-primary" />
          <h3 className="text-title-sm font-extrabold text-text">Ma trận Vận hành & Phân quyền Quy trình</h3>
        </div>
        <span className="text-caption font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
          {policy.preset === "CUSTOM" ? "Đang tùy chỉnh" : `Gói: ${PRESETS.find((p) => p.id === policy.preset)?.title ?? "Tùy chỉnh"}`}
        </span>
      </div>

      <p className="text-caption text-text-muted">
        Chọn 1 trong 3 chế độ vận hành mẫu để hệ thống tự động cấu hình các nút duyệt và điểm chặn, hoặc bấm &quot;Tùy biến nâng cao&quot; để chỉnh riêng từng công tắc.
      </p>

      {/* Tầng 1: 3 Preset Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PRESETS.map((p) => {
          const isSelected = policy.preset === p.id
          return (
            <Button variant="ghost"
              key={p.id}
              type="button"
              onClick={() => handleApplyPreset(p.id as "LEAN" | "STANDARD" | "STRICT")}
              className={`text-[length:inherit] h-auto justify-start font-[inherit] gap-0 flex flex-col text-left p-3.5 rounded-xl border-2 transition-all relative ${
                isSelected
                  ? "border-primary bg-primary/5 shadow-xs hover:bg-primary/5"
                  : "border-border hover:border-border/80 bg-surface hover:bg-surface-muted/40"
              }`}
            >
              {isSelected && (
                <span className="absolute top-2.5 right-2.5 text-primary">
                  <CheckCircle2 size={16} />
                </span>
              )}
              <div className="flex items-center gap-2 mb-1">
                {p.icon}
                <span className="text-body-sm font-extrabold text-text">{p.title}</span>
              </div>
              <span className="text-caption font-bold text-text-muted mb-2">{p.subtitle}</span>
              <p className="text-caption text-text-muted leading-relaxed">{p.desc}</p>
            </Button>
          )
        })}
      </div>

      {/* Tầng 2: Tùy biến nâng cao */}
      <div className="border border-border rounded-xl overflow-hidden bg-bg/50">
        <Button variant="ghost"
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="h-auto gap-0 w-full flex items-center justify-between p-3.5 bg-surface text-body-sm font-bold text-text hover:bg-surface-muted transition-colors"
        >
          <span className="flex items-center gap-2">
            <span>Tùy biến nâng cao từng chốt chặn</span>
            {policy.preset === "CUSTOM" && (
              <span className="text-caption font-extrabold text-warning-text bg-warning-bg px-2 py-0.5 rounded-md">
                (Đã ghi đè)
              </span>
            )}
          </span>
          {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </Button>

        {showAdvanced && (
          <div className="p-4 flex flex-col gap-3.5 divide-y divide-border/60">
            {/* Gate 1: Bắt buộc Điều hành duyệt cọc */}
            <div className="flex items-start justify-between gap-3 pt-2">
              <div>
                <label className="text-body-sm font-bold text-text block">
                  Bắt buộc Điều hành duyệt tiền cọc
                </label>
                <p className="text-caption text-text-muted">
                  Bật: Chỉ tài khoản Điều hành mới bấm được &quot;Xác nhận tiền về&quot;. Tắt: Cho phép Điều phối và Sale xác nhận cọc ngay khi thấy bill.
                </p>
              </div>
              <Checkbox
                checked={policy.requireAdminDepositApproval}
                onCheckedChange={(checked) => handleToggle("requireAdminDepositApproval", (checked === true))}
                className="mt-1 h-5 w-5 rounded border-border text-primary focus:ring-primary/20"
              />
            </div>

            {/* Chuỗi / 1 cửa hàng: theo loại tổ chức Admin SaaS duyệt, tiệm không tự đổi (PO 22/10/2026) */}
            <div className="pt-3">
              <span className="text-body-sm font-bold text-text block">
                Mô hình vận hành: {policy.requireCoordinatorAcceptance ? "Chuỗi cửa hàng" : "1 cửa hàng"}
              </span>
              <p className="text-caption text-text-muted">
                {policy.requireCoordinatorAcceptance
                  ? "Điều phối chọn chi nhánh làm đơn và bấm Nhận đơn rồi đơn mới vào sản xuất."
                  : "Duyệt tiền xong là đơn vào sản xuất ngay."}{" "}
                Muốn đổi mô hình, gửi yêu cầu cho Admin SaaS duyệt.
              </p>
            </div>

            {/* Gate 3: Bắt buộc chụp Ảnh thành phẩm */}
            <div className="flex items-start justify-between gap-3 pt-3">
              <div>
                <label className="text-body-sm font-bold text-text block">
                  Bắt buộc chụp ảnh thành phẩm
                </label>
                <p className="text-caption text-text-muted">
                  Bật: Phải có ảnh thành phẩm hoàn chỉnh mới cho xuất giao. Tắt: Cho phép bấm &quot;Bỏ qua ảnh&quot; với đơn gấp hoặc khách quen.
                </p>
              </div>
              <Checkbox
                checked={policy.requireFinishedPhoto}
                onCheckedChange={(checked) => handleToggle("requireFinishedPhoto", (checked === true))}
                className="mt-1 h-5 w-5 rounded border-border text-primary focus:ring-primary/20"
              />
            </div>

            {/* Gate 4: Khách duyệt ảnh */}
            <div className={`flex items-start justify-between gap-3 pt-3 ${!policy.requireFinishedPhoto ? "opacity-50 pointer-events-none" : ""}`}>
              <div>
                <label className="text-body-sm font-bold text-text flex items-center gap-1.5">
                  <span>Cách khách duyệt ảnh</span>
                  {!policy.requireFinishedPhoto && <Lock size={12} className="text-text-muted" />}
                </label>
                <p className="text-caption text-text-muted">
                  Chọn cách xử lý khi khách xem ảnh trên link theo dõi tiến độ.
                </p>
              </div>
              <NativeSelect
                disabled={!policy.requireFinishedPhoto}
                value={policy.customerApprovalMode}
                onChange={(e) => handleToggle("customerApprovalMode", e.target.value)}
                className="h-8 px-2 rounded-lg border border-border bg-surface text-caption font-semibold"
              >
                <option value="AUTO_PASS_10M">Tự duyệt sau 10 phút (Chuẩn)</option>
                <option value="REQUIRE_CUSTOMER">Bắt buộc khách bấm duyệt</option>
                <option value="BYPASS">Bỏ qua duyệt khách (Giao ngay)</option>
              </NativeSelect>
            </div>

            {/* Gate 5: Chặn giao ship nếu chưa thu đủ */}
            <div className="flex items-start justify-between gap-3 pt-3">
              <div>
                <label className="text-body-sm font-bold text-text block">
                  Chặn giao ship nếu chưa thu đủ 100%
                </label>
                <p className="text-caption text-text-muted">
                  Bật: Đơn cọc bắt buộc thu nốt lần 2 mới mở nút Giao Ship. Tắt: Mở nút giao ngay (cho phép thu tiền mặt COD).
                </p>
              </div>
              <Checkbox
                checked={policy.requireFullPaymentBeforeDispatch}
                onCheckedChange={(checked) => handleToggle("requireFullPaymentBeforeDispatch", (checked === true))}
                className="mt-1 h-5 w-5 rounded border-border text-primary focus:ring-primary/20"
              />
            </div>

            {/* Gate 6: Bắt buộc ảnh người nhận */}
            <div className="flex items-start justify-between gap-3 pt-3">
              <div>
                <label className="text-body-sm font-bold text-text block">
                  Bắt buộc chụp ảnh người nhận
                </label>
                <p className="text-caption text-text-muted">
                  Bật: Shipper phải tải ảnh người nhận mới bấm Hoàn tất. Tắt: Cho phép bấm hoàn tất trực tiếp 1 click.
                </p>
              </div>
              <Checkbox
                checked={policy.requireDeliveryProofPhoto}
                onCheckedChange={(checked) => handleToggle("requireDeliveryProofPhoto", (checked === true))}
                className="mt-1 h-5 w-5 rounded border-border text-primary focus:ring-primary/20"
              />
            </div>

            {/* Gate 7: Cho phép ủy quyền duyệt SLA */}
            <div className="flex items-start justify-between gap-3 pt-3">
              <div>
                <label className="text-body-sm font-bold text-text block">
                  Cho phép Điều phối / Sale duyệt cọc khi quá hạn xử lý
                </label>
                <p className="text-caption text-text-muted">
                  Nếu Điều hành không bấm duyệt sau thời gian SLA, tự động mở khóa nút duyệt cho Điều phối và Sale phụ trách (chống nghẽn đơn).
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={policy.allowSlaEscalation}
                  onCheckedChange={(checked) => handleToggle("allowSlaEscalation", (checked === true))}
                  className="h-5 w-5 rounded border-border text-primary focus:ring-primary/20"
                />
                {policy.allowSlaEscalation && (
                  <NativeSelect
                    value={policy.slaEscalationMinutes}
                    onChange={(e) => handleToggle("slaEscalationMinutes", Number(e.target.value))}
                    className="h-8 px-2 rounded-lg border border-border bg-surface text-caption font-semibold"
                  >
                    <option value={5}>Sau 5 phút</option>
                    <option value={10}>Sau 10 phút</option>
                    <option value={15}>Sau 15 phút</option>
                    <option value={30}>Sau 30 phút</option>
                  </NativeSelect>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer & Nút lưu */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <p role="status" className={`text-caption font-medium ${message ? (message.ok ? "text-success" : "text-danger") : "text-text-muted"}`}>
          {message?.text ?? "Các thay đổi sẽ áp dụng ngay lập tức cho toàn bộ tài khoản trong tiệm."}
        </p>
        <Button type="submit" size="sm" disabled={saving || !draft} className="gap-1.5 shrink-0">
          {saving ? <Loader2 size={14} className="animate-spin motion-reduce:animate-none" /> : <Save size={14} />}
          <span>Lưu ma trận</span>
        </Button>
      </div>
    </form>
  )
}
