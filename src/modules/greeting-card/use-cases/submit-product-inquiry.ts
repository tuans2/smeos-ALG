import { AppError, notFound, validationFailed } from "@/core/http/errors"
import {
  inquiryContent,
  inquiryTitle,
  normalizeInquiryPhone,
  validateProductInquiry,
  type ProductInquiryInput,
} from "@/modules/crm/domain/product-inquiry"
import { ProductInquiryRepository } from "@/modules/crm/infra/product-inquiry-repository"
import { captureInquiryLead } from "@/modules/acquisition/use-cases/capture-inquiry-lead"
import { GreetingCardRepository } from "../infra/greeting-card-repository"
import { BrochureCheckoutRepository } from "../infra/brochure-checkout-repository"

export const INQUIRY_PHONE_LIMIT = 5
const INQUIRY_WINDOW_MS = 60 * 60_000

export interface PublicProductInquiryInput extends ProductInquiryInput {
  productId: string
  /** Khách tích "đồng ý để cửa hàng liên hệ lại" → ghi thêm lead (bản cũ không gửi → chỉ ghi hội thoại) */
  consent?: boolean | undefined
}

type LeadCapture = typeof captureInquiryLead

type CatalogItems = Array<{ product: { id: string; code: string; name: string } }>

interface Deps {
  checkout: BrochureCheckoutRepository
  inquiries: ProductInquiryRepository
  captureLead: LeadCapture
}

/**
 * Phần chung: mẫu phải thuộc danh sách của bộ sưu tập/link (sai → 404), chặn gửi dồn, ghi khách +
 * hội thoại; khách đồng ý được liên hệ → ghi thêm lead nguồn BROCHURE.
 */
async function recordInquiry(
  organizationId: string,
  items: CatalogItems,
  input: PublicProductInquiryInput,
  source: { catalogId: string; sendCode?: string | undefined },
  { checkout, inquiries, captureLead }: Deps,
): Promise<{ conversationId: string }> {
  const item = items.find((i) => i.product.id === input.productId)
  if (!item) throw notFound()
  const phone = normalizeInquiryPhone(input.customerPhone)

  const recent = await inquiries.countRecentByPhone(organizationId, phone, new Date(Date.now() - INQUIRY_WINDOW_MS))
  if (recent >= INQUIRY_PHONE_LIMIT) {
    throw new AppError("RATE_LIMITED", "Bạn đã gửi nhiều yêu cầu, cửa hàng sẽ liên hệ sớm. Vui lòng thử lại sau ít phút.")
  }

  const customerId = await checkout.findOrCreateCustomer({
    organizationId,
    customerPhone: phone,
    customerName: input.customerName.trim(),
    deliveryAddress: "",
  })
  const product = { id: item.product.id, code: item.product.code, name: item.product.name }
  const conversation = await inquiries.create({
    organizationId,
    customerId,
    title: inquiryTitle(product),
    content: inquiryContent(product, input),
    metadata: {
      kind: "PRODUCT_INQUIRY",
      catalogId: source.catalogId,
      sendCode: source.sendCode ?? null,
      productId: product.id,
      productCode: product.code,
      variantName: input.variantName?.trim().slice(0, 120) || null,
    },
  })
  if (input.consent === true) {
    await captureLead({
      organizationId,
      customerId,
      name: input.customerName,
      phone,
      message: inquiryContent(product, input),
      sourceRef: source.sendCode ?? source.catalogId,
    })
  }
  return conversation
}

/**
 * Khách gửi yêu cầu tư vấn từ link bộ sưu tập công khai. Tổ chức suy từ bộ sưu tập (không nhận
 * từ client); mẫu phải thuộc bộ sưu tập đó, sai → 404. Mỗi SĐT tối đa 5 yêu cầu/giờ mỗi tiệm.
 */
export async function submitProductInquiry(
  catalogId: string,
  input: PublicProductInquiryInput,
  repo = new GreetingCardRepository(),
  checkout = new BrochureCheckoutRepository(),
  inquiries = new ProductInquiryRepository(),
  captureLead: LeadCapture = captureInquiryLead,
): Promise<{ conversationId: string }> {
  const errors = validateProductInquiry(input)
  if (Object.keys(errors).length > 0) throw validationFailed(errors)
  const catalog = await repo.getPublicCatalogById(catalogId)
  if (!catalog) throw notFound()
  return recordInquiry(catalog.organization_id, catalog.items, input, { catalogId }, { checkout, inquiries, captureLead })
}

/** Như trên, từ link chào riêng `/b/<mã>`: tổ chức và danh sách mẫu suy từ phiên của mã đó. */
export async function submitBrochureInquiry(
  sendCode: string,
  input: PublicProductInquiryInput,
  repo = new GreetingCardRepository(),
  checkout = new BrochureCheckoutRepository(),
  inquiries = new ProductInquiryRepository(),
  captureLead: LeadCapture = captureInquiryLead,
): Promise<{ conversationId: string }> {
  const errors = validateProductInquiry(input)
  if (Object.keys(errors).length > 0) throw validationFailed(errors)
  const session = await repo.getPublicSessionBySendCode(sendCode)
  if (!session?.catalog) throw notFound()
  return recordInquiry(session.organization_id, session.catalog.items, input, { catalogId: session.catalog_id, sendCode: session.send_code }, { checkout, inquiries, captureLead })
}
