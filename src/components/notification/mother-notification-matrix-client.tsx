/**
 * MOTHER NOTIFICATION MATRIX — Trang quản lý thông báo tầng Nền tảng
 *
 * Admin nền tảng (SaaS Mother) quản lý:
 * - Toàn bộ events của tất cả 4 tầng
 * - Kênh liên lạc: đăng ký nhà cung cấp một lần + bật/tắt kênh toàn hệ thống (4.30)
 * - Hard Lock cấp cao nhất — không tầng nào ghi đè được
 * - Visibility: event nào hiện ở tầng nào
 */
"use client"

import { ChannelProvidersPanel } from "@/components/notification/channel-providers-panel"
import { NotificationMatrixPage } from "@/components/notification/notification-matrix-page"
import { useNotificationMatrix } from "@/components/notification/use-notification-matrix"
import { useI18n } from "@/lib/i18n"

export function MotherNotificationMatrixClient() {
  const { t } = useI18n()
  const {
    sections,
    activeChannels,
    loading,
    toggleCell,
    toggleHardLock,
    removeHardLock,
  } = useNotificationMatrix({
    viewerTier: "MOTHER",
    scopeId: "GLOBAL",
  })

  return (
    <NotificationMatrixPage
      viewerTier="MOTHER"
      title="Ma Trận Thông Báo — Nền Tảng"
      description="Quản lý toàn bộ sự kiện thông báo, kênh gửi, khóa cứng và phân phối hiển thị cho tất cả các tầng trong hệ thống."
      scopeId="GLOBAL"
      activeChannels={activeChannels}
      sections={sections}
      canManageHardLocks={true}
      onToggleCell={toggleCell}
      onToggleHardLock={toggleHardLock}
      onRemoveHardLock={removeHardLock}
      loading={loading}
      beforeMatrix={<ChannelProvidersPanel />}
    />
  )
}
