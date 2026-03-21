import * as XLSX from 'xlsx';

export function exportReconcileToExcel(reconcileData, metadata) {
  const { summary, results } = reconcileData;
  const companyName = metadata?.companyName?.trim() || '';
  const dateRange = metadata?.dateRange?.trim() || '';

  // === Sheet 1: สรุป (Carry-forward balance sheet) ===
  const carryForwardData = [
    [companyName || 'รายละเอียดประกอบงบ'],
    ['รายงานสรุปยอดคงค้าง (Reconciliation)'],
    [dateRange ? `ณ ${dateRange}` : ''],
    ['เงินจองรถยนต์', null, null, null, null, ''],
    ['ลำดับ', 'วันที่', 'เลขที่เอกสาร', 'รายการ', 'จำนวนเงิน', 'หมายเหตุ'],
  ];

  let seq = 1;
  const unmatchedResults = results
    .filter(r => r.status !== 'matched')
    .sort((a, b) => {
      const dateA = a.transactions[0]?.date || '';
      const dateB = b.transactions[0]?.date || '';
      return dateA.localeCompare(dateB);
    });

  for (const r of unmatchedResults) {
    const firstTx = r.transactions[0];
    carryForwardData.push([
      seq++,
      firstTx?.date || '',
      firstTx?.voucher || '',
      r.customerNameRaw,
      r.difference,
      '',
    ]);
  }

  carryForwardData.push([]);
  carryForwardData.push([null, null, null, null, summary.totalDifference]);

  // === Sheet 2: Matched ===
  const matchedData = [
    ['Customer Name', 'Normalized', 'Total Debit', 'Total Credit', 'Difference', 'Transactions'],
    ...results
      .filter(r => r.status === 'matched')
      .map(r => [r.customerNameRaw, r.customerNameNormalized, r.totalDebit, r.totalCredit, r.difference, r.transactionCount]),
  ];

  // === Sheet 3: Unmatched ===
  const unmatchedData = [
    ['Customer Name', 'Normalized', 'Total Debit', 'Total Credit', 'Difference', 'Status', 'Transactions'],
    ...results
      .filter(r => r.status !== 'matched')
      .map(r => [
        r.customerNameRaw, r.customerNameNormalized,
        r.totalDebit, r.totalCredit, r.difference,
        r.status === 'missing_credit' ? 'Missing Credit' : 'Missing Debit',
        r.transactionCount,
      ]),
  ];

  // === Sheet 4: All Transactions detail ===
  const detailData = [
    ['Customer Name', 'Date', 'Book Type', 'Voucher', 'Description', 'Debit', 'Credit', 'Type', 'Status'],
  ];
  for (const r of results) {
    for (const tx of r.transactions) {
      detailData.push([
        r.customerNameRaw, tx.date, tx.bookType, tx.voucher,
        tx.description, tx.debit || '', tx.credit || '', tx.type, r.status,
      ]);
    }
  }

  const workbook = XLSX.utils.book_new();

  const carrySheet = XLSX.utils.aoa_to_sheet(carryForwardData);
  carrySheet['!cols'] = [
    { wch: 6 }, { wch: 12 }, { wch: 20 }, { wch: 35 }, { wch: 15 }, { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(workbook, carrySheet, 'สรุป');

  const matchedSheet = XLSX.utils.aoa_to_sheet(matchedData);
  XLSX.utils.book_append_sheet(workbook, matchedSheet, 'Matched');

  const unmatchedSheet = XLSX.utils.aoa_to_sheet(unmatchedData);
  XLSX.utils.book_append_sheet(workbook, unmatchedSheet, 'Unmatched');

  const detailSheet = XLSX.utils.aoa_to_sheet(detailData);
  XLSX.utils.book_append_sheet(workbook, detailSheet, 'All Transactions');

  XLSX.writeFile(workbook, 'reconciliation_report.xlsx');
}
