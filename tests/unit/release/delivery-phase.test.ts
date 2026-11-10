import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

import { filterByPhase, isHrefInPhase, isRouteInPhase, phaseRoutes, resolveDeliveryPhase } from "@/lib/delivery/delivery-phase"
import manifest from "@/lib/delivery/gd1.manifest.json"
import { bestMatch, dirToPattern, matchScore } from "@/lib/delivery/route-match"
import { proxy } from "@/proxy"

/** Kế hoạch bàn giao GD1, Bước 2.1–2.2: luật chế độ chỉ bật phạm vi giao. */
describe("so khớp route theo thứ tự ưu tiên của Next.js", () => {
  it("đoạn tĩnh thắng đoạn động, đoạn động thắng bắt-tất-cả", () => {
    const patterns = ["/san-pham/[id]", "/san-pham/tao-moi", "/api/v1/storage/[...key]", "/[[...slug]]"]
    expect(bestMatch(patterns, "/san-pham/tao-moi")).toBe("/san-pham/tao-moi")
    expect(bestMatch(patterns, "/san-pham/abc")).toBe("/san-pham/[id]")
    expect(bestMatch(patterns, "/api/v1/storage/org/a/b.jpg")).toBe("/api/v1/storage/[...key]")
    expect(bestMatch(patterns, "/")).toBe("/[[...slug]]")
    expect(matchScore("/api/v1/storage/[...key]", "/api/v1/storage")).toBeNull()
    expect(bestMatch(["/a/b"], "/a")).toBeNull()
  })

  it("bỏ nhóm (app) và slot @x khi đổi thư mục thành URL", () => {
    expect(dirToPattern("(app)/san-pham/[id]")).toBe("/san-pham/[id]")
    expect(dirToPattern("(app)")).toBe("/")
    expect(dirToPattern("van-hanh/@modal/to-chuc")).toBe("/van-hanh/to-chuc")
  })
})

describe("chế độ tắt — mọi thứ như cũ", () => {
  it("chỉ nhận đúng giá trị gd1", () => {
    expect(resolveDeliveryPhase("gd1")).toBe("gd1")
    for (const value of [undefined, null, "", "GD1", "gd2", "all"]) expect(resolveDeliveryPhase(value)).toBeNull()
  })

  it("không chặn route nào", () => {
    for (const path of ["/creative-studio", "/van-hanh/nganh", "/api/v1/proxy/x"]) expect(isRouteInPhase(path, null)).toBe(true)
    expect(filterByPhase([{ href: "/video" }], (item) => item.href, null)).toEqual([{ href: "/video" }])
  })
})

describe("chế độ gd1", () => {
  const routes = phaseRoutes("gd1")
  const featurePages = manifest.features.flatMap((feature) => feature.pages)
  const frameworkPages = manifest.framework.flatMap((group) => group.pages)
  const excludedPages = manifest.excluded.flatMap((group) => group.pages)

  it("mọi trang của 123 chức năng và phần khung mở được, mọi trang không giao bị chặn", () => {
    const sample = (pattern: string) => pattern.replace(/\[\[?\.\.\.[^\]]+\]\]?/g, "x/y").replace(/\[[^\]]+\]/g, "abc123")
    expect([...featurePages, ...frameworkPages].filter((page) => !isRouteInPhase(sample(page), "gd1"))).toEqual([])
    expect(excludedPages.filter((page) => isRouteInPhase(sample(page), "gd1"))).toEqual([])
  })

  it("trang tĩnh lồng trong trang giao vẫn bị chặn nếu không giao, và ngược lại", () => {
    expect(isRouteInPhase("/cong-cu", "gd1")).toBe(true)
    expect(isRouteInPhase("/cong-cu/anh-san-pham", "gd1")).toBe(false)
    expect(isRouteInPhase("/van-hanh/to-chuc", "gd1")).toBe(true)
    expect(isRouteInPhase("/van-hanh/nganh", "gd1")).toBe(false)
    expect(isRouteInPhase("/san-pham/tao-moi?from=x", "gd1")).toBe(true)
  })

  it("API của chức năng mở, API bị loại và API không ai gọi bị chặn", () => {
    for (const api of manifest.features.flatMap((feature) => feature.apis)) expect(routes.apis, api).toContain(api)
    expect(isRouteInPhase("/api/v1/organizations", "gd1")).toBe(true)
    expect(isRouteInPhase("/api/health", "gd1")).toBe(true)
    expect(isRouteInPhase("/api/v1/proxy/api/accounts", "gd1")).toBe(false)
    expect(routes.blockedApis).toContain("/api/v1/proxy/[...path]")
  })

  it("đường dẫn không khớp route nào để Next.js tự xử lý", () => {
    expect(isRouteInPhase("/khong-co-trang-nay", "gd1")).toBe(true)
    expect(isRouteInPhase("/b/abc/opengraph-image", "gd1")).toBe(true)
  })

  it("link ngoài và mục không có link luôn giữ", () => {
    expect(isHrefInPhase("https://example.com", "gd1")).toBe(true)
    expect(isHrefInPhase(null, "gd1")).toBe(true)
    expect(isHrefInPhase("/video", "gd1")).toBe(false)
  })
})

describe("proxy", () => {
  afterEach(() => vi.unstubAllEnvs())

  it("bật gd1: trang và API ngoài phạm vi trả 404 kèm mã yêu cầu", async () => {
    vi.stubEnv("NEXT_PUBLIC_DELIVERY_PHASE", "gd1")
    for (const url of ["http://localhost/creative-studio", "http://localhost/api/v1/proxy/api/accounts"]) {
      const res = await proxy(new NextRequest(url))
      expect(res.status, url).toBe(404)
      expect(res.headers.get("x-request-id")).toBeTruthy()
    }
    expect((await proxy(new NextRequest("http://localhost/api/v1/orders"))).status).toBe(200)
  })

  it("tắt: không chặn", async () => {
    vi.stubEnv("NEXT_PUBLIC_DELIVERY_PHASE", "")
    expect((await proxy(new NextRequest("http://localhost/creative-studio"))).status).toBe(200)
  })
})

describe("OpenAPI theo route có thật", () => {
  it("ở smeOS không operation nào bị lọc — operation trỏ route không tồn tại vẫn bị test OpenAPI bắt", async () => {
    const internal = await import("@/app/api/v1/_contracts/internal-openapi")
    const platform = await import("@/app/api/v1/platform/_contracts/platform-openapi")
    expect(internal.INTERNAL_OPERATIONS).toHaveLength(internal.INTERNAL_OPERATIONS_DECLARED.length)
    expect(platform.PLATFORM_OPERATIONS).toHaveLength(platform.PLATFORM_OPERATIONS_DECLARED.length)
  })
})
