import { afterAll, beforeAll, describe, expect, it } from "vitest"

import * as R from "@/app/api/v1/_contracts/responses-org"
import { POST as instantTrial } from "@/app/api/v1/auth/instant-trial/route"
import { POST as logIn } from "@/app/api/v1/auth/login/route"
import { POST as logOut } from "@/app/api/v1/auth/logout/route"
import { GET as me } from "@/app/api/v1/auth/me/route"
import { GET as sessionStatus } from "@/app/api/v1/auth/session-status/route"
import { POST as signUp } from "@/app/api/v1/auth/signup/route"
import { PUT as setChainBranch } from "@/app/api/v1/members/[id]/chain-branch/route"
import { PUT as setPhone } from "@/app/api/v1/members/[id]/phone/route"
import { POST as resetPassword } from "@/app/api/v1/members/[id]/reset-password/route"
import { PATCH as changeRole } from "@/app/api/v1/members/[id]/role/route"
import { DELETE as removeMember } from "@/app/api/v1/members/[id]/route"
import { PATCH as setStatus } from "@/app/api/v1/members/[id]/status/route"
import { GET as chainBranches } from "@/app/api/v1/members/chain-branches/route"
import { POST as invite } from "@/app/api/v1/members/invite/route"
import { GET as listMembers, POST as createStaff } from "@/app/api/v1/members/route"
import { GET as getBrand, PATCH as patchBrand, PUT as putBrand } from "@/app/api/v1/organization/brand/route"
import { GET as getGov, PUT as putGov } from "@/app/api/v1/organizations/current/governance-matrix/route"
import { POST as languageUnlock } from "@/app/api/v1/organizations/current/language-unlock-request/route"
import { GET as getCurrent, PATCH as patchCurrent } from "@/app/api/v1/organizations/current/route"
import { POST as upgrade } from "@/app/api/v1/organizations/current/upgrade-request/route"
import { GET as listOrganizations } from "@/app/api/v1/organizations/route"
import { RoleRepository } from "@/modules/organization/infra/role-repository"

import { expectContract } from "../helpers/contract"
import { disconnectDatabase, resetDatabase } from "../helpers/database"
import { createTenant, makeChainOrganization, seedChainBranch, withSession, type Tenant } from "../helpers/fixtures"

/** Hợp đồng phản hồi thành viên, tổ chức, xác thực (OpenAPI nội bộ, PO 07/11/2026) — CSDL thật, lược đồ strict. */
const BASE = "http://localhost/api/v1"
const ps = <T extends Record<string, string>>(params: T) => ({ params: Promise.resolve(params) })
const json = (path: string, body: unknown) =>
  new Request(`${BASE}${path}`, { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } })

describe("hợp đồng — thành viên, tổ chức, xác thực", () => {
  let t: Tenant
  const get = (path: string) => withSession(`${BASE}${path}`, t.token)
  const send = (path: string, method: string, body?: unknown) =>
    withSession(`${BASE}${path}`, t.token, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })

  beforeAll(async () => {
    await resetDatabase()
    t = await createTenant("hop-dong-to-chuc")
  })
  afterAll(async () => {
    await disconnectDatabase()
  })

  it("thành viên: tạo tài khoản, mời, liệt kê, sửa số, khoá, đổi vai, gắn chi nhánh chuỗi, cấp mật khẩu, gỡ", async () => {
    const roles = new RoleRepository()
    const sale = (await roles.findSystemRoleByKey("sale"))!
    const florist = (await roles.findSystemRoleByKey("tho_cam_hoa")) ?? sale
    const staff = await expectContract(
      await createStaff(send("/members", "POST", { name: "Bạn Hoa", email: "ban-hoa@vi-du.test", role_id: sale.id, phone: "0900000001" })),
      201,
      R.staffAccountResponse,
      "staff-account"
    )
    const id = (staff.data as { membershipId: string }).membershipId
    // Mời chỉ dành cho người đã có tài khoản (người chưa có dùng "Thêm nhân viên")
    await createTenant("nguoi-duoc-moi")
    await expectContract(await invite(send("/members/invite", "POST", { email: "nguoi-duoc-moi@vi-du.test", role_id: sale.id })), 201, R.membershipResponse, "membership")
    await expectContract(await listMembers(get("/members")), 200, R.membersResponse, "members")
    await expectContract(await setPhone(send(`/members/${id}/phone`, "PUT", { phone: "0900000002" }), ps({ id })), 200, R.memberPhoneResponse, "member-phone")
    await expectContract(await setStatus(send(`/members/${id}/status`, "PATCH", { active: false }), ps({ id })), 200, R.memberStatusResponse, "member-status")
    await expectContract(await setStatus(send(`/members/${id}/status`, "PATCH", { active: true }), ps({ id })), 200, R.memberStatusResponse, "member-status")
    await expectContract(await changeRole(send(`/members/${id}/role`, "PATCH", { role_id: florist.id }), ps({ id })), 200, R.membershipResponse, "membership")
    await makeChainOrganization(t)
    await seedChainBranch(t, "CN-Q1", "Chi nhánh Quận 1")
    await expectContract(await chainBranches(get("/members/chain-branches")), 200, R.chainBranchesResponse, "chain-branches")
    await expectContract(await setChainBranch(send(`/members/${id}/chain-branch`, "PUT", { chain_branch_code: "CN-Q1" }), ps({ id })), 200, R.memberChainBranchResponse, "member-chain-branch")
    await expectContract(await resetPassword(send(`/members/${id}/reset-password`, "POST"), ps({ id })), 200, R.resetPasswordResponse, "reset-password")
    const removed = await removeMember(send(`/members/${id}`, "DELETE"), ps({ id }))
    expect(removed.status).toBe(204)
  })

  it("tổ chức: danh sách, hiện tại, sửa, xin đổi mô hình, xin mở ngôn ngữ, ma trận quản trị, thương hiệu", async () => {
    await expectContract(await listOrganizations(get("/organizations")), 200, R.organizationsResponse, "organizations")
    await expectContract(await getCurrent(get("/organizations/current")), 200, R.currentOrganizationResponse, "organization")
    await expectContract(await patchCurrent(send("/organizations/current", "PATCH", { name: "Tiệm hoa Bình Minh", settings: { timezone: "Asia/Ho_Chi_Minh" } })), 200, R.currentOrganizationResponse, "organization")
    await expectContract(await upgrade(send("/organizations/current/upgrade-request", "POST", { requested_type: "STORE", note: "Mở thêm quầy" })), 201, R.upgradeRequestResponse, "upgrade-request")
    await expectContract(await languageUnlock(send("/organizations/current/language-unlock-request", "POST", { note: "Khách nước ngoài" })), 201, R.languageUnlockResponse, "language-unlock")
    await expectContract(await getGov(get("/organizations/current/governance-matrix?system=PROMOTIONS")), 200, R.governanceMatrixResponse, "governance")
    await expectContract(
      await putGov(send("/organizations/current/governance-matrix?system=PROMOTIONS", "PUT", { decisions: { overrides: { "voucher.tet": true }, locks: {} } })),
      200,
      R.governanceMatrixResponse,
      "governance"
    )
    await expectContract(await getBrand(get("/organization/brand")), 200, R.brandResponse, "brand")
    await expectContract(await putBrand(send("/organization/brand", "PUT", { primary: "#1F4E79", accent: "#C0392B" })), 200, R.savedBrandResponse, "brand-saved")
    await expectContract(await patchBrand(send("/organization/brand", "PATCH", { primary: "#14532D" })), 200, R.savedBrandResponse, "brand-saved")
    await expectContract(await getBrand(get("/organization/brand")), 200, R.brandResponse, "brand")
  })

  it("xác thực: đăng ký, dùng thử, đăng nhập, phiên, đăng xuất", async () => {
    await expectContract(await signUp(json("/auth/signup", { email: "moi-dang-ky@vi-du.test", password: "mat-khau-du-dai", organization_name: "Tiệm Mới" })), 202, R.signupResponse, "signup")
    await expectContract(await instantTrial(json("/auth/instant-trial", { name: "Chị Thu", phone: "0901234567", email: "dung-thu@vi-du.test" })), 202, R.instantTrialResponse, "instant-trial")
    const login = await logIn(json("/auth/login", { email: "hop-dong-to-chuc@vi-du.test", password: "mat-khau-du-dai" }))
    // Đăng nhập mới thay phiên cũ — các lệnh sau dùng cookie vừa đặt
    const cookie = login.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ")
    await expectContract(login, 200, R.loginResponse, "login")
    const withCookie = (path: string, method = "GET") => new Request(`${BASE}${path}`, { method, headers: { cookie } })
    await expectContract(await me(withCookie("/auth/me")), 200, R.sessionResponse, "me")
    await expectContract(await sessionStatus(withCookie("/auth/session-status")), 200, R.sessionStatusResponse, "session-status")
    await expectContract(await logOut(withCookie("/auth/logout", "POST")), 200, R.logoutResponse, "logout")
  })
})
