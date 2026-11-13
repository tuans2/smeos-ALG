/**
 * Định nghĩa 75 trường khảo sát đối tác. Vị trí trong mảng = cột của Google Sheet gốc
 * (A→BW), `aliases` = các cách đặt tiêu đề hay gặp để ghép cột theo tên khi tệp Excel
 * thêm/bớt/đổi chỗ cột. Thuần — dùng ở máy chủ và trình duyệt.
 */

export interface SurveyColumnDef {
  /** Đường dẫn trường trong hồ sơ, vd. `contact.address`. */
  key: string
  label: string
  aliases: readonly string[]
  /** Trường hiện sẵn ở bước ghép cột (phần còn lại nằm trong vùng mở rộng). */
  core?: boolean
}

const c = (key: string, label: string, aliases: readonly string[], core = false): SurveyColumnDef => ({ key, label, aliases, core })

export const SURVEY_COLUMNS: readonly SurveyColumnDef[] = [
  c("audit.timestamp", "Dấu thời gian", ["dấu thời gian", "timestamp", "thời gian gửi"]),
  c("audit.specialist", "Chuyên viên khảo sát", ["chuyên viên khảo sát", "người khảo sát", "nhân viên khảo sát", "chuyên viên"]),
  c("audit.surveyDate", "Ngày khảo sát", ["ngày khảo sát"]),
  c("audit.surveyType", "Hình thức khảo sát", ["hình thức khảo sát", "loại khảo sát"]),
  c("audit.notes", "Ghi chú khảo sát", ["ghi chú khảo sát", "ghi chú chuyên viên"]),
  c("identity.shopName", "Tên cửa hàng", ["tên cửa hàng", "tên shop", "tên tiệm", "tên thương hiệu", "shop name"], true),
  c("identity.legalName", "Tên pháp lý", ["tên pháp lý", "tên doanh nghiệp", "tên công ty", "tên hộ kinh doanh", "tên đăng ký kinh doanh"]),
  c("identity.taxCode", "Mã số thuế", ["mã số thuế", "mst"]),
  c("identity.ownerName", "Chủ cửa hàng", ["chủ cửa hàng", "tên chủ cửa hàng", "họ tên chủ", "tên chủ", "chủ sở hữu", "chủ shop", "người đại diện"], true),
  c("identity.contactPerson", "Người liên hệ", ["người liên hệ", "đầu mối liên hệ", "người phụ trách"]),
  c("identity.operatingYears", "Số năm hoạt động", ["số năm hoạt động", "năm hoạt động", "thời gian hoạt động"], true),
  c("identity.scale", "Quy mô", ["quy mô", "số cửa hàng", "số chi nhánh", "chi nhánh"], true),
  c("identity.legalCompliance", "Giấy tờ pháp lý", ["giấy tờ pháp lý", "pháp lý", "giấy phép kinh doanh", "đăng ký kinh doanh", "gpkd"]),
  c("contact.phone", "Số điện thoại", ["số điện thoại", "điện thoại", "sđt", "hotline", "phone"], true),
  c("contact.email", "Email", ["email", "e-mail", "thư điện tử"]),
  c("contact.address", "Địa chỉ", ["địa chỉ", "địa chỉ cửa hàng", "address"], true),
  c("contact.googleMaps", "Vị trí Google Maps", ["google maps", "google map", "bản đồ", "định vị", "vị trí"]),
  c("digital.facebook", "Facebook", ["facebook", "fanpage", "fb"]),
  c("digital.tiktok", "TikTok", ["tiktok", "tik tok"]),
  c("digital.website", "Website", ["website", "trang web"]),
  c("digital.googleReview", "Đánh giá Google", ["đánh giá google", "google review", "review google"]),
  c("digital.facebookFollowers", "Lượt theo dõi Facebook", ["theo dõi facebook", "follow facebook", "follower facebook", "lượt theo dõi fanpage"]),
  c("digital.tiktokFollowers", "Lượt theo dõi TikTok", ["theo dõi tiktok", "follow tiktok", "follower tiktok"]),
  c("digital.postingFrequency", "Tần suất đăng bài", ["tần suất đăng bài", "tần suất đăng", "đăng bài"]),
  c("digital.onlineOrderChannels", "Kênh nhận đơn online", ["kênh nhận đơn", "nhận đơn online", "kênh bán online", "kênh online"]),
  c("digital.adsAndLivestream", "Quảng cáo / livestream", ["quảng cáo", "livestream", "chạy ads"]),
  c("business.monthlyRevenue", "Doanh thu trung bình tháng", ["doanh thu trung bình tháng", "doanh thu tháng", "doanh thu"], true),
  c("business.dailyOrdersNormal", "Số đơn ngày thường", ["đơn ngày thường", "số đơn ngày thường", "số đơn mỗi ngày", "số đơn trung bình"]),
  c("business.dailyOrdersPeak", "Số đơn ngày cao điểm", ["đơn ngày cao điểm", "số đơn cao điểm", "đơn ngày lễ", "đơn mùa cao điểm"]),
  c("business.aov", "Giá trị đơn trung bình", ["giá trị đơn trung bình", "giá trị đơn", "giá bán trung bình", "aov"]),
  c("business.targetCustomers", "Khách hàng mục tiêu", ["khách hàng mục tiêu", "tệp khách", "đối tượng khách"]),
  c("business.b2bShare", "Tỷ trọng khách doanh nghiệp", ["khách doanh nghiệp", "khách hàng doanh nghiệp", "b2b"]),
  c("business.customerSources", "Nguồn khách", ["nguồn khách hàng", "nguồn khách"]),
  c("business.paymentMethods", "Phương thức thanh toán", ["phương thức thanh toán", "hình thức thanh toán", "thanh toán"]),
  c("business.challenges", "Khó khăn hiện tại", ["khó khăn", "thách thức"]),
  c("business.goals12m", "Mục tiêu 12 tháng", ["mục tiêu 12 tháng", "kế hoạch 12 tháng", "mục tiêu"]),
  c("business.algExpectations", "Kỳ vọng khi hợp tác", ["kỳ vọng", "mong đợi"]),
  c("business.cooperationWishes", "Mong muốn hợp tác", ["mong muốn hợp tác", "muốn hợp tác", "hình thức hợp tác", "sẵn sàng hợp tác"]),
  c("production.productLines", "Danh mục sản phẩm", ["danh mục sản phẩm", "các dòng sản phẩm", "loại sản phẩm", "dòng sản phẩm", "sản phẩm"], true),
  c("production.mainProductLine", "Sản phẩm chủ lực", ["sản phẩm chủ lực", "dòng sản phẩm chính", "sản phẩm chính", "sản phẩm thế mạnh"], true),
  c("production.floristCount", "Số nhân sự chế tác", ["nhân sự chế tác", "số lượng thợ", "số thợ", "florist"], true),
  c("production.leadFloristExperience", "Kinh nghiệm thợ chính", ["kinh nghiệm thợ chính", "kinh nghiệm thợ", "thợ chính"]),
  c("production.maxCapacityNormal", "Công suất ngày thường", ["công suất ngày thường", "công suất tối đa ngày thường", "công suất"]),
  c("production.maxCapacityPeak", "Công suất ngày cao điểm", ["công suất ngày cao điểm", "công suất cao điểm", "công suất ngày lễ"]),
  c("production.flowerSupply", "Nguồn cung hoa", ["nguồn cung hoa", "nguồn cung", "nhập hoa từ"]),
  c("production.mainFlowerSource", "Nguồn hoa chính", ["nguồn hoa chính", "nhà cung cấp chính", "chợ hoa"]),
  c("production.importFrequency", "Tần suất nhập hoa", ["tần suất nhập hoa", "tần suất nhập"]),
  c("production.rareFlowerAbility", "Đáp ứng hoa hiếm", ["hoa hiếm", "hoa nhập khẩu", "hoa đặc biệt"]),
  c("production.inboundProcess", "Quy trình nhập hoa", ["quy trình nhập hoa", "quy trình nhập", "quy trình nhận hoa", "sơ chế"]),
  c("production.freshnessDuration", "Thời gian giữ tươi", ["thời gian giữ tươi", "giữ tươi", "độ tươi"]),
  c("production.lossRateEstimate", "Tỷ lệ hao hụt", ["tỷ lệ hao hụt", "hao hụt"]),
  c("production.nearExpireHandling", "Xử lý hoa sắp hỏng", ["hoa sắp hỏng", "sắp hỏng", "sắp hết hạn", "hoa tồn"]),
  c("facilityAndDelivery.coolers", "Tủ mát", ["tủ mát", "tủ lạnh", "tủ bảo quản"]),
  c("facilityAndDelivery.coldStorage", "Kho lạnh", ["kho lạnh", "phòng lạnh"]),
  c("facilityAndDelivery.premises", "Mặt bằng", ["mặt bằng"]),
  c("facilityAndDelivery.space", "Không gian cửa hàng", ["không gian cửa hàng", "không gian", "diện tích"]),
  c("facilityAndDelivery.equipment", "Trang thiết bị", ["trang thiết bị", "thiết bị", "dụng cụ"]),
  c("facilityAndDelivery.staffing", "Nhân sự", ["nhân sự", "số nhân viên", "nhân viên"]),
  c("facilityAndDelivery.deliveryVehicles", "Phương tiện giao hàng", ["phương tiện giao hàng", "phương tiện giao", "phương tiện"]),
  c("facilityAndDelivery.deliveryRadius", "Bán kính giao hàng", ["bán kính giao hàng", "bán kính giao", "phạm vi giao", "khu vực giao"]),
  c("facilityAndDelivery.deliveryCommitmentTime", "Thời gian cam kết giao", ["thời gian cam kết giao", "cam kết giao", "thời gian giao"]),
  c("facilityAndDelivery.coldDeliveryAbility", "Giao hàng giữ lạnh", ["giao hàng giữ lạnh", "giao lạnh", "giữ lạnh"]),
  c("facilityAndDelivery.deliveryFeePolicy", "Phí giao hàng", ["phí giao hàng", "phí giao", "phí ship", "phí vận chuyển"]),
  c("media.requiredPhotoTypes", "Loại ảnh đã chụp", ["loại ảnh", "ảnh đã chụp", "ảnh cần chụp"]),
  c("media.rawImageUrls", "Link ảnh khảo sát", ["link ảnh", "tải ảnh", "ảnh khảo sát", "hình ảnh", "upload ảnh"], true),
  c("media.requiredDocuments", "Giấy tờ đã thu", ["giấy tờ đã thu", "giấy tờ", "tài liệu"]),
  c("scoreAndTier.skillAndCraftScore", "Điểm tay nghề", ["điểm tay nghề", "tay nghề"]),
  c("scoreAndTier.processFacilityScore", "Điểm quy trình & cơ sở", ["điểm quy trình", "quy trình cơ sở", "cơ sở vật chất"]),
  c("scoreAndTier.supplyStorageScore", "Điểm nguồn cung & bảo quản", ["điểm nguồn cung", "nguồn cung bảo quản", "bảo quản"]),
  c("scoreAndTier.productionDeliveryScore", "Điểm sản xuất & giao hàng", ["điểm sản xuất", "sản xuất giao hàng"]),
  c("scoreAndTier.legalDigitalScore", "Điểm pháp lý & số hoá", ["điểm pháp lý", "pháp lý số hoá"]),
  c("scoreAndTier.disciplineCooperationScore", "Điểm kỷ luật & hợp tác", ["điểm kỷ luật", "kỷ luật"]),
  c("scoreAndTier.totalScore", "Tổng điểm", ["tổng điểm", "điểm tổng"], true),
  c("scoreAndTier.suggestedTier", "Hạng đối tác", ["hạng đề xuất", "hạng đối tác", "xếp hạng", "phân hạng", "hạng"], true),
  c("scoreAndTier.additionalNotes", "Ghi chú thêm", ["ghi chú thêm", "ghi chú khác", "ghi chú", "nhận xét"]),
]

/** Cột tên cửa hàng — bắt buộc phải ghép mới nhập được. */
export const SHOP_NAME_FIELD = 5
