"use client"

import * as React from "react"
import { useApi } from "@/components/greeting-card/greeting-api"
import { BellRing } from "@/components/ui/icon-set/bell-ring"
import { Switch } from "@/components/ui/switch"
import { currentEndpoint, currentPushSupport, disablePush, enablePush, PUSH_STATUS_URL, type PushStatusView } from "./push-subscription-client"

/**
 * Mục "Thông báo trên thiết bị này" trong menu tài khoản (checklist 4.30). Chỉ hiện khi tầng Mẹ đã bật kênh
 * Web Push và trình duyệt hỗ trợ; trình duyệt đang chặn thông báo thì nói rõ cách mở lại.
 */
export function PushOptInItem() {
  const [endpoint, setEndpoint] = React.useState<string | null | undefined>(undefined)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const support = currentPushSupport()

  React.useEffect(() => {
    let alive = true
    currentEndpoint()
      .then((e) => alive && setEndpoint(e))
      .catch(() => alive && setEndpoint(null))
    return () => {
      alive = false
    }
  }, [])

  const statusUrl = endpoint === undefined ? null : `${PUSH_STATUS_URL}${endpoint ? `?endpoint=${encodeURIComponent(endpoint)}` : ""}`
  const { data, mutate } = useApi<{ data: PushStatusView }>(statusUrl)
  const status = data?.data
  if (support === "unsupported" || !status?.available || !status.public_key) return null

  const on = Boolean(endpoint && status.subscribed)
  async function toggle(next: boolean) {
    setBusy(true)
    setError(null)
    try {
      if (next) await enablePush(status!.public_key!)
      else await disablePush()
      setEndpoint(await currentEndpoint())
      await mutate()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thao tác không thành công")
    } finally {
      setBusy(false)
    }
  }

  const id = "push-opt-in-switch"
  return (
    <div className="flex flex-col gap-1 border-b border-border px-3.5 py-2.5">
      <label htmlFor={id} className="flex min-h-11 items-center gap-2 text-body-sm font-semibold text-text">
        <BellRing size={16} strokeWidth={1.8} aria-hidden="true" />
        <span className="flex-1">Thông báo trên thiết bị này</span>
        <Switch id={id} checked={on} disabled={busy || support === "denied"} onCheckedChange={(c) => void toggle(c)} />
      </label>
      {support === "denied" && <p className="text-caption text-text-muted">Trình duyệt đang chặn thông báo. Mở cài đặt trang web để cho phép rồi bật lại.</p>}
      {error && (
        <p role="alert" className="text-caption text-danger-text">
          {error}
        </p>
      )}
    </div>
  )
}
