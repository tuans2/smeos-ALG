import { PROVIDER_CATALOG, PROVIDER_KINDS } from "@/modules/creative-production/domain/provider-catalog"

/**
 * Mô tả tiếng Việt của một mô hình AI theo khoá (OPERATING_PRINCIPLES §2: không đưa tên model lên
 * màn hình). Sổ `ai_models.display_name` giữ tên model cho mục đích giấy phép; màn hình hiện mô tả
 * từ danh mục nhà cung cấp, tên model chỉ nằm trong phần giải thích (T3-6, phương án A).
 * Không có trong danh mục thì dùng lại tên trong sổ.
 */
export function modelDescription(key: string, registryName: string): string {
  for (const kind of PROVIDER_KINDS) {
    const option = PROVIDER_CATALOG[kind].providers.find((p) => p.key === key)
    if (option) return option.displayName
  }
  return registryName
}
