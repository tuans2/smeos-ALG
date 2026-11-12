// Luật kiểm bản giao khách (`git archive`). Tách khỏi handover-check.mjs để test được.

/** Cấu hình agent nội bộ ở gốc repo. */
export const AGENT_CONFIG = [/^AGENTS\.md$/, /^CLAUDE\.md$/, /^\.agents\//, /^\.claude\//, /^\.agent-studio\//, /AGENTS_SECTION_[^/]*\.md$/]

/** Tài liệu hướng dẫn agent trong docs/ — PO quyết định không bàn giao. */
export const AGENT_DOCS = /(AGENTS|CLAUDE)\.md$|AGENT_(MASTER_PROMPT|EXECUTION_PROTOCOL)|CODING_AGENT_GUIDE/i

/** Tên khách hàng trong tên tệp văn phòng (quy ước `_<KHÁCH>`). Bên nhận bàn giao không bị tính là khách khác. */
export const CUSTOMER_NAMES = { ALG: "ALG", AVI_FLORIST: "AVI[_ -]?FLORIST", SIIN: "SIIN", MOC_LAN: "MOC[_ -]?LAN" }

/** @param {string | undefined} recipient khoá trong CUSTOMER_NAMES của bên nhận (vd. "ALG") */
export function customerFilesPattern(recipient) {
  const names = Object.entries(CUSTOMER_NAMES).filter(([key]) => key !== recipient).map(([, re]) => re).join("|")
  const ext = "(xlsx|xls|docx|doc|pptx|ppt|pdf)"
  return new RegExp(`(^|[_\\-/ ])(${names})[_\\-. ][^/]*\\.${ext}$|(^|[_\\-/ ])(${names})\\.${ext}$`, "i")
}

/** Tệp văn phòng mang tên khách hàng khác — bản giao không có bên nhận cụ thể. */
export const CUSTOMER_FILES = customerFilesPattern(undefined)

/**
 * Mẫu nhập liệu chung của nền tảng — từ 12/11/2026 nền tảng mang thương hiệu ALG nên tên mẫu có "ALG",
 * nhưng đây không phải dữ liệu của khách hàng ALG.
 */
export const PLATFORM_TEMPLATES = /^public\/templates\/ALG_Template_[^/]*\.xlsx$/

/** Đường dẫn máy cá nhân trong nội dung tệp. */
export const LOCAL_PATH = ["file://", "/Users/"].join("")

/**
 * @param {string[]} entries danh sách mục trong bản giao
 * @param {string[]} filesWithLocalPath tệp (trong bản giao) có chứa LOCAL_PATH
 * @param {{ recipient?: string | undefined }} [options] bên nhận — tệp mang tên bên nhận không bị chặn
 * @returns {{ rule: string, path: string }[]}
 */
export function findHandoverViolations(entries, filesWithLocalPath = [], options = {}) {
  const customerFiles = customerFilesPattern(options.recipient)
  const out = []
  const inArchive = new Set(entries)
  for (const p of entries) {
    if (AGENT_CONFIG.some((re) => re.test(p))) out.push({ rule: "cấu hình agent", path: p })
    else if (AGENT_DOCS.test(p)) out.push({ rule: "tài liệu agent", path: p })
    else if (customerFiles.test(p) && !PLATFORM_TEMPLATES.test(p)) out.push({ rule: "tệp của khách hàng khác", path: p })
  }
  for (const p of filesWithLocalPath) {
    if (inArchive.has(p)) out.push({ rule: "đường dẫn máy cá nhân", path: p })
  }
  return out
}
