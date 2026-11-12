import { afterAll, beforeEach, describe, expect, it } from "vitest"

import { POST as createOrder } from "@/app/api/v1/orders/route"
import { POST as assignFloristRoute } from "@/app/api/v1/orders/[id]/assign/route"
import { POST as createCustomer } from "@/app/api/v1/crm/customers/route"
import { POST as postConsent } from "@/app/api/v1/crm/customers/[id]/consent/route"
import { GET as getTemplateOverrides, PUT as putTemplateOverride } from "@/app/api/v1/template-overrides/route"
// @release-strip — route/mô-đun không có trong bản giao GD1; phần còn lại của test vẫn chạy trên bản cắt
import { DELETE as deleteTemplateOverride } from "@/app/api/v1/template-overrides/[templateKey]/[fieldKey]/route"
// @release-strip-end
import { POST as issueToken } from "@/app/api/v1/integration-tokens/route"
import { POST as postContentMetrics } from "@/app/api/v1/integration/content-metrics/route"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, readJson, withBearer, withSession, type Tenant } from "../helpers/fixtures"

const BASE = "http://localhost/api/v1"

/**
 * RS-2 (soát 18/09, `RA_SOAT_DONG_BO_18_09.md` + `QUYET_DINH_RS_18_09.md`) —
 * bốn bảng tenant có route thật đang chạy nhưng CHƯA từng có ca thử cách ly
 * nào: `order_assignments`, `customer_consents`, `template_overrides`,
 * `content_metrics`.
 *
 * Bốn bảng schema khác mà `check-docs.mjs` cũng gắn cờ bị CỐ Ý bỏ khỏi tệp
 * này: đọc mã cho thấy chưa có route/use-case THẬT nào ghi vào chúng (biến
 * thể + ảnh sản phẩm và tồn kho theo chi nhánh — xem chú thích trong
 * `product-master-index-repository.ts` và nợ #95 — cùng bảng phiếu giảm giá,
 * mới chỉ có đọc lồng qua khách hàng, chưa có lối tạo/sửa). Viết ca thử cho
 * một bảng không có đường ghi nào là thử một thứ không tồn tại; danh sách
 * miễn trừ tường minh cho bốn bảng này nằm ở `scripts/check-docs.mjs`
 * (biến `SCHEMA_ONLY_CHUA_NOI`), không phải bỏ sót.
 */
describe("cách ly tenant — bổ sung RS-2 (order_assignments, customer_consents, template_overrides, content_metrics)", () => {
  let a: Tenant
  let b: Tenant

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("alpha")
    b = await createTenant("beta")
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("POST /orders/:id/assign của tổ chức khác trả 404, không tạo được order_assignments trên đơn của A", async () => {
    const created = await readJson(
      await createOrder(
        withSession(`${BASE}/orders`, a.token, {
          method: "POST",
          body: JSON.stringify({
            items: [{ description: "Bó hoa hướng dương", quantity: 1, unitPriceVnd: 300000 }],
          }),
        })
      )
    )
    const orderId = (created as { order: { id: string } }).order.id

    const resAssignB = await assignFloristRoute(
      withSession(`${BASE}/orders/${orderId}/assign`, b.token, {
        method: "POST",
        body: JSON.stringify({ assigneeId: b.userId }),
      }),
      { params: Promise.resolve({ id: orderId }) }
    )
    expect(resAssignB.status).toBe(404)

    const assignmentsAfterB = await prisma.order_assignments.findMany({ where: { order_id: orderId } })
    expect(assignmentsAfterB).toHaveLength(0)

    const resAssignA = await assignFloristRoute(
      withSession(`${BASE}/orders/${orderId}/assign`, a.token, {
        method: "POST",
        body: JSON.stringify({ assigneeId: a.userId }),
      }),
      { params: Promise.resolve({ id: orderId }) }
    )
    expect(resAssignA.status).toBe(200)
    const assignedOrder = (await readJson(resAssignA)) as { order: { productionStatus: string } }
    expect(assignedOrder.order.productionStatus).toBe("ASSIGNED")

    const assignmentsAfterA = await prisma.order_assignments.findMany({ where: { order_id: orderId } })
    expect(assignmentsAfterA).toHaveLength(1)
    expect(assignmentsAfterA[0]?.organization_id).toBe(a.organizationId)
  })

  it("POST /crm/customers/:id/consent của tổ chức khác trả 404, không ghi được customer_consents trên khách của A", async () => {
    const created = await readJson(
      await createCustomer(
        withSession(`${BASE}/crm/customers`, a.token, {
          method: "POST",
          body: JSON.stringify({ name: "Anh Minh", phone: "0912345678" }),
        })
      )
    )
    const customerId = (created as { customer: { id: string } }).customer.id

    const resConsentB = await postConsent(
      withSession(`${BASE}/crm/customers/${customerId}/consent`, b.token, {
        method: "POST",
        body: JSON.stringify({ channel: "ZALO_ZNS", granted: true }),
      }),
      { params: Promise.resolve({ id: customerId }) }
    )
    expect(resConsentB.status).toBe(404)

    const consentsAfterB = await prisma.customer_consents.findMany({ where: { customer_id: customerId } })
    expect(consentsAfterB).toHaveLength(0)

    const resConsentA = await postConsent(
      withSession(`${BASE}/crm/customers/${customerId}/consent`, a.token, {
        method: "POST",
        body: JSON.stringify({ channel: "ZALO_ZNS", granted: true }),
      }),
      { params: Promise.resolve({ id: customerId }) }
    )
    expect(resConsentA.status).toBe(200)

    const consentsAfterA = await prisma.customer_consents.findMany({ where: { customer_id: customerId } })
    expect(consentsAfterA).toHaveLength(1)
    expect(consentsAfterA[0]?.organization_id).toBe(a.organizationId)
  })

  it("PUT/GET/DELETE /template-overrides không đọc, không đè, không xoá được ghi đè của tổ chức khác", async () => {
    const resPutA = await putTemplateOverride(
      withSession(`${BASE}/template-overrides`, a.token, {
        method: "PUT",
        body: JSON.stringify({
          templateFamily: "GT",
          templateKey: "loi-chuc-sinh-nhat",
          fieldKey: "tieu_de",
          value: "Chúc mừng sinh nhật từ Tiệm hoa alpha",
        }),
      })
    )
    expect(resPutA.status).toBe(200)

    // B liệt kê cùng templateKey — không thấy ghi đè của A.
    const resListB = await getTemplateOverrides(
      withSession(`${BASE}/template-overrides?templateKey=loi-chuc-sinh-nhat`, b.token)
    )
    const listB = (await readJson(resListB)) as { data: unknown[] }
    expect(listB.data).toEqual([])

    // B tự ghi đè CÙNG khoá — không được đụng vào dòng của A.
    const resPutB = await putTemplateOverride(
      withSession(`${BASE}/template-overrides`, b.token, {
        method: "PUT",
        body: JSON.stringify({
          templateFamily: "GT",
          templateKey: "loi-chuc-sinh-nhat",
          fieldKey: "tieu_de",
          value: "Chúc mừng sinh nhật từ Tiệm hoa beta",
        }),
      })
    )
    expect(resPutB.status).toBe(200)

    const rowsAfterBoth = await prisma.template_overrides.findMany({
      where: { template_key: "loi-chuc-sinh-nhat", field_key: "tieu_de" },
    })
    expect(rowsAfterBoth).toHaveLength(2)
    const forA = rowsAfterBoth.find((r) => r.organization_id === a.organizationId)
    const forB = rowsAfterBoth.find((r) => r.organization_id === b.organizationId)
    expect(forA?.value).toBe("Chúc mừng sinh nhật từ Tiệm hoa alpha")
    expect(forB?.value).toBe("Chúc mừng sinh nhật từ Tiệm hoa beta")

    // @release-strip
    // B xoá đúng khoá đó — chỉ xoá dòng của B, dòng của A còn nguyên.
    const resDeleteB = await deleteTemplateOverride(
      withSession(`${BASE}/template-overrides/loi-chuc-sinh-nhat/tieu_de`, b.token, { method: "DELETE" }),
      { params: Promise.resolve({ templateKey: "loi-chuc-sinh-nhat", fieldKey: "tieu_de" }) }
    )
    expect(resDeleteB.status).toBe(200)

    const rowsAfterDeleteB = await prisma.template_overrides.findMany({
      where: { template_key: "loi-chuc-sinh-nhat", field_key: "tieu_de" },
    })
    expect(rowsAfterDeleteB).toHaveLength(1)
    expect(rowsAfterDeleteB[0]?.organization_id).toBe(a.organizationId)

    // B xoá lại lần nữa (đã hết dòng của B) — 404, không đụng dòng của A.
    const resDeleteBAgain = await deleteTemplateOverride(
      withSession(`${BASE}/template-overrides/loi-chuc-sinh-nhat/tieu_de`, b.token, { method: "DELETE" }),
      { params: Promise.resolve({ templateKey: "loi-chuc-sinh-nhat", fieldKey: "tieu_de" }) }
    )
    expect(resDeleteBAgain.status).toBe(404)
    // @release-strip-end
  })

  it("POST /integration/content-metrics — cùng platform/content_id/metric_date của hai tổ chức ghi thành HAI dòng riêng, không đè lên nhau", async () => {
    const tokenA = ((await readJson(
      await issueToken(
        withSession(`${BASE}/integration-tokens`, a.token, {
          method: "POST",
          body: JSON.stringify({ client: "SOCIALFLOW" }),
        })
      )
    )) as { token: string }).token
    const tokenB = ((await readJson(
      await issueToken(
        withSession(`${BASE}/integration-tokens`, b.token, {
          method: "POST",
          body: JSON.stringify({ client: "SOCIALFLOW" }),
        })
      )
    )) as { token: string }).token

    const body = JSON.stringify({
      platform: "facebook",
      content_id: "bai-dang-chung-01",
      metric_date: "2026-09-18",
      reach: 100,
    })

    const resA = await postContentMetrics(withBearer(`${BASE}/integration/content-metrics`, tokenA, { method: "POST", body }))
    expect(resA.status).toBe(201)
    const resB = await postContentMetrics(
      withBearer(`${BASE}/integration/content-metrics`, tokenB, {
        method: "POST",
        body: JSON.stringify({ platform: "facebook", content_id: "bai-dang-chung-01", metric_date: "2026-09-18", reach: 999 }),
      })
    )
    expect(resB.status).toBe(201)

    const rows = await prisma.content_metrics.findMany({
      where: { platform: "facebook", content_id: "bai-dang-chung-01" },
    })
    expect(rows).toHaveLength(2)
    const rowA = rows.find((r) => r.organization_id === a.organizationId)
    const rowB = rows.find((r) => r.organization_id === b.organizationId)
    expect(rowA?.reach).toBe(100)
    expect(rowB?.reach).toBe(999)
  })
})
