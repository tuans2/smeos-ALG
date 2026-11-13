import { GreetingCardRepository, getGreetingCardRepository } from "../infra/greeting-card-repository"
import { journeyEventType, type CustomerJourneyEvent } from "../domain/customer-journey-events"
import { loadPublicSession } from "./brochure-session-access"

/**
 * Ghi một bước hành trình của khách (đã qua gác chủ phiên ở route). Mẫu lạ (không thuộc bộ sưu
 * tập của phiên) → bỏ `productId`, không ghi id tuỳ ý khách gửi lên.
 */
export async function recordCustomerJourneyEvent(
  sendCode: string,
  input: { event: CustomerJourneyEvent; productId?: string | undefined },
  repo = getGreetingCardRepository(),
): Promise<{ recorded: true }> {
  const session = await loadPublicSession(sendCode, repo)
  const known = input.productId && session.catalog.items.some((i) => i.product.id === input.productId)
  await repo.recordJourneyEvent(session.organization_id, session.id, journeyEventType(input.event), known ? { productId: input.productId } : null)
  return { recorded: true }
}
