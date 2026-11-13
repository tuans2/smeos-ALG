import { scopedWhere, type TenantContext } from "@/core/tenancy"
import { notFound } from "@/core/http/errors"
import { log } from "@/core/observability/log"
import { Prisma } from "@/generated/prisma/client"
import { isUniqueViolation } from "@/modules/coordinator/infra/transaction"
import { generateSendCode, linkAvailability } from "../domain/greeting-card-rules"
import { CATALOG_ITEMS_INCLUDE, GreetingCatalogRepository } from "./greeting-catalog-repository"
import type { GreetingSessionStatus, ProductSnapshot } from "../domain/greeting-card-types"
import { withIndustryKey, withOrganizationIndustry } from "@/modules/organization/domain/industry-key"
import { ORG_SETTINGS_SELECT } from "@/modules/organization/infra/organization-industry"
import { withSessionCustomer } from "./session-customer"

const SEND_CODE_ATTEMPTS = 5

/** Phiên/link Thẻ chào + đọc công khai; kế thừa CRUD bộ sưu tập. */
export class GreetingCardRepository extends GreetingCatalogRepository {

  /**
   * Tạo phiên với mã gửi ngẫu nhiên, duy nhất TOÀN HỆ THỐNG (link công khai
   * tra không theo tổ chức). Trùng thì sinh lại — xác suất trùng ~1/10^12.
   */
  private async createSessionWithFreshCode(
    prefix: string | undefined,
    build: (sendCode: string) => Prisma.greeting_sessionsUncheckedCreateInput, linkCustomer = true // P-2: false = gắn khách lúc đặt đơn
  ) {
    for (let attempt = 0; attempt < SEND_CODE_ATTEMPTS; attempt++) {
      const sendCode = generateSendCode(prefix)
      const taken = await this.db.greeting_sessions.findFirst({
        where: { send_code: sendCode },
        select: { id: true },
      })
      if (taken) continue
      try {
        return await this.db.greeting_sessions.create({ data: linkCustomer ? await withSessionCustomer(this.db, build(sendCode)) : build(sendCode) })
      } catch (error) {
        if (!isUniqueViolation(error)) throw error
      }
    }
    throw new Error("Không sinh được mã gửi Thẻ chào duy nhất")
  }

  async createSession(
    ctx: TenantContext,
    input: {
      catalogId: string
      prefix?: string | undefined
      saleId: string
      customerName?: string | null | undefined
      customerPhone?: string | null | undefined
      expiresAt?: Date | null | undefined
    }
  ) {
    const catalog = await this.db.greeting_catalogs.findFirst({
      where: scopedWhere(ctx, { id: input.catalogId, is_active: true }),
      select: { id: true },
    })
    if (!catalog) throw notFound()

    return this.createSessionWithFreshCode(input.prefix, (sendCode) => ({
      organization_id: ctx.organizationId,
      catalog_id: catalog.id,
      send_code: sendCode,
      sale_id: input.saleId,
      customer_name: input.customerName ?? null, customer_phone: input.customerPhone ?? null,
      expires_at: input.expiresAt ?? null,
      status: "CREATED",
    }))
  }

  async getCatalogFilters(ctx: TenantContext, id: string) {
    const catalog = await this.db.greeting_catalogs.findFirst({
      where: scopedWhere(ctx, { id }),
      select: { filters: true },
    })
    return catalog?.filters ?? null
  }

  /**
   * Phiên mới cho "đặt thêm đơn" từ một link đã có đơn: cùng tổ chức, bộ sưu tập,
   * sale phụ trách và khách — mỗi đơn có link + mã đơn riêng, không đụng đơn cũ.
   */
  async createFollowUpSession(from: {
    organization_id: string
    catalog_id: string
    send_code: string
    sale_id: string
    customer_name: string | null
    customer_phone: string | null
    expires_at: Date | null
  }) {
    return this.createSessionWithFreshCode(from.send_code.split("-")[0], (sendCode) => ({
      organization_id: from.organization_id,
      catalog_id: from.catalog_id,
      send_code: sendCode,
      sale_id: from.sale_id,
      customer_name: from.customer_name,
      customer_phone: from.customer_phone,
      expires_at: from.expires_at,
      status: "OPENED",
      opened_at: new Date(),
    }))
  }

  async createPublicSession(input: {
    organizationId: string
    catalogId: string
    customerName?: string | null
    customerPhone?: string | null
    productId: string
    snapshot: ProductSnapshot
    /** Người phụ trách mặc định (link cũ không qua nút Sao chép); thiếu → "public". */
    saleId?: string | null | undefined
  }) {
    return this.createSessionWithFreshCode("PUB", (sendCode) => ({
      organization_id: input.organizationId,
      catalog_id: input.catalogId,
      send_code: sendCode,
      sale_id: input.saleId || "public",
      customer_name: input.customerName ?? null,
      customer_phone: input.customerPhone ?? null,
      status: "SELECTED",
      selected_product_id: input.productId,
      product_snapshot: input.snapshot as unknown as Prisma.InputJsonValue,
      selected_at: new Date(),
    }), false) // link công khai: phiên tạo ngay trước đơn; đơn bị chặn thì không để lại hồ sơ khách
  }

  /**
   * Tra phiên theo mã gửi cho trang công khai. Mã cũ dạng `T01-001` có thể
   * trùng giữa hai tiệm — khi đó KHÔNG đoán: trả `null` (404) thay vì mở
   * nhầm thẻ của tiệm khác.
   */
  async getPublicSessionBySendCode(sendCode: string) {
    const matches = await this.db.greeting_sessions.findMany({
      where: { send_code: sendCode.toUpperCase().trim() },
      include: {
        // Chỉ đọc khoá cấu hình hiển thị trong settings (toPublicCatalogFilters); ngành theo cột (ADR-012 T-6c-1)
        organization: { select: ORG_SETTINGS_SELECT },
        catalog: { include: CATALOG_ITEMS_INCLUDE },
        order: { include: { items: { select: { product_id: true } } } },
      },
      take: 2,
    })
    if (matches.length > 1) {
      log.warn("greeting_card.send_code_ambiguous", { feature: "greeting-card", sendCode })
      return null
    }
    return withOrganizationIndustry(matches[0] ?? null)
  }

  /** Lấy catalog công khai theo ID — không cần auth, dùng cho route /g/[id]. */
  async getPublicCatalogById(catalogId: string) {
    return withOrganizationIndustry(await this.db.greeting_catalogs.findFirst({
      where: { id: catalogId, is_active: true },
      include: { organization: { select: { id: true, name: true, slug: true, ...ORG_SETTINGS_SELECT } }, ...CATALOG_ITEMS_INCLUDE },
    }))
  }

  /**
   * Lấy catalog công khai theo slug tổ chức + code catalog.
   * Dùng cho route /g/[orgSlug]/[catalogCode] — URL thân thiện, có ý nghĩa.
   */
  async getPublicCatalogBySlugAndCode(orgSlug: string, catalogCode: string) {
    return withOrganizationIndustry(await this.db.greeting_catalogs.findFirst({
      where: {
        code: catalogCode.toLowerCase().trim(),
        is_active: true,
        organization: { slug: orgSlug.toLowerCase().trim() },
      },
      include: { organization: { select: { id: true, name: true, slug: true, ...ORG_SETTINGS_SELECT } }, ...CATALOG_ITEMS_INCLUDE },
    }))
  }

  /** Tên hiển thị + cài đặt của tiệm cho trang công khai (không lộ gì khác). */
  async getShopProfile(organizationId: string) {
    const org = await this.db.organizations.findUnique({
      where: { id: organizationId },
      select: { name: true, type: true, ...ORG_SETTINGS_SELECT, business_profile: { select: { display_name: true, phone: true } } },
    })
    return {
      name: org?.business_profile?.display_name || org?.name || "Cửa hàng", phone: org?.business_profile?.phone ?? null,
      type: org?.type ?? "SINGLE",
      settings: org ? (withIndustryKey(org).settings ?? null) : null, // ngành theo cột industry_key (ADR-012 T-6b)
    }
  }

  async updateSession(
    sessionId: string,
    data: {
      status?: GreetingSessionStatus | undefined
      selectedProductId?: string | null | undefined
      productSnapshot?: ProductSnapshot | null | undefined
      openedAt?: Date | undefined
      selectedAt?: Date | undefined
      paymentProofAssetId?: string | null | undefined
      paymentProofBalanceAssetId?: string | null | undefined
    }
  ) {
    return this.db.greeting_sessions.update({
      where: { id: sessionId },
      data: {
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.selectedProductId !== undefined ? { selected_product_id: data.selectedProductId } : {}),
        ...(data.productSnapshot !== undefined
          ? { product_snapshot: data.productSnapshot as unknown as Prisma.InputJsonValue }
          : {}),
        ...(data.openedAt !== undefined ? { opened_at: data.openedAt } : {}),
        ...(data.selectedAt !== undefined ? { selected_at: data.selectedAt } : {}),
        ...(data.paymentProofAssetId !== undefined ? { payment_proof_asset_id: data.paymentProofAssetId } : {}),
        ...(data.paymentProofBalanceAssetId !== undefined ? { payment_proof_balance_asset_id: data.paymentProofBalanceAssetId } : {}),
        last_active_at: new Date(),
      },
    })
  }

  async findSessionById(sessionId: string) {
    return this.db.greeting_sessions.findUnique({
      where: { id: sessionId },
    })
  }

  /** CREATED → OPENED đúng một lần (hai tab mở cùng lúc chỉ một bên ghi). */
  async markOpened(sessionId: string, at: Date): Promise<boolean> {
    const res = await this.db.greeting_sessions.updateMany({
      where: { id: sessionId, status: "CREATED" },
      data: { status: "OPENED", opened_at: at, last_active_at: at },
    })
    return res.count > 0
  }

  /** Thu hồi link chưa có đơn. Trả `false` khi không có link nào đổi (không tồn tại/đã thu hồi/đã có đơn). */
  async revokeSession(ctx: TenantContext, sessionId: string): Promise<boolean> {
    const result = await this.db.greeting_sessions.updateMany({
      where: scopedWhere(ctx, { id: sessionId, revoked_at: null, order_id: null }),
      data: { revoked_at: new Date(), revoked_by: ctx.userId },
    })
    return result.count > 0
  }

  async findSessionState(ctx: TenantContext, sessionId: string) {
    return this.db.greeting_sessions.findFirst({
      where: scopedWhere(ctx, { id: sessionId }),
      select: { id: true, order_id: true, revoked_at: true },
    })
  }

  async recordJourneyEvent(
    organizationId: string,
    sessionId: string,
    eventType: string,
    metadata?: Record<string, unknown> | null | undefined
  ) {
    return this.db.greeting_journey_events.create({
      data: {
        organization_id: organizationId,
        session_id: sessionId,
        event_type: eventType,
        metadata: (metadata ?? Prisma.DbNull) as Prisma.InputJsonValue,
      },
    })
  }

  /**
   * Danh sách link đã gửi, phân trang con trỏ (mới nhất trước). Lấy dư 1 dòng
   * để bên gọi biết còn trang sau (`toPage`). Kèm trạng thái hiệu lực link.
   */
  async listSessions(
    ctx: TenantContext,
    options: {
      saleId?: string | undefined
      catalogId?: string | undefined
      status?: string | undefined
      limit: number
      cursor?: string | undefined
    }
  ) {
    const rows = await this.db.greeting_sessions.findMany({
      where: scopedWhere(ctx, {
        ...(options.saleId ? { sale_id: options.saleId } : {}),
        ...(options.catalogId ? { catalog_id: options.catalogId } : {}),
        ...(options.status ? { status: options.status } : {}),
      }),
      select: {
        id: true,
        send_code: true,
        sale_id: true,
        customer_name: true,
        customer_phone: true,
        status: true,
        order_id: true,
        expires_at: true,
        revoked_at: true,
        last_active_at: true,
        created_at: true,
        catalog: { select: { id: true, name: true, code: true } },
        order: { select: { id: true, code: true, status: true, total_vnd: true, paid_vnd: true } },
      },
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      take: options.limit + 1,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    })
    // Decimal → number: JSON của Decimal là chuỗi, UI cần số để định dạng/so sánh
    return rows.map((r) => ({
      ...r,
      link_state: linkAvailability({ expiresAt: r.expires_at, revokedAt: r.revoked_at, hasOrder: r.order_id !== null }),
      order: r.order ? { ...r.order, total_vnd: Number(r.order.total_vnd), paid_vnd: Number(r.order.paid_vnd) } : null,
    }))
  }

  async createPaymentProofAsset(input: {
    id: string
    organizationId: string
    storageKey: string
    mimeType: string
    fileSize: number
    createdBy: string
    metadata: Record<string, unknown>
  }) {
    return this.db.assets.create({
      data: {
        id: input.id,
        organization_id: input.organizationId,
        kind: "ORIGINAL",
        state: "READY",
        version: 1,
        storage_key: input.storageKey,
        mime_type: input.mimeType,
        file_size: input.fileSize,
        created_by: input.createdBy,
        metadata: input.metadata as unknown as Prisma.InputJsonValue,
      },
    })
  }

  async updateAssetMetadata(organizationId: string, assetId: string, metadata: Record<string, unknown>) {
    return this.db.assets.updateMany({
      where: { id: assetId, organization_id: organizationId },
      data: {
        metadata: metadata as unknown as Prisma.InputJsonValue,
      },
    })
  }

  async findSessionForVerification(organizationId: string, sendCode: string) {
    return withOrganizationIndustry(await this.db.greeting_sessions.findUnique({
      where: { organization_id_send_code: { organization_id: organizationId, send_code: sendCode } },
      include: { order: { include: { items: true } }, organization: { select: ORG_SETTINGS_SELECT } },
    }))
  }

  async findAssetForVerification(organizationId: string, assetId: string) {
    return this.db.assets.findFirst({
      where: { id: assetId, organization_id: organizationId },
      select: { storage_key: true, mime_type: true, metadata: true },
    })
  }
}

let _greetingCardRepositorySingleton: GreetingCardRepository | null = null
export function getGreetingCardRepository(): GreetingCardRepository {
  if (!_greetingCardRepositorySingleton) _greetingCardRepositorySingleton = new GreetingCardRepository()
  return _greetingCardRepositorySingleton
}
