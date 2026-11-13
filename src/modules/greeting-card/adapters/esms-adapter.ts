import { withCircuitBreaker } from "@/core/http/circuit-breaker"
import type { FetchLike } from "./zalo-zns-adapter"

/**
 * eSMS.vn — SMS brandname chăm sóc khách hàng (SmsType 2).
 * Tài liệu: https://developers.esms.vn
 */

export interface EsmsCredentials {
  apiKey: string
  secretKey: string
  brandname: string
}

const SEND_URL = "https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/"

export async function sendEsmsMessage(
  input: { creds: EsmsCredentials; phone: string; content: string; requestId: string },
  fetchImpl: FetchLike = fetch
): Promise<{ messageId: string | null }> {
  return withCircuitBreaker("esms", async (signal) => {
    const res = await fetchImpl(SEND_URL, {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ApiKey: input.creds.apiKey,
        SecretKey: input.creds.secretKey,
        Brandname: input.creds.brandname,
        Phone: input.phone,
        Content: input.content,
        SmsType: "2",
        IsUnicode: "0",
        RequestId: input.requestId,
      }),
    })
    const json = (await res.json().catch(() => ({}))) as { CodeResult?: string; SMSID?: string; ErrorMessage?: string }
    if (json.CodeResult !== "100") throw new Error(`eSMS từ chối (${json.CodeResult ?? res.status}): ${json.ErrorMessage ?? "không rõ lý do"}`)
    return { messageId: json.SMSID ?? null }
  })
}
