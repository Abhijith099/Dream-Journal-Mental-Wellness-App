const CaregiverAssignment = require('../models/CaregiverAssignment');
const { recordAuditLog } = require('./auditLogger');

/**
 * Validates that the authenticated caller has permission to access targetUserId.
 * If targetUserId matches caller, access is granted.
 * If targetUserId differs, checks whether caller is an active caregiver assigned to patient.
 *
 * @param {Object} req Express request
 * @param {string} requestedUserId Target user ID from route params or body
 * @returns {Promise<{ authorized: boolean, targetUserId: string, isCaregiver: boolean }>}
 */
async function verifyAccountAccess(req, requestedUserId, requiredPermission = null) {
  const callerId = (req.userId || req.user?._id || '').toString();
  const targetIdStr = (requestedUserId && requestedUserId !== 'undefined' && requestedUserId !== 'null')
    ? requestedUserId.toString()
    : callerId;

  // If no specific target requested or targets self
  if (!targetIdStr || targetIdStr === 'me' || targetIdStr === callerId) {
    return {
      authorized: true,
      targetUserId: callerId,
      isSelf: true,
      isCaregiver: false
    };
  }

  // Cross-account access attempt: check CaregiverAssignment
  const assignment = await CaregiverAssignment.findOne({
    caregiverId: callerId,
    patientId: targetIdStr,
    isActive: true
  });

  if (assignment) {
    if (requiredPermission && assignment.permissions && assignment.permissions[requiredPermission] === false) {
      return {
        authorized: false,
        targetUserId: targetIdStr,
        isSelf: false,
        isCaregiver: true
      };
    }

    // Log caregiver accessing patient data
    await recordAuditLog(req, {
      targetUserId: targetIdStr,
      action: 'CAREGIVER_ACCESS',
      resourceType: 'patient_record',
      details: { callerRole: 'caregiver', permissions: assignment.permissions }
    });

    return {
      authorized: true,
      targetUserId: targetIdStr,
      isSelf: false,
      isCaregiver: true
    };
  }

  // Unauthorized cross-account access attempt
  await recordAuditLog(req, {
    targetUserId: targetIdStr,
    action: 'UNAUTHORIZED_CROSS_ACCOUNT_ATTEMPT',
    resourceType: 'security_violation',
    details: { attemptedBy: callerId }
  });

  return {
    authorized: false,
    targetUserId: targetIdStr,
    isSelf: false,
    isCaregiver: false
  };
}

module.exports = {
  verifyAccountAccess
};
