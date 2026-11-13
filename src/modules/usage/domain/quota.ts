/**
 * Hai đường hạn mức, đặc tả 07 mục 7 và mục 11.3:
 *
 *  - Workspace `EXPERIENCE`: hạn mức `trial_count`/`trial_limit`, không đụng
 *    credit của tổ chức.
 *  - Workspace khác: trừ `organizations.credit_balance`.
 *
 * Tệp này chỉ khai kiểu kết quả và một hàm quyết định thuần — phần ghi vào
 * cơ sở dữ liệu (có điều kiện, tránh vượt hạn mức khi ghi đồng thời) nằm ở
 * `infra/usage-repository.ts`, vì Prisma không so sánh được cột với cột qua
 * API fluent (`trial_count < trial_limit`) nên phải viết SQL thô ở tầng đó.
 */
export type QuotaFundingSource = "credit" | "trial"

export function fundingSourceForWorkspace(workspaceKind: string): QuotaFundingSource {
  return workspaceKind === "EXPERIENCE" ? "trial" : "credit"
}
