import { OrganizationRepository, getOrganizationRepository } from "@/modules/organization/infra/organization-repository"

export type OrganizationSummary = {
  id: string
  name: string
  slug: string
  type: string
  /** Trạng thái vòng đời — "Tổ chức của tôi" nêu tổ chức đang tạm ngưng (audit User Journey UJ-27). */
  lifecycle_status: string
}

/**
 * Các tổ chức người dùng là thành viên (đặc tả 06 mục 3).
 *
 * Endpoint này đứng ngoài bộ gác tổ chức vì nó *là* bộ chọn tổ chức: nó lọc
 * theo `user_id` của phiên, không theo tham số nào của client. Kết quả không
 * bao giờ chứa tổ chức người dùng không thuộc về.
 */
export async function listOrganizations(userId: string): Promise<OrganizationSummary[]> {
  const rows = await getOrganizationRepository().listForUser(userId)
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    type: row.type,
    lifecycle_status: row.lifecycle_status ?? "ACTIVE",
  }))
}
