"use client"

import React, { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SkeletonBlock } from "@/components/ui/skeleton"
import { ShieldCheck } from "@/components/ui/icon-set/shield-check"
import { Eye } from "@/components/ui/icon-set/eye"
import { RefreshCw } from "@/components/ui/icon-set/refresh-cw"
import { CheckCircle2 } from "@/components/ui/icon-set/check-circle2"
import { AlertCircle } from "@/components/ui/icon-set/alert-circle"
import { Sparkles } from "@/components/ui/icon-set/sparkles"
import type { ChainCollectionProfile, CollectionRule } from "@/modules/field-platform/domain/chain-collection-profile"
import type { FieldDefinitionV2 } from "@/modules/field-platform/domain/field-registry-v2"
import type { PreviewChainCollectionProfileResult } from "@/modules/field-platform/use-cases/preview-chain-collection-profile"
import { ChainCollectionRuleRow } from "./chain-collection-rule-row"
import { ChainCollectionPreviewModal } from "./chain-collection-preview-modal"

export function ChainCollectionProfileManager() {
  const [profile, setProfile] = useState<ChainCollectionProfile | null>(null)
  const [collectableFields, setCollectableFields] = useState<readonly FieldDefinitionV2[]>([])
  const [rules, setRules] = useState<CollectionRule[]>([])
  const [loading, setLoading] = useState(true)
  const [previewing, setPreviewing] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [previewData, setPreviewData] = useState<PreviewChainCollectionProfileResult | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null)

  const loadData = async () => {
    setLoading(true)
    setNotification(null)
    try {
      const res = await fetch("/api/v1/chain/collection-profile")
      if (!res.ok) throw new Error("Không thể tải cấu hình thu thập chuỗi.")
      const json = await res.json()
      const data = json.data as { profile: ChainCollectionProfile; collectableFields: FieldDefinitionV2[] }
      setProfile(data.profile)
      setCollectableFields(data.collectableFields)
      setRules([...data.profile.rules])
    } catch (err: unknown) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Đã có lỗi xảy ra",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void Promise.resolve().then(() => loadData())
  }, [])

  const handleUpdateRule = (updated: CollectionRule) => {
    setRules((prev) => prev.map((r) => (r.ruleId === updated.ruleId ? updated : r)))
  }

  const handlePreview = async () => {
    setPreviewing(true)
    setNotification(null)
    try {
      const res = await fetch("/api/v1/chain/collection-profile/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message || "Lỗi kiểm tra tác động")
      setPreviewData(json.data as PreviewChainCollectionProfileResult)
      setIsPreviewOpen(true)
    } catch (err: unknown) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Không thể xem trước tác động",
      })
    } finally {
      setPreviewing(false)
    }
  }

  const handlePublish = async () => {
    setPublishing(true)
    try {
      const res = await fetch("/api/v1/chain/collection-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error?.message || "Lỗi xuất bản profile")
      
      const newProfile = json.data as ChainCollectionProfile
      setProfile(newProfile)
      setRules([...newProfile.rules])
      setIsPreviewOpen(false)
      setNotification({
        type: "success",
        message: `Đã xuất bản thành công Danh mục thu thập chuỗi phiên bản v${newProfile.profileVersion}!`,
      })
    } catch (err: unknown) {
      setNotification({
        type: "error",
        message: err instanceof Error ? err.message : "Không thể xuất bản profile",
      })
    } finally {
      setPublishing(false)
    }
  }

  if (loading) {
    return <SkeletonBlock lines={6} />
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <Card className="p-5 border-border bg-surface">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-title-sm font-extrabold text-text">
                  Danh mục thu thập của chuỗi (Chain Collection Profile)
                </h2>
                {profile && (
                  <span className="px-2 py-0.5 rounded text-caption font-bold bg-primary/10 text-primary border border-primary/20">
                    v{profile.profileVersion}
                  </span>
                )}
              </div>
              <p className="text-caption text-text-muted mt-0.5">
                Quy định dữ liệu các cửa hàng thành viên chia sẻ lên chuỗi (§9.5.8 & Luật BV Dữ liệu cá nhân)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePreview}
              disabled={previewing}
              className="gap-1.5 font-bold"
            >
              <Eye size={14} />
              <span>{previewing ? "Đang tính toán…" : "Xem trước tác động (Preview)"}</span>
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handlePreview}
              className="gap-1.5 font-bold bg-primary text-white"
            >
              <Sparkles size={14} />
              <span>Lưu & Xuất bản</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-body-sm font-semibold ${
            notification.type === "success"
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-danger/10 border-danger/30 text-danger-text"
          }`}
        >
          {notification.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Rules List by Field */}
      <div className="space-y-3">
        <h3 className="text-body-sm font-bold text-text-muted uppercase tracking-wider">
          Danh sách trường dữ liệu khả dụng ({collectableFields.length} trường)
        </h3>
        
        <div className="space-y-2.5">
          {collectableFields.map((field) => {
            const rule = rules.find((r) => r.fieldKey === field.fieldKey) ?? {
              ruleId: `rule-${field.fieldKey}`,
              fieldKey: field.fieldKey,
              domainKey: field.domain,
              minForm: "NONE",
              maxForm: field.propagation.ceiling.toChain,
              scope: { type: "ALL_STORES" },
              mandatoryForNewStore: false,
              status: "ACTIVE",
            }

            return (
              <ChainCollectionRuleRow
                key={field.fieldKey}
                field={field}
                rule={rule}
                onChangeRule={handleUpdateRule}
              />
            )
          })}
        </div>
      </div>

      {/* Preview & Publish Dialog */}
      <ChainCollectionPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onConfirmPublish={handlePublish}
        previewData={previewData}
        isPublishing={publishing}
      />
    </div>
  )
}
