/**
 * Ngữ cảnh tổ chức — giải một lần ở biên, rồi truyền xuống (đặc tả 05 mục 3).
 *
 * Không lớp nào tự đi tìm lại `organization_id`, và không hàm nào nhận nó từ
 * tham số do client kiểm soát. Chỗ duy nhất client được nêu tên một tổ chức là
 * `POST /api/v1/session/organization`, và ở đó giá trị được đối chiếu với
 * `memberships` trước khi ghi vào `sessions.organization_id`.
 *
 * Tệp này không import hạ tầng. Nó là luật thuần, test được không cần cơ sở
 * dữ liệu.
 */

export type TenantContext = {
  readonly organizationId: string
  readonly workspaceId: string
  readonly userId: string
  /** null = phạm vi toàn tổ chức. */
  readonly branchId: string | null
  readonly capabilities: ReadonlySet<string>
  /**
   * Phạm vi của từng mã quyền (ADR-012 D-T7, bước T-5): `ORGANIZATION` | `BRANCH`, theo `role_capabilities.scope`.
   * Không có = mọi mã phạm vi tổ chức (ngữ cảnh dựng tay trong test, đường tích hợp cũ). Lọc theo chi nhánh đọc qua
   * `branchScopeFor(ctx, code)` (`branch-scope.ts`).
   */
  readonly grants?: ReadonlyMap<string, string> | undefined
}

/**
 * Lỗi lập trình, không phải lỗi người dùng: một lời gọi đã cố tự chọn tổ chức
 * thay vì để bộ gác chọn. Ném ra để hỏng to và hỏng sớm, thay vì im lặng đọc
 * dữ liệu của tổ chức khác.
 */
export class TenantScopeViolation extends Error {
  constructor(message: string) {
    super(message)
    this.name = "TenantScopeViolation"
  }
}

/** Khoá tổ chức trên mọi bảng thuộc tenant. */
export const TENANT_KEY = "organization_id" as const

/**
 * Chèn điều kiện lọc theo tổ chức vào một mệnh đề `where`.
 *
 * Bộ gác nằm ở tầng repository chứ không ở route: route quên kiểm là chuyện
 * thường gặp và bắt được ở review, repository quên kiểm là lỗ hổng im lặng.
 */
export function scopedWhere<T extends Record<string, unknown>>(
  ctx: TenantContext,
  where?: T
): T & { organization_id: string } {
  if (where && TENANT_KEY in where) {
    throw new TenantScopeViolation(
      `Mệnh đề where tự khai ${TENANT_KEY}. Giá trị này chỉ đến từ TenantContext.`
    )
  }
  return { ...((where ?? {}) as T), organization_id: ctx.organizationId }
}

/**
 * Gắn khoá tổ chức vào dữ liệu ghi. Cùng lý do như `scopedWhere`: giá trị đến
 * từ ngữ cảnh phiên, không đến từ thân yêu cầu.
 */
export function scopedData<T extends Record<string, unknown>>(
  ctx: TenantContext,
  data: T
): T & { organization_id: string } {
  if (TENANT_KEY in data) {
    throw new TenantScopeViolation(
      `Dữ liệu ghi tự khai ${TENANT_KEY}. Giá trị này chỉ đến từ TenantContext.`
    )
  }
  return { ...data, organization_id: ctx.organizationId }
}

/**
 * Bản ghi thuộc tổ chức khác được coi như không tồn tại (`YC-T4`).
 *
 * Trả lỗi quyền ở đây là xác nhận bản ghi có thật — rò rỉ thông tin xuyên tổ
 * chức bằng chính mã lỗi. Nên hàm này trả `null`, và tầng trên dịch `null`
 * thành 404.
 */
export function ownedByTenant<T extends { organization_id: string }>(
  ctx: TenantContext,
  record: T | null
): T | null {
  if (!record) return null
  return record.organization_id === ctx.organizationId ? record : null
}
