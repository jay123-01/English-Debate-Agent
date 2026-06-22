import { useCallback, useEffect, useRef } from "react";
import * as Speech from "expo-speech";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";

export function useAgentSpeech({ onStatus }) {
  const playerRef = useRef(null);
  const subscriptionRef = useRef(null);
  const fallbackTimerRef = useRef(null);

  const stop = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    Speech.stop();
    subscriptionRef.current?.remove?.();
    subscriptionRef.current = null;
    playerRef.current?.pause?.();
    playerRef.current?.remove?.();
    playerRef.current = null;
  }, []);

  useEffect(() => stop, [stop]);

  const speak = useCallback(
    async ({ text, audioUrl, persona }) => {
      stop();

      if (audioUrl) {
        try {
          await setAudioModeAsync({
            playsInSilentMode: true,
            allowsRecording: false,
            shouldPlayInBackground: false,
            interruptionMode: "doNotMix",
          });
          const player = createAudioPlayer(audioUrl, { updateInterval: 250 });
          playerRef.current = player;
          let playbackStarted = false;
          let playbackFinished = false;
          subscriptionRef.current = player.addListener?.("playbackStatusUpdate", (status) => {
            if (status.playing || status.currentTime > 0) {
              playbackStarted = true;
            }
            if (status.didJustFinish) {
              playbackFinished = true;
              onStatus?.("Ready");
              subscriptionRef.current?.remove?.();
              subscriptionRef.current = null;
            }
          });
          fallbackTimerRef.current = setTimeout(() => {
            fallbackTimerRef.current = null;
            if (!playbackStarted && !playbackFinished) {
              stop();
              speakWithDeviceVoice({ text, persona, onStatus });
            }
          }, 2500);
          onStatus?.(`${persona.name} speaking`);
          player.play();
          return;
        } catch {
          stop();
          speakWithDeviceVoice({ text, persona, onStatus });
          return;
        }
      }

      speakWithDeviceVoice({ text, persona, onStatus });
    },
    [onStatus, stop],
  );

  return {
    speak,
    stop,
  };
}

function speakWithDeviceVoice({ text, persona, onStatus }) {
  Speech.speak(text, {
    language: "en-US",
    rate: persona.speech.rate,
    pitch: persona.speech.pitch,
    onStart: () => onStatus?.(`${persona.name} speaking`),
    onDone: () => onStatus?.("Ready"),
    onError: () => onStatus?.("Ready"),
  });
}
