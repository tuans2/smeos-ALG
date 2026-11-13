"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import React, { useState } from "react"
import { Timer } from "@/components/ui/icons"
import { apiSend, useApi } from "@/components/greeting-card/greeting-api"
import { PIPELINE_STEPS, type TrackingPipelineStepId } from "@/modules/greeting-card/domain/tracking-pipeline-types"
import {
  MAX_SLA_MINUTES, STEP_OWNER_LABEL, STEP_SLA_RULES, STEP_SLA_SETTINGS_KEY, parseStepSla,
  type StepSlaSetting,
} from "@/modules/greeting-card/domain/step-sla"

type Draft = Record<TrackingPipelineStepId, StepSlaSetting>

/**
 * Thời gian chuẩn từng bước: quá giờ mà bước chưa xong → đơn hiện "kẹt" và người phụ trách
 * bước đó (Sale / Điều hành / Điều phối) nhận thông báo trong tab của mình.
 */
export function BrochureStepSlaSettings() {
  const org = useApi<{ settings?: Record<string, unknown> | null }>("/api/v1/organizations/current")
  const [edited, setEdited] = useState<Draft | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  // Chưa sửa gì → hiện đúng giá trị đã lưu
  const draft: Draft | null = edited ?? (org.data ? parseStepSla(org.data.settings) : null)

  function patch(id: TrackingPipelineStepId, value: Partial<StepSlaSetting>) {
    if (!draft) return
    setEdited({ ...draft, [id]: { ...draft[id], ...value } })
    setMessage(null)
  }

  async function save() {
    if (!draft) return
    const bad = STEP_SLA_RULES.find((r) => !(draft[r.stepId].minutes > 0 && draft[r.stepId].minutes <= MAX_SLA_MINUTES))
    if (bad) {
      setMessage({ ok: false, text: "Mỗi bước cần từ 1 phút đến 7 ngày." })
      return
    }
    setSaving(true)
    try {
      await apiSend("/api/v1/organizations/current", "PATCH", { settings: { [STEP_SLA_SETTINGS_KEY]: draft } }, "Không lưu được thời gian chuẩn")
      await org.mutate()
      setEdited(null)
      setMessage({ ok: true, text: "Đã lưu thời gian chuẩn các bước." })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Không lưu được thời gian chuẩn" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="bg-surface rounded-2xl border border-border p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Timer size={18} className="text-primary" aria-hidden="true" />
        <h3 className="text-title-sm font-extrabold text-text">Thời gian chuẩn từng bước</h3>
      </div>
      <p className="text-caption text-text-muted">Quá thời gian mà bước chưa xong, đơn được đánh dấu kẹt và người phụ trách nhận thông báo.</p>
      {!draft ? (
        <div className="h-24 rounded-lg bg-surface-alt animate-pulse motion-reduce:animate-none" aria-busy="true" />
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
          {STEP_SLA_RULES.map((r) => {
            const s = draft[r.stepId]
            const title = PIPELINE_STEPS.find((p) => p.id === r.stepId)?.shortTitle ?? r.stepId
            return (
              <li key={r.stepId} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                <label className="flex min-w-0 flex-1 items-start gap-2">
                  <Checkbox checked={s.enabled} onCheckedChange={(checked) => patch(r.stepId, { enabled: (checked === true) })} className="mt-1" />
                  <span className="min-w-0">
                    <span className="block text-body-sm font-semibold text-text">{title}</span>
                    <span className="block text-caption text-text-muted">{r.waitingFor} · báo cho {STEP_OWNER_LABEL[r.owner]}</span>
                  </span>
                </label>
                <label className="flex items-center gap-1 text-caption text-text-muted">
                  <span className="sr-only">Số phút tối đa cho bước {title}</span>
                  <Input
                    type="number"
                    min={1}
                    max={MAX_SLA_MINUTES}
                    value={s.minutes}
                    disabled={!s.enabled}
                    onChange={(e) => patch(r.stepId, { minutes: Number(e.target.value) })}
                    className="h-9 w-20 rounded-lg border border-border bg-surface px-2 text-right text-body-sm text-text disabled:opacity-50"
                  />
                  phút
                </label>
              </li>
            )
          })}
        </ul>
      )}
      <div className="flex items-center justify-between gap-2">
        {message ? (
          <p role="status" className={`text-caption font-medium ${message.ok ? "text-success" : "text-danger"}`}>{message.text}</p>
        ) : <span />}
        <Button variant="primary"
          type="button"
          onClick={() => void save()}
          disabled={!draft || saving}
          className="py-0 gap-0 h-9 rounded-lg bg-primary px-4 text-body-sm font-bold text-white hover:bg-primary-dark disabled:opacity-50"
        >
          {saving ? "Đang lưu..." : "Lưu"}
        </Button>
      </div>
    </section>
  )
}
