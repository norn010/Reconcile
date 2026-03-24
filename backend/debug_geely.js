const XLSX = require('xlsx');

const file = '../Excel/เงินจอง-GEELY 67/เงินจอง-GEELY 68.xlsx';

const prefixes = new Set();
const codes = [];
try {
    const wb = XLSX.readFile(file);
    const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
    for (let i = 5; i < data.length; i++) {
        const desc = data[i]?.[3];
        if (typeof desc === 'string') {
            const match = desc.match(/[A-Za-z0-9]{3,}-\d{5,}/g);
            if (match) {
                match.forEach(m => {
                    prefixes.add(m.split('-')[0]);
                    if (codes.length < 10) codes.push(m);
                });
            }
        }
    }
} catch (e) {
    console.log(e.message);
}
console.log('Detected prefixes:', [...prefixes].sort());
console.log('Sample codes:', codes);
