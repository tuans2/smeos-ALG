/** Gọi API cho các trang chủ theo vai vận hành (Thợ cắm, Shipper, Kế toán) — checklist ALG 1.12. */

export class NotSignedIn extends Error {}

async function messageOf(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: { message?: string } }
    return body.error?.message ?? `Không thực hiện được (${res.status})`
  } catch {
    return `Không thực hiện được (${res.status})`
  }
}

/** `null` khi tài khoản không có quyền xem (403) — màn ẩn phần đó thay vì báo lỗi. */
export async function getJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url)
  if (res.status === 401) throw new NotSignedIn()
  if (res.status === 403) return null
  if (!res.ok) throw new Error(await messageOf(res))
  return (await res.json()) as T
}

export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  if (res.status === 401) throw new NotSignedIn()
  if (!res.ok) throw new Error(await messageOf(res))
  return (await res.json()) as T
}

/** Địa chỉ giao dạng một dòng, từ địa chỉ có cấu trúc hoặc chuỗi. */
export function addressLine(addr: unknown): string {
  if (typeof addr === "string") return addr
  if (!addr || typeof addr !== "object") return ""
  const a = addr as Record<string, unknown>
  if (typeof a.formattedAddress === "string" && a.formattedAddress) return a.formattedAddress
  return [a.street, a.ward, a.district, a.city ?? a.province].filter((v) => typeof v === "string" && v).join(", ")
}
