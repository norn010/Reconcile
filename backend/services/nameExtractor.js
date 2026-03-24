const Fuse = require('fuse.js');
const stringSimilarity = require('string-similarity');

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

// All reference code patterns seen in the data
const REF_CODE_PATTERN = /[A-Z]{3}-?\d{5,}/gi;

// B-series codes: B02TR-xxx, B03R2xxx, B01F1-xxx, B03FT-xxx
const BTR_CODE_PATTERN = /(?:B[O0]?\d[A-Z0-9]{1,2}|\dTR)-?\d{6,}/gi;

// Document reference codes: 011RE25010006, 011CN25060044
const DOC_REF_PATTERN = /\d{3}[A-Z]{2}\d{7,}/gi;

// Patterns in square brackets like [IHF-25030017]
const BRACKET_CODE_PATTERN = /\[.*?\]/g;

// Date suffixes appended to names like "5/2/68" or "23/09/68"
const TRAILING_DATE_PATTERN = /\s+\d{1,2}\/\d{1,2}\/\d{2,4}\s*$/;

// Action keywords - ordered longest first so longer matches are removed before shorter substrings
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

// Title prefixes that appear before names
const TITLE_PREFIXES = [
  'ว่าที่ ร.ต.หญิง',
  'ว่าที่ ร.ต.',
  'ว่าที่ รต.',
  'ว่าที่ร.ต.',
  'ว่าที่ร.',
  'ว่าที่ ร.',
  'พ.ต.อ.',
  'พ.ต.ท.',
  'พ.ต.ต.',
  'ร.ต.อ.',
  'ร.ต.ท.',
  'ร.ต.ต.',
  'ร.ท.',
  'ร.ต.',
  'จ.ส.อ.',
  'จ.ส.ท.',
  'จ.ส.ต.',
  'ส.อ.',
  'ส.ท.',
  'ส.ต.',
  'นางสาว',
  'น.ส.',
  'คุณ',
  'นาย',
  'นาง',
  'ดร.',
  'MR.', 'MR-',
  'MRS.', 'MRS-',
  'MS.', 'MS-',
  'MISS',
];

// Descriptions that are NOT customer transactions — skip entirely
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

function shouldSkipDescription(description) {
  return SKIP_PATTERNS.some(p => p.test(description));
}

function extractCustomerName(description) {
  if (!description || typeof description !== 'string') return '';

  let text = description.trim();

  // Remove content in square brackets [IHF-25030017]
  text = text.replace(BRACKET_CODE_PATTERN, '').trim();

  // Remove all reference codes (ITR, ITB, ITC, IHF, IHR, IRR, MTR)
  text = text.replace(REF_CODE_PATTERN, '').trim();

  // Remove B-series codes anywhere in the string
  text = text.replace(BTR_CODE_PATTERN, '').trim();

  // Remove document reference codes (011RE25010006)
  text = text.replace(DOC_REF_PATTERN, '').trim();

  // Remove trailing dates like "5/2/68"
  text = text.replace(TRAILING_DATE_PATTERN, '').trim();

  // Remove action keywords (longest first)
  for (const keyword of ACTION_KEYWORDS) {
    text = text.replace(new RegExp(keyword, 'gi'), '');
  }

  // Remove vehicle brand/model markers
  text = text.replace(/\s*-\s*AION\s*/gi, ' ');

  // Split by slash — take the name part, discard codes/ถอนจอง
  if (text.includes('/')) {
    const parts = text.split('/');
    const namePart = parts.find(p => {
      const t = p.trim();
      if (!t) return false;
      if (/^\s*ถอนจอง\s*$/.test(t)) return false;
      BTR_CODE_PATTERN.lastIndex = 0;
      if (BTR_CODE_PATTERN.test(t)) { BTR_CODE_PATTERN.lastIndex = 0; return false; }
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

  // Remove remaining delimiters
  text = text.replace(/[/\\|;]/g, ' ').trim();

  // Remove title prefixes ANYWHERE in text (not just at start)
  // so that "รับเงินจาก คุณ X" → after keyword removal → "คุณ X" → "X"
  for (const prefix of TITLE_PREFIXES) {
    const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    text = text.replace(new RegExp('(?:^|\\s)' + escaped + '\\s*', 'gi'), ' ');
  }

  // Collapse multiple spaces into one
  text = text.replace(/\s+/g, ' ').trim();

  // Remove leading/trailing dashes and hyphens
  text = text.replace(/^[\s\-–]+|[\s\-–]+$/g, '').trim();

  if (!text) return description.trim();
  return text.trim();
}

function normalizeName(name) {
  if (!name) return '';

  let normalized = name.trim().toLowerCase();

  // Strip any remaining ref codes (3TR, 5TR, 6TR, B02FT, etc.)
  normalized = normalized.replace(/(?:b[o0]?\d[a-z0-9]{1,2}|\dtr)-?\d{6,}/gi, '');
  normalized = normalized.replace(/[a-z]{3}-?\d{5,}/gi, '');
  normalized = normalized.replace(/\d{3}[a-z]{2}\d{7,}/gi, '');

  // Remove company suffixes
  for (const suffix of COMPANY_SUFFIXES) {
    const escapedSuffix = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    normalized = normalized.replace(new RegExp(escapedSuffix, 'gi'), '');
  }

  // Remove title prefixes
  for (const prefix of TITLE_PREFIXES) {
    const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    normalized = normalized.replace(new RegExp(escaped, 'gi'), '');
  }

  // Remove company prefixes
  for (const prefix of COMPANY_PREFIXES) {
    const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    normalized = normalized.replace(new RegExp(escaped, 'gi'), '');
  }

  // Remove action keyword remnants
  for (const keyword of ACTION_KEYWORDS) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    normalized = normalized.replace(new RegExp(escaped, 'gi'), '');
  }

  // Remove all whitespace, punctuation, brackets
  normalized = normalized
    .replace(/\s+/g, '')
    .replace(/[.\-_,;:'"()[\]{}\\/]/g, '')
    .trim();

  return normalized;
}

function buildNameIndex(names) {
  const fuse = new Fuse(names, {
    includeScore: true,
    threshold: 0.4,
    keys: ['normalized'],
  });
  return fuse;
}

function findBestMatch(targetNormalized, candidateNormals) {
  if (!targetNormalized || candidateNormals.length === 0) return null;

  const result = stringSimilarity.findBestMatch(targetNormalized, candidateNormals);

  if (result.bestMatch.rating >= 0.6) {
    return {
      match: result.bestMatch.target,
      confidence: Math.round(result.bestMatch.rating * 100),
    };
  }
  return null;
}

function groupByCustomer(transactions, strictMode = false) {
  const normalizedMap = new Map();

  for (const tx of transactions) {
    if (shouldSkipDescription(tx.description)) continue;

    const raw = extractCustomerName(tx.description);
    const normalized = normalizeName(raw);

    if (!normalized) continue;

    tx.customerNameRaw = raw;
    tx.customerNameNormalized = normalized;

    if (!normalizedMap.has(normalized)) {
      normalizedMap.set(normalized, { raw, normalized, transactions: [] });
    }
    normalizedMap.get(normalized).transactions.push(tx);
  }

  if (strictMode) {
    return Array.from(normalizedMap.values());
  }

  // Fuzzy merge pass: group names that are very similar
  const keys = Array.from(normalizedMap.keys());
  const merged = new Map();
  const visited = new Set();

  for (const key of keys) {
    if (visited.has(key)) continue;

    const group = normalizedMap.get(key);
    const mergedGroup = {
      raw: group.raw,
      normalized: key,
      aliases: [key],
      transactions: [...group.transactions],
    };

    for (const otherKey of keys) {
      if (otherKey === key || visited.has(otherKey)) continue;

      const similarity = stringSimilarity.compareTwoStrings(key, otherKey);

      const shorter = key.length <= otherKey.length ? key : otherKey;
      const longer = key.length <= otherKey.length ? otherKey : key;
      const isSubstring = shorter.length >= 6 && longer.startsWith(shorter);

      let shouldMerge = similarity >= 0.75 || isSubstring;

      if (!shouldMerge && similarity >= 0.65) {
        const rawA = group.raw.replace(/\s+/g, ' ').trim().toLowerCase();
        const rawB = normalizedMap.get(otherKey).raw.replace(/\s+/g, ' ').trim().toLowerCase();
        const wordsA = rawA.split(/\s+/).filter(w => w.length >= 2);
        const wordsB = rawB.split(/\s+/).filter(w => w.length >= 2);
        if (wordsA.length >= 2 && wordsB.length >= 2) {
          const shared = wordsA.filter(w => wordsB.some(w2 => w === w2 || stringSimilarity.compareTwoStrings(w, w2) >= 0.85));
          const ratio = shared.length / Math.min(wordsA.length, wordsB.length);
          if (ratio >= 0.6) shouldMerge = true;
        }
      }

      if (shouldMerge) {
        const otherGroup = normalizedMap.get(otherKey);
        mergedGroup.transactions.push(...otherGroup.transactions);
        mergedGroup.aliases.push(otherKey);
        visited.add(otherKey);
      }
    }

    visited.add(key);
    merged.set(key, mergedGroup);
  }

  return Array.from(merged.values());
}

module.exports = {
  extractCustomerName,
  normalizeName,
  buildNameIndex,
  findBestMatch,
  groupByCustomer,
  shouldSkipDescription,
  COMPANY_SUFFIXES,
  COMPANY_PREFIXES,
  ACTION_KEYWORDS,
  TITLE_PREFIXES,
};
