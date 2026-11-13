import { prisma } from "@/core/tenancy/infra/prisma"

/**
 * Chat Telegram đã chứng minh thuộc tổ chức: đã nhắn mã liên kết của tổ chức cho bot điều phối
 * chung (`telegramLinkCode`). Bot chỉ nhìn thấy tin nhắn trong khoảng 24 giờ (`getUpdates`), nên
 * chat đã liên kết được nhớ lại trong `organizations.settings.telegram_linked_chat_ids` — khoá do
 * máy chủ ghi, tenant không sửa qua PATCH settings.
 *
 * Mọi lần gửi bằng bot chung chỉ đi tới chat trong danh sách này. Trước 22/10/2026 chat ID nhập từ
 * Excel chi nhánh cũng được tin, nên tiệm A gửi được tin vào nhóm của tiệm B (rà soát cụm G).
 */
export const TELEGRAM_LINKED_CHATS_SETTING_KEY = "telegram_linked_chat_ids"
/** Chat đã bị gỡ → thời điểm gỡ (ISO). Mã liên kết gửi trước thời điểm này không còn tác dụng. */
export const TELEGRAM_UNLINKED_CHATS_SETTING_KEY = "telegram_unlinked_chats"

type Db = typeof prisma

export async function listLinkedTelegramChatIds(organizationId: string, db: Db = prisma): Promise<string[]> {
  const org = await db.organizations.findUnique({ where: { id: organizationId }, select: { settings: true } })
  const raw = (org?.settings as Record<string, unknown> | null)?.[TELEGRAM_LINKED_CHATS_SETTING_KEY]
  return Array.isArray(raw) ? raw.filter((id): id is string => typeof id === "string" && id.length > 0) : []
}

/** Thêm chat vào danh sách đã liên kết — gộp trong một câu lệnh, không ghi đè các khoá settings khác. */
export async function rememberLinkedTelegramChats(organizationId: string, chatIds: string[], db: Db = prisma): Promise<void> {
  const ids = [...new Set(chatIds.filter((id) => id.length > 0))]
  if (ids.length === 0) return
  await db.$executeRaw`
    UPDATE "organizations"
    SET "settings" = jsonb_set(
      COALESCE("settings", '{}'::jsonb),
      ARRAY[${TELEGRAM_LINKED_CHATS_SETTING_KEY}]::text[],
      (
        SELECT COALESCE(jsonb_agg(DISTINCT x), '[]'::jsonb)
        FROM jsonb_array_elements_text(
          CASE WHEN jsonb_typeof("settings" -> ${TELEGRAM_LINKED_CHATS_SETTING_KEY}) = 'array'
            THEN "settings" -> ${TELEGRAM_LINKED_CHATS_SETTING_KEY} ELSE '[]'::jsonb END
          || to_jsonb(${ids}::text[])
        ) AS x
      )
    )
    WHERE "id" = ${organizationId}`
}

export async function listUnlinkedTelegramChats(organizationId: string, db: Db = prisma): Promise<Record<string, string>> {
  const org = await db.organizations.findUnique({ where: { id: organizationId }, select: { settings: true } })
  const raw = (org?.settings as Record<string, unknown> | null)?.[TELEGRAM_UNLINKED_CHATS_SETTING_KEY]
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {}
  return Object.fromEntries(Object.entries(raw).filter((e): e is [string, string] => typeof e[1] === "string"))
}

/** Gỡ chat khỏi danh sách đã liên kết và ghi thời điểm gỡ — một câu lệnh, không đụng khoá settings khác. */
export async function unlinkTelegramChat(organizationId: string, chatId: string, db: Db = prisma): Promise<void> {
  const removedAt = new Date().toISOString()
  await db.$executeRaw`
    UPDATE "organizations"
    SET "settings" = jsonb_set(
      jsonb_set(
        COALESCE("settings", '{}'::jsonb),
        ARRAY[${TELEGRAM_LINKED_CHATS_SETTING_KEY}]::text[],
        (
          SELECT COALESCE(jsonb_agg(x), '[]'::jsonb)
          FROM jsonb_array_elements_text(
            CASE WHEN jsonb_typeof("settings" -> ${TELEGRAM_LINKED_CHATS_SETTING_KEY}) = 'array'
              THEN "settings" -> ${TELEGRAM_LINKED_CHATS_SETTING_KEY} ELSE '[]'::jsonb END
          ) AS x
          WHERE x <> ${chatId}
        )
      ),
      ARRAY[${TELEGRAM_UNLINKED_CHATS_SETTING_KEY}]::text[],
      (CASE WHEN jsonb_typeof("settings" -> ${TELEGRAM_UNLINKED_CHATS_SETTING_KEY}) = 'object'
        THEN "settings" -> ${TELEGRAM_UNLINKED_CHATS_SETTING_KEY} ELSE '{}'::jsonb END)
        || jsonb_build_object(${chatId}::text, ${removedAt}::text)
    )
    WHERE "id" = ${organizationId}`
}
