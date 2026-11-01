const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ReassuranceSettings = require('../models/ReassuranceSettings');
const Relationship = require('../models/Relationship');
const Memory = require('../models/Memory');
const SanctuaryContact = require('../models/SanctuaryContact');
const SanctuaryRecording = require('../models/SanctuaryRecording');
const SanctuaryPhotograph = require('../models/SanctuaryPhotograph');
const SanctuaryMusic = require('../models/SanctuaryMusic');
const SanctuarySession = require('../models/SanctuarySession');

// Protect all routes with auth middleware
router.use(auth);

// ==========================================
// 0. SANCTUARY SEEDING & HELPER FUNCTIONS
// ==========================================

async function ensureSanctuarySeedData(userId) {
  // New user accounts start with empty collections per multi-tenant data isolation specification
  return [];
}

// ==========================================
// 1. SANCTUARY GROUNDING SUPPORT SYSTEM API
// ==========================================

// GET /api/memory-support/sanctuary/landing (also /sanctuary/landing)
router.get(['/sanctuary/landing', '/landing'], async (req, res) => {
  try {
    const contacts = await SanctuaryContact.find({ userId: req.userId });
    const recordings = await SanctuaryRecording.find({ userId: req.userId });
    const emergencyContacts = contacts.filter(c => c.isEmergencyContact);
    const primaryContact = contacts.find(c => c.isPrimary) || contacts[0];

    res.json({
      hasVoices: recordings.length > 0,
      hasFaces: contacts.some(c => !!c.photoUrl),
      hasMusic: true,
      emergencyContactsCount: emergencyContacts.length,
      primaryContact: primaryContact ? {
        contactId: primaryContact._id,
        name: primaryContact.name,
        relationship: primaryContact.relationship
      } : null
    });
  } catch (err) {
    console.error('Error in /sanctuary/landing:', err);
    res.status(500).json({ error: 'Failed to load Sanctuary status' });
  }
});

// GET /api/memory-support/sanctuary/contacts/voices
router.get(['/sanctuary/contacts/voices', '/contacts/voices'], async (req, res) => {
  try {
    const contacts = await SanctuaryContact.find({ userId: req.userId, isActive: { $ne: false } }).sort({ sortOrder: 1 });
    const recordings = await SanctuaryRecording.find({ userId: req.userId, isActive: { $ne: false } }).sort({ recordedAt: -1 });

    const contactMapById = new Map();
    const contactMapByName = new Map();
    contacts.forEach(c => {
      contactMapById.set(String(c._id), c);
      if (c.name) contactMapByName.set(c.name.toLowerCase().trim(), c);
    });

    const voiceList = recordings.map(r => {
      const c = (r.contactId && contactMapById.get(String(r.contactId))) ||
                (r.creatorName && contactMapByName.get(r.creatorName.toLowerCase().trim())) ||
                null;

      const fallbackPhoto = r.creatorName?.toLowerCase().includes('sarah')
        ? 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80'
        : r.creatorName?.toLowerCase().includes('david') || r.creatorName?.toLowerCase().includes('michael')
        ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80'
        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80';

      return {
        contactId: c ? c._id : r._id,
        name: r.creatorName || (c ? c.name : 'Care Companion'),
        relationship: r.relationship || (c ? c.relationship : 'Caregiver'),
        relationshipTag: c ? c.relationshipTag : null,
        roleLabel: c ? c.roleLabel : 'Family Contact',
        photoUrl: (c && c.photoUrl) ? c.photoUrl : fallbackPhoto,
        recordingId: r._id,
        recordingTitle: r.title,
        recordingDuration: r.durationSeconds,
        recordingLabel: r.recordingLabel || `${Math.floor(r.durationSeconds / 60)}m ${r.durationSeconds % 60}s soothing message`,
        recordedAt: r.recordedAt,
        audioUrl: r.audioUrl,
        isSample: r.isSample || (c && c.isSample) || false,
        reassuranceNote: (c && c.reassuranceNote) || 'You are safe, right where you are. Place one hand on your chest and listen as long as you need.'
      };
    });

    res.json(voiceList);
  } catch (err) {
    console.error('Error in /sanctuary/contacts/voices:', err);
    res.status(500).json({ error: 'Failed to load voice contacts' });
  }
});

// GET /api/memory-support/sanctuary/contacts/emergency
router.get(['/sanctuary/contacts/emergency', '/contacts/emergency'], async (req, res) => {
  try {
    const contacts = await SanctuaryContact.find({ 
      userId: req.userId, 
      isEmergencyContact: true,
      isActive: { $ne: false } 
    }).sort({ isPrimary: -1, sortOrder: 1 });

    const list = contacts.map(c => ({
      contactId: c._id,
      name: c.name,
      relationship: c.relationship,
      relationshipTag: c.relationshipTag || (c.isPrimary ? 'Daughter' : null),
      roleLabel: c.roleLabel || 'Family Emergency Contact',
      photoUrl: c.photoUrl,
      phoneNumber: c.phoneNumber,
      maskedPhone: c.maskedPhone || c.phoneNumber,
      isPrimary: c.isPrimary
    }));

    res.json(list);
  } catch (err) {
    console.error('Error in /sanctuary/contacts/emergency:', err);
    res.status(500).json({ error: 'Failed to load emergency contacts' });
  }
});

// GET /api/memory-support/sanctuary/contacts/faces
router.get(['/sanctuary/contacts/faces', '/contacts/faces'], async (req, res) => {
  try {
    const [contacts, photos] = await Promise.all([
      SanctuaryContact.find({ 
        userId: req.userId,
        photoUrl: { $ne: '' },
        isActive: { $ne: false }
      }).sort({ sortOrder: 1 }),
      SanctuaryPhotograph.find({
        userId: req.userId,
        isActive: { $ne: false }
      }).sort({ dateUploaded: -1 })
    ]);

    const items = [
      ...contacts.map(c => ({
        contactId: c._id,
        name: c.name,
        relationship: c.relationship,
        relationshipTag: c.relationshipTag,
        photoUrl: c.photoUrl,
        reassuranceNote: c.reassuranceNote,
        phoneNumber: c.phoneNumber,
        maskedPhone: c.maskedPhone,
        isEmergencyContact: c.isEmergencyContact
      })),
      ...photos.map(p => ({
        contactId: p._id,
        name: p.imageName,
        relationship: p.locationContext,
        relationshipTag: 'Photo',
        photoUrl: p.imageUrl,
        reassuranceNote: 'Grounding photo memory',
        isEmergencyContact: false
      }))
    ];

    res.json(items);
  } catch (err) {
    console.error('Error in /sanctuary/contacts/faces:', err);
    res.status(500).json({ error: 'Failed to load familiar faces' });
  }
});

// GET /api/memory-support/sanctuary/music/tracks
router.get(['/sanctuary/music/tracks', '/music/tracks'], async (req, res) => {
  try {
    const music = await SanctuaryMusic.find({
      userId: req.userId,
      isActive: { $ne: false }
    }).sort({ dateLinked: -1 });

    res.json(music.map(m => ({
      id: m._id,
      title: m.trackTitle,
      artist: m.artist,
      albumArtUrl: m.albumArtUrl || 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=600&q=80',
      audioUrl: m.audioUrl || 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
      durationSeconds: 180,
      source: m.source
    })));
  } catch (err) {
    console.error('Error in /sanctuary/music/tracks:', err);
    res.status(500).json({ error: 'Failed to load music tracks' });
  }
});

// GET /api/memory-support/sanctuary/recordings/:id/stream
router.get(['/sanctuary/recordings/:id/stream', '/recordings/:id/stream'], async (req, res) => {
  try {
    const recording = await SanctuaryRecording.findOne({ 
      _id: req.params.id, 
      userId: req.userId 
    });

    if (!recording) {
      return res.status(404).json({ error: 'Recording not found' });
    }

    res.json({
      recordingId: recording._id,
      audioUrl: recording.audioUrl,
      durationSeconds: recording.durationSeconds,
      title: recording.title
    });
  } catch (err) {
    console.error('Error in /sanctuary/recordings/:id/stream:', err);
    res.status(500).json({ error: 'Failed to fetch recording stream' });
  }
});

// POST /api/memory-support/sanctuary/sessions/event
router.post(['/sanctuary/sessions/event', '/sessions/event'], async (req, res) => {
  try {
    const { activityType, contactId, contactName, durationSeconds, sessionId } = req.body;

    let session;
    if (sessionId) {
      session = await SanctuarySession.findOne({ _id: sessionId, userId: req.userId });
    }
    if (!session) {
      session = new SanctuarySession({
        userId: req.userId,
        startedAt: new Date(),
        activities: []
      });
    }

    session.activities.push({
      activityType: activityType || 'voice_playback',
      contactId: contactId || null,
      contactName: contactName || '',
      durationSeconds: durationSeconds || 0,
      timestamp: new Date()
    });

    await session.save();

    res.json({ success: true, sessionId: session._id, session });
  } catch (err) {
    console.error('Error in /sanctuary/sessions/event:', err);
    res.status(500).json({ error: 'Failed to log grounding event' });
  }
});

// POST /api/memory-support/sanctuary/sessions/call-initiated
router.post(['/sanctuary/sessions/call-initiated', '/sessions/call-initiated'], async (req, res) => {
  try {
    const { contactId, sourceScreen, sessionId } = req.body;
    let contactName = '';
    if (contactId) {
      const c = await SanctuaryContact.findById(contactId);
      if (c) contactName = c.name;
    }

    let session;
    if (sessionId) {
      session = await SanctuarySession.findOne({ _id: sessionId, userId: req.userId });
    }
    if (!session) {
      session = new SanctuarySession({
        userId: req.userId,
        startedAt: new Date(),
        activities: []
      });
    }

    session.activities.push({
      activityType: 'emergency_contact',
      contactId: contactId || null,
      contactName: contactName,
      durationSeconds: 0,
      timestamp: new Date()
    });

    session.callInitiated = {
      contactId: contactId || null,
      contactName: contactName,
      sourceScreen: sourceScreen || 'Screen4_DialGuard',
      timestamp: new Date()
    };

    await session.save();

    res.json({ success: true, sessionId: session._id, message: 'Call attempt logged securely.' });
  } catch (err) {
    console.error('Error logging call initiation:', err);
    res.status(500).json({ error: 'Failed to record call event' });
  }
});

// POST /api/memory-support/sanctuary/feelings-checkin
router.post(['/sanctuary/feelings-checkin', '/feelings-checkin'], async (req, res) => {
  try {
    const { feeling, sessionId, completedActivity } = req.body;
    if (!['calmer', 'same', 'more_upset', 'not_sure'].includes(feeling)) {
      return res.status(400).json({ error: 'Invalid feeling category' });
    }

    let session;
    if (sessionId) {
      session = await SanctuarySession.findOne({ _id: sessionId, userId: req.userId });
    }
    if (!session) {
      session = new SanctuarySession({
        userId: req.userId,
        startedAt: new Date(),
        activities: []
      });
    }

    session.checkInFeeling = feeling;
    session.endedAt = new Date();
    session.activities.push({
      activityType: 'feelings_checkin',
      durationSeconds: 0,
      timestamp: new Date()
    });

    await session.save();

    res.json({
      success: true,
      message: 'Check-in logged.',
      feeling,
      sessionId: session._id
    });
  } catch (err) {
    console.error('Error logging feelings check-in:', err);
    res.status(500).json({ error: 'Failed to log check-in' });
  }
});

// GET /api/sanctuary/sessions?period=month or /api/memory-support/sessions?period=month
router.get(['/sanctuary/sessions', '/sessions'], async (req, res) => {
  try {
    const period = req.query.period || 'month';
    const now = new Date();
    const days = period === 'week' ? 7 : 30;
    const startDate = new Date();
    startDate.setDate(now.getDate() - days);

    const sessions = await SanctuarySession.find({
      userId: req.userId,
      startedAt: { $gte: startDate }
    }).sort({ startedAt: -1 });

    const totalSessions = sessions.length;

    let calmerCount = 0;
    let totalDurationSeconds = 0;
    const contentCounts = {};

    const formattedSessions = sessions.map(s => {
      let duration = 0;
      let contentUsed = null;
      if (Array.isArray(s.activities) && s.activities.length > 0) {
        s.activities.forEach(a => {
          duration += (a.durationSeconds || 0);
          if (a.contactName) {
            contentCounts[a.contactName] = (contentCounts[a.contactName] || 0) + 1;
            contentUsed = a.contactName;
          }
        });
      } else if (s.endedAt && s.startedAt) {
        duration = Math.round((new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 1000);
      }

      totalDurationSeconds += duration;

      if (s.checkInFeeling === 'calmer') {
        calmerCount++;
      }

      return {
        session_id: s._id,
        initiated_at: s.startedAt,
        duration_seconds: duration,
        final_feeling: s.checkInFeeling || null,
        content_used: contentUsed
      };
    });

    let mostUsedContent = null;
    let maxContentCount = 0;
    for (const [content, count] of Object.entries(contentCounts)) {
      if (count > maxContentCount) {
        maxContentCount = count;
        mostUsedContent = content;
      }
    }

    const calmerPercentage = totalSessions > 0 ? Math.round((calmerCount / totalSessions) * 100) : null;
    const avgDuration = totalSessions > 0 ? Math.round(totalDurationSeconds / totalSessions) : null;

    return res.json({
      user_id: req.userId,
      period,
      sessions: formattedSessions,
      total_sessions: totalSessions,
      effectiveness: {
        calmer_percentage: calmerPercentage,
        avg_session_duration: avgDuration,
        most_used_content: mostUsedContent
      }
    });
  } catch (err) {
    console.error('Error fetching sanctuary sessions:', err);
    return res.status(500).json({ error: 'Failed to fetch sanctuary sessions' });
  }
});

// ==========================================
// 2. LEGACY ANCHOR & REASSURANCE SETTINGS
// ==========================================

const formatSettingsResponse = (settings) => {
  if (!settings) {
    return {
      locationPhrase: '',
      homePhrase: '',
      reassuranceNote: '',
      customReassuranceLine: '',
      updatedAt: new Date()
    };
  }
  const loc = settings.locationPhrase || settings.homePhrase || '';
  const note = settings.reassuranceNote || settings.customReassuranceLine || '';
  return {
    _id: settings._id,
    userId: settings.userId,
    locationPhrase: loc,
    homePhrase: loc,
    reassuranceNote: note,
    customReassuranceLine: note,
    createdAt: settings.createdAt,
    updatedAt: settings.updatedAt
  };
};

router.get(['/anchor-settings', '/reassurance-settings', '/settings'], async (req, res) => {
  try {
    const settings = await ReassuranceSettings.findOne({ userId: req.userId });
    res.json(formatSettingsResponse(settings));
  } catch (err) {
    console.error('Error fetching anchor settings:', err);
    res.status(500).json({ error: 'Failed to retrieve anchor settings' });
  }
});

router.all(['/anchor-settings', '/reassurance-settings', '/settings'], async (req, res, next) => {
  if (req.method !== 'PATCH' && req.method !== 'PUT' && req.method !== 'POST') {
    return next();
  }
  try {
    const { locationPhrase, homePhrase, reassuranceNote, customReassuranceLine } = req.body;
    const loc = typeof locationPhrase === 'string' ? locationPhrase.trim() : (typeof homePhrase === 'string' ? homePhrase.trim() : undefined);
    const note = typeof reassuranceNote === 'string' ? reassuranceNote.trim() : (typeof customReassuranceLine === 'string' ? customReassuranceLine.trim() : undefined);

    let settings = await ReassuranceSettings.findOne({ userId: req.userId });
    if (!settings) {
      settings = new ReassuranceSettings({
        userId: req.userId,
        homePhrase: loc || '',
        locationPhrase: loc || '',
        customReassuranceLine: note || '',
        reassuranceNote: note || ''
      });
    } else {
      if (loc !== undefined) {
        settings.homePhrase = loc;
        settings.locationPhrase = loc;
      }
      if (note !== undefined) {
        settings.customReassuranceLine = note;
        settings.reassuranceNote = note;
      }
    }

    await settings.save();
    res.json(formatSettingsResponse(settings));
  } catch (err) {
    console.error('Error updating anchor settings:', err);
    res.status(500).json({ error: 'Failed to save anchor settings' });
  }
});

// ==========================================
// 3. MEMORY VAULT
// ==========================================

const formatMemoryResponse = (item) => {
  const photo = item.photoUrl || item.imageUrl || '';
  return {
    _id: item._id,
    userId: item.userId,
    title: item.title || '',
    description: item.description || '',
    photoUrl: photo,
    imageUrl: photo,
    audioUrl: item.audioUrl || '',
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
};

router.get(['/vault', '/memories'], async (req, res) => {
  try {
    const items = await Memory.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(items.map(formatMemoryResponse));
  } catch (err) {
    console.error('Error fetching memory vault:', err);
    res.status(500).json({ error: 'Failed to retrieve memories' });
  }
});

router.post(['/vault', '/memories'], async (req, res) => {
  try {
    const { title, description, photoUrl, imageUrl, audioUrl } = req.body;
    const photo = (photoUrl || imageUrl || '').trim();

    const newMemory = await Memory.create({
      userId: req.userId,
      title: title ? title.trim() : '',
      description: description ? description.trim() : '',
      imageUrl: photo || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
      photoUrl: photo || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
      audioUrl: audioUrl ? audioUrl.trim() : ''
    });

    res.status(201).json(formatMemoryResponse(newMemory));
  } catch (err) {
    console.error('Error creating memory vault item:', err);
    res.status(500).json({ error: 'Failed to add memory' });
  }
});

router.delete(['/vault/:id', '/memories/:id'], async (req, res) => {
  try {
    const result = await Memory.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!result) {
      return res.status(404).json({ error: 'Memory not found' });
    }
    res.json({ message: 'Memory deleted successfully', id: req.params.id });
  } catch (err) {
    console.error('Error deleting memory:', err);
    res.status(500).json({ error: 'Failed to delete memory' });
  }
});

// ==========================================
// 4. FAMILIAR FACES (LEGACY & SYNCED)
// ==========================================

const formatFaceResponse = (item) => {
  const rel = item.relationship || item.relation || '';
  return {
    _id: item._id,
    userId: item.userId,
    name: item.name || '',
    relationship: rel,
    relation: rel,
    description: item.description || '',
    pronoun: item.pronoun || 'They',
    photoUrl: item.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
};

router.get(['/familiar-faces', '/relationships'], async (req, res) => {
  try {
    const faces = await Relationship.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(faces.map(formatFaceResponse));
  } catch (err) {
    console.error('Error fetching familiar faces:', err);
    res.status(500).json({ error: 'Failed to retrieve familiar faces' });
  }
});

router.post(['/familiar-faces', '/relationships'], async (req, res) => {
  try {
    const { name, relationship, relation, description, photoUrl, pronoun } = req.body;
    if (!name || (!relationship && !relation)) {
      return res.status(400).json({ error: 'Name and relationship are required' });
    }

    const rel = (relationship || relation || '').trim();

    const newFace = await Relationship.create({
      userId: req.userId,
      name: name.trim(),
      relation: rel,
      relationship: rel,
      description: description ? description.trim() : '',
      pronoun: pronoun || 'They',
      photoUrl: photoUrl ? photoUrl.trim() : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80'
    });

    res.status(201).json(formatFaceResponse(newFace));
  } catch (err) {
    console.error('Error creating familiar face:', err);
    res.status(500).json({ error: 'Failed to add familiar face' });
  }
});

router.all(['/familiar-faces/:id', '/relationships/:id'], async (req, res, next) => {
  if (req.method !== 'PATCH' && req.method !== 'PUT') {
    return next();
  }
  try {
    const { name, relationship, relation, description, photoUrl, pronoun } = req.body;
    const face = await Relationship.findOne({ _id: req.params.id, userId: req.userId });
    if (!face) {
      return res.status(404).json({ error: 'Familiar face not found' });
    }

    if (name) face.name = name.trim();
    if (relationship || relation) {
      const rel = (relationship || relation).trim();
      face.relation = rel;
      face.relationship = rel;
    }
    if (description !== undefined) face.description = description.trim();
    if (pronoun) face.pronoun = pronoun;
    if (photoUrl) face.photoUrl = photoUrl.trim();

    await face.save();
    res.json(formatFaceResponse(face));
  } catch (err) {
    console.error('Error updating familiar face:', err);
    res.status(500).json({ error: 'Failed to update familiar face' });
  }
});

router.delete(['/familiar-faces/:id', '/relationships/:id'], async (req, res) => {
  try {
    const result = await Relationship.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!result) {
      return res.status(404).json({ error: 'Familiar face not found' });
    }
    res.json({ message: 'Familiar face deleted successfully', id: req.params.id });
  } catch (err) {
    console.error('Error deleting familiar face:', err);
    res.status(500).json({ error: 'Failed to delete familiar face' });
  }
});

// ==========================================
// 6. NAVIGATION STATE & EMERGENCY QUICK CONTACT API
// ==========================================

// GET /emergency-contacts/primary
router.get(['/emergency-contacts/primary', '/sanctuary/emergency-contacts/primary'], async (req, res) => {
  try {
    const contacts = await SanctuaryContact.find({
      userId: req.userId,
      isEmergencyContact: true,
      isActive: { $ne: false },
    }).sort({ isPrimary: -1, sortOrder: 1 });

    const primary = contacts.find((c) => c.isPrimary) || contacts[0];
    if (!primary) {
      return res.json(null);
    }

    res.json({
      contactId: primary._id,
      name: primary.name,
      relationship: primary.relationship,
      relationshipTag: primary.relationshipTag || 'Primary Caregiver',
      roleLabel: primary.roleLabel || 'Family Emergency Contact',
      phoneNumber: primary.phoneNumber,
      maskedPhone: primary.maskedPhone || primary.phoneNumber,
      phone_masked: primary.maskedPhone || primary.phoneNumber,
      photoUrl: primary.photoUrl || '',
      isPrimary: true,
    });
  } catch (err) {
    console.error('Error fetching primary emergency contact:', err);
    res.status(500).json({ error: 'Failed to fetch primary contact' });
  }
});

// POST /sessions/emergency-contact-attempt
router.post(['/sessions/emergency-contact-attempt', '/sanctuary/sessions/emergency-contact-attempt'], async (req, res) => {
  try {
    const { contactId, contactName, source } = req.body;

    const session = await SanctuarySession.create({
      userId: req.userId,
      startedAt: new Date(),
      initialTrigger: source || 'emergency_quick_contact_button',
      callInitiated: true,
      callRecipientId: contactId,
      callRecipientName: contactName,
      status: 'active',
    }).catch(() => null);

    res.json({
      success: true,
      sessionId: session ? session._id : null,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error logging emergency contact attempt:', err);
    res.status(500).json({ error: 'Failed to log attempt' });
  }
});

// In-memory or user-scoped nav tracking
const userNavCache = new Map();

// GET /navigation/state
router.get(['/navigation/state', '/user/navigation/state'], async (req, res) => {
  try {
    const cached = userNavCache.get(String(req.userId)) || {
      current_section: 'home',
      last_visited: 'home',
      badges: {
        sanctuary: false,
        emergency: false,
      },
    };
    res.json(cached);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch navigation state' });
  }
});

// POST /navigation/track
router.post(['/navigation/track', '/user/navigation/track'], async (req, res) => {
  try {
    const { section, action } = req.body;
    const existing = userNavCache.get(String(req.userId)) || {
      current_section: 'home',
      last_visited: 'home',
      badges: { sanctuary: false, emergency: false },
    };

    if (action === 'enter') {
      existing.last_visited = existing.current_section;
      existing.current_section = section;
    }
    userNavCache.set(String(req.userId), existing);

    res.json({ success: true, updated: existing });
  } catch (err) {
    res.status(500).json({ error: 'Failed to track navigation' });
  }
});

module.exports = router;

