import { beforeEach, describe, expect, it, vi } from "vitest"
import type { TenantContext } from "@/core/tenancy"
import * as XLSX from "xlsx"

const findMany = vi.fn()
// Cờ phạm vi chi nhánh đợt 1 của tổ chức (ADR-012 T-5, D-59) — mặc định tắt
const orgSettings = vi.fn(async (): Promise<{ settings: unknown } | null> => ({ settings: null }))
vi.mock("@/core/tenancy/infra/prisma", () => ({
  prisma: {
    customers: {
      findMany: (...a: unknown[]) => findMany(...a),
    },
    organizations: {
      findUnique: () => orgSettings(),
    },
  },
}))

import { exportCustomers } from "./export-customers"

const ctx: TenantContext = {
  organizationId: "org-test-1",
  userId: "user-1",
  workspaceId: "ws-1",
  branchId: "br-1",
  capabilities: new Set(["Q1"]),
}

describe("exportCustomers", () => {
  beforeEach(() => {
    findMany.mockReset()
  })

  const mockCustomers = [
    {
      id: "cust-1",
      code: "KH-0001",
      name: "Trần Thị B",
      phone: "0918765432",
      email: "b.tran@example.com",
      address: "456 Nguyễn Thị Minh Khai, Q3, TP.HCM",
      tier: "VIP",
      notes: "Thích sản phẩm tone pastel",
      tags: ["VIP", "Doanh nghiệp"],
      preferred_flowers: ["Hoa mẫu đơn", "Hoa hồng Ecuador"],
      preferred_colors: ["Hồng pastel", "Trắng"],
      total_spent: 15000000,
      order_count: 12,
      last_order_at: new Date("2026-10-05T10:00:00Z"),
      created_at: new Date("2026-01-15T09:00:00Z"),
      updated_at: new Date("2026-10-05T10:00:00Z"),
      occasions: [
        {
          id: "occ-1",
          name: "Sinh nhật khách",
          date: "10-20",
          is_recurring: true,
          notes: "Tặng hoa mẫu đơn",
          created_at: new Date("2026-01-15T09:30:00Z"),
        },
        {
          id: "occ-2",
          name: "Kỷ niệm thành lập công ty",
          date: "12-01",
          is_recurring: true,
          notes: "Kệ hoa khai trương lớn",
          created_at: new Date("2026-01-15T09:35:00Z"),
        },
      ],
    },
  ]

  it("xuất dữ liệu định dạng Excel (.xlsx) với 2 sheet Khách hàng và Ngày kỷ niệm", async () => {
    findMany.mockResolvedValue(mockCustomers)

    const result = await exportCustomers(ctx, { format: "xlsx" })
    expect(result.contentType).toContain("spreadsheetml")
    expect(result.filename).toMatch(/^danh-sach-khach-hang-\d{8}\.xlsx$/)
    expect(result.data).toBeInstanceOf(Uint8Array)

    const wb = XLSX.read(result.data as Uint8Array, { type: "array" })
    expect(wb.SheetNames).toContain("Khách hàng")
    expect(wb.SheetNames).toContain("Ngày kỷ niệm")

    const customerSheet = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets["Khách hàng"]!)
    expect(customerSheet[0]?.["Mã KH"]).toBe("KH-0001")
    expect(customerSheet[0]?.["Họ và tên"]).toBe("Trần Thị B")
    expect(customerSheet[0]?.["Hạng khách hàng"]).toBe("VIP")
    expect(customerSheet[0]?.["Tổng chi tiêu (VNĐ)"]).toBe(15000000)

    const occasionSheet = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets["Ngày kỷ niệm"]!)
    expect(occasionSheet.length).toBe(2)
    expect(occasionSheet[0]?.["Dịp kỷ niệm"]).toBe("Sinh nhật khách")
    expect(occasionSheet[0]?.["Ngày kỷ niệm (MM-DD)"]).toBe("10-20")

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organization_id: "org-test-1",
        }),
      })
    )
  })

  it("xuất dữ liệu định dạng JSON (.json) đầy đủ cấu trúc metadata và quan hệ", async () => {
    findMany.mockResolvedValue(mockCustomers)

    const result = await exportCustomers(ctx, { format: "json" })
    expect(result.contentType).toContain("application/json")
    expect(result.filename).toMatch(/^backup-khach-hang-\d{8}\.json$/)
    expect(typeof result.data).toBe("string")

    const parsed = JSON.parse(result.data as string)
    expect(parsed.metadata).toMatchObject({
      version: "1.0",
      backup_type: "customer_master_data",
      organization_id: "org-test-1",
      total_customers: 1,
      total_occasions: 2,
    })
    expect(parsed.customers[0]?.code).toBe("KH-0001")
    expect(parsed.customers[0]?.occasions).toHaveLength(2)
  })

  it("tổ chức bật phạm vi chi nhánh đợt 1: chỉ xuất khách của chi nhánh mình và khách dùng chung (ADR-012 T-5)", async () => {
    orgSettings.mockResolvedValueOnce({ settings: { branch_scope: { wave1: true } } })
    findMany.mockResolvedValue([])
    await exportCustomers(ctx, { format: "json" })
    expect(findMany.mock.calls[0]?.[0]).toMatchObject({ where: { AND: [{ OR: [{ branch_id: null }, { branch_id: "br-1" }] }] } })
  })
})
