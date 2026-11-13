/**
 * `YC-A1` `YC-A2` `YC-A3` — asset gốc bất biến; dẫn xuất là bản ghi mới, nối
 * bằng `parent_asset_id` và `version`. `YC-A5` — `generated_flags` không bao
 * giờ mặc định ngầm: asset dẫn xuất (`parent_asset_id != null`) BẮT BUỘC
 * khai rõ `generated_flags`, không được suy ra hay bỏ trống. Asset gốc
 * (`kind = ORIGINAL`, không có cha) không cần cờ này — nó chưa qua xử lý AI
 * nào để có cờ.
 *
 * Thuần: không import hạ tầng, test không cần cơ sở dữ liệu.
 */
export type GeneratedFlags = {
  generative_fill_used: boolean
  requires_reshoot_warning: boolean
}

export function requiresExplicitGeneratedFlags(input: {
  kind: string
  parentAssetId: string | null
}): boolean {
  return input.kind !== "ORIGINAL" && input.parentAssetId !== null
}

export function isValidGeneratedFlags(value: unknown): value is GeneratedFlags {
  if (typeof value !== "object" || value === null) return false
  const flags = value as Record<string, unknown>
  return (
    typeof flags["generative_fill_used"] === "boolean" &&
    typeof flags["requires_reshoot_warning"] === "boolean"
  )
}

/** `version` là cơ chế lịch sử duy nhất (`YC-A3`) — dẫn xuất luôn +1 so với cha. */
export function nextVersion(parentVersion: number | null): number {
  return parentVersion === null ? 1 : parentVersion + 1
}
