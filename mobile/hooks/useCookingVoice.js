import { useState, useEffect, useRef, useCallback } from "react";
import { Audio } from "expo-av";
import * as SecureStore from "expo-secure-store";
import { generateStepAudio } from "../services/tts";

const MUTE_KEY = "dlishe_cooking_voice_muted";

export function useCookingVoice({ steps, currentStep, isActive, getToken }) {
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const cacheMapRef = useRef(new Map());
  const soundRef = useRef(null);
  const activeRef = useRef(false);

  // Load mute preference on mount
  useEffect(() => {
    SecureStore.getItemAsync(MUTE_KEY)
      .then((val) => {
        if (val === "true") setIsMuted(true);
      })
      .catch(() => {});
  }, []);

  // Configure audio mode when entering cooking mode
  useEffect(() => {
    if (isActive) {
      Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      }).catch(() => {});
    }
  }, [isActive]);

  // Track active state in ref for async callbacks
  useEffect(() => {
    activeRef.current = isActive;
  }, [isActive]);

  // Pre-generate all step audio when cooking mode activates
  useEffect(() => {
    if (!isActive || !steps?.length || !getToken) return;

    let cancelled = false;
    setIsLoading(true);

    generateStepAudio({ getToken, steps })
      .then((map) => {
        if (!cancelled) {
          cacheMapRef.current = map;
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isActive, steps, getToken]);

  // Stop + unload current sound helper
  const stopCurrent = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch {
        // ignore
      }
      soundRef.current = null;
      setIsPlaying(false);
    }
  }, []);

  // Play audio for current step whenever step changes
  useEffect(() => {
    if (!isActive) return;

    let cancelled = false;

    (async () => {
      await stopCurrent();

      if (isMuted) return;

      const uri = cacheMapRef.current.get(currentStep);
      if (!uri || cancelled) return;

      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true },
          (status) => {
            if (status.didJustFinish && !cancelled) {
              setIsPlaying(false);
              soundRef.current = null;
            }
          },
        );

        if (cancelled) {
          await sound.unloadAsync();
          return;
        }

        soundRef.current = sound;
        setIsPlaying(true);
      } catch {
        // Audio playback failed — non-critical
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isActive, currentStep, isMuted, isLoading, stopCurrent]);

  // Cleanup on deactivation
  useEffect(() => {
    if (!isActive) {
      stopCurrent();
      cacheMapRef.current = new Map();
    }
  }, [isActive, stopCurrent]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      SecureStore.setItemAsync(MUTE_KEY, String(next)).catch(() => {});
      if (next && soundRef.current) {
        soundRef.current.stopAsync().catch(() => {});
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
        setIsPlaying(false);
      }
      return next;
    });
  }, []);

  return { isMuted, toggleMute, isLoading, isPlaying };
}
