/**
 * industry-roadmap.ts — Lộ trình triển khai 95 ngành nghề của ALG
 *
 * Mỗi ngành có trạng thái:
 *   - ACTIVE:       Đã triển khai đầy đủ IndustryPluginContract (6 khối thành phần)
 *   - COMING_SOON:  Đã lên kế hoạch — cần tạo Plugin theo quy trình 3 bước trong AGENTS.md
 *
 * Ngành ACTIVE → UI hiển thị "Đã kích hoạt"
 * Ngành COMING_SOON → UI hiển thị "Sắp ra mắt"
 *
 * Quy trình thêm ngành mới: Xem §"Quy chuẩn Thêm Ngành Mới" trong AGENTS.md (3 bước).
 *
 * NGUỒN SỰ THẬT DUY NHẤT: Tệp này + INDUSTRY_REGISTRY trong industries/index.ts.
 * Nợ kỹ thuật tương ứng: #TD-INDUSTRY-001 đến #TD-INDUSTRY-089 trong TECHNICAL_DEBT.md.
 */

export type IndustryStatus = "ACTIVE" | "COMING_SOON"

export interface IndustryRoadmapItem {
  /** STT trong danh sách lộ trình gốc */
  readonly stt: number
  /** Nhóm ngành (A, B, C, ...) */
  readonly group: string
  /** Tên nhóm ngành */
  readonly groupName: string
  /** Tên ngành cụ thể */
  readonly name: string
  /**
   * Khóa ngành tương ứng trong INDUSTRY_REGISTRY (chỉ có khi ACTIVE).
   * Đây là liên kết sang IndustryPluginContract đã triển khai.
   */
  readonly industryKey?: string
  /** Trạng thái triển khai */
  readonly status: IndustryStatus
  /** Mã nợ kỹ thuật (chỉ có khi COMING_SOON) */
  readonly debtId?: string
}

/**
 * Danh sách đầy đủ 95 ngành nghề — Lộ trình triển khai ALG đa ngành.
 *
 * ACTIVE:       6 ngành đã triển khai IndustryPluginContract đầy đủ.
 * COMING_SOON:  89 ngành đã lên kế hoạch, chờ triển khai theo nhu cầu.
 */
export const INDUSTRY_ROADMAP: readonly IndustryRoadmapItem[] = [
  // ════════════════════════════════════════════════════════════
  // NHÓM A — Hoa và quà tặng
  // ════════════════════════════════════════════════════════════
  {
    stt: 1,
    group: "A",
    groupName: "Hoa và quà tặng",
    name: "Sản phẩm",
    industryKey: "FLORAL",
    status: "ACTIVE",
  },
  {
    stt: 2,
    group: "A",
    groupName: "Hoa và quà tặng",
    name: "Hoa sáp, hoa khô",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-002",
  },
  {
    stt: 3,
    group: "A",
    groupName: "Hoa và quà tặng",
    name: "Giỏ quà",
    industryKey: "CRAFT_GIFT",
    status: "ACTIVE",
  },
  {
    stt: 4,
    group: "A",
    groupName: "Hoa và quà tặng",
    name: "Quà tặng",
    industryKey: "CRAFT_GIFT",
    status: "ACTIVE",
  },
  {
    stt: 5,
    group: "A",
    groupName: "Hoa và quà tặng",
    name: "Quà tặng doanh nghiệp",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-005",
  },
  {
    stt: 6,
    group: "A",
    groupName: "Hoa và quà tặng",
    name: "Gấu bông",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-006",
  },
  {
    stt: 7,
    group: "A",
    groupName: "Hoa và quà tặng",
    name: "Quà lưu niệm",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-007",
  },
  {
    stt: 8,
    group: "A",
    groupName: "Hoa và quà tặng",
    name: "Bóng bay, phụ kiện sinh nhật",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-008",
  },
  {
    stt: 9,
    group: "A",
    groupName: "Hoa và quà tặng",
    name: "Thiệp chúc mừng",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-009",
  },

  // ════════════════════════════════════════════════════════════
  // NHÓM B — Bánh và thực phẩm
  // ════════════════════════════════════════════════════════════
  {
    stt: 10,
    group: "B",
    groupName: "Bánh và thực phẩm",
    name: "Bánh kem",
    industryKey: "FNB",
    status: "ACTIVE",
  },
  {
    stt: 11,
    group: "B",
    groupName: "Bánh và thực phẩm",
    name: "Bánh ngọt",
    industryKey: "FNB",
    status: "ACTIVE",
  },
  {
    stt: 12,
    group: "B",
    groupName: "Bánh và thực phẩm",
    name: "Bánh handmade",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-012",
  },
  {
    stt: 13,
    group: "B",
    groupName: "Bánh và thực phẩm",
    name: "Chocolate, kẹo",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-013",
  },
  {
    stt: 14,
    group: "B",
    groupName: "Bánh và thực phẩm",
    name: "Trái cây",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-014",
  },
  {
    stt: 15,
    group: "B",
    groupName: "Bánh và thực phẩm",
    name: "Giỏ trái cây",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-015",
  },
  {
    stt: 16,
    group: "B",
    groupName: "Bánh và thực phẩm",
    name: "Đặc sản vùng miền",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-016",
  },
  {
    stt: 17,
    group: "B",
    groupName: "Bánh và thực phẩm",
    name: "Thực phẩm sạch",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-017",
  },
  {
    stt: 18,
    group: "B",
    groupName: "Bánh và thực phẩm",
    name: "Thực phẩm nhập khẩu",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-018",
  },
  {
    stt: 19,
    group: "B",
    groupName: "Bánh và thực phẩm",
    name: "Đồ ăn chế biến sẵn",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-019",
  },

  // ════════════════════════════════════════════════════════════
  // NHÓM C — Thời trang và phụ kiện
  // ════════════════════════════════════════════════════════════
  {
    stt: 20,
    group: "C",
    groupName: "Thời trang và phụ kiện",
    name: "Kính mắt",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-020",
  },
  {
    stt: 21,
    group: "C",
    groupName: "Thời trang và phụ kiện",
    name: "Quần áo",
    industryKey: "FASHION",
    status: "ACTIVE",
  },
  {
    stt: 22,
    group: "C",
    groupName: "Thời trang và phụ kiện",
    name: "Giày dép",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-022",
  },
  {
    stt: 23,
    group: "C",
    groupName: "Thời trang và phụ kiện",
    name: "Túi xách",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-023",
  },
  {
    stt: 24,
    group: "C",
    groupName: "Thời trang và phụ kiện",
    name: "Đồng hồ",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-024",
  },
  {
    stt: 25,
    group: "C",
    groupName: "Thời trang và phụ kiện",
    name: "Trang sức",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-025",
  },
  {
    stt: 26,
    group: "C",
    groupName: "Thời trang và phụ kiện",
    name: "Phụ kiện thời trang",
    industryKey: "FASHION",
    status: "ACTIVE",
  },
  {
    stt: 27,
    group: "C",
    groupName: "Thời trang và phụ kiện",
    name: "Ví, thắt lưng",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-027",
  },
  {
    stt: 28,
    group: "C",
    groupName: "Thời trang và phụ kiện",
    name: "Nước hoa",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-028",
  },
  {
    stt: 29,
    group: "C",
    groupName: "Thời trang và phụ kiện",
    name: "Mỹ phẩm",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-029",
  },
  {
    stt: 30,
    group: "C",
    groupName: "Thời trang và phụ kiện",
    name: "Đồ da",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-030",
  },

  // ════════════════════════════════════════════════════════════
  // NHÓM D — Trẻ em và đồ chơi
  // ════════════════════════════════════════════════════════════
  {
    stt: 31,
    group: "D",
    groupName: "Trẻ em và đồ chơi",
    name: "Đồ chơi trẻ em",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-031",
  },
  {
    stt: 32,
    group: "D",
    groupName: "Trẻ em và đồ chơi",
    name: "Đồ chơi giáo dục",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-032",
  },
  {
    stt: 33,
    group: "D",
    groupName: "Trẻ em và đồ chơi",
    name: "Đồ chơi mô hình",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-033",
  },
  {
    stt: 34,
    group: "D",
    groupName: "Trẻ em và đồ chơi",
    name: "Đồ chơi lắp ráp",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-034",
  },
  {
    stt: 35,
    group: "D",
    groupName: "Trẻ em và đồ chơi",
    name: "Quần áo trẻ em",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-035",
  },
  {
    stt: 36,
    group: "D",
    groupName: "Trẻ em và đồ chơi",
    name: "Đồ dùng trẻ sơ sinh",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-036",
  },
  {
    stt: 37,
    group: "D",
    groupName: "Trẻ em và đồ chơi",
    name: "Sản phẩm mẹ và bé",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-037",
  },

  // ════════════════════════════════════════════════════════════
  // NHÓM E — Nhà cửa và trang trí
  // ════════════════════════════════════════════════════════════
  {
    stt: 38,
    group: "E",
    groupName: "Nhà cửa và trang trí",
    name: "Đồ trang trí nhà cửa",
    industryKey: "RETAIL_GENERAL",
    status: "ACTIVE",
  },
  {
    stt: 39,
    group: "E",
    groupName: "Nhà cửa và trang trí",
    name: "Đồ trang trí sinh nhật",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-039",
  },
  {
    stt: 40,
    group: "E",
    groupName: "Nhà cửa và trang trí",
    name: "Đồ trang trí sự kiện",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-040",
  },
  {
    stt: 41,
    group: "E",
    groupName: "Nhà cửa và trang trí",
    name: "Cây cảnh",
    industryKey: "FLORAL",
    status: "ACTIVE",
  },
  {
    stt: 42,
    group: "E",
    groupName: "Nhà cửa và trang trí",
    name: "Chậu cây, tiểu cảnh",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-042",
  },
  {
    stt: 43,
    group: "E",
    groupName: "Nhà cửa và trang trí",
    name: "Gốm sứ",
    industryKey: "CRAFT_GIFT",
    status: "ACTIVE",
  },
  {
    stt: 44,
    group: "E",
    groupName: "Nhà cửa và trang trí",
    name: "Tranh treo tường",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-044",
  },
  {
    stt: 45,
    group: "E",
    groupName: "Nhà cửa và trang trí",
    name: "Đèn trang trí",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-045",
  },
  {
    stt: 46,
    group: "E",
    groupName: "Nhà cửa và trang trí",
    name: "Đồ thủ công mỹ nghệ",
    industryKey: "CRAFT_GIFT",
    status: "ACTIVE",
  },
  {
    stt: 47,
    group: "E",
    groupName: "Nhà cửa và trang trí",
    name: "Rèm cửa",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-047",
  },
  {
    stt: 48,
    group: "E",
    groupName: "Nhà cửa và trang trí",
    name: "Đồ gia dụng",
    industryKey: "RETAIL_GENERAL",
    status: "ACTIVE",
  },
  {
    stt: 49,
    group: "E",
    groupName: "Nhà cửa và trang trí",
    name: "Đồ dùng nhà bếp",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-049",
  },
  {
    stt: 50,
    group: "E",
    groupName: "Nhà cửa và trang trí",
    name: "Chăn ga gối đệm",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-050",
  },
  {
    stt: 51,
    group: "E",
    groupName: "Nhà cửa và trang trí",
    name: "Nội thất",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-051",
  },

  // ════════════════════════════════════════════════════════════
  // NHÓM F — Sản phẩm cá nhân hóa và in ấn
  // ════════════════════════════════════════════════════════════
  {
    stt: 52,
    group: "F",
    groupName: "In ấn và cá nhân hóa",
    name: "In ảnh",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-052",
  },
  {
    stt: 53,
    group: "F",
    groupName: "In ấn và cá nhân hóa",
    name: "In áo",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-053",
  },
  {
    stt: 54,
    group: "F",
    groupName: "In ấn và cá nhân hóa",
    name: "In cốc, bình nước",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-054",
  },
  {
    stt: 55,
    group: "F",
    groupName: "In ấn và cá nhân hóa",
    name: "Quà tặng khắc tên",
    industryKey: "CRAFT_GIFT",
    status: "ACTIVE",
  },
  {
    stt: 56,
    group: "F",
    groupName: "In ấn và cá nhân hóa",
    name: "Thiệp cưới, thiệp mời",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-056",
  },
  {
    stt: 57,
    group: "F",
    groupName: "In ấn và cá nhân hóa",
    name: "Hộp quà thiết kế riêng",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-057",
  },
  {
    stt: 58,
    group: "F",
    groupName: "In ấn và cá nhân hóa",
    name: "Đồ handmade",
    industryKey: "CRAFT_GIFT",
    status: "ACTIVE",
  },
  {
    stt: 59,
    group: "F",
    groupName: "In ấn và cá nhân hóa",
    name: "Phụ kiện điện thoại in theo yêu cầu",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-059",
  },

  // ════════════════════════════════════════════════════════════
  // NHÓM G — Điện tử và phụ kiện
  // ════════════════════════════════════════════════════════════
  {
    stt: 60,
    group: "G",
    groupName: "Điện tử và phụ kiện",
    name: "Điện thoại",
    industryKey: "RETAIL_GENERAL",
    status: "ACTIVE",
  },
  {
    stt: 61,
    group: "G",
    groupName: "Điện tử và phụ kiện",
    name: "Phụ kiện điện thoại",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-061",
  },
  {
    stt: 62,
    group: "G",
    groupName: "Điện tử và phụ kiện",
    name: "Máy tính, laptop",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-062",
  },
  {
    stt: 63,
    group: "G",
    groupName: "Điện tử và phụ kiện",
    name: "Phụ kiện máy tính",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-063",
  },
  {
    stt: 64,
    group: "G",
    groupName: "Điện tử và phụ kiện",
    name: "Thiết bị âm thanh",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-064",
  },
  {
    stt: 65,
    group: "G",
    groupName: "Điện tử và phụ kiện",
    name: "Thiết bị gia dụng điện",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-065",
  },
  {
    stt: 66,
    group: "G",
    groupName: "Điện tử và phụ kiện",
    name: "Camera, thiết bị an ninh",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-066",
  },

  // ════════════════════════════════════════════════════════════
  // NHÓM H — Thể thao và hoạt động ngoài trời
  // ════════════════════════════════════════════════════════════
  {
    stt: 67,
    group: "H",
    groupName: "Thể thao",
    name: "Quần áo thể thao",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-067",
  },
  {
    stt: 68,
    group: "H",
    groupName: "Thể thao",
    name: "Giày thể thao",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-068",
  },
  {
    stt: 69,
    group: "H",
    groupName: "Thể thao",
    name: "Dụng cụ thể thao",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-069",
  },
  {
    stt: 70,
    group: "H",
    groupName: "Thể thao",
    name: "Phụ kiện tập gym",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-070",
  },
  {
    stt: 71,
    group: "H",
    groupName: "Thể thao",
    name: "Dụng cụ cắm trại",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-071",
  },
  {
    stt: 72,
    group: "H",
    groupName: "Thể thao",
    name: "Xe đạp và phụ kiện",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-072",
  },

  // ════════════════════════════════════════════════════════════
  // NHÓM I — Thú cưng
  // ════════════════════════════════════════════════════════════
  {
    stt: 73,
    group: "I",
    groupName: "Thú cưng",
    name: "Thức ăn thú cưng",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-073",
  },
  {
    stt: 74,
    group: "I",
    groupName: "Thú cưng",
    name: "Phụ kiện thú cưng",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-074",
  },
  {
    stt: 75,
    group: "I",
    groupName: "Thú cưng",
    name: "Đồ chơi thú cưng",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-075",
  },
  {
    stt: 76,
    group: "I",
    groupName: "Thú cưng",
    name: "Quần áo thú cưng",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-076",
  },
  {
    stt: 77,
    group: "I",
    groupName: "Thú cưng",
    name: "Sản phẩm vệ sinh thú cưng",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-077",
  },

  // ════════════════════════════════════════════════════════════
  // NHÓM J — Văn phòng và học tập
  // ════════════════════════════════════════════════════════════
  {
    stt: 78,
    group: "J",
    groupName: "Văn phòng và học tập",
    name: "Văn phòng phẩm",
    industryKey: "RETAIL_GENERAL",
    status: "ACTIVE",
  },
  {
    stt: 79,
    group: "J",
    groupName: "Văn phòng và học tập",
    name: "Sách",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-079",
  },
  {
    stt: 80,
    group: "J",
    groupName: "Văn phòng và học tập",
    name: "Đồ dùng học tập",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-080",
  },
  {
    stt: 81,
    group: "J",
    groupName: "Văn phòng và học tập",
    name: "Ba lô, cặp sách",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-081",
  },
  {
    stt: 82,
    group: "J",
    groupName: "Văn phòng và học tập",
    name: "Quà tặng văn phòng",
    industryKey: "CRAFT_GIFT",
    status: "ACTIVE",
  },

  // ════════════════════════════════════════════════════════════
  // NHÓM K — Xe cộ và phụ kiện
  // ════════════════════════════════════════════════════════════
  {
    stt: 83,
    group: "K",
    groupName: "Xe cộ và phụ kiện",
    name: "Phụ kiện ô tô",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-083",
  },
  {
    stt: 84,
    group: "K",
    groupName: "Xe cộ và phụ kiện",
    name: "Phụ kiện xe máy",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-084",
  },
  {
    stt: 85,
    group: "K",
    groupName: "Xe cộ và phụ kiện",
    name: "Mũ bảo hiểm",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-085",
  },
  {
    stt: 86,
    group: "K",
    groupName: "Xe cộ và phụ kiện",
    name: "Đồ chăm sóc xe",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-086",
  },

  // ════════════════════════════════════════════════════════════
  // NHÓM L — Các ngành bán lẻ chuyên biệt
  // ════════════════════════════════════════════════════════════
  {
    stt: 87,
    group: "L",
    groupName: "Bán lẻ chuyên biệt",
    name: "Đồ phong thủy",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-087",
  },
  {
    stt: 88,
    group: "L",
    groupName: "Bán lẻ chuyên biệt",
    name: "Đồ thờ cúng",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-088",
  },
  {
    stt: 89,
    group: "L",
    groupName: "Bán lẻ chuyên biệt",
    name: "Vật phẩm tôn giáo",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-089",
  },
  {
    stt: 90,
    group: "L",
    groupName: "Bán lẻ chuyên biệt",
    name: "Hàng thủ công truyền thống",
    industryKey: "CRAFT_GIFT",
    status: "ACTIVE",
  },
  {
    stt: 91,
    group: "L",
    groupName: "Bán lẻ chuyên biệt",
    name: "Thiết bị và dụng cụ làm đẹp",
    industryKey: "SERVICES",
    status: "ACTIVE",
  },
  {
    stt: 92,
    group: "L",
    groupName: "Bán lẻ chuyên biệt",
    name: "Nguyên liệu làm bánh",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-092",
  },
  {
    stt: 93,
    group: "L",
    groupName: "Bán lẻ chuyên biệt",
    name: "Nguyên liệu handmade",
    industryKey: "CRAFT_GIFT",
    status: "ACTIVE",
  },
  {
    stt: 94,
    group: "L",
    groupName: "Bán lẻ chuyên biệt",
    name: "Vải và phụ liệu may mặc",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-094",
  },
  {
    stt: 95,
    group: "L",
    groupName: "Bán lẻ chuyên biệt",
    name: "Thiết bị và dụng cụ làm vườn",
    status: "COMING_SOON",
    debtId: "TD-INDUSTRY-095",
  },
] as const

// ────────────────────────────────────────────────────────────────
// Helpers / Utility functions
// ────────────────────────────────────────────────────────────────

/** Tất cả ngành đang hoạt động */
export function getActiveIndustries(): readonly IndustryRoadmapItem[] {
  return INDUSTRY_ROADMAP.filter((i) => i.status === "ACTIVE")
}

/** Tất cả ngành sắp ra mắt */
export function getComingSoonIndustries(): readonly IndustryRoadmapItem[] {
  return INDUSTRY_ROADMAP.filter((i) => i.status === "COMING_SOON")
}

/** Tất cả nhóm ngành duy nhất (theo thứ tự xuất hiện) */
export function getIndustryGroups(): readonly { group: string; groupName: string }[] {
  const seen = new Set<string>()
  const groups: { group: string; groupName: string }[] = []
  for (const item of INDUSTRY_ROADMAP) {
    if (!seen.has(item.group)) {
      seen.add(item.group)
      groups.push({ group: item.group, groupName: item.groupName })
    }
  }
  return groups
}

/** Lọc theo nhóm ngành */
export function getIndustriesByGroup(group: string): readonly IndustryRoadmapItem[] {
  return INDUSTRY_ROADMAP.filter((i) => i.group === group)
}

/** Thống kê tổng quan */
export function getRoadmapStats() {
  const total = INDUSTRY_ROADMAP.length
  const active = INDUSTRY_ROADMAP.filter((i) => i.status === "ACTIVE").length
  const comingSoon = total - active
  return { total, active, comingSoon, progressPercent: Math.round((active / total) * 100) }
}
