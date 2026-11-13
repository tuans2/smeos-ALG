import type { DbClient } from "@/modules/organization/infra/db-client"
import { prisma } from "@/core/tenancy/infra/prisma"
import { scopedData, scopedWhere, type TenantContext } from "@/core/tenancy"
import type { OccasionRegisterValue } from "@/modules/organization/domain/occasion-rules"
import type {
  IOccasionRepository,
  CreateOccasionInput,
  UpdateOccasionInput,
  OccasionEntity,
} from "../domain/repositories/occasion-repository.interface"

/**
 * Thêm "Chia buồn" (SOLEMN) — nợ #104, 18/09. Trước đợt này, 6 dòng mặc định
 * không có dịp nào ở tông SOLEMN nên tính năng "giọng theo dịp" không có gì
 * để minh hoạ ngay cả với tổ chức mới. Tên "Chia buồn" lấy nguyên từ
 * `extractOccasionFromQuery()` (`flower-consultant-rules.ts`) — thuật ngữ đã
 * có sẵn trong hệ thống cho đúng dịp này, không bịa mới. Tổ chức ĐÃ tồn tại
 * trước 18/09 (kể cả AVI GIFT) sẽ tự nhận dòng này ở lần `seedDefault()` kế
 * tiếp nếu mã "condolence" chưa có (vì hàm chỉ tạo mã còn thiếu, không đụng
 * dòng đã có) — không có cơ chế tự chạy lại `seedDefault()` cho tổ chức cũ,
 * nên tenant có thể tự thêm/đổi tên/tắt qua UI quản lý dịp.
 */
const DEFAULT_OCCASIONS: ReadonlyArray<{
  code: string
  name: string
  sortOrder: number
  register: OccasionRegisterValue
}> = [
  { code: "valentine", name: "Valentine", sortOrder: 1, register: "FESTIVE" },
  { code: "women_day", name: "8/3", sortOrder: 2, register: "FESTIVE" },
  { code: "mothers_day", name: "Ngày mẹ", sortOrder: 3, register: "FESTIVE" },
  { code: "wedding", name: "Cưới", sortOrder: 4, register: "FESTIVE" },
  { code: "opening", name: "Khai trương", sortOrder: 5, register: "FESTIVE" },
  { code: "anniversary", name: "Kỷ niệm", sortOrder: 6, register: "NEUTRAL" },
  { code: "condolence", name: "Chia buồn", sortOrder: 7, register: "SOLEMN" },
] as const

export class OccasionRepository implements IOccasionRepository {
  constructor(private readonly db: DbClient = prisma) {}

  async seedDefault(ctx: TenantContext): Promise<void> {
    const existing = await this.db.occasions.findMany({
      where: scopedWhere(ctx, {}),
      select: { code: true },
    })
    const existingCodes = new Set(existing.map((o: { code: string }) => o.code))

    const toCreate = DEFAULT_OCCASIONS.filter((o) => !existingCodes.has(o.code))
    if (toCreate.length === 0) return

    await this.db.occasions.createMany({
      data: toCreate.map((o) =>
        scopedData(ctx, {
          code: o.code,
          name: o.name,
          sort_order: o.sortOrder,
          is_active: true,
          register: o.register,
        })
      ),
    })
  }

  /** Danh sách CHỈ dịp đang bật — dùng cho màn hình chọn dịp khi soạn nội dung. */
  async list(ctx: TenantContext) {
    return this.db.occasions.findMany({
      where: scopedWhere(ctx, { is_active: true }),
      orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
    })
  }

  /**
   * Toàn bộ dịp kể cả đã tắt — dùng cho UI quản lý (nợ #104) để chủ shop vẫn
   * thấy và bật lại dịp đã tắt, khác `list()` vốn phục vụ nơi CHỌN dịp để dùng.
   */
  async listAll(ctx: TenantContext) {
    return this.db.occasions.findMany({
      where: scopedWhere(ctx, {}),
      orderBy: [{ sort_order: "asc" }, { created_at: "asc" }],
    })
  }

  async findByCode(ctx: TenantContext, code: string) {
    return this.db.occasions.findFirst({
      where: scopedWhere(ctx, { code }),
    })
  }

  async findById(ctx: TenantContext, id: string) {
    return this.db.occasions.findFirst({
      where: scopedWhere(ctx, { id }),
    })
  }

  async create(
    ctx: TenantContext,
    input: { code: string; name: string; register: OccasionRegisterValue; sortOrder: number }
  ) {
    return this.db.occasions.create({
      data: scopedData(ctx, {
        code: input.code,
        name: input.name,
        register: input.register,
        sort_order: input.sortOrder,
        is_active: true,
      }),
    })
  }

  /**
   * Đi qua `updateMany` với điều kiện tổ chức, giống `BranchRepository.update`
   * — `update` theo id thẳng sẽ sửa được bản ghi tổ chức khác nếu đoán đúng
   * id. Số dòng chạm tới bằng 0 nghĩa là không tìm thấy (dịch thành 404 ở
   * tầng use-case, không phải 403).
   */
  async update(
    ctx: TenantContext,
    id: string,
    input: { name?: string; register?: OccasionRegisterValue; sort_order?: number; is_active?: boolean }
  ) {
    const result = await this.db.occasions.updateMany({
      where: scopedWhere(ctx, { id }),
      data: input,
    })
    if (result.count === 0) return null
    return this.findById(ctx, id)
  }
}

let occasionRepoInstance: IOccasionRepository | null = null

export function getOccasionRepository(db?: DbClient): IOccasionRepository {
  if (db) return new OccasionRepository(db)
  if (!occasionRepoInstance) {
    occasionRepoInstance = new OccasionRepository()
  }
  return occasionRepoInstance!
}