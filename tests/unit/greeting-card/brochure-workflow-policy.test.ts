import { describe, it, expect } from "vitest"
import {
  BROCHURE_WORKFLOW_POLICY_KEY,
  LEAN_WORKFLOW_POLICY,
  STANDARD_WORKFLOW_POLICY,
  STRICT_WORKFLOW_POLICY,
  parseBrochureWorkflowPolicy,
  serializeWorkflowPolicy,
  detectWorkflowPreset,
  isUrgentOrder,
  canRoleApproveDeposit,
  depositApproverRole,
  canBypassFinishedPhoto,
  canBypassDeliveryPhoto,
  shouldBlockDispatchForBalance,
  isChainOrganizationType,
  type BrochureWorkflowPolicy,
} from "@/modules/greeting-card/domain/brochure-workflow-policy"

describe("Brochure Workflow Policy Domain Tests", () => {
  describe("Presets and Defaults", () => {
    it("returns STANDARD_WORKFLOW_POLICY when settings is empty or null", () => {
      expect(parseBrochureWorkflowPolicy(null)).toEqual(STANDARD_WORKFLOW_POLICY)
      expect(parseBrochureWorkflowPolicy({})).toEqual(STANDARD_WORKFLOW_POLICY)
    })

    it("migrates smartly from legacy brochure_policy if present", () => {
      const legacySettings = {
        brochure_policy: {
          tracking_trigger_policy: "PAYMENT_ONLY",
          require_product_photo_qc: false,
          require_full_before_dispatch: false,
          require_recipient_photo: false,
        },
      }
      const policy = parseBrochureWorkflowPolicy(legacySettings)
      expect(policy.requireAdminDepositApproval).toBe(true)
      expect(policy.requireFinishedPhoto).toBe(false)
      expect(policy.customerApprovalMode).toBe("BYPASS")
      expect(policy.requireFullPaymentBeforeDispatch).toBe(false)
      expect(policy.preset).toBe("CUSTOM")
    })

    it("tiệm có cấu hình cũ PAYMENT_OR_COORDINATOR vẫn chỉ Điều hành duyệt cọc (PO 14/10/2026)", () => {
      const policy = parseBrochureWorkflowPolicy({ brochure_policy: { tracking_trigger_policy: "PAYMENT_OR_COORDINATOR" } })
      expect(policy.requireAdminDepositApproval).toBe(true)
    })

    it("parses LEAN preset accurately", () => {
      const payload = {
        [BROCHURE_WORKFLOW_POLICY_KEY]: serializeWorkflowPolicy(LEAN_WORKFLOW_POLICY),
      }
      const policy = parseBrochureWorkflowPolicy(payload)
      expect(policy).toEqual(LEAN_WORKFLOW_POLICY)
      expect(policy.preset).toBe("LEAN")
    })

    it("parses STRICT preset accurately", () => {
      const payload = {
        [BROCHURE_WORKFLOW_POLICY_KEY]: serializeWorkflowPolicy(STRICT_WORKFLOW_POLICY),
      }
      const policy = parseBrochureWorkflowPolicy(payload)
      expect(policy).toEqual(STRICT_WORKFLOW_POLICY)
      expect(policy.preset).toBe("STRICT")
    })

    it("detects CUSTOM preset when any toggle differs from presets", () => {
      const custom: BrochureWorkflowPolicy = {
        ...STANDARD_WORKFLOW_POLICY,
        preset: "CUSTOM",
        requireFinishedPhoto: true, // differ from standard
      }
      expect(detectWorkflowPreset(custom)).toBe("CUSTOM")
    })

    it("serializes and deserializes roundtrip with full fidelity", () => {
      const custom: BrochureWorkflowPolicy = {
        preset: "CUSTOM",
        requireAdminDepositApproval: false,
        requireCoordinatorAcceptance: false,
        requireFinishedPhoto: false,
        customerApprovalMode: "BYPASS",
        requireFullPaymentBeforeDispatch: true,
        requireDeliveryProofPhoto: true,
        allowSlaEscalation: false,
        slaEscalationMinutes: 30,
      }
      const serialized = serializeWorkflowPolicy(custom)
      const parsed = parseBrochureWorkflowPolicy({ [BROCHURE_WORKFLOW_POLICY_KEY]: serialized })
      expect(parsed).toEqual(custom)
    })

    it("phân định mặc định requireCoordinatorAcceptance theo loại tổ chức (1 Cửa hàng vs Chuỗi)", () => {
      // 1 Cửa hàng (SINGLE / STORE / null): mặc định false (tự động nhận đơn khi duyệt tiền)
      expect(parseBrochureWorkflowPolicy({}, "SINGLE").requireCoordinatorAcceptance).toBe(false)
      expect(parseBrochureWorkflowPolicy({}, "STORE").requireCoordinatorAcceptance).toBe(false)
      expect(parseBrochureWorkflowPolicy({}, null).requireCoordinatorAcceptance).toBe(false)

      // Chuỗi (CHAIN): mặc định true (cần điều phối liên hệ chuỗi & nhận đơn)
      expect(parseBrochureWorkflowPolicy({}, "CHAIN").requireCoordinatorAcceptance).toBe(true)
    })
  })

  describe("Fast-Track & Urgent Order Logic", () => {
    it("recognizes explicit isUrgent flag", () => {
      expect(isUrgentOrder({ isUrgent: true })).toBe(true)
      expect(isUrgentOrder({ isUrgent: false })).toBe(false)
    })

    it("recognizes orders delivering within 2 hours today as urgent", () => {
      // 9:00 giờ Việt Nam — khung giờ giao là giờ VN, không phụ thuộc múi giờ máy chủ (máy chủ chạy UTC)
      const now = new Date("2026-10-14T09:00:00+07:00")
      // slot at 10:30 (1.5 hours later)
      const order = {
        deliveryDate: "2026-10-14",
        deliveryTimeSlot: "10:30 - 11:30",
      }
      expect(isUrgentOrder(order, now)).toBe(true)

      // slot at 14:00 (5 hours later)
      const nonUrgentOrder = {
        deliveryDate: "2026-10-14",
        deliveryTimeSlot: "14:00 - 15:00",
      }
      expect(isUrgentOrder(nonUrgentOrder, now)).toBe(false)
    })
  })

  describe("Gate Decision Evaluators", () => {
    describe("canRoleApproveDeposit", () => {
      it("Điều hành (có quyền ghi nhận thanh toán) bấm duyệt cọc từ màn Điều phối vẫn là ADMIN — không bị cài đặt 'chỉ Điều hành duyệt' chặn", () => {
        expect(depositApproverRole(true)).toBe("ADMIN")
        expect(canRoleApproveDeposit(depositApproverRole(true), STRICT_WORKFLOW_POLICY, { isOverdueSla: false })).toBe(true)
        expect(depositApproverRole(false)).toBe("COORDINATOR")
        expect(canRoleApproveDeposit(depositApproverRole(false), STANDARD_WORKFLOW_POLICY, { isOverdueSla: false })).toBe(false)
      })

      it("always allows ADMIN", () => {
        expect(canRoleApproveDeposit("ADMIN", STANDARD_WORKFLOW_POLICY)).toBe(true)
        expect(canRoleApproveDeposit("ADMIN", STRICT_WORKFLOW_POLICY)).toBe(true)
        expect(canRoleApproveDeposit("ADMIN", LEAN_WORKFLOW_POLICY)).toBe(true)
      })

      it("allows COORDINATOR and SALE when policy has requireAdminDepositApproval = false", () => {
        expect(canRoleApproveDeposit("COORDINATOR", LEAN_WORKFLOW_POLICY)).toBe(true)
        expect(canRoleApproveDeposit("SALE", LEAN_WORKFLOW_POLICY)).toBe(true)
      })

      it("blocks COORDINATOR and SALE in STANDARD policy unless overdue SLA or urgent", () => {
        expect(canRoleApproveDeposit("COORDINATOR", STANDARD_WORKFLOW_POLICY, { isOverdueSla: false })).toBe(false)
        expect(canRoleApproveDeposit("SALE", STANDARD_WORKFLOW_POLICY, { isOverdueSla: false })).toBe(false)

        // Quá hạn: mặc định KHÔNG uỷ quyền (PO 04/11/2026, Q3b — ALG 1.16); Điều hành bật công tắc thì được
        expect(canRoleApproveDeposit("COORDINATOR", STANDARD_WORKFLOW_POLICY, { isOverdueSla: true })).toBe(false)
        expect(canRoleApproveDeposit("SALE", STANDARD_WORKFLOW_POLICY, { isOverdueSla: true })).toBe(false)
        const escalation = { ...STANDARD_WORKFLOW_POLICY, allowSlaEscalation: true }
        expect(canRoleApproveDeposit("COORDINATOR", escalation, { isOverdueSla: true })).toBe(true)
        expect(canRoleApproveDeposit("SALE", escalation, { isOverdueSla: true })).toBe(true)

        // When order is urgent
        expect(canRoleApproveDeposit("COORDINATOR", STANDARD_WORKFLOW_POLICY, { isUrgent: true })).toBe(true)
        expect(canRoleApproveDeposit("SALE", STANDARD_WORKFLOW_POLICY, { isUrgent: true })).toBe(true)
      })

      it("never escalates in STRICT policy if allowSlaEscalation is false", () => {
        expect(canRoleApproveDeposit("COORDINATOR", STRICT_WORKFLOW_POLICY, { isOverdueSla: true })).toBe(false)
        expect(canRoleApproveDeposit("SALE", STRICT_WORKFLOW_POLICY, { isOverdueSla: true })).toBe(false)
      })
    })

    describe("canBypassFinishedPhoto / canBypassDeliveryPhoto (PO 15/10/2026)", () => {
      it("gói Tinh gọn và Tiêu chuẩn cho bỏ qua ảnh thành phẩm nhưng bắt buộc ảnh giao (PO 04/11/2026)", () => {
        expect(canBypassFinishedPhoto(LEAN_WORKFLOW_POLICY)).toBe(true)
        expect(canBypassFinishedPhoto(STANDARD_WORKFLOW_POLICY)).toBe(true)
        expect(canBypassDeliveryPhoto(LEAN_WORKFLOW_POLICY)).toBe(false)
        expect(canBypassDeliveryPhoto(STANDARD_WORKFLOW_POLICY)).toBe(false)
      })

      it("chưa cấu hình gì: bắt buộc ảnh giao; Điều hành tắt công tắc thì được bỏ qua", () => {
        expect(canBypassDeliveryPhoto(parseBrochureWorkflowPolicy({}))).toBe(false)
        const off = { ...serializeWorkflowPolicy(STANDARD_WORKFLOW_POLICY), preset: "CUSTOM", require_delivery_proof_photo: false }
        expect(canBypassDeliveryPhoto(parseBrochureWorkflowPolicy({ [BROCHURE_WORKFLOW_POLICY_KEY]: off }))).toBe(true)
      })

      it("gói Nghiêm ngặt bắt buộc cả hai ảnh", () => {
        expect(canBypassFinishedPhoto(STRICT_WORKFLOW_POLICY)).toBe(false)
        expect(canBypassDeliveryPhoto(STRICT_WORKFLOW_POLICY)).toBe(false)
      })

      it("tiệm lưu gói Tiêu chuẩn cũ (còn bắt buộc ảnh) không bị khoá nút bỏ qua", () => {
        const stored = { ...serializeWorkflowPolicy(STANDARD_WORKFLOW_POLICY), require_finished_photo: true }
        const policy = parseBrochureWorkflowPolicy({ [BROCHURE_WORKFLOW_POLICY_KEY]: stored })
        expect(policy.preset).toBe("STANDARD")
        expect(canBypassFinishedPhoto(policy)).toBe(true)
      })

      it("tiệm cấu hình cũ (brochure_policy) giữ đúng công tắc ảnh người nhận", () => {
        const policy = parseBrochureWorkflowPolicy({ brochure_policy: { require_product_photo_qc: true, require_recipient_photo: true } })
        expect(canBypassFinishedPhoto(policy)).toBe(true)
        expect(canBypassDeliveryPhoto(policy)).toBe(false)
        const off = parseBrochureWorkflowPolicy({ brochure_policy: { require_recipient_photo: false } })
        expect(canBypassDeliveryPhoto(off)).toBe(true)
      })

      it("Tự chỉnh theo đúng công tắc đã bật", () => {
        const stored = { ...serializeWorkflowPolicy(LEAN_WORKFLOW_POLICY), preset: "CUSTOM", require_finished_photo: true }
        expect(canBypassFinishedPhoto(parseBrochureWorkflowPolicy({ [BROCHURE_WORKFLOW_POLICY_KEY]: stored }))).toBe(false)
      })
    })

    describe("shouldBlockDispatchForBalance", () => {
      const partialMoney = { totalVnd: 1_000_000, paidVnd: 500_000 }
      const fullyPaidMoney = { totalVnd: 1_000_000, paidVnd: 1_000_000 }

      it("does not block if order is fully paid", () => {
        expect(shouldBlockDispatchForBalance(STANDARD_WORKFLOW_POLICY, fullyPaidMoney)).toBe(false)
      })

      it("blocks in STANDARD policy if balance is unpaid", () => {
        expect(shouldBlockDispatchForBalance(STANDARD_WORKFLOW_POLICY, partialMoney)).toBe(true)
      })

      it("does not block in LEAN policy (allows COD)", () => {
        expect(shouldBlockDispatchForBalance(LEAN_WORKFLOW_POLICY, partialMoney)).toBe(false)
      })

      it("does not block for urgent orders even in STANDARD policy", () => {
        expect(shouldBlockDispatchForBalance(STANDARD_WORKFLOW_POLICY, partialMoney, true)).toBe(false)
      })
    })
  })
})

/** Chuỗi / 1 cửa hàng theo loại tổ chức Admin SaaS duyệt, không theo công tắc hay gói (PO 22/10/2026). */
describe("chế độ Chuỗi theo loại tổ chức", () => {
  const stored = (policy: typeof STRICT_WORKFLOW_POLICY) => ({ [BROCHURE_WORKFLOW_POLICY_KEY]: serializeWorkflowPolicy(policy) })

  it("gói Nghiêm ngặt không bật Chuỗi cho tổ chức 1 cửa hàng; gói Tiêu chuẩn không tắt Chuỗi", () => {
    expect(parseBrochureWorkflowPolicy(stored(STRICT_WORKFLOW_POLICY), "SINGLE")).toMatchObject({ preset: "STRICT", requireCoordinatorAcceptance: false })
    expect(parseBrochureWorkflowPolicy(stored(STANDARD_WORKFLOW_POLICY), "CHAIN")).toMatchObject({ preset: "STANDARD", requireCoordinatorAcceptance: true })
    expect(parseBrochureWorkflowPolicy(stored(LEAN_WORKFLOW_POLICY), "CHAIN").requireCoordinatorAcceptance).toBe(true)
  })

  it("công tắc lưu trong cài đặt bị bỏ qua khi biết loại tổ chức", () => {
    const settings = { [BROCHURE_WORKFLOW_POLICY_KEY]: { ...serializeWorkflowPolicy(STANDARD_WORKFLOW_POLICY), preset: "CUSTOM", require_coordinator_acceptance: true } }
    expect(parseBrochureWorkflowPolicy(settings, "STORE").requireCoordinatorAcceptance).toBe(false)
    expect(isChainOrganizationType("CHAIN")).toBe(true)
    expect(isChainOrganizationType(null)).toBe(false)
  })
})
