import type { OpsKnowledgeNode } from "./schema"

export const NODE_06_NHAP_HANG_LOAT: OpsKnowledgeNode = {
  id: "node-06-nhap-hang-loat",
  moduleIndex: 6,
  moduleTitle: "Chức năng 06: Nhập từ Excel & Ảnh",
  topicTitle: "Nhập Liệu Hàng Loạt, Kéo Thả Kép Excel & Ảnh Google Drive",
  routePath: "/san-pham/nhap-hang-loat",
  targetRoles: ["ALL", "QUAN_LY"],
  keywords: [
    "nhập excel", "nhập hàng loạt", "import excel", "file mẫu", "kéo thả kép",
    "khớp ảnh", "đối soát", "tải hàng loạt", "danh mục lớn",
    "cập nhật giá hàng loạt", "excel", "file excel", "bảng tính", "nhập file",
    "google drive", "drive"
  ],
  intents: ["nhap_excel_hang_loat", "dong_bo_anh_hang_loat", "tai_file_excel_mau", "keo_tha_kep_excel_anh"],
  summary: "Công cụ đưa hàng chục đến hàng trăm sản phẩm lên hệ thống nhanh chóng bằng file Excel mẫu và thư mục ảnh (hoặc link Google Drive).",
  stepByStepSOP: [
    {
      stepNumber: 1,
      actionText: "Tải file Excel mẫu: Vào mục 'Nhập hàng loạt', bấm nút tải file Excel mẫu ở góc trên về máy",
      expectedResult: "Tải về bảng tính mẫu gồm các cột: Mã hoa, Tên hoa, Giá bán, Danh mục và Tên file ảnh",
    },
    {
      stepNumber: 2,
      actionText: "Điền dữ liệu hoa: Nhập danh sách hoa vào file Excel và đặt tên file ảnh trên máy trùng với mã hoa (ví dụ: BO-01.jpg)",
      expectedResult: "Chuẩn bị sẵn sàng bộ dữ liệu và thư mục ảnh",
    },
    {
      stepNumber: 3,
      actionText: "Kéo thả file lên hệ thống: Thả file Excel vào khung bên trái, chọn toàn bộ ảnh thả vào khung bên phải",
      expectedResult: "Hệ thống tự động ghép ảnh tương ứng vào từng dòng sản phẩm",
    },
    {
      stepNumber: 4,
      actionText: "Kiểm tra xem trước: Xem lại bảng đối soát xem số lượng dòng khớp ảnh màu xanh",
      expectedResult: "Đảm bảo các sản phẩm đều đã có ảnh đầy đủ trước khi nạp",
    },
    {
      stepNumber: 5,
      actionText: "Bắt đầu nạp: Bấm nút 'Bắt đầu nhập dữ liệu' ở góc trên để đưa hoa vào kho",
      expectedResult: "Hệ thống nạp toàn bộ sản phẩm vào kho hoa của cửa hàng",
    },
  ],
  caveatsAndGotchas: [
    "LƯU Ý QUAN TRỌNG VỀ GOOGLE DRIVE: Nếu dùng link Google Drive, bắt buộc phải bật chia sẻ 'Bất kỳ ai có liên kết' thì hệ thống mới tải ảnh về được.",
    "Mẹo ghép ảnh tự động: Đặt tên file ảnh trùng với mã hoa để hệ thống tự ghép ảnh 100%, không phải chọn tay từng ảnh.",
  ],
  actionLabel: "Mở Màn Hình Nhập Excel Hàng Loạt",
  quickPrompts: [
    "Cách tải file Excel mẫu để nhập sản phẩm hàng loạt?",
    "Lỗi không tải được ảnh Google Drive khi nhập Excel?",
  ],
}
