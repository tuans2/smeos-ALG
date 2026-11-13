/**
 * Trình sinh và lọc PeriodBucket rời rạc cho Market Intelligence Engine.
 * Cho phép phân bổ cơ hội theo từng ngày, từng tuần, từng tháng, từng quý cụ thể.
 */

import type { MinimalTimeItem } from "./trend-timeframe";

export interface PeriodBucket {
  id: string;
  label: string;
  subLabel?: string;
  count: number;
  dateStart: Date;
  dateEnd: Date;
  isCurrent?: boolean;
}

/**
 * Sinh danh sách các ngày cụ thể gần nhất (vd: 7 ngày qua) kèm số đếm cơ hội.
 */
export function generateDailyBuckets<T extends MinimalTimeItem>(
  items: T[],
  countDays = 7,
  referenceDate = new Date()
): PeriodBucket[] {
  const buckets: PeriodBucket[] = [];
  const ref = new Date(referenceDate);

  for (let i = 0; i < countDays; i++) {
    const d = new Date(ref);
    d.setDate(ref.getDate() - i);

    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

    const dateStr = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
      .toString()
      .padStart(2, "0")}`;

    let label = dateStr;
    if (i === 0) label = `Hôm nay (${dateStr})`;
    else if (i === 1) label = `Hôm qua (${dateStr})`;
    else {
      const daysOfWeek = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
      label = `${daysOfWeek[d.getDay()]} (${dateStr})`;
    }

    const count = items.filter((item) => {
      const t = new Date(item.createdAt).getTime();
      return t >= start.getTime() && t <= end.getTime();
    }).length;

    buckets.push({
      id: `day_${d.toISOString().slice(0, 10)}`,
      label,
      subLabel: dateStr,
      count,
      dateStart: start,
      dateEnd: end,
      isCurrent: i === 0,
    });
  }

  return buckets;
}

/**
 * Sinh danh sách các tuần cụ thể (vd: 4 tuần gần nhất) kèm số đếm cơ hội.
 */
export function generateWeeklyBuckets<T extends MinimalTimeItem>(
  items: T[],
  countWeeks = 4,
  referenceDate = new Date()
): PeriodBucket[] {
  const buckets: PeriodBucket[] = [];
  const ref = new Date(referenceDate);

  for (let i = 0; i < countWeeks; i++) {
    const end = new Date(ref);
    end.setDate(ref.getDate() - i * 7);
    end.setHours(23, 59, 59, 999);

    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    const fmt = (d: Date) =>
      `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;

    const rangeStr = `${fmt(start)} – ${fmt(end)}`;
    let label = `Tuần ${countWeeks - i} (${rangeStr})`;
    if (i === 0) label = `Tuần này (${rangeStr})`;
    else if (i === 1) label = `Tuần trước (${rangeStr})`;

    const count = items.filter((item) => {
      const t = new Date(item.createdAt).getTime();
      return t >= start.getTime() && t <= end.getTime();
    }).length;

    buckets.push({
      id: `week_${i}`,
      label,
      subLabel: rangeStr,
      count,
      dateStart: start,
      dateEnd: end,
      isCurrent: i === 0,
    });
  }

  return buckets;
}

/**
 * Sinh danh sách các tháng cụ thể (vd: 4 tháng gần nhất) kèm số đếm cơ hội.
 */
export function generateMonthlyBuckets<T extends MinimalTimeItem>(
  items: T[],
  countMonths = 4,
  referenceDate = new Date()
): PeriodBucket[] {
  const buckets: PeriodBucket[] = [];
  const curYear = referenceDate.getFullYear();
  const curMonth = referenceDate.getMonth();

  for (let i = 0; i < countMonths; i++) {
    const target = new Date(curYear, curMonth - i, 1);
    const start = new Date(target.getFullYear(), target.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(target.getFullYear(), target.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthNum = target.getMonth() + 1;
    const yearNum = target.getFullYear();

    let label = `Tháng ${monthNum}/${yearNum}`;
    if (i === 0) label = `Tháng này (T${monthNum})`;
    else if (i === 1) label = `Tháng trước (T${monthNum})`;

    const count = items.filter((item) => {
      const t = new Date(item.createdAt).getTime();
      return t >= start.getTime() && t <= end.getTime();
    }).length;

    buckets.push({
      id: `month_${yearNum}_${monthNum}`,
      label,
      subLabel: `${monthNum}/${yearNum}`,
      count,
      dateStart: start,
      dateEnd: end,
      isCurrent: i === 0,
    });
  }

  return buckets;
}

/**
 * Sinh danh sách các quý / khối 3 tháng cụ thể.
 */
export function generateQuarterlyBuckets<T extends MinimalTimeItem>(
  items: T[],
  countQuarters = 4,
  referenceDate = new Date()
): PeriodBucket[] {
  const buckets: PeriodBucket[] = [];
  const curYear = referenceDate.getFullYear();
  const curQuarter = Math.floor(referenceDate.getMonth() / 3) + 1;

  for (let i = 0; i < countQuarters; i++) {
    let q = curQuarter - i;
    let y = curYear;
    while (q <= 0) {
      q += 4;
      y -= 1;
    }

    const startMonth = (q - 1) * 3;
    const start = new Date(y, startMonth, 1, 0, 0, 0, 0);
    const end = new Date(y, startMonth + 3, 0, 23, 59, 59, 999);

    let label = `Quý ${q}/${y} (T${startMonth + 1}–T${startMonth + 3})`;
    if (i === 0) label = `Quý này (Q${q}/${y})`;
    else if (i === 1) label = `Quý trước (Q${q}/${y})`;

    const count = items.filter((item) => {
      const t = new Date(item.createdAt).getTime();
      return t >= start.getTime() && t <= end.getTime();
    }).length;

    buckets.push({
      id: `quarter_${y}_Q${q}`,
      label,
      subLabel: `Q${q}/${y}`,
      count,
      dateStart: start,
      dateEnd: end,
      isCurrent: i === 0,
    });
  }

  return buckets;
}

/**
 * Lọc danh sách mục theo PeriodBucket cụ thể.
 */
export function filterByPeriodBucket<T extends MinimalTimeItem>(
  items: T[],
  bucket: PeriodBucket | null
): T[] {
  if (!bucket) return items;
  const startMs = bucket.dateStart.getTime();
  const endMs = bucket.dateEnd.getTime();

  return items.filter((item) => {
    const itemTime = new Date(item.createdAt).getTime();
    if (isNaN(itemTime)) return false;
    return itemTime >= startMs && itemTime <= endMs;
  });
}
