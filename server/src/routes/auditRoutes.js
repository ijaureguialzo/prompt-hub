const express = require('express');
const router = express.Router();
const { getAudit } = require('../controllers/auditController');
const { authenticate, authorize } = require('../middleware/auth');

// The audit trail is privileged: it exposes who changed what (including
// target emails), so only admins may read it.
router.use(authenticate);
router.get('/', authorize('admin'), getAudit);

module.exports = router;
