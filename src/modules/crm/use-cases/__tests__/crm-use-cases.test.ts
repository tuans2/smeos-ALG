import { describe, it, expect, vi } from "vitest"
import type { TenantContext } from "@/core/tenancy/tenant-context"
import type { ICustomerRepository } from "../../domain/repositories/customer-repository.interface"
import type { CustomerMasterIndex } from "../../domain/customer-master-index"
import { createCustomer } from "../create-customer"
import { updateCustomer } from "../update-customer"
import { deleteCustomer } from "../delete-customer"
import { listCustomers } from "../list-customers"
import { getCustomerMasterIndex } from "../get-customer-master-index"

const mockTenant: TenantContext = {
  organizationId: "org_crm_test",
  workspaceId: "ws_crm_test",
  userId: "user_crm_test",
  branchId: null,
  capabilities: new Set<string>(),
}

const mockCustomer: CustomerMasterIndex = {
  id: "cust_123",
  organizationId: "org_crm_test",
  code: "KH-0001",
  name: "Nguyễn Văn A",
  phone: "0901234567",
  email: "a@example.com",
  address: "123 Đường Láng, Hà Nội",
  notes: undefined,
  tags: ["VIP"],
  metrics: {
    tier: "GOLD",
    totalSpentVnd: 5000000,
    orderCount: 5,
    lastOrderAt: "2026-10-20T10:00:00Z",
    aovVnd: 1000000,
  },
  preferences: {
    preferredFlowers: ["Hồng"],
    preferredColors: ["Đỏ"],
  },
  occasions: [],
  consents: [],
  availableVouchers: [],
  updatedAt: "2026-10-20T10:00:00Z",
}

function createMockCustomerRepo(overrides?: Partial<ICustomerRepository>): ICustomerRepository {
  return {
    create: vi.fn().mockResolvedValue(mockCustomer),
    getById: vi.fn().mockResolvedValue(mockCustomer),
    findByPhone: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(mockCustomer),
    delete: vi.fn().mockResolvedValue(true),
    list: vi.fn().mockResolvedValue({ items: [mockCustomer], total: 1 }),
    addOccasion: vi.fn().mockResolvedValue({ id: "occ_1" }),
    updateConsent: vi.fn().mockResolvedValue({ granted: true }),
    syncMetricsFromOrders: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe("CRM Use-Cases with ICustomerRepository Port", () => {
  describe("createCustomer", () => {
    it("tạo khách hàng thành công khi dữ liệu hợp lệ", async () => {
      const repo = createMockCustomerRepo()
      const result = await createCustomer(
        mockTenant,
        { name: "Nguyễn Văn A", phone: "0901234567" },
        repo
      )

      expect(repo.findByPhone).toHaveBeenCalledWith(mockTenant, "0901234567")
      expect(repo.create).toHaveBeenCalledWith(
        mockTenant,
        expect.objectContaining({ name: "Nguyễn Văn A", phone: "0901234567" })
      )
      expect(result.id).toBe("cust_123")
    })

    it("báo lỗi validation nếu tên khách hàng trống", async () => {
      const repo = createMockCustomerRepo()
      await expect(
        createCustomer(mockTenant, { name: "   ", phone: "0901234567" }, repo)
      ).rejects.toThrow()
    })

    it("báo lỗi conflict nếu số điện thoại đã tồn tại", async () => {
      const repo = createMockCustomerRepo({
        findByPhone: vi.fn().mockResolvedValue(mockCustomer),
      })
      await expect(
        createCustomer(mockTenant, { name: "Nguyễn Văn B", phone: "0901234567" }, repo)
      ).rejects.toThrow(/đã tồn tại/)
    })
  })

  describe("updateCustomer", () => {
    it("cập nhật thông tin khách hàng thành công", async () => {
      const repo = createMockCustomerRepo()
      const result = await updateCustomer(
        mockTenant,
        "cust_123",
        { name: "Nguyễn Văn A Mới" },
        repo
      )

      expect(repo.update).toHaveBeenCalledWith(
        mockTenant,
        "cust_123",
        expect.objectContaining({ name: "Nguyễn Văn A Mới" })
      )
      expect(result.id).toBe("cust_123")
    })

    it("báo lỗi notFound nếu khách hàng không tồn tại", async () => {
      const repo = createMockCustomerRepo({
        update: vi.fn().mockResolvedValue(null),
      })
      await expect(
        updateCustomer(mockTenant, "non_existent", { name: "New Name" }, repo)
      ).rejects.toThrow()
    })
  })

  describe("deleteCustomer", () => {
    it("xóa khách hàng thành công", async () => {
      const repo = createMockCustomerRepo()
      await expect(deleteCustomer(mockTenant, "cust_123", repo)).resolves.toBeUndefined()
      expect(repo.delete).toHaveBeenCalledWith(mockTenant, "cust_123")
    })

    it("báo lỗi notFound nếu xóa thất bại", async () => {
      const repo = createMockCustomerRepo({
        delete: vi.fn().mockResolvedValue(false),
      })
      await expect(deleteCustomer(mockTenant, "non_existent", repo)).rejects.toThrow()
    })
  })

  describe("listCustomers", () => {
    it("lấy danh sách khách hàng qua repository", async () => {
      const repo = createMockCustomerRepo()
      const result = await listCustomers(mockTenant, { search: "Văn A" }, { limit: 10 }, repo)

      expect(repo.list).toHaveBeenCalledWith(mockTenant, { search: "Văn A" }, { limit: 10 })
      expect(result.items).toHaveLength(1)
      expect(result.total).toBe(1)
    })
  })

  describe("getCustomerMasterIndex", () => {
    // Audit BL-14 (PO 07/11/2026, Q6): GET không ghi — chỉ số do bộ quét nền tính lại khi đơn đổi
    it("lấy chi tiết, không ghi chỉ số khi đọc", async () => {
      const repo = createMockCustomerRepo()
      const result = await getCustomerMasterIndex(mockTenant, "cust_123", repo)

      expect(repo.getById).toHaveBeenCalledWith(mockTenant, "cust_123")
      expect(repo.syncMetricsFromOrders).not.toHaveBeenCalled()
      expect(result.code).toBe("KH-0001")
    })
  })
})
