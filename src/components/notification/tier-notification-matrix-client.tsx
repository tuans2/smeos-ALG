/**
 * TIER NOTIFICATION MATRIX CLIENT — Dùng chung cho Industry, Chain và Store
 *
 * Cho phép Admin từng tầng thiết lập:
 * - Bật / tắt nhận thông báo qua các kênh (App Inbox, Email, Push, Telegram...) cho tài khoản / chi nhánh
 * - Đặt Hard Lock tầng của mình (áp đặt xuống các tài khoản / đơn vị trực thuộc)
 * - Hiển thị trạng thái thừa kế và biểu tượng khóa nếu tầng trên đã khóa cứng
 */
"use client"

import { NotificationMatrixPage } from "@/components/notification/notification-matrix-page"
import { useNotificationMatrix } from "@/components/notification/use-notification-matrix"
import type { MatrixViewerTier } from "@/components/notification/notification-matrix-types"
import { useSession } from "@/lib/session"

interface TierNotificationMatrixClientProps {
  viewerTier: MatrixViewerTier
  title: string
  description: string
}

export function TierNotificationMatrixClient({
  viewerTier,
  title,
  description,
}: TierNotificationMatrixClientProps) {
  const { organization } = useSession()
  const scopeId = organization?.id ?? "CURRENT_ORG"

  const {
    sections,
    activeChannels,
    loading,
    error,
    toggleCell,
    toggleHardLock,
    removeHardLock,
  } = useNotificationMatrix({
    viewerTier,
    scopeId,
  })

  return (
    <NotificationMatrixPage
      viewerTier={viewerTier}
      title={title}
      description={description}
      scopeId={scopeId}
      activeChannels={activeChannels}
      sections={sections}
      canManageHardLocks={true}
      onToggleCell={toggleCell}
      onToggleHardLock={toggleHardLock}
      onRemoveHardLock={removeHardLock}
      loading={loading}
      error={error}
    />
  )
}
