import * as XLSX from 'xlsx';

function excelDateToString(serial) {
  if (!serial || typeof serial !== 'number') return '';
  if (serial > 200000) {
    const utcDays = Math.floor(serial - 25569);
    const date = new Date(utcDays * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }
  return String(serial);
}

export function parseExcelFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(10, rawData.length); i++) {
          const row = rawData[i];
          if (row && row.some(cell =>
            typeof cell === 'string' &&
            (cell.includes('คำอธิบาย') || cell.toLowerCase().includes('description'))
          )) {
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
            date: excelDateToString(dateVal),
            bookType: bookType || '',
            voucher: voucher || '',
            description: description.trim(),
            debit: typeof debit === 'number' ? debit : 0,
            credit: typeof credit === 'number' ? credit : 0,
            rawRow: i + 1,
          });
        }

        const metadata = {
          companyName: rawData[0]?.[0] || '',
          reportTitle: rawData[1]?.[0] || '',
          dateRange: rawData[2] ? `${rawData[2][1] || ''} ${rawData[2][3] || ''}`.trim() : '',
        };

        resolve({
          sheetName,
          totalRows: rawData.length,
          transactions,
          metadata,
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}
