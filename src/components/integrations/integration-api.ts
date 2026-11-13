/** Gọi API Trung tâm Tích hợp từ trình duyệt; lỗi trả về thông điệp tiếng Việt của máy chủ. */

import type { IntegrationHubView } from "@/modules/integration-hub/use-cases/get-integration-hub"
import type { ConnectionView, EventView } from "@/modules/integration-hub/domain/integration-views"

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } })
  const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } } & T
  if (!res.ok) throw new Error(body.error?.message ?? "Không thực hiện được, vui lòng thử lại")
  return body
}

export const integrationApi = {
  hub: () => call<IntegrationHubView>("/api/v1/integrations"),
  connect: (connectorKey: string, secret: string) =>
    call<{ connection: ConnectionView }>("/api/v1/integrations/connections", {
      method: "POST",
      body: JSON.stringify({ connector_key: connectorKey, secret }),
    }),
  disconnect: (id: string) => call<{ ok: true }>(`/api/v1/integrations/connections/${id}`, { method: "DELETE" }),
  test: (id: string) => call<{ connection: ConnectionView }>(`/api/v1/integrations/connections/${id}/test`, { method: "POST" }),
  rotate: (id: string, secret: string) =>
    call<{ connection: ConnectionView }>(`/api/v1/integrations/connections/${id}/rotate`, {
      method: "POST",
      body: JSON.stringify({ secret }),
    }),
  events: (id: string) => call<{ events: EventView[] }>(`/api/v1/integrations/connections/${id}/events?limit=50`),
  replay: (eventId: string) => call<{ ok: true }>(`/api/v1/integrations/events/${eventId}/replay`, { method: "POST" }),
}
