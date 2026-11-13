import { Prisma } from "@/generated/prisma/client"

import { recipientFromDeliveryAddress, stripRecipientPii, type OrderRecipientVat } from "../domain/order-recipient"

/** Client hoặc giao dịch — chỉ cần bảng `order_recipients`. */
type RecipientsDb = Pick<Prisma.TransactionClient, "order_recipients">

/**
 * P-3c: giá trị ghi vào `orders.delivery_address` — chỉ khoá vận hành (`zone`, `notes`, `mapUrl`…); người nhận và địa chỉ
 * ghi vào `order_recipients` bằng `upsertOrderRecipient` với JSON đầy đủ. Đọc ra vẫn đủ nhờ `deliveryAddressView`.
 */
export function storedDeliveryAddress(raw: unknown): Prisma.InputJsonValue | typeof Prisma.DbNull {
  const rest = stripRecipientPii(raw)
  return rest ? (rest as Prisma.InputJsonValue) : Prisma.DbNull
}

/**
 * ADR-014 D-P2 (P-3a, P-3c): người nhận/địa chỉ và bên mua hoá đơn VAT của đơn — `order_recipients` là nơi lưu DUY NHẤT.
 * `deliveryAddress` có mặt (JSON đầy đủ như trước P-3c) → thay phần người nhận/địa chỉ; `vat` có mặt → thay phần hoá
 * đơn; phần không truyền giữ nguyên. Gọi cùng lệnh ghi đơn, trong cùng giao dịch nếu có.
 */
export async function upsertOrderRecipient(
  db: RecipientsDb,
  organizationId: string,
  orderId: string,
  change: { deliveryAddress?: unknown; vat?: OrderRecipientVat },
): Promise<void> {
  const address = "deliveryAddress" in change ? recipientFromDeliveryAddress(change.deliveryAddress) : null
  const data = {
    ...(address
      ? { ...address, address_parts: address.address_parts ? (address.address_parts as Prisma.InputJsonValue) : Prisma.DbNull }
      : {}),
    ...(change.vat ?? {}),
  }
  await db.order_recipients.upsert({
    where: { order_id_organization_id: { order_id: orderId, organization_id: organizationId } },
    create: { order_id: orderId, organization_id: organizationId, ...data },
    update: data,
  })
}
