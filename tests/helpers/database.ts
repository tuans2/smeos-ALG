import { prisma } from "@/core/tenancy/infra/prisma"
import { TABLES_CHILD_FIRST, TENANT_SCOPED_TABLES } from "@/core/tenancy/generated/tenant-table-registry"
import { Prisma } from "@/generated/prisma/client"
import { env } from "@/lib/env"
import { ensureSystemRoles } from "@/modules/organization/use-cases/ensure-system-roles"
import { seedAiCapabilities, seedVisionModels } from "@/core/ai/infra/seed-ai-registry"

import { ensureIndustries } from "./industries-seed"

/**
 * Bảng dọn giữa các ca thử. Bảng có `organization_id` lấy từ sổ sinh tự động (ADR-016 S-1) —
 * thêm bảng tenant mới không phải sửa ở đây.
 */
const TEST_EXTRA_TABLES = [
  // Bảng không có organization_id nhưng ca thử nào cũng tạo dòng mới
  "organizations",
  "users",
  "role_capabilities",
  // Bảng cấu hình nền tảng dùng chung mà ca thử thông báo 4 tầng / tích hợp ghi vào
  "notification_channel_activations",
  // Quyết định theo tầng (ADR-012 D-T10): ma trận, khoá/hiển thị thông báo, khoá tích hợp
  "governance_decisions",
] as const

// Con trước cha (TABLES_CHILD_FIRST): TRUNCATE khoá bảng con trước, cùng chiều với giao dịch đang ghi con rồi
// kiểm cha — xếp theo tên từng gây deadlock trên CI (05/11/2026).
const TRUNCATE_SET = new Set<string>([...TENANT_SCOPED_TABLES, ...TEST_EXTRA_TABLES])
const TENANT_TABLES: readonly string[] = TABLES_CHILD_FIRST.filter((t) => TRUNCATE_SET.has(t))

/**
 * Chốt chặn: bộ test này XOÁ SẠCH database nó trỏ tới, nên nó chỉ được phép
 * trỏ tới một database có tên kết thúc bằng `_test`.
 *
 * Không phải phòng xa. Ngày 09/10 `npm run test:tenant` chạy trên chính
 * database phát triển và cuốn mất tổ chức AVI GIFT cùng 1.316 SKU — hai lần
 * trong một tối, vì `AGENTS.md` bắt cổng này xanh trước MỌI merge. Nợ #46.
 *
 * Dựng database test: `npm run db:test:setup`.
 */
function bat_buoc_la_database_test(): void {
  let ten_db: string
  try {
    ten_db = new URL(env.DATABASE_URL).pathname.replace(/^\//, "")
  } catch {
    throw new Error(`DATABASE_URL không phải một URL đọc được: ${env.DATABASE_URL}`)
  }

  if (!ten_db.endsWith("_test")) {
    throw new Error(
      [
        `TỪ CHỐI CHẠY: bộ test cách ly sẽ TRUNCATE toàn bộ database "${ten_db}",`,
        `mà tên nó không kết thúc bằng "_test".`,
        ``,
        `Đây gần như chắc chắn là database phát triển của anh. Dựng database`,
        `test một lần bằng:`,
        ``,
        `    npm run db:test:setup`,
        ``,
        `rồi chạy lại \`npm run test:tenant\` — script đó tự trỏ sang database test.`,
      ].join("\n")
    )
  }
}

/**
 * Cột có trong `prisma/schema.prisma` mà database test chưa có — so TỪNG cột
 * của MỌI model (danh sách lấy từ Prisma Client đã sinh), không chỉ tên bảng.
 * Thuần: nhận danh sách cột thật để thử được không cần Postgres.
 */
export function missingSchemaColumns(existing: ReadonlySet<string>): string[] {
  const ns = Prisma as unknown as Record<string, unknown>
  const missing: string[] = []
  for (const model of Object.values(Prisma.ModelName) as string[]) {
    const fields = ns[`${model.charAt(0).toUpperCase()}${model.slice(1)}ScalarFieldEnum`]
    if (!fields || typeof fields !== "object") continue
    for (const column of Object.values(fields as Record<string, string>)) {
      if (!existing.has(`${model}.${column}`)) missing.push(`${model}.${column}`)
    }
  }
  return missing
}

let schemaChecked = false

/**
 * Database test cũ hơn lược đồ → dừng ngay với lời chỉ cách sửa. Trước đây
 * thiếu CỘT (vd. `campaign_packages.video_job_ids`, 24/09/2026) không bị bắt:
 * route trả 500 và ca thử chỉ báo "expected 500 to be 201".
 */
async function assertSchemaUpToDate(): Promise<void> {
  if (schemaChecked) return
  const rows = await prisma.$queryRawUnsafe<Array<{ t: string; c: string }>>(
    "SELECT table_name AS t, column_name AS c FROM information_schema.columns WHERE table_schema = current_schema()"
  )
  const missing = missingSchemaColumns(new Set(rows.map((r) => `${r.t}.${r.c}`)))
  if (missing.length > 0) {
    throw new Error(
      `Database test cũ hơn prisma/schema.prisma — thiếu ${missing.length} cột: ${missing.slice(0, 12).join(", ")}` +
        `${missing.length > 12 ? ", …" : ""}. Chạy \`npm run db:test:setup\` rồi chạy lại \`npm run test:tenant\`.`
    )
  }
  schemaChecked = true
}

/**
 * Dọn sạch các bảng nền giữa các trường hợp thử (bảy của P1, hai
 * bảng quyền của P2, năm bảng Asset/Job/Usage/Audit của P3, hai bảng Hồ sơ
 * của P4, năm bảng Product Master/Analysis của P5, một bảng token tích hợp
 * của P7). Bộ test cách ly phải bắt đầu từ một cơ sở dữ liệu rỗng, nếu không
 * thì "không tìm thấy" có thể là do dữ liệu sót lại chứ không do bộ gác.
 */
export async function resetDatabase(): Promise<void> {
  bat_buoc_la_database_test()
  await assertSchemaUpToDate()
  try {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE ${TENANT_TABLES.join(", ")} RESTART IDENTITY CASCADE`
    )
  } catch (e) {
    // 42P01 = bảng chưa có: database test dựng trước một migration mới (vd.
    // `campaign_packages` 23/09) — 221 ca đỏ cùng lúc mà không nói vì sao
    // (máy anh Tony, 24/09/2026). Nói thẳng cách sửa.
    if (String((e as { message?: unknown })?.message ?? e).includes("42P01")) {
      throw new Error(
        "Database test thiếu bảng — lược đồ cũ hơn prisma/schema.prisma (có migration mới). " +
          "Chạy `npm run db:test:setup` rồi chạy lại `npm run test:tenant`.\n" +
          String((e as { message?: unknown })?.message ?? e)
      )
    }
    throw e
  }
  // Vai hệ thống là danh mục cài đặt, không phải dữ liệu thử: nạp lại đúng
  // như `npm run db:seed` làm sau khi đẩy lược đồ.
  await ensureSystemRoles()
  // Danh mục ngành: `organizations.industry_key` là khoá ngoại (ADR-012 T-6a/T-6c-1)
  await ensureIndustries()
  // Sổ đăng ký nền AI (ai_capabilities, ai_models) không bị truncate ở trên,
  // nhưng phải đảm bảo capabilities mới (như AIC-04) được upsert vào models.
  await seedAiCapabilities()
  await seedVisionModels()
}

export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect()
}

export { prisma }
