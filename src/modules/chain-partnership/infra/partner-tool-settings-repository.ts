import { prisma } from "@/core/tenancy/infra/prisma"

/**
 * Ghi danh sách công cụ cấp trên mở khoá cho cửa hàng đối tác (`organizations.settings.unlocked_tools`).
 *
 * AUD-004: route cũ gọi Prisma trực tiếp và đọc-sửa-ghi cả khối `settings` — hai lần lưu đồng thời
 * (hoặc một lần sửa khoá khác của settings) làm mất dữ liệu của nhau. `jsonb_set` chỉ đổi đúng
 * một khoá, trong một câu lệnh.
 */
export async function setPartnerUnlockedTools(partnerOrgId: string, tools: string[]): Promise<boolean> {
  const updated = await prisma.$executeRaw`
    UPDATE organizations
    SET settings = jsonb_set(CASE WHEN jsonb_typeof(settings) = 'object' THEN settings ELSE '{}'::jsonb END, '{unlocked_tools}', ${JSON.stringify(tools)}::jsonb, true),
        updated_at = NOW()
    WHERE id = ${partnerOrgId}`
  return updated === 1
}
