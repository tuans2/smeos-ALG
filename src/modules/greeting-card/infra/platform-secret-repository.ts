import { prisma } from "@/core/tenancy/infra/prisma"
import { openSecret, sealSecret } from "@/core/security/secret-box"
import type { IZaloTokenVault, ZaloOaTokens } from "../adapters/staff-channels/zalo-oa-platform"

type Db = typeof prisma
type Tx = Parameters<Parameters<Db["$transaction"]>[0]>[0]

/**
 * Bí mật cấp nền tảng (`platform_secrets`) — không thuộc tổ chức nào nên không qua `scopedWhere`.
 * Giá trị luôn là bản đã niêm phong (secret-box); repository không mã hoá / giải mã.
 */
export class PlatformSecretRepository {
  constructor(private readonly db: Db = prisma) {}

  async get(key: string): Promise<string | null> {
    const row = await this.db.platform_secrets.findUnique({ where: { key }, select: { sealed_value: true } })
    return row?.sealed_value ?? null
  }

  /**
   * Khoá dòng bí mật trong một giao dịch rồi cho `fn` đọc / ghi bản mới. Dùng khi giá trị chỉ dùng
   * được một lần (refresh token Zalo): hai tiến trình cùng làm mới sẽ xếp hàng, tiến trình sau
   * đọc thấy cặp token mới thay vì dùng lại refresh token đã bị huỷ.
   */
  async withLock<T>(
    key: string,
    fn: (current: string | null, save: (sealed: string) => Promise<void>) => Promise<T>
  ): Promise<T> {
    return this.db.$transaction(
      async (tx: Tx) => {
        // Đảm bảo có dòng để khoá (lần đầu chưa có): chèn rỗng nếu thiếu, rồi khoá
        await tx.$executeRaw`
          INSERT INTO "platform_secrets" ("key", "sealed_value", "updated_at") VALUES (${key}, '', NOW())
          ON CONFLICT ("key") DO NOTHING`
        const rows = await tx.$queryRaw<Array<{ sealed_value: string }>>`
          SELECT "sealed_value" FROM "platform_secrets" WHERE "key" = ${key} FOR UPDATE`
        const current = rows[0]?.sealed_value || null
        const save = async (sealed: string) => {
          await tx.platform_secrets.update({ where: { key }, data: { sealed_value: sealed } })
        }
        return fn(current, save)
      },
      { maxWait: 5_000, timeout: 20_000 }
    )
  }
}

const ZALO_OA_KEY = "zalo_oa_tokens"
const ZALO_OA_PURPOSE = "platform-zalo-oa-tokens"

function openTokens(sealed: string | null): ZaloOaTokens | null {
  if (!sealed) return null
  return JSON.parse(openSecret(sealed, ZALO_OA_PURPOSE)) as ZaloOaTokens
}

/** Kho token Zalo OA chung: niêm phong bằng secret-box, làm mới dưới khoá dòng. */
export class ZaloOaTokenVault implements IZaloTokenVault {
  constructor(private readonly repo = new PlatformSecretRepository()) {}

  async read(): Promise<ZaloOaTokens | null> {
    return openTokens(await this.repo.get(ZALO_OA_KEY))
  }

  withLock<T>(fn: (current: ZaloOaTokens | null, save: (tokens: ZaloOaTokens) => Promise<void>) => Promise<T>): Promise<T> {
    return this.repo.withLock(ZALO_OA_KEY, (current, save) =>
      fn(openTokens(current), (tokens) => save(sealSecret(JSON.stringify(tokens), ZALO_OA_PURPOSE)))
    )
  }
}
