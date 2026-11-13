/**
 * Kiểu bản ghi sinh từ lược đồ, tái xuất ở tầng `infra/`.
 *
 * Nhờ tệp này, chuỗi `@/generated/prisma` chỉ xuất hiện trong `infra/`, và luật
 * "không module nào import client ngoài `infra/`" kiểm được bằng một phép quét
 * đơn giản thay vì bằng review — xem
 * `tests/tenant/khong-import-prisma-ngoai-infra.test.ts`.
 */
import type { Prisma } from "@/generated/prisma/client"

export type {
  branches,
  capability_overrides,
  capability_scope,
  membership_status,
  memberships,
  organization_type,
  organizations,
  role_capabilities,
  roles,
  sessions,
  trial_status,
  users,
  workspace_kind,
  workspaces,
} from "@/generated/prisma/client"

// P3 — kiểu bản ghi thu hoạch/asset/job/usage/audit, tái xuất theo đúng quy
// ước ở đầu tệp. Từng module (assets/jobs/usage/audit) chỉ import từ tệp
// entities.ts của MODULE ĐÓ (xem src/modules/<tên>/infra/entities.ts), tệp
// này giữ nguyên phạm vi P1/P2 của nó.

/** Kiểu giá trị JSON hợp lệ để ghi vào cột `Json` qua Prisma. */
export type InputJsonValue = Prisma.InputJsonValue
