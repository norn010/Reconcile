const XLSX = require('xlsx');
const stringSimilarity = require('string-similarity');

// Updated SKIP_PATTERNS matching normalizeName.js
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
    /^เงินค่าอุปกรณ์/,
    /^เงินค่า\S*รถยนต์/,
    /^เงินค่า\S*-รับ/,
    /^ค่าประกันภัย/,
    /^ขายโปรแกรม/,
];

function shouldSkipDescription(desc) { return SKIP_PATTERNS.some(p => p.test(desc)); }

function isRepeatedHeaderRow(row) {
    if (!row) return false;
    const cell0 = typeof row[0] === 'string' ? row[0] : '';
    const cell3 = typeof row[3] === 'string' ? row[3] : '';
    if (cell0 === 'วันที่' && cell3 === 'คำอธิบาย') return true;
    if (cell0.includes('หน้า :') || cell0.includes('หน้า:')) return true;
    if (cell0 === 'รายงานแยกประเภททั่วไป') return true;
    if (cell0.includes('วันที่จาก')) return true;
    if (cell0.includes('เลขที่บัญชี')) return true;
    if (cell3 === '(ต่อ)') return true;
    if (/^\s*\d{4}-\d{2}-\d{2}\s*$/.test(cell0) && !row[5] && !row[6]) return true;
    return false;
}

const wb = XLSX.readFile('../Excel/อุปกรณ์ตกแต่งF67/อุปกรณ์ตกแต่ง67.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

let totalTxns = 0, skippedHeader = 0, skippedPattern = 0, kept = 0;

for (let i = 5; i < data.length; i++) {
    const r = data[i];
    if (!r || r.length < 4) continue;
    if (isRepeatedHeaderRow(r)) { skippedHeader++; continue; }
    const desc = r[3];
    if (!desc || typeof desc !== 'string') continue;
    if (desc.includes('ยกมา') || desc.includes('รวม') || desc.includes('ยอดยกไป')) continue;
    if (typeof r[0] !== 'number' && typeof r[1] !== 'string') continue;
    if (r[5] === undefined && r[6] === undefined) continue;

    totalTxns++;
    if (shouldSkipDescription(desc)) {
        skippedPattern++;
        // console.log('  SKIP:', desc.substring(0, 60));
    } else {
        kept++;
    }
}

console.log('=== Results after fix ===');
console.log('Rows skipped (headers):', skippedHeader);
console.log('Total data transactions:', totalTxns);
console.log('Skipped by pattern:', skippedPattern);
console.log('Kept for reconcile:', kept);
console.log('\nBefore fix: 190 parsed, 0 matched out of 158 customers');
console.log('After fix:', kept, 'transactions for reconcile (generic batch entries removed)');
