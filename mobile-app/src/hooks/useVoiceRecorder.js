import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";

export function useVoiceRecorder({ onRecordingReady, onStatus }) {
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function preparePermissions() {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!mounted) {
        return;
      }

      setPermissionGranted(Boolean(status.granted));
      if (!status.granted) {
        Alert.alert("Microphone permission", "Microphone access is needed for voice debate.");
      }

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
    }

    preparePermissions().catch(() => {
      onStatus?.("Mic permission error");
    });

    return () => {
      mounted = false;
    };
  }, [onStatus]);

  const startRecording = useCallback(async () => {
    const status = permissionGranted
      ? { granted: true }
      : await AudioModule.requestRecordingPermissionsAsync();

    if (!status.granted) {
      setPermissionGranted(false);
      onStatus?.("Mic permission denied");
      return;
    }

    setPermissionGranted(true);
    onStatus?.("Recording");

    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: true,
    });

    await audioRecorder.prepareToRecordAsync();
    audioRecorder.record();
  }, [audioRecorder, onStatus, permissionGranted]);

  const stopRecording = useCallback(async () => {
    if (!recorderState.isRecording) {
      return;
    }

    onStatus?.("Processing voice");
    await audioRecorder.stop();

    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,
    });

    if (audioRecorder.uri) {
      onRecordingReady?.(audioRecorder.uri);
    } else {
      onStatus?.("No recording captured");
    }
  }, [audioRecorder, onRecordingReady, onStatus, recorderState.isRecording]);

  return {
    isRecording: recorderState.isRecording,
    permissionGranted,
    startRecording,
    stopRecording,
  };
}
