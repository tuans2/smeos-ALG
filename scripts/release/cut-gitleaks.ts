/**
 * Mang báo nhầm gitleaks đã duyệt ở smeOS (`.gitleaksignore`) sang bản cắt (kế hoạch GD1, Bước 2.4).
 *
 * Dấu vân tay của gitleaks ở chế độ `git` là `<commit>:<tệp>:<luật>:<dòng>`, gắn với commit của smeOS nên không
 * khớp lịch sử mới của bản cắt. Với mỗi mục, lấy nội dung dòng đó ở commit cũ rồi tìm lại dòng có cùng nội dung
 * trong bản cắt; mục không còn dòng nào khớp thì bỏ và báo cáo.
 */
export interface IgnoreEntry {
  commit: string
  file: string
  rule: string
  line: number
}

export function parseGitleaksIgnore(text: string): IgnoreEntry[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .flatMap((line) => {
      const match = /^([0-9a-f]{7,40}):(.+):([\w-]+):(\d+)$/.exec(line)
      return match ? [{ commit: match[1]!, file: match[2]!, rule: match[3]!, line: Number(match[4]) }] : []
    })
}

export interface CarriedIgnores {
  /** `<tệp>:<luật>:<dòng>` trong bản cắt, chưa gắn commit. */
  entries: string[]
  /** Mục của smeOS không mang sang được (tệp không giao, hoặc dòng không còn). */
  dropped: string[]
}

/**
 * `readOld(commit, file)` trả nội dung tệp ở commit cũ của smeOS; `readCut(file)` trả nội dung trong bản cắt.
 * Cả hai trả null khi không có tệp.
 */
export function carryIgnores(
  entries: readonly IgnoreEntry[],
  readOld: (commit: string, file: string) => string | null,
  readCut: (file: string) => string | null,
): CarriedIgnores {
  const carried = new Set<string>()
  const dropped: string[] = []
  for (const entry of entries) {
    const label = `${entry.file}:${entry.rule}:${entry.line}`
    const cut = readCut(entry.file)
    const text = readOld(entry.commit, entry.file)?.split("\n")[entry.line - 1]
    if (cut === null || text === undefined || text.trim() === "") {
      dropped.push(label)
      continue
    }
    const hits = cut.split("\n").flatMap((line, index) => (line === text ? [index + 1] : []))
    if (hits.length === 0) dropped.push(label)
    for (const hit of hits) carried.add(`${entry.file}:${entry.rule}:${hit}`)
  }
  return { entries: [...carried].sort(), dropped }
}

export function renderGitleaksIgnore(commit: string, entries: readonly string[]): string {
  return [
    "# Báo nhầm của gitleaks đã duyệt ở repo nguồn (tên trường cấu hình, khoá localStorage, giá trị test),",
    "# mang sang khi cắt bản giao. Thêm dòng mới chỉ sau khi đã đọc tận mắt.",
    ...entries.map((entry) => `${commit}:${entry}`),
    "",
  ].join("\n")
}
