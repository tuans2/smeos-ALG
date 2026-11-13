import { ownerCookieName } from "@/modules/greeting-card/domain/session-owner"
import { signOwnerToken } from "@/modules/greeting-card/infra/session-owner-token"

/** Header cookie của chủ phiên Thẻ chào — để gọi thẳng route công khai `/brochure/[sendCode]/*`. */
export function ownerCookie(sendCode: string): { cookie: string } {
  return { cookie: `${ownerCookieName(sendCode)}=${signOwnerToken(sendCode)}` }
}
