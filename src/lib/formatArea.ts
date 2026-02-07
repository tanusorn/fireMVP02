/**
 * Utility functions for formatting area values consistently in Thai (ตร.ม.)
 */

/**
 * Formats a number as a square meter string in Thai (ตร.ม.)
 * @param value Area in square meters
 * @returns Formatted string (e.g., "12,500 ตร.ม.") or "ไม่มีข้อมูล" for null/undefined
 */
export function formatAreaM2(value: number | null | undefined): string {
  if (value === null || value === undefined) return "ไม่มีข้อมูล";
  return `${Math.round(value).toLocaleString("th-TH")} ตร.ม.`;
}

/**
 * Formats a number as a square meter value only (without unit)
 * @param value Area in square meters
 * @returns Formatted number string with thousand separators
 */
export function formatAreaValue(value: number | null | undefined): string {
  if (value === null || value === undefined) return "0";
  return Math.round(value).toLocaleString("th-TH");
}

/**
 * Converts hectares to square meters
 * @param ha Area in hectares
 * @returns Area in square meters
 */
export function convertHaToM2(ha: number): number {
  return ha * 10000;
}
