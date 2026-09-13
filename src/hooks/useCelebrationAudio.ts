import { useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CelebrationSlideItem } from '../services/celebrationTypes';

export const BIRTHDAY_SOUND_SETTING_KEY = 'birthday_celebration_sound_enabled';

const playedThisSession = new Set<string>();

export function selectCelebrationAudioEvent(slides: CelebrationSlideItem[]) {
  return slides.find(
    (slide) => slide.slide_type === 'CELEBRATION' && slide.audio?.enabled && slide.audio?.event_key,
  ) || null;
}

/**
 * Manages once-per-day celebration audio playback for eligible birthday slides.
 */
export function useCelebrationAudio(slides: CelebrationSlideItem[]) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const attemptedKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const celebrationSlide = selectCelebrationAudioEvent(slides);
    if (!celebrationSlide?.audio?.event_key) return;

    const eventKey = celebrationSlide.audio.event_key;
    if (attemptedKeysRef.current.has(eventKey) || playedThisSession.has(eventKey)) {
      return;
    }

    let isCancelled = false;
    attemptedKeysRef.current.add(eventKey);

    async function attemptPlayback() {
      try {
        const userPref = await AsyncStorage.getItem(BIRTHDAY_SOUND_SETTING_KEY);
        if (userPref === 'false') return;

        const alreadyPlayed = await AsyncStorage.getItem(eventKey);
        if (alreadyPlayed === 'played') {
          playedThisSession.add(eventKey);
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 700));
        if (isCancelled) return;

        await AsyncStorage.setItem(eventKey, 'played');
        playedThisSession.add(eventKey);

        try {
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: true,
          });
        } catch {
          // Audio mode configuration is non-fatal
        }

        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/sounds/birthday-celebration.wav'),
          { shouldPlay: true, volume: 0.85 },
        );

        soundRef.current = sound;
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            void sound.unloadAsync().catch(() => {});
            soundRef.current = null;
          }
        });
      } catch (err) {
        console.warn('birthday_audio_playback_failed', err);
      }
    }

    void attemptPlayback();

    return () => {
      isCancelled = true;
      if (soundRef.current) {
        void soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, [slides]);
}
