import { afterAll, beforeEach, describe, expect, it } from "vitest"

import {
  eraseForCustomer,
  exportForCustomer,
  listDataSubjectRequests,
  receiveRectification,
  resolveDataSubjectRequest,
} from "@/modules/crm/use-cases/data-subject-requests"

import { disconnectDatabase, prisma, resetDatabase } from "../helpers/database"
import { createTenant, type Tenant } from "../helpers/fixtures"

/**
 * ADR-014 D-P5, bước P-7a — cách ly tổ chức của `data_subject_requests` ở tầng use-case (bản giao GD1 chưa có route
 * yêu cầu dữ liệu cá nhân nên ca thử qua route nằm ở `data-subject-requests.test.ts`). Khách hoặc yêu cầu của tổ chức
 * khác → 404, không đổi gì; danh sách chỉ thấy yêu cầu của mình.
 */
describe("data_subject_requests — cách ly tổ chức", () => {
  let a: Tenant
  let b: Tenant
  let customerId: string

  beforeEach(async () => {
    await resetDatabase()
    a = await createTenant("yeu-cau-cach-ly-a")
    b = await createTenant("yeu-cau-cach-ly-b")
    customerId = (await prisma.customers.create({ data: { organization_id: a.organizationId, code: "KH-1", name: "Chị Lan", phone: "0100000001" } })).id
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  it("tổ chức khác không xuất, không xoá, không ghi nhận được khách của mình", async () => {
    await expect(exportForCustomer(b.ctx, customerId, null)).rejects.toMatchObject({ code: "NOT_FOUND" })
    await expect(eraseForCustomer(b.ctx, customerId, null)).rejects.toMatchObject({ code: "NOT_FOUND" })
    await expect(receiveRectification(b.ctx, customerId, null)).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect((await prisma.customers.findUniqueOrThrow({ where: { id: customerId } })).name).toBe("Chị Lan")
    expect(await prisma.data_subject_requests.count()).toBe(0)
  })

  it("danh sách và đóng yêu cầu chỉ trong tổ chức của mình", async () => {
    const pending = await receiveRectification(a.ctx, customerId, "đổi địa chỉ")
    expect(await listDataSubjectRequests(a.ctx, {})).toHaveLength(1)
    expect(await listDataSubjectRequests(b.ctx, {})).toHaveLength(0)
    await expect(resolveDataSubjectRequest(b.ctx, pending.id, { status: "COMPLETED", note: null })).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect((await resolveDataSubjectRequest(a.ctx, pending.id, { status: "COMPLETED", note: null })).status).toBe("COMPLETED")
  })
})
