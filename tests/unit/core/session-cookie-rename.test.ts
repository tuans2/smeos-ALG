import { describe, expect, it } from "vitest"
import {
  readSessionCookie, readSsoCookie, serializeClearedLegacyCookies, serializeSessionCookie, serializeSsoCookie,
  SESSION_COOKIE, SSO_COOKIE,
} from "@/core/http/cookies"

// Đổi tên ALG (12/11/2026): cookie mới alg_*, cookie cũ vẫn đọc được để người đang đăng nhập không bị đăng xuất.
const req = (cookie: string) => new Request("http://localhost/", { headers: { cookie } })

describe("cookie phiên và SSO sau khi đổi tên ALG", () => {
  it("ghi tên mới", () => {
    expect(SESSION_COOKIE).toBe("alg_session")
    expect(SSO_COOKIE).toBe("alg_sso")
    expect(serializeSessionCookie("t", 60)).toMatch(/^alg_session=t;/)
    expect(serializeSsoCookie("j", 60)).toMatch(/^alg_sso=j;/)
  })

  it("đọc dự phòng cookie tên cũ, ưu tiên tên mới", () => {
    expect(readSessionCookie(req("smeos_session=cu"))).toBe("cu")
    expect(readSessionCookie(req("smeos_session=cu; alg_session=moi"))).toBe("moi")
    expect(readSessionCookie(req("khac=1"))).toBeNull()
    expect(readSsoCookie(req("floraos_sso=a"))).toBe("a")
    expect(readSsoCookie(req("smeos_sso=b"))).toBe("b")
    expect(readSsoCookie(req("smeos_sso=b; alg_sso=c"))).toBe("c")
  })

  it("đăng xuất xoá cả cookie tên cũ", () => {
    const cleared = serializeClearedLegacyCookies()
    for (const name of ["smeos_session", "smeos_sso", "floraos_sso"]) {
      expect(cleared.some((c) => c.startsWith(`${name}=;`) && c.includes("Max-Age=0"))).toBe(true)
    }
  })
})
