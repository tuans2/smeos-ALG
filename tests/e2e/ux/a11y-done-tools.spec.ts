import { expect, test } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import { Client } from "pg"
import { isHrefInPhase } from "../../../src/lib/delivery/delivery-phase"
import { createTestUserAndLogin } from "./helpers"

const dbUrl = process.env.DATABASE_URL || "postgresql://alg:alg@localhost:5432/alg"

/** Ảnh PNG 2×2 hợp lệ, truyền thẳng bằng buffer — không ghi tệp tạm. */
function tinyPng() {
  const b64 = "iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDK+mmyAAAAABJRU5ErkJggg=="
  return { name: "e2e-anh-san-pham.png", mimeType: "image/png", buffer: Buffer.from(b64, "base64") }
}

/**
 * Công cụ Hoàn thiện đã áp chuẩn Progressive Disclosure (03c): không lỗi trợ năng critical/serious ở khổ 390px,
 * ở trạng thái đầu và sau khi chọn ảnh. Thêm công cụ vào DONE_TOOLS khi đợt rollout của nó xong.
 */
/**
 * `ready`: tên vùng (role region) chỉ luồng chuẩn mới có — chờ nó thay cho dấu "Công cụ 0x" của giao diện cũ,
 * vì giao diện cũ đã gỡ mã công cụ khỏi màn hình (8939f5f) nên không còn phân biệt được hai luồng bằng chữ đó.
 */
const DONE_TOOLS: Array<{ name: string; path: string; flag?: string; ready?: string; upload: boolean }> = [
  { name: "Tạo ảnh sản phẩm", path: "/cong-cu/anh-san-pham", flag: "ux_pd_anh_san_pham", ready: "Tải ảnh và tạo", upload: true },
  { name: "Tạo bộ ảnh sản phẩm", path: "/cong-cu/bo-anh-san-pham", flag: "ux_pd_bo_anh_san_pham", ready: "Tải ảnh và tạo bộ ảnh", upload: true },
  { name: "Poster và banner", path: "/cong-cu/poster-banner", upload: false },
  { name: "Thẻ chào sản phẩm", path: "/tai-anh?tab=m01c", upload: false },
  { name: "Nội dung bán hàng", path: "/noi-dung", upload: false },
  { name: "Catalog bán hàng theo nhu cầu", path: "/the-chao?quick=true", upload: false },
  { name: "Xu hướng thị trường", path: "/market-intelligence", upload: false },
  { name: "Tạo landing page cửa hàng", path: "/landing-page", upload: false },
  { name: "Tạo catalog và bộ sưu tập", path: "/catalog", upload: false },
]

/**
 * Nhóm 6 (#31–#35) là một màn 5 tab: kiểm cả 5 tab bằng MỘT tài khoản. Mỗi ca đăng ký một tài khoản
 * mới làm bộ test chạm giới hạn đăng ký (429 RATE_LIMITED, CI 29/10/2026).
 */
const COSTING_TABS = [
  "/tinh-gia/nguyen-lieu",
  "/tinh-gia/cong-thuc",
  "/tinh-gia/gia-von",
  "/tinh-gia/gia-ban",
  "/tinh-gia/du-toan",
]

async function enableFlag(flag: string, orgId: string) {
  const client = new Client({ connectionString: dbUrl })
  await client.connect()
  try {
    // Ghi đè cả khoá: mỗi ca chỉ cần cờ của mình bật cho tổ chức vừa tạo.
    const value = JSON.stringify({ [flag]: { mode: "allowlist", organizationIds: [orgId] } })
    await client.query(
      "INSERT INTO platform_settings(key, value, updated_at) VALUES ('ux_rollout_flags', $1, now()) ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = now()",
      [value],
    )
  } finally {
    await client.end()
  }
}

test.describe("Công cụ Hoàn thiện theo chuẩn 03c — trợ năng ở khổ 390px", () => {
  test.use({ viewport: { width: 390, height: 844 } })

  // Bản cắt bàn giao (giai đoạn gắn sẵn) không có trang của công cụ ngoài phạm vi; smeOS không bật giai đoạn thì giữ đủ
  for (const tool of DONE_TOOLS.filter((t) => isHrefInPhase(t.path))) {
    test(`${tool.name} (${tool.path}) không có lỗi trợ năng critical hoặc serious`, async ({ page }) => {
      const { orgId } = await createTestUserAndLogin(page)
      if (tool.flag) await enableFlag(tool.flag, orgId)

      // Máy chủ giữ cờ trong bộ nhớ đệm tối đa 30 giây (ux-rollout-flag-store.ts).
      await expect(async () => {
        await page.goto(tool.path)
        // `/the-chao?quick=true` tự mở hộp thoại tạo nhanh: nền phía sau bị ẩn khỏi cây trợ năng (đúng chuẩn),
        // nên chỉ đòi đúng một <h1> khi không có hộp thoại đang mở.
        if ((await page.getByRole("dialog").count()) === 0) {
          await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1)
        }
        await expect(page.getByText(/Công cụ 0\d/)).toHaveCount(0)
        // Cờ có thể chưa có hiệu lực (bộ đệm 30 giây) — chờ đến khi luồng chuẩn mới hiện ra
        if (tool.ready) await expect(page.getByRole("region", { name: tool.ready, exact: true })).toBeVisible()
      }).toPass({ timeout: 45_000, intervals: [5_000] })

      const axe = () => new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()
      const severe = (r: Awaited<ReturnType<typeof axe>>) =>
        r.violations.filter((v) => v.impact === "critical" || v.impact === "serious").map((v) => v.id)

      expect(severe(await axe())).toEqual([])
      if (tool.upload) {
        await page.setInputFiles("input[type=file]", tinyPng())
        await expect(page.getByText(/credit/)).toBeVisible()
        expect(severe(await axe())).toEqual([])
      }
    })
  }

  test("Giá vốn & định giá (5 tab /tinh-gia) không có lỗi trợ năng critical hoặc serious", async ({ page }) => {
    await createTestUserAndLogin(page)
    for (const path of COSTING_TABS) {
      await page.goto(path)
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1)
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()
      expect(r.violations.filter((v) => v.impact === "critical" || v.impact === "serious").map((v) => `${path}: ${v.id}`)).toEqual([])
    }
  })
})
