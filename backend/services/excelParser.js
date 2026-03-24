const XLSX = require('xlsx');
const path = require('path');

function excelDateToJSDate(serial) {
  if (!serial || typeof serial !== 'number') return null;
  if (serial > 200000) {
    const utcDays = Math.floor(serial - 25569);
    const date = new Date(utcDays * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  return null;
}

function parseExcelFile(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(10, rawData.length); i++) {
    const row = rawData[i];
    if (row && row.some(cell => typeof cell === 'string' &&
      (cell.includes('คำอธิบาย') || cell.toLowerCase().includes('description')))) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    headerRowIndex = 4;
  }

  const transactions = [];
  let rowIndex = 0;

  // Detect repeated page-break / header rows mid-file
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

  for (let i = headerRowIndex + 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || row.length < 4) continue;

    // Skip repeated page-break headers
    if (isRepeatedHeaderRow(row)) continue;

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

    const parsedDate = excelDateToJSDate(dateVal);

    transactions.push({
      id: rowIndex++,
      date: parsedDate || String(dateVal || ''),
      bookType: bookType || '',
      voucher: voucher || '',
      description: description.trim(),
      debit: typeof debit === 'number' ? debit : 0,
      credit: typeof credit === 'number' ? credit : 0,
      rawRow: i + 1,
    });
  }

  return {
    sheetName,
    totalRows: rawData.length,
    headerRow: headerRowIndex,
    transactions,
    metadata: {
      companyName: rawData[0]?.[0] || '',
      reportTitle: rawData[1]?.[0] || '',
      dateRange: rawData[2] ? `${rawData[2][1] || ''} ${rawData[2][3] || ''}`.trim() : '',
    },
  };
}

module.exports = { parseExcelFile, excelDateToJSDate };
