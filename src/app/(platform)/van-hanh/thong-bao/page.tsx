"use client"

import { useI18n } from "@/lib/i18n"
import { MotherNotificationMatrixClient } from "@/components/notification/mother-notification-matrix-client"


export default function MotherNotificationMatrixPage() {
  const { t } = useI18n()
  return <MotherNotificationMatrixClient />
}
