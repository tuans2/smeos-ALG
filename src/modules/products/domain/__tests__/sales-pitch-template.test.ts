import { describe, it, expect } from "vitest"
import {
  buildSalesPitchData,
  generateZaloPitchScript,
  formatCurrencyVnd,
  formatDimensions,
  DEFAULT_FREE_GIFTS,
  DEFAULT_GUARANTEES,
} from "../sales-pitch-template"

describe("sales-pitch-template (M01c - Thẻ Chào Sản Phẩm & Kịch bản Zalo)", () => {
  it("formatCurrencyVnd định dạng đúng số tiền", () => {
    expect(formatCurrencyVnd(null)).toBe("Chưa có giá, liên hệ shop")
    expect(formatCurrencyVnd(850000)).toContain("850.000")
  })

  it("formatDimensions không bịa số khi thiếu chiều đo (nợ #96)", () => {
    expect(formatDimensions(null, null)).toBe("chưa có kích thước cụ thể, liên hệ shop để xác nhận")
    expect(formatDimensions(70, null)).toBe("chưa có kích thước cụ thể, liên hệ shop để xác nhận")
    expect(formatDimensions(null, 50)).toBe("chưa có kích thước cụ thể, liên hệ shop để xác nhận")
    expect(formatDimensions(70, 50)).toBe("Cao ~70cm × Rộng ~50cm")
  })

  it("buildSalesPitchData tổng hợp chuẩn từ M01a và M01b", () => {
    const analysisRaw = {
      product_name: "Sản phẩm hồng đỏ",
      identity: {
        category: "Sản phẩm",
        container: "Bình gốm",
        phong_cach: "Cổ điển",
        dip_su_dung: "Valentine",
      },
      bom: {
        flowers: [
          { name: "Hoa hồng đỏ", quantity: 12, dvt_dem: "bông", mau: "TM01 Đỏ" },
        ],
        foliage: [{ name: "Lá chanh", quantity: 4, dvt_dem: "cành" }],
        accessories: [{ name: "Nơ nhung", quantity: 1 }],
        wrapping: [{ material: "Giấy lụa đỏ" }],
      },
    }

    const copyRaw = {
      suggested_name: "Tình Yêu Nồng Cháy",
      suggested_description: "Sản phẩm thể hiện tình yêu bất diệt.",
      suggested_style: "Lãng mạn & Quý phái",
      suggested_occasions: ["Valentine", "Kỷ niệm ngày cưới"],
      suggested_price_segment: "premium",
    }

    const pitch = buildSalesPitchData(analysisRaw, copyRaw, { priceVnd: 990000 }, "https://example.com/flower.jpg", null)

    expect(pitch.productName).toBe("Tình Yêu Nồng Cháy")
    expect(pitch.style).toBe("Lãng mạn & Quý phái")
    expect(pitch.occasions).toEqual(["Valentine", "Kỷ niệm ngày cưới"])
    expect(pitch.description).toBe("Sản phẩm thể hiện tình yêu bất diệt.")
    expect(pitch.imageUrl).toBe("https://example.com/flower.jpg")
    expect(pitch.mainFlowers.length).toBe(1)
    expect(pitch.mainFlowers[0]?.name).toBe("Hoa hồng đỏ")
    expect(pitch.mainFlowers[0]?.quantity).toBe(12)
    expect(pitch.priceVnd).toBe(990000)
    expect(pitch.freeGifts).toEqual(DEFAULT_FREE_GIFTS)
    expect(pitch.guarantees).toEqual(DEFAULT_GUARANTEES)
    expect(pitch.status).toBe("DRAFT")
  })

  it("cho phép chỉnh sửa 100% tất cả các trường trước khi chốt duyệt xuất bản final", () => {
    const analysisRaw = {
      product_name: "Hoa mẫu ban đầu",
      bom: {
        flowers: [{ name: "Cúc vàng", quantity: 5, dvt_dem: "cành" }],
      },
    }

    const customPitch = buildSalesPitchData(
      analysisRaw,
      null,
      {
        productName: "Bình Hoa Khởi Sắc 2026",
        style: "Hoàng Gia Châu Âu",
        occasions: ["Khai trương hồng phát", "Đại hội"],
        description: "Thiết kế sang trọng đón tài lộc cho doanh nghiệp.",
        mainFlowers: [
          { name: "Lan Hồ Điệp trắng", quantity: 8, unit: "cành", color: "Trắng tuyết", role: "Chủ đạo" },
          { name: "Hồng Ohara", quantity: 15, unit: "bông", color: "Hồng pastel", role: "Điểm nhấn" },
        ],
        foliageItems: [
          { name: "Lá bạc Eucalyptus", quantity: 6, unit: "cành" },
        ],
        accessoryItems: [
          { name: "Ruy băng gân in logo nhũ vàng", quantity: 1, unit: "cuộn" },
        ],
        wrapping: "Không dùng giấy, cắm bình nghệ thuật",
        container: "Bình gốm Bát Tràng men rạn",
        heightCm: 70,
        widthCm: 50,
        priceVnd: 2800000,
        originalPriceVnd: 3200000,
        freeGifts: ["Tặng biển tên đồng cao cấp", "Tặng đế xoay hoa"],
        guarantees: ["Cam kết sản phẩm trên 7 ngày", "Giao xe hơi chuyên dụng"],
        shopHotline: "0909 888 999",
        customNote: "Áp dụng giảm 10% cho khách hàng thân thiết",
        status: "FINALIZED",
        finalizedAt: "2026-09-14T10:30:00Z",
      },
      "https://example.com/custom.jpg",
      null
    )

    expect(customPitch.productName).toBe("Bình Hoa Khởi Sắc 2026")
    expect(customPitch.style).toBe("Hoàng Gia Châu Âu")
    expect(customPitch.occasions).toEqual(["Khai trương hồng phát", "Đại hội"])
    expect(customPitch.mainFlowers.length).toBe(2)
    expect(customPitch.mainFlowers[0]?.name).toBe("Lan Hồ Điệp trắng")
    expect(customPitch.mainFlowers[0]?.quantity).toBe(8)
    expect(customPitch.foliageItems[0]?.name).toBe("Lá bạc Eucalyptus")
    expect(customPitch.container).toBe("Bình gốm Bát Tràng men rạn")
    expect(customPitch.priceVnd).toBe(2800000)
    expect(customPitch.originalPriceVnd).toBe(3200000)
    expect(customPitch.freeGifts.length).toBe(2)
    expect(customPitch.status).toBe("FINALIZED")
    expect(customPitch.finalizedAt).toBe("2026-09-14T10:30:00Z")

    const script = generateZaloPitchScript(customPitch)
    expect(script).toContain("BÌNH HOA KHỞI SẮC 2026")
    expect(script).toContain("Lan Hồ Điệp trắng (8 cành)")
    expect(script).toContain("Hồng Ohara (15 bông)")
    expect(script).toContain("Lá đệm: Lá bạc Eucalyptus (6 cành)")
    expect(script).toContain("Bình gốm Bát Tràng men rạn")
    expect(script).toContain("2.800.000")
    expect(script).toContain("3.200.000")
    expect(script).toContain("Tặng biển tên đồng cao cấp")
    expect(script).toContain("Cam kết sản phẩm trên 7 ngày")
    expect(script).toContain("0909 888 999")
    expect(script).toContain("Áp dụng giảm 10% cho khách hàng thân thiết")
  })

  it("generateZaloPitchScript sinh đầy đủ nội dung tư vấn khách hàng", () => {
    const pitch = buildSalesPitchData(
      {
        bom: {
          flowers: [{ name: "Hoa Tulip", quantity: 10, dvt_dem: "bông" }],
        },
      },
      {
        suggested_name: "Bó Tulip Vàng Nắng",
        suggested_description: "Mang lại năng lượng tươi mới.",
      },
      { priceVnd: 850000 },
      null,
      null
    )

    const script = generateZaloPitchScript(pitch)

    expect(script).toContain("BÓ TULIP VÀNG NẮNG")
    expect(script).toContain("850.000")
    expect(script).toContain("Hoa Tulip (10 bông)")
    // Tiệm chưa khai quà tặng/cam kết → kịch bản không tự in (audit sâu MEUX 29/10/2026)
    expect(script).not.toContain("QUÀ TẶNG KÈM THEO")
    expect(script).not.toContain("Chrysal")
    const withGifts = generateZaloPitchScript(buildSalesPitchData(null, null, undefined, null, { freeGifts: ["Thiệp viết tay"], guarantees: ["Đổi mới nếu dập"] }))
    expect(withGifts).toContain("QUÀ TẶNG KÈM THEO")
    expect(withGifts).toContain("CAM KẾT DỊCH VỤ TỪ SHOP")
    // Nợ #96: chưa có override kích thước thật -> KHÔNG hiện số bịa 55×40cm
    // nữa, phải hiện rõ đây là ô trống cần xác nhận.
    expect(script).toContain("chưa có kích thước cụ thể, liên hệ shop để xác nhận")
    expect(script).not.toContain("Cao ~55cm × Rộng ~40cm")
    expect(pitch.dimensions.heightCm).toBeNull()
    expect(pitch.dimensions.widthCm).toBeNull()
  })

  it("buildSalesPitchData giữ nguyên kích thước thật khi Sales nhập override (nợ #96)", () => {
    const pitch = buildSalesPitchData(
      { bom: { flowers: [{ name: "Hoa Tulip", quantity: 10, dvt_dem: "bông" }] } },
      null,
      { heightCm: 70, widthCm: 50 },
      null,
      null
    )

    expect(pitch.dimensions.heightCm).toBe(70)
    expect(pitch.dimensions.widthCm).toBe(50)

    const script = generateZaloPitchScript(pitch)
    expect(script).toContain("Cao ~70cm × Rộng ~50cm")
  })

  it("buildSalesPitchData tự động thừa hưởng tenantDefaults từ Master Profile khi không có overrides", () => {
    const analysisRaw = {
      product_name: "Lẵng lan hồ điệp",
      bom: { flowers: [{ name: "Lan hồ điệp", quantity: 6, dvt_dem: "cành" }] },
    }

    const tenantDefaults = {
      shopName: "Tiệm Hoa Sen Vàng Luxury",
      shopHotline: "0988 777 666",
      freeGifts: ["Tặng thiệp nghệ thuật thư pháp dát vàng", "Tặng bình xịt dưỡng hoa cao cấp"],
      guarantees: ["Cam kết sản phẩm trên 10 ngày", "Bảo hành 1 đổi 1 trong 24h"],
    }

    const pitch = buildSalesPitchData(analysisRaw, null, undefined, null, tenantDefaults)

    expect(pitch.shopName).toBe("Tiệm Hoa Sen Vàng Luxury")
    expect(pitch.shopHotline).toBe("0988 777 666")
    expect(pitch.freeGifts).toEqual(tenantDefaults.freeGifts)
    expect(pitch.guarantees).toEqual(tenantDefaults.guarantees)
  })

  // --- Test hồi quy: chặn tái phát lỗi rà soát 17/09/2026 ---
  // (thẻ chào A6 / kịch bản Zalo từng gửi tên tiệm "ALG Flower Boutique"
  // và hotline "1900 xxxx" GIẢ cho MỌI khách hàng vì UI quên nối tenantDefaults)

  it("KHÔNG được rơi về tên tiệm/hotline giả trông như thật khi tenantDefaults là null", () => {
    const pitch = buildSalesPitchData(
      { product_name: "Sản phẩm bất kỳ", bom: { flowers: [{ name: "Hoa cúc", quantity: 5, dvt_dem: "cành" }] } },
      null,
      undefined,
      null,
      null
    )

    expect(pitch.shopName).not.toBe("ALG Flower Boutique")
    expect(pitch.shopHotline).not.toBe("1900 xxxx")
    // Fallback phải hiện rõ đây là chỗ trống cần cập nhật, không phải một
    // thương hiệu/số điện thoại trông như thật.
    expect(pitch.shopName).toBe("Chưa cập nhật tên tiệm")
    expect(pitch.shopHotline).toBe("Chưa cập nhật hotline")
  })

  it("KHÔNG được tự bịa giá theo phân khúc khi chưa có giá cấu hình thật", () => {
    const pitch = buildSalesPitchData(
      {
        product_name: "Sản phẩm cao cấp",
        bom: { flowers: [{ name: "Lan hồ điệp", quantity: 3, dvt_dem: "cành" }] },
      },
      { suggested_price_segment: "luxury" },
      undefined,
      null,
      null
    )

    // Trước đây segment "luxury" sẽ tự bịa ra 2.500.000đ — giờ phải để trống.
    expect(pitch.priceVnd).toBeNull()
    expect(pitch.originalPriceVnd).toBeNull()
    expect(formatCurrencyVnd(pitch.priceVnd)).toBe("Chưa có giá, liên hệ shop")
  })

  // --- Nợ #102: tách cta_templates (câu kêu gọi hành động) khỏi
  // default_offers (quà tặng/cam kết) — chốt 17/09 với anh Tony ---

  it("dùng câu kêu gọi hành động riêng của thương hiệu khi tenant đã cấu hình cta_templates", () => {
    const pitch = buildSalesPitchData(
      { product_name: "Sản phẩm sinh nhật", bom: { flowers: [{ name: "Hoa hồng", quantity: 10, dvt_dem: "cành" }] } },
      null,
      undefined,
      null,
      {
        shopName: "Tiệm Hoa Mộc Lan",
        shopHotline: "0977 123 456",
        freeGifts: null,
        guarantees: null,
        ctaPhrases: ["Nhắn Zalo ngay để giữ giá ưu đãi hôm nay ạ!", "Câu CTA thứ hai không dùng"],
      }
    )

    expect(pitch.ctaPhrase).toBe("Nhắn Zalo ngay để giữ giá ưu đãi hôm nay ạ!")

    const script = generateZaloPitchScript(pitch)
    expect(script).toContain("Nhắn Zalo ngay để giữ giá ưu đãi hôm nay ạ!")
    expect(script).not.toContain("Quý khách cần tư vấn thiệp chúc mừng riêng")
  })

  it("giữ nguyên câu đóng mặc định hệ thống khi tenant CHƯA cấu hình cta_templates", () => {
    const pitch = buildSalesPitchData(
      { product_name: "Sản phẩm chúc mừng", bom: { flowers: [{ name: "Hoa cúc", quantity: 8, dvt_dem: "cành" }] } },
      null,
      undefined,
      null,
      { shopName: "Tiệm Hoa Mộc Lan", shopHotline: "0977 123 456", freeGifts: null, guarantees: null, ctaPhrases: null }
    )

    expect(pitch.ctaPhrase).toBeNull()

    const script = generateZaloPitchScript(pitch)
    expect(script).toContain("Quý khách cần tư vấn thiệp chúc mừng riêng hoặc đặt giao hoa hỏa tốc")
  })

  it("dùng ĐÚNG tên tiệm/hotline thật từ tenantDefaults thay vì giá trị giả khi gọi từ trang M01c", () => {
    const pitch = buildSalesPitchData(
      { product_name: "Giỏ hoa chúc mừng", bom: { flowers: [{ name: "Hướng dương", quantity: 7, dvt_dem: "cành" }] } },
      null,
      undefined,
      null,
      { shopName: "Tiệm Hoa Mộc Lan", shopHotline: "0977 123 456", freeGifts: null, guarantees: null }
    )

    const script = generateZaloPitchScript(pitch)
    expect(pitch.shopName).toBe("Tiệm Hoa Mộc Lan")
    expect(pitch.shopHotline).toBe("0977 123 456")
    expect(script).toContain("0977 123 456")
    expect(script).not.toContain("1900 xxxx")
  })

  // --- Nợ #104: "giọng theo dịp" — chốt xây đầy đủ qua AskUserQuestion 17/09 ---

  it("occasionRegister mặc định NEUTRAL khi tenant chưa cấu hình danh mục dịp", () => {
    const pitch = buildSalesPitchData(
      { product_name: "Sản phẩm bất kỳ", identity: { dip_su_dung: "Chia buồn" }, bom: { flowers: [] } },
      null,
      undefined,
      null,
      null
    )
    expect(pitch.occasionRegister).toBe("NEUTRAL")
  })

  it("occasionRegister khớp CHÍNH XÁC theo tên dịp đầu tiên với danh mục tenant đã cấu hình", () => {
    const pitch = buildSalesPitchData(
      { product_name: "Vòng hoa viếng", identity: { dip_su_dung: "Chia buồn" }, bom: { flowers: [] } },
      null,
      undefined,
      null,
      {
        shopName: null,
        shopHotline: null,
        freeGifts: null,
        guarantees: null,
        occasionRegistry: [
          { name: "Chia buồn", register: "SOLEMN" },
          { name: "Valentine", register: "FESTIVE" },
        ],
      }
    )
    expect(pitch.occasionRegister).toBe("SOLEMN")
  })

  it("occasionRegister KHÔNG suy đoán bằng từ khoá — chỉ khớp đúng tên, không khớp thì về NEUTRAL", () => {
    const pitch = buildSalesPitchData(
      // Dịp gợi ý chứa chữ "buồn" nhưng KHÔNG khớp nguyên văn "Chia buồn" —
      // không được tự suy diễn ra SOLEMN.
      { product_name: "Sản phẩm", identity: { dip_su_dung: "Xin lỗi vì đã làm em buồn" }, bom: { flowers: [] } },
      null,
      undefined,
      null,
      { shopName: null, shopHotline: null, freeGifts: null, guarantees: null, occasionRegistry: [{ name: "Chia buồn", register: "SOLEMN" }] }
    )
    expect(pitch.occasionRegister).toBe("NEUTRAL")
  })

  it("kịch bản Zalo tông SOLEMN bớt emoji ăn mừng và không hiện dòng 'Phù hợp dịp'/QUÀ TẶNG KÈM THEO", () => {
    const pitch = buildSalesPitchData(
      { product_name: "Vòng hoa viếng", identity: { dip_su_dung: "Chia buồn" }, bom: { flowers: [{ name: "Hoa cúc trắng", quantity: 20, dvt_dem: "bông" }] } },
      null,
      undefined,
      null,
      {
        shopName: "Tiệm Hoa Mộc Lan",
        shopHotline: "0977 123 456",
        freeGifts: null,
        guarantees: null,
        occasionRegistry: [{ name: "Chia buồn", register: "SOLEMN" }],
      }
    )

    expect(pitch.occasionRegister).toBe("SOLEMN")
    const script = generateZaloPitchScript(pitch)
    expect(script).not.toContain("🎯 Phù hợp dịp")
    expect(script).not.toContain("QUÀ TẶNG KÈM THEO")
    expect(script).not.toContain("❤️")
    expect(script).toContain("Hoa cúc trắng (20 bông)")
    expect(script).toContain("0977 123 456")
  })

  it("kịch bản Zalo tông SOLEMN vẫn dùng câu CTA riêng của thương hiệu khi tenant đã cấu hình", () => {
    const pitch = buildSalesPitchData(
      { product_name: "Vòng hoa viếng", identity: { dip_su_dung: "Chia buồn" }, bom: { flowers: [] } },
      null,
      undefined,
      null,
      {
        shopName: null,
        shopHotline: null,
        freeGifts: null,
        guarantees: null,
        ctaPhrases: ["Shop luôn sẵn sàng hỗ trợ quý khách"],
        occasionRegistry: [{ name: "Chia buồn", register: "SOLEMN" }],
      }
    )

    const script = generateZaloPitchScript(pitch)
    expect(script).toContain("Shop luôn sẵn sàng hỗ trợ quý khách")
    expect(script).not.toContain("Quý khách cần hỗ trợ thêm hoặc đặt giao hoa nhanh")
  })

  it("greetingLine (nợ #99) mặc định null khi tenant chưa cấu hình — không thêm dòng chào nào", () => {
    const pitch = buildSalesPitchData(
      { bom: { flowers: [{ name: "Hoa Tulip", quantity: 10, dvt_dem: "bông" }] } },
      null,
      undefined,
      null,
      null
    )
    expect(pitch.greetingLine).toBeNull()

    const script = generateZaloPitchScript(pitch)
    expect(script.startsWith("🌸 [THÔNG TIN SẢN PHẨM]")).toBe(true)
  })

  it("greetingLine (nợ #99) hiện đúng câu chào tenant ghi đè ở đầu kịch bản — cả hai tông", () => {
    const base = buildSalesPitchData(
      { product_name: "Sản phẩm", bom: { flowers: [] } },
      null,
      undefined,
      null,
      {
        shopName: null,
        shopHotline: null,
        freeGifts: null,
        guarantees: null,
        greetingLine: "Chào mừng quý khách đến với SiiN Store!",
      }
    )
    expect(base.greetingLine).toBe("Chào mừng quý khách đến với SiiN Store!")
    const script = generateZaloPitchScript(base)
    expect(script.startsWith("Chào mừng quý khách đến với SiiN Store!\n\n🌸 [THÔNG TIN SẢN PHẨM]")).toBe(true)

    const solemn = buildSalesPitchData(
      { product_name: "Vòng hoa viếng", identity: { dip_su_dung: "Chia buồn" }, bom: { flowers: [] } },
      null,
      undefined,
      null,
      {
        shopName: null,
        shopHotline: null,
        freeGifts: null,
        guarantees: null,
        greetingLine: "Kính gửi quý khách,",
        occasionRegistry: [{ name: "Chia buồn", register: "SOLEMN" }],
      }
    )
    const solemnScript = generateZaloPitchScript(solemn)
    expect(solemnScript.startsWith("Kính gửi quý khách,\n\n[THÔNG TIN SẢN PHẨM]")).toBe(true)
  })

  it("hiển thị thiệp chúc mừng có nội dung printed_text riêng biệt trên kịch bản Zalo", () => {
    const analysisRaw = {
      product_name: "Sản phẩm tulip cam",
      bom: {
        flowers: [{ name: "Hoa tulip cam", quantity: 10 }],
        foliage: [{ name: "Lá chanh", quantity: 3 }],
        accessories: [
          { name: "Thiệp chúc mừng", printed_text: "Happy 20th Birthday", quantity: 1 },
          { name: "Nơ ruy băng satin", quantity: 1 },
        ],
      },
    }

    const pitch = buildSalesPitchData(analysisRaw, null, undefined, null, null)
    expect(pitch.accessoryItems[0]?.name).toContain('Thiệp chúc mừng (In: "Happy 20th Birthday")')
    const script = generateZaloPitchScript(pitch)
    expect(script).toContain('💌 Thiệp / Biển chúc mừng: Thiệp chúc mừng (In: "Happy 20th Birthday")')
    expect(script).toContain("🎀 Phụ kiện: Nơ ruy băng satin (1 cái)")
  })
})

