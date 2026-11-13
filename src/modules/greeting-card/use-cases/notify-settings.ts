import type { TenantContext } from "@/core/tenancy"
import { unprocessable, validationFailed } from "@/core/http/errors"
import { openSecret, sealSecret } from "@/core/security/secret-box"
import { GreetingNotificationRepository, getGreetingNotificationRepository } from "../infra/greeting-notification-repository"
import { NOTIFY_EVENTS, toInternationalPhone, smsText, type NotifyChannel, type NotifyParams } from "../domain/customer-notifications"
import { sendZnsMessage, type FetchLike, type ZnsCredentials } from "../adapters/zalo-zns-adapter"
import { sendEsmsMessage, type EsmsCredentials } from "../adapters/esms-adapter"
import { NOTIFY_SECRET_PURPOSE } from "./notify-customer"

export interface NotifySettingsInput {
  enabled: boolean
  channel: NotifyChannel
  /** Chỉ gửi khi nhập mới/đổi — bỏ trống giữ thông tin đã lưu (không bao giờ đọc ngược ra được). */
  credentials?: ZnsInput | EsmsCredentials | undefined
  templates?: Partial<Record<(typeof NOTIFY_EVENTS)[number], string>> | undefined
}

interface ZnsInput {
  appId: string
  secretKey: string
  accessToken: string
  refreshToken: string
}

function isZns(c: ZnsInput | EsmsCredentials): c is ZnsInput {
  return "appId" in c
}

export async function updateNotifySettings(
  ctx: TenantContext,
  input: NotifySettingsInput,
  repo = getGreetingNotificationRepository()
) {
  const current = await repo.getChannelConfig(ctx.organizationId)
  let sealed: string | undefined
  if (input.credentials) {
    if ((input.channel === "ZNS") !== isZns(input.credentials)) {
      throw validationFailed({ credentials: "Thông tin đăng nhập không khớp kênh đã chọn" })
    }
    const stored: ZnsCredentials | EsmsCredentials = isZns(input.credentials)
      ? { ...input.credentials, accessTokenExpiresAt: null }
      : input.credentials
    sealed = sealSecret(JSON.stringify(stored), NOTIFY_SECRET_PURPOSE)
  } else if (input.enabled && (!current?.notify_config_encrypted || current.notify_channel !== input.channel)) {
    throw validationFailed({ credentials: "Cần nhập thông tin kết nối cho kênh này trước khi bật" })
  }

  const templates: Record<string, string> = {}
  for (const event of NOTIFY_EVENTS) {
    const id = input.templates?.[event]?.trim()
    if (id) templates[event] = id
  }
  if (input.enabled && input.channel === "ZNS" && Object.keys(templates).length === 0) {
    throw validationFailed({ templates: "Zalo ZNS cần ít nhất một mã mẫu tin đã được duyệt" })
  }

  await repo.updateSettings(ctx, { enabled: input.enabled, channel: input.channel, templates, sealedCredentials: sealed })
  return { enabled: input.enabled, channel: input.channel, templates }
}

/** Gửi một tin thử tới SĐT do người cấu hình nhập — kiểm tra thông tin kết nối ngay. */
export async function sendTestNotification(
  ctx: TenantContext,
  rawPhone: string,
  repo = getGreetingNotificationRepository(),
  fetchImpl: FetchLike = fetch
) {
  const phone = toInternationalPhone(rawPhone)
  if (!phone) throw validationFailed({ phone: "Số điện thoại không hợp lệ" })
  const config = await repo.getChannelConfig(ctx.organizationId)
  if (!config?.notify_channel || !config.notify_config_encrypted) throw unprocessable("Chưa cấu hình kênh thông báo")
  const creds = JSON.parse(openSecret(config.notify_config_encrypted, NOTIFY_SECRET_PURPOSE)) as unknown
  const params: NotifyParams = {
    order_code: "DH000000-THUNGHIEM",
    customer_name: "Khách thử nghiệm",
    shop_name: "Tin thử ALG",
    status: "Tin thử nghiệm",
    amount: "0 đ",
    tracking_url: "",
  }
  try {
    if (config.notify_channel === "ZNS") {
      const templates = (config.notify_templates as Record<string, string> | null) ?? {}
      const templateId = Object.values(templates)[0]
      if (!templateId) throw unprocessable("Chưa có mã mẫu ZNS để gửi thử")
      const r = await sendZnsMessage({ creds: creds as ZnsCredentials, templateId, phone, params, trackingId: `test-${Date.now()}` }, fetchImpl)
      if (r.updatedCredentials) {
        await repo.saveSealedCredentials(ctx.organizationId, sealSecret(JSON.stringify(r.updatedCredentials), NOTIFY_SECRET_PURPOSE))
      }
    } else {
      await sendEsmsMessage(
        { creds: creds as EsmsCredentials, phone, content: smsText("PAYMENT_COMPLETED", params), requestId: `test-${Date.now()}` },
        fetchImpl
      )
    }
  } catch (error) {
    throw unprocessable(error instanceof Error ? error.message : "Gửi thử thất bại")
  }
  return { sent: true }
}
