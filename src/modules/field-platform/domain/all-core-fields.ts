/**
 * Gộp trường lõi của mọi module — hiện chỉ Điều phối. Module khác (CRM,
 * Sản phẩm…) muốn tham gia nền quản trị trường thì khai một tệp
 * `contracts/field-registry.ts` riêng rồi thêm vào mảng dưới, không sửa
 * `field-platform/domain`. `assertUniqueKeys` chặn hai module lỡ khai
 * trùng khoá ngay lúc import (an toàn hơn phát hiện lúc chạy `seed`).
 */
import { COORDINATOR_CORE_FIELDS } from "@/modules/coordinator/contracts/field-registry"
import { assertUniqueKeys, type CoreFieldDefinition } from "./core-field-registry"

export const ALL_CORE_FIELD_DEFINITIONS: readonly CoreFieldDefinition[] = [...COORDINATOR_CORE_FIELDS]

assertUniqueKeys(ALL_CORE_FIELD_DEFINITIONS)
