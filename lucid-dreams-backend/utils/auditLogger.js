const AuditLog = require('../models/AuditLog');

/**
 * Log an audit trail entry for security, compliance, and clinical auditing.
 */
async function recordAuditLog(reqOrData, maybeData = {}) {
  try {
    const isReqFirst = reqOrData && (reqOrData.headers || reqOrData.userId || reqOrData.user);
    const req = isReqFirst ? reqOrData : (reqOrData?.req || {});
    const data = isReqFirst ? maybeData : (reqOrData || {});

    const actorId = data.actorId || req.userId || req.user?._id;
    const userId = data.userId || data.targetUserId || actorId;

    if (!actorId || !userId) {
      return;
    }

    const ipAddress = req.headers ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress) : null;
    const userAgent = req.headers ? req.headers['user-agent'] : null;

    await AuditLog.create({
      userId,
      actorId,
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId ? String(data.resourceId) : null,
      dataBefore: data.dataBefore || null,
      dataAfter: data.dataAfter || null,
      details: data.details || null,
      ipAddress: typeof ipAddress === 'string' ? ipAddress.split(',')[0].trim() : null,
      userAgent: typeof userAgent === 'string' ? userAgent : null
    });
  } catch (err) {
    console.error('[AuditLogger] Failed to record audit log:', err.message);
  }
}

module.exports = {
  recordAuditLog
};
