import { prisma } from "@/core/tenancy/infra/prisma"

/**
 * Cấp số thứ tự mã đơn theo tổ chức và tiền tố ngày (đặc tả 07 §57). Mỗi lệnh là một câu SQL nguyên tử trên dòng
 * `order_code_sequences` — đơn tạo cùng lúc nhận số khác nhau, không còn đếm đơn trong ngày rồi đụng mã (thử tải O-9,
 * 12/11/2026). Câu lệnh tự giao dịch nên khoá dòng nhả ngay, không giữ suốt lúc tạo đơn. Tạo đơn lỗi sau khi đã cấp số
 * thì số đó bị bỏ qua — mã đơn có thể nhảy số, không bao giờ trùng.
 */
export async function allocateOrderCodeNumber(organizationId: string, prefix: string): Promise<number> {
  const bumped = await prisma.$queryRaw<Array<{ last_value: number }>>`
    UPDATE "order_code_sequences" SET last_value = last_value + 1, updated_at = now()
     WHERE organization_id = ${organizationId} AND prefix = ${prefix}
    RETURNING last_value`
  if (bumped[0]) return Number(bumped[0].last_value)

  // Lần đầu trong ngày: bắt đầu sau số lớn nhất đã dùng với tiền tố này (đơn tạo trước khi có bộ đếm, hoặc bản cũ
  // còn chạy lúc deploy). Hai lần đầu đồng thời: lần sau rơi vào ON CONFLICT và tăng tiếp từ số của lần trước.
  const created = await prisma.$queryRaw<Array<{ last_value: number }>>`
    INSERT INTO "order_code_sequences" (organization_id, prefix, last_value, updated_at)
    SELECT ${organizationId}, ${prefix}, COALESCE(MAX(substr(code, char_length(${prefix}) + 1)::int), 0) + 1, now()
      FROM "orders"
     WHERE organization_id = ${organizationId} AND starts_with(code, ${prefix})
       AND substr(code, char_length(${prefix}) + 1) ~ '^[0-9]{1,9}$'
    ON CONFLICT (organization_id, prefix)
      DO UPDATE SET last_value = "order_code_sequences".last_value + 1, updated_at = now()
    RETURNING last_value`
  const value = created[0]?.last_value
  if (value === undefined) throw new Error("Không cấp được số mã đơn")
  return Number(value)
}
