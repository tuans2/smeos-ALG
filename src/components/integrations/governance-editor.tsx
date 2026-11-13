"use client"

import { Button } from "@/components/ui/button"
import type { GovernanceItem } from "@/modules/integration-hub/use-cases/integration-governance"
import type { GovernanceMode } from "@/modules/integration-hub/domain/integration-governance"

const MODE_LABEL: Record<GovernanceMode, string> = {
  ALLOW_OWN: "Cho tự kết nối",
  INHERIT_ONLY: "Bắt buộc dùng của cấp trên",
  FORBID: "Cấm dùng",
}
const MODES: GovernanceMode[] = ["ALLOW_OWN", "INHERIT_ONLY", "FORBID"]
const TIER_LABEL: Record<string, string> = { MOTHER: "nền tảng", INDUSTRY: "ngành", CHAIN: "chuỗi" }

interface GovernanceEditorProps {
  items: GovernanceItem[]
  busyKey: string | null
  onChange: (connectorKey: string, mode: GovernanceMode) => void
}

/** Bảng chọn chế độ cho tầng dưới — dùng chung cho Chuỗi và Nền tảng/Ngành. Mục bị cấp trên khoá hiện lý do, không đổi được. */
export function GovernanceEditor({ items, busyKey, onChange }: GovernanceEditorProps) {
  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
      {items.map((item) => (
        <li key={item.connectorKey} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="font-semibold text-text">{item.label}</p>
            {item.lockedByUpper && (
              <p className="text-body-sm text-warning-text">
                Cấp {TIER_LABEL[item.lockedByUpper] ?? "trên"} đã đặt: {MODE_LABEL[item.upperMode]}
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label={`Chế độ cho ${item.label}`}>
            {MODES.map((mode) => (
              <Button
                key={mode}
                size="xs"
                variant={item.mode === mode ? "primary" : "outline"}
                aria-pressed={item.mode === mode}
                disabled={item.lockedByUpper !== null || busyKey === item.connectorKey}
                onClick={() => item.mode !== mode && onChange(item.connectorKey, mode)}
              >
                {MODE_LABEL[mode]}
              </Button>
            ))}
          </div>
        </li>
      ))}
    </ul>
  )
}
