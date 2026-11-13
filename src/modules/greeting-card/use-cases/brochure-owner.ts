import { notFound } from "@/core/http/errors"
import { readCookie } from "@/core/http/cookies"
import { validateSendCode } from "../domain/greeting-card-rules"
import { decideViewer, ownerCookieName, OWNER_COOKIE_MAX_AGE, type BrochureViewer } from "../domain/session-owner"
import { phoneLast4Matches } from "../domain/tracking-privacy"
import { SessionOwnerRepository, getSessionOwnerRepository } from "../infra/session-owner-repository"
import { signOwnerToken, verifyOwnerToken } from "../infra/session-owner-token"

export type OwnerCookie = { name: string; value: string; maxAge: number }

function cookieFor(sendCode: string): OwnerCookie {
  return { name: ownerCookieName(sendCode), value: signOwnerToken(sendCode), maxAge: OWNER_COOKIE_MAX_AGE }
}

/** Trình duyệt gửi request này có phải chủ phiên không (cookie đúng chữ ký). */
export function isBrochureOwner(request: Request, sendCode: string): boolean {
  return verifyOwnerToken(sendCode, readCookie(request, ownerCookieName(sendCode)))
}

export async function isBrochureOwnerOrStaff(request: Request, sendCode: string): Promise<boolean> {
  if (isBrochureOwner(request, sendCode)) return true
  try {
    const { staffOrganizationId } = await import("./staff-viewer")
    const { SessionOwnerRepository } = await import("../infra/session-owner-repository")
    const orgId = await staffOrganizationId(request.headers)
    if (!orgId) return false
    const session = await getSessionOwnerRepository().findSession(sendCode)
    return session?.organization_id === orgId
  } catch {
    return false
  }
}

/**
 * Gác cho mọi API công khai đọc/ghi phiên `/b/<mã>`: không phải chủ phiên hoặc nhân viên tiệm → 404
 */
export async function assertBrochureOwner(request: Request, sendCode: string): Promise<void> {
  const allowed = await isBrochureOwnerOrStaff(request, sendCode)
  if (!allowed) throw notFound()
}

/** Người đang xem trang `/b/<mã>` là ai — trang dựa vào đây để hiện phiên, xin nhận phiên hay chuyển hướng. */
export async function brochureViewer(
  sendCode: string,
  input: { ownerToken: string | null; staffOrganizationId: string | null },
  repo = getSessionOwnerRepository(),
): Promise<{ viewer: BrochureViewer; shareCode: string | null } | null> {
  if (!validateSendCode(sendCode)) return null
  const session = await repo.findSession(sendCode)
  if (!session) return null
  const tokenValid = verifyOwnerToken(session.send_code, input.ownerToken)
  const staffOfShop = input.staffOrganizationId === session.organization_id
  const claimed = tokenValid || staffOfShop ? true : await repo.isClaimed(session.organization_id, session.id)
  const viewer = decideViewer({ tokenValid, claimed, staffOfShop })
  const shareCode = viewer === "OTHER" ? await repo.shareCodeOf(session.organization_id, session.id) : null
  return { viewer, shareCode }
}

/**
 * Trình duyệt đầu tiên chạy trang phiên chưa có chủ thì nhận chủ (máy quét xem trước link
 * không chạy JavaScript nên không nhận được). Đã có chủ khác → 404.
 */
export async function claimBrochureSession(
  request: Request,
  sendCode: string,
  repo = getSessionOwnerRepository(),
): Promise<OwnerCookie> {
  if (!validateSendCode(sendCode)) throw notFound()
  const session = await repo.findSession(sendCode)
  if (!session) throw notFound()
  if (isBrochureOwner(request, session.send_code)) return cookieFor(session.send_code)
  if (!(await repo.claim(session.organization_id, session.id, "first-open"))) throw notFound()
  return cookieFor(session.send_code)
}

/**
 * Khách mở lại link riêng ĐÃ CÓ ĐƠN ở trình duyệt/máy khác (Zalo → Safari, link theo dõi trong tin nhắn,
 * người nhà chuyển khoản hộ): đúng 4 số cuối SĐT người đặt thì trình duyệt này cũng thành chủ phiên.
 * Phiên chưa có đơn hoặc sai số → 404 (không lộ phiên có tồn tại). Bên gọi giới hạn số lần thử.
 */
export async function unlockBrochureSession(sendCode: string, phoneLast4: string, repo = getSessionOwnerRepository()): Promise<OwnerCookie> {
  if (!validateSendCode(sendCode)) throw notFound()
  const session = await repo.findSession(sendCode)
  if (!session) throw notFound()
  const phone = await repo.orderPhoneOf(session.organization_id, session.id)
  if (phone === null || !phoneLast4Matches(phone, phoneLast4)) throw notFound()
  return grantBrochureOwner(session, "phone-verified", repo)
}

/**
 * Máy chủ vừa tạo phiên cho chính trình duyệt này (mở link chia sẻ, đặt từ bộ sưu tập công khai,
 * đặt thêm đơn) — trao chủ phiên luôn, không chờ trang xin nhận.
 */
export async function grantBrochureOwner(
  session: { id: string; organization_id: string; send_code: string },
  source: string,
  repo = getSessionOwnerRepository(),
): Promise<OwnerCookie> {
  await repo.claim(session.organization_id, session.id, source, true)
  return cookieFor(session.send_code)
}

/** Như `grantBrochureOwner` nhưng tra phiên theo mã (bên gọi chỉ có mã phiên vừa tạo). */
export async function grantBrochureOwnerByCode(sendCode: string, source: string, repo = getSessionOwnerRepository()): Promise<OwnerCookie | null> {
  const session = await repo.findSession(sendCode)
  return session ? grantBrochureOwner(session, source, repo) : null
}

/** Header `Set-Cookie` cho cookie chủ phiên (route trả `Response` tự dựng). */
export function serializeOwnerCookie(cookie: OwnerCookie, secure: boolean): string {
  return [
    `${cookie.name}=${cookie.value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${cookie.maxAge}`,
    ...(secure ? ["Secure"] : []),
  ].join("; ")
}

/** Request đến qua HTTPS (sau proxy của Render đọc `x-forwarded-proto`). */
export function isHttps(request: Request): boolean {
  const proto = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "")
  return proto.split(",")[0]?.trim() === "https"
}
