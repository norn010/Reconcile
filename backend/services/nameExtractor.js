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
const REF_CODE_PATTERN = /(?:ITR|ITB|ITC|IHF|IHR|IRR|MTR)-?\d{5,}/gi;

// B-series codes: B02TR-2411150003, B03R2501300001, B01TR-25011180002, B03FT-xxx
// Covers B + digit(s) + letters + optional dash + digits
const BTR_CODE_PATTERN = /B[O0]?\d[A-Z]{1,2}-?\d{6,}/gi;

// Patterns in square brackets like [IHF-25030017]
const BRACKET_CODE_PATTERN = /\[.*?\]/g;

// Date suffixes appended to names like "5/2/68" or "23/09/68"
const TRAILING_DATE_PATTERN = /\s+\d{1,2}\/\d{1,2}\/\d{2,4}\s*$/;

// Action keywords - ordered longest first so longer matches are removed before shorter substrings
const ACTION_KEYWORDS = [
  'บันทึกรับชำระหนี้',
  'บันทึกรับชำระ',
  'รับชำระหนี้',
  'รับชำระค่า',
  'รับชำระ',
  'รับเงินจาก',
  'เงินจองรถยนต์',
  'เงินจอง',
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
  /ยกมา/,
  /ยอดยกไป/,
  /^รวม/,
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

  // Remove trailing dates like "5/2/68"
  text = text.replace(TRAILING_DATE_PATTERN, '').trim();

  // Remove action keywords (longest first)
  for (const keyword of ACTION_KEYWORDS) {
    text = text.replace(new RegExp(keyword, 'gi'), '');
  }

  // Remove vehicle brand/model markers
  text = text.replace(/\s*-\s*AION\s*/gi, ' ');

  // Split by slash — take the first part (name), discard codes/ถอนจอง
  if (text.includes('/')) {
    const parts = text.split('/');
    const namePart = parts.find(p => p.trim() && !BTR_CODE_PATTERN.test(p.trim()) && !/^\s*ถอนจอง\s*$/.test(p.trim()));
    BTR_CODE_PATTERN.lastIndex = 0;
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

  // Strip any remaining B-codes or ref codes that slipped through
  normalized = normalized.replace(/b[o0]?\d[a-z]{1,2}-?\d{6,}/gi, '');
  normalized = normalized.replace(/(?:itr|itb|itc|ihf|ihr|irr|mtr)-?\d{5,}/gi, '');

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

      // Substring containment: one name is the beginning of another
      // (e.g. "ศุกัญญ์ฑวุฒิ" vs "ศุกัญญ์ฑวุฒิมนูญธรรมพร")
      const shorter = key.length <= otherKey.length ? key : otherKey;
      const longer = key.length <= otherKey.length ? otherKey : key;
      const isSubstring = shorter.length >= 6 && longer.startsWith(shorter);

      // Thai names with single-char typos (e.g. ฎ vs ฏ, ชา vs ซา) score ~0.75+
      if (similarity >= 0.75 || isSubstring) {
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
