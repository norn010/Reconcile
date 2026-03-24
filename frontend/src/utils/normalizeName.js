import Fuse from 'fuse.js';
import stringSimilarity from 'string-similarity';

const COMPANY_SUFFIXES = [
  'co., ltd.', 'co.,ltd.', 'co.ltd.', 'co. ltd',
  'company limited', 'limited', 'ltd.',
  'จำกัด', '(มหาชน)', 'มหาชน',
  'สำนักงานใหญ่', 'สาขา',
  'inc.', 'inc', 'corp.', 'corp', 'llc', 'plc',
];

const COMPANY_PREFIXES = [
  'บริษัท', 'บจก.', 'บจก', 'บมจ.', 'บมจ',
  'หจก.', 'หจก', 'ห้างหุ้นส่วน',
];

const REF_CODE_PATTERN = /[A-Z]{3}-?\d{5,}/gi;
const BTR_CODE_PATTERN = /(?:B[O0]?\d[A-Z0-9]{1,2}|\dTR)-?\d{6,}/gi;
const DOC_REF_PATTERN = /\d{3}[A-Z]{2}\d{7,}/gi;
const BRACKET_CODE_PATTERN = /\[.*?\]/g;
const TRAILING_DATE_PATTERN = /\s+\d{1,2}\/\d{1,2}\/\d{2,4}\s*$/;

const ACTION_KEYWORDS = [
  'บันทึกปรับปรุงส่วนลด',
  'ปรับปรุงส่วนลด',
  'บันทึกรับชำระหนี้',
  'บันทึกรับชำระ',
  'รับชำระหนี้',
  'รับชำระค่า',
  'รับชำระ',
  'ชำระหนี้ให้',
  'รับเงินดาวน์',
  'รับเงินจาก',
  'เงินจองรถยนต์',
  'เงินจอง',
  'รับจอง',
  'โอนเงินจาก',
  'โอนเงิน',
  'ชำระเงิน',
  'วางมัดจำ',
  'มัดจำ',
  'ค่างวด',
  'เงินดาวน์',
  'ดาวน์',
  'ถอนจอง',
  'กลับจอง',
  'รายวันรับฝ่ายขาย',
];

const TITLE_PREFIXES = [
  'ว่าที่ ร.ต.หญิง',
  'ว่าที่ ร.ต.', 'ว่าที่ รต.', 'ว่าที่ร.ต.',
  'ว่าที่ร.', 'ว่าที่ ร.',
  'พ.ต.อ.', 'พ.ต.ท.', 'พ.ต.ต.',
  'ร.ต.อ.', 'ร.ต.ท.', 'ร.ต.ต.',
  'ร.ท.', 'ร.ต.',
  'จ.ส.อ.', 'จ.ส.ท.', 'จ.ส.ต.',
  'ส.อ.', 'ส.ท.', 'ส.ต.',
  'นางสาว', 'น.ส.',
  'คุณ', 'นาย', 'นาง', 'ดร.',
  'MR.', 'MR-', 'MRS.', 'MRS-', 'MS.', 'MS-', 'MISS',
];

const SKIP_PATTERNS = [
  /^รายวันรับฝ่ายขาย/,
  /^เงินจองรถยนต์$/,
  /^เงินรับมัดจำ/,
  /^เงินดาวน์รถยนต์$/,
  /ยกมา/,
  /ยอดยกไป/,
  /^รวม/,
  /ปรับปรุงส่วนลด/,
  /^บันทึกปรับปรุง/,
  // Generic batch/account entries — not customer names
  /^เงินค่าอุปกรณ์/,
  /^เงินค่า\S*รถยนต์/,
  /^เงินค่า\S*-รับ/,
  /^ค่าประกันภัย/,
  /^ขายโปรแกรม/,
];

export function shouldSkipDescription(description) {
  return SKIP_PATTERNS.some(p => p.test(description));
}

export function extractCustomerName(description) {
  if (!description || typeof description !== 'string') return '';

  let text = description.trim();

  text = text.replace(BRACKET_CODE_PATTERN, '').trim();
  text = text.replace(REF_CODE_PATTERN, '').trim();
  text = text.replace(BTR_CODE_PATTERN, '').trim();
  text = text.replace(DOC_REF_PATTERN, '').trim();
  text = text.replace(TRAILING_DATE_PATTERN, '').trim();

  for (const keyword of ACTION_KEYWORDS) {
    text = text.replace(new RegExp(keyword, 'gi'), '');
  }

  text = text.replace(/\s*-\s*AION\s*/gi, ' ');

  // Split by slash — take the name part, discard codes/ถอนจอง
  if (text.includes('/')) {
    const parts = text.split('/');
    const namePart = parts.find(p => {
      const t = p.trim();
      if (!t) return false;
      if (/^\s*ถอนจอง\s*$/.test(t)) return false;
      BTR_CODE_PATTERN.lastIndex = 0;
      if (BTR_CODE_PATTERN.test(t)) { return false; }
      DOC_REF_PATTERN.lastIndex = 0;
      if (DOC_REF_PATTERN.test(t)) return false;
      // Reject pure digit/hyphen strings like "25040013"
      if (/^[\d\-]+$/.test(t)) return false;
      return true;
    });
    if (namePart) {
      text = namePart;
    }
  }

  text = text.replace(/[/\\|;]/g, ' ').trim();

  // Remove title prefixes ANYWHERE (not just at start)
  for (const prefix of TITLE_PREFIXES) {
    const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    text = text.replace(new RegExp('(?:^|\\s)' + escaped + '\\s*', 'gi'), ' ');
  }

  text = text.replace(/\s+/g, ' ').trim();
  text = text.replace(/^[\s\-–]+|[\s\-–]+$/g, '').trim();

  if (!text) return description.trim();
  return text.trim();
}

export function normalizeName(name) {
  if (!name) return '';

  let normalized = name.trim().toLowerCase();

  // Strip any remaining ref codes (3TR, 5TR, 6TR, B02FT, etc.)
  normalized = normalized.replace(/(?:b[o0]?\d[a-z0-9]{1,2}|\dtr)-?\d{6,}/gi, '');
  normalized = normalized.replace(/[a-z]{3}-?\d{5,}/gi, '');
  normalized = normalized.replace(/\d{3}[a-z]{2}\d{7,}/gi, '');

  for (const suffix of COMPANY_SUFFIXES) {
    const escapedSuffix = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    normalized = normalized.replace(new RegExp(escapedSuffix, 'gi'), '');
  }

  for (const prefix of TITLE_PREFIXES) {
    const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    normalized = normalized.replace(new RegExp(escaped, 'gi'), '');
  }

  for (const prefix of COMPANY_PREFIXES) {
    const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    normalized = normalized.replace(new RegExp(escaped, 'gi'), '');
  }

  // Remove action keyword remnants
  for (const keyword of ACTION_KEYWORDS) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    normalized = normalized.replace(new RegExp(escaped, 'gi'), '');
  }

  normalized = normalized
    .replace(/\s+/g, '')
    .replace(/[.\-_,;:'"()[\]{}\\/]/g, '')
    .trim();

  return normalized;
}

export function computeSimilarity(a, b) {
  return Math.round(stringSimilarity.compareTwoStrings(a, b) * 100);
}

export function buildFuseIndex(items) {
  return new Fuse(items, {
    includeScore: true,
    threshold: 0.4,
    keys: ['customerNameNormalized'],
  });
}
