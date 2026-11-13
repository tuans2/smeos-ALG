// Gọi máy chủ để xem trước một tầng/vai. Trả lỗi bằng lời cho người dùng
// thay vì im lặng chuyển trang (trước đây lỗi bị nuốt, trang chủ vẫn hiện
// vai thật nên người dùng tưởng đã chuyển).

export type KetQuaChuyenTang = { ok: true; href: string } | { ok: false; loi: string }

function loiTheoMa(status: number): string {
  if (status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại rồi thử lại."
  if (status === 403) return "Chỉ quản trị nền tảng mới chuyển sang vai này được."
  if (status === 400) return "Vai này chưa mở để xem."
  return "Không chuyển được vai lúc này. Vui lòng thử lại sau."
}

async function thuCookieDev(roleKey: string, organizationType: string, label: string): Promise<boolean> {
  if (process.env.NODE_ENV === "production") return false
  const res = await fetch("/api/dev/role-override", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roleKey, organizationType, orgNameSuffix: `[${label}]` }),
  }).catch(() => null)
  return Boolean(res?.ok)
}

export async function chuyenTang(
  role: { key: string; label: string; entryHref: string | null },
  organizationType: string
): Promise<KetQuaChuyenTang> {
  const res = await fetch("/api/v1/platform/tier-preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roleKey: role.key }),
  }).catch(() => null)

  if (res?.ok) {
    const body = (await res.json().catch(() => null)) as { data?: { entryHref?: string } } | null
    return { ok: true, href: body?.data?.entryHref || role.entryHref || "/" }
  }

  // Môi trường phát triển: tài khoản chưa là người vận hành vẫn dùng cookie dev.
  if (await thuCookieDev(role.key, organizationType, role.label)) {
    return { ok: true, href: role.key === "platform_admin" ? "/van-hanh" : role.entryHref || "/" }
  }

  if (!res) return { ok: false, loi: "Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại." }
  return { ok: false, loi: loiTheoMa(res.status) }
}

export async function veVaiThat(): Promise<boolean> {
  const res = await fetch("/api/v1/platform/tier-preview", { method: "DELETE" }).catch(() => null)
  if (process.env.NODE_ENV !== "production") {
    await fetch("/api/dev/role-override", { method: "DELETE" }).catch(() => null)
  }
  return Boolean(res?.ok)
}
