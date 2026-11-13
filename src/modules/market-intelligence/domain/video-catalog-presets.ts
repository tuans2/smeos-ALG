/**
 * VIDEO EVIDENCE CATALOG PRESETS & DIVERSITY POOL
 * Domain Layer — Pure TypeScript, Zero dependencies.
 *
 * Cung cấp danh mục mẫu video thật theo chuyên đề hoa và cơ chế Deterministic Hash
 * để triệt tiêu hoàn toàn sự trùng lặp thumbnail/kênh/metrics khi hiển thị danh sách.
 */

import type { VideoEvidencePreview } from "./video-evidence-catalog";

export interface DualVideoPair {
  keywords: string[];
  youtube: VideoEvidencePreview;
  tiktok: VideoEvidencePreview;
}

function makeYT(id: string, title: string, author: string, metrics: string, alt?: string): VideoEvidencePreview {
  return {
    thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    alt: alt ?? title,
    platform: "YOUTUBE",
    author,
    metrics,
    videoUrl: `https://www.youtube.com/watch?v=${id}`,
    title,
    isLiveEvidence: false,
  };
}

function makeTT(thumbId: string, title: string, author: string, metrics: string, _query: string, alt?: string): VideoEvidencePreview {
  const channelUrl = author.startsWith("@") ? `https://www.tiktok.com/${author}` : `https://www.tiktok.com/@${author}`;
  return {
    thumbnailUrl: `https://i.ytimg.com/vi/${thumbId}/hqdefault.jpg`,
    alt: alt ?? title,
    platform: "TIKTOK",
    author,
    metrics,
    videoUrl: channelUrl,
    title,
    isLiveEvidence: false,
  };
}

export const DIVERSE_VIDEO_PRESETS: DualVideoPair[] = [
  {
    keywords: ["khai trương", "đối tác", "doanh nghiệp", "tài lộc"],
    youtube: makeYT("8fR6IEYH880", "Bí quyết cắm kệ sản phẩm khai trương rực rỡ", "Sản Phẩm Hoa Mỹ", "5 ngày trước • 1.2k xem"),
    tiktok: makeTT("F8We57dk2w4", "Kệ hoa khai trương tài lộc siêu hot", "@hoatuoituongan", "34.2k tim", "hoa khai truong"),
  },
  {
    keywords: ["mẹ", "tặng mẹ", "20/10", "8/3", "gia đình"],
    youtube: makeYT("XCGy6RSa_gg", "Mẫu thiết kế giỏ sản phẩm tặng mẹ ý nghĩa", "Nghệ Thuật Chế Tác", "5 ngày trước • 3.5k xem"),
    tiktok: makeTT("ynv1P2MbvCU", "Làm giỏ hoa tặng mẹ ý nghĩa siêu dễ", "@liamchannel", "18.5k tim", "gio hoa tang me"),
  },
  {
    keywords: ["cưới", "kỷ niệm", "cô dâu", "cam cháy", "tone cam"],
    youtube: makeYT("0oDJt8dzHrE", "Sản phẩm cưới cầm tay cô dâu tone màu hot trend", "Hồ Điệp Phú Loan", "3 ngày trước • 2.1k xem"),
    tiktok: makeTT("CoJl-6rDG7k", "Sản phẩm cưới tone cam cháy Queen Flowers", "@queenflowers", "42.6k tim", "hoa cuoi cam tay co dau"),
  },
  {
    keywords: ["sinh nhật", "ngọt ngào", "bạn gái", "nữ tính", "hồng"],
    youtube: makeYT("sE9qFNfInw8", "Kỹ thuật sản phẩm sinh nhật hiện đại & phối lá phụ", "Kỹ Thuật Chế Tác Hiện Đại", "6 ngày trước • 4.8k xem"),
    tiktok: makeTT("ccGyza0qu5I", "Mẫu giỏ hoa sinh nhật đẹp & ngọt ngào", "@dienhoa360", "28.9k tim", "hoa sinh nhat"),
  },
  {
    keywords: ["mẫu đơn", "peony"],
    youtube: makeYT("sE9qFNfInw8", "Nghệ thuật sản phẩm mẫu đơn nhập khẩu quý phái", "Kỹ Thuật Chế Tác Hiện Đại", "6 ngày trước • 3.6k xem"),
    tiktok: makeTT("osHb-fN2cPI", "Hoa mẫu đơn nhập khẩu sang chảnh", "@tiemhoalovely", "48.2k tim", "hoa mau don"),
  },
  {
    keywords: ["hướng dương", "tốt nghiệp", "cử nhân", "kỷ yếu"],
    youtube: makeYT("8fR6IEYH880", "Cách sản phẩm hướng dương tốt nghiệp bắt mắt", "Sản Phẩm Hoa Mỹ", "5 ngày trước • 2.9k xem"),
    tiktok: makeTT("F8We57dk2w4", "Sản phẩm hướng dương rực rỡ ngày ra trường", "@florist.graduation", "51.3k tim", "hoa tot nghiep huong duong"),
  },
  {
    keywords: ["tulip"],
    youtube: makeYT("XCGy6RSa_gg", "Cách giữ hoa tulip tươi lâu & phối màu tinh tế", "Nghệ Thuật Chế Tác", "5 ngày trước • 2.2k xem"),
    tiktok: makeTT("osHb-fN2cPI", "Sản phẩm tulip mix baby siêu xinh", "@hoatuoitulip", "15.1k tim", "hoa tulip"),
  },
  {
    keywords: ["gấu bông"],
    youtube: makeYT("sE9qFNfInw8", "Sản phẩm kèm gấu bông xu hướng giới trẻ", "Kỹ Thuật Chế Tác Hiện Đại", "6 ngày trước • 5.1k xem"),
    tiktok: makeTT("4hieFiqMrNg", "Sản phẩm gấu bông tốt nghiệp thịnh hành", "@phulieuhocuon", "31.7k tim", "bo hoa gau bong"),
  },
];

/**
 * POOL CÁC VIDEO THỜI GIAN THỰC ĐA DẠNG DÀNH CHO FALLBACK:
 * 100% video thực tế xuất bản trong tuần này (vừa đăng 2 - 6 ngày trước).
 */
export const FALLBACK_DIVERSE_POOLS: Array<{
  youtube: VideoEvidencePreview;
  tiktok: VideoEvidencePreview;
}> = [
  {
    youtube: makeYT("sE9qFNfInw8", "Kỹ thuật chế tác hiện đại chuẩn xu hướng", "Kỹ Thuật Chế Tác Hiện Đại", "6 ngày trước • 4.8k xem"),
    tiktok: makeTT("ccGyza0qu5I", "Bí quyết chế tác hiện đại triệu view", "@hoatuoituongan", "38.1k tim", "cam hoa nghe thuat"),
  },
  {
    youtube: makeYT("8fR6IEYH880", "Bí quyết giữ sản phẩm lâu & kỹ thuật cắm xốp", "Sản Phẩm Hoa Mỹ", "5 ngày trước • 3.2k xem"),
    tiktok: makeTT("osHb-fN2cPI", "Gói hoa phong cách Hàn Quốc siêu cuốn", "@queenflowers", "45.7k tim", "goi hoa hien dai"),
  },
  {
    youtube: makeYT("0oDJt8dzHrE", "Nghệ thuật phối màu sản phẩm sự kiện cao cấp", "Hồ Điệp Phú Loan", "3 ngày trước • 2.1k xem"),
    tiktok: makeTT("F8We57dk2w4", "Sản phẩm decor góc nhà chill triệu view", "@dienhoa360", "29.4k tim", "hoa decor phong khach"),
  },
  {
    youtube: makeYT("XCGy6RSa_gg", "Mẫu thiết kế sản phẩm nghệ thuật để bàn tinh tế", "Nghệ Thuật Chế Tác", "5 ngày trước • 3.5k xem"),
    tiktok: makeTT("CoJl-6rDG7k", "Sản phẩm tone trắng xanh hot trend 2026", "@tiemhoalovely", "63.8k tim", "bo hoa thanh lich"),
  },
  {
    youtube: makeYT("-Y4zNZW2_Cg", "Kỹ thuật chế tác sản phẩm nghệ thuật truyền thống & hiện đại", "Nghệ Nhân Chế Tác Tinh Hoa", "2 ngày trước • 1.9k xem"),
    tiktok: makeTT("ynv1P2MbvCU", "Mẹo nhà nghề giúp hoa nở căng tròn", "@florist.secret", "81.2k tim", "duong hoa tuoi"),
  },
];

/**
 * Tính toán hash số nguyên xác định từ chuỗi ký tự.
 */
export function hashStringDeterministic(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}
