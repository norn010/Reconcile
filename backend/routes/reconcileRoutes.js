const express = require('express');
const multer = require('multer');
const path = require('path');
const controller = require('../controllers/reconcileController');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];
  if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls)$/i)) {
    cb(null, true);
  } else {
    cb(new Error('Only Excel files (.xlsx, .xls) are allowed'), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } });

router.post('/upload', upload.single('file'), controller.upload);
router.get('/reconcile', controller.getReconcile);
router.post('/merge', controller.merge);
router.get('/export', controller.exportExcel);
router.get('/transactions', controller.getTransactions);
router.post('/carry-forward', controller.setCarryForward);
router.get('/carry-forward', controller.getCarryForward);
router.delete('/carry-forward', controller.clearCarryForwardData);

module.exports = router;
