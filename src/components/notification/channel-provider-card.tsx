"use client"

import * as React from "react"
import { apiSend } from "@/components/greeting-card/greeting-api"
import { Button } from "@/components/ui/button"
import { Disclosure } from "@/components/ui/disclosure"
import { FormField, FormLabel } from "@/components/ui/form-field"
import { InlineError } from "@/components/ui/inline-error"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useConfirmDialog } from "@/components/ui/confirm-dialog"
import { cn } from "@/lib/utils"
import {
  CHANNEL_NAMES,
  CHANNELS_URL,
  PROVIDER_TEST_URL,
  PROVIDERS_URL,
  canActivate,
  channelStatus,
  providerSaveBody,
  type ChannelProviderStateView,
  type ProviderDefinitionView,
} from "./channel-providers-api"

const TONE_CLASS = {
  success: "bg-success-bg text-success-text",
  warning: "bg-warning-bg text-warning-text",
  neutral: "bg-surface-alt text-text-muted",
} as const

interface ChannelProviderCardProps {
  state: ChannelProviderStateView
  definition: ProviderDefinitionView | undefined
  onChanged: () => Promise<unknown>
}

/** Một kênh: trạng thái + bật/tắt luôn thấy (L0); thông số nhà cung cấp và gửi thử nằm trong Disclosure. */
export function ChannelProviderCard({ state, definition, onChanged }: ChannelProviderCardProps) {
  const name = CHANNEL_NAMES[state.channel]
  const status = channelStatus(state)
  const [form, setForm] = React.useState<Record<string, string>>(() => ({ ...state.values }))
  const [busy, setBusy] = React.useState<"save" | "toggle" | "test" | "remove" | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [notice, setNotice] = React.useState<string | null>(null)
  const [testPhone, setTestPhone] = React.useState("")
  // Web Push gửi thử tới thiết bị chính người vận hành đã bật nhận tin (menu tài khoản), không cần số điện thoại
  const isPush = state.channel === "PUSH"
  const [confirm, confirmElement] = useConfirmDialog()

  async function run(kind: NonNullable<typeof busy>, action: () => Promise<string | null>) {
    setBusy(kind)
    setError(null)
    setNotice(null)
    try {
      setNotice(await action())
      await onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thao tác không thành công")
    } finally {
      setBusy(null)
    }
  }

  const toggle = (activated: boolean) =>
    run("toggle", async () => {
      await apiSend(CHANNELS_URL, "PATCH", { channel: state.channel, activated })
      return activated ? `Đã bật ${name} cho cả hệ thống` : `Đã tắt ${name}`
    })

  const save = () =>
    run("save", async () => {
      if (!definition) return null
      await apiSend(PROVIDERS_URL, "PUT", providerSaveBody(state.channel, definition, form), "Chưa lưu được thông số")
      // Khoá vừa nhập không giữ lại trên trình duyệt sau khi lưu
      setForm((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => !definition.fields.some((f) => f.secret && f.name === key))))
      return "Đã lưu thông số nhà cung cấp"
    })

  const sendTest = () =>
    run("test", async () => {
      const body = isPush ? { channel: state.channel } : { channel: state.channel, phone: testPhone }
      const res = await apiSend<{ data: { success: boolean; error?: string } }>(PROVIDER_TEST_URL, "POST", body)
      if (res.data.success) return isPush ? "Đã gửi tin thử tới thiết bị của bạn" : `Đã gửi tin thử tới ${testPhone}`
      throw new Error(res.data.error === "NOT_CONFIGURED" ? "Kênh chưa kết nối đủ thông số" : `Gửi thử thất bại: ${res.data.error ?? "không rõ lý do"}`)
    })

  async function remove() {
    const ok = await confirm({
      title: `Gỡ kết nối ${name}?`,
      consequence: "Khoá nhà cung cấp bị xoá khỏi hệ thống. Mọi cửa hàng ngừng nhận tin qua kênh này cho tới khi kết nối lại.",
      confirmLabel: "Gỡ kết nối",
      tone: "danger",
    })
    if (!ok) return
    await run("remove", async () => {
      if (state.activated) await apiSend(CHANNELS_URL, "PATCH", { channel: state.channel, activated: false })
      await apiSend(PROVIDERS_URL, "PUT", { channel: state.channel, provider: null, values: {} })
      setForm({})
      return `Đã gỡ kết nối ${name}`
    })
  }

  const switchId = `channel-${state.channel}-active`
  return (
    <article className="flex flex-col gap-4 rounded-2xl bg-surface p-5 shadow-sm sm:p-6" aria-label={name}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="text-title-sm font-semibold text-text">{name}</h3>
          <span className={cn("w-fit rounded-full px-2.5 py-0.5 text-caption font-semibold", TONE_CLASS[status.tone])}>{status.label}</span>
        </div>
        <label htmlFor={switchId} className="flex min-h-11 items-center gap-3 text-body-sm font-medium text-text">
          Dùng cho cả hệ thống
          <Switch
            id={switchId}
            checked={state.activated}
            disabled={busy !== null || !canActivate(state)}
            onCheckedChange={(checked) => void toggle(checked)}
          />
        </label>
      </div>
      {!canActivate(state) && (
        <p className="text-body-sm text-text-muted">
          {state.ready ? "Cần nhập đủ thông số nhà cung cấp trước khi bật." : state.pending ?? "Kênh này chưa gửi được."}
        </p>
      )}
      {error && <InlineError message={error} />}
      {notice && (
        <p role="status" className="text-body-sm font-medium text-success-text">
          {notice}
        </p>
      )}
      {definition && (
        <Disclosure label={`Thông số ${definition.label}`} appliedSummary={state.configured ? "Đã nhập đủ" : undefined}>
          <form
            className="grid gap-4 p-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault()
              void save()
            }}
          >
            {definition.fields.map((f) => (
              <FormField key={f.name} required={f.required}>
                <FormLabel>{f.label}</FormLabel>
                <Input
                  type={f.secret ? "password" : "text"}
                  autoComplete="off"
                  value={form[f.name] ?? ""}
                  placeholder={f.secret && state.secretsSet[f.name] ? "Đã lưu, bỏ trống để giữ" : undefined}
                  onChange={(e) => setForm((prev) => ({ ...prev, [f.name]: e.target.value }))}
                />
              </FormField>
            ))}
            <div className="flex flex-wrap gap-3 sm:col-span-2">
              <Button type="submit" variant="secondary" size="sm" disabled={busy !== null}>
                {busy === "save" ? "Đang lưu…" : "Lưu thông số"}
              </Button>
              {state.provider && (
                <Button type="button" variant="ghost" size="sm" disabled={busy !== null} onClick={() => void remove()}>
                  Gỡ kết nối
                </Button>
              )}
            </div>
          </form>
          {state.configured && state.ready && (
            <div className="flex flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-end">
              {isPush ? (
                <p className="flex-1 text-body-sm text-text-muted">Tin thử gửi tới thiết bị bạn đã bật nhận tin ở menu tài khoản.</p>
              ) : (
                <FormField className="flex-1 sm:max-w-xs">
                  <FormLabel>Số điện thoại nhận tin thử</FormLabel>
                  <Input type="tel" inputMode="tel" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} />
                </FormField>
              )}
              <Button type="button" variant="outline" size="sm" disabled={busy !== null || (!isPush && testPhone.trim().length < 8)} onClick={() => void sendTest()}>
                {busy === "test" ? "Đang gửi…" : "Gửi thử"}
              </Button>
            </div>
          )}
        </Disclosure>
      )}
      {confirmElement}
    </article>
  )
}
