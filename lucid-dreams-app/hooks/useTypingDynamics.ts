import { useRef, useCallback } from 'react';

export interface TypingSessionMetrics {
  wordsPerMinute: number;
  averageWPM: number;
  timeToFirstKeystrokeMs: number | null;
  longPauseCount: number;
  pauseCount: number;
  backspaceRatio: number;
  sessionDurationMs: number;
  sessionDurationSeconds: number;
  completed: boolean;
}

interface TypingSessionInternal {
  screenOpenTime: number;
  firstKeystrokeTime: number | null;
  totalKeystrokes: number;
  backspaceCount: number;
  totalCharacters: number;
  pauseCount: number;
  lastTextLength: number;
}

export function useTypingDynamics() {
  const session = useRef<TypingSessionInternal>({
    screenOpenTime: Date.now(),
    firstKeystrokeTime: null,
    totalKeystrokes: 0,
    backspaceCount: 0,
    totalCharacters: 0,
    pauseCount: 0,
    lastTextLength: 0,
  });
  const lastKeystrokeTime = useRef<number | null>(null);

  const resetSession = useCallback(() => {
    session.current = {
      screenOpenTime: Date.now(),
      firstKeystrokeTime: null,
      totalKeystrokes: 0,
      backspaceCount: 0,
      totalCharacters: 0,
      pauseCount: 0,
      lastTextLength: 0,
    };
    lastKeystrokeTime.current = null;
  }, []);

  const onKeystroke = useCallback((text: string) => {
    const now = Date.now();
    const currLen = text.length;
    const prevLen = session.current.lastTextLength;

    if (!session.current.firstKeystrokeTime) {
      session.current.firstKeystrokeTime = now;
    }

    // Mid-entry pause detection: pauses > 2 seconds (2000ms)
    if (lastKeystrokeTime.current && now - lastKeystrokeTime.current > 2000) {
      session.current.pauseCount++;
    }

    session.current.totalKeystrokes++;

    // Detect backspace deletion
    if (currLen < prevLen) {
      const diff = prevLen - currLen;
      session.current.backspaceCount += diff;
    }

    session.current.totalCharacters = currLen;
    session.current.lastTextLength = currLen;
    lastKeystrokeTime.current = now;
  }, []);

  const getSessionData = useCallback((): TypingSessionMetrics => {
    const now = Date.now();
    const durationMs = Math.max(now - session.current.screenOpenTime, 1000);
    const durationMinutes = durationMs / 60000;
    const sessionDurationSeconds = Math.round(durationMs / 1000);

    // Standard words per minute calculation (5 characters = 1 word)
    const wordsPerMinute =
      durationMinutes > 0
        ? Math.round(session.current.totalCharacters / 5 / durationMinutes)
        : 0;

    const timeToFirstKeyMs = session.current.firstKeystrokeTime
      ? session.current.firstKeystrokeTime - session.current.screenOpenTime
      : null;

    const totalKeys = Math.max(
      session.current.totalKeystrokes,
      session.current.totalCharacters + session.current.backspaceCount,
      1
    );
    const backspaceRatio =
      Math.round((session.current.backspaceCount / totalKeys) * 1000) / 1000;

    return {
      wordsPerMinute,
      averageWPM: wordsPerMinute,
      timeToFirstKeystrokeMs: timeToFirstKeyMs,
      longPauseCount: session.current.pauseCount,
      pauseCount: session.current.pauseCount,
      backspaceRatio,
      sessionDurationMs: durationMs,
      sessionDurationSeconds,
      completed: true,
    };
  }, []);

  return { onKeystroke, getSessionData, resetSession };
}
