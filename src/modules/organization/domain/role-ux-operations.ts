/**
 * Khuôn trải nghiệm của ba vai vận hành — Thợ cắm hoa, Shipper, Kế toán (PO Q7 04/11/2026, checklist
 * ALG 1.12, 4.5, 4.13). Tách khỏi `role-ux-catalog.ts` để giữ tệp dưới ngưỡng 350 dòng. Luật thuần.
 */

import type { RoleUxDefinition } from "./role-ux-catalog"

export const OPERATIONS_ROLE_UX: readonly RoleUxDefinition[] = [
  {
    key: "finance_accounting",
    label: "Tài chính – Kế toán",
    group: "FLOWER_NETWORK",
    primaryPhilosophy: "Transaction-first",
    supportingPhilosophies: [],
    mission: "Xác thực, đối soát, tất toán giao dịch và lập báo cáo.",
    primaryQuestion: "Giao dịch nào cần tôi xử lý?",
    homepageModel: "Transaction Workspace",
    dominantActions: ["Xác thực", "Đối soát", "Tất toán"],
    status: "AVAILABLE",
    homepage: "ACCOUNTING_WORKSPACE",
    systemRoleKeys: ["ke_toan"],
    entryHref: "/",
    navPriority: ["/don-hang", "/so-lieu", "/muc-dung"],
    debtRefs: [],
  },
  {
    key: "florist",
    label: "Thợ chế tác",
    group: "STORE",
    primaryPhilosophy: "Production Queue",
    supportingPhilosophies: [],
    mission: "Chế tác đúng công thức, đúng tiến độ và chuẩn chất lượng theo từng phiếu cắm.",
    primaryQuestion: "Hôm nay tôi cắm những đơn nào, theo thứ tự nào?",
    homepageModel: "Production Queue",
    dominantActions: ["Nhận việc", "Chế tác", "Báo xong"],
    status: "AVAILABLE",
    homepage: "FLORIST_QUEUE",
    systemRoleKeys: ["tho_cam"],
    entryHref: "/",
    navPriority: [],
    debtRefs: [],
  },
  {
    key: "shipper",
    label: "Giao hàng",
    group: "STORE",
    primaryPhilosophy: "Delivery Run",
    supportingPhilosophies: [],
    mission: "Giao đúng người nhận, đúng giờ hẹn và có ảnh giao làm bằng chứng.",
    primaryQuestion: "Hôm nay tôi giao những đơn nào, tới đâu, lúc mấy giờ?",
    homepageModel: "Delivery Run",
    dominantActions: ["Lấy hàng", "Giao", "Chụp ảnh giao"],
    status: "AVAILABLE",
    homepage: "SHIPPER_DELIVERIES",
    systemRoleKeys: ["shipper"],
    entryHref: "/",
    navPriority: [],
    debtRefs: [],
  },
]
