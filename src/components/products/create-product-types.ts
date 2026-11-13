export type BomItem = {
  id: string
  name: string
  quantity: number
  unit: string
  /** Trường màu sắc / tình trạng — label và hiển thị tùy ngành (xem getIndustryBomFieldsConfig) */
  color: string
  role: string
  /** Ghi chú mở rộng: FASHION = 'Mã hàng / Khổ vải'; HOMESTAY = 'Thương hiệu / Tình trạng'; mở rộng không cần migration DB */
  notes?: string
}

/** Cấu hình hiển thị field BOM theo ngành */
export interface IndustryBomFieldsConfig {
  /** Label cột tên vật tư */
  materialLabel: string
  /** Placeholder ô tên */
  materialPlaceholder: string
  /** Hiển thị cột `color` không? */
  showColor: boolean
  /** Label cột color (vd: 'Màu sắc', 'Màu vải', 'Mà tôn') */
  colorLabel: string
  /** Hiển thị cột `notes` không? */
  showNotes: boolean
  /** Label cột notes (vd: 'Mã hàng / Khổ vải', 'Thương hiệu', 'Ghi chú') */
  notesLabel: string
  /** Placeholder ô notes */
  notesPlaceholder: string
  /** Dấu hiệu vi (đơn vị như mét, cành, đêm...) — hint cho placeholder ô unit */
  unitHint: string
  /** Số lượng mặc định khi thêm dòng mới */
  defaultQuantity: number
}

export function getIndustryBomFieldsConfig(industryKey?: string): IndustryBomFieldsConfig {
  switch (industryKey) {
    case "FASHION":
      return {
        materialLabel: "Vải / Phụ liệu",
        materialPlaceholder: "vd: Vải lụa satin 100% silk, Vải dạ tweed",
        showColor: true,
        colorLabel: "Màu vải",
        showNotes: true,
        notesLabel: "Mã hàng / Khổ vải",
        notesPlaceholder: "vd: SAT-001 / 150cm",
        unitHint: "mét / cái",
        defaultQuantity: 2,
      }
    case "FNB":
      return {
        materialLabel: "Nguyên liệu",
        materialPlaceholder: "vd: Thịt bò Wagyu, Bột mì Éc",
        showColor: false,
        colorLabel: "",
        showNotes: true,
        notesLabel: "Xuất xứ / Nhà cung cấp",
        notesPlaceholder: "vd: Nhập khẩu Úc, Nghệ An",
        unitHint: "gram / ml / cái",
        defaultQuantity: 1,
      }
    case "HOMESTAY":
      return {
        materialLabel: "Tiện nghi / Vật tư",
        materialPlaceholder: "vd: Bộ chăn ga gối điệp 4 món, Dầu gội đầu Dove",
        showColor: false,
        colorLabel: "",
        showNotes: true,
        notesLabel: "Thương hiệu / Tình trạng",
        notesPlaceholder: "vd: Hanvico / Mới 100%",
        unitHint: "bộ / cái / hộp",
        defaultQuantity: 1,
      }
    case "CRAFT_GIFT":
      return {
        materialLabel: "Vật liệu chế tác",
        materialPlaceholder: "vd: Sáp đậu nho thượng hạng, Thính hương linh tùng",
        showColor: true,
        colorLabel: "Màu sắc / Tông màu",
        showNotes: true,
        notesLabel: "Nguồn gốc / Tiêu chuẩn",
        notesPlaceholder: "vd: Nhập khẩu Pháp / FDA-approved",
        unitHint: "gram / cái / hộp",
        defaultQuantity: 1,
      }
    case "RETAIL_GENERAL":
      return {
        materialLabel: "Sản phẩm / Linh kiện",
        materialPlaceholder: "vd: Điện thoại Samsung Galaxy A55, Tai nghe bluetooth",
        showColor: true,
        colorLabel: "Màu sắc / Phiên bản",
        showNotes: true,
        notesLabel: "Mã SKU / Barcode",
        notesPlaceholder: "vd: SM-A556E / 8935001234567",
        unitHint: "cái / hộp",
        defaultQuantity: 1,
      }
    case "SERVICES":
      return {
        materialLabel: "Vật tư / Nội dung dịch vụ",
        materialPlaceholder: "vd: Dầu massage thảo mộc, Tinh dầu bạc hà",
        showColor: false,
        colorLabel: "",
        showNotes: true,
        notesLabel: "Thương hiệu / Xuất xứ",
        notesPlaceholder: "vd: Kiehl's / Mỹ",
        unitHint: "ml / cái / lượt",
        defaultQuantity: 1,
      }
    case "FLORAL":
    default:
      return {
        materialLabel: "Loài hoa / Cành",
        materialPlaceholder: "vd: Hồng Ecuador, Cúc trắng",
        showColor: true,
        colorLabel: "Màu sắc hoa",
        showNotes: false,
        notesLabel: "",
        notesPlaceholder: "",
        unitHint: "cành / nánh",
        defaultQuantity: 10,
      }
  }
}

export type TerminologyGetter = (
  key:
    | "makerTitle"
    | "makerAction"
    | "productRecipe"
    | "sampleProduct"
    | "rawMaterialItem"
    | "completedProductPhoto"
    | "printablesTitle"
    | "catalogTitle"
    | "createButtonLabel"
    | "scanButtonLabel"
) => string

export interface DesignFieldsConfig {
  cardTitle: string
  shapeLabel: string
  shapeOptions: string[]
  /** Cho phép chọn nhiều không? (default: false — single select) */
  shapeMultiple?: boolean
  facingLabel: string
  facingOptions: string[]
  /** Cho phép chọn nhiều hướng không? (default: false) */
  facingMultiple?: boolean
  containerLabel: string
  /** Nếu có options → dropdown; không có → free-text input */
  containerOptions?: string[]
  /** Cho phép chọn nhiều tiện nghi không? (default: false) */
  containerMultiple?: boolean
  containerPlaceholder: string
}

export function getDesignFieldsConfig(industryKey?: string): DesignFieldsConfig {
  switch (industryKey) {
    case "FASHION":
      return {
        cardTitle: "Kiểu dáng phom mẫu & Chất liệu",
        shapeLabel: "Kiểu dáng / Phom dáng",
        shapeOptions: [
          "Dáng suông thẳng (H-line / Minimalist)",
          "Dáng chữ A xòe bồng bềnh (A-line / Flare)",
          "Dáng ôm body (Bodycon / Fitted)",
          "Oversize / Rộng rãi thoải mái",
          "Dáng đuôi cá sang trọng (Mermaid)",
          "Dáng chữ Y vai rộng (Inverted Triangle)",
          "Wrap / Dáng quấn thắt eo",
          "Balloon / Phồng bồng",
          "Tiêu chuẩn (Regular Fit)",
          "Slim Fit / Ôm vừa phải",
          "Relaxed Fit / Suông thư giãn",
          "Co-ord Set / Hai mảnh phối bộ",
        ],
        facingLabel: "Góc chụp ảnh sản phẩm",
        facingOptions: [
          "Chính diện (Front View)",
          "Mặt sau (Back View)",
          "Góc nghiêng 3/4 trái",
          "Góc nghiêng 3/4 phải",
          "Mặt bên (Side Profile)",
          "Cận cảnh chi tiết (Close-up Detail)",
          "Flat lay từ trên xuống",
          "Toàn cảnh 360° đầy đủ",
        ],
        facingMultiple: true,
        containerLabel: "Chất liệu vải chính",
        containerOptions: [
          "Lụa tơ tằm 100% (Pure Silk)",
          "Vải lanh tự nhiên (Linen)",
          "Cotton 100% Organic",
          "Dạ Tweed cao cấp",
          "Vải đũi thô (Raw Dupioni)",
          "Polyester cao cấp (Premium Poly)",
          "Ren Pháp / Ren thêu tay",
          "Vải dệt kim co giãn (Knit / Jersey)",
          "Voan mỏng nhẹ (Chiffon)",
          "Vải nhung (Velvet)",
          "Denim cao cấp (Premium Denim)",
          "Kèm túi vải bảo quản thương hiệu",
          "Kèm hộp quà sang trọng",
          "Kèm thẻ hướng dẫn giặt ủi",
        ],
        containerMultiple: true,
        containerPlaceholder: "Chọn chất liệu hoặc gói kèm theo...",
      }

    case "FNB":
      return {
        cardTitle: "Quy cách phục vụ & Đóng gói",
        shapeLabel: "Hình thức phục vụ",
        shapeOptions: [
          "Tại bàn (Dine-in)",
          "Mang đi (Takeaway / To-go)",
          "Đóng hộp giao tận nơi (Delivery)",
          "Combo / Set bữa ăn đầy đủ",
          "Theo phần gọi lẻ",
          "Buffet / Self-service",
          "Drive-thru lấy nhanh",
          "Pre-order đặt trước",
        ],
        facingLabel: "Kiểu trình bày / Bày biện",
        facingOptions: [
          "Đĩa đơn trang trí nghệ thuật",
          "Tô / Bát đầy đặn",
          "Set mẹt / Khay combo đầy đủ",
          "Ly / Cốc thức uống kèm",
          "Hộp giấy craft / Bento",
          "Đĩa chia phần (Sharing Platter)",
          "Lẩu / Nồi dùng chung",
        ],
        facingMultiple: true,
        containerLabel: "Đóng gói & Phụ kiện kèm theo",
        containerOptions: [
          "Hộp giấy kraft chống thấm",
          "Túi giấy thân thiện môi trường",
          "Hộp nhựa PP an toàn thực phẩm",
          "Kèm thìa / Đũa sinh học",
          "Kèm khăn ướt / Giấy ăn",
          "Kèm nước chấm / Sốt riêng",
          "Kèm rau sống / Đồ ăn kèm",
          "Túi cách nhiệt giữ nóng",
          "Bình / Chai đựng thức uống",
          "Hộp bánh ngọt / Dessert",
        ],
        containerMultiple: true,
        containerPlaceholder: "Chọn đóng gói và phụ kiện kèm theo...",
      }

    case "HOMESTAY":
      return {
        cardTitle: "Loại hình lưu trú & Hướng view phòng",
        shapeLabel: "Loại hình / Kết cấu phòng",
        shapeOptions: [
          "Studio khép kín (dưới 30m²)",
          "Phòng ngủ riêng (Private Room)",
          "Căn hộ 1 phòng ngủ",
          "Căn hộ 2 phòng ngủ",
          "Căn hộ 3 phòng ngủ trở lên",
          "Nguyên căn Villa / Biệt thự",
          "Bungalow sân vườn",
          "Nhà gỗ / Cabin sinh thái",
          "Giường tầng Dormitory (Hostel)",
          "Phòng Superior tiêu chuẩn",
          "Phòng Deluxe nâng cấp",
          "Phòng Suite cao cấp",
          "Penthouse tầng thượng",
          "Farmstay / Nhà vườn sinh thái",
        ],
        facingLabel: "Hướng nhìn / View từ phòng",
        facingOptions: [
          "View thung lũng / Núi rừng hùng vĩ",
          "View thành phố / Phố đi bộ sầm uất",
          "View sân vườn / Hồ bơi riêng",
          "View biển / Mặt nước xanh mát",
          "View hồ / Sông / Suối",
          "View ruộng bậc thang",
          "View rừng thông / Vườn xanh",
          "Ban công riêng tư",
          "Sân thượng mở (Rooftop)",
          "Cửa sổ thoáng tự nhiên nội khu",
        ],
        facingMultiple: true,
        containerLabel: "Tiện nghi nổi bật / Điểm nhấn phòng",
        containerOptions: [
          "Bồn tắm gỗ ngoài trời",
          "Bồn Jacuzzi / Sục bong bóng",
          "Hồ bơi riêng / Bể bơi chung",
          "Bếp nấu đầy đủ thiết bị",
          "Lò sưởi / Lò sưởi củi gỗ",
          "Điều hòa 2 chiều nóng lạnh",
          "Smart TV Netflix / YouTube",
          "Wifi tốc độ cao Fibre",
          "Bãi đỗ xe miễn phí",
          "Máy giặt / Sấy quần áo riêng",
          "Máy pha cà phê cao cấp",
          "Phòng gym / Yoga nội khu",
          "BBQ sân vườn nướng ngoài trời",
          "Bảo mật 24/7 / Camera an ninh",
          "Check-in tự động (Self check-in)",
          "Thú cưng được đón tiếp",
          "Bữa sáng miễn phí kèm phòng",
          "Xe đạp / Xe máy cho thuê",
          "Sân vườn / Khu thư giãn ngoài trời",
          "Phòng khách riêng biệt",
        ],
        containerMultiple: true,
        containerPlaceholder: "Chọn tiện nghi nổi bật của phòng...",
      }

    case "CRAFT_GIFT":
      return {
        cardTitle: "Quy cách chế tác & Đóng gói quà tặng",
        shapeLabel: "Quy cách chế tác",
        shapeOptions: [
          "Thủ công độc bản (One-of-a-kind)",
          "Phiên bản giới hạn (Limited Edition)",
          "Sản xuất theo mẻ nhỏ (Small Batch)",
          "Tiêu chuẩn xuất xưởng",
          "Đặt làm theo yêu cầu (Custom Order)",
          "Khắc tên / Cá nhân hóa",
          "Bộ sưu tập theo chủ đề",
        ],
        facingLabel: "Góc trưng bày & Chụp ảnh",
        facingOptions: [
          "Chính diện mặt trước",
          "Góc nghiêng 3/4 nghệ thuật",
          "Toàn cảnh 360°",
          "Cận cảnh chi tiết (Close-up)",
          "Flat lay sắp xếp nghệ thuật",
          "Trong hộp quà mở nắp (Unboxing)",
          "Trong không gian trang trí",
        ],
        facingMultiple: true,
        containerLabel: "Hộp quà & Bao bì đính kèm",
        containerOptions: [
          "Hộp gỗ khắc laser logo",
          "Hộp giấy cứng cao cấp (Rigid Box)",
          "Túi vải thêu tay",
          "Thiệp sáp niêm phong",
          "Giấy lụa / Bao bì chống sốc",
          "Nơ ruy băng đính kèm",
          "Thẻ thông điệp cá nhân",
          "Túi giấy thương hiệu",
        ],
        containerMultiple: true,
        containerPlaceholder: "Chọn bao bì và phụ kiện đính kèm...",
      }

    case "RETAIL_GENERAL":
      return {
        cardTitle: "Quy cách đóng gói & Trưng bày hàng hóa",
        shapeLabel: "Quy cách đóng gói",
        shapeOptions: [
          "Đóng hộp đơn lẻ (Single unit)",
          "Đóng lốc / Vỉ combo (Multipack)",
          "Đóng thùng carton sỉ (Bulk / Case)",
          "Túi zip bảo quản tiện lợi",
          "Hộp quà biếu cao cấp (Gift Set)",
          "Đóng gói dùng thử mini (Trial size)",
          "Cuộn / Xô / Bình lớn",
        ],
        facingLabel: "Mặt hiển thị sản phẩm",
        facingOptions: [
          "Mặt trước (Mặt nhãn hiệu chính)",
          "Mặt sau (Bảng thành phần / HD sử dụng)",
          "Mặt bên trái / phải",
          "Mặt đáy / Hạn sử dụng",
          "Đầy đủ tất cả các góc",
          "Ảnh sản phẩm trong / mở hộp",
        ],
        facingMultiple: true,
        containerLabel: "Bao bì & Phụ kiện kèm theo",
        containerOptions: [
          "Túi giấy thân thiện môi trường",
          "Bubble wrap chống sốc",
          "Hộp carton gia cố",
          "Tem nhãn thương hiệu",
          "Sách hướng dẫn sử dụng",
          "Phiếu bảo hành",
          "Phụ kiện dùng kèm",
          "Quà tặng / Mẫu thử miễn phí",
        ],
        containerMultiple: true,
        containerPlaceholder: "Chọn bao bì và phụ kiện kèm theo...",
      }

    case "SERVICES":
      return {
        cardTitle: "Hình thức cung cấp & Không gian thực hiện",
        shapeLabel: "Hình thức thực hiện dịch vụ",
        shapeOptions: [
          "Tại trung tâm / Cơ sở dịch vụ",
          "Tận nơi theo yêu cầu (On-site)",
          "Tư vấn trực tuyến / Video call",
          "Theo gói định kỳ / Liệu trình",
          "Gói trải nghiệm 1 buổi (Trial)",
          "Thẻ thành viên nhiều buổi",
          "Dịch vụ khẩn cấp ngoài giờ",
        ],
        facingLabel: "Không gian & Môi trường thực hiện",
        facingOptions: [
          "Phòng VIP riêng tư tuyệt đối",
          "Phòng đôi / Nhóm nhỏ",
          "Khu vực tiêu chuẩn chung",
          "Không gian ngoài trời / Sân vườn",
          "Phòng xông hơi / Onsen",
          "Phòng điều trị chuyên sâu",
        ],
        facingMultiple: false,
        containerLabel: "Trang thiết bị & Công nghệ sử dụng",
        containerOptions: [
          "Máy móc công nghệ cao hiện đại",
          "Tinh dầu thảo mộc tự nhiên",
          "Thiết bị laser / Ánh sáng",
          "Sản phẩm hữu cơ nhập khẩu",
          "Dụng cụ vô trùng y tế",
          "Công nghệ RF / Siêu âm",
          "Mặt nạ / Serum cao cấp",
          "Đá nóng / Đá lạnh trị liệu",
          "Thiết bị áp suất / Massage",
        ],
        containerMultiple: true,
        containerPlaceholder: "Chọn thiết bị và công nghệ áp dụng...",
      }

    case "FLORAL":
    default:
      return {
        cardTitle: "Kiểu dáng và hướng nhìn",
        shapeLabel: "Kiểu dáng cắm",
        shapeOptions: [
          "Tròn đều (Spherical)",
          "Tam giác cân cổ điển",
          "Tự nhiên phong cách Hàn Quốc (Wildflower)",
          "Dài thẳng đứng (Linear / Vertical)",
          "Thác nước rủ xuống (Cascade)",
          "Hình quạt xòe (Fan shape)",
          "Bán cầu (Dome / Mound)",
          "Chữ nhật hộp (Garden box)",
          "Vòng hoa tròn (Wreath)",
          "Hình nón (Cone)",
          "Ellipse / Bầu dục ngang",
        ],
        facingLabel: "Mặt nhìn chủ đạo",
        facingOptions: [
          "Một mặt (Single-faced)",
          "Hai mặt đối xứng",
          "Nhiều mặt (360° toàn cảnh)",
        ],
        containerLabel: "Vật chứa / Bao bì",
        containerOptions: [
          "Giấy gói Hàn Quốc nhám sần",
          "Giấy craft nâu thô mộc",
          "Giấy cellophane trong suốt",
          "Giấy lụa mềm màu pastel",
          "Hộp giấy cứng cao cấp",
          "Giỏ mây / Tre đan thủ công",
          "Bình thủy tinh cao cấp",
          "Bình gốm thủ công",
          "Túi vải canvas",
          "Hộp gỗ khắc laser",
          "Xô thiếc retro",
          "Lọ kim loại phong cách công nghiệp",
        ],
        containerMultiple: false,
        containerPlaceholder: "Chọn vật chứa / bao bì...",
      }
  }
}

