
const REF_CODE_PATTERN = /[ก-ฮa-zA-Z]{1,4}-?\d{5,}/gi;
const BTR_CODE_PATTERN = /(?:B[O0]?\d[A-Z0-9]{1,2}|\dTR)-?\d{6,}/gi;
const DOC_REF_PATTERN = /\d{3}[A-Z]{2}\d{7,}/gi;

function extract(description) {
  let text = description.trim();
  text = text.replace(REF_CODE_PATTERN, '').trim();
  text = text.replace(BTR_CODE_PATTERN, '').trim();
  
  if (text.includes('/')) {
    const parts = text.split('/');
    const namePart = parts.find(p => {
      const t = p.trim();
      if (!t) return false;
      BTR_CODE_PATTERN.lastIndex = 0;
      if (BTR_CODE_PATTERN.test(t)) return false;
      if (/^[\d\-]+$/.test(t)) return false;
      return true;
    });
    if (namePart) return namePart.trim();
  }
  return text.trim();
}

const samples = [
  "B01TR-2504300002/น้ำอ้อย ปังเกตุ",
  "B01TR-250523007/สุริยา สุวงศ์กา",
  "B01 / น้ำอ้อย ปังเกตุ",
  "B01TR/น้ำอ้อย"
];

samples.forEach(s => {
  console.log(`Input: "${s}" -> Extracted: "${extract(s)}"`);
});
