import type { I18nDictionary } from "../types"

// DeepPartial cho I18nDictionary (cho phép gán mọi string linh hoạt)
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : string
}

export type CopywritingStyleKey = "friendly" | "pro-saas" | "minimal"

export interface CopywritingStyleDefinition {
  key: CopywritingStyleKey
  name: string
  description: string
  overrides: DeepPartial<I18nDictionary>
}

/**
 * 1. PRO-SAAS: Giọng văn doanh nghiệp, chuyên nghiệp, súc tích và chuẩn mực B2B SaaS
 */
export const proSaasStyle: CopywritingStyleDefinition = {
  key: "pro-saas",
  name: "B2B SaaS Chuyên Nghiệp",
  description: "Chuẩn mực, súc tích, chuyên nghiệp cho doanh nghiệp vừa và lớn",
  overrides: {
    home: {
      header: {
        badge: "Trung tâm chỉ huy",
        title: "Tổng quan vận hành & hiệu suất kinh doanh",
        description: "Lựa chọn phân hệ tác vụ hoặc quản lý quy trình bên dưới.",
      },
      tiers: {
        mother: {
          title: "TRUNG TÂM ĐIỀU HÀNH VẬN HÀNH NỀN TẢNG ALG",
          subtitle: "Định hướng tác vụ, kiểm soát tài nguyên microservices và phân quyền tổ chức toàn hệ thống.",
        },
        industry: {
          title: "QUẢN TRỊ HỆ SINH THÁI SAAS ĐA NGÀNH",
          subtitle: "Quản trị hợp đồng đặc tả ngành, cấu hình AI Studio và danh mục chuẩn hóa cho toàn bộ ngành hàng.",
        },
        chain: {
          title: "ĐIỀU HÀNH MẠNG LƯỚI CHI NHÁNH {name}",
          subtitle: "Điều phối đơn hàng, năng lực sản xuất và tối ưu chuỗi cung ứng {product}.",
        },
        store: {
          title: "Vận hành cửa hàng {name}",
          subtitle: "Lựa chọn phân hệ tác vụ kinh doanh, chế tác và chăm sóc khách hàng.",
        },
      },
    },
    layout: {
      searchPlaceholder: "Tìm kiếm nghiệp vụ... (phím /)",
      reports: {
        title: "Báo cáo phân tích",
        stats: "Chỉ số doanh thu & chuyển đổi",
        usage: "Hiệu năng & hạn mức",
      },
      toolkitShortcuts: {
        title: "Lối tắt nghiệp vụ",
        libraryLabel: "Thư viện 51 công cụ (9 nhóm)",
      },
    },
    common: {
      actions: {
        confirm: "Xác nhận",
        save: "Cập nhật",
        saveDraft: "Lưu bản nháp",
        cancel: "Hủy bỏ",
        create: "Khởi tạo",
      },
    },
    orders: {
      header: {
        category: "Quản lý kinh doanh & xử lý đơn",
        title: "Quản lý đơn hàng",
        createOrder: "Khởi tạo đơn hàng",
      },
    },
    toolkit: {
      header: {
        badge: "Thư viện giải pháp kinh doanh toàn diện (51 công cụ)",
        titleDev: "Hệ thống Công cụ & Nghiệp vụ Kinh doanh ALG",
        titleProd: "Trung tâm Nghiệp vụ & Công cụ Vận hành",
        descDev: "Phân loại 51 giải pháp nghiệp vụ chuẩn hóa theo 9 nhóm chức năng vận hành đa tầng.",
        descProd: "Lựa chọn công cụ chuyên dụng để tối ưu hiệu suất kinh doanh và tự động hóa.",
      },
      filters: {
        searchPlaceholder: "Tìm kiếm giải pháp hoặc công cụ nghiệp vụ...",
      },
    },
  },
}

/**
 * 2. MINIMAL: Ngắn gọn tối đa, lược bỏ từ nối, phục vụ người dùng thao tác nhanh
 */
export const minimalStyle: CopywritingStyleDefinition = {
  key: "minimal",
  name: "Tối Giản & Súc Tích",
  description: "Ngắn gọn tối đa, trực diện, không rườm rà",
  overrides: {
    home: {
      header: {
        badge: "Bắt đầu",
        title: "Chọn việc cần làm",
        description: "Chọn công việc để tiếp tục.",
      },
      tiers: {
        mother: {
          title: "QUẢN TRỊ NỀN TẢNG ALG",
          subtitle: "Chọn phân hệ quản lý hệ thống.",
        },
        industry: {
          title: "QUẢN TRỊ ĐA NGÀNH",
          subtitle: "Cấu hình plugin ngành và chuẩn hóa dữ liệu.",
        },
        chain: {
          title: "BẠN MUỐN LÀM GÌ VỚI MẠNG LƯỚI {name}?",
          subtitle: "Điều phối mạng lưới {product}.",
        },
        store: {
          title: "Hôm nay bạn muốn làm gì cho {name}?",
          subtitle: "Chọn việc để làm.",
        },
      },
    },
    layout: {
      searchPlaceholder: "Tìm chức năng... (/)",
      reports: {
        title: "Báo cáo",
        stats: "Doanh số",
        usage: "Hạn mức",
      },
      toolkitShortcuts: {
        title: "Lối tắt",
        libraryLabel: "Thư viện công cụ",
      },
    },
    common: {
      actions: {
        confirm: "Xác nhận",
        save: "Lưu",
        saveDraft: "Nháp",
        cancel: "Hủy",
        create: "Tạo",
        edit: "Sửa",
        delete: "Xóa",
      },
    },
    orders: {
      header: {
        category: "Kinh doanh",
        title: "Đơn hàng",
        createOrder: "Tạo đơn",
      },
    },
    toolkit: {
      header: {
        badge: "51 Công cụ",
        titleDev: "Thư viện công cụ",
        titleProd: "Hôm nay bạn muốn làm gì?",
        descDev: "51 công cụ theo 9 nhóm chức năng.",
        descProd: "Chọn công cụ bên dưới để bắt đầu.",
      },
      filters: {
        searchPlaceholder: "Tìm công cụ...",
      },
    },
  },
}

/**
 * 3. FRIENDLY: Thân thiện, gần gũi, hướng dẫn tận tình, tự nhiên cho chủ shop
 */
export const friendlyStyle: CopywritingStyleDefinition = {
  key: "friendly",
  name: "Thân Thiện & Gần Gũi",
  description: "Văn phong gần gũi, ấm áp, tận tình cho cửa hàng & thợ chế tác",
  overrides: {
    home: {
      header: {
        badge: "Chào bạn!",
        title: "Hôm nay tiệm mình muốn làm gì nào?",
        description: "Bấm vào bất kỳ công việc nào bên dưới để bắt đầu nhé.",
      },
    },
    layout: {
      searchPlaceholder: "Tìm nhanh việc bạn cần làm... (/)",
      reports: {
        title: "Tình hình kinh doanh",
        stats: "Doanh số tiệm",
        usage: "Lượt dùng AI",
      },
      toolkitShortcuts: {
        title: "Lối tắt của tiệm",
        libraryLabel: "Tất cả công cụ",
      },
    },
    common: {
      actions: {
        confirm: "Đồng ý",
        save: "Lưu lại",
        saveDraft: "Lưu nháp thôi",
        cancel: "Thôi bỏ qua",
        create: "Tạo mới ngay",
      },
    },
    orders: {
      header: {
        category: "Bán hàng và xử lý đơn",
        title: "Đơn hàng của tiệm",
        createOrder: "Lên đơn mới",
      },
    },
  },
}

export const STYLES_CATALOG: Record<CopywritingStyleKey, CopywritingStyleDefinition> = {
  "pro-saas": proSaasStyle,
  minimal: minimalStyle,
  friendly: friendlyStyle,
}

