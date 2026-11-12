import "@/lib/brand-storage-migration"
/**
 * Thông tin người đặt lưu trên chính máy khách cho lần đặt sau (ALG 5.15) — chỉ khi khách
 * tích đồng ý; bỏ tích là xoá. Không gửi lên máy chủ. Giữ tối đa 180 ngày.
 */
const KEY = "alg:buyer"
const TTL_MS = 180 * 86_400_000

export interface SavedBuyer {
  customerName: string
  customerPhone: string
  customerEmail: string
}

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">

function store(): Store | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage
  } catch {
    return null
  }
}

export function readSavedBuyer(s: Store | null = store(), now = Date.now()): SavedBuyer | null {
  try {
    const raw = s?.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { at?: number; value?: Partial<SavedBuyer> }
    if (typeof parsed.at !== "number" || now - parsed.at > TTL_MS || !parsed.value) {
      s?.removeItem(KEY)
      return null
    }
    const v = parsed.value
    const buyer = { customerName: String(v.customerName ?? ""), customerPhone: String(v.customerPhone ?? ""), customerEmail: String(v.customerEmail ?? "") }
    return buyer.customerName || buyer.customerPhone ? buyer : null
  } catch {
    return null
  }
}

/** Đồng ý → lưu (ghi đè); không đồng ý → xoá bản đã lưu trước đó. */
export function rememberBuyer(consent: boolean, buyer: SavedBuyer, s: Store | null = store(), now = Date.now()): void {
  try {
    if (!consent) s?.removeItem(KEY)
    else s?.setItem(KEY, JSON.stringify({ at: now, value: { customerName: buyer.customerName.trim(), customerPhone: buyer.customerPhone.trim(), customerEmail: buyer.customerEmail.trim() } }))
  } catch {
    // bộ nhớ trình duyệt bị chặn — bỏ qua
  }
}
