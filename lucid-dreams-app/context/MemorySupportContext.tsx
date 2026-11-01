import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { BACKEND_URL, authenticatedFetch } from '../utils/api';

export interface AnchorSettingsData {
  _id?: string;
  locationPhrase: string;
  homePhrase?: string;
  reassuranceNote: string;
  customReassuranceLine?: string;
}

export interface MemoryItem {
  _id: string;
  title: string;
  description?: string;
  photoUrl: string;
  imageUrl?: string;
  audioUrl?: string;
  createdAt?: string;
}

export interface FamiliarFaceItem {
  _id: string;
  name: string;
  relationship: string;
  relation?: string;
  description?: string;
  pronoun?: 'She' | 'He' | 'They';
  photoUrl: string;
  createdAt?: string;
}

interface MemorySupportContextType {
  // Anchor Settings
  anchorSettings: AnchorSettingsData;
  setAnchorSettings: React.Dispatch<React.SetStateAction<AnchorSettingsData>>;
  fetchAnchorSettings: () => Promise<void>;
  saveAnchorSettings: (loc: string, note: string) => Promise<boolean>;
  
  // Modals
  isAnchorSettingsModalOpen: boolean;
  setIsAnchorSettingsModalOpen: (open: boolean) => void;
  isAddMemoryModalOpen: boolean;
  setIsAddMemoryModalOpen: (open: boolean) => void;
  isAddFaceModalOpen: boolean;
  setIsAddFaceModalOpen: (open: boolean) => void;

  // Refresh Triggers
  vaultRefreshKey: number;
  triggerVaultRefresh: () => void;
  facesRefreshKey: number;
  triggerFacesRefresh: () => void;
}

const defaultSettings: AnchorSettingsData = {
  locationPhrase: '',
  reassuranceNote: '',
};

const MemorySupportContext = createContext<MemorySupportContextType>({
  anchorSettings: defaultSettings,
  setAnchorSettings: () => {},
  fetchAnchorSettings: async () => {},
  saveAnchorSettings: async () => false,
  isAnchorSettingsModalOpen: false,
  setIsAnchorSettingsModalOpen: () => {},
  isAddMemoryModalOpen: false,
  setIsAddMemoryModalOpen: () => {},
  isAddFaceModalOpen: false,
  setIsAddFaceModalOpen: () => {},
  vaultRefreshKey: 0,
  triggerVaultRefresh: () => {},
  facesRefreshKey: 0,
  triggerFacesRefresh: () => {},
});

export const useMemorySupport = () => useContext(MemorySupportContext);

export function MemorySupportProvider({ children }: { children: React.ReactNode }) {
  const [anchorSettings, setAnchorSettings] = useState<AnchorSettingsData>(defaultSettings);
  const [isAnchorSettingsModalOpen, setIsAnchorSettingsModalOpen] = useState(false);
  const [isAddMemoryModalOpen, setIsAddMemoryModalOpen] = useState(false);
  const [isAddFaceModalOpen, setIsAddFaceModalOpen] = useState(false);
  const [vaultRefreshKey, setVaultRefreshKey] = useState(0);
  const [facesRefreshKey, setFacesRefreshKey] = useState(0);

  const fetchAnchorSettings = useCallback(async () => {
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/memory-support/anchor-settings`);
      if (res.ok) {
        const data = await res.json();
        setAnchorSettings({
          _id: data._id,
          locationPhrase: data.locationPhrase || data.homePhrase || '',
          homePhrase: data.homePhrase || data.locationPhrase || '',
          reassuranceNote: data.reassuranceNote || data.customReassuranceLine || '',
          customReassuranceLine: data.customReassuranceLine || data.reassuranceNote || '',
        });
      }
    } catch (err) {
      console.warn('Error fetching anchor settings:', err);
    }
  }, []);

  const saveAnchorSettings = useCallback(async (locationPhrase: string, reassuranceNote: string): Promise<boolean> => {
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/memory-support/anchor-settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationPhrase: locationPhrase.trim(),
          homePhrase: locationPhrase.trim(),
          reassuranceNote: reassuranceNote.trim(),
          customReassuranceLine: reassuranceNote.trim(),
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setAnchorSettings({
          _id: updated._id,
          locationPhrase: updated.locationPhrase || updated.homePhrase || '',
          homePhrase: updated.homePhrase || updated.locationPhrase || '',
          reassuranceNote: updated.reassuranceNote || updated.customReassuranceLine || '',
          customReassuranceLine: updated.customReassuranceLine || updated.reassuranceNote || '',
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error saving anchor settings:', err);
      return false;
    }
  }, []);

  useEffect(() => {
    fetchAnchorSettings();
  }, [fetchAnchorSettings]);

  const triggerVaultRefresh = useCallback(() => {
    setVaultRefreshKey((prev) => prev + 1);
  }, []);

  const triggerFacesRefresh = useCallback(() => {
    setFacesRefreshKey((prev) => prev + 1);
  }, []);

  return (
    <MemorySupportContext.Provider
      value={{
        anchorSettings,
        setAnchorSettings,
        fetchAnchorSettings,
        saveAnchorSettings,
        isAnchorSettingsModalOpen,
        setIsAnchorSettingsModalOpen,
        isAddMemoryModalOpen,
        setIsAddMemoryModalOpen,
        isAddFaceModalOpen,
        setIsAddFaceModalOpen,
        vaultRefreshKey,
        triggerVaultRefresh,
        facesRefreshKey,
        triggerFacesRefresh,
      }}
    >
      {children}
    </MemorySupportContext.Provider>
  );
}
