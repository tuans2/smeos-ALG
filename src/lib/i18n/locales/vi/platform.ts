/**
 * platform.ts — Từ điển UI cho phân hệ Vận hành Nền tảng (SaaS Mother)
 */

export const platformVi = {
  header: {
    title: "Trung tâm Vận hành Nền tảng",
    subtitle: "Quản trị toàn diện hệ thống, phân quyền và giám sát tổ chức",
  },
  organizations: {
    title: "Danh sách tổ chức",
    createOrg: "Thêm tổ chức mới",
    searchPlaceholder: "Tìm kiếm tổ chức, tenant...",
    filterAll: "Tất cả tổ chức",
    statusActive: "Đang hoạt động",
    statusSuspended: "Tạm dừng",
    scopeSystem: "Phạm vi: Toàn hệ thống",
    table: {
      org: "Tổ chức",
      type: "Loại",
      members: "Thành viên",
      credit: "Credit",
      createdAt: "Tạo lúc",
    },
    types: {
      store: "Cửa hàng",
      network: "Mạng lưới điện hoa",
      platform: "Nền tảng",
      experience: "Trải nghiệm",
    },
    empty: "Chưa có tổ chức nào.",
    loadError: "Không tải được danh sách tổ chức.",
  },
  registration: {
    title: "Đơn đăng ký tài khoản",
    approve: "Phê duyệt đơn",
    reject: "Từ chối",
    empty: "Không có đơn đăng ký nào chờ duyệt",
  },
  approval: {
    title: "Trung tâm phê duyệt hệ thống",
    subtitle: "Duyệt yêu cầu nâng hạn mức, mở tính năng và chứng chỉ",
  },
  industry: {
    title: "Ma trận ngành hàng",
    subtitle: "Cấu hình plugin ngành, đơn vị đo lường và định lượng BOM",
  },
  health: {
    title: "Sức khỏe hệ thống & CSDL",
    subtitle: "Giám sát thời gian thực microservices, latency và database",
  },
} as const

