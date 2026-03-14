const express = require('express');
const { 
    createReceipt, validateReceipt, getReceipts,
    createDelivery, validateDelivery, getDeliveries,
    createTransfer, validateTransfer, getTransfers,
    createAdjustment, validateAdjustment, getAdjustments,
    getMovements 
} = require('../controllers/operationController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

// general movements for ledger
router.get('/movements', getMovements);

// Receipts
router.get('/receipts', getReceipts);
router.post('/receipts', createReceipt);
router.post('/receipts/:id/validate', validateReceipt);

// Deliveries
router.get('/deliveries', getDeliveries);
router.post('/deliveries', createDelivery);
router.post('/deliveries/:id/validate', validateDelivery);

// Transfers
router.get('/transfers', getTransfers);
router.post('/transfers', createTransfer);
router.post('/transfers/:id/validate', validateTransfer);

// Adjustments
router.get('/adjustments', getAdjustments);
router.post('/adjustments', createAdjustment);
router.post('/adjustments/:id/validate', validateAdjustment);

module.exports = router;
