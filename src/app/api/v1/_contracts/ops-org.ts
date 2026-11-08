import type { OpenApiOperation } from "@/core/http/openapi"
import { uiBrandSettingsSchema } from "@/modules/organization/domain/brand-config"

import { governanceMatrixBody } from "../platform/_contracts/requests"
import { BODY_ERRORS, op } from "./internal-op"
import * as req from "./requests-org"
import * as res from "./responses-org"

/** Operation thành viên `/members/*`, tổ chức `/organizations/*`, `/organization/brand`, xác thực `/auth/*`. */
const MEMBERS = "Thành viên"
const ORG = "Tổ chức"
const AUTH = "Xác thực"
const ID = " Thành viên của tổ chức khác → 404."

export const ORG_OPERATIONS: OpenApiOperation[] = [
  op(MEMBERS, { method: "get", path: "/members", operationId: "listMembers", summary: "Thành viên của tổ chức", cap: "F1",
    ok: [200, { description: "Thành viên, vai, chi nhánh", schema: res.membersResponse }] }),
  op(MEMBERS, { method: "post", path: "/members", operationId: "createStaffAccount", summary: "Tạo tài khoản nhân viên dùng được ngay", cap: "A3", body: req.createStaffBody,
    description: "Trả `temporaryPassword` đúng MỘT lần (`cache-control: no-store`); nhân viên phải đổi mật khẩu khi đăng nhập. Email đã có → 409.",
    ok: [201, { description: "Tài khoản đã tạo", schema: res.staffAccountResponse }], errors: [...BODY_ERRORS, 404, 409, 422] }),
  op(MEMBERS, { method: "post", path: "/members/invite", operationId: "inviteMember", summary: "Mời thành viên qua email", cap: "F3", body: req.inviteMemberBody,
    ok: [201, { description: "Tư cách thành viên đang mời", schema: res.membershipResponse }], errors: [...BODY_ERRORS, 404, 409, 422] }),
  op(MEMBERS, { method: "delete", path: "/members/{id}", operationId: "removeMember", summary: "Gỡ thành viên khỏi tổ chức", cap: "F4", description: ID.trim(),
    ok: [204, { description: "Đã gỡ — không thân" }], errors: [404, 422] }),
  op(MEMBERS, { method: "post", path: "/members/{id}/reset-password", operationId: "resetMemberPassword", summary: "Cấp mật khẩu tạm mới", cap: "A7",
    description: `Đăng xuất nhân viên ở mọi máy; mật khẩu tạm trả đúng MỘT lần.${ID}`, ok: [200, { description: "Mật khẩu tạm", schema: res.resetPasswordResponse }], errors: [404, 422] }),
  op(MEMBERS, { method: "put", path: "/members/{id}/phone", operationId: "setMemberPhone", summary: "Sửa số điện thoại nhân viên", cap: "A3", body: req.memberPhoneBody,
    description: `Shipper được gắn đơn qua số này.${ID}`, ok: [200, { description: "Số mới", schema: res.memberPhoneResponse }], errors: [...BODY_ERRORS, 404, 409, 422] }),
  op(MEMBERS, { method: "patch", path: "/members/{id}/status", operationId: "setMemberActive", summary: "Tạm khoá / mở lại tài khoản", cap: "A5", body: req.memberStatusBody,
    description: `Khoá → đăng xuất ngay.${ID}`, ok: [200, { description: "Trạng thái mới", schema: res.memberStatusResponse }], errors: [...BODY_ERRORS, 404, 422] }),
  op(MEMBERS, { method: "patch", path: "/members/{id}/role", operationId: "changeMemberRole", summary: "Đổi vai thành viên", cap: "F5", body: req.memberRoleBody, description: ID.trim(),
    ok: [200, { description: "Tư cách thành viên", schema: res.membershipResponse }], errors: [...BODY_ERRORS, 404, 422] }),
  op(MEMBERS, { method: "put", path: "/members/{id}/chain-branch", operationId: "setMemberChainBranch", summary: "Gắn / gỡ chi nhánh chuỗi cho tài khoản cửa hàng", cap: "F5",
    body: req.memberChainBranchBody, description: `\`null\` = gỡ. Chi nhánh không thuộc tổ chức → 404.${ID}`,
    ok: [200, { description: "Mã chi nhánh đã gắn", schema: res.memberChainBranchResponse }], errors: [...BODY_ERRORS, 404] }),
  op(MEMBERS, { method: "get", path: "/members/chain-branches", operationId: "listChainBranches", summary: "Chi nhánh chuỗi nhận đơn để chọn khi gắn tài khoản", cap: "F5",
    ok: [200, { description: "Chi nhánh", schema: res.chainBranchesResponse }] }),

  op(ORG, { method: "get", path: "/organizations", operationId: "listMyOrganizations", summary: "Các tổ chức người dùng là thành viên", cap: null, auth: "session",
    ok: [200, { description: "Tổ chức", schema: res.organizationsResponse }] }),
  op(ORG, { method: "get", path: "/organizations/current", operationId: "getCurrentOrganization", summary: "Tổ chức đang hoạt động", cap: "F1",
    ok: [200, { description: "Tổ chức", schema: res.currentOrganizationResponse }], errors: [404] }),
  op(ORG, { method: "patch", path: "/organizations/current", operationId: "updateCurrentOrganization", summary: "Đổi tên / cài đặt tổ chức", cap: "F2", body: req.patchOrganizationBody,
    description: "`settings` hợp nhất nông; khoá do nền tảng quản lý (`industry_locked`, `pending_model_change`, `is_instant_trial`, `lead_*`) không sửa được (422).",
    ok: [200, { description: "Tổ chức sau khi sửa", schema: res.currentOrganizationResponse }], errors: [...BODY_ERRORS, 404, 422] }),
  op(ORG, { method: "post", path: "/organizations/current/upgrade-request", operationId: "requestOrganizationUpgrade", summary: "Xin đổi mô hình tổ chức", cap: "F2", body: req.upgradeRequestBody,
    description: "Chỉ ghi nhận yêu cầu chờ người vận hành nền tảng duyệt; đã có yêu cầu chờ hoặc trùng mô hình hiện tại → 409/422.",
    ok: [201, { description: "Yêu cầu đã ghi", schema: res.upgradeRequestResponse }], errors: [...BODY_ERRORS, 404, 409, 422] }),
  op(ORG, { method: "post", path: "/organizations/current/language-unlock-request", operationId: "requestLanguageUnlock", summary: "Xin mở thêm ngôn ngữ cho Thẻ chào", cap: "F2",
    body: req.languageUnlockBody, ok: [201, { description: "Yêu cầu đã ghi", schema: res.languageUnlockResponse }], errors: [...BODY_ERRORS, 404, 409, 422] }),
  op(ORG, { method: "get", path: "/organizations/current/governance-matrix", operationId: "getTenantGovernanceMatrix", summary: "Ma trận quản trị theo tầng của tổ chức", cap: "F1",
    query: req.governanceQuery, description: "Trả quyết định của tầng mình (`own`) và các tầng trên (`upper`).",
    ok: [200, { description: "Ma trận", schema: res.governanceMatrixResponse }], errors: [400] }),
  op(ORG, { method: "put", path: "/organizations/current/governance-matrix", operationId: "saveTenantGovernanceMatrix", summary: "Lưu quyết định của tầng mình", cap: "F2",
    query: req.governanceQuery, body: governanceMatrixBody, description: "Mục bị tầng trên khoá cứng không ghi đè được (422).",
    ok: [200, { description: "Ma trận sau khi lưu", schema: res.governanceMatrixResponse }], errors: [...BODY_ERRORS, 422] }),
  op(ORG, { method: "get", path: "/organization/brand", operationId: "getOrganizationBrand", summary: "Màu và logo thương hiệu", cap: "F1",
    ok: [200, { description: "Thương hiệu, hoặc `null` khi chưa đặt", schema: res.brandResponse }] }),
  op(ORG, { method: "put", path: "/organization/brand", operationId: "putOrganizationBrand", summary: "Lưu thương hiệu", cap: "F2", body: uiBrandSettingsSchema,
    description: "Màu chính phải đạt tương phản WCAG 2.2 AA (≥ 4.5:1) trên nền trắng (400).",
    ok: [200, { description: "Thương hiệu đã lưu", schema: res.savedBrandResponse }], errors: [...BODY_ERRORS, 404] }),
  op(ORG, { method: "patch", path: "/organization/brand", operationId: "patchOrganizationBrand", summary: "Lưu thương hiệu (như PUT)", cap: "F2", body: uiBrandSettingsSchema,
    ok: [200, { description: "Thương hiệu đã lưu", schema: res.savedBrandResponse }], errors: [...BODY_ERRORS, 404] }),

  op(AUTH, { method: "post", path: "/auth/signup", operationId: "signUp", summary: "Đăng ký tài khoản và tổ chức", cap: null, auth: "public", body: req.signupBody,
    description: "Tài khoản chờ người vận hành nền tảng duyệt — không mở phiên. 20 lần/giờ/IP. Email đã có → 409.",
    ok: [202, { description: "Đang chờ duyệt", schema: res.signupResponse }], errors: [...BODY_ERRORS, 409, 429] }),
  op(AUTH, { method: "post", path: "/auth/instant-trial", operationId: "startInstantTrial", summary: "Dùng thử không mật khẩu, kèm dữ liệu mẫu theo ngành", cap: null, auth: "public",
    body: req.instantTrialBody, description: "Chờ duyệt như đăng ký — không mở phiên. 5 lần/giờ/IP.",
    ok: [202, { description: "Đang chờ duyệt", schema: res.instantTrialResponse }], errors: [...BODY_ERRORS, 409, 429] }),
  op(AUTH, { method: "post", path: "/auth/login", operationId: "logIn", summary: "Đăng nhập", cap: null, auth: "public", body: req.loginBody,
    description: "Đặt cookie phiên và cookie SSO liên ứng dụng. Sai email/mật khẩu → 401; tài khoản chưa duyệt / bị từ chối → 403. 10 lần/15 phút mỗi email, 40 lần/15 phút mỗi IP.",
    ok: [200, { description: "Đã đăng nhập", schema: res.loginResponse }], errors: [...BODY_ERRORS, 401, 403, 429] }),
  op(AUTH, { method: "post", path: "/auth/logout", operationId: "logOut", summary: "Đăng xuất", cap: null, auth: "public", description: "Xoá cookie phiên và cookie SSO; không có phiên vẫn trả 200.",
    ok: [200, { description: "Đã đăng xuất", schema: res.logoutResponse }] }),
  op(AUTH, { method: "get", path: "/auth/me", operationId: "describeSession", summary: "Người dùng, tổ chức hiện tại, năng lực đã tính", cap: null, auth: "session",
    ok: [200, { description: "Phiên", schema: res.sessionResponse }] }),
  op(AUTH, { method: "get", path: "/auth/session-status", operationId: "getSessionStatus", summary: "Kiểm nhanh phiên còn sống", cap: null, auth: "session",
    ok: [200, { description: "Phiên còn hiệu lực", schema: res.sessionStatusResponse }] }),
]
