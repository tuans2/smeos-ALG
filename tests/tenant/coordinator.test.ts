import { randomUUID } from "node:crypto"

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest"

import { GET as listOrders, POST as createOrder } from "@/app/api/v1/coordinator/orders/route"
import { GET as getOrder } from "@/app/api/v1/coordinator/orders/[id]/route"
import { PATCH as patchStage } from "@/app/api/v1/coordinator/orders/[id]/stage/route"
import { PATCH as patchCustomFields } from "@/app/api/v1/coordinator/orders/[id]/custom-fields/route"
import { POST as assignPartner } from "@/app/api/v1/coordinator/orders/[id]/assign-partner/route"
import { POST as production } from "@/app/api/v1/coordinator/orders/[id]/production/route"
import { POST as qc } from "@/app/api/v1/coordinator/orders/[id]/qc/route"
import { POST as delivery } from "@/app/api/v1/coordinator/orders/[id]/delivery/route"
import { POST as openException } from "@/app/api/v1/coordinator/orders/[id]/exceptions/route"
import { POST as closeOrder } from "@/app/api/v1/coordinator/orders/[id]/close/route"
import { POST as cancelOrder } from "@/app/api/v1/coordinator/orders/[id]/cancel/route"
import { POST as resolveException } from "@/app/api/v1/coordinator/exceptions/[id]/resolve/route"
import { GET as listPartners, POST as createPartner } from "@/app/api/v1/coordinator/partners/route"
import { GET as listOrderPayments, POST as recordOrderPayment } from "@/app/api/v1/coordinator/orders/[id]/payments/route"
import { PATCH as patchPartner } from "@/app/api/v1/coordinator/partners/[id]/route"
import type { TenantContext } from "@/core/tenancy"
import { prisma } from "@/core/tenancy/infra/prisma"
import type { Prisma } from "@/generated/prisma/client"
import { AssetRepository } from "@/modules/assets/infra/asset-repository"
import type { PartnerView } from "@/modules/coordinator/use-cases/manage-partners"
import type { CoordinatorOrderView } from "@/modules/coordinator/use-cases/present-coordinator-order"
import type { OrderPaymentView } from "@/modules/coordinator/use-cases/record-payment"

import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withSession, type Tenant } from "../helpers/fixtures"

const BASE = "http://localhost/api/v1/coordinator"

type Handler = (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>

function call(handler: Handler, t: Tenant, id: string, body?: unknown, method = "POST") {
  return handler(
    withSession(`${BASE}/x/${id}`, t.token, body === undefined ? { method } : { method, body: JSON.stringify(body) }),
    { params: Promise.resolve({ id }) }
  )
}

type ApiBody = {
  order: CoordinatorOrderView
  orders: CoordinatorOrderView[]
  partner: PartnerView
  partners: PartnerView[]
  payments: OrderPaymentView[]
}

async function json(res: Response): Promise<ApiBody> {
  return (await readJson(res)) as unknown as ApiBody
}

const ORDER_BODY = {
  customer_name: "Nguyễn Văn An",
  // ĐP-3.16 (26/09/2026): trường lõi REQUIRED tại INTAKE (field-registry seed)
  // — thiếu thì cổng `update-coordinator-stage.ts` chặn RỜI bước INTAKE.
  // Trước đây không bắt buộc ở tầng chạy nên fixture này không có, giờ mọi
  // đơn mặc định của bộ test phải có để còn chuyển bước được (nợ phát hiện
  // 26/09/2026 khi chạy `test:tenant` thật lần đầu sau ĐP-2b).
  customer_phone: "0987654321",
  customer_tier: "VIP",
  recipient_name: "Trần Thị Bình",
  recipient_phone: "0901234567",
  delivery_address: { street: "123 Phố Huế", ward: "Ngô Thì Nhậm", district: "Hai Bà Trưng", city: "Hà Nội" },
  delivery_target_time: "17:00 hôm nay",
  delivery_target_at: new Date(Date.now() + 6 * 3600_000).toISOString(),
  product_title: "Bó hoa hồng Pastel",
  unit_price_vnd: 850000,
  flowers: [{ flowerName: "Hồng Ohara", quantity: 12, unit: "cành", color: "hồng", role: "Chủ đạo" }],
  card_message: "Chúc mừng sinh nhật!",
}

async function newOrder(t: Tenant, body: Record<string, unknown> = ORDER_BODY): Promise<CoordinatorOrderView> {
  const res = await createOrder(withSession(`${BASE}/orders`, t.token, { method: "POST", body: JSON.stringify(body) }))
  expect(res.status).toBe(201)
  return (await json(res)).order
}

async function newPartner(t: Tenant, code = "XUONG-01", capacityDaily = 10): Promise<PartnerView> {
  const res = await createPartner(
    withSession(`${BASE}/partners`, t.token, {
      method: "POST",
      body: JSON.stringify({ code, name: `Xưởng ${code}`, phone: "0912345678", capacity_daily: capacityDaily }),
    })
  )
  expect(res.status).toBe(201)
  return (await readJson(res)).data as PartnerView
}

async function seedAsset(ctx: TenantContext): Promise<string> {
  const asset = await new AssetRepository().create(ctx, {
    id: randomUUID(),
    productId: null,
    parentAssetId: null,
    kind: "ORIGINAL",
    version: 1,
    storageKey: `org/${ctx.organizationId}/dieu-phoi/${randomUUID()}.jpg`,
    mimeType: "image/jpeg",
    createdBy: ctx.userId,
  })
  return asset.id
}

/** Đưa đơn tới QUALITY_CHECK qua đúng các endpoint. */
async function toQualityCheck(t: Tenant): Promise<{ order: CoordinatorOrderView; imageId: string }> {
  const order = await newOrder(t)
  const partner = await newPartner(t, `P-${randomUUID().slice(0, 6)}`)
  expect((await call(patchStage, t, order.id, { stage: "PLANNING" }, "PATCH")).status).toBe(200)
  expect((await call(assignPartner, t, order.id, { partnerId: partner.id })).status).toBe(200)
  const imageId = await seedAsset(t.ctx)
  const res = await call(production, t, order.id, { action: "MARK_READY", progress_percent: 100, finished_asset_ids: [imageId] })
  expect(res.status).toBe(200)
  return { order: (await json(res)).order, imageId }
}

describe("Chức năng 12 — Điều phối đơn hàng: cách ly tenant và luồng P1→P7", () => {
  let a: Tenant
  let b: Tenant

  // `field_definitions` là bảng NỀN TẢNG (như `ai_models`), KHÔNG bị
  // `resetDatabase()` TRUNCATE giữa các ca thử — 5 khoá `seedCustomField` tạo
  // ở đây (đặc biệt `cf_ghi_chu_bat_buoc`, REQUIRED tại INTAKE) từng để lại vĩnh
  // viễn sau khi bộ test chạy xong, làm MỌI đơn của MỌI tổ chức (kể cả các bộ
  // test khác chạy sau) không rời nổi INTAKE ở lần chạy `test:tenant` kế tiếp
  // (phát hiện 26/09/2026, lần chạy thứ hai). Dọn ở cả đầu lẫn cuối để chống cả
  // dữ liệu vương lại từ lần chạy trước lẫn để lại cho lần chạy sau.
  const CUSTOM_FIELD_TEST_KEYS = ["cf_ma_don_ngoai", "cf_a", "cf_b", "cf_ghi_chu_bat_buoc", "cf_khong_bat_buoc"]

  beforeAll(async () => {
    await prisma.field_definitions.deleteMany({ where: { key: { in: CUSTOM_FIELD_TEST_KEYS } } })
  })

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
  })

  // Dọn lại NGAY SAU MỖI ca — không chỉ đầu/cuối cả tệp. Ca REQUIRED-tại-INTAKE
  // ("cf_ghi_chu_bat_buoc") `upsert` field GLOBAL rồi để `default_enabled: true`
  // sống sót qua `resetDatabase()` (không TRUNCATE `field_definitions`), nên nếu
  // chỉ dọn ở `afterAll` thì MỌI ca chạy SAU nó trong cùng lần `vitest` (mọi tổ
  // chức, kể cả không liên quan gì tới trường tự tạo) đều bị chặn rời INTAKE vì
  // thiếu trường đó — đúng lỗi phát hiện 26/09/2026, lần chạy thứ ba.
  afterEach(async () => {
    await prisma.field_definitions.deleteMany({ where: { key: { in: CUSTOM_FIELD_TEST_KEYS } } })
  })

  afterAll(async () => {
    await prisma.field_definitions.deleteMany({ where: { key: { in: CUSTOM_FIELD_TEST_KEYS } } })
    await disconnectDatabase()
  })

  it("tạo đơn: máy chủ cấp mã tuần tự, ghi order_coordinations + order_events + audit_logs", async () => {
    const first = await newOrder(a)
    const second = await newOrder(a)
    expect(first.orderCode).toMatch(/^FLR-\d{6}-0001$/)
    expect(second.orderCode).toMatch(/^FLR-\d{6}-0002$/)
    expect(first.stage).toBe("INTAKE")

    const coordination = await prisma.order_coordinations.findUnique({ where: { order_id: first.id } })
    expect(coordination?.organization_id).toBe(a.organizationId)
    expect(await prisma.order_events.count({ where: { order_id: first.id } })).toBe(1)
    expect(await prisma.audit_logs.count({ where: { entity_id: first.id, action: "coordinator.order.create" } })).toBe(1)
  })

  // ── ĐP-3.16 (26/09/2026) — nối trường tự tạo vào luồng đơn thật ──────────

  async function seedCustomField(
    key: string,
    opts: { requirement?: "OPTIONAL" | "RECOMMENDED" | "REQUIRED"; requiredAtStage?: string | null } = {}
  ) {
    // `field_definitions` là bảng NỀN TẢNG (như `ai_models`/`platform_operators`),
    // không nằm trong TENANT_TABLES bị TRUNCATE giữa các ca thử (xem
    // `tests/helpers/database.ts`) — `create` trần sẽ vỡ `field_definitions_key_key`
    // ngay từ lần chạy `test:tenant` thứ hai trở đi (phát hiện 26/09/2026 khi
    // anh Tony chạy lại). `upsert` theo đúng khuôn `seed-ai-registry.ts`.
    const data = {
      entity: "ORDER" as const,
      origin: "CUSTOM" as const,
      data_type: "TEXT" as const,
      label: `Nhãn ${key}`,
      requirement: opts.requirement ?? "OPTIONAL",
      required_at_stage: opts.requiredAtStage ?? null,
      status: "ACTIVE" as const,
      default_enabled: true,
    }
    await prisma.field_definitions.upsert({
      where: { key },
      create: { key, ...data },
      update: data,
    })
  }

  it("customFields lúc tạo đơn được kiểm theo định nghĩa đang ACTIVE rồi lưu vào custom_fields, trả về ở view", async () => {
    await seedCustomField("cf_ma_don_ngoai")
    const order = await newOrder(a, { ...ORDER_BODY, custom_fields: { cf_ma_don_ngoai: "PO-123" } })
    expect(order.customFields).toMatchObject({ cf_ma_don_ngoai: "PO-123" })

    const coordination = await prisma.order_coordinations.findUnique({ where: { order_id: order.id } })
    expect((coordination?.custom_fields as Record<string, unknown> | null)?.cf_ma_don_ngoai).toBe("PO-123")
  })

  it("PATCH .../custom-fields trộn giá trị mới vào giá trị cũ, không thay nguyên khối", async () => {
    await seedCustomField("cf_a")
    await seedCustomField("cf_b")
    const order = await newOrder(a, { ...ORDER_BODY, custom_fields: { cf_a: "giá trị a" } })

    const res = await call(patchCustomFields, a, order.id, { custom_fields: { cf_b: "giá trị b" } }, "PATCH")
    expect(res.status).toBe(200)
    const updated = (await json(res)).order
    expect(updated.customFields).toMatchObject({ cf_a: "giá trị a", cf_b: "giá trị b" })
  })

  it("trường tự tạo REQUIRED tại INTAKE còn trống thì chặn rời bước (422), điền vào rồi mới rời được", async () => {
    await seedCustomField("cf_ghi_chu_bat_buoc", { requirement: "REQUIRED", requiredAtStage: "INTAKE" })
    const order = await newOrder(a, ORDER_BODY)

    const blocked = await call(patchStage, a, order.id, { stage: "VALIDATING" }, "PATCH")
    expect(blocked.status).toBe(422)
    const blockedBody = (await readJson(blocked)) as { error: { message: string } }
    expect(blockedBody.error.message).toContain("cf_ghi_chu_bat_buoc")

    expect((await call(patchCustomFields, a, order.id, { customFields: { cf_ghi_chu_bat_buoc: "đã điền" } }, "PATCH")).status).toBe(200)
    expect((await call(patchStage, a, order.id, { stage: "VALIDATING" }, "PATCH")).status).toBe(200)
  })

  it("trường tự tạo OPTIONAL (không requiredAtStage) không chặn rời bước dù để trống", async () => {
    await seedCustomField("cf_khong_bat_buoc")
    const orderB = await newOrder(b, ORDER_BODY)
    expect((await call(patchStage, b, orderB.id, { stage: "VALIDATING" }, "PATCH")).status).toBe(200)
  })

  it("tạo đơn đồng thời không sinh trùng mã (thử lại khi đụng khoá duy nhất)", async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, () =>
        createOrder(withSession(`${BASE}/orders`, a.token, { method: "POST", body: JSON.stringify(ORDER_BODY) }))
      )
    )
    expect(results.map((r) => r.status)).toEqual([201, 201, 201, 201, 201])
    const codes = await Promise.all(results.map(async (r) => (await json(r)).order.orderCode))
    expect(new Set(codes).size).toBe(5)
  })

  it("hai tổ chức dùng chung số thứ tự mã mà không đụng nhau", async () => {
    const oa = await newOrder(a)
    const ob = await newOrder(b)
    expect(oa.orderCode).toBe(ob.orderCode)
  })

  it("danh sách và chi tiết chỉ thấy đơn của tổ chức mình; tổ chức khác đọc/sửa → 404", async () => {
    const order = await newOrder(a)

    const listB = (await json(await listOrders(withSession(`${BASE}/orders`, b.token))))
    expect(listB.orders).toHaveLength(0)
    const listA = (await json(await listOrders(withSession(`${BASE}/orders`, a.token))))
    expect(listA.orders.map((o) => o.id)).toEqual([order.id])

    expect((await call(getOrder, b, order.id, undefined, "GET")).status).toBe(404)
    expect((await call(getOrder, b, order.orderCode, undefined, "GET")).status).toBe(404)
    expect((await call(patchStage, b, order.id, { stage: "PLANNING" }, "PATCH")).status).toBe(404)
    expect((await call(cancelOrder, b, order.id, { reason: "phá" })).status).toBe(404)
    expect((await call(openException, b, order.id, { type: "CUSTOMER_CHANGE", description: "x" })).status).toBe(404)

    const after = (await json(await call(getOrder, a, order.id, undefined, "GET")))
    expect(after.order.stage).toBe("INTAKE")
  })

  it("không phân công được đối tác của tổ chức khác (404)", async () => {
    const order = await newOrder(a)
    const partnerB = await newPartner(b)
    await call(patchStage, a, order.id, { stage: "PLANNING" }, "PATCH")
    expect((await call(assignPartner, a, order.id, { partnerId: partnerB.id })).status).toBe(404)

    const partnersA = (await readJson(await listPartners(withSession(`${BASE}/partners`, a.token)))).data as PartnerView[]
    expect(partnersA).toHaveLength(0)
    expect((await call(patchPartner, a, partnerB.id, { isActive: false }, "PATCH")).status).toBe(404)
  })

  it("không gắn được ảnh (assets) của tổ chức khác làm ảnh thành phẩm / POD (422)", async () => {
    const order = await newOrder(a)
    const partner = await newPartner(a)
    await call(patchStage, a, order.id, { stage: "PLANNING" }, "PATCH")
    await call(assignPartner, a, order.id, { partner_id: partner.id })
    const foreignImage = await seedAsset(b.ctx)
    const res = await call(production, a, order.id, { action: "MARK_READY", progress_percent: 100, finished_asset_ids: [foreignImage] })
    expect(res.status).toBe(422)
  })

  it("body sai → 400, bước lạ → 400, nhảy cóc → 409 (không còn 500)", async () => {
    const bad = await createOrder(withSession(`${BASE}/orders`, a.token, { method: "POST", body: JSON.stringify({ customer_name: "" }) }))
    expect(bad.status).toBe(400)
    const dataUrl = await createOrder(
      withSession(`${BASE}/orders`, a.token, {
        method: "POST",
        body: JSON.stringify({ ...ORDER_BODY, sample_image_url: "data:image/png;base64,AAAA" }),
      })
    )
    expect(dataUrl.status).toBe(400)

    const order = await newOrder(a)
    expect((await call(patchStage, a, order.id, { stage: "HACKED" }, "PATCH")).status).toBe(400)
    expect((await call(patchStage, a, order.id, { stage: "COMPLETED" }, "PATCH")).status).toBe(409)
    expect((await call(patchStage, a, order.id, { stage: "DISPATCHING" }, "PATCH")).status).toBe(409)
    expect((await call(getOrder, a, randomUUID(), undefined, "GET")).status).toBe(404)
  })

  it("ĐP-1.2 (26/09/2026): địa chỉ giao gửi MỘT CHUỖI (không chia tầng) → 400", async () => {
    const oneStringAddress = await createOrder(
      withSession(`${BASE}/orders`, a.token, {
        method: "POST",
        body: JSON.stringify({ ...ORDER_BODY, delivery_address: "123 Phố Huế, Hà Nội" }),
      })
    )
    expect(oneStringAddress.status).toBe(400)

    const missingTier = await createOrder(
      withSession(`${BASE}/orders`, a.token, {
        method: "POST",
        body: JSON.stringify({ ...ORDER_BODY, delivery_address: { street: "123 Phố Huế", city: "Hà Nội" } }),
      })
    )
    expect(missingTier.status).toBe(400)
  })

  it("ĐP-1.3 (26/09/2026): customerPhone không còn bị rơi, đọc lại được ở view", async () => {
    const order = await newOrder(a, ORDER_BODY)
    expect(order.customerPhone).toBe("0987654321")

    const fetched = await call(getOrder, a, order.id, undefined, "GET")
    expect(fetched.status).toBe(200)
    expect((await json(fetched)).order.customerPhone).toBe("0987654321")

    // Không gửi customerPhone (khách không cho số, hoặc đã chọn từ CMI) → chuỗi rỗng, không lỗi
    // lúc TẠO đơn (chỉ chặn lúc RỜI bước INTAKE, xem cổng 3.16). `undefined` để
    // JSON.stringify bỏ hẳn khoá, mô phỏng đúng "không gửi trường này".
    const withoutPhone = await newOrder(a, { ...ORDER_BODY, customer_phone: undefined })
    expect(withoutPhone.customerPhone).toBe("")
  })

  it("ĐP-1.7 (26/09/2026): ghi chú phân công cho đối tác tách khỏi ghi chú nội bộ", async () => {
    const order = await newOrder(a, { ...ORDER_BODY, internal_note: "Ghi chú riêng của điều phối, không cho xưởng xem" })
    const partner = await newPartner(a)
    await call(patchStage, a, order.id, { stage: "PLANNING" }, "PATCH")

    const res = await call(assignPartner, a, order.id, { partner_id: partner.id, notes: "Gói giấy lụa mờ, nơ đỏ" })
    expect(res.status).toBe(200)
    const view = (await json(res)).order

    expect(view.partnerInstruction).toBe("Gói giấy lụa mờ, nơ đỏ")
    // internalNote KHÔNG bị đổi bởi việc phân công — hai trường độc lập.
    expect(view.internalNote).toBe("Ghi chú riêng của điều phối, không cho xưởng xem")
  })

  // ĐP-2 (26/09/2026): nối Master Index thật vào Điều phối (Hợp đồng MI §5/§9).
  async function seedProduct(
    t: Tenant,
    over: { name?: string; priceVnd?: number; flowers?: Array<Record<string, unknown>> } = {}
  ): Promise<string> {
    const attributes: Record<string, unknown> = {
      price_vnd: over.priceVnd ?? 850000,
      bom: {
        flowers: over.flowers ?? [
          { name: "Hồng Ohara", quantity: 10, dvt_dem: "Cành", mau: "Kem", role: "Hoa chủ đạo" },
        ],
        foliage: [{ name: "Lá bạc", quantity: 5, dvt_dem: "Cành", mau: "Xanh bạc", role: "Điểm nhấn" }],
        wrapping: [{ layer: "Lớp ngoài", material: "Giấy Hàn", color: "Kem", texture: "Mờ" }],
        accessories: [{ name: "Thiệp mini", material: "Giấy", color: "Trắng", quantity: 1, printed_text: null }],
      },
    }
    const product = await prisma.products.create({
      data: {
        organization_id: t.organizationId,
        code: `SP-${randomUUID().slice(0, 8)}`,
        name: over.name ?? "Bó Hồng Ohara Kem",
        category: "Bó hoa",
        status: "ACTIVE",
        attributes: attributes as Prisma.InputJsonValue,
      },
    })
    return product.id
  }

  it("ĐP-2.6/2.7 (26/09/2026): tạo đơn có productId → snapshot Master Index (MI-5), không lộ costPriceVnd", async () => {
    const productId = await seedProduct(a)
    const order = await newOrder(a, { ...ORDER_BODY, product_id: productId })

    expect(order.productId).toBe(productId)
    expect(order.product).not.toBeNull()
    expect(order.product?.code).toMatch(/^SP-/)
    expect(order.product).not.toHaveProperty("costPriceVnd")
    expect(order.foliage).toEqual([{ name: "Lá bạc", quantity: 5, unit: "cành", color: "Xanh bạc", role: "Điểm nhấn" }])
    expect(order.wrapping).toEqual([{ layer: "Lớp ngoài", material: "Giấy Hàn", color: "Kem", texture: "Mờ" }])
    expect(order.accessories).toHaveLength(1)

    // Không productId → đơn mẫu ngoài danh mục, không có snapshot.
    const offCatalog = await newOrder(a)
    expect(offCatalog.productId).toBeNull()
    expect(offCatalog.product).toBeNull()
    expect(offCatalog.foliage).toEqual([])
  })

  it("ĐP-2.6: productId của tổ chức khác hoặc không tồn tại → 422, không tạo đơn", async () => {
    const productId = await seedProduct(b)
    const res = await createOrder(
      withSession(`${BASE}/orders`, a.token, { method: "POST", body: JSON.stringify({ ...ORDER_BODY, product_id: productId }) })
    )
    expect(res.status).toBe(422)

    const resMissing = await createOrder(
      withSession(`${BASE}/orders`, a.token, {
        method: "POST",
        body: JSON.stringify({ ...ORDER_BODY, product_id: randomUUID() }),
      })
    )
    expect(resMissing.status).toBe(422)
  })

  it("ĐP-2.8: Sales sửa số lượng/màu so với snapshot → ghi override có vết, không âm thầm ghi đè", async () => {
    const productId = await seedProduct(a)
    const order = await newOrder(a, {
      ...ORDER_BODY,
      product_id: productId,
      flowers: [{ flowerName: "Hồng Ohara", quantity: 20, unit: "cành", color: "Hồng phấn", role: "Chủ đạo" }],
    })
    const item = await prisma.order_items.findFirst({ where: { order_id: order.id } })
    const meta = item?.metadata as Record<string, unknown>
    const overrides = meta.overrides as Array<Record<string, unknown>>
    expect(overrides.some((o) => o.path === "bom.flowers[Hồng Ohara].quantity" && o.masterValue === 10 && o.orderValue === 20)).toBe(true)
    expect(overrides.some((o) => o.path === "bom.flowers[Hồng Ohara].color")).toBe(true)
  })

  it("ĐP-2.9 (26/09/2026): có customerId → tên/hạng/SĐT lấy từ Customer Master Index, bỏ qua giá trị client gửi", async () => {
    const customer = await prisma.customers.create({
      data: {
        organization_id: a.organizationId,
        code: `KH-${randomUUID().slice(0, 8)}`,
        name: "Lê Thị Hồng Từ CMI",
        phone: "0911222333",
        tier: "VIP",
      },
    })
    const order = await newOrder(a, {
      ...ORDER_BODY,
      customer_id: customer.id,
      customer_name: "Tên giả client tự gõ",
      customer_tier: "NEW",
      customer_phone: "0000000000",
    })
    expect(order.customerName).toBe("Lê Thị Hồng Từ CMI")
    expect(order.customerTier).toBe("VIP")
    expect(order.customerPhone).toBe("0911222333")
  })

  it("ĐP-2.9: customerId không tồn tại (hoặc của tổ chức khác) → 422", async () => {
    const customer = await prisma.customers.create({
      data: { organization_id: b.organizationId, code: `KH-${randomUUID().slice(0, 8)}`, name: "Khách bên B", phone: "0900000001" },
    })
    const res = await createOrder(
      withSession(`${BASE}/orders`, a.token, { method: "POST", body: JSON.stringify({ ...ORDER_BODY, customer_id: customer.id }) })
    )
    expect(res.status).toBe(422)
  })

  it("ĐP-2.13: unit/role ngoài danh mục DemUnit/vai trò hoa → 400", async () => {
    const res = await createOrder(
      withSession(`${BASE}/orders`, a.token, {
        method: "POST",
        body: JSON.stringify({
          ...ORDER_BODY,
          flowers: [{ flowerName: "Hồng Ohara", quantity: 10, unit: "nhánh", color: "Kem", role: "Chủ đạo" }],
        }),
      })
    )
    expect(res.status).toBe(400)
  })

  it("luồng đủ P1→P7: kế hoạch → phân công → cắm → QC đạt → giao có POD → đóng đơn", async () => {
    const { order, imageId } = await toQualityCheck(a)
    expect(order.stage).toBe("QUALITY_CHECK")
    expect(order.productionProgress).toBe(100)
    expect(order.finishedImageUrls).toHaveLength(1)

    // Chưa QC đạt thì không giao được.
    expect((await call(delivery, a, order.id, { event: "PICKED_UP", shipperName: "Bình" })).status).toBe(422)

    const passed = (await json(await call(qc, a, order.id, { decision: "PASSED" })))
    expect(passed.order.stage).toBe("DISPATCHING")
    expect(passed.order.qc?.status).toBe("PASSED")
    expect(passed.order.qc?.aiScore).toBeNull()
    const qcRow = await prisma.order_qc_records.findFirst({ where: { order_id: order.id } })
    expect(qcRow?.image_asset_ids).toEqual([imageId])

    expect((await call(delivery, a, order.id, { event: "PICKED_UP", shipperName: "Bình", carrier: "AhaMove" })).status).toBe(200)
    expect((await call(delivery, a, order.id, { event: "ON_THE_WAY", shipperName: "Bình" })).status).toBe(200)
    // Không lùi trạng thái giao.
    expect((await call(delivery, a, order.id, { event: "PICKED_UP", shipperName: "Bình" })).status).toBe(422)
    // Thiếu POD → 422.
    expect((await call(delivery, a, order.id, { event: "DELIVERED_SUCCESS", shipperName: "Bình" })).status).toBe(422)

    const pod = await seedAsset(a.ctx)
    const delivered = (await json(
      await call(delivery, a, order.id, { event: "DELIVERED_SUCCESS", shipper_name: "Bình", pod_asset_id: pod, recipient_signed_name: "Lan" })
    ))
    expect(delivered.order.stage).toBe("DELIVERED")
    expect(delivered.order.delivery.podImageUrl).toBeTruthy()
    expect(delivered.order.delivery.carrier).toBe("AhaMove")

    // Còn nợ thì chưa hoàn tất (PO 04/11/2026, checklist ALG 4.26); thu đủ rồi mới đóng
    expect((await call(closeOrder, a, order.id, { partnerRating: 5, partnerPayoutVnd: 350000 })).status).toBe(422)
    const due = Number((await prisma.orders.findUniqueOrThrow({ where: { id: order.id } })).balance_vnd)
    if (due > 0) expect((await call(recordOrderPayment, a, order.id, { kind: "BALANCE", amountVnd: due, paymentMethod: "CASH" })).status).toBe(201)

    const closed = (await json(await call(closeOrder, a, order.id, { partner_rating: 5, partner_payout_vnd: 350000 })))
    expect(closed.order.stage).toBe("COMPLETED")
    expect(closed.order.partnerPayoutVnd).toBe(350000)

    const row = await prisma.orders.findUnique({ where: { id: order.id } })
    expect(row).toMatchObject({ status: "COMPLETED", production_status: "READY", delivery_status: "DELIVERED" })

    // Chuỗi order_events đủ để M10 đo SLA; audit_logs có từng thao tác.
    const axes = await prisma.order_events.findMany({ where: { order_id: order.id }, orderBy: { created_at: "asc" } })
    expect(axes.some((e) => e.axis === "delivery" && e.to_value === "DELIVERED")).toBe(true)
    const actions = (await prisma.audit_logs.findMany({ where: { entity_id: order.id } })).map((l) => l.action)
    expect(actions).toEqual(
      expect.arrayContaining([
        "coordinator.order.create",
        "coordinator.partner.assign",
        "coordinator.production.update",
        "coordinator.qc.record",
        "coordinator.delivery.update",
        "coordinator.order.close",
      ])
    )

    // Đơn đã đóng thì không đi đâu nữa.
    expect((await call(patchStage, a, order.id, { stage: "DELIVERED" }, "PATCH")).status).toBe(409)
    expect((await call(cancelOrder, a, order.id, { reason: "x" })).status).toBe(422)
  })

  it("QC yêu cầu làm lại → quay về IN_PRODUCTION, bắt buộc lý do", async () => {
    const { order } = await toQualityCheck(a)
    expect((await call(qc, a, order.id, { decision: "REWORK_REQUESTED" })).status).toBe(422)
    const rework = (await json(await call(qc, a, order.id, { decision: "REWORK_REQUESTED", notes: "Nơ lệch màu" })))
    expect(rework.order.stage).toBe("IN_PRODUCTION")
    expect(rework.order.productionProgress).toBe(0)
  })

  it("sự cố: mở → đơn về EXCEPTION giữ nguyên trục giao; xử lý xong → tự về đúng bước cũ; chưa xử lý thì không đóng", async () => {
    const { order } = await toQualityCheck(a)
    await call(qc, a, order.id, { decision: "PASSED" })
    await call(delivery, a, order.id, { event: "PICKED_UP", shipper_name: "Bình" })

    const failed = (await json(
      await call(delivery, a, order.id, { event: "DELIVERY_FAILED", shipper_name: "Bình", failure_reason: "Người nhận không nghe máy" })
    ))
    expect(failed.order.stage).toBe("EXCEPTION")
    expect(failed.order.hasException).toBe(true)
    expect(failed.order.riskLevel).toBe("CRITICAL")
    const exc = failed.order.exceptions[0]!
    expect(exc.type).toBe("DELIVERY_FAILURE")
    expect(exc.code).toBe(`EXC-${order.orderCode}-01`)
    const row = await prisma.orders.findUnique({ where: { id: order.id } })
    expect(row?.delivery_status).toBe("FAILED")

    // Không thoát EXCEPTION bằng đường tắt khi còn sự cố mở.
    expect((await call(patchStage, a, order.id, { stage: "DISPATCHING" }, "PATCH")).status).toBe(409)
    // Tổ chức khác không xử lý hộ được.
    expect((await call(resolveException, b, exc.id, { resolution: "x" })).status).toBe(404)

    const resolved = (await json(await call(resolveException, a, exc.id, { resolution: "Hẹn giao lại 18:00" })))
    expect(resolved.order.stage).toBe("DISPATCHING")
    expect(resolved.order.hasException).toBe(false)
    expect((await call(resolveException, a, exc.id, { resolution: "lần hai" })).status).toBe(409)
  })

  it("mở sự cố đồng thời trên một đơn: 201 hoặc 409, không bao giờ 500", async () => {
    const order = await newOrder(a)
    const results = await Promise.all(
      Array.from({ length: 4 }, (_, i) =>
        call(openException, a, order.id, { type: "CUSTOMER_CHANGE", description: `Khách đổi lần ${i}` })
      )
    )
    const statuses = results.map((r) => r.status)
    expect(statuses.every((st) => st === 201 || st === 409)).toBe(true)
    expect(statuses).toContain(201)
    const codes = (await prisma.order_exceptions.findMany({ where: { order_id: order.id } })).map((e) => e.code)
    expect(new Set(codes).size).toBe(codes.length)
  })

  it("huỷ đơn: bắt buộc lý do, gác bằng R6 (trần cứng điều hành)", async () => {
    const order = await newOrder(a)
    expect((await call(cancelOrder, a, order.id, { reason: "" })).status).toBe(400)
    const cancelled = (await json(await call(cancelOrder, a, order.id, { reason: "Khách huỷ" })))
    expect(cancelled.order.stage).toBe("CANCELLED")
    expect(cancelled.order.cancelledReason).toBe("Khách huỷ")
    expect((await prisma.orders.findUnique({ where: { id: order.id } }))?.status).toBe("CANCELLED")
  })

  it("đối tác: trùng mã → 409, tạm ngưng thì không nhận đơn, quá công suất ngày → 422", async () => {
    await newPartner(a, "XUONG-A")
    const dup = await createPartner(
      withSession(`${BASE}/partners`, a.token, {
        method: "POST",
        body: JSON.stringify({ code: "XUONG-A", name: "Trùng", phone: "0912345678" }),
      })
    )
    expect(dup.status).toBe(409)

    const small = await newPartner(a, "XUONG-NHO", 1)
    const o1 = await newOrder(a)
    const o2 = await newOrder(a)
    for (const o of [o1, o2]) await call(patchStage, a, o.id, { stage: "PLANNING" }, "PATCH")
    expect((await call(assignPartner, a, o1.id, { partnerId: small.id })).status).toBe(200)
    expect((await call(assignPartner, a, o2.id, { partnerId: small.id })).status).toBe(422)
    expect((await call(assignPartner, a, o2.id, { partnerId: small.id, overrideCapacity: true })).status).toBe(200)

    const paused = await newPartner(a, "XUONG-NGHI")
    expect((await call(patchPartner, a, paused.id, { isActive: false }, "PATCH")).status).toBe(200)
    const o3 = await newOrder(a)
    await call(patchStage, a, o3.id, { stage: "PLANNING" }, "PATCH")
    expect((await call(assignPartner, a, o3.id, { partnerId: paused.id })).status).toBe(422)
  })

  it("bảng công tắc tắt R5 cho điều hành → cập nhật giao hàng trả 403", async () => {
    const { order } = await toQualityCheck(a)
    await call(qc, a, order.id, { decision: "PASSED" })
    const membership = await prisma.memberships.findFirst({ where: { organization_id: a.organizationId, user_id: a.userId } })
    await prisma.capability_overrides.create({
      data: {
        organization_id: a.organizationId,
        role_id: membership!.role_id,
        capability_code: "R5",
        allowed: false,
        updated_by: a.userId,
      },
    })
    expect((await call(delivery, a, order.id, { event: "PICKED_UP", shipperName: "Bình" })).status).toBe(403)
  })

  // ── ĐP-4a (26/09/2026, PO D2) — Sổ thu ───────────────────────────────────

  it("sổ thu: cọc rồi thu nốt → paidVnd/balanceVnd/paymentStatus đúng, khớp DB", async () => {
    const order = await newOrder(a, { ...ORDER_BODY, unit_price_vnd: 1_000_000 })
    expect(order.paidVnd).toBe(0)
    expect(order.balanceVnd).toBe(1_000_000)
    expect(order.paymentStatus).toBe("UNPAID")

    const deposit = await json(
      await call(recordOrderPayment, a, order.id, { kind: "DEPOSIT", amount_vnd: 500_000, payment_method: "CASH" })
    )
    expect(deposit.order.paidVnd).toBe(500_000)
    expect(deposit.order.balanceVnd).toBe(500_000)
    expect(deposit.order.paymentStatus).toBe("PARTIALLY_PAID")

    const balance = await json(
      await call(recordOrderPayment, a, order.id, { kind: "BALANCE", amount_vnd: 500_000, reference: "VCB-001" })
    )
    expect(balance.order.paidVnd).toBe(1_000_000)
    expect(balance.order.balanceVnd).toBe(0)
    expect(balance.order.paymentStatus).toBe("PAID")

    // Đọc lại thẳng từ DB — không suy từ giá trị response cũ còn giữ trong bộ nhớ.
    const row = await prisma.orders.findUnique({ where: { id: order.id } })
    expect(Number(row?.paid_vnd)).toBe(1_000_000)
    expect(Number(row?.balance_vnd)).toBe(0)

    const list = await json(await call(listOrderPayments, a, order.id, undefined, "GET"))
    expect(list.payments).toHaveLength(2)
    expect(list.payments.map((p) => p.kind)).toEqual(["DEPOSIT", "BALANCE"])
    expect(list.payments[1]?.reference).toBe("VCB-001")
  })

  it("sổ thu: cách ly tổ chức — tổ chức khác không đọc/ghi được", async () => {
    const order = await newOrder(a)
    expect((await call(recordOrderPayment, b, order.id, { kind: "DEPOSIT", amountVnd: 100_000 })).status).toBe(404)
    expect((await call(listOrderPayments, b, order.id, undefined, "GET")).status).toBe(404)
  })

  it("sổ thu: hoàn tiền không được vượt số đã thu (422), REFUND gác bằng R10 (trần cứng điều hành)", async () => {
    const order = await newOrder(a, { ...ORDER_BODY, unit_price_vnd: 500_000 })
    await call(recordOrderPayment, a, order.id, { kind: "DEPOSIT", amount_vnd: 500_000 })

    expect((await call(recordOrderPayment, a, order.id, { kind: "REFUND", amountVnd: 600_000 })).status).toBe(422)

    const refunded = await json(await call(recordOrderPayment, a, order.id, { kind: "REFUND", amount_vnd: 500_000 }))
    expect(refunded.order.paidVnd).toBe(0)
    expect(refunded.order.paymentStatus).toBe("REFUNDED")

    const membership = await prisma.memberships.findFirst({ where: { organization_id: a.organizationId, user_id: a.userId } })
    await prisma.capability_overrides.create({
      data: {
        organization_id: a.organizationId,
        role_id: membership!.role_id,
        capability_code: "R10",
        allowed: false,
        updated_by: a.userId,
      },
    })
    expect((await call(recordOrderPayment, a, order.id, { kind: "REFUND", amountVnd: 1 })).status).toBe(403)
    // R9 (ghi DEPOSIT/BALANCE) không bị ảnh hưởng bởi việc tắt R10.
    expect((await call(recordOrderPayment, a, order.id, { kind: "DEPOSIT", amountVnd: 1 })).status).toBe(201)
  })

  // Audit BL-05 (06/11/2026): sổ thu Điều phối từng không chặn thu vượt / đơn huỷ, và ghi `paid_vnd`
  // tuyệt đối tính từ lần đọc — hai lượt đồng thời mất một khoản. Nay chung luật `planPayment` + khoá lạc quan.
  it("sổ thu: thu vượt phần còn phải thu hoặc thu vào đơn đã huỷ → 422, sổ không đổi", async () => {
    const order = await newOrder(a, { ...ORDER_BODY, unit_price_vnd: 500_000 })
    expect((await call(recordOrderPayment, a, order.id, { kind: "DEPOSIT", amountVnd: 500_001 })).status).toBe(422)
    await prisma.orders.update({ where: { id: order.id }, data: { status: "CANCELLED" } })
    expect((await call(recordOrderPayment, a, order.id, { kind: "DEPOSIT", amountVnd: 100_000 })).status).toBe(422)
    expect(await prisma.order_payments.count({ where: { order_id: order.id } })).toBe(0)
    expect(Number((await prisma.orders.findUniqueOrThrow({ where: { id: order.id } })).paid_vnd)).toBe(0)
  })

  it("sổ thu: hai lượt thu đồng thời → paid_vnd luôn bằng tổng sổ, lượt thua (nếu có) nhận 409", async () => {
    const order = await newOrder(a, { ...ORDER_BODY, unit_price_vnd: 1_000_000 })
    const results = await Promise.all([
      call(recordOrderPayment, a, order.id, { kind: "DEPOSIT", amount_vnd: 400_000 }),
      call(recordOrderPayment, a, order.id, { kind: "DEPOSIT", amount_vnd: 400_000 }),
    ])
    for (const r of results) expect([201, 409]).toContain(r.status)
    const row = await prisma.orders.findUniqueOrThrow({ where: { id: order.id } })
    const confirmed = await prisma.order_payments.findMany({ where: { order_id: order.id, status: "CONFIRMED" } })
    const ledger = confirmed.reduce((sum, p) => sum + Number(p.amount_vnd), 0)
    expect(confirmed).toHaveLength(results.filter((r) => r.status === 201).length)
    expect(Number(row.paid_vnd)).toBe(ledger)
    expect(Number(row.balance_vnd)).toBe(1_000_000 - ledger)
  })

  // PO 07/11/2026 — Q11: không tạo đơn với ngày giao đã qua; Q12: SĐT người nhận chỉ số Việt Nam.
  it("tạo đơn Điều phối: hẹn giao hôm qua hoặc SĐT người nhận nước ngoài → 400, không tạo đơn", async () => {
    const post = (body: Record<string, unknown>) =>
      createOrder(withSession(`${BASE}/orders`, a.token, { method: "POST", body: JSON.stringify(body) }))
    const yesterday = new Date(Date.now() - 36 * 3600_000).toISOString()
    expect((await post({ ...ORDER_BODY, deliveryTargetAt: yesterday })).status).toBe(400)
    expect((await post({ ...ORDER_BODY, recipientPhone: "+1 415 555 0100" })).status).toBe(400)
    expect(await prisma.orders.count({ where: { organization_id: a.organizationId } })).toBe(0)
    expect((await post({ ...ORDER_BODY, recipientPhone: "0901 234 567" })).status).toBe(201)
  })

  it("order_info_requests: cách ly tổ chức — tổ chức B không thấy yêu cầu thông tin của tổ chức A", async () => {
    const orderA = await newOrder(a)
    await prisma.order_info_requests.create({
      data: {
        organization_id: a.organizationId,
        order_id: orderA.id,
        missing_field: "deliveryAddress",
        field_label: "Địa chỉ giao hàng",
        reason: "Khách chưa gửi địa chỉ",
        requested_from: "Zalo khách",
        requested_by: a.userId,
      },
    })

    const reqsB = await prisma.order_info_requests.findMany({
      where: { organization_id: b.organizationId },
    })
    expect(reqsB).toHaveLength(0)

    const reqsA = await prisma.order_info_requests.findMany({
      where: { organization_id: a.organizationId },
    })
    expect(reqsA).toHaveLength(1)
    expect(reqsA[0]!.order_id).toBe(orderA.id)
  })

  it("order_change_requests: cách ly tổ chức — tổ chức B không thấy yêu cầu thay đổi của tổ chức A", async () => {
    const orderA = await newOrder(a)
    await prisma.order_change_requests.create({
      data: {
        organization_id: a.organizationId,
        order_id: orderA.id,
        requested_by: a.userId,
        change_type: "CARD_MESSAGE",
        field_changed: "cardMessage",
        old_value: "Chúc mừng",
        new_value: "Sinh nhật vui vẻ",
        reason: "Khách đổi ý",
      },
    })

    const reqsB = await prisma.order_change_requests.findMany({
      where: { organization_id: b.organizationId },
    })
    expect(reqsB).toHaveLength(0)

    const reqsA = await prisma.order_change_requests.findMany({
      where: { organization_id: a.organizationId },
    })
    expect(reqsA).toHaveLength(1)
    expect(reqsA[0]!.order_id).toBe(orderA.id)
  })
})
