import { beforeEach, describe, expect, it, vi } from "vitest"
import type { TenantContext } from "@/core/tenancy"
import * as XLSX from "xlsx"

const findMany = vi.fn()
const findOrganization = vi.fn()
vi.mock("@/core/tenancy/infra/prisma", () => ({
  prisma: {
    orders: {
      findMany: (...a: unknown[]) => findMany(...a),
    },
    organizations: {
      findUnique: (...a: unknown[]) => findOrganization(...a),
    },
  },
}))

import { exportOrdersToExcel } from "./export-orders"

const ctx: TenantContext = {
  organizationId: "org-test-1",
  userId: "user-1",
  workspaceId: "ws-1",
  branchId: "br-1",
  capabilities: new Set(["R1"]),
}

describe("exportOrdersToExcel", () => {
  beforeEach(() => {
    findMany.mockReset()
    findOrganization.mockReset()
    findOrganization.mockResolvedValue({ id: "org-test-1", name: "Tiệm", slug: "tiem", type: "STORE", credit_balance: 0, settings: null })
  })

  it("sale chế độ 'chỉ khách của mình' chỉ xuất đơn mình phụ trách (checklist ALG 4.10)", async () => {
    findOrganization.mockResolvedValue({
      id: "org-test-1", name: "Tiệm", slug: "tiem", type: "STORE", credit_balance: 0,
      settings: { brochure_visibility: { mode: "OWN", members: {} } },
    })
    findMany.mockResolvedValue([])
    await exportOrdersToExcel({ ...ctx, userId: "sale-1", capabilities: new Set(["R1", "R13"]) }, {})
    const where = (findMany.mock.calls[0]![0] as { where: Record<string, unknown> }).where
    expect(where.organization_id).toBe("org-test-1")
    expect(where.OR).toEqual([
      { greeting_sessions: { some: { sale_id: "sale-1" } } },
      { owner_sale_id: "sale-1" },
      { owner_sale_id: null, created_by: "sale-1", source: { not: "BROCHURE" } },
    ])
  })

  it("người thấy tất cả (Điều hành) xuất toàn bộ đơn của tổ chức", async () => {
    findMany.mockResolvedValue([])
    await exportOrdersToExcel({ ...ctx, capabilities: new Set(["R1", "R13", "F2"]) }, {})
    const where = (findMany.mock.calls[0]![0] as { where: Record<string, unknown> }).where
    expect(where.OR).toBeUndefined()
  })

  it("xuất file Excel thành công với cấu trúc các sheet đúng quy chuẩn", async () => {
    findMany.mockResolvedValue([
      {
        id: "ord-1",
        code: "DH-0001",
        source: "BROCHURE",
        status: "CONFIRMED",
        production_status: "ARRANGING",
        delivery_status: "PENDING",
        total_vnd: 500000,
        paid_vnd: 200000,
        balance_vnd: 300000,
        card_message: "Chúc mừng sinh nhật",
        internal_note: "Giao trước 10h",
        created_at: new Date("2026-10-01T08:00:00Z"),
        delivery_address: { street: "123 Lê Lợi", district: "Quận 1", city: "TP.HCM" },
        delivery_window: { date: "2026-10-02", timeSlot: "09:00 - 11:00" },
        customer: { name: "Nguyễn Văn A", phone: "0901234567" },
        items: [
          {
            id: "item-1",
            product_id: "SP-01",
            description: "Bó hồng đỏ 20 bông",
            quantity: 1,
            unit_price_vnd: 500000,
          },
        ],
        payments: [
          {
            id: "pay-1",
            kind: "COLLECT",
            amount_vnd: 200000,
            payment_method: "BANK_TRANSFER",
            reference: "MB-12345",
            collected_at: new Date("2026-10-01T08:30:00Z"),
            collected_by: "sale-1",
            note: "Cọc 40%",
          },
        ],
        greeting_sessions: [
          {
            id: "ses-1",
            send_code: "ABCXYZ",
            sale_id: "sale-1",
            customer_name: "Nguyễn Văn A",
            customer_phone: "0901234567",
            status: "ORDER_CREATED",
          },
        ],
      },
    ])

    const buffer = await exportOrdersToExcel(ctx, { source: "BROCHURE" })
    expect(buffer).toBeInstanceOf(Uint8Array)
    expect(buffer.length).toBeGreaterThan(0)

    // Đọc lại workbook từ binary buffer để kiểm tra tính toàn vẹn
    const wb = XLSX.read(buffer, { type: "array" })
    expect(wb.SheetNames).toContain("Đơn hàng")
    expect(wb.SheetNames).toContain("Chi tiết SP")
    expect(wb.SheetNames).toContain("Sổ thu tiền")
    expect(wb.SheetNames).toContain("Bộ sưu tập riêng")

    const orderSheet = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets["Đơn hàng"]!)
    expect(orderSheet[0]?.["Mã đơn"]).toBe("DH-0001")
    expect(orderSheet[0]?.["Khách đặt"]).toBe("Nguyễn Văn A")
    expect(orderSheet[0]?.["Tổng tiền (VNĐ)"]).toBe(500000)

    // Kiểm tra tính phân lập tenant
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organization_id: "org-test-1",
          source: "BROCHURE",
        }),
      })
    )
  })

  it("trả về sheet thông báo khi không có đơn hàng nào", async () => {
    findMany.mockResolvedValue([])

    const buffer = await exportOrdersToExcel(ctx, {})
    const wb = XLSX.read(buffer, { type: "array" })
    expect(wb.SheetNames).toContain("Đơn hàng")
    const orderSheet = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets["Đơn hàng"]!)
    expect(orderSheet[0]?.["Thông báo"]).toBe("Không có đơn hàng trong khoảng thời gian đã chọn")
  })
})
