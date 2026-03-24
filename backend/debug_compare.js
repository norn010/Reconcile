const XLSX = require('xlsx');
const stringSimilarity = require('string-similarity');

// ---- Name extraction logic (from normalizeName.js) ----
const COMPANY_SUFFIXES = [
    'co., ltd.', 'co.,ltd.', 'co.ltd.', 'co. ltd',
    'company limited', 'limited', 'ltd.',
    'จำกัด', '(มหาชน)', 'มหาชน',
    'สำนักงานใหญ่', 'สาขา',
    'inc.', 'inc', 'corp.', 'corp', 'llc', 'plc',
];
const COMPANY_PREFIXES = ['บริษัท', 'บจก.', 'บจก', 'บมจ.', 'บมจ', 'หจก.', 'หจก', 'ห้างหุ้นส่วน'];
const REF_CODE_PATTERN = /(?:ITR|ITB|ITC|IHF|IHR|IRR|MTR)-?\d{5,}/gi;
const BTR_CODE_PATTERN = /B[O0]?\d[A-Z0-9]{1,2}-?\d{6,}/gi;
const DOC_REF_PATTERN = /\d{3}RE\d{7,}/gi;
const BRACKET_CODE_PATTERN = /\[.*?\]/g;
const TRAILING_DATE_PATTERN = /\s+\d{1,2}\/\d{1,2}\/\d{2,4}\s*$/;
const ACTION_KEYWORDS = [
    'บันทึกรับชำระหนี้', 'บันทึกรับชำระ', 'รับชำระหนี้', 'รับชำระค่า', 'รับชำระ',
    'รับเงินจาก', 'เงินจองรถยนต์', 'เงินจอง', 'โอนเงินจาก', 'โอนเงิน',
    'ชำระเงิน', 'วางมัดจำ', 'มัดจำ', 'ค่างวด', 'เงินดาวน์', 'ดาวน์',
    'ถอนจอง', 'กลับจอง', 'รายวันรับฝ่ายขาย',
];
const TITLE_PREFIXES = [
    'ว่าที่ ร.ต.หญิง', 'ว่าที่ ร.ต.', 'ว่าที่ รต.', 'ว่าที่ร.ต.',
    'ว่าที่ร.', 'ว่าที่ ร.',
    'พ.ต.อ.', 'พ.ต.ท.', 'พ.ต.ต.',
    'ร.ต.อ.', 'ร.ต.ท.', 'ร.ต.ต.', 'ร.ท.', 'ร.ต.',
    'จ.ส.อ.', 'จ.ส.ท.', 'จ.ส.ต.',
    'ส.อ.', 'ส.ท.', 'ส.ต.',
    'นางสาว', 'น.ส.',
    'คุณ', 'นาย', 'นาง', 'ดร.',
    'MR.', 'MR-', 'MRS.', 'MRS-', 'MS.', 'MS-', 'MISS',
];
const SKIP_PATTERNS = [/^รายวันรับฝ่ายขาย/, /^เงินจองรถยนต์$/, /ยกมา/, /ยอดยกไป/, /^รวม/];

function shouldSkipDescription(description) {
    return SKIP_PATTERNS.some(p => p.test(description));
}

function extractCustomerName(description) {
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
    if (text.includes('/')) {
        const parts = text.split('/');
        const namePart = parts.find(p => {
            const t = p.trim();
            if (!t) return false;
            if (/^\s*ถอนจอง\s*$/.test(t)) return false;
            BTR_CODE_PATTERN.lastIndex = 0;
            if (BTR_CODE_PATTERN.test(t)) { BTR_CODE_PATTERN.lastIndex = 0; return false; }
            if (/^\d{3}RE\d{7,}$/.test(t)) return false;
            return true;
        });
        if (namePart) text = namePart;
    }
    text = text.replace(/[/\\|;]/g, ' ').trim();
    for (const prefix of TITLE_PREFIXES) {
        const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        text = text.replace(new RegExp('(?:^|\\s)' + escaped + '\\s*', 'gi'), ' ');
    }
    text = text.replace(/\s+/g, ' ').trim();
    text = text.replace(/^[\s\-–]+|[\s\-–]+$/g, '').trim();
    if (!text) return description.trim();
    return text.trim();
}

function normalizeName(name) {
    if (!name) return '';
    let normalized = name.trim().toLowerCase();
    normalized = normalized.replace(/b[o0]?\d[a-z0-9]{1,2}-?\d{6,}/gi, '');
    normalized = normalized.replace(/(?:itr|itb|itc|ihf|ihr|irr|mtr)-?\d{5,}/gi, '');
    normalized = normalized.replace(/\d{3}re\d{7,}/gi, '');
    for (const suffix of COMPANY_SUFFIXES) {
        const escaped = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        normalized = normalized.replace(new RegExp(escaped, 'gi'), '');
    }
    for (const prefix of TITLE_PREFIXES) {
        const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        normalized = normalized.replace(new RegExp(escaped, 'gi'), '');
    }
    for (const prefix of COMPANY_PREFIXES) {
        const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        normalized = normalized.replace(new RegExp(escaped, 'gi'), '');
    }
    for (const keyword of ACTION_KEYWORDS) {
        const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        normalized = normalized.replace(new RegExp(escaped, 'gi'), '');
    }
    normalized = normalized.replace(/\s+/g, '').replace(/[.\-_,;:'"()[\]{}\\/]/g, '').trim();
    return normalized;
}

// ---- Parse ff67.xlsx ----
const wb = XLSX.readFile('../Excel/ff/ff67.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });

let headerRowIndex = -1;
for (let i = 0; i < Math.min(10, rawData.length); i++) {
    const row = rawData[i];
    if (row && row.some(cell => typeof cell === 'string' && (cell.includes('คำอธิบาย') || cell.toLowerCase().includes('description')))) {
        headerRowIndex = i;
        break;
    }
}
if (headerRowIndex === -1) headerRowIndex = 4;

const transactions = [];
let rowIndex = 0;
for (let i = headerRowIndex + 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || row.length < 4) continue;
    const dateVal = row[0];
    const bookType = row[1];
    const voucher = row[2];
    const description = row[3];
    const debit = row[5];
    const credit = row[6];
    if (!description || typeof description !== 'string') continue;
    if (description.includes('ยกมา') || description.includes('รวม') || description.includes('ยอดยกไป')) continue;
    if (typeof dateVal !== 'number' && typeof bookType !== 'string') continue;
    if (debit === undefined && credit === undefined) continue;
    if (debit === null && credit === null) continue;
    transactions.push({
        id: rowIndex++,
        date: dateVal,
        bookType: bookType || '',
        voucher: voucher || '',
        description: description.trim(),
        debit: typeof debit === 'number' ? debit : 0,
        credit: typeof credit === 'number' ? credit : 0,
        rawRow: i + 1,
    });
}

console.log('Total transactions parsed:', transactions.length);

// ---- Reconcile ----
function groupByCustomer(txns) {
    const normalizedMap = new Map();
    for (const tx of txns) {
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

    // Fuzzy merge
    const keys = Array.from(normalizedMap.keys());
    const merged = new Map();
    const visited = new Set();
    for (const key of keys) {
        if (visited.has(key)) continue;
        const group = normalizedMap.get(key);
        const mergedGroup = { raw: group.raw, normalized: key, aliases: [key], transactions: [...group.transactions] };
        for (const otherKey of keys) {
            if (otherKey === key || visited.has(otherKey)) continue;
            const similarity = stringSimilarity.compareTwoStrings(key, otherKey);
            const shorter = key.length <= otherKey.length ? key : otherKey;
            const longer = key.length <= otherKey.length ? otherKey : key;
            const isSubstring = shorter.length >= 6 && longer.startsWith(shorter);
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

const customerGroups = groupByCustomer(transactions);
const results = customerGroups.map(group => {
    const totalDebit = group.transactions.reduce((sum, tx) => sum + (tx.debit || 0), 0);
    const totalCredit = group.transactions.reduce((sum, tx) => sum + (tx.credit || 0), 0);
    const difference = Math.round((totalDebit - totalCredit) * 100) / 100;
    const absDiff = Math.abs(difference);
    let status;
    if (absDiff < 0.01) status = 'matched';
    else if (difference > 0) status = 'missing_credit';
    else status = 'missing_debit';
    return {
        customerNameRaw: group.raw,
        customerNameNormalized: group.normalized,
        aliases: group.aliases,
        totalDebit: Math.round(totalDebit * 100) / 100,
        totalCredit: Math.round(totalCredit * 100) / 100,
        difference,
        status,
        transactionCount: group.transactions.length,
    };
});

const unmatched = results.filter(r => r.status !== 'matched');
console.log('\n=== UNMATCHED from reconcile ===');
console.log('Total unmatched:', unmatched.length);

// ---- Load expected ----
const wb2 = XLSX.readFile('../Excel/ff/สรุปยกff67.xlsx');
const ws2 = wb2.Sheets[wb2.SheetNames[0]];
const expectedData = XLSX.utils.sheet_to_json(ws2, { header: 1 });

const expectedNames = [];
for (let i = 5; i < expectedData.length; i++) {
    const row = expectedData[i];
    if (!row || !row[3] || row[3] === 'Grand Total') continue;
    expectedNames.push({ name: row[3], amount: row[4] });
}
console.log('\n=== EXPECTED carry-forward ===');
console.log('Total expected:', expectedNames.length);

// ---- Compare ----
// For each expected name, find if it appears in unmatched
console.log('\n=== EXPECTED items NOT found in unmatched ===');
for (const exp of expectedNames) {
    const expNorm = normalizeName(exp.name);
    const found = unmatched.find(u => {
        if (u.customerNameNormalized === expNorm) return true;
        if (u.aliases && u.aliases.includes(expNorm)) return true;
        const sim = stringSimilarity.compareTwoStrings(u.customerNameNormalized, expNorm);
        return sim >= 0.75;
    });
    if (!found) {
        console.log(`  MISSING: "${exp.name}" (norm: "${expNorm}") amount: ${exp.amount}`);
    } else {
        // Check if the amounts match
        if (Math.abs(found.difference - exp.amount) > 1) {
            console.log(`  AMOUNT MISMATCH: "${exp.name}" expected=${exp.amount} got=${found.difference} (${found.customerNameRaw})`);
        }
    }
}

console.log('\n=== UNMATCHED items NOT in expected (extra items) ===');
let extraCount = 0;
for (const u of unmatched) {
    const found = expectedNames.find(exp => {
        const expNorm = normalizeName(exp.name);
        if (u.customerNameNormalized === expNorm) return true;
        if (u.aliases && u.aliases.includes(expNorm)) return true;
        const sim = stringSimilarity.compareTwoStrings(u.customerNameNormalized, expNorm);
        return sim >= 0.75;
    });
    if (!found) {
        extraCount++;
        if (extraCount <= 30) {
            console.log(`  EXTRA: "${u.customerNameRaw}" (norm: "${u.customerNameNormalized}") diff=${u.difference} status=${u.status} txns=${u.transactionCount}`);
        }
    }
}
console.log(`Total extra unmatched: ${extraCount}`);

// Show matched count
const matched = results.filter(r => r.status === 'matched');
console.log('\n=== SUMMARY ===');
console.log('Total customers:', results.length);
console.log('Matched:', matched.length);
console.log('Unmatched:', unmatched.length);
console.log('Expected unmatched:', expectedNames.length);
