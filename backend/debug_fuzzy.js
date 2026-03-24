const XLSX = require('xlsx');
const stringSimilarity = require('string-similarity');

// Reuse normalizeName logic
const COMPANY_SUFFIXES = ['co., ltd.', 'co.,ltd.', 'co.ltd.', 'co. ltd', 'company limited', 'limited', 'ltd.', 'จำกัด', '(มหาชน)', 'มหาชน', 'สำนักงานใหญ่', 'สาขา', 'inc.', 'inc', 'corp.', 'corp', 'llc', 'plc'];
const COMPANY_PREFIXES = ['บริษัท', 'บจก.', 'บจก', 'บมจ.', 'บมจ', 'หจก.', 'หจก', 'ห้างหุ้นส่วน'];
const ACTION_KEYWORDS = ['บันทึกรับชำระหนี้', 'บันทึกรับชำระ', 'รับชำระหนี้', 'รับชำระค่า', 'รับชำระ', 'รับเงินจาก', 'เงินจองรถยนต์', 'เงินจอง', 'โอนเงินจาก', 'โอนเงิน', 'ชำระเงิน', 'วางมัดจำ', 'มัดจำ', 'ค่างวด', 'เงินดาวน์', 'ดาวน์', 'ถอนจอง', 'กลับจอง', 'รายวันรับฝ่ายขาย'];
const TITLE_PREFIXES = ['ว่าที่ ร.ต.หญิง', 'ว่าที่ ร.ต.', 'ว่าที่ รต.', 'ว่าที่ร.ต.', 'ว่าที่ร.', 'ว่าที่ ร.', 'พ.ต.อ.', 'พ.ต.ท.', 'พ.ต.ต.', 'ร.ต.อ.', 'ร.ต.ท.', 'ร.ต.ต.', 'ร.ท.', 'ร.ต.', 'จ.ส.อ.', 'จ.ส.ท.', 'จ.ส.ต.', 'ส.อ.', 'ส.ท.', 'ส.ต.', 'นางสาว', 'น.ส.', 'คุณ', 'นาย', 'นาง', 'ดร.', 'MR.', 'MR-', 'MRS.', 'MRS-', 'MS.', 'MS-', 'MISS'];
const REF_CODE_PATTERN = /(?:ITR|ITB|ITC|IHF|IHR|IRR|MTR)-?\d{5,}/gi;
const BTR_CODE_PATTERN = /B[O0]?\d[A-Z0-9]{1,2}-?\d{6,}/gi;
const DOC_REF_PATTERN = /\d{3}RE\d{7,}/gi;
const BRACKET_CODE_PATTERN = /\[.*?\]/g;
const TRAILING_DATE_PATTERN = /\s+\d{1,2}\/\d{1,2}\/\d{2,4}\s*$/;

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
    let n = name.trim().toLowerCase();
    n = n.replace(/b[o0]?\d[a-z0-9]{1,2}-?\d{6,}/gi, '');
    n = n.replace(/(?:itr|itb|itc|ihf|ihr|irr|mtr)-?\d{5,}/gi, '');
    n = n.replace(/\d{3}re\d{7,}/gi, '');
    for (const s of COMPANY_SUFFIXES) { const e = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); n = n.replace(new RegExp(e, 'gi'), ''); }
    for (const p of TITLE_PREFIXES) { const e = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); n = n.replace(new RegExp(e, 'gi'), ''); }
    for (const p of COMPANY_PREFIXES) { const e = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); n = n.replace(new RegExp(e, 'gi'), ''); }
    for (const k of ACTION_KEYWORDS) { const e = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); n = n.replace(new RegExp(e, 'gi'), ''); }
    n = n.replace(/\s+/g, '').replace(/[.\-_,;:'"()\[\]{}\\/]/g, '').trim();
    return n;
}

// Check what กฤษฎ์ fuzzy-merges with
const targetNorm = normalizeName('กฤษฎ์ พัดวิลัย');
console.log('กฤษฎ์ พัดวิลัย normalized:', targetNorm);

const wb = XLSX.readFile('../Excel/ff/ff67.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 });

// Build unique normalized names
const nameMap = new Map();
for (let i = 5; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || !row[3] || typeof row[3] !== 'string') continue;
    const desc = row[3].trim();
    if (desc.includes('ยกมา') || desc.includes('รวม') || desc.includes('ยอดยกไป')) continue;

    const raw = extractCustomerName(desc);
    const norm = normalizeName(raw);
    if (!norm) continue;

    if (!nameMap.has(norm)) {
        nameMap.set(norm, { raw, descriptions: [desc], debit: 0, credit: 0 });
    }
    const entry = nameMap.get(norm);
    if (typeof row[5] === 'number') entry.debit += row[5];
    if (typeof row[6] === 'number') entry.credit += row[6];
}

// Find fuzzy matches for กฤษฎ์
console.log('\nFuzzy matches for กฤษฎ์พัดวิลัย:');
for (const [norm, data] of nameMap) {
    const sim = stringSimilarity.compareTwoStrings(targetNorm, norm);
    const shorter = targetNorm.length <= norm.length ? targetNorm : norm;
    const longer = targetNorm.length <= norm.length ? norm : targetNorm;
    const isSubstring = shorter.length >= 6 && longer.startsWith(shorter);

    if (sim >= 0.5 || isSubstring) {
        console.log(`  ${norm} (raw: ${data.raw}) sim=${(sim * 100).toFixed(0)}% sub=${isSubstring} D=${data.debit} C=${data.credit}`);
    }
}

// Also check สมิง
const targetNorm2 = normalizeName('สมิง สำราญพันธ์');
console.log('\nFuzzy matches for สมิงสำราญพันธ์:');
for (const [norm, data] of nameMap) {
    const sim = stringSimilarity.compareTwoStrings(targetNorm2, norm);
    const shorter = targetNorm2.length <= norm.length ? targetNorm2 : norm;
    const longer = targetNorm2.length <= norm.length ? norm : targetNorm2;
    const isSubstring = shorter.length >= 6 && longer.startsWith(shorter);

    if (sim >= 0.5 || isSubstring) {
        console.log(`  ${norm} (raw: ${data.raw}) sim=${(sim * 100).toFixed(0)}% sub=${isSubstring} D=${data.debit} C=${data.credit}`);
    }
}

// Show overall stats
console.log('\n=== RECONCILIATION ISSUE ANALYSIS ===');
console.log('Total unique normalized names:', nameMap.size);

// Count: how many entries are credit-only vs debit-only vs both
let creditOnlyCount = 0, debitOnlyCount = 0, bothCount = 0;
for (const [norm, data] of nameMap) {
    if (data.debit > 0 && data.credit > 0) bothCount++;
    else if (data.debit > 0) debitOnlyCount++;
    else creditOnlyCount++;
}
console.log('Credit-only:', creditOnlyCount, 'Debit-only:', debitOnlyCount, 'Both:', bothCount);
