"use client"

import { Slider } from "@/components/ui/slider"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import React, { useState } from "react"
import {
  Sliders,
  Send,
  Clock,
  Sparkles,
  Save,
  CheckCircle2,
  AlertTriangle,
  Radio,
  BellRing,
  RotateCcw,
} from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { apiSend, useApi } from "@/components/greeting-card/greeting-api"
import {
  CHAIN_DISPATCH_POLICY_KEY,
  DEFAULT_CHAIN_DISPATCH_POLICY,
  parseChainDispatchPolicy,
  serializeChainDispatchPolicy,
  type ChainDispatchPolicy,
} from "@/modules/greeting-card/domain/chain-dispatch-policy"

export function ChainDispatchSettings() {
  const [confirm, confirmDialog] = useConfirmDialog()
  const org = useApi<{ settings?: Record<string, unknown> | null }>("/api/v1/organizations/current")
  const [draft, setDraft] = useState<ChainDispatchPolicy | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const policy = draft ?? (org.data ? parseChainDispatchPolicy(org.data.settings) : null)

  const handleUpdate = <K extends keyof ChainDispatchPolicy>(key: K, val: ChainDispatchPolicy[K]) => {
    if (!policy) return
    setDraft({ ...policy, [key]: val })
    setMessage(null)
  }

  const handleWeightChange = (key: keyof ChainDispatchPolicy["scoringWeights"], val: number) => {
    if (!policy) return
    setDraft({
      ...policy,
      scoringWeights: { ...policy.scoringWeights, [key]: val },
    })
    setMessage(null)
  }

  const handleMilestoneChange = (key: keyof ChainDispatchPolicy["milestoneReminders"], val: unknown) => {
    if (!policy) return
    setDraft({
      ...policy,
      milestoneReminders: { ...policy.milestoneReminders, [key]: val },
    })
    setMessage(null)
  }

  const handleResetDefaults = async () => {
    if (await confirm({ title: "Khôi phục tiêu chuẩn phân đơn chuỗi về mặc định?", consequence: "Mọi tiêu chuẩn đang chỉnh sẽ trở về mặc định của hệ thống. Thay đổi chỉ có hiệu lực khi bấm Lưu.", confirmLabel: "Khôi phục mặc định" })) {
      setDraft({ ...DEFAULT_CHAIN_DISPATCH_POLICY })
      setMessage(null)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!policy) return
    setSaving(true)
    setMessage(null)
    try {
      await apiSend(
        "/api/v1/organizations/current",
        "PATCH",
        {
          settings: {
            [CHAIN_DISPATCH_POLICY_KEY]: serializeChainDispatchPolicy(policy),
          },
        },
        "Không lưu được cấu hình điều phối chuỗi"
      )
      await org.mutate()
      setDraft(null)
      setMessage({ ok: true, text: "Đã lưu thành công tiêu chuẩn điều phối chuỗi tự động." })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Lỗi lưu cấu hình" })
    } finally {
      setSaving(false)
    }
  }

  if (!policy) {
    return <div className="h-44 rounded-2xl bg-surface-alt animate-pulse motion-reduce:animate-none" aria-busy="true" />
  }

  return (
    <form onSubmit={handleSave} className="bg-surface rounded-2xl border border-border p-5 sm:p-6 shadow-sm flex flex-col gap-6">
      {confirmDialog}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <h3 className="text-title font-extrabold text-text flex items-center gap-2">
            <Radio size={22} className="text-primary" />
            Điều Phối Gia Công Tự Động (Chuỗi Cửa Hàng)
          </h3>
          <p className="text-caption text-text-muted mt-0.5">
            Tự động tìm kiếm, chấm điểm chi nhánh tối ưu và bắn Thẻ Gia Công qua Zalo / Telegram / Messenger.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleResetDefaults} className="h-9 text-caption">
            <RotateCcw size={14} className="mr-1" /> Mặc định
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={saving || !draft} className="h-9 font-bold">
            <Save size={14} className="mr-1" /> {saving ? "Đang lưu..." : "Lưu cài đặt"}
          </Button>
        </div>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2 text-body-sm ${
            message.ok
              ? "bg-success-bg border-success/30 text-success"
              : "bg-danger-bg border-danger/30 text-danger"
          }`}
        >
          {message.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Bật/Tắt Cơ Chế Tự Động */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-surface-alt border border-border">
        <div>
          <span className="text-body font-bold text-text block">
            Tự động chọn cửa hàng & phát lệnh (mặc định)
          </span>
          <span className="text-caption text-text-muted">
            Bật: ngay khi xác nhận đã nhận tiền, hệ thống tự chọn các cửa hàng phù hợp nhất và gửi Thẻ Gia Công.
            Tắt: Điều phối tự chọn cửa hàng rồi bấm &quot;Duyệt &amp; phát lệnh&quot; trong Thẻ gia công. Khi đang bật,
            Điều phối vẫn có thể chọn thủ công cho từng đơn lúc xác nhận tiền.
          </span>
        </div>
        <Checkbox
          checked={policy.enabled}
          onCheckedChange={(checked) => handleUpdate("enabled", (checked === true))}
          className="w-5 h-5 accent-primary cursor-pointer rounded"
        />
      </div>

      {/* Cơ Chế Xác Nhận Đơn Hàng (Gate 2) */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-body font-bold text-text block">
              Tự động duyệt xác nhận đơn khi Chi nhánh chốt nhận
            </span>
            <span className="text-caption font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary uppercase">
              Mặc định
            </span>
          </div>
          <span className="text-caption text-text-muted">
            Khi bật (Khuyên dùng): Ngay khi Shop bấm nhận đơn, hệ thống tự động xác nhận đơn và chuyển thẳng sang sản xuất (Điều phối không cần bấm duyệt tay). Tắt đi nếu muốn Điều phối phải kiểm duyệt lại một lần nữa.
          </span>
        </div>
        <Checkbox
          checked={policy.autoConfirmOnBranchCommit}
          onCheckedChange={(checked) => handleUpdate("autoConfirmOnBranchCommit", (checked === true))}
          className="w-5 h-5 accent-primary cursor-pointer rounded"
        />
      </div>

      {/* Cấu Hình Tiêu Chuẩn Lọc & Thời Gian */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-border bg-surface flex flex-col gap-3">
          <h4 className="text-body-sm font-bold text-text flex items-center gap-1.5">
            <Send size={16} className="text-primary" /> Tiêu chuẩn Bắn đơn & Thời gian
          </h4>

          <div>
            <label className="text-caption font-semibold text-text block mb-1">
              Số chi nhánh mời cùng lúc (Top N): <strong>{policy.topN} chi nhánh</strong>
            </label>
            <Slider
              aria-label="Số chi nhánh mời cùng lúc"
              min={1}
              max={10}
              value={policy.topN}
              onValueChange={(v) => handleUpdate("topN", v)}
              getValueText={(v) => `${v} chi nhánh`}
            />
          </div>

          <div>
            <label className="text-caption font-semibold text-text block mb-1">
              Thời gian chờ phản hồi mỗi vòng: <strong>{policy.claimTimeoutMinutes} phút</strong>
            </label>
            <Slider
              aria-label="Thời gian chờ phản hồi mỗi vòng"
              min={1}
              max={30}
              value={policy.claimTimeoutMinutes}
              onValueChange={(v) => handleUpdate("claimTimeoutMinutes", v)}
              getValueText={(v) => `${v} phút`}
            />
          </div>

          <div>
            <label className="text-caption font-semibold text-text block mb-1">
              Thời hạn hủy sau khi nhận: <strong>{policy.cancellationGraceMinutes} phút</strong>
            </label>
            <Slider
              aria-label="Thời hạn hủy sau khi nhận"
              min={1}
              max={15}
              value={policy.cancellationGraceMinutes}
              onValueChange={(v) => handleUpdate("cancellationGraceMinutes", v)}
              getValueText={(v) => `${v} phút`}
            />
          </div>

          <div>
            <label className="text-caption font-semibold text-text block mb-1">
              Bán kính quét tối đa: <strong>{policy.maxRadiusKm} km</strong>
            </label>
            <Slider
              aria-label="Bán kính quét tối đa"
              min={5}
              max={50}
              value={policy.maxRadiusKm}
              onValueChange={(v) => handleUpdate("maxRadiusKm", v)}
              getValueText={(v) => `${v} km`}
            />
          </div>
        </div>

        {/* Trọng Số Chấm Điểm Chi Nhánh */}
        <div className="p-4 rounded-xl border border-border bg-surface flex flex-col gap-3">
          <h4 className="text-body-sm font-bold text-text flex items-center gap-1.5">
            <Sliders size={16} className="text-primary" /> Trọng số Chấm điểm & Xếp hạng
          </h4>

          <div>
            <div className="flex justify-between text-caption font-semibold text-text mb-1">
              <span>Khoảng cách gần người nhận:</span>
              <span className="font-bold text-primary">{policy.scoringWeights.distance}%</span>
            </div>
            <Slider
              aria-label="Trọng số khoảng cách gần người nhận"
              min={0}
              max={100}
              step={5}
              value={policy.scoringWeights.distance}
              onValueChange={(v) => handleWeightChange("distance", v)}
              getValueText={(v) => `${v}%`}
            />
          </div>

          <div>
            <div className="flex justify-between text-caption font-semibold text-text mb-1">
              <span>Điểm chất lượng KPI chi nhánh:</span>
              <span className="font-bold text-primary">{policy.scoringWeights.qualityScore}%</span>
            </div>
            <Slider
              aria-label="Trọng số điểm chất lượng chi nhánh"
              min={0}
              max={100}
              step={5}
              value={policy.scoringWeights.qualityScore}
              onValueChange={(v) => handleWeightChange("qualityScore", v)}
              getValueText={(v) => `${v}%`}
            />
          </div>

          <div>
            <div className="flex justify-between text-caption font-semibold text-text mb-1">
              <span>Độ sẵn sàng (Ít việc dở dang):</span>
              <span className="font-bold text-primary">{policy.scoringWeights.workload}%</span>
            </div>
            <Slider
              aria-label="Trọng số độ sẵn sàng"
              min={0}
              max={100}
              step={5}
              value={policy.scoringWeights.workload}
              onValueChange={(v) => handleWeightChange("workload", v)}
              getValueText={(v) => `${v}%`}
            />
          </div>

          <p className="text-caption text-text-muted mt-auto pt-2 border-t border-border">
            Hệ thống sẽ chuẩn hóa tổng 3 trọng số để tính toán ra thứ hạng Top {policy.topN} chi nhánh tốt nhất.
          </p>
        </div>
      </div>

      {/* Cấu Hình Tự Động Nhắc Việc Theo Mốc Tiến Độ */}
      <div className="p-4 rounded-xl border border-border bg-surface flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <h4 className="text-body-sm font-bold text-text flex items-center gap-1.5">
            <BellRing size={16} className="text-primary" /> Tự động Nhắc việc Đa Kênh Theo Tiến Độ
          </h4>
          <label className="flex items-center gap-2 text-caption cursor-pointer">
            <Checkbox
              checked={policy.milestoneReminders.enabled}
              onCheckedChange={(checked) => handleMilestoneChange("enabled", (checked === true))}
              className="w-4 h-4 accent-primary rounded"
            />
            <span className="font-semibold text-text">Bật nhắc việc Bot</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3 rounded-lg bg-surface-alt border border-border">
            <span className="text-caption font-bold text-text block mb-1">
              Nhắc chụp ảnh QC:
            </span>
            <span className="text-body font-black text-primary">
              {policy.milestoneReminders.qcReminderMinutesBefore} phút
            </span>
            <span className="text-caption text-text-muted block mt-0.5">trước giờ giao dự kiến</span>
          </div>

          <div className="p-3 rounded-lg bg-surface-alt border border-border">
            <span className="text-caption font-bold text-text block mb-1">
              Nhắc bàn giao Shipper:
            </span>
            <span className="text-body font-black text-primary">
              {policy.milestoneReminders.dispatchReminderMinutesBefore} phút
            </span>
            <span className="text-caption text-text-muted block mt-0.5">trước giờ giao dự kiến</span>
          </div>

          <div className="p-3 rounded-lg bg-surface-alt border border-border">
            <span className="text-caption font-bold text-text block mb-1">
              Cảnh báo vi phạm SLA:
            </span>
            <span className="text-body font-black text-danger">
              {policy.milestoneReminders.overdueWarningMinutes} phút
            </span>
            <span className="text-caption text-text-muted block mt-0.5">sau khi quá hạn giao</span>
          </div>
        </div>
      </div>
    </form>
  )
}
