"use client"

import React, { useId, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/select"
import type { UsageDestination } from "@/modules/marketing-center/domain/asset-type"
import { type CtaCode, getCtaDefinition } from "@/modules/marketing-center/domain/cta-registry"
import {
  getAvailableCtasForDestination,
  USAGE_CHANNELS,
} from "@/modules/marketing-center/domain/usage-rules"

export interface UseAssetFormSubmitData {
  destination: UsageDestination
  ctaCode: CtaCode
  title: string
  channelId: string
  targetPath?: string | undefined
}

export interface UseAssetFormProps {
  assetTitle: string
  assetTypeCode: string
  allowedDestinations: readonly UsageDestination[]
  onSubmit: (data: UseAssetFormSubmitData) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
}

const DESTINATION_INFO: Record<UsageDestination, { label: string; desc: string }> = {
  PROMOTION: {
    label: "Quảng bá",
    desc: "Thu hút khách hàng mới qua mạng xã hội, quảng cáo hoặc bài đăng kênh.",
  },
  SALES: {
    label: "Bán hàng",
    desc: "Gửi báo giá, catalog sản phẩm hoặc biểu mẫu chốt đơn trực tiếp.",
  },
  CARE: {
    label: "Chăm sóc",
    desc: "Gửi lời chúc, thăm hỏi, thiệp tri ân hoặc khảo sát độ hài lòng.",
  },
  PRINT: {
    label: "Ấn phẩm & In",
    desc: "Xuất file in ấn chất lượng cao, mã QR tại quầy hoặc nhãn mác.",
  },
  LIBRARY: {
    label: "Lưu trữ nội bộ",
    desc: "Lưu giữ tài nguyên trong kho dữ liệu phục vụ vận hành.",
  },
}

export function UseAssetForm({
  assetTitle,
  allowedDestinations,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: UseAssetFormProps) {
  const titleInputId = useId()
  const targetPathInputId = useId()

  const defaultDest: UsageDestination =
    allowedDestinations.length > 0 ? (allowedDestinations[0] as UsageDestination) : "PROMOTION"
  const [destination, setDestination] = useState<UsageDestination>(defaultDest)

  const availableCtas = useMemo(() => getAvailableCtasForDestination(destination), [destination])
  const [ctaCode, setCtaCode] = useState<CtaCode>(availableCtas[0] ?? "LEARN_MORE")
  const [channelId, setChannelId] = useState("WEB_LINK")
  const [title, setTitle] = useState(`Dùng cho ${DESTINATION_INFO[destination]?.label ?? destination}`)
  const [targetPath, setTargetPath] = useState("/c")
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDestinationChange = (dest: UsageDestination) => {
    setDestination(dest)
    const newCtas = getAvailableCtasForDestination(dest)
    if (newCtas[0]) setCtaCode(newCtas[0])
    setTitle(`Dùng cho ${DESTINATION_INFO[dest]?.label ?? dest}`)
  }

  const handleSubmitClick = (e: React.FormEvent) => {
    e.preventDefault()
    if (channelId === "WEB_LINK" || channelId === "QR_CODE") {
      setShowConfirm(true)
    } else {
      void executeSubmit()
    }
  }

  const executeSubmit = async () => {
    await onSubmit({
      destination,
      ctaCode,
      title,
      channelId,
      targetPath: channelId === "WEB_LINK" || channelId === "QR_CODE" ? targetPath : undefined,
    })
  }

  return (
    <form onSubmit={handleSubmitClick} className="space-y-4">
      {/* 1. Chọn nơi dùng */}
      <div>
        <label className="text-body-sm font-bold text-text block mb-1.5">
          1. Chọn mục tiêu sử dụng
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {allowedDestinations.map((dest) => {
            const info = DESTINATION_INFO[dest] ?? { label: dest, desc: "" }
            const isSelected = destination === dest
            return (
              <Button variant="outline"
                type="button"
                key={dest}
                onClick={() => handleDestinationChange(dest)}
                className={`text-[length:inherit] h-auto justify-start font-[inherit] gap-0 rounded-2xl p-3 text-left cursor-pointer transition-all border bg-surface hover:bg-surface ${
                  isSelected
                    ? "border-primary bg-selected ring-1 ring-primary hover:bg-selected"
                    : "border-border hover:border-text-muted/40"
                }`}
              >
                <div className="font-bold text-body-sm text-text">{info.label}</div>
                <div className="text-caption text-text-muted mt-0.5 line-clamp-2">{info.desc}</div>
              </Button>
            )
          })}
        </div>
      </div>

      {/* 2. Chọn CTA */}
      <div>
        <label className="text-body-sm font-bold text-text block mb-1.5">
          2. Lời kêu gọi hành động (CTA)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {availableCtas.map((cta) => {
            const def = getCtaDefinition(cta)
            const isSelected = ctaCode === cta
            return (
              <Button variant="outline"
                type="button"
                key={cta}
                onClick={() => setCtaCode(cta)}
                className={`h-auto justify-start gap-0 p-2 rounded-xl text-left border text-caption cursor-pointer transition-all ${
                  isSelected
                    ? "border-primary bg-selected font-bold text-primary hover:bg-selected"
                    : "border-border text-text hover:bg-surface-alt"
                }`}
              >
                <div>{def?.label ?? cta}</div>
              </Button>
            )
          })}
        </div>
      </div>

      {/* 3. Kênh phân phối */}
      <div>
        <label className="text-body-sm font-bold text-text block mb-1.5">
          3. Kênh phân phối
        </label>
        <NativeSelect
          value={channelId}
          onChange={(e) => setChannelId(e.target.value)}
          className="w-full"
        >
          {USAGE_CHANNELS.map((ch) => (
            <option key={ch.id} value={ch.id}>
              {ch.name} ({ch.automationLevel === "AUTOMATED" ? "Tự động" : "Thủ công"})
            </option>
          ))}
        </NativeSelect>
      </div>

      {/* 4. Cấu hình chi tiết */}
      <div className="space-y-3 pt-2 border-t border-border/60">
        <div>
          <label htmlFor={titleInputId} className="text-body-sm font-bold text-text block mb-1">
            Tên nơi dùng (để gợi nhớ)
          </label>
          <Input
            id={titleInputId}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full text-body-sm"
          />
        </div>

        {(channelId === "WEB_LINK" || channelId === "QR_CODE") && (
          <div>
            <label htmlFor={targetPathInputId} className="text-body-sm font-bold text-text block mb-1">
              Đường dẫn trang đích
            </label>
            <Input
              id={targetPathInputId}
              value={targetPath}
              onChange={(e) => setTargetPath(e.target.value)}
              placeholder="/c hoặc /s"
              required
              className="w-full text-body-sm"
            />
            <p className="mt-1 text-caption text-text-muted">
              Đường dẫn khách hàng sẽ truy cập sau khi bấm link hoặc quét mã QR.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          Đóng
        </Button>
        <Button type="submit" variant="primary" disabled={isSubmitting}>
          {isSubmitting ? "Đang tạo..." : "Xác nhận tạo nơi dùng"}
        </Button>
      </div>

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        onConfirm={executeSubmit}
        title="Tạo liên kết công khai?"
        consequence={`Hệ thống sẽ sinh đường dẫn rút gọn có gắn mã UTM để theo dõi lượt truy cập và lead quy thuộc cho "${assetTitle}".`}
        confirmLabel="Tạo liên kết"
        cancelLabel="Kiểm tra lại"
      />
    </form>
  )
}

