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

export function parseCarryForwardFile(file) {
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
            (cell.includes('รายการ') || cell.includes('ลำดับ'))
          )) {
            headerRowIndex = i;
            break;
          }
        }
        if (headerRowIndex === -1) headerRowIndex = 4;

        const entries = [];
        for (let i = headerRowIndex + 1; i < rawData.length; i++) {
          const row = rawData[i];
          if (!row) continue;
          const name = row[3];
          const amount = row[4];
          if (!name || typeof name !== 'string') continue;
          if (typeof amount !== 'number') continue;

          entries.push({
            customerNameRaw: name.trim(),
            date: row[1] ? String(row[1]) : '',
            voucher: row[2] ? String(row[2]) : '',
            difference: amount,
          });
        }

        const metadata = {
          companyName: rawData[0]?.[0] || '',
          reportTitle: rawData[1]?.[0] || '',
          dateInfo: rawData[2]?.[0] || '',
        };

        resolve({
          sourceFile: file.name,
          savedAt: new Date().toISOString(),
          metadata,
          totalEntries: entries.length,
          totalDifference: Math.round(entries.reduce((s, e) => s + e.difference, 0) * 100) / 100,
          entries,
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
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

        // Detect repeated page-break / header rows mid-file
        function isRepeatedHeaderRow(row) {
          if (!row) return false;
          const cell0 = typeof row[0] === 'string' ? row[0] : '';
          const cell3 = typeof row[3] === 'string' ? row[3] : '';
          // Column header row: "วันที่","สมุด","ใบสำคัญ","คำอธิบาย"
          if (cell0 === 'วันที่' && cell3 === 'คำอธิบาย') return true;
          // Page number: "บริษัท ...  หน้า : N"
          if (cell0.includes('หน้า :') || cell0.includes('หน้า:')) return true;
          // Report title
          if (cell0 === 'รายงานแยกประเภททั่วไป') return true;
          // Date range row: "วันที่จาก ..."
          if (cell0.includes('วันที่จาก')) return true;
          // Account number row: "เลขที่บัญชี ..."
          if (cell0.includes('เลขที่บัญชี')) return true;
          // Continuation marker: "(ต่อ)" in description
          if (cell3 === '(ต่อ)') return true;
          // Account code row (e.g. "2205-08-00" with no real data)
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
