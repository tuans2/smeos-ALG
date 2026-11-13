import { describe, expect, it } from "vitest"
import {
  DEFAULT_CHAIN_DISPATCH_POLICY,
  DEFAULT_DISPATCH_MESSAGE_TEMPLATES,
  parseChainDispatchPolicy,
  renderDispatchMessage,
  serializeChainDispatchPolicy,
  type ChainDispatchPolicy,
} from "../chain-dispatch-policy"

describe("chain-dispatch-policy", () => {
  it("trả về cấu hình mặc định chuẩn khi settings rỗng hoặc không hợp lệ", () => {
    expect(parseChainDispatchPolicy(null)).toEqual(DEFAULT_CHAIN_DISPATCH_POLICY)
    expect(parseChainDispatchPolicy({})).toEqual(DEFAULT_CHAIN_DISPATCH_POLICY)
    expect(parseChainDispatchPolicy({ chain_dispatch_policy: "invalid" })).toEqual(DEFAULT_CHAIN_DISPATCH_POLICY)
  })

  it("parse thành công cấu hình snake_case từ database", () => {
    const rawSettings = {
      chain_dispatch_policy: {
        enabled: true,
        top_n: 5,
        claim_timeout_minutes: 8,
        cancellation_grace_minutes: 10,
        max_radius_km: 30,
        max_rounds: 4,
        auto_escalate_to_coordinator: false,
        scoring_weights: {
          distance: 40,
          quality_score: 40,
          workload: 20,
        },
        milestone_reminders: {
          enabled: true,
          prep_alert: true,
          qc_reminder_minutes_before: 60,
          dispatch_reminder_minutes_before: 30,
          overdue_warning_minutes: 10,
        },
        message_templates: {
          invite_subcontract: "Đơn mới #{{orderCode}}",
        },
      },
    }

    const policy = parseChainDispatchPolicy(rawSettings)
    expect(policy.topN).toBe(5)
    expect(policy.claimTimeoutMinutes).toBe(8)
    expect(policy.cancellationGraceMinutes).toBe(10)
    expect(policy.maxRadiusKm).toBe(30)
    expect(policy.maxRounds).toBe(4)
    expect(policy.autoEscalateToCoordinator).toBe(false)
    expect(policy.scoringWeights).toEqual({ distance: 40, qualityScore: 40, workload: 20 })
    expect(policy.milestoneReminders.qcReminderMinutesBefore).toBe(60)
    expect(policy.messageTemplates.inviteSubcontract).toBe("Đơn mới #{{orderCode}}")
    expect(policy.messageTemplates.claimSuccess).toBe(DEFAULT_DISPATCH_MESSAGE_TEMPLATES.claimSuccess)
  })

  it("giới hạn an toàn (clamp) các giá trị ngoài phạm vi", () => {
    const rawSettings = {
      chain_dispatch_policy: {
        top_n: 999, // Max 10
        claim_timeout_minutes: -5, // Min 1
        cancellation_grace_minutes: 100, // Max 30
        max_radius_km: 500, // Max 100
        scoring_weights: {
          distance: 200, // Max 100
          quality_score: -10, // Min 0
          workload: 999, // Max 100
        },
      },
    }

    const policy = parseChainDispatchPolicy(rawSettings)
    expect(policy.topN).toBe(10)
    expect(policy.claimTimeoutMinutes).toBe(1)
    expect(policy.cancellationGraceMinutes).toBe(30)
    expect(policy.maxRadiusKm).toBe(100)
    expect(policy.scoringWeights.distance).toBe(100)
    expect(policy.scoringWeights.qualityScore).toBe(0)
    expect(policy.scoringWeights.workload).toBe(100)
  })

  it("round-trip serialize và parse giữ nguyên giá trị", () => {
    const custom: ChainDispatchPolicy = {
      enabled: false,
      topN: 4,
      claimTimeoutMinutes: 7,
      cancellationGraceMinutes: 6,
      maxRadiusKm: 18,
      maxRounds: 2,
      autoEscalateToCoordinator: true,
      autoConfirmOnBranchCommit: false,
      scoringWeights: {
        distance: 60,
        qualityScore: 25,
        workload: 15,
      },
      milestoneReminders: {
        enabled: true,
        prepAlert: false,
        qcReminderMinutesBefore: 40,
        qcRetryIntervalMinutes: 6,
        qcEscalateAfterMinutes: 4,
        dispatchReminderMinutesBefore: 15,
        shipperRetryIntervalMinutes: 5,
        shipperEscalateAfterMinutes: 5,
        deliveryReminderMinutesAfter: 2,
        deliveryRetryIntervalMinutes: 4,
        deliveryEscalateAfterMinutes: 3,
        overdueWarningMinutes: 8,
      },
      messageTemplates: {
        ...DEFAULT_DISPATCH_MESSAGE_TEMPLATES,
        inviteSubcontract: "Chào chi nhánh! Có đơn #{{orderCode}} cần gia công.",
      },
    }

    const serialized = serializeChainDispatchPolicy(custom)
    const parsed = parseChainDispatchPolicy({ chain_dispatch_policy: serialized })
    expect(parsed).toEqual(custom)
  })

  it("renderDispatchMessage trộn chính xác các biến số và giữ nguyên biến không tồn tại", () => {
    const template = "Đơn #{{orderCode}} giao lúc {{deliveryTime}} tại {{deliveryAddress}} (Hết hạn: {{timeoutMinutes}}p)"
    const rendered = renderDispatchMessage(template, {
      orderCode: "DH-123",
      deliveryTime: "14:00 20/10",
      deliveryAddress: "123 Lê Lợi, Q1",
      timeoutMinutes: 5,
    })

    expect(rendered).toBe("Đơn #DH-123 giao lúc 14:00 20/10 tại 123 Lê Lợi, Q1 (Hết hạn: 5p)")

    // Biến không có trong vars giữ nguyên cú pháp
    expect(renderDispatchMessage("Xin chào {{name}} và {{unknownKey}}", { name: "Chi nhánh 1" })).toBe(
      "Xin chào Chi nhánh 1 và {{unknownKey}}"
    )
  })
})

describe("renderDispatchMessage — thoát ký tự HTML của Telegram", () => {
  it("giữ thẻ của mẫu, thoát giá trị người nhập", async () => {
    const { renderDispatchMessage } = await import("../chain-dispatch-policy")
    const out = renderDispatchMessage("<b>Giao tới:</b> {{deliveryAddress}} · {{orderCode}} · {{missing}}", {
      deliveryAddress: 'Hẻm 5 <cạnh chợ> & <a href="https://lua.dao">bấm</a>',
      orderCode: "DH1",
    })
    expect(out).toBe('<b>Giao tới:</b> Hẻm 5 &lt;cạnh chợ&gt; &amp; &lt;a href="https://lua.dao"&gt;bấm&lt;/a&gt; · DH1 · {{missing}}')
  })
})
