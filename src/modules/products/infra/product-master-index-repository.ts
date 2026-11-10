/**
 * Product Master Index Repository (Infra)
 * Thực hiện truy vấn cơ sở dữ liệu để lấy toàn bộ thông tin sản phẩm từ Product Master,
 * Product Images, Assets, Product Analyses (BOM Vision M01), và Pricing Rules (M02).
 *
 * QUY TẮC DỮ LIỆU (rà soát 17/09/2026 — xem mục 7 trong tài liệu rà soát):
 * Hợp đồng Vision (`workers/vision/contracts/Schema.json`) lồng `phong_cach`/`dip_su_dung`
 * bên trong `identity`, và mã màu chuẩn nằm ở `bom.flowers[].mau`/`mo_ta_mau`, KHÔNG có ở
 * cấp cao nhất của bản ghi phân tích. `bom.wrapping` là một MẢNG các lớp gói
 * (`{layer, material, color, texture}`), không phải một object đơn. Không đọc các trường
 * này bằng tên tự nghĩ ra (`analysisData.style`, `attrs.primaryColor`...) — những khoá đó
 * không tồn tại ở đâu trong hệ thống và chỉ lặng lẽ trả về giá trị mặc định bịa.
 * Khi không có dữ liệu thật, hàm này trả về mảng rỗng / chuỗi "chưa rõ" thay vì bịa số
 * liệu cụ thể trông như thật — cùng nguyên tắc đã áp dụng cho Thẻ chào A6 (Giai đoạn 0).
 */

import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/core/tenancy/infra/prisma"
import { branchScopedProductWhere, type TenantContext } from "@/core/tenancy"
import { signStorageUrl } from "@/modules/assets/infra/storage-signing"
import type {
  ProductMasterIndex,
  FlowerBomItem,
  FoliageBomItem,
  AccessoryBomItem,
  WrappingLayer,
  DemUnit,
  ProductVariant,
  ProductGalleryImage,
  StockStatus,
} from "../domain/product-master-index"
import {
  readAssemblySteps,
  readDimensions,
  readOccasions,
  readPrimaryColor,
  readStyle,
  readWrapStyle,
} from "../domain/master-index-fields"
import { toneChuDao } from "@/modules/product-copies/domain/analysis-projection"

/** Hình dạng lỏng lẻo của một dòng `bom.flowers`/`bom.foliage` theo hợp đồng Vision — chỉ khai những khoá hàm này thật sự đọc. */
interface RawFlowerRow {
  name?: string | null
  nhom_hoa?: string | null
  flowerName?: string | null
  quantity?: number | null
  dvt_dem?: string | null
  unit?: string | null
  mo_ta_mau?: string | null
  mau?: string | null
  color?: string | null
  role?: string | null
  shade?: string | null
  /** Số nụ chưa nở của riêng loài này — đếm riêng, KHÔNG cộng vào `quantity` (nợ #90). */
  so_nu?: number | null
  /** Số cành hỏng/héo/dập của riêng loài này — đã NẰM TRONG `quantity` (nợ #90). */
  so_hong?: number | null
  /** MI-12 (ĐP-2b, 26/09/2026): giống/biến thể cụ thể — khác `name`/`nhom_hoa`. */
  bien_the?: string | null
  /** MI-12: chiều dài cành (cm). */
  chieu_dai_cm?: number | null
  /** MI-12: cờ cho phép thay thế cấp từng dòng BOM. */
  duoc_thay_the?: boolean | null
  /** MI-12: thứ tự ưu tiên bị thay thế khi thiếu hàng — số nhỏ hơn thay trước. */
  thu_tu_uu_tien_thay_the?: number | null
}

interface RawAccessoryRow {
  name?: string | null
  material?: string | null
  color?: string | null
  quantity?: number | null
  printed_text?: string | null
  /** MI-12 (ĐP-2b, 26/09/2026): đơn vị tính (vd. "cái", "bộ"). */
  don_vi?: string | null
  /** MI-12: cờ cho phép thay thế cấp từng dòng BOM. */
  duoc_thay_the?: boolean | null
}

interface RawWrappingLayer {
  layer?: string | null
  material?: string | null
  color?: string | null
  texture?: string | null
  /** MI-12 (ĐP-2b, 26/09/2026): hoa văn/hoạ tiết — khác `texture` (kết cấu vật liệu). */
  hoa_van?: string | null
  /** MI-12: số lượng lớp/tấm của CHÍNH lớp gói này. */
  so_luong?: number | null
  /** MI-12: cờ cho phép thay thế cấp từng dòng BOM. */
  duoc_thay_the?: boolean | null
}

const DEM_UNITS: readonly DemUnit[] = ["bông", "cành", "lá", "cây"]

/** `dvt_dem` của hợp đồng Vision là "Bông"|"Cành"|"Lá"|"Cây" (viết hoa chữ cái đầu). */
function normalizeUnit(raw: string | null | undefined): string | null {
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim().toLowerCase() : null
}

/**
 * Chuẩn hoá đơn vị đếm về đúng 4 giá trị của `dvt_dem` (nợ kỹ thuật P-Fix-2, mục "chuẩn hoá
 * đơn vị đếm"). Giá trị lạ hoặc thiếu (kể cả `unit` tự do cũ "nhánh"/"chùm" không nằm trong
 * hợp đồng Vision) rơi về mặc định "cành" — giữ đúng hành vi mặc định trước bản sửa này.
 */
function toDemUnit(raw: string | null | undefined): DemUnit {
  const normalized = normalizeUnit(raw)
  return normalized !== null && (DEM_UNITS as readonly string[]).includes(normalized) ? (normalized as DemUnit) : "cành"
}

/** `bom.flowers[].role` của hợp đồng Vision là "Hoa chủ đạo"|"Hoa phụ"|"Hoa điểm xuyết"|"Hoa lấp đầy"|null — không phải "Chủ đạo"/"Phụ" trần trụi. */
function mapFlowerRole(raw: string | null | undefined): FlowerBomItem["role"] {
  switch (raw) {
    case "Hoa chủ đạo":
      return "Chủ đạo"
    case "Hoa phụ":
      return "Phụ"
    case "Hoa điểm xuyết":
      // Đúng vai trò HOA "điểm xuyết" theo hợp đồng Vision — sửa nợ #89, KHÔNG còn dịch
      // nhầm thành "Lá điểm" (một khái niệm thuộc về LÁ, không phải hoa).
      return "Điểm xuyến"
    case "Hoa lấp đầy":
      return "Lấp đầy"
    default:
      // AI chưa xác định được vai trò (null/thiếu) — xếp tạm vào nhóm ít quan trọng nhất
      // thay vì đoán "Chủ đạo", để không đánh lừa thợ chế tác về hoa nào là hoa chính.
      return "Lấp đầy"
  }
}

/** `bom.foliage[].role` của hợp đồng Vision là "Nền"|"Viền"|"Điểm nhấn"|"Lấp đầy"|null. */
function mapFoliageRole(raw: string | null | undefined): FoliageBomItem["role"] {
  switch (raw) {
    case "Nền":
      return "Nền"
    case "Viền":
      return "Viền"
    case "Điểm nhấn":
      return "Điểm nhấn"
    case "Lấp đầy":
      return "Lấp đầy"
    default:
      return "Lấp đầy"
  }
}

function asRowArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

/**
 * Quan hệ nạp kèm cho Master Index — dùng chung cho `getById` và `list`.
 * - `images`: mọi ảnh (MAIN/GALLERY/CATALOG/SOCIAL) — trước bản sửa P-Fix-3b (17/09) chỉ lấy
 *   MAIN, ba vai trò còn lại của `product_images` bị bỏ qua dù đã có sẵn trong schema.
 * - `inventory`: tồn kho theo chi nhánh (P-Fix-3a, migration chạy 17/09) — lấy MỌI dòng của
 *   sản phẩm rồi lọc đúng chi nhánh (`products.branch_id`) trong `mapToMasterIndex`, vì
 *   `include` không lọc được theo cột của chính bản ghi cha trong cùng một truy vấn.
 */
const MASTER_INDEX_INCLUDE = {
  images: true,
  variants: true,
  inventory: true,
  analyses: {
    where: { approval_state: "APPROVED" },
    orderBy: { created_at: "desc" },
    take: 1,
  },
} as const satisfies Prisma.productsInclude

type MasterIndexRow = Prisma.productsGetPayload<{ include: typeof MASTER_INDEX_INCLUDE }>

export class ProductMasterIndexRepository {
  async getById(ctx: TenantContext, productId: string): Promise<ProductMasterIndex | null> {
    const row = await prisma.products.findFirst({
      where: { id: productId, organization_id: ctx.organizationId, ...branchScopedProductWhere(ctx, undefined) },
      include: MASTER_INDEX_INCLUDE,
    })

    if (!row) return null
    return this.mapToMasterIndex(ctx, row)
  }

  async list(ctx: TenantContext, limit = 50): Promise<ProductMasterIndex[]> {
    const rows = await prisma.products.findMany({
      where: { organization_id: ctx.organizationId, ...branchScopedProductWhere(ctx, undefined) },
      include: MASTER_INDEX_INCLUDE,
      orderBy: { updated_at: "desc" },
      take: limit,
    })

    return Promise.all(rows.map((row) => this.mapToMasterIndex(ctx, row)))
  }

  private async mapToMasterIndex(ctx: TenantContext, row: MasterIndexRow): Promise<ProductMasterIndex> {
    const attrs = (row.attributes as Record<string, unknown>) ?? {}
    const analysis = row.analyses?.[0]
    const analysisData = ((analysis?.edited ?? analysis?.raw) as Record<string, unknown>) ?? {}
    // Quy tắc đọc trường dùng chung với phép chiếu công khai (Thẻ chào) — xem master-index-fields.ts
    const source = { category: row.category, attributes: row.attributes, analysis: analysisData }
    const bomData = (analysisData.bom as Record<string, unknown>) ?? {}
    const attrsBom = (attrs.bom as Record<string, unknown>) ?? {}
    // Ưu tiên BOM của lượt phân tích APPROVED gắn với sản phẩm; nếu sản phẩm không có lượt
    // phân tích nào (hiếm — ví dụ tạo tay), thử `products.attributes.bom` đã ghi lúc duyệt.
    const rawFlowers = asRowArray<RawFlowerRow>(bomData.flowers ?? attrsBom.flowers)

    const flowers: FlowerBomItem[] = rawFlowers.map((f) => ({
      flowerName: f.name ?? f.nhom_hoa ?? "Hoa (chưa rõ tên)",
      quantity: Number(f.quantity ?? 1),
      unit: toDemUnit(f.dvt_dem ?? f.unit),
      color: f.mo_ta_mau ?? f.mau ?? f.color ?? "Chưa rõ màu",
      role: mapFlowerRole(f.role),
      ...(f.shade ? { shade: f.shade } : {}),
      ...(typeof f.so_nu === "number" ? { budCount: f.so_nu } : {}),
      ...(typeof f.so_hong === "number" ? { damagedCount: f.so_hong } : {}),
      // MI-12 (ĐP-2b, 26/09/2026) — chỉ khai khi có giá trị thật, không suy đoán/mặc định.
      ...(f.bien_the ? { variety: f.bien_the } : {}),
      ...(typeof f.chieu_dai_cm === "number" ? { stemLengthCm: f.chieu_dai_cm } : {}),
      ...(typeof f.duoc_thay_the === "boolean" ? { substitutionAllowed: f.duoc_thay_the } : {}),
      ...(typeof f.thu_tu_uu_tien_thay_the === "number" ? { substitutionPriority: f.thu_tu_uu_tien_thay_the } : {}),
    }))

    // Cấu trúc atomic đầy đủ (số lượng/màu/vai trò/chất liệu/chữ in) thay vì chỉ giữ tên
    // trần — trả nợ #88. Vẫn nhận cả dòng cũ là chuỗi trần (dữ liệu tạo tay từ trước bản
    // sửa này) để không vỡ sản phẩm cũ, quy về cấu trúc mới với các trường còn lại "chưa rõ".
    const rawFoliage = asRowArray<RawFlowerRow | string>(bomData.foliage ?? attrsBom.foliage)
    const foliage: FoliageBomItem[] = rawFoliage.map((l) =>
      typeof l === "string"
        ? { name: l || "Lá (chưa rõ tên)", quantity: null, unit: "cành", color: "Chưa rõ màu", role: "Lấp đầy" }
        : {
            name: l.name ?? l.nhom_hoa ?? "Lá (chưa rõ tên)",
            quantity: typeof l.quantity === "number" ? l.quantity : null,
            unit: toDemUnit(l.dvt_dem ?? l.unit),
            color: l.mo_ta_mau ?? l.mau ?? l.color ?? "Chưa rõ màu",
            role: mapFoliageRole(l.role),
            // MI-12 (ĐP-2b, 26/09/2026).
            ...(typeof l.duoc_thay_the === "boolean" ? { substitutionAllowed: l.duoc_thay_the } : {}),
          }
    )

    const rawAccessories = asRowArray<RawAccessoryRow | string>(bomData.accessories ?? attrsBom.accessories)
    const accessories: AccessoryBomItem[] = rawAccessories.map((a) =>
      typeof a === "string"
        ? { name: a || "Phụ kiện (chưa rõ tên)", material: "Chưa rõ chất liệu", color: "Chưa rõ màu", quantity: null, printedText: null }
        : {
            name: a.name ?? "Phụ kiện (chưa rõ tên)",
            material: a.material ?? "Chưa rõ chất liệu",
            color: a.color ?? "Chưa rõ màu",
            quantity: typeof a.quantity === "number" ? a.quantity : null,
            printedText: a.printed_text ?? null,
            // MI-12 (ĐP-2b, 26/09/2026).
            ...(a.don_vi ? { unit: a.don_vi } : {}),
            ...(typeof a.duoc_thay_the === "boolean" ? { substitutionAllowed: a.duoc_thay_the } : {}),
          }
    )

    // `bom.wrapping` là MẢNG các lớp gói {layer, material, color, texture}, không phải object đơn.
    const wrappingList = asRowArray<RawWrappingLayer>(bomData.wrapping ?? attrsBom.wrapping)
    const wrapStyle = readWrapStyle(source) ?? "Chưa rõ kiểu gói"

    const tieWrap = wrappingList.find((w) => w.layer === "Đai buộc")
    const ribbonFromAccessories = accessories.find((a) => a.name.includes("ruy") || a.name.includes("nơ"))?.name
    const ribbon = tieWrap
      ? [tieWrap.material, tieWrap.color].filter(Boolean).join(" ") || "Chưa rõ ruy băng"
      : (ribbonFromAccessories ?? "Chưa rõ ruy băng")

    // Mảng lớp gói đầy đủ theo đúng hợp đồng Vision, cho những nơi tiêu thụ mới cần hơn
    // hai chuỗi suy ra `wrapStyle`/`ribbon` ở trên (nợ #88, phần wrapping).
    const wrapping: WrappingLayer[] = wrappingList.map((w) => ({
      layer: w.layer ?? "Chưa rõ lớp",
      material: w.material ?? "Chưa rõ chất liệu",
      color: w.color ?? "Chưa rõ màu",
      texture: w.texture ?? "Chưa rõ kết cấu",
      // MI-12 (ĐP-2b, 26/09/2026).
      ...(w.hoa_van ? { pattern: w.hoa_van } : {}),
      ...(typeof w.so_luong === "number" ? { quantity: w.so_luong } : {}),
      ...(typeof w.duoc_thay_the === "boolean" ? { substitutionAllowed: w.duoc_thay_the } : {}),
    }))

    // Số tầng cắm (`san_xuat.so_tang_lop`) — phục vụ QC/định giá công thợ (nợ #90).
    const sanXuat = (analysisData.san_xuat as Record<string, unknown> | undefined) ?? {}
    const tierCount = typeof sanXuat.so_tang_lop === "number" ? sanXuat.so_tang_lop : undefined

    // QUYẾT ĐỊNH CHỦ SẢN PHẨM 17/09 (nợ #87, TECHNICAL_DEBT.md): hệ thống KHÔNG lưu một giá
    // niêm yết tĩnh theo từng sản phẩm — mọi giá bán thật phải đi qua `quotePrice()` (M02)
    // gắn với một lượt tư vấn/đơn cụ thể, theo hạng đối tác và phụ phí tại thời điểm đó.
    // Bảng `pricing_rules` chỉ lưu một số ít luật giá CHUNG CHO CẢ TỔ CHỨC (vd
    // `floor_ceiling_ratio`), không lưu giá theo từng mã sản phẩm — KHÔNG tra bảng đó bằng
    // `key = mã sản phẩm` (câu tra cứu cũ luôn thất bại và ngầm rơi về số bịa 500.000đ).
    // Trả `null` (không phải 0) khi chưa có giá — kiểu `number | null` của `quotePriceVnd`
    // buộc mọi nơi tiêu thụ phải xử lý tường minh "Liên hệ để báo giá", không còn có thể lặng
    // lẽ hiển thị "0 đ" cho khách như khi field này còn là `number` mặc định 0.
    const priceFromAttrs = typeof attrs.price_vnd === "number" && attrs.price_vnd > 0 ? attrs.price_vnd : null
    const quotePriceVnd = priceFromAttrs

    // Mọi ảnh của sản phẩm — MAIN dựng `masterImageUrl` như cũ, ba vai trò còn lại
    // (GALLERY/CATALOG/SOCIAL) dựng `galleryImages` (nợ mới P-Fix-3b, 17/09: trước bản sửa
    // này ba vai trò đó bị bỏ qua hoàn toàn dù `product_images.role` đã khai sẵn cả bốn).
    const allImages = asRowArray<{ role?: string | null; asset_id: string; position?: number | null }>(row.images)
    const mainImage = allImages.find((img) => img.role === "MAIN")
    const galleryImageRows = allImages
      .filter((img): img is { role: "GALLERY" | "CATALOG" | "SOCIAL" | "REFERENCE"; asset_id: string; position?: number | null } =>
        img.role === "GALLERY" || img.role === "CATALOG" || img.role === "SOCIAL" || img.role === "REFERENCE"
      )
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

    let masterImageUrl: string | undefined = undefined
    const galleryImages: ProductGalleryImage[] = []
    const assetIdsToResolve = [
      ...(mainImage ? [mainImage.asset_id] : []),
      ...galleryImageRows.map((img) => img.asset_id),
    ]
    if (assetIdsToResolve.length > 0) {
      // Một lượt IN(...) thay vì N lượt findUnique — cùng lối tối ưu đã áp dụng cho
      // `importCatalog` (nợ #37, đã trả 09/10), tránh lặp lại kiểu N+1 cũ cho MỖI ảnh.
      const assets = await prisma.assets.findMany({ where: { id: { in: assetIdsToResolve } } })
      const storageKeyById = new Map(assets.map((a) => [a.id, a.storage_key]))

      if (mainImage) {
        const key = storageKeyById.get(mainImage.asset_id)
        if (key) {
          const exp = Date.now() + 86_400_000 // 24h
          masterImageUrl = `/api/v1/storage/${key}?exp=${exp}&sig=${signStorageUrl(key, exp)}`
        }
      }
      for (const img of galleryImageRows) {
        const key = storageKeyById.get(img.asset_id)
        if (key) {
          const exp = Date.now() + 86_400_000
          galleryImages.push({ role: img.role, url: `/api/v1/storage/${key}?exp=${exp}&sig=${signStorageUrl(key, exp)}` })
        }
      }
    }

    // Biến thể kích thước/gói — đọc từ `product_variants` (bảng đã có sẵn, chưa từng được
    // Master Index đọc tới trước P-Fix-3a, 17/09). Chốt với chủ sản phẩm: chưa có dữ liệu
    // size thật nào — mảng rỗng là đúng thực trạng, không phải một lỗi.
    const variants: ProductVariant[] = asRowArray<{ id: string; name: string; size?: string | null; multiplier: number }>(
      row.variants
    ).map((v) => ({
      id: v.id,
      name: v.name,
      size: v.size ?? undefined,
      multiplier: v.multiplier,
    }))

    // Tag cảnh báo tự do (dị ứng/mùi hương/độc tính thú cưng) — chốt với chủ sản phẩm 17/09:
    // tính năng THAM KHẢO, chưa có danh mục chuẩn hoá, nhân viên tự gõ vào
    // `products.attributes.warningTags`. Mảng rỗng = chưa ai gắn cảnh báo, không phải "an toàn".
    const warningTags = Array.isArray(attrs.warningTags) ? attrs.warningTags.filter((t) => typeof t === "string") : []

    // Kích thước vật lý — chỉ đọc khi có số thật đã nhập ở `products.attributes.dimensions`,
    // KHÔNG bịa mặc định "55×40" như `sales-pitch-template.ts` từng làm cho Thẻ chào A6 (nợ
    // ghi riêng — xem TECHNICAL_DEBT.md, phát hiện lúc thêm trường này).
    const dimensions = readDimensions(source) ?? undefined

    // Các bước cắm tham khảo — chỉ đọc khi quản lý mẫu đã nhập tay ở
    // `products.attributes.assemblySteps`, KHÔNG bịa quy trình (cùng kỷ luật với `dimensions`).
    const assemblySteps = readAssemblySteps(source) ?? undefined

    // Chính sách thay thế hoa tương đương — cờ + ghi chú tuỳ chọn ở `products.attributes.substitutionPolicy`.
    const rawSubstitution = attrs.substitutionPolicy as Record<string, unknown> | undefined
    const substitutionPolicy =
      rawSubstitution && typeof rawSubstitution.allowed === "boolean"
        ? { allowed: rawSubstitution.allowed, note: typeof rawSubstitution.note === "string" ? rawSubstitution.note : undefined }
        : undefined

    // Số ngày cam kết tươi — cấu hình CHUNG cấp tổ chức (chốt với chủ sản phẩm 17/09: một con
    // số áp cho mọi sản phẩm, không phải theo từng mẫu). KHÔNG bịa mặc định "3 ngày" — để
    // `undefined` cho tới khi tổ chức thật sự cấu hình `organizations.settings.freshness_guarantee_days`.
    const org = await prisma.organizations.findUnique({
      where: { id: ctx.organizationId },
      select: { settings: true },
    })
    const orgSettings = (org?.settings as Record<string, unknown> | undefined) ?? {}
    const freshnessGuaranteeDays =
      typeof orgSettings.freshness_guarantee_days === "number" ? orgSettings.freshness_guarantee_days : undefined

    // Tồn kho theo mẫu sản phẩm (không phải nguyên liệu rời) — chốt với chủ sản phẩm 17/09,
    // migration `product_inventory` đã chạy thật trên máy anh Tony (nợ #95, đóng cùng đợt này).
    // `product_inventory` là bảng THEO CHI NHÁNH (`branch_id` bắt buộc), còn `ProductMasterIndex.stock`
    // là MỘT giá trị — khớp đúng chi nhánh mà CHÍNH sản phẩm này đang gắn (`products.branch_id`,
    // cột đã có sẵn, tuỳ chọn). Sản phẩm CHƯA gắn chi nhánh cụ thể (branch_id null — hiện là
    // toàn bộ AVI GIFT, một cửa hàng, chưa có bộ chọn chi nhánh — nợ #3) thì `stock` để
    // `undefined`: không có "chi nhánh của sản phẩm" để tra, và gộp tồn kho nhiều chi nhánh
    // thành MỘT trạng thái là một quyết định kinh doanh riêng chưa ai chốt — không suy diễn.
    const inventoryRows = asRowArray<{ branch_id: string; status: string; quantity_available: number | null }>(
      row.inventory
    )
    const matchingInventory = row.branch_id ? inventoryRows.find((inv) => inv.branch_id === row.branch_id) : undefined
    const stock: ProductMasterIndex["stock"] = matchingInventory
      ? {
          status: matchingInventory.status as StockStatus,
          quantityAvailable: matchingInventory.quantity_available ?? undefined,
        }
      : undefined

    const toneMau = toneChuDao(analysisData)

    return {
      id: row.id,
      organizationId: row.organization_id,
      code: row.code,
      name: row.name,
      status: row.status,
      // MI-3 (ĐP-2.1, 26/09/2026): phiên bản Master Index cho snapshot của Điều phối (Hợp đồng MI §5).
      updatedAt: row.updated_at.toISOString(),
      category: row.category ?? "Sản phẩm",
      shape: row.shape ?? "Tròn",
      facing: row.facing ?? "Một mặt",
      container: row.container ?? undefined,
      style: readStyle(source) ?? "Chưa rõ phong cách",
      // Hợp nhất dịp AI đoán (M01, `identity.dip_su_dung`) với dịp người duyệt
      // M01b đã chỉnh tay (`attrs.salesData.occasions`) — trước bản sửa này chỉ
      // đọc một nguồn, làm mất lựa chọn của người duyệt (nợ #92).
      occasions: readOccasions(source),
      masterImageUrl,
      colorPalette: {
        primaryColor: readPrimaryColor(source) ?? "Chưa rõ màu chủ đạo",
        secondaryColor: toneMau[1] ?? undefined,
        // Không có nơi nào trong hệ thống tính "tông hài hoà" (Pastel/Rực rỡ/Trầm ấm/Đơn sắc)
        // từ dữ liệu AI — để trống thay vì bịa "Nổi bật" cho mọi sản phẩm.
      },
      bom: {
        flowers,
        foliage,
        wrapping,
        wrapStyle,
        ribbon,
        accessories,
        ...(tierCount !== undefined ? { tierCount } : {}),
      },
      pricing: {
        quotePriceVnd,
      },
      variants,
      stock,
      galleryImages,
      ...(freshnessGuaranteeDays !== undefined ? { freshnessGuaranteeDays } : {}),
      warningTags,
      ...(dimensions !== undefined ? { dimensions } : {}),
      ...(assemblySteps !== undefined ? { assemblySteps } : {}),
      ...(substitutionPolicy !== undefined ? { substitutionPolicy } : {}),
    }
  }
}

let _productMasterIndexRepo: ProductMasterIndexRepository | null = null
export function getProductMasterIndexRepository(): ProductMasterIndexRepository {
  if (!_productMasterIndexRepo) _productMasterIndexRepo = new ProductMasterIndexRepository()
  return _productMasterIndexRepo
}
