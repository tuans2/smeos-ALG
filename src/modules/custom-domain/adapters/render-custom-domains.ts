/**
 * Gắn/gỡ tên miền riêng trên dịch vụ web Render (checklist ALG 10.8, PO Q11). Render tự cấp chứng chỉ HTTPS
 * cho tên miền đã gắn khi CNAME trỏ đúng. Chưa có `RENDER_API_KEY`/`RENDER_SERVICE_ID` → `manual`: cửa hàng
 * vẫn xác minh được, đội vận hành thêm tên miền tay (runbook §13). Mỗi lệnh một lần gọi, có hạn chờ — không
 * thử lại vòng lặp. Không ghi khoá API ra log hay lỗi trả về.
 */

export type RenderDomainResult = "requested" | "removed" | "manual" | "failed"

export interface RenderDomainsClient {
  attach(hostname: string): Promise<RenderDomainResult>
  detach(hostname: string): Promise<RenderDomainResult>
}

const API = "https://api.render.com/v1"
const TIMEOUT_MS = 10_000

interface Options {
  fetch?: typeof globalThis.fetch
  env?: Partial<Record<"RENDER_API_KEY" | "RENDER_SERVICE_ID", string | undefined>>
}

export function createRenderDomainsClient(opts: Options = {}): RenderDomainsClient {
  const doFetch = opts.fetch ?? globalThis.fetch
  const env = opts.env ?? process.env
  const key = env.RENDER_API_KEY?.trim()
  const service = env.RENDER_SERVICE_ID?.trim()

  async function call(method: "POST" | "DELETE", path: string, body?: unknown): Promise<Response | null> {
    try {
      return await doFetch(`${API}/services/${encodeURIComponent(service!)}${path}`, {
        method,
        headers: { Authorization: `Bearer ${key}`, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
    } catch {
      return null
    }
  }

  return {
    async attach(hostname) {
      if (!key || !service) return "manual"
      const res = await call("POST", "/custom-domains", { name: hostname })
      if (!res) return "failed"
      // 409: tên miền đã gắn vào dịch vụ từ trước — coi như đã gửi
      return res.ok || res.status === 409 ? "requested" : "failed"
    },
    async detach(hostname) {
      if (!key || !service) return "manual"
      const res = await call("DELETE", `/custom-domains/${encodeURIComponent(hostname)}`)
      if (!res) return "failed"
      return res.ok || res.status === 404 ? "removed" : "failed"
    },
  }
}
