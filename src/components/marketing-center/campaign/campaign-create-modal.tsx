"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Dialog } from "@/components/ui/dialog"
import { InlineError } from "@/components/ui/inline-error"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/select"
import {
  CAMPAIGN_OBJECTIVE_LABELS,
  CAMPAIGN_OBJECTIVES,
  type Campaign,
  type CampaignObjective,
  type CampaignStatus,
} from "@/modules/marketing-center/domain/campaign"
import { campaignApi } from "./campaign-api"

interface CampaignCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (campaign: Campaign) => void
}

const COMMON_OCCASIONS = [
  { code: "TET", label: "Tết Nguyên Đán" },
  { code: "VALENTINE", label: "Lễ tình nhân (14/2)" },
  { code: "WOMEN_DAY", label: "Quốc tế Phụ nữ (8/3)" },
  { code: "VIETNAM_WOMEN", label: "Phụ nữ Việt Nam (20/10)" },
  { code: "MID_AUTUMN", label: "Tết Trung Thu" },
  { code: "CHRISTMAS", label: "Giáng sinh & Năm mới" },
  { code: "BLACK_FRIDAY", label: "Ưu đãi lớn / Flash Sale" },
  { code: "BIRTHDAY", label: "Sinh nhật & Kỷ niệm" },
  { code: "OTHER", label: "Dịp khác / Thường ngày" },
]

export function CampaignCreateModal({ isOpen, onClose, onSuccess }: CampaignCreateModalProps) {
  const [name, setName] = useState("")
  const [objective, setObjective] = useState<CampaignObjective>("LEAD")
  const [occasionCode, setOccasionCode] = useState("TET")
  const [startsAt, setStartsAt] = useState("")
  const [endsAt, setEndsAt] = useState("")
  const [status, setStatus] = useState<CampaignStatus>("DRAFT")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError("Vui lòng nhập tên chiến dịch")
      return
    }

    setLoading(true)
    try {
      const created = await campaignApi.create({
        name: name.trim(),
        objective,
        occasion_code: occasionCode || null,
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        status,
      })
      onSuccess(created)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo chiến dịch")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title="Tạo chiến dịch mới"
      size="md"
    >
      {error && (
        <div className="mb-4">
          <InlineError message={error} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="camp-name" className="block text-caption font-medium text-text mb-1">
            Tên chiến dịch *
          </label>
          <Input
            id="camp-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: Chiến dịch Hoa Tết 2026, Quà tặng 20/10..."
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-caption font-medium text-text mb-1">Mục tiêu chiến dịch *</label>
          <div className="grid grid-cols-2 gap-2">
            {CAMPAIGN_OBJECTIVES.map((obj) => (
              <Button variant="ghost"
                type="button"
                key={obj}
                aria-pressed={objective === obj}
                onClick={() => setObjective(obj)}
                className={`text-[length:inherit] h-auto justify-start font-[inherit] gap-0 inline-block cursor-pointer rounded-xl border p-3 text-left transition-colors ${
                  objective === obj
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border bg-surface text-text hover:bg-surface"
                }`}
              >
                <div className="text-body-sm font-semibold">{CAMPAIGN_OBJECTIVE_LABELS[obj]}</div>
              </Button>
            ))}
          </div>
        </div>

        <div>
          <label htmlFor="camp-occasion" className="block text-caption font-medium text-text mb-1">
            Dịp / Sự kiện kích cầu
          </label>
          <NativeSelect
            id="camp-occasion"
            value={occasionCode}
            onChange={(e) => setOccasionCode(e.target.value)}
            className="w-full"
          >
            {COMMON_OCCASIONS.map((occ) => (
              <option key={occ.code} value={occ.code}>
                {occ.label}
              </option>
            ))}
          </NativeSelect>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="camp-start" className="block text-caption font-medium text-text mb-1">
              Bắt đầu từ
            </label>
            <Input
              id="camp-start"
              type="date"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="camp-end" className="block text-caption font-medium text-text mb-1">
              Kết thúc vào
            </label>
            <Input
              id="camp-end"
              type="date"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </div>
        </div>

        <div>
          <span id="camp-status-label" className="block text-caption font-medium text-text mb-1">Trạng thái ban đầu</span>
          <RadioGroup
            aria-labelledby="camp-status-label"
            value={status}
            onValueChange={(v) => setStatus(v as CampaignStatus)}
            className="flex gap-4"
          >
            <label className="flex items-center gap-2 text-body-sm text-text cursor-pointer">
              <RadioGroupItem value="DRAFT" />
              <span>Lưu bản nháp</span>
            </label>
            <label className="flex items-center gap-2 text-body-sm text-text cursor-pointer">
              <RadioGroupItem value="ACTIVE" />
              <span>Kích hoạt ngay</span>
            </label>
          </RadioGroup>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Huỷ
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? "Đang tạo..." : "Tạo chiến dịch"}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
