/**
 * Ba bộ máy phân tích ảnh, và cách một tổ chức chọn dùng bộ nào.
 *
 * Cả ba trả CÙNG một hợp đồng `PhanTichSanPhamHoa` (`Schema.json`). Mọi thứ
 * phía sau — Review, Approve, Product Master, M02, M03 — không biết bộ nào
 * đã chạy và không cần biết. Đó là điều kiện để đổi bộ máy mà không phải sửa
 * một dòng nào ở hạ nguồn (D5-c, kiến trúc V2 mục 17.1: cổng đặt ở mức hợp
 * đồng JSON, không ở mức `detect/segment/recognize`).
 *
 * Khoá bộ máy ghi vào `organizations.settings` — cùng chỗ với
 * `cho_phep_tu_duyet`, không dựng bảng mới.
 *
 * Tệp thuần: không import hạ tầng, test không cần cơ sở dữ liệu.
 */

export const VISION_ENGINE_SETTINGS_KEY = "bo_may_phan_tich" as const

export const VISION_ENGINES = ["openai_structured", "openai_direct", "local_cv"] as const
export type VisionEngine = (typeof VISION_ENGINES)[number]

/**
 * Mặc định nền tảng là "Đầy đủ" (`openai_structured`) — bộ DUY NHẤT mang
 * `trang_thai: "san_xuat"`.
 *
 * `trang_thai` nói một bộ đã được đo hay chưa, nên đặt một bộ `thu_nghiem`
 * làm mặc định là đưa mọi tổ chức mới vào một đường chưa ai kiểm chứng —
 * và tổ chức mới thì theo định nghĩa là tổ chức chưa chọn gì. Rẻ hơn và
 * nhanh hơn không bù được việc không biết kết quả sai bao nhiêu: thứ tự ưu
 * tiên khi đánh đổi ở PRD mục 9 là Accuracy > Quality > Cost > Speed.
 *
 * Tổ chức muốn rẻ và nhanh chọn "Gọn" (`openai_direct`); muốn xử lý hoàn
 * toàn nội bộ chọn "Cục bộ" (`local_cv`). Cả hai bày rõ trạng thái
 * `thu_nghiem` trên màn `/bo-may` trước khi chọn.
 *
 * Đổi mặc định này trở lại chỉ bằng số đo trên bộ ảnh vàng (D5-c: "Không
 * đổi bằng lập luận"), không bằng một lượt chạy thử thành công.
 */
export const VISION_ENGINE_MAC_DINH: VisionEngine = "openai_structured"

export type TrangThaiBoMay = "san_xuat" | "thu_nghiem" | "chua_san_sang"

export type MoTaBoMay = {
  readonly key: VisionEngine
  readonly ten: string
  readonly mo_ta: string
  readonly trang_thai: TrangThaiBoMay
  /** Có gửi ảnh ra nhà cung cấp bên ngoài hay không — tổ chức cần biết. */
  readonly gui_anh_ra_ngoai: boolean
}

/**
 * `trang_thai` KHÔNG phải nhãn tiếp thị. Nó nói một bộ máy đã được đo trên
 * bộ ảnh vàng hay chưa (`BO_ANH_VANG.md` mục 9, D5-c: "Không đổi bằng lập
 * luận"). Chừng nào `golden/labels/` còn rỗng thì không bộ nào ngoài bộ đang
 * chạy được gọi là `san_xuat`, và giao diện phải nói thẳng điều đó thay vì
 * bày ba lựa chọn trông ngang nhau.
 */
export const MO_TA_BO_MAY: Readonly<Record<VisionEngine, MoTaBoMay>> = {
  openai_structured: {
    key: "openai_structured",
    ten: "Đầy đủ",
    mo_ta:
      "Đo bảng màu tại chỗ, gửi ảnh kèm bảng màu và quy ước đếm cho nhà cung cấp, " +
      "chạy hai lượt lấy trung vị khi kết quả chưa chắc. Chậm và tốn nhất, kỷ luật đếm chặt nhất.",
    trang_thai: "san_xuat",
    gui_anh_ra_ngoai: true,
  },
  openai_direct: {
    key: "openai_direct",
    ten: "Gọn",
    mo_ta:
      "Gửi thẳng ảnh kèm lược đồ cho nhà cung cấp, một lượt, lời nhắc ngắn. " +
      "Rẻ và nhanh hơn; chưa đo độ chính xác trên bộ ảnh vàng.",
    trang_thai: "thu_nghiem",
    gui_anh_ra_ngoai: true,
  },
  local_cv: {
    key: "local_cv",
    ten: "Cục bộ",
    mo_ta:
      "Tách và đếm bằng mô hình chạy trên máy chủ của chính tổ chức, không gửi ảnh đi đâu. " +
      "Chưa gắn được mã danh mục nên người soát phải tự gắn; chưa đo độ chính xác trên bộ ảnh vàng.",
    trang_thai: "thu_nghiem",
    gui_anh_ra_ngoai: false,
  },
}

export function isVisionEngine(value: unknown): value is VisionEngine {
  return typeof value === "string" && (VISION_ENGINES as readonly string[]).includes(value)
}

/**
 * Bộ máy của một tổ chức. Giá trị lạ trong `settings` — do sửa tay, do một
 * bản cũ ghi tên đã bỏ — rơi về mặc định thay vì ném lỗi: một khoá cấu hình
 * hỏng không được phép chặn cả luồng phân tích.
 */
export function resolveVisionEngine(
  settings: Record<string, unknown> | null | undefined
): VisionEngine {
  const value = settings?.[VISION_ENGINE_SETTINGS_KEY]
  return isVisionEngine(value) ? value : VISION_ENGINE_MAC_DINH
}
