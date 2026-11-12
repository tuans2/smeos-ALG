import React, { useEffect, useState } from "react"
import { Store } from "@/components/ui/icon-set/store"
import { Award } from "@/components/ui/icon-set/award"
import { User } from "@/components/ui/icon-set/user"
import { Trash2 } from "@/components/ui/icon-set/trash2"
import { Button } from "@/components/ui/button"
import { Dialog } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import type { PartnerStoreMarketplaceEntity } from "@/modules/platform/domain/partner-marketplace.types"
import Link from "next/link"
import { MarketplacePhotosTab } from "./marketplace-photos-tab"
import { MarketplaceOverviewTab } from "./marketplace-overview-tab"
import { MarketplaceCraftTab } from "./marketplace-craft-tab"
import { MarketplaceFacilityTab } from "./marketplace-facility-tab"
import { MarketplaceScoreTab } from "./marketplace-score-tab"

interface MarketplaceProfileModalProps {
  store: PartnerStoreMarketplaceEntity | null
  onClose: () => void
  /** Link chia sẻ công khai: ẩn nút dẫn vào console. */
  readOnly?: boolean
  /** Chỉ truyền khi người xem có quyền xoá (superadmin, `N18`). Trả câu lỗi hoặc null khi xoá xong. */
  onDelete?: (store: PartnerStoreMarketplaceEntity) => Promise<string | null>
}

export function MarketplaceProfileModal({ store, onClose, readOnly = false, onDelete }: MarketplaceProfileModalProps) {
  const [confirm, confirmDialog] = useConfirmDialog()
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  async function requestDelete() {
    if (!store || !onDelete) return
    setConfirming(true)
    const yes = await confirm({
      title: `Xoá hồ sơ ${store.identity.shopName}?`,
      consequence: "Hồ sơ biến mất khỏi chợ đối tác và mọi link chia sẻ, không khôi phục được. Muốn có lại phải nhập lại từ tệp hoặc Sheet.",
      confirmLabel: "Xoá hồ sơ",
      tone: "danger",
    })
    setConfirming(false)
    if (!yes) return
    setDeleteError(await onDelete(store))
  }
  const [activeTab, setActiveTab] = useState<"overview" | "craft" | "facility" | "photos" | "score">("overview")

  useEffect(() => {
    // Đang mở hộp xác nhận xoá: Esc chỉ đóng hộp xác nhận
    if (!store || confirming) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [store, onClose, confirming])

  if (!store) return null

  const { identity, contact, digital, business, production, facilityAndDelivery, scoreAndTier, audit, media } = store

  return (
    <Dialog
      open={!!store}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pr-8">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-surface border border-border text-primary shadow-inner">
              <Store className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-title font-bold tracking-tight">{identity.shopName}</span>
                <span className="rounded-full border border-warning-border bg-warning-bg px-2.5 py-0.5 text-caption font-bold text-warning-text">
                  {scoreAndTier.suggestedTier || "Hạng Tiêu Chuẩn"}
                </span>
              </div>
              <p className="text-caption text-text-muted mt-1 font-normal">
                Chủ cửa hàng: <span className="font-semibold">{identity.ownerName}</span> • Liên hệ: {identity.contactPerson} ({identity.scale})
              </p>
            </div>
          </div>

          {scoreAndTier.totalScore && (
            <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2 border border-border">
              <Award className="h-5 w-5 text-warning-text" />
              <div>
                <div className="text-caption uppercase font-bold text-text-muted">Tổng điểm</div>
                <div className="text-title-sm font-black text-text leading-none">{scoreAndTier.totalScore}</div>
              </div>
            </div>
          )}
        </div>
      }
      subHeader={
        <div className="flex flex-wrap border-b border-border text-caption font-semibold px-6 bg-surface">
          {[
            { key: "overview", label: "Tổng quan & Pháp lý" },
            { key: "craft", label: "Dòng sản phẩm & Tay nghề" },
            { key: "facility", label: "Cơ sở vật chất & Giao vận" },
            { key: "photos", label: `Ảnh khảo sát (${store.media.driveImageIds.length})` },
            { key: "score", label: "Bảng điểm & Đề xuất Hợp tác" },
          ].map((tab) => (
            <Button
              key={tab.key}
              variant="ghost"
              type="button"
              onClick={() => setActiveTab(tab.key as never)}
              className={cn(
                "rounded-none border-b-2 px-4 py-2.5 text-caption transition-all h-auto",
                activeTab === tab.key
                  ? "border-primary text-primary font-bold"
                  : "border-transparent text-text-muted hover:text-text"
              )}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      }
      size="lg"
      className="max-w-4xl"
      footer={
        <div className="flex w-full flex-col gap-2">
          {deleteError && (
            <p role="alert" className="rounded-lg border border-danger-border bg-danger-bg px-3 py-2 text-caption text-danger-text">
              {deleteError}
            </p>
          )}
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Đóng lại
              </Button>
              {!readOnly && onDelete && (
                <Button variant="danger" size="sm" className="gap-1.5" onClick={() => void requestDelete()}>
                  <Trash2 className="h-4 w-4" /> Xoá hồ sơ
                </Button>
              )}
            </div>

            {!readOnly && (
              <div className="flex items-center gap-2">
                <Link href={`/van-hanh/to-chuc` as never}>
                  <Button size="sm" className="font-semibold gap-1.5">
                    <User className="h-4 w-4" /> Quản trị tổ chức (Giai đoạn 2)
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      }
    >
      <div className="p-6 space-y-6 text-body-sm text-text">
        {activeTab === "overview" && (
          <MarketplaceOverviewTab
            identity={identity}
            contact={contact}
            digital={digital}
            business={business}
            media={media}
          />
        )}

        {activeTab === "craft" && (
          <MarketplaceCraftTab production={production} />
        )}

        {activeTab === "facility" && (
          <MarketplaceFacilityTab facility={facilityAndDelivery} />
        )}

        {activeTab === "photos" && (
          <MarketplacePhotosTab media={media} shopName={identity.shopName} />
        )}

        {activeTab === "score" && (
          <MarketplaceScoreTab
            scoreAndTier={scoreAndTier}
            audit={audit}
            business={business}
          />
        )}

        {/* Hộp xác nhận xoá nằm trong cây của hồ sơ — Dialog lồng nhau, bấm trong hộp xác nhận không đóng hồ sơ */}
        {confirmDialog}
      </div>
    </Dialog>
  )
}
