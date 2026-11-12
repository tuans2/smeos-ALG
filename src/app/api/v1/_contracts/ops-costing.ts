import type { OpenApiOperation } from "@/core/http/openapi"

import { BODY_ERRORS, op } from "./internal-op"
import * as req from "./requests-costing"
import * as res from "./responses-costing"

/** Operation `/costing/*` (Nhóm công cụ 6), `/pricing-rules`, `/price-lists/*` (OpenAPI nội bộ, PO 07/11/2026). */
const COST = "Tính giá — nguyên liệu & giá vốn"
const RULE = "Quy tắc giá & bảng giá"
const IND = "Ngành của cửa hàng chưa có công cụ tính giá → 422."
const NF = "Của tổ chức khác → 404."

export const COSTING_OPERATIONS: OpenApiOperation[] = [
  op(COST, { method: "get", path: "/costing/profile", operationId: "getCostingProfile", summary: "Hồ sơ tính giá theo ngành của cửa hàng", cap: "L1",
    description: "Mặc định của ngành ghi đè bằng quy tắc giá của cửa hàng. Ngành chưa hỗ trợ → `supported: false` (vẫn 200).",
    ok: [200, { description: "Hồ sơ", schema: res.costingProfileResponse }] }),
  op(COST, { method: "get", path: "/costing/materials", operationId: "listMaterials", summary: "Nguyên liệu kèm cảnh báo biến động giá", cap: "L5", query: req.materialsQuery,
    description: IND, ok: [200, { description: "Nguyên liệu", schema: res.materialsResponse }], errors: [422] }),
  op(COST, { method: "post", path: "/costing/materials", operationId: "createMaterial", summary: "Thêm nguyên liệu", cap: "L6", body: req.createMaterialBody,
    description: `Có đơn giá thì ghi mốc lịch sử đầu tiên. Nhóm nguyên liệu không thuộc ngành → 400. ${IND}`,
    ok: [201, { description: "Nguyên liệu", schema: res.materialResponse }], errors: [...BODY_ERRORS, 422] }),
  op(COST, { method: "patch", path: "/costing/materials/{id}", operationId: "updateMaterial", summary: "Sửa nguyên liệu", cap: "L6", body: req.patchMaterialBody,
    description: `Đổi đơn giá ghi thêm một mốc lịch sử. ${NF} ${IND}`, ok: [200, { description: "Nguyên liệu", schema: res.materialResponse }], errors: [...BODY_ERRORS, 404, 422] }),
  op(COST, { method: "get", path: "/costing/materials/{id}/history", operationId: "getMaterialPriceHistory", summary: "Lịch sử đơn giá nguyên liệu", cap: "L5",
    description: `Mới nhất trước. ${NF}`, ok: [200, { description: "Mốc giá", schema: res.materialHistoryResponse }], errors: [404] }),
  op(COST, { method: "get", path: "/costing/recipes/{productId}", operationId: "getRecipe", summary: "Công thức sản phẩm, hoặc bản nháp từ BOM AI", cap: "L1",
    description: `${NF} ${IND}`, ok: [200, { description: "Công thức", schema: res.recipeResponse }], errors: [404, 422] }),
  op(COST, { method: "put", path: "/costing/recipes/{productId}", operationId: "saveRecipe", summary: "Lưu công thức (thay toàn bộ, tăng phiên bản)", cap: "L3",
    body: req.saveRecipeBody, description: `Dòng số lượng 0 bị bỏ. Sản phẩm hoặc nguyên liệu của tổ chức khác → 404. ${IND}`,
    ok: [200, { description: "Phiên bản mới", schema: res.savedRecipeResponse }], errors: [...BODY_ERRORS, 404, 422] }),
  op(COST, { method: "get", path: "/costing/products/{productId}/cost", operationId: "getProductCost", summary: "Giá vốn phân rã và kịch bản giá bán", cap: "L5", query: req.costQuery,
    description: `\`competitor_vnd\` (> 0) thêm kịch bản giá đối thủ. Thiếu đơn giá → \`missingPrices\`, không có kịch bản. ${NF} ${IND}`,
    ok: [200, { description: "Giá vốn", schema: res.productCostResponse }], errors: [404, 422] }),
  op(COST, { method: "post", path: "/costing/products/{productId}/price", operationId: "applyProductPrice", summary: "Áp giá bán đã chọn", cap: "L3", body: req.applyPriceBody,
    description: `Ghi \`attributes.price\` và nhật ký kiểm toán \`product.price.apply\` (giá cũ/mới, giá vốn lúc áp) cùng giao dịch. ${NF} ${IND}`,
    ok: [200, { description: "Giá cũ và mới", schema: res.applyPriceResponse }], errors: [...BODY_ERRORS, 404, 422] }),
  op(COST, { method: "get", path: "/costing/needs", operationId: "getMaterialNeeds", summary: "Dự toán mua nguyên liệu cho đơn giao trong khoảng ngày", cap: "L5", query: req.needsQuery,
    description: `Đơn \`CONFIRMED\`/\`PROCESSING\`. Ngày sai định dạng hoặc \`from\` > \`to\` → 400. ${IND}`,
    ok: [200, { description: "Dự toán", schema: res.needsResponse }], errors: [400, 422] }),
  op(COST, { method: "post", path: "/costing/needs/purchase", operationId: "recordMaterialPurchase", summary: "Đánh dấu đã mua theo dự toán", cap: "L6", body: req.recordPurchaseBody,
    description: `Cộng tồn; có giá mua thì cập nhật đơn giá + lịch sử nguồn \`PURCHASE\`. Nguyên liệu của tổ chức khác → 404. ${IND}`,
    ok: [200, { description: "Số nguyên liệu đã cập nhật", schema: res.purchaseResponse }], errors: [...BODY_ERRORS, 404, 422] }),

  op(RULE, { method: "get", path: "/pricing-rules", operationId: "getPricingRules", summary: "Quy tắc giá hiệu lực", cap: "L5", query: req.pricingRulesQuery,
    description: "Theo tổ chức; `branch_id` (hoặc chi nhánh của phiên) lấy cấu hình của chi nhánh. Thân không bọc `{ data }`.",
    ok: [200, { description: "Quy tắc giá", schema: res.pricingRulesResponse }] }),
  op(RULE, { method: "put", path: "/pricing-rules", operationId: "putPricingRule", summary: "Ghi một quy tắc giá", cap: "L6", body: req.putPricingRuleBody,
    description: "Mỗi lần ghi một dòng mới (chèn-chỉ). Khoá lạ hoặc giá trị sai → 400; chi nhánh của tổ chức khác, hoặc người bị giới hạn chi nhánh ghi quy tắc toàn tổ chức → 404.",
    ok: [200, { description: "Quy tắc giá sau khi ghi", schema: res.pricingRulePutResponse }], errors: [...BODY_ERRORS, 404] }),
  op(RULE, { method: "get", path: "/price-lists", operationId: "listPriceLists", summary: "Bảng giá sản phẩm", cap: "L1",
    description: "Kèm danh mục sản phẩm để chọn. Thân không bọc `{ data }` riêng cho từng bảng.", ok: [200, { description: "Bảng giá", schema: res.priceListsResponse }] }),
  op(RULE, { method: "post", path: "/price-lists", operationId: "createPriceList", summary: "Tạo bảng giá", cap: "L3", body: req.priceListBodySchema,
    description: "Tối đa 50 bảng mỗi cửa hàng → 409. Ngày sai hoặc `valid_from` > `valid_to` → 400.", ok: [201, { description: "Bảng giá", schema: res.priceListResponse }], errors: [...BODY_ERRORS, 409] }),
  op(RULE, { method: "get", path: "/price-lists/{id}", operationId: "getPriceListDocument", summary: "Bảng giá dựng sẵn để xem/in", cap: "L1",
    description: `Dựng từ giá đang bán của sản phẩm và ưu đãi đang bật. ${NF}`, ok: [200, { description: "Bảng giá", schema: res.priceListDocumentResponse }], errors: [404] }),
  op(RULE, { method: "put", path: "/price-lists/{id}", operationId: "updatePriceList", summary: "Sửa toàn bộ cấu hình bảng giá", cap: "L3", body: req.priceListBodySchema,
    description: `Mỗi lần sửa là một phiên bản mới. ${NF}`, ok: [200, { description: "Bảng giá", schema: res.priceListResponse }], errors: [...BODY_ERRORS, 404] }),
  op(RULE, { method: "patch", path: "/price-lists/{id}", operationId: "togglePriceList", summary: "Bật/tắt bảng giá", cap: "L3", body: req.priceListActiveBody,
    description: NF, ok: [200, { description: "Bảng giá", schema: res.priceListResponse }], errors: [...BODY_ERRORS, 404] }),
  op(RULE, { method: "delete", path: "/price-lists/{id}", operationId: "archivePriceList", summary: "Bỏ bảng giá khỏi danh sách", cap: "L3",
    description: `Lịch sử phiên bản vẫn giữ. ${NF}`,
    ok: [200, { description: "Đã bỏ", schema: res.priceListArchivedResponse }], errors: [404] }),
]
