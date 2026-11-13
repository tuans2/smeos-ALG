"use client"

import { Button } from "@/components/ui/button"
import React, { useCallback, useEffect, useState } from "react"
import { Dialog } from "@/components/ui/dialog"
import type { UsageDestination } from "@/modules/marketing-center/domain/asset-type"
import type { AssetUsage } from "@/modules/marketing-center/domain/asset-usage"
import { getAssetTypeByCode } from "@/modules/marketing-center/domain/asset-types"
import { UseAssetForm, type UseAssetFormSubmitData } from "./use-asset-form"
import { UseAssetList } from "./use-asset-list"

export interface UseAssetSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sourceType: string
  sourceId: string
  assetTypeCode: string
  assetTitle: string
}

export function UseAssetSheet({
  open,
  onOpenChange,
  sourceType,
  sourceId,
  assetTypeCode,
  assetTitle,
}: UseAssetSheetProps) {
  const [activeTab, setActiveTab] = useState<"NEW" | "LIST">("NEW")
  const [usages, setUsages] = useState<AssetUsage[]>([])
  const [loading, setLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const assetDef = getAssetTypeByCode(assetTypeCode)
  const allowedDestinations: readonly UsageDestination[] = assetDef?.destinations ?? ["PROMOTION", "SALES"]

  const loadUsages = useCallback(async () => {
    if (!sourceType || !sourceId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/v1/asset-usages?source_type=${sourceType}&source_id=${sourceId}`)
      if (res.ok) {
        const json = await res.json()
        setUsages(json.data ?? [])
      }
    } catch {
      // Bỏ qua lỗi mạng nền
    } finally {
      setLoading(false)
    }
  }, [sourceType, sourceId])

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- tải dữ liệu từ API khi mount/đổi tham số; setState nằm trong hàm tải (nợ #149)
      void loadUsages()
    }
  }, [open, loadUsages])

  const handleCreateUsage = async (data: UseAssetFormSubmitData) => {
    setIsSubmitting(true)
    setStatusMessage(null)
    try {
      const res = await fetch("/api/v1/asset-usages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_type: sourceType,
          source_id: sourceId,
          asset_type_code: assetTypeCode,
          destination: data.destination,
          cta_code: data.ctaCode,
          title: data.title,
          channel_id: data.channelId,
          target_path: data.targetPath,
        }),
      })

      if (!res.ok) {
        throw new Error("Không thể tạo nơi dùng")
      }

      setStatusMessage("Đã tạo nơi dùng thành công!")
      await loadUsages()
      setActiveTab("LIST")
    } catch {
      setStatusMessage("Có lỗi xảy ra khi tạo nơi dùng. Vui lòng thử lại.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleStatus = async (id: string, newStatus: "ACTIVE" | "PAUSED") => {
    try {
      const res = await fetch(`/api/v1/asset-usages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        await loadUsages()
      }
    } catch {
      // Bỏ qua lỗi
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Dùng ở đâu? (Asset Usage)"
      description={`Cấu hình nơi sử dụng và theo dõi hiệu quả cho: "${assetTitle}"`}
      size="lg"
    >
      {/* Tab Switcher */}
      <div className="flex border-b border-border mb-4">
        <Button variant="ghost"
          type="button"
          onClick={() => setActiveTab("NEW")}
          className={`h-auto gap-0 px-4 py-2 text-body-sm font-semibold border-b-2 cursor-pointer transition-colors ${
            activeTab === "NEW"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          Tạo nơi dùng mới
        </Button>
        <Button variant="ghost"
          type="button"
          onClick={() => setActiveTab("LIST")}
          className={`h-auto gap-0 px-4 py-2 text-body-sm font-semibold border-b-2 cursor-pointer transition-colors ${
            activeTab === "LIST"
              ? "border-primary text-primary"
              : "border-transparent text-text-muted hover:text-text"
          }`}
        >
          Nơi dùng đã tạo ({usages.length})
        </Button>
      </div>

      {statusMessage && (
        <div className="mb-4 p-3 rounded-xl bg-selected border border-primary/20 text-caption font-semibold text-primary">
          {statusMessage}
        </div>
      )}

      {activeTab === "NEW" ? (
        <UseAssetForm
          assetTitle={assetTitle}
          assetTypeCode={assetTypeCode}
          allowedDestinations={allowedDestinations}
          onSubmit={handleCreateUsage}
          onCancel={() => onOpenChange(false)}
          isSubmitting={isSubmitting}
        />
      ) : loading ? (
        <div className="py-8 text-center text-text-muted text-body-sm">Đang tải danh sách nơi dùng...</div>
      ) : (
        <UseAssetList
          usages={usages}
          onToggleStatus={handleToggleStatus}
        />
      )}
    </Dialog>
  )
}

