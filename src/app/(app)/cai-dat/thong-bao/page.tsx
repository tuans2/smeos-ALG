"use client"

import { TierNotificationMatrixClient } from "@/components/notification/tier-notification-matrix-client"
import { useSession } from "@/lib/session"
import { resolveNotificationViewerTier } from "@/components/notification/notification-viewer-tier"

export default function NotificationSettingsPage() {
  const { organizationType, organization, roleUx } = useSession()
  const viewerTier = resolveNotificationViewerTier(organizationType, roleUx)

  const tierName =
    viewerTier === "INDUSTRY"
      ? "Ngành Hàng"
      : viewerTier === "CHAIN"
      ? "Chuỗi Chi Nhánh"
      : "Cửa Hàng"

  return (
    <TierNotificationMatrixClient
      viewerTier={viewerTier}
      title={`Thông báo — ${tierName}`}
      description={`Thiết lập cơ chế nhận thông báo cho tài khoản và nhân sự trực thuộc ${organization?.name ?? tierName}. Bạn có thể bật/tắt từng kênh gửi và khoá cố định cho toàn cấp ${tierName}.`}
    />
  )
}
