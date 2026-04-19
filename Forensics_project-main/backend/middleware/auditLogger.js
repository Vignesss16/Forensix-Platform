const AuditLog = require('../models/AuditLog');

const auditLogger = (action) => async (req, res, next) => {
  try {
    await AuditLog.create({
      userId:  req.user?.userId || null,
      userRef: req.user?.userId || 'anonymous',
      action,
      details: { body: req.body, params: req.params },
      ip:      req.ip,
    });
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
  next();
};

module.exports = auditLogger;