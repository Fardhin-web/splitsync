const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.post('/', expenseController.createExpense);
router.put('/:expenseId', expenseController.updateExpense);
router.delete('/:expenseId', expenseController.deleteExpense);
router.post('/settle', expenseController.recordSettlement);

module.exports = router;

