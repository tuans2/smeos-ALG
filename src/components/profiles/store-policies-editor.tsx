"use client"

import React, { useState } from "react"
import { Gift } from "@/components/ui/icon-set/gift"
import { ShieldCheck } from "@/components/ui/icon-set/shield-check"
import { FileText } from "@/components/ui/icon-set/file-text"
import { Plus } from "@/components/ui/icon-set/plus"
import { Trash2 } from "@/components/ui/icon-set/trash2"
import { Check } from "@/components/ui/icon-set/check"
import { RotateCcw } from "@/components/ui/icon-set/rotate-ccw"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { PromotionKindField } from "./promotion-kind-field"
import { AgreementsSection } from "./store-policies-agreements-section"
import {
  type StorePoliciesConfig,
  type PromotionItem,
  type CommitmentItem,
  type AgreementItem,
  getIndustryDefaultPromotions,
  getIndustryDefaultCommitments,
  getIndustryDefaultAgreements,
} from "@/modules/greeting-card/domain/store-policy"

interface Props {
  initialPolicies?: StorePoliciesConfig | null
  onSave: (policies: StorePoliciesConfig) => Promise<boolean>
  saving: boolean
  industryKey?: string | null | undefined
  initialSection?: "promo" | "commit" | "agree" | undefined
  hideSubTabs?: boolean | undefined
}

export function StorePoliciesEditor({
  initialPolicies,
  onSave,
  saving,
  industryKey,
  initialSection = "promo",
  hideSubTabs = false,
}: Props) {
  const defaultPromos = getIndustryDefaultPromotions(industryKey)
  const defaultCommits = getIndustryDefaultCommitments(industryKey)
  const defaultAgrees = getIndustryDefaultAgreements(industryKey)

  const [promotions, setPromotions] = useState<PromotionItem[]>(initialPolicies?.promotions ?? defaultPromos)
  const [commitments, setCommitments] = useState<CommitmentItem[]>(initialPolicies?.commitments ?? defaultCommits)
  const [agreements, setAgreements] = useState<AgreementItem[]>(initialPolicies?.agreements ?? defaultAgrees)
  const [intakeCta, setIntakeCta] = useState(() => initialPolicies?.intakePromotionCta ?? { enabled: true, percent: 10 })
  const [activeSection, setActiveSection] = useState<"promo" | "commit" | "agree">(initialSection)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [confirm, confirmDialog] = useConfirmDialog()

  // Đồng bộ activeSection khi initialSection đổi từ bên ngoài — điều chỉnh ngay lúc render, không dùng effect
  const [syncedInitial, setSyncedInitial] = useState(initialSection)
  if (syncedInitial !== initialSection) {
    setSyncedInitial(initialSection)
    setActiveSection(initialSection)
  }

  const handleResetDefaults = async () => {
    if (
      !(await confirm({
        title: "Khôi phục chính sách mặc định?",
        consequence: "Danh sách Ưu đãi, Cam kết và Thỏa thuận sẽ được đặt lại theo tiêu chuẩn mặc định của ngành.",
        confirmLabel: "Khôi phục",
        tone: "default",
      }))
    ) {
      return
    }
    setPromotions(defaultPromos)
    setCommitments(defaultCommits)
    setAgreements(defaultAgrees)
    setIntakeCta({ enabled: true, percent: 10 })
  }

  const handleSave = async () => {
    const ok = await onSave({ promotions, commitments, agreements, intakePromotionCta: intakeCta })
    if (ok) {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    }
  }

  // --- Helpers for Promotions ---
  const addPromo = () => {
    const id = `promo-${Date.now()}`
    setPromotions([...promotions, { id, title: "Ưu đãi mới", description: "Mô tả ưu đãi tặng cho khách hàng", kind: "GIFT" }])
  }
  const removePromo = (id: string) => setPromotions(promotions.filter((p) => p.id !== id))
  const updatePromo = (id: string, patch: Partial<PromotionItem>) =>
    setPromotions(promotions.map((p) => (p.id === id ? { ...p, ...patch } : p)))

  // --- Helpers for Commitments ---
  const addCommit = () => {
    const id = `commit-${Date.now()}`
    setCommitments([...commitments, { id, title: "Cam kết mới", customerText: "Cam kết của cửa hàng gửi tới khách hàng" }])
  }
  const removeCommit = (id: string) => setCommitments(commitments.filter((c) => c.id !== id))
  const updateCommit = (id: string, patch: Partial<CommitmentItem>) =>
    setCommitments(commitments.map((c) => (c.id === id ? { ...c, ...patch } : c)))

  // --- Helpers for Agreements ---
  const addAgree = () => {
    const id = `agree-${Date.now()}`
    setAgreements([...agreements, { id, title: "Thỏa thuận mới", customerText: "Thỏa thuận cần khách đọc và hiểu trước khi đặt" }])
  }
  const removeAgree = (id: string) => setAgreements(agreements.filter((a) => a.id !== id))
  const updateAgree = (id: string, patch: Partial<AgreementItem>) =>
    setAgreements(agreements.map((a) => (a.id === id ? { ...a, ...patch } : a)))

  return (
    <div className="space-y-6">
      {/* Thanh chuyển đổi Section (ẩn nếu parent đã có Tab riêng) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-4 rounded-2xl border border-border shadow-xs">
        {!hideSubTabs ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={activeSection === "promo" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setActiveSection("promo")}
              className="gap-2"
            >
              <Gift size={16} />
              <span>A. Ưu đãi ({promotions.length})</span>
            </Button>
            <Button
              type="button"
              variant={activeSection === "commit" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setActiveSection("commit")}
              className="gap-2"
            >
              <ShieldCheck size={16} />
              <span>B. Cam kết ({commitments.length})</span>
            </Button>
            <Button
              type="button"
              variant={activeSection === "agree" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setActiveSection("agree")}
              className="gap-2"
            >
              <FileText size={16} />
              <span>C. Thỏa thuận ({agreements.length})</span>
            </Button>
          </div>
        ) : (
          <div className="text-caption font-bold text-text-muted flex items-center gap-1.5">
            <span>Đang thiết lập:</span>
            <span className="text-primary font-extrabold uppercase">
              {activeSection === "promo" && "Danh mục Ưu đãi"}
              {activeSection === "commit" && "Cam kết chất lượng"}
              {activeSection === "agree" && "Thỏa thuận đặt hàng"}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleResetDefaults} className="h-9 gap-1 text-caption text-text-muted">
            <RotateCcw size={13} /> Khôi phục mặc định
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={saving} className="h-9 gap-1.5 font-bold">
            {saveSuccess ? <Check size={14} className="text-white" /> : null}
            <span>{saving ? "Đang lưu..." : saveSuccess ? "Đã lưu!" : "Lưu thay đổi"}</span>
          </Button>
        </div>
      </div>

      {/* SECTION A: ƯU ĐÃI */}
      {activeSection === "promo" && (
        <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h3 className="text-title-sm font-extrabold text-text">Danh mục Ưu đãi (Khách chọn khi đặt hoa)</h3>
              <p className="text-caption text-text-muted">Bộ sưu tập áp dụng ưu đãi sẽ cho phép khách chọn duy nhất 01 ưu đãi trong nhóm này.</p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={addPromo} className="gap-1 h-8 text-caption font-bold">
              <Plus size={14} /> Thêm ưu đãi
            </Button>
          </div>

          {/* Cấu hình CTA Ưu đãi Chặng 1 khi mở link */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={intakeCta.enabled}
                  onCheckedChange={(checked) => setIntakeCta({ ...intakeCta, enabled: checked === true })}
                />
                <span className="text-body-sm font-bold text-text">
                  Bật dòng ưu đãi khi khách mở link bộ sưu tập riêng
                </span>
              </label>

              {intakeCta.enabled && (
                <div className="flex items-center gap-1.5 text-body-sm">
                  <span className="text-text-muted">Mức giảm:</span>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    aria-label="Mức giảm (%)"
                    value={intakeCta.percent}
                    onChange={(e) => {
                      const val = Math.min(100, Math.max(1, Number(e.target.value) || 1))
                      setIntakeCta({ ...intakeCta, percent: val })
                    }}
                    inputSize="sm"
                    className="w-16 text-center font-bold"
                  />
                  <span className="font-bold text-primary">%</span>
                </div>
              )}
            </div>

            {intakeCta.enabled && (
              <p className="text-caption text-text-muted">
                Xem trước: <strong className="text-text">&ldquo;Nhận quà {intakeCta.percent}% giảm giá khi Đặt mua hoa trực tiếp tại link này!&rdquo;</strong>
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {promotions.map((p) => (
              <div key={p.id} className="p-3.5 rounded-xl border border-border bg-surface-alt/30 flex flex-col gap-2 relative group">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removePromo(p.id)}
                  aria-label="Xóa ưu đãi"
                  className="absolute top-3 right-3 text-text-muted hover:text-danger p-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={14} />
                </Button>
                <Input
                  inputSize="sm"
                  value={p.title}
                  onChange={(e) => updatePromo(p.id, { title: e.target.value })}
                  placeholder="Tiêu đề ưu đãi..."
                  className="font-bold text-body-sm text-text bg-transparent border-0 border-b border-border/40 rounded-none px-0"
                />
                <Textarea
                  rows={2}
                  value={p.description}
                  onChange={(e) => updatePromo(p.id, { description: e.target.value })}
                  placeholder="Mô tả quyền lợi nhận được..."
                  className="text-caption text-text-muted bg-transparent border-none min-h-[60px] p-0 shadow-none focus-visible:outline-hidden"
                />
                <PromotionKindField item={p} onChange={(patch) => updatePromo(p.id, patch)} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION B: CAM KẾT */}
      {activeSection === "commit" && (
        <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div>
              <h3 className="text-title-sm font-extrabold text-text">Cam kết cốt lõi của Cửa hàng</h3>
              <p className="text-caption text-text-muted">Những điều cửa hàng chắc chắn thực hiện đúng chuẩn đã công bố tới khách hàng.</p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={addCommit} className="gap-1 h-8 text-caption font-bold">
              <Plus size={14} /> Thêm cam kết
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {commitments.map((c) => (
              <div key={c.id} className="p-3.5 rounded-xl border border-border bg-surface-alt/30 flex flex-col gap-2 relative group">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeCommit(c.id)}
                  aria-label="Xóa cam kết"
                  className="absolute top-3 right-3 text-text-muted hover:text-danger p-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={14} />
                </Button>
                <Input
                  inputSize="sm"
                  value={c.title}
                  onChange={(e) => updateCommit(c.id, { title: e.target.value })}
                  placeholder="Tiêu đề cam kết..."
                  className="font-bold text-body-sm text-text bg-transparent border-0 border-b border-border/40 rounded-none px-0"
                />
                <Textarea
                  rows={2}
                  value={c.customerText}
                  onChange={(e) => updateCommit(c.id, { customerText: e.target.value })}
                  placeholder="Văn bản công bố với khách hàng..."
                  className="text-caption text-text-muted bg-transparent border-none min-h-[60px] p-0 shadow-none focus-visible:outline-hidden"
                />
                <Input
                  inputSize="sm"
                  value={c.internalText || ""}
                  onChange={(e) => updateCommit(c.id, { internalText: e.target.value })}
                  placeholder="Quy định nội bộ cho nhân viên (tùy chọn)..."
                  className="text-caption text-text-muted italic bg-transparent border-0 border-t border-border/40 rounded-none px-0 pt-1"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION C: THỎA THUẬN */}
      {activeSection === "agree" && (
        <AgreementsSection agreements={agreements} onAdd={addAgree} onRemove={removeAgree} onUpdate={updateAgree} />
      )}
      {confirmDialog}
    </div>
  )
}
