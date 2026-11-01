import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BACKEND_URL, authenticatedFetch } from '../utils/api';

export interface SanctuaryContactItem {
  contactId: string;
  name: string;
  relationship: string;
  relationshipTag?: string | null;
  roleLabel?: string;
  photoUrl: string;
  phoneNumber?: string;
  maskedPhone?: string;
  recordingId?: string;
  recordingTitle?: string;
  recordingDuration?: number;
  recordingLabel?: string;
  recordedAt?: string;
  audioUrl?: string;
  isSample?: boolean;
  isPrimary?: boolean;
  isEmergencyContact?: boolean;
  reassuranceNote?: string;
}

export interface SanctuaryLandingStatus {
  hasVoices: boolean;
  hasFaces: boolean;
  hasMusic: boolean;
  emergencyContactsCount: number;
  primaryContact?: {
    contactId?: string;
    name: string;
    relationship: string;
  } | null;
}

export interface LastGroundingActivity {
  contactName: string;
  noteTitle: string;
  summaryDuration: string;
  photoUrl: string;
}

interface SanctuaryContextType {
  status: SanctuaryLandingStatus | null;
  voiceContacts: SanctuaryContactItem[];
  emergencyContacts: SanctuaryContactItem[];
  facesContacts: SanctuaryContactItem[];
  selectedContact: SanctuaryContactItem | null;
  setSelectedContact: (contact: SanctuaryContactItem | null) => void;
  selectedEmergencyContact: SanctuaryContactItem | null;
  setSelectedEmergencyContact: (contact: SanctuaryContactItem | null) => void;
  isDialGuardActive: boolean;
  setIsDialGuardActive: (active: boolean) => void;
  lastActivity: LastGroundingActivity;
  setLastActivity: (activity: LastGroundingActivity) => void;
  selectedFeeling: 'calmer' | 'same' | 'more_upset' | 'not_sure' | null;
  setSelectedFeeling: (feeling: 'calmer' | 'same' | 'more_upset' | 'not_sure' | null) => void;
  sessionId: string | null;
  loading: boolean;
  refreshSanctuary: () => Promise<void>;
  logEvent: (activityType: string, contactId?: string, contactName?: string, durationSeconds?: number) => Promise<void>;
  logCallInitiated: (contactId?: string, sourceScreen?: string) => Promise<void>;
  submitFeelingCheckIn: (feeling: 'calmer' | 'same' | 'more_upset' | 'not_sure', completedActivity?: string) => Promise<boolean>;
}

// Default fallback data matching the reference image specification
const DEFAULT_SARAH: SanctuaryContactItem = {
  contactId: 'sarah-default-01',
  name: 'Sarah',
  relationship: 'Your daughter',
  relationshipTag: 'Recent',
  roleLabel: 'Family Emergency Contact',
  photoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80',
  phoneNumber: '+15552345678',
  maskedPhone: '+1 555-234-5678',
  recordingId: 'sarah-rec-01',
  recordingTitle: "Sarah's grounding note",
  recordingDuration: 102,
  recordingLabel: '1m 45s soothing message',
  recordedAt: 'yesterday at 4:15 PM',
  audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  isSample: false,
  isPrimary: true,
  isEmergencyContact: true,
  reassuranceNote: 'You are safe, right where you are. Place one hand on your chest and listen as long as you need.'
};

const DEFAULT_MICHAEL: SanctuaryContactItem = {
  contactId: 'michael-default-02',
  name: 'Michael',
  relationship: 'Your son',
  relationshipTag: null,
  roleLabel: 'Family Contact',
  photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
  phoneNumber: '+15554328765',
  maskedPhone: '+1 555-432-8765',
  recordingId: 'michael-rec-02',
  recordingTitle: "Michael's calm reassurance",
  recordingDuration: 130,
  recordingLabel: '2m 10s calm reassurance',
  recordedAt: '2 days ago',
  audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  isSample: false,
  isPrimary: false,
  isEmergencyContact: false,
  reassuranceNote: 'Take a soft breath. You have overcome this before and we love you.'
};

const DEFAULT_CAREGIVER_SUPPORT: SanctuaryContactItem = {
  contactId: 'caregiver-support-03',
  name: 'Caregiver Support',
  relationship: 'Care Companion',
  relationshipTag: '24/7',
  roleLabel: 'Available 24/7 Response Team',
  photoUrl: '',
  phoneNumber: '+18005550199',
  maskedPhone: '+1 800-555-0199',
  isSample: false,
  isPrimary: false,
  isEmergencyContact: true,
  reassuranceNote: 'Our clinical care team is standing by 24 hours a day to support you.'
};

const DEFAULT_SAMPLE: SanctuaryContactItem = {
  contactId: 'sample-system-001',
  name: 'Sample Message',
  relationship: 'Sanctuary Voice Guide',
  relationshipTag: 'Sample',
  roleLabel: 'System Reassurance Guide',
  photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
  phoneNumber: '+18005550100',
  maskedPhone: '+1 800-555-0100',
  recordingId: 'sample-rec-001',
  recordingDuration: 75,
  recordingLabel: '1m 15s calm reassurance',
  recordedAt: 'system default',
  audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  isSample: true,
  isPrimary: false,
  isEmergencyContact: false,
  reassuranceNote: 'You are safe right now. Take a moment. Breathe slowly. You have done this before and you can do it again.'
};

const SanctuaryContext = createContext<SanctuaryContextType>({
  status: null,
  voiceContacts: [],
  emergencyContacts: [],
  facesContacts: [],
  selectedContact: null,
  setSelectedContact: () => {},
  selectedEmergencyContact: null,
  setSelectedEmergencyContact: () => {},
  isDialGuardActive: false,
  setIsDialGuardActive: () => {},
  lastActivity: {
    contactName: '',
    noteTitle: 'Grounding session',
    summaryDuration: 'Completed session',
    photoUrl: ''
  },
  setLastActivity: () => {},
  selectedFeeling: null,
  setSelectedFeeling: () => {},
  sessionId: null,
  loading: false,
  refreshSanctuary: async () => {},
  logEvent: async () => {},
  logCallInitiated: async () => {},
  submitFeelingCheckIn: async () => false,
});

export const useSanctuary = () => useContext(SanctuaryContext);

export function SanctuaryProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<SanctuaryLandingStatus | null>(null);
  const [voiceContacts, setVoiceContacts] = useState<SanctuaryContactItem[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<SanctuaryContactItem[]>([]);
  const [facesContacts, setFacesContacts] = useState<SanctuaryContactItem[]>([]);
  const [selectedContact, setSelectedContact] = useState<SanctuaryContactItem | null>(null);
  const [selectedEmergencyContact, setSelectedEmergencyContact] = useState<SanctuaryContactItem | null>(null);
  const [isDialGuardActive, setIsDialGuardActive] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionIdRef = React.useRef<string | null>(null);
  const isRefreshingRef = React.useRef<boolean>(false);
  const [selectedFeeling, setSelectedFeeling] = useState<'calmer' | 'same' | 'more_upset' | 'not_sure' | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const [lastActivity, setLastActivity] = useState<LastGroundingActivity>({
    contactName: '',
    noteTitle: 'Grounding session',
    summaryDuration: 'Completed session',
    photoUrl: ''
  });

  const refreshSanctuary = useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    try {
      setLoading(true);

      const [landingRes, voicesRes, emergencyRes, facesRes] = await Promise.allSettled([
        authenticatedFetch(`${BACKEND_URL}/memory-support/sanctuary/landing`),
        authenticatedFetch(`${BACKEND_URL}/memory-support/sanctuary/contacts/voices`),
        authenticatedFetch(`${BACKEND_URL}/memory-support/sanctuary/contacts/emergency`),
        authenticatedFetch(`${BACKEND_URL}/memory-support/sanctuary/contacts/faces`),
      ]);

      // 1. Landing status
      if (landingRes.status === 'fulfilled' && landingRes.value.ok) {
        try {
          const data = await landingRes.value.json();
          setStatus(data);
        } catch (e) {
          console.warn('Sanctuary landing parse err:', e);
        }
      }

      // 2. Voice contacts
      if (voicesRes.status === 'fulfilled' && voicesRes.value.ok) {
        try {
          const list = await voicesRes.value.json();
          if (Array.isArray(list)) {
            setVoiceContacts(list);
            setSelectedContact(prev => {
              if (list.length > 0 && (!prev || !list.some(c => c.contactId === prev.contactId))) {
                return list[0];
              }
              return prev;
            });
          }
        } catch (e) {
          console.warn('Sanctuary voices parse err:', e);
        }
      }

      // 3. Emergency contacts
      if (emergencyRes.status === 'fulfilled' && emergencyRes.value.ok) {
        try {
          const list = await emergencyRes.value.json();
          if (Array.isArray(list)) {
            setEmergencyContacts(list);
            setSelectedEmergencyContact(prev => {
              if (list.length > 0 && (!prev || !list.some(c => c.contactId === prev.contactId))) {
                return list[0];
              }
              return prev;
            });
          }
        } catch (e) {
          console.warn('Sanctuary emergency parse err:', e);
        }
      }

      // 4. Faces contacts
      if (facesRes.status === 'fulfilled' && facesRes.value.ok) {
        try {
          const list = await facesRes.value.json();
          if (Array.isArray(list)) {
            setFacesContacts(list);
          }
        } catch (e) {
          console.warn('Sanctuary faces parse err:', e);
        }
      }
    } catch (err) {
      console.warn('Sanctuary refresh error:', err);
    } finally {
      setLoading(false);
      isRefreshingRef.current = false;
    }
  }, []);

  useEffect(() => {
    refreshSanctuary();
  }, [refreshSanctuary]);

  const logEvent = useCallback(async (
    activityType: string,
    contactId?: string,
    contactName?: string,
    durationSeconds?: number
  ) => {
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/memory-support/sanctuary/sessions/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activityType,
          contactId,
          contactName,
          durationSeconds: durationSeconds || 0,
          sessionId: sessionIdRef.current,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.sessionId) {
          sessionIdRef.current = data.sessionId;
          setSessionId(data.sessionId);
        }
      }
    } catch (e) {
      console.warn('Error logging grounding event:', e);
    }
  }, []);

  const logCallInitiated = useCallback(async (contactId?: string, sourceScreen: string = 'Screen4_DialGuard') => {
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/memory-support/sanctuary/sessions/call-initiated`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId,
          sourceScreen,
          sessionId: sessionIdRef.current,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.sessionId) {
          sessionIdRef.current = data.sessionId;
          setSessionId(data.sessionId);
        }
      }
    } catch (e) {
      console.warn('Error logging call initiation:', e);
    }
  }, []);

  const submitFeelingCheckIn = useCallback(async (
    feeling: 'calmer' | 'same' | 'more_upset' | 'not_sure',
    completedActivity: string = 'voice_playback'
  ): Promise<boolean> => {
    setSelectedFeeling(feeling);
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/memory-support/sanctuary/feelings-checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feeling,
          sessionId: sessionIdRef.current,
          completedActivity
        }),
      });
      return res.ok;
    } catch (e) {
      console.warn('Error submitting feeling check-in:', e);
      return false;
    }
  }, []);

  return (
    <SanctuaryContext.Provider
      value={{
        status,
        voiceContacts,
        emergencyContacts,
        facesContacts,
        selectedContact,
        setSelectedContact,
        selectedEmergencyContact,
        setSelectedEmergencyContact,
        isDialGuardActive,
        setIsDialGuardActive,
        lastActivity,
        setLastActivity,
        selectedFeeling,
        setSelectedFeeling,
        sessionId,
        loading,
        refreshSanctuary,
        logEvent,
        logCallInitiated,
        submitFeelingCheckIn,
      }}
    >
      {children}
    </SanctuaryContext.Provider>
  );
}
