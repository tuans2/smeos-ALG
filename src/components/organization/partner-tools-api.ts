/**
 * Lưu danh sách công cụ chuỗi mở cho một chi nhánh/đối tác (`/dieu-phoi/doi-tac`).
 * `partnershipId` là id quan hệ đối tác (organization_links), không phải id tổ chức của đối tác.
 * Route: `PATCH /api/v1/coordinator/partners/:id/tools` (mã năng lực F2).
 */
export function partnerToolsUrl(partnershipId: string): string {
  return `/api/v1/coordinator/partners/${encodeURIComponent(partnershipId)}/tools`
}

export async function savePartnerUnlockedTools(
  partnershipId: string,
  unlockedTools: readonly string[],
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetchImpl(partnerToolsUrl(partnershipId), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ unlocked_tools: [...unlockedTools] }),
  })
  if (res.ok) return { ok: true }
  const json = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
  return { ok: false, message: json?.error?.message || "Không thể lưu cấu hình công cụ" }
}
