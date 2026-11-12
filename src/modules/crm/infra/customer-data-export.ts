import { prisma } from "@/core/tenancy/infra/prisma"

/**
 * Gói dữ liệu cá nhân của MỘT khách theo yêu cầu xuất (ADR-014 D-P5, bước P-7a): mọi bảng trong sổ dữ liệu cá nhân có
 * dòng của khách, chỉ trong tổ chức của phiên. Đọc qua client Prisma nên cột mã hoá được giải mã. Chỉ chọn cột nói về
 * khách — không kèm cột nội bộ (người tạo, ghi chú nội bộ, khoá kỹ thuật).
 */
const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null)

export interface CustomerDataPackage {
  customer: Record<string, unknown>
  [section: string]: unknown
}

export async function exportCustomerData(organizationId: string, customerId: string): Promise<CustomerDataPackage | null> {
  const org = { organization_id: organizationId }
  const mine = { ...org, customer_id: customerId }
  const c = await prisma.customers.findFirst({ where: { ...org, id: customerId } })
  if (!c) return null

  const [occasions, consents, interactions, leads, sessions, orders, conversations, quotations] = await Promise.all([
    prisma.customer_occasions.findMany({ where: mine, orderBy: { created_at: "asc" } }),
    prisma.customer_consents.findMany({ where: mine, orderBy: { created_at: "asc" } }),
    prisma.customer_interactions.findMany({ where: mine, orderBy: { occurred_at: "asc" } }),
    prisma.leads.findMany({ where: mine, orderBy: { created_at: "asc" } }),
    prisma.greeting_sessions.findMany({ where: mine, orderBy: { created_at: "asc" } }),
    prisma.orders.findMany({ where: mine, orderBy: { created_at: "asc" }, include: { recipient: true } }),
    prisma.chat_conversations.findMany({ where: mine, orderBy: { created_at: "asc" }, include: { messages: { orderBy: { created_at: "asc" } } } }),
    prisma.quotations.findMany({ where: mine, orderBy: { created_at: "asc" } }),
  ])

  return {
    customer: {
      code: c.code, name: c.name, phone: c.phone, email: c.email, address: c.address, notes: c.notes, tags: c.tags,
      preferredFlowers: c.preferred_flowers, preferredColors: c.preferred_colors, createdAt: iso(c.created_at),
    },
    occasions: occasions.map((o) => ({ name: o.name, date: o.date, recipientName: o.recipient_name, notes: o.notes })),
    consents: consents.map((o) => ({ channel: o.channel, granted: o.granted, grantedAt: iso(o.granted_at), revokedAt: iso(o.revoked_at) })),
    interactions: interactions.map((o) => ({ channel: o.channel, direction: o.direction, summary: o.summary, outcome: o.outcome, occurredAt: iso(o.occurred_at) })),
    leads: leads.map((o) => ({ name: o.name, phone: o.phone, message: o.message, source: o.source, status: o.status, consentAt: iso(o.consent_at), createdAt: iso(o.created_at) })),
    greetingSessions: sessions.map((o) => ({ customerName: o.customer_name, customerPhone: o.customer_phone, status: o.status, createdAt: iso(o.created_at) })),
    orders: orders.map((o) => ({
      code: o.code, status: o.status, totalVnd: Number(o.total_vnd), paidVnd: Number(o.paid_vnd), cardMessage: o.card_message,
      deliveryAddress: o.delivery_address, createdAt: iso(o.created_at),
      recipient: o.recipient
        ? {
            name: o.recipient.recipient_name, phone: o.recipient.recipient_phone, addressLine: o.recipient.address_line,
            vatCompanyName: o.recipient.vat_company_name, vatTaxCode: o.recipient.vat_tax_code,
            vatCompanyAddress: o.recipient.vat_company_address, vatEmail: o.recipient.vat_email,
          }
        : null,
    })),
    conversations: conversations.map((o) => ({
      channel: o.channel, createdAt: iso(o.created_at),
      messages: o.messages.map((m) => ({ sender: m.sender_type, content: m.content, sentAt: iso(m.created_at) })),
    })),
    quotations: quotations.map((o) => ({ code: o.code, status: o.status, createdAt: iso(o.created_at) })),
  }
}

/** Số bản ghi theo mục của gói — ghi vào `data_subject_requests.result`. */
export function packageCounts(pkg: CustomerDataPackage): Record<string, number> {
  const counts: Record<string, number> = { customer: 1 }
  for (const [key, value] of Object.entries(pkg)) if (Array.isArray(value) && value.length > 0) counts[key] = value.length
  return counts
}
