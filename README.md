# Financial Reconciliation System

ระบบ Reconcile ยอดเดบิต/เครดิต อัตโนมัติ จากไฟล์ Excel โดยใช้การจับคู่ชื่อลูกค้าจากคอลัมน์ "คำอธิบาย" ที่มีรูปแบบไม่แน่นอน รองรับภาษาไทยและอังกฤษ พร้อม Fuzzy Matching

## Features

- **Upload & Parse** — ลาก/วางไฟล์ Excel เข้าระบบ แสดง Preview ข้อมูลก่อน Reconcile
- **Smart Name Extraction** — ดึงชื่อลูกค้าจาก description หลายรูปแบบ เช่น `รับชำระหนี้จาก คุณสมชาย`, `บันทึกการขายเชื่อรถยนต์ จุฬา`, `นายธนา จอดนอก B01TR-xxx`, `กTR-25120306 พิมพ์ชนก`
- **Fuzzy Matching** — จับคู่ชื่อที่สะกดต่างกันเล็กน้อย, ตัดคำนำหน้า/คำต่อท้ายบริษัทอัตโนมัติ
- **Reconcile Engine** — จับคู่ Debit vs Credit ตามชื่อลูกค้า แสดงสถานะ Matched / Missing Credit / Missing Debit
- **Carry Forward** — ยกยอดที่ไม่ Match ไปตรวจสอบกับไฟล์งวดถัดไป
- **Manual Merge** — รวมลูกค้าด้วยมือในกรณีที่ระบบจับคู่ไม่ถูกต้อง
- **Export** — ส่งออกผลลัพธ์เป็นไฟล์ Excel พร้อมสรุปยอดคงค้าง
- **Toggle Strict/Fuzzy** — เลือกโหมดจับคู่แบบตรงทั้งหมด หรือ Fuzzy

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 8, Tailwind CSS 4 |
| State Management | Zustand |
| Data Table | TanStack React Table |
| Icons | Lucide React |
| Excel Parsing | SheetJS (xlsx) |
| Fuzzy Matching | string-similarity, Fuse.js |
| Backend | Node.js, Express 4 |
| File Upload | Multer |

## Project Structure

```
├── backend/
│   ├── server.js                    # Express entry point
│   ├── controllers/
│   │   └── reconcileController.js   # API handlers
│   ├── routes/
│   │   └── reconcileRoutes.js       # Route definitions
│   └── services/
│       ├── excelParser.js           # Excel → transactions
│       ├── nameExtractor.js         # Name extraction & fuzzy grouping
│       ├── reconcileService.js      # Debit/Credit reconciliation
│       └── exportService.js         # Results → Excel export
│
├── frontend/
│   └── src/
│       ├── App.jsx                  # Main layout
│       ├── components/
│       │   ├── FileUpload.jsx       # Drag & drop upload
│       │   ├── DataPreview.jsx      # Raw data preview
│       │   ├── ActionBar.jsx        # Reconcile, Export, Reset buttons
│       │   ├── Dashboard.jsx        # Summary cards
│       │   ├── ReconcileTable.jsx   # Results table with sorting/filter
│       │   ├── TransactionDetail.jsx # Expanded transaction rows
│       │   ├── CarryForward.jsx     # Carry-forward status display
│       │   └── MergeModal.jsx       # Manual customer merge
│       ├── store/
│       │   └── useReconcileStore.js # Zustand global state
│       └── utils/
│           ├── normalizeName.js     # Client-side name extraction
│           ├── reconcileEngine.js   # Client-side reconcile logic
│           ├── parseExcel.js        # Client-side Excel parsing
│           └── excelExport.js       # Client-side Excel export
│
└── package.json                     # Root scripts
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
# Install all dependencies (frontend + backend)
npm run install:all

# Or install separately
cd backend && npm install
cd frontend && npm install
```

### Run Development Servers

```bash
# From root — start both servers
npm run dev:backend    # Backend on http://localhost:3001
npm run dev:frontend   # Frontend on http://localhost:5173

# Or start individually
cd backend && npm run dev
cd frontend && npm run dev
```

Frontend จะ proxy `/api` ไปที่ `http://localhost:3001` อัตโนมัติ

### Build for Production

```bash
cd frontend && npm run build
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/upload` | Upload Excel file (max 50MB) |
| `GET` | `/api/reconcile` | Run reconciliation (`?strict=true` optional) |
| `POST` | `/api/merge` | Merge two customer groups |
| `GET` | `/api/export` | Download reconciliation report (Excel) |
| `GET` | `/api/transactions` | Get loaded transactions |
| `POST` | `/api/carry-forward` | Save carry-forward data |
| `GET` | `/api/carry-forward` | Get carry-forward data |
| `DELETE` | `/api/carry-forward` | Clear carry-forward data |
| `GET` | `/api/health` | Health check |

## How It Works

### 1. Name Extraction

ระบบจะดึงชื่อลูกค้าจากคอลัมน์ "คำอธิบาย" โดย:

- ตัด Action keywords: `รับชำระหนี้`, `รับเงินจาก`, `โอนเงินจาก`, `เงินจองรถยนต์`, `ถอนจอง` ฯลฯ
- ตัดคำนำหน้า: `คุณ`, `นาย`, `นาง`, `น.ส.`, `MR.`, `MRS.`, ยศทหาร (`ร.ต.`, `จ.ส.อ.` ฯลฯ)
- ตัดรหัสอ้างอิง: `ITR-xxxxx`, `B02TR-xxxxxxxxxx`, `[IHF-xxxxx]`
- ตัดชื่อบริษัท: `บริษัท`, `บจก.`, `หจก.`, `จำกัด`, `Co., Ltd.`
- รองรับ `/` delimiter: `ชื่อ/B02TR-xxx/ถอนจอง` → ดึงเฉพาะชื่อ

### 2. Fuzzy Matching

- Normalize ชื่อ (ตัดช่องว่าง, lowercase, ตัดเครื่องหมาย)
- เปรียบเทียบด้วย string similarity (threshold 75%)
- Substring containment: ถ้าชื่อสั้นเป็น prefix ของชื่อยาว → merge

### 3. Reconciliation

สำหรับลูกค้าแต่ละราย:

- **Matched** — Total Debit = Total Credit
- **Missing Credit** — Debit > Credit (ยังขาดฝั่ง Credit)
- **Missing Debit** — Credit > Debit (ยังขาดฝั่ง Debit)

### 4. Carry Forward (ยกยอด)

สามารถบันทึกยอดที่ไม่ Match แล้วนำไปรวมกับไฟล์งวดถัดไปได้ ระบบจะแสดง badge "ยกมา" สำหรับรายการที่ถูกยกยอดมา

## Architecture Notes

- **Dual Mode** — Frontend ทำงานได้ทั้งแบบ standalone (client-side parsing/reconcile) และแบบใช้ Backend API
- **Future Ready** — โครงสร้าง Backend รองรับการเชื่อมต่อ Database (MSSQL / PostgreSQL) ในอนาคต
- **Reusable Engine** — Reconciliation engine แยกเป็น module ใช้ได้ทั้ง frontend และ backend
