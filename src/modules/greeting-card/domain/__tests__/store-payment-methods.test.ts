import { describe, it, expect } from "vitest"
import {
  DEFAULT_PAYMENT_METHODS_CONFIG,
  parseStorePaymentMethods,
  serializeStorePaymentMethods,
  validateStorePaymentMethods,
  type StorePaymentMethodsConfig,
} from "../store-payment-methods"

describe("store-payment-methods", () => {
  it("nạp cấu hình mặc định an toàn khi settings rỗng", () => {
    const config = parseStorePaymentMethods(null)
    expect(config.enableVietQr).toBe(true)
    expect(config.enableCod).toBe(false)
    expect(config.enableInStore).toBe(true)
    expect(config.reconciliationMode).toBe("MANUAL_PROOF")
  })

  it("tương thích ngược 100% với bản ghi brochure_payment cũ chỉ có 4 trường ngân hàng", () => {
    const legacySettings = {
      brochure_payment: {
        bank_id: "VCB",
        bank_name: "Vietcombank",
        account_no: "0071001234567",
        account_name: "NGUYEN VAN A",
      },
    }
    const config = parseStorePaymentMethods(legacySettings)
    expect(config.bankId).toBe("VCB")
    expect(config.bankName).toBe("Vietcombank")
    expect(config.accountNo).toBe("0071001234567")
    expect(config.accountName).toBe("NGUYEN VAN A")
    expect(config.enableVietQr).toBe(true)
  })

  it("parse đầy đủ các phương thức thanh toán mới và cơ chế đối soát", () => {
    const fullSettings = {
      brochure_payment: {
        bank_id: "TCB",
        bank_name: "Techcombank",
        account_no: "190333444555",
        account_name: "TRAN THI B",
        enable_vietqr: true,
        enable_cod: true,
        cod_requires_deposit: true,
        cod_max_vnd: 3000000,
        enable_card: true,
        card_provider: "ONEPAY",
        enable_instore: true,
        enable_ewallet: true,
        ewallet_provider: "MOMO",
        ewallet_phone: "0908123456",
        reconciliation_mode: "AUTO_WEBHOOK",
        webhook_key: "sec_abc123",
      },
    }
    const config = parseStorePaymentMethods(fullSettings)
    expect(config.enableCod).toBe(true)
    expect(config.codMaxVnd).toBe(3000000)
    expect(config.enableCard).toBe(true)
    expect(config.cardProvider).toBe("ONEPAY")
    expect(config.enableEWallet).toBe(true)
    expect(config.eWalletPhone).toBe("0908123456")
    expect(config.reconciliationMode).toBe("AUTO_WEBHOOK")
    expect(config.webhookKey).toBe("sec_abc123")
  })

  it("serialize giữ nguyên 4 trường ngân hàng ở top level để Thẻ Chào đọc bình thường", () => {
    const config: StorePaymentMethodsConfig = {
      ...DEFAULT_PAYMENT_METHODS_CONFIG,
      bankId: "MB",
      accountNo: "0987654321",
      accountName: "CONG TY TNHH ABC",
      enableCod: true,
    }
    const payload = serializeStorePaymentMethods(config)
    expect(payload.bank_id).toBe("MB")
    expect(payload.account_no).toBe("0987654321")
    expect(payload.account_name).toBe("CONG TY TNHH ABC")
    expect(payload.enable_cod).toBe(true)
  })

  it("validate phát hiện lỗi khi không bật phương thức nào hoặc thông tin ngân hàng thiếu", () => {
    const invalidConfig: StorePaymentMethodsConfig = {
      ...DEFAULT_PAYMENT_METHODS_CONFIG,
      enableVietQr: false,
      enableCod: false,
      enableCard: false,
      enableInStore: false,
      enableEWallet: false,
    }
    const errors = validateStorePaymentMethods(invalidConfig)
    expect(errors).toContain("Cửa hàng phải kích hoạt ít nhất một phương thức nhận thanh toán")

    const invalidBank: StorePaymentMethodsConfig = {
      ...DEFAULT_PAYMENT_METHODS_CONFIG,
      enableVietQr: true,
      bankId: "",
      accountNo: "",
      accountName: "",
    }
    const bankErrors = validateStorePaymentMethods(invalidBank)
    expect(bankErrors.length).toBeGreaterThan(0)
  })
})
