import { useState, useEffect, useRef, useCallback } from 'react';
import * as Speech from 'expo-speech';

interface NarrationOptions {
  lines: string[];
  onComplete?: () => void;
}

export function useNarration() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [preferredVoice, setPreferredVoice] = useState<string | undefined>();
  const [currentIndex, setCurrentIndex] = useState(0);

  const linesRef = useRef<string[]>([]);
  const isPlayingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCompleteRef = useRef<(() => void) | undefined>(undefined);
  const currentIndexRef = useRef(0);
  const preferredVoiceRef = useRef<string | undefined>(undefined);

  // Keep refs in sync with state
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
  useEffect(() => { preferredVoiceRef.current = preferredVoice; }, [preferredVoice]);

  useEffect(() => {
    const initVoice = async () => {
      try {
        const voices = await Speech.getAvailableVoicesAsync();
        const femaleVoice = voices.find(
          (v) =>
            v.quality === Speech.VoiceQuality.Enhanced &&
            (v.name.toLowerCase().includes('female') ||
              v.identifier.toLowerCase().includes('female'))
        );
        if (femaleVoice) {
          setPreferredVoice(femaleVoice.identifier);
        } else if (voices.length > 0) {
          const enVoice = voices.find(v => v.language.startsWith('en'));
          if (enVoice) setPreferredVoice(enVoice.identifier);
        }
      } catch (err) {
        console.log('Error fetching voices:', err);
      }
    };
    initVoice();

    return () => {
      Speech.stop();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const speakLine = useCallback((index: number) => {
    if (!isPlayingRef.current || index >= linesRef.current.length) {
      // We've run past the end — narration complete
      if (index >= linesRef.current.length) {
        setIsSpeaking(false);
        isPlayingRef.current = false;
        onCompleteRef.current?.();
      }
      return;
    }

    const line = linesRef.current[index];

    Speech.speak(line, {
      voice: preferredVoiceRef.current,
      rate: 0.85,
      pitch: 0.95,
      onDone: () => {
        if (!isPlayingRef.current) return;

        const nextIndex = index + 1;
        currentIndexRef.current = nextIndex;
        setCurrentIndex(nextIndex);

        if (nextIndex < linesRef.current.length) {
          // Pause between lines, then speak the next one
          timeoutRef.current = setTimeout(() => {
            speakLine(nextIndex);
          }, 750);
        } else {
          // All lines spoken
          setIsSpeaking(false);
          isPlayingRef.current = false;
          onCompleteRef.current?.();
        }
      },
      onStopped: () => {
        setIsSpeaking(false);
        isPlayingRef.current = false;
      },
      onError: () => {
        setIsSpeaking(false);
        isPlayingRef.current = false;
      },
    });
  }, []); // No dependencies — reads everything from refs

  const speak = useCallback((options: NarrationOptions) => {
    // Stop any previous narration
    Speech.stop();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    linesRef.current = options.lines;
    onCompleteRef.current = options.onComplete;
    currentIndexRef.current = 0;
    setCurrentIndex(0);
    setIsSpeaking(true);
    isPlayingRef.current = true;

    // Kick off the first line after a microtask so state settles
    timeoutRef.current = setTimeout(() => speakLine(0), 50);
  }, [speakLine]);

  const pause = useCallback(() => {
    Speech.stop();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsSpeaking(false);
    isPlayingRef.current = false;
  }, []);

  const resume = useCallback(() => {
    const idx = currentIndexRef.current;
    if (idx < linesRef.current.length) {
      setIsSpeaking(true);
      isPlayingRef.current = true;
      speakLine(idx);
    }
  }, [speakLine]);

  const stop = useCallback(() => {
    Speech.stop();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsSpeaking(false);
    isPlayingRef.current = false;
    currentIndexRef.current = 0;
    setCurrentIndex(0);
  }, []);

  return {
    speak,
    pause,
    resume,
    stop,
    isSpeaking,
    currentIndex,
  };
}
