import { GreetingCardRepository, getGreetingCardRepository } from "../infra/greeting-card-repository"
import { mapCatalogToPublicResult } from "./get-public-greeting-catalog"
import type { PublicGreetingCatalogResult } from "./get-public-greeting-catalog"

/**
 * Lấy Bộ Sưu Tập Thẻ Chào theo org-slug + catalog-code.
 * Dùng cho route /g/[orgSlug]/[catalogCode] — URL thân thiện, có ý nghĩa.
 * Không cần auth, không tạo session — chỉ đọc.
 */
export async function getPublicGreetingCatalogBySlug(
  orgSlug: string,
  catalogCode: string,
  repo = getGreetingCardRepository()
): Promise<PublicGreetingCatalogResult> {
  const catalog = await repo.getPublicCatalogBySlugAndCode(orgSlug, catalogCode)
  if (!catalog) return { status: "NOT_FOUND" }
  return mapCatalogToPublicResult(catalog, repo)
}
