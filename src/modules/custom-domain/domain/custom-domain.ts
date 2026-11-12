/**
 * Tên miền riêng của cửa hàng (checklist ALG 10.8, PO 06/11/2026). Pure TypeScript.
 *
 * Cửa hàng gắn tên miền (vd `hoa.tiemcuatoi.vn`), thêm bản ghi TXT có mã xác minh và bản ghi CNAME trỏ về
 * máy chủ của hệ thống. Xác minh xong (VERIFIED) thì tên miền mở được trang danh mục và Thẻ Chào của chính
 * cửa hàng; mọi đường dẫn khác, và dữ liệu của tổ chức khác, trả 404. Console nền tảng khoá được (LOCKED).
 */

export type CustomDomainStatus = "PENDING" | "VERIFIED" | "LOCKED"
export type CertificateStatus = "NOT_REQUESTED" | "REQUESTED" | "MANUAL" | "FAILED"

export const MAX_DOMAINS_PER_ORGANIZATION = 3
/** Tên bản ghi TXT đặt trước tên miền: `_alg-verify.<tên miền>` */
export const VERIFY_RECORD_PREFIX = "_alg-verify"
export const VERIFY_VALUE_PREFIX = "alg-verify="
/**
 * Tiền tố trước khi đổi tên sang ALG (12/11/2026). Tên miền đang chờ xác minh mà chủ tiệm đã thêm bản ghi cũ
 * vẫn xác minh được; tên miền đã xác minh không bao giờ bị kiểm lại nên không bị ảnh hưởng.
 */
export const LEGACY_VERIFY_RECORD_PREFIX = "_smeos-verify"
export const LEGACY_VERIFY_VALUE_PREFIX = "smeos-verify="

export const DOMAIN_STATUS_LABEL: Record<CustomDomainStatus, string> = {
  PENDING: "Chờ xác minh",
  VERIFIED: "Đang hoạt động",
  LOCKED: "Đã bị khoá",
}

export const CERTIFICATE_STATUS_LABEL: Record<CertificateStatus, string> = {
  NOT_REQUESTED: "Chưa cấp chứng chỉ",
  REQUESTED: "Đang cấp chứng chỉ HTTPS",
  MANUAL: "Đội vận hành đang cấp chứng chỉ HTTPS",
  FAILED: "Chưa cấp được chứng chỉ — đội vận hành sẽ xử lý",
}

const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/
const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/

export type HostnameResult = { ok: true; hostname: string } | { ok: false; error: string }

/**
 * Chuẩn hoá tên miền người dùng nhập: bỏ `https://`, đường dẫn, dấu chấm cuối; chữ thường; tên miền tiếng
 * Việt có dấu đổi sang dạng punycode. Từ chối địa chỉ IP, tên miền một nhãn, tên miền của chính hệ thống.
 */
export function normalizeHostname(input: string, reservedSuffixes: readonly string[] = []): HostnameResult {
  const raw = input.trim().toLowerCase().replace(/^[a-z]+:\/\//, "").split(/[/?#]/)[0]!.replace(/\.$/, "")
  if (!raw) return { ok: false, error: "Vui lòng nhập tên miền." }
  if (raw.includes(":") || raw.includes("@") || raw.includes("*")) return { ok: false, error: "Tên miền không hợp lệ — chỉ nhập phần tên, ví dụ hoa.tiemcuaban.vn." }
  let hostname: string
  try {
    hostname = new URL(`http://${raw}`).hostname
  } catch {
    return { ok: false, error: "Tên miền không hợp lệ — chỉ nhập phần tên, ví dụ hoa.tiemcuaban.vn." }
  }
  const labels = hostname.split(".")
  if (hostname.length > 253 || labels.length < 2 || !labels.every((l) => LABEL.test(l)) || IPV4.test(hostname)) {
    return { ok: false, error: "Tên miền không hợp lệ — chỉ nhập phần tên, ví dụ hoa.tiemcuaban.vn." }
  }
  if (/^\d+$/.test(labels[labels.length - 1]!)) return { ok: false, error: "Tên miền không hợp lệ." }
  if (reservedSuffixes.some((s) => hostname === s || hostname.endsWith(`.${s}`))) {
    return { ok: false, error: "Tên miền này thuộc hệ thống, không gắn được cho cửa hàng." }
  }
  return { ok: true, hostname }
}

export function verificationRecordName(hostname: string): string {
  return `${VERIFY_RECORD_PREFIX}.${hostname}`
}

export function legacyVerificationRecordName(hostname: string): string {
  return `${LEGACY_VERIFY_RECORD_PREFIX}.${hostname}`
}

export function verificationRecordValue(token: string): string {
  return `${VERIFY_VALUE_PREFIX}${token}`
}

/** Bản ghi TXT khớp khi một chuỗi (ghép các đoạn) đúng `alg-verify=<mã>` (hoặc tiền tố cũ `smeos-verify=`). */
export function txtRecordsMatch(records: readonly (readonly string[])[], token: string): boolean {
  const expected = [verificationRecordValue(token), `${LEGACY_VERIFY_VALUE_PREFIX}${token}`]
  return records.some((chunks) => expected.includes(chunks.join("").trim()))
}

export interface DnsInstruction {
  type: "TXT" | "CNAME"
  name: string
  value: string
  purpose: string
}

/** Hai bản ghi cửa hàng thêm ở nơi quản lý tên miền. `target` = máy chủ của hệ thống (CNAME). */
export function dnsInstructions(hostname: string, token: string, target: string | null): DnsInstruction[] {
  const rows: DnsInstruction[] = [
    { type: "TXT", name: verificationRecordName(hostname), value: verificationRecordValue(token), purpose: "Chứng minh cửa hàng sở hữu tên miền" },
  ]
  if (target) rows.push({ type: "CNAME", name: hostname, value: target, purpose: "Trỏ tên miền về trang của cửa hàng" })
  return rows
}

/**
 * Loại đường dẫn được mở trên tên miền riêng. `owner` = cách xác định tổ chức sở hữu dữ liệu của trang;
 * `pass` = tài nguyên chung (mã nguồn trang, API công khai) không gắn tổ chức. Không có trong danh sách → 404.
 */
export type CustomDomainPath =
  | { kind: "home" }
  | { kind: "pass" }
  | { kind: "owner"; resource: OwnedResource; key: string }
  | { kind: "blocked" }

export type OwnedResource = "catalog_link" | "org_slug" | "greeting_catalog" | "greeting_session" | "share_link" | "store_profile"

const OWNED_PREFIX: Record<string, OwnedResource> = {
  c: "catalog_link",
  bst: "org_slug",
  g: "greeting_catalog",
  b: "greeting_session",
  s: "share_link",
  ch: "store_profile",
}

const KEY_SHAPE = /^[A-Za-z0-9_-]{1,120}$/

export function classifyCustomDomainPath(pathname: string): CustomDomainPath {
  if (pathname === "/" || pathname === "") return { kind: "home" }
  if (pathname.startsWith("/_next/") || pathname.startsWith("/api/") || pathname === "/robots.txt" || pathname === "/favicon.ico") return { kind: "pass" }
  const [, head, key] = pathname.split("/")
  const resource = head ? OWNED_PREFIX[head] : undefined
  if (!resource || !key) return { kind: "blocked" }
  let decoded: string
  try {
    decoded = decodeURIComponent(key)
  } catch {
    return { kind: "blocked" }
  }
  return KEY_SHAPE.test(decoded) ? { kind: "owner", resource, key: decoded } : { kind: "blocked" }
}

/** Trạng thái hiển thị cho cửa hàng: đã xác minh nhưng chứng chỉ chưa xong vẫn báo rõ. */
export function domainStatusText(status: CustomDomainStatus, certificate: CertificateStatus): string {
  if (status !== "VERIFIED") return DOMAIN_STATUS_LABEL[status]
  return certificate === "REQUESTED" || certificate === "NOT_REQUESTED"
    ? DOMAIN_STATUS_LABEL.VERIFIED
    : `${DOMAIN_STATUS_LABEL.VERIFIED} · ${CERTIFICATE_STATUS_LABEL[certificate]}`
}
