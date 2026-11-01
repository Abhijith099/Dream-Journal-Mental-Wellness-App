const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const SanctuaryContact = require('../models/SanctuaryContact');
const SanctuaryRecording = require('../models/SanctuaryRecording');
const SanctuaryPhotograph = require('../models/SanctuaryPhotograph');
const SanctuaryMusic = require('../models/SanctuaryMusic');
const SanctuarySession = require('../models/SanctuarySession');
const Dream = require('../models/Dream');
const { verifyAccountAccess } = require('../utils/accessControl');
const { recordAuditLog } = require('../utils/auditLogger');

// Authenticate all caregiver endpoints
router.use(auth);

// Helper to resolve and verify access to target patient/user
async function resolveCaregiverTarget(req, requiredPermission = 'canViewRecordings') {
  const requestedId = req.params.patientId || req.body.patientId || req.query.patientId || req.userId;
  return await verifyAccountAccess(req, requestedId, requiredPermission);
}

// -------------------------------------------------------------
// 1. GET ALL CONTENT & METRICS (Tab 1A: Manage Content)
// -------------------------------------------------------------
router.get(['/content', '/patients/:patientId/content'], async (req, res) => {
  try {
    const access = await resolveCaregiverTarget(req, 'canViewRecordings');
    if (!access.authorized) {
      return res.status(403).json({ error: 'Access denied: You are not authorized to view this account' });
    }
    const targetUserId = access.targetUserId;

    if (!access.isSelf) {
      await recordAuditLog({
        userId: targetUserId,
        actorId: req.userId,
        action: 'CAREGIVER_VIEW_CONTENT',
        resourceType: 'sanctuary_content',
        details: { targetUserId },
        req
      });
    }

    const [voices, photos, music, contacts] = await Promise.all([
      SanctuaryRecording.find({ userId: targetUserId }).sort({ recordedAt: -1 }),
      SanctuaryPhotograph.find({ userId: targetUserId }).sort({ dateUploaded: -1 }),
      SanctuaryMusic.find({ userId: targetUserId }).sort({ dateLinked: -1 }),
      SanctuaryContact.find({ userId: targetUserId, isEmergencyContact: true }).sort({ isPrimary: -1 })
    ]);

    const primaryEmergency = contacts.find(c => c.isPrimary) || contacts[0] || null;

    const activeVoicesCount = voices.filter(v => v.isActive).length;
    const activePhotosCount = photos.filter(p => p.isActive).length;
    const activeMusicCount = music.filter(m => m.isActive).length;

    // Real Top-Level Summary Metrics
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const [visits7d, checkInSessions, supportCallsPlaced] = await Promise.all([
      SanctuarySession.countDocuments({ userId: targetUserId, startedAt: { $gte: sevenDaysAgo } }),
      SanctuarySession.find({ userId: targetUserId, checkInFeeling: { $ne: null } }),
      SanctuarySession.countDocuments({ userId: targetUserId, 'callInitiated.timestamp': { $ne: null } })
    ]);

    const calmerCount = checkInSessions.filter(s => s.checkInFeeling === 'calmer').length;
    const calmerPercentage = checkInSessions.length > 0 ? Math.round((calmerCount / checkInSessions.length) * 100) : 0;

    const metrics = {
      visits7d,
      calmerPercentage,
      supportCallsPlaced,
      activeVoicesCount,
      activePhotosCount,
      activeMusicCount
    };

    res.json({
      metrics,
      voiceNotes: voices.map(v => ({
        id: v._id,
        title: v.title,
        creatorName: v.creatorName || v.title?.split("'")[0] || 'Caregiver',
        relationship: v.relationship || 'Family Member',
        durationSeconds: v.durationSeconds,
        recordingLabel: v.recordingLabel || `${Math.floor(v.durationSeconds / 60)}m ${v.durationSeconds % 60}s audio`,
        audioUrl: v.audioUrl,
        isActive: v.isActive,
        isFlagged: v.isFlagged,
        flagReason: v.flagReason,
        playbackCount: v.playbackCount,
        averageEffectiveness: v.averageEffectiveness,
        dateUploaded: v.recordedAt
      })),
      photographs: photos.map(p => ({
        id: p._id,
        imageName: p.imageName,
        locationContext: p.locationContext,
        imageUrl: p.imageUrl,
        isActive: p.isActive,
        isFlagged: p.isFlagged,
        flagReason: p.flagReason,
        viewCount: p.viewCount,
        averageEffectiveness: p.averageEffectiveness,
        dateUploaded: p.dateUploaded
      })),
      musicTracks: music.map(m => ({
        id: m._id,
        trackTitle: m.trackTitle,
        artist: m.artist,
        source: m.source,
        spotifyTrackId: m.spotifyTrackId,
        albumArtUrl: m.albumArtUrl,
        isActive: m.isActive,
        playbackCount: m.playbackCount,
        averageEffectiveness: m.averageEffectiveness,
        dateLinked: m.dateLinked
      })),
      emergencySupport: {
        primaryContact: primaryEmergency ? {
          id: primaryEmergency._id,
          name: primaryEmergency.name,
          relationship: primaryEmergency.relationship,
          phoneNumber: primaryEmergency.phoneNumber,
          maskedPhone: primaryEmergency.maskedPhone || primaryEmergency.phoneNumber,
          directCallEnabled: primaryEmergency.directCallEnabled !== false
        } : null,
        additionalContacts: contacts.filter(c => !c.isPrimary).map(c => ({
          id: c._id,
          name: c.name,
          relationship: c.relationship,
          phoneNumber: c.phoneNumber,
          maskedPhone: c.maskedPhone,
          isActive: c.isActive !== false,
          availability: c.availability || 'Available 24/7'
        })),
        crisisHotline: {
          name: "Care Team Crisis Hotline",
          phoneNumber: "+1 (800) 273-8255",
          maskedPhone: "+1 (800) 273-8255"
        }
      }
    });

  } catch (err) {
    console.error('Error fetching caregiver content:', err);
    res.status(500).json({ error: 'Failed to retrieve patient content and logs' });
  }
});

// -------------------------------------------------------------
// 2. TOGGLE CONTENT ACTIVE/INACTIVE
// -------------------------------------------------------------
router.patch(['/:resourceType/:resourceId/active', '/content/:resourceType/:resourceId/active'], async (req, res) => {
  try {
    const access = await resolveCaregiverTarget(req, 'canManageRecordings');
    if (!access.authorized) {
      return res.status(403).json({ error: 'Access denied: You are not authorized to update content for this account' });
    }
    const targetUserId = access.targetUserId;

    const { resourceType, resourceId } = req.params;
    const isActive = req.body.isActive !== undefined ? req.body.isActive : req.body.is_active;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean value' });
    }

    let updatedDoc = null;

    if (resourceType === 'voice' || resourceType === 'voice-recordings') {
      updatedDoc = await SanctuaryRecording.findOneAndUpdate(
        { _id: resourceId, userId: targetUserId },
        { isActive },
        { returnDocument: 'after' }
      );
    } else if (resourceType === 'photo' || resourceType === 'photographs') {
      updatedDoc = await SanctuaryPhotograph.findOneAndUpdate(
        { _id: resourceId, userId: targetUserId },
        { isActive },
        { returnDocument: 'after' }
      );
    } else if (resourceType === 'music' || resourceType === 'music-tracks') {
      updatedDoc = await SanctuaryMusic.findOneAndUpdate(
        { _id: resourceId, userId: targetUserId },
        { isActive },
        { returnDocument: 'after' }
      );
    } else if (resourceType === 'contact' || resourceType === 'emergency-contacts') {
      updatedDoc = await SanctuaryContact.findOneAndUpdate(
        { _id: resourceId, userId: targetUserId },
        { isActive },
        { returnDocument: 'after' }
      );
    }

    if (!updatedDoc) {
      return res.status(404).json({ error: 'Content resource not found' });
    }

    await recordAuditLog({
      userId: targetUserId,
      actorId: req.userId,
      action: 'TOGGLE_CONTENT',
      resourceType,
      resourceId,
      details: { newIsActive: isActive },
      req
    });

    res.json({
      success: true,
      resourceType,
      resourceId,
      isActive: updatedDoc.isActive,
      message: `Content is now ${updatedDoc.isActive ? 'active in' : 'hidden from'} Sanctuary.`
    });

  } catch (err) {
    console.error('Error toggling content:', err);
    res.status(500).json({ error: 'Failed to update content toggle state' });
  }
});

// -------------------------------------------------------------
// 3. ADD NEW CONTENT (VOICE, PHOTO, MUSIC)
// -------------------------------------------------------------

// Add voice note
router.post('/voice-recordings', async (req, res) => {
  try {
    const access = await resolveCaregiverTarget(req, 'canManageRecordings');
    if (!access.authorized) {
      return res.status(403).json({ error: 'Access denied: You are not authorized to upload recordings for this account' });
    }
    const targetUserId = access.targetUserId;

    const { creator_name, relationship, title, duration_seconds, notes, file_url } = req.body;
    const dur = parseInt(duration_seconds) || 90;

    const newRec = await SanctuaryRecording.create({
      userId: targetUserId,
      title: title || `${creator_name || 'Caregiver'}'s Voice Note`,
      creatorName: creator_name || 'Caregiver',
      relationship: relationship || 'Care Team',
      durationSeconds: dur,
      recordingLabel: `${Math.floor(dur / 60)}m ${dur % 60}s audio • Just now`,
      audioUrl: file_url || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
      contentNotes: notes || '',
      isActive: true
    });

    await recordAuditLog({
      userId: targetUserId,
      actorId: req.userId,
      action: 'ADD_RECORDING',
      resourceType: 'voice',
      resourceId: newRec._id,
      details: { title: newRec.title },
      req
    });

    res.status(201).json({ success: true, item: newRec });
  } catch (err) {
    console.error('Error adding voice recording:', err);
    res.status(500).json({ error: 'Failed to add voice note' });
  }
});

// Add photograph
router.post('/photographs', async (req, res) => {
  try {
    const access = await resolveCaregiverTarget(req, 'canManageRecordings');
    if (!access.authorized) {
      return res.status(403).json({ error: 'Access denied: You are not authorized to upload photographs for this account' });
    }
    const targetUserId = access.targetUserId;

    const { image_name, location_context, image_url } = req.body;
    if (!image_name) {
      return res.status(400).json({ error: 'Image name is required' });
    }

    const newPhoto = await SanctuaryPhotograph.create({
      userId: targetUserId,
      imageName: image_name.trim(),
      locationContext: location_context || 'Family Memory • Sanctuary Space',
      imageUrl: image_url || 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=600&q=80',
      isActive: true
    });

    await recordAuditLog({
      userId: targetUserId,
      actorId: req.userId,
      action: 'ADD_PHOTO',
      resourceType: 'photo',
      resourceId: newPhoto._id,
      details: { imageName: newPhoto.imageName },
      req
    });

    res.status(201).json({ success: true, item: newPhoto });
  } catch (err) {
    console.error('Error adding photo:', err);
    res.status(500).json({ error: 'Failed to add photograph' });
  }
});

// Link music track
router.post('/music/link', async (req, res) => {
  try {
    const access = await resolveCaregiverTarget(req, 'canManageRecordings');
    if (!access.authorized) {
      return res.status(403).json({ error: 'Access denied: You are not authorized to link music for this account' });
    }
    const targetUserId = access.targetUserId;

    const { track_title, artist, source, spotify_track_id, audio_url, album_art_url } = req.body;
    if (!track_title) {
      return res.status(400).json({ error: 'Track title is required' });
    }

    const newMusic = await SanctuaryMusic.create({
      userId: targetUserId,
      trackTitle: track_title.trim(),
      artist: artist || 'Spotify Linked • 432 Hz Tuned',
      source: source || 'spotify',
      spotifyTrackId: spotify_track_id || '',
      audioUrl: audio_url || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
      albumArtUrl: album_art_url || 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=600&q=80',
      isActive: true
    });

    await recordAuditLog({
      userId: targetUserId,
      actorId: req.userId,
      action: 'LINK_MUSIC',
      resourceType: 'music',
      resourceId: newMusic._id,
      details: { trackTitle: newMusic.trackTitle },
      req
    });

    res.status(201).json({ success: true, item: newMusic });
  } catch (err) {
    console.error('Error linking music:', err);
    res.status(500).json({ error: 'Failed to link music track' });
  }
});

// Update primary emergency contact
router.patch('/emergency-contacts/primary', async (req, res) => {
  try {
    const access = await resolveCaregiverTarget(req, 'canManageEmergencyContacts');
    if (!access.authorized) {
      return res.status(403).json({ error: 'Access denied: You are not authorized to update emergency contacts for this account' });
    }
    const targetUserId = access.targetUserId;

    const { name, relationship, phone_number, direct_call_enabled } = req.body;
    let primary = await SanctuaryContact.findOne({ userId: targetUserId, isPrimary: true });

    if (!primary) {
      primary = new SanctuaryContact({
        userId: targetUserId,
        isPrimary: true,
        isEmergencyContact: true
      });
    }

    if (name) primary.name = name.trim();
    if (relationship) primary.relationship = relationship.trim();
    if (phone_number) {
      primary.phoneNumber = phone_number.trim();
      primary.maskedPhone = phone_number.trim();
    }
    if (direct_call_enabled !== undefined) {
      primary.directCallEnabled = direct_call_enabled;
    }

    await primary.save();

    await recordAuditLog({
      userId: targetUserId,
      actorId: req.userId,
      action: 'UPDATE_PRIMARY_CONTACT',
      resourceType: 'contact',
      resourceId: primary._id,
      details: { name: primary.name, phone: primary.maskedPhone },
      req
    });

    res.json({ success: true, primaryContact: primary });
  } catch (err) {
    console.error('Error updating primary emergency contact:', err);
    res.status(500).json({ error: 'Failed to update primary emergency contact' });
  }
});

// Flag content item
router.post('/content/:id/flags', async (req, res) => {
  try {
    const access = await resolveCaregiverTarget(req, 'canManageRecordings');
    if (!access.authorized) {
      return res.status(403).json({ error: 'Access denied: You are not authorized to flag content for this account' });
    }
    const targetUserId = access.targetUserId;

    const { reason, flagType } = req.body;
    const flagReason = reason || flagType || 'Agitation trigger flagged';

    // Check voice recording first
    let doc = await SanctuaryRecording.findOneAndUpdate(
      { _id: req.params.id, userId: targetUserId },
      { isFlagged: true, flagReason, flaggedAt: new Date(), isActive: false },
      { returnDocument: 'after' }
    );

    if (!doc) {
      doc = await SanctuaryPhotograph.findOneAndUpdate(
        { _id: req.params.id, userId: targetUserId },
        { isFlagged: true, flagReason, isActive: false },
        { returnDocument: 'after' }
      );
    }

    if (!doc) {
      return res.status(404).json({ error: 'Content item not found' });
    }

    await recordAuditLog({
      userId: targetUserId,
      actorId: req.userId,
      action: 'FLAG_CONTENT',
      resourceType: 'content',
      resourceId: req.params.id,
      details: { flagReason },
      req
    });

    res.json({ success: true, item: doc, message: 'Content has been flagged and paused from Sanctuary.' });
  } catch (err) {
    console.error('Error flagging content:', err);
    res.status(500).json({ error: 'Failed to flag content' });
  }
});

// -------------------------------------------------------------
// 4. INTERVENTION HISTORY & CLINICAL LOGS (Tab 1B)
// -------------------------------------------------------------
router.get(['/sessions', '/patients/:patientId/sessions'], async (req, res) => {
  try {
    const access = await resolveCaregiverTarget(req, 'canViewRecordings');
    if (!access.authorized) {
      return res.status(403).json({ error: 'Access denied: You are not authorized to view sessions for this account' });
    }
    const targetUserId = access.targetUserId;

    if (!access.isSelf) {
      await recordAuditLog({
        userId: targetUserId,
        actorId: req.userId,
        action: 'CAREGIVER_VIEW_SESSIONS',
        resourceType: 'sanctuary_sessions',
        details: { patientId: targetUserId },
        req
      });
    }

    const sessions = await SanctuarySession.find({ userId: targetUserId }).sort({ startedAt: -1 }).limit(20);
    const recentInterventions = sessions.map(s => {
      const act = (s.activities && s.activities.length > 0) ? s.activities[0] : null;
      const dt = new Date(s.startedAt);
      const feelingLabel = s.checkInFeeling === 'calmer' ? 'Calmer' : s.checkInFeeling === 'same' ? 'Same' : s.checkInFeeling ? s.checkInFeeling.replace('_', ' ') : 'Completed';
      const badgeType = s.checkInFeeling === 'calmer' ? 'calmer' : s.checkInFeeling === 'same' ? 'same' : 'resolved';
      return {
        id: String(s._id),
        title: act?.contactName ? `${act.contactName}'s voice note` : (s.callInitiated?.timestamp ? 'Support call' : 'Sanctuary session'),
        timestamp: dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
        badge: feelingLabel,
        badgeType,
        summary: `Session lasted ${Math.round((act?.durationSeconds || 60) / 60)} min. Check-in outcome: ${feelingLabel}.`,
        durationSeconds: act?.durationSeconds || 60
      };
    });

    res.json(recentInterventions);
  } catch (err) {
    console.error('Error fetching intervention history:', err);
    res.status(500).json({ error: 'Failed to load intervention history' });
  }
});

// -------------------------------------------------------------
// 5. EFFECTIVENESS ANALYTICS
// -------------------------------------------------------------
router.get('/analytics/effectiveness', async (req, res) => {
  try {
    const access = await resolveCaregiverTarget(req, 'canViewRecordings');
    if (!access.authorized) {
      return res.status(403).json({ error: 'Access denied: You are not authorized to view analytics for this account' });
    }
    const targetUserId = access.targetUserId;

    const sessionsWithActivities = await SanctuarySession.find({
      userId: targetUserId,
      checkInFeeling: { $ne: null }
    });

    const activityStats = {};
    sessionsWithActivities.forEach(s => {
      (s.activities || []).forEach(a => {
        const key = a.contactName || a.activityType || 'Sanctuary Practice';
        if (!activityStats[key]) {
          activityStats[key] = { name: key, total: 0, calmer: 0 };
        }
        activityStats[key].total++;
        if (s.checkInFeeling === 'calmer') activityStats[key].calmer++;
      });
    });

    const whatHelpsMost = Object.values(activityStats).map(st => ({
      name: st.name,
      calmerPercentage: Math.round((st.calmer / Math.max(1, st.total)) * 100),
      count: st.calmer,
      total: st.total
    })).sort((a, b) => b.calmerPercentage - a.calmerPercentage);

    res.json({
      summaryText: sessionsWithActivities.length > 0
        ? `Based on ${sessionsWithActivities.length} recorded post-session check-ins. Pure user responses.`
        : "No recorded post-session check-ins yet. Data will appear as sessions are completed.",
      whatHelpsMost
    });
  } catch (err) {
    console.error('Error fetching effectiveness analytics:', err);
    res.status(500).json({ error: 'Failed to load analytics' });
  }
});

// -------------------------------------------------------------
// 6. PATIENT DREAMS (Caregiver Access)
// GET /patients/:patientId/dreams
// -------------------------------------------------------------
router.get('/patients/:patientId/dreams', async (req, res) => {
  try {
    const access = await resolveCaregiverTarget(req, 'canViewRecordings');
    if (!access.authorized) {
      return res.status(403).json({ error: 'Not assigned to this patient' });
    }
    const patientId = access.targetUserId;

    if (!access.isSelf) {
      await recordAuditLog({
        userId: patientId,
        actorId: req.userId,
        action: 'CAREGIVER_VIEW_PATIENT_DREAMS',
        resourceType: 'dreams',
        details: { patientId },
        req
      });
    }

    const dreams = await Dream.find({ userId: patientId }).sort({ createdAt: -1 });
    return res.json({ patient_id: patientId, dreams });
  } catch (err) {
    console.error('Error fetching patient dreams for caregiver:', err);
    return res.status(500).json({ error: 'Failed to load patient dreams' });
  }
});

module.exports = router;
