const XLSX = require('xlsx');
const file = '../Excel/เงินจองOJ68/เงินจองOJ68.xlsx';
const wb = XLSX.readFile(file);
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
for (let i = 5; i < data.length; i++) {
    const r = data[i];
    if (r && typeof r[3] === 'string' && r[3].includes('/')) {
        const desc = r[3];
        const parts = desc.split('/');
        if (/^\d{5,}$/.test(parts[0].trim())) {
            console.log('Row', i, desc);
        }
    }
}
