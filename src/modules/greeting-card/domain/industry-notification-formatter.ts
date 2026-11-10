/**
 * Định dạng nội dung thông báo nhân viên thích ứng theo ngành (Industry Notification Formatter).
 * Pure TypeScript — tuân thủ Single Responsibility Principle & SRP line limits.
 *
 * Quy ước tiêu đề chuẩn hóa (rà soát 23/10/2026): `{emoji} {code} · <việc cần làm>` —
 * Sentence case, không chấm cảm cố định, không mã kỹ thuật (QC/BOM…) lộ ra tiêu đề/nội dung.
 */
import type {
  StaffNotificationContext,
  StaffNotifyEvent,
} from "./staff-notification-types"

export function formatIndustryStaffNotificationText(
  event: StaffNotifyEvent,
  ctx: StaffNotificationContext
): { title: string; message: string } {
  const code = ctx.orderCode ? `[Đơn ${ctx.orderCode}]` : ctx.sessionId ? `[Phiên ${ctx.sessionId}]` : "[Bộ sưu tập riêng]"
  const customer = ctx.customerName ? `Khách: ${ctx.customerName}` : "Khách hàng"
  const amount = ctx.amountVnd != null ? ` · Số tiền: ${ctx.amountVnd.toLocaleString("vi-VN")} đ` : ""
  const item = ctx.productName ? ` · ${ctx.productName}` : ""
  const note = ctx.reason || ctx.extraNote ? `\nLý do/Ghi chú: ${ctx.reason || ctx.extraNote}` : ""
  const industry = (ctx.industryKey || "").toUpperCase()

  // 1. NGÀNH HOMESTAY & LƯU TRÚ NGHỈ DƯỠNG
  if (industry === "HOMESTAY") {
    const dates = ctx.checkInDate
      ? ` (Nhận: ${ctx.checkInDate}${ctx.checkOutDate ? ` → Trả: ${ctx.checkOutDate}` : ""})`
      : ""

    switch (event) {
      case "ORDER_RECEIVED":
        return {
          title: `🏡 ${code} · Có lượt đặt phòng mới`,
          message: `${customer}${item}${amount}${dates}. Quản gia/Lễ tân kiểm tra phòng và chuẩn bị đón tiếp.${note}`,
        }
      case "ORDER_ACCEPTED":
        return {
          title: `✅ ${code} · Đơn lưu trú đã được tiếp nhận`,
          message: `${customer}${item}${amount}${dates}. Phòng đã được xác nhận — Quản gia bắt đầu chuẩn bị phòng đón khách.${note}`,
        }
      case "PAYMENT_REPORTED":
        return {
          title: `${code} · Khách báo đã chuyển khoản tiền phòng`,
          message: `${customer} đã tải bill chuyển khoản${amount}. Cần đối soát duyệt cọc giữ phòng.${note}`,
        }
      case "PAYMENT_CONFIRMED":
        return {
          title: `${code} · Xác nhận cọc/tiền phòng thành công`,
          message: `${customer}${item}${amount}. Quản gia/Lễ tân tiếp nhận lịch chuẩn bị phòng đón khách.${note}`,
        }
      case "CANCELLATION_REQUESTED":
        return {
          title: `🚨 ${code} · Khách yêu cầu huỷ đặt phòng`,
          message: `${customer} xin huỷ lịch lưu trú${amount}. Điều hành và Quản gia giải quyết chính sách huỷ/hoàn cọc ngay.${note}`,
        }
      case "CHANGE_REQUESTED":
        return {
          title: `⚠️ ${code} · Khách xin đổi ngày lưu trú hoặc thông tin`,
          message: `${customer} yêu cầu đổi ngày nhận/trả phòng hoặc số lượng khách. Cần duyệt lịch phòng.${note}`,
        }
      case "READY":
        return {
          title: `✨ ${code} · Phòng đã dọn dẹp và sẵn sàng đón tiếp`,
          message: `${customer}${item}. Phòng đã setup hoàn tất tiện nghi. Lễ tân/Quản gia sẵn sàng đón khách check-in.${note}`,
        }
      case "DELIVERY_FAILED":
        return {
          title: `🚨 ${code} · Khách quá giờ chưa Check-in`,
          message: `${customer}. Khách chưa nhận phòng và chưa liên lạc được. Sale và Lễ tân kiểm tra lại SĐT hỗ trợ.${note}`,
        }
      case "STUCK_DETECTED":
        return {
          title: `⏱️ ${code} · Lịch đặt phòng quá hạn xử lý`,
          message: `${customer}${item}. Yêu cầu lưu trú bị kẹt quá thời gian quy định, cần xác nhận ngay.${note}`,
        }
      case "SECOND_PAYMENT_REPORTED":
        return {
          title: `${code} · Khách đã thanh toán tiền phòng đợt 2`,
          message: `${customer} đã chuyển phần tiền phòng còn lại${amount}. Lễ tân đối soát hoàn tất thủ tục check-in.${note}`,
        }
      case "DISCOUNT_REQUESTED":
        return {
          title: `${code} · Yêu cầu phê duyệt ưu đãi phòng`,
          message: `Đề xuất giảm giá cho lượt đặt phòng${item}. Điều hành xem xét duyệt.${note}`,
        }
    }
  }

  // 2. NGÀNH ẨM THỰC / F&B
  if (industry === "FNB") {
    switch (event) {
      case "ORDER_RECEIVED":
        return {
          title: `🍲 ${code} · Có đơn gọi món mới`,
          message: `${customer}${item}${amount}. Bếp tiếp nhận đơn và bắt đầu chế biến.${note}`,
        }
      case "ORDER_ACCEPTED":
        return {
          title: `✅ ${code} · Đơn đã được tiếp nhận`,
          message: `${customer}${item}${amount}. Bếp xác nhận thực hiện được đơn — bắt đầu chuẩn bị.${note}`,
        }
      case "PAYMENT_CONFIRMED":
        return {
          title: `${code} · Thanh toán thành công, bếp tiếp nhận làm món`,
          message: `${customer}${item}${amount}. Bếp và pha chế thực hiện đơn.${note}`,
        }
      case "READY":
        return {
          title: `🍽️ ${code} · Món ăn đã chế biến xong`,
          message: `${customer}${item}. Món đã ra đĩa hoàn tất. Nhân viên phục vụ/giao món kiểm tra xuất đơn.${note}`,
        }
      case "DELIVERY_FAILED":
        return {
          title: `🚨 ${code} · Giao món ăn chưa thành công`,
          message: `${customer}. Không giao được món ăn đến khách, nhân viên liên hệ lại gấp.${note}`,
        }
    }
  }

  // 3. NGÀNH THỜI TRANG & MAY ĐO (FASHION)
  if (industry === "FASHION") {
    switch (event) {
      case "ORDER_RECEIVED":
        return {
          title: `👗 ${code} · Có đơn may đo hoặc mua sắm mới`,
          message: `${customer}${item}${amount}. Thợ may và kho tiếp nhận yêu cầu.${note}`,
        }
      case "ORDER_ACCEPTED":
        return {
          title: `✅ ${code} · Đơn may đo đã được xác nhận`,
          message: `${customer}${item}${amount}. Thợ may tiếp nhận đơn — bắt đầu cắt may.${note}`,
        }
      case "READY":
        return {
          title: `✨ ${code} · Trang phục đã may đo hoàn thiện và kiểm tra chất lượng`,
          message: `${customer}${item}. Trang phục đã may xong, Sale gửi ảnh kiểm tra hoặc nhắc khách thử đồ/thanh toán.${note}`,
        }
    }
  }

  // 4. NGÀNH DỊCH VỤ / SPA / SALON (SERVICES)
  if (industry === "SERVICES") {
    switch (event) {
      case "ORDER_RECEIVED":
        return {
          title: `💆 ${code} · Có lịch hẹn dịch vụ mới`,
          message: `${customer}${item}${amount}. Kỹ thuật viên tiếp nhận lịch phục vụ.${note}`,
        }
      case "ORDER_ACCEPTED":
        return {
          title: `✅ ${code} · Lịch dịch vụ đã được tiếp nhận`,
          message: `${customer}${item}${amount}. Kỹ thuật viên xác nhận được lịch — chuẩn bị dụng cụ và đến đúng giờ.${note}`,
        }
      case "READY":
        return {
          title: `${code} · Dịch vụ đã chuẩn bị sẵn sàng`,
          message: `${customer}${item}. Cơ sở và chuyên viên sẵn sàng tiếp đón khách theo lịch hẹn.${note}`,
        }
    }
  }

  // 5. MẶC ĐỊNH CHO HOA TƯƠI (FLORAL) & QUÀ TẶNG (CRAFT_GIFT) & BÁN LẺ (RETAIL)
  switch (event) {
    case "ORDER_RECEIVED":
      return {
        title: `${code} · Có đơn hàng mới`,
        message: `${customer}${item}${amount}. Kiểm tra và xác nhận đơn ngay.${note}`,
      }
    case "ORDER_ACCEPTED":
      return {
        title: `✅ ${code} · Đơn hàng đã được tiếp nhận`,
        message: `${customer}${item}${amount}. Điều hành xác nhận đơn — bắt đầu chuẩn bị sản phẩm và giao hàng.${note}`,
      }
    case "PAYMENT_REPORTED":
      return {
        title: `${code} · Khách báo đã chuyển khoản`,
        message: `${customer} đã tải bill chuyển khoản${amount}. Cần đối soát và duyệt thanh toán.${note}`,
      }
    case "PAYMENT_CONFIRMED":
      return {
        title: `${code} · Thanh toán thành công, tiếp nhận đơn`,
        message: `${customer}${item}${amount}. Điểm Điều phối tiếp nhận và phân công xưởng thực hiện.${note}`,
      }
    case "CANCELLATION_REQUESTED":
      return {
        title: `🚨 ${code} · Khách yêu cầu huỷ đơn hàng`,
        message: `${customer} xin huỷ đơn${amount}. Điều hành và Sale cần xử lý hoàn tiền, giải quyết gấp.${note}`,
      }
    case "CHANGE_REQUESTED":
      return {
        title: `⚠️ ${code} · Khách yêu cầu đổi thông tin đơn`,
        message: `${customer} gửi yêu cầu cập nhật thông tin đơn hàng. Cần kiểm tra và phê duyệt.${note}`,
      }
    case "READY":
      return {
        title: `${code} · Sản phẩm đã hoàn thành và kiểm tra chất lượng`,
        message: `${customer}${item}. Xưởng đã hoàn thiện, Sale gửi ảnh kiểm tra hoặc nhắc thanh toán lần 2.${note}`,
      }
    case "DELIVERY_FAILED":
      return {
        title: `🚨 ${code} · Giao hàng chưa thành công`,
        message: `${customer}. Shipper giao thất bại, Sale liên hệ lại khách và Điều phối hẹn giờ giao.${note}`,
      }
    case "STUCK_DETECTED":
      return {
        title: `⏱️ ${code} · Đơn quá hạn xử lý`,
        message: `${customer}${item}. Đơn bị kẹt quá thời gian quy định, cần xử lý ngay.${note}`,
      }
    case "SECOND_PAYMENT_REPORTED":
      return {
        title: `${code} · Khách đã chuyển tiền đợt 2`,
        message: `${customer} đã chuyển phần tiền còn lại${amount}. Điều phối xác nhận để xuất kho giao hàng.${note}`,
      }
    case "DISCOUNT_REQUESTED":
      return {
        title: `${code} · Yêu cầu phê duyệt giảm giá`,
        message: `Đề xuất chiết khấu cho đơn hàng${item}. Điều hành xem xét duyệt.${note}`,
      }
    case "PRODUCT_PROPOSED":
      return {
        title: `Có mẫu mới chờ duyệt${item}`,
        message: `Nhân viên vừa tạo mẫu mới${item}. Mẫu đã dùng được để bán; Điều hành vào Sản phẩm để xem và duyệt.${note}`,
      }
    case "PRODUCT_PROPOSAL_REMINDER":
      return {
        title: `Nhắc duyệt mẫu đề xuất${item}`,
        message: `Mẫu đề xuất${item} chưa được duyệt. Quá hạn mẫu sẽ tự tạm ẩn.${note}`,
      }
    case "PRODUCT_PROPOSAL_REJECTED":
      return {
        title: `Mẫu đề xuất bị từ chối${item}`,
        message: `Điều hành đã từ chối mẫu${item} và tạm ẩn mẫu.${note}`,
      }
    case "PRODUCT_CHANGE_REQUESTED":
      return {
        title: `Có đề xuất sửa mẫu${item}`,
        message: `Nhân viên đề xuất sửa mẫu chính thức${item}. Bản đang bán giữ nguyên tới khi Điều hành duyệt.${note}`,
      }
    case "PRODUCT_CHANGE_REVIEWED":
      return {
        title: `Đề xuất sửa mẫu đã có kết quả${item}`,
        message: `Điều hành đã xem đề xuất sửa mẫu${item}.${note}`,
      }
    case "PRODUCT_PROPOSAL_EXPIRED":
      return {
        title: `Mẫu đề xuất hết hạn${item}`,
        message: `Mẫu${item} quá 30 ngày chưa được duyệt nên đã tự tạm ẩn. Liên hệ Điều hành nếu vẫn cần mẫu này.${note}`,
      }
  }
}
