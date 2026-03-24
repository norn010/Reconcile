const p1 = /(?:B[O0]?\d[A-Z0-9]{1,2}|\dTR)-?\d{6,}/gi;
const tests = ['011RE25030016', '3TR-25120015', 'B02FT-2401030004', '5TR-24080001', '6TR-24080005'];
tests.forEach(t => {
    const m = t.match(p1);
    console.log(m ? 'MATCH' : 'MISS', t, m);
});
