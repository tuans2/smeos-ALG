/**
 * Cấu hình các Phương án nhận thanh toán và Cơ chế đối soát của Cửa hàng.
 * Pure TypeScript — không I/O, không Prisma. Dùng chung cho server và client.
 */

import { BROCHURE_PAYMENT_SETTINGS_KEY } from "./brochure-commerce-rules"

export type CardProviderKey = "ONEPAY" | "VNPAY" | "STRIPE" | "CUSTOM"
export type EWalletProviderKey = "MOMO" | "ZALOPAY" | "VNPAY"
export type ReconciliationMode = "MANUAL_PROOF" | "AUTO_WEBHOOK"

export interface StorePaymentMethodsConfig {
  // 1. Chuyển khoản ngân hàng (VietQR)
  enableVietQr: boolean
  bankId: string
  bankName: string
  accountNo: string
  accountName: string

  // 2. Tiền mặt khi nhận hàng (COD)
  enableCod: boolean
  codRequiresDeposit: boolean
  codMaxVnd: number | null

  // 3. Thẻ quốc tế & Cổng thanh toán (Visa / Mastercard)
  enableCard: boolean
  cardProvider: CardProviderKey
  cardInstructions: string

  // 4. Thanh toán tại quầy / Cửa hàng (In-Store Pickup & POS)
  enableInStore: boolean
  inStoreInstructions: string

  // 5. Ví điện tử (MoMo / ZaloPay)
  enableEWallet: boolean
  eWalletProvider: EWalletProviderKey
  eWalletPhone: string

  // Cơ chế đối soát giao dịch
  reconciliationMode: ReconciliationMode
  webhookKey?: string | undefined
}

export const DEFAULT_PAYMENT_METHODS_CONFIG: StorePaymentMethodsConfig = {
  enableVietQr: true,
  bankId: "",
  bankName: "",
  accountNo: "",
  accountName: "",

  enableCod: false,
  codRequiresDeposit: true,
  codMaxVnd: 5_000_000,

  enableCard: false,
  cardProvider: "ONEPAY",
  cardInstructions: "Chấp nhận thẻ quốc tế Visa, Mastercard, JCB qua cổng thanh toán",

  enableInStore: true,
  inStoreInstructions: "Thanh toán tiền mặt hoặc quẹt thẻ POS khi đến nhận hàng trực tiếp tại tiệm",

  enableEWallet: false,
  eWalletProvider: "MOMO",
  eWalletPhone: "",

  reconciliationMode: "MANUAL_PROOF",
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

/**
 * Đọc và chuẩn hóa cấu hình phương thức thanh toán từ `organizations.settings`.
 * Tương thích ngược 100% với các bản ghi `brochure_payment` cũ chỉ có 4 trường ngân hàng.
 */
export function parseStorePaymentMethods(settings: unknown): StorePaymentMethodsConfig {
  const root = asRecord(settings)
  const raw = asRecord(root[BROCHURE_PAYMENT_SETTINGS_KEY])

  const bankId = typeof raw.bank_id === "string" ? raw.bank_id.trim() : ""
  const bankName = typeof raw.bank_name === "string" ? raw.bank_name.trim() : ""
  const accountNo = typeof raw.account_no === "string" ? raw.account_no.replace(/\s+/g, "") : ""
  const accountName = typeof raw.account_name === "string" ? raw.account_name.trim().toUpperCase() : ""

  const enableVietQr = raw.enable_vietqr !== undefined ? Boolean(raw.enable_vietqr) : true
  const enableCod = Boolean(raw.enable_cod)
  const codRequiresDeposit = raw.cod_requires_deposit !== undefined ? Boolean(raw.cod_requires_deposit) : true
  const codMaxVnd = typeof raw.cod_max_vnd === "number" && raw.cod_max_vnd > 0 ? Math.round(raw.cod_max_vnd) : null

  const enableCard = Boolean(raw.enable_card)
  const cardProvider = (["ONEPAY", "VNPAY", "STRIPE", "CUSTOM"].includes(String(raw.card_provider))
    ? raw.card_provider
    : "ONEPAY") as CardProviderKey
  const cardInstructions = typeof raw.card_instructions === "string" && raw.card_instructions.trim()
    ? raw.card_instructions.trim()
    : DEFAULT_PAYMENT_METHODS_CONFIG.cardInstructions

  const enableInStore = raw.enable_instore !== undefined ? Boolean(raw.enable_instore) : true
  const inStoreInstructions = typeof raw.instore_instructions === "string" && raw.instore_instructions.trim()
    ? raw.instore_instructions.trim()
    : DEFAULT_PAYMENT_METHODS_CONFIG.inStoreInstructions

  const enableEWallet = Boolean(raw.enable_ewallet)
  const eWalletProvider = (["MOMO", "ZALOPAY", "VNPAY"].includes(String(raw.ewallet_provider))
    ? raw.ewallet_provider
    : "MOMO") as EWalletProviderKey
  const eWalletPhone = typeof raw.ewallet_phone === "string" ? raw.ewallet_phone.trim() : ""

  const reconciliationMode = raw.reconciliation_mode === "AUTO_WEBHOOK" ? "AUTO_WEBHOOK" : "MANUAL_PROOF"
  const webhookKey = typeof raw.webhook_key === "string" && raw.webhook_key.trim() ? raw.webhook_key.trim() : undefined

  return {
    enableVietQr,
    bankId,
    bankName,
    accountNo,
    accountName,

    enableCod,
    codRequiresDeposit,
    codMaxVnd,

    enableCard,
    cardProvider,
    cardInstructions,

    enableInStore,
    inStoreInstructions,

    enableEWallet,
    eWalletProvider,
    eWalletPhone,

    reconciliationMode,
    webhookKey,
  }
}

/**
 * Đóng gói dữ liệu cấu hình thành payload JSON lưu vào `organizations.settings.brochure_payment`.
 * Giữ nguyên 4 trường `bank_id`, `bank_name`, `account_no`, `account_name` ở top level để không ảnh hưởng
 * bất kỳ logic đọc mã QR nào trên Thẻ Chào.
 */
export function serializeStorePaymentMethods(config: StorePaymentMethodsConfig): Record<string, unknown> {
  return {
    bank_id: config.bankId.trim(),
    bank_name: config.bankName.trim() || config.bankId.trim(),
    account_no: config.accountNo.replace(/\s+/g, ""),
    account_name: config.accountName.trim().toUpperCase(),

    enable_vietqr: config.enableVietQr,
    enable_cod: config.enableCod,
    cod_requires_deposit: config.codRequiresDeposit,
    cod_max_vnd: config.codMaxVnd,

    enable_card: config.enableCard,
    card_provider: config.cardProvider,
    card_instructions: config.cardInstructions.trim(),

    enable_instore: config.enableInStore,
    instore_instructions: config.inStoreInstructions.trim(),

    enable_ewallet: config.enableEWallet,
    ewallet_provider: config.eWalletProvider,
    ewallet_phone: config.eWalletPhone.trim(),

    reconciliation_mode: config.reconciliationMode,
    webhook_key: config.webhookKey?.trim() || undefined,
  }
}

/**
 * Kiểm tra tính hợp lệ của cấu hình thanh toán.
 */
export function validateStorePaymentMethods(config: StorePaymentMethodsConfig): string[] {
  const errors: string[] = []

  // Phải bật ít nhất 1 phương thức nhận tiền
  const hasAtLeastOne =
    config.enableVietQr ||
    config.enableCod ||
    config.enableCard ||
    config.enableInStore ||
    config.enableEWallet

  if (!hasAtLeastOne) {
    errors.push("Cửa hàng phải kích hoạt ít nhất một phương thức nhận thanh toán")
  }

  // Nếu bật VietQR thì bắt buộc có thông tin ngân hàng hợp lệ
  if (config.enableVietQr) {
    if (!/^[A-Za-z0-9]{2,20}$/.test(config.bankId.trim())) {
      errors.push("Mã ngân hàng VietQR không hợp lệ (VD: VCB, MB, TCB...)")
    }
    if (!/^[0-9A-Za-z]{4,30}$/.test(config.accountNo.replace(/\s+/g, ""))) {
      errors.push("Số tài khoản nhận tiền phải từ 4 đến 30 ký tự số/chữ")
    }
    if (!config.accountName.trim()) {
      errors.push("Vui lòng nhập tên chủ tài khoản nhận tiền")
    }
  }

  // Nếu bật ví điện tử thì phải có số điện thoại
  if (config.enableEWallet && !/^(0|\+84)[0-9]{8,11}$/.test(config.eWalletPhone.replace(/\s+/g, ""))) {
    errors.push("Số điện thoại nhận tiền ví điện tử không đúng định dạng")
  }

  return errors
}
