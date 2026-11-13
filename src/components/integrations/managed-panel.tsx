"use client"

import dynamic from "next/dynamic"
import { Dialog } from "@/components/ui/dialog"
import { SkeletonBlock } from "@/components/ui/skeleton"
import type { ManagedPanelKey } from "@/modules/integration-hub/domain/connector-manifest"
import type { CatalogItem } from "@/modules/integration-hub/use-cases/get-integration-hub"

const loading = () => <SkeletonBlock lines={4} label="Đang tải cấu hình" />

/** Mỗi panel là màn cấu hình sẵn có của phân hệ, tải khi mở để trang Tích hợp nhẹ. */
const PANELS: Record<ManagedPanelKey, React.ComponentType> = {
  chat_channels: dynamic(() => import("@/components/chat/chat-channels-panel").then((m) => m.ChatChannelsPanel), { loading }),
  bank_sync: dynamic(
    () => import("@/components/greeting-card/admin/brochure-bank-sync-settings").then((m) => m.BrochureBankSyncSettings),
    { loading }
  ),
  customer_notify: dynamic(
    () => import("@/components/greeting-card/admin/brochure-notify-settings").then((m) => m.BrochureNotifySettings),
    { loading }
  ),
  staff_telegram: dynamic(
    () => import("@/components/greeting-card/admin/telegram-dispatch-connector").then((m) => m.TelegramDispatchConnector),
    { loading }
  ),
  api_tokens: dynamic(() => import("./api-tokens-panel").then((m) => m.ApiTokensPanel), { loading }),
}

interface ManagedPanelDialogProps {
  item: CatalogItem | null
  onClose: () => void
}

/** Quản lý một tích hợp chạy bằng phân hệ sẵn có ngay trong Trung tâm Tích hợp. */
export function ManagedPanelDialog({ item, onClose }: ManagedPanelDialogProps) {
  const Panel = item?.panel ? PANELS[item.panel] : null
  return (
    <Dialog open={Panel !== null} onOpenChange={(open) => !open && onClose()} title={item?.label ?? ""} description={item?.description} size="lg">
      {Panel && <Panel />}
    </Dialog>
  )
}
