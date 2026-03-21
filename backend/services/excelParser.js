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
