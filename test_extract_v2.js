
const BTR_CODE_PATTERN = /(?:B[O0]?\d[A-Z0-9]{1,2}|\dTR)-?\d{6,}/gi;
const REF_CODE_PATTERN = /[ก-ฮa-zA-Z]{1,4}-?\d{5,}/gi;
const ACCOUNT_CODE_PATTERN = /\b[A-Za-z][O0]?\d{1,2}(?:TR|FT|PJ|OJ)?\b/gi;

function extract(description) {
  let text = description.trim();
  
  // Try to match specific B-series codes first, even without long digits if before a slash
  text = text.replace(BTR_CODE_PATTERN, '').trim();
  text = text.replace(REF_CODE_PATTERN, '').trim();
  
  if (text.includes('/')) {
    const parts = text.split('/');
    const namePart = parts.find(p => {
      const t = p.trim();
      if (!t) return false;
      if (t.length < 2) return false;
      
      // Filter out things that look like account codes B01, B01TR, etc.
      ACCOUNT_CODE_PATTERN.lastIndex = 0;
      if (ACCOUNT_CODE_PATTERN.test(t)) return false;
      
      BTR_CODE_PATTERN.lastIndex = 0;
      if (BTR_CODE_PATTERN.test(t)) return false;
      
      if (/^[\d\-]+$/.test(t)) return false;
      return true;
    });
    if (namePart) return namePart.trim();
  }
  
  // Clean up fragments
  text = text.replace(ACCOUNT_CODE_PATTERN, '').trim();
  
  return text.trim();
}

const samples = [
  "B01TR-2504300002/น้ำอ้อย ปังเกตุ",
  "B01TR-250523007/สุริยา สุวงศ์กา",
  "B01 / น้ำอ้อย ปังเกตุ",
  "B01TR/น้ำอ้อย",
  "B101/สุวิมล"
];

samples.forEach(s => {
  console.log(`Input: "${s}" -> Extracted: "${extract(s)}"`);
});
