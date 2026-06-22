import { useCallback, useEffect, useRef } from "react";
import * as Speech from "expo-speech";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";

export function useAgentSpeech({ onStatus }) {
  const playerRef = useRef(null);
  const subscriptionRef = useRef(null);

  const stop = useCallback(() => {
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
          });
          const player = createAudioPlayer({ uri: audioUrl }, { downloadFirst: true });
          playerRef.current = player;
          subscriptionRef.current = player.addListener?.("playbackStatusUpdate", (status) => {
            if (status.didJustFinish) {
              onStatus?.("Ready");
              subscriptionRef.current?.remove?.();
              subscriptionRef.current = null;
            }
          });
          onStatus?.(`${persona.name} speaking`);
          player.play();
          return;
        } catch {
          stop();
        }
      }

      Speech.speak(text, {
        language: "en-US",
        rate: persona.speech.rate,
        pitch: persona.speech.pitch,
        onStart: () => onStatus?.(`${persona.name} speaking`),
        onDone: () => onStatus?.("Ready"),
        onError: () => onStatus?.("Ready"),
      });
    },
    [onStatus, stop],
  );

  return {
    speak,
    stop,
  };
}
