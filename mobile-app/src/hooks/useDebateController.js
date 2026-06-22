import { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";

import {
  createSessionSummary,
  createSource,
  submitTextTurn,
  submitVoiceTurn,
} from "../api/debateApi";
import { debatePersonas, defaultPersonaId, getDebatePersona } from "../personas";
import { useAgentSpeech } from "./useAgentSpeech";
import { useVoiceRecorder } from "./useVoiceRecorder";

const fallbackMotions = [
  "Should AI be used in education?",
  "Should social media be regulated?",
  "Should schools replace exams with projects?",
  "Should remote work become the default?",
];

const levels = ["beginner", "intermediate", "advanced"];

const initialFeedback = {
  clarity: 0,
  structure: 0,
  evidence: 0,
  sourceUse: 0,
  tip: "Record your first argument to get feedback.",
};

export function useDebateController() {
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [sourceBrief, setSourceBrief] = useState(null);
  const [sourceError, setSourceError] = useState("");
  const [selectedMotion, setSelectedMotion] = useState("");
  const [stance, setStance] = useState("support");
  const [level, setLevel] = useState("intermediate");
  const [personaId, setPersonaId] = useState(defaultPersonaId);
  const [turns, setTurns] = useState([]);
  const [feedback, setFeedback] = useState(initialFeedback);
  const [sessionSummary, setSessionSummary] = useState(null);
  const [typedArgument, setTypedArgument] = useState("");
  const [status, setStatus] = useState("Ready");
  const [latency, setLatency] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingSource, setIsCreatingSource] = useState(false);

  const recentHistory = useMemo(() => turns.slice(-6), [turns]);
  const activeMotion = selectedMotion || sourceBrief?.debateMotions?.[0] || fallbackMotions[0];
  const aiStance = stance === "support" ? "oppose" : "support";
  const selectedPersona = useMemo(() => getDebatePersona(personaId), [personaId]);
  const agentSpeech = useAgentSpeech({ onStatus: setStatus });

  const handleAgentResult = useCallback(
    (result, userSource) => {
      const nextTurns = [
        ...turns,
        {
          id: `${Date.now()}-user`,
          role: "user",
          source: userSource,
          text: result.transcript,
        },
        {
          id: `${Date.now()}-agent`,
          role: "agent",
          source: result.mode,
          personaName: result.persona?.name || selectedPersona.name,
          phase: result.phase,
          text: result.reply,
          sourceContext: result.sourceContext || [],
        },
      ];

      setTurns(nextTurns.slice(-20));
      setFeedback(result.feedback || initialFeedback);
      setLatency(result.latency || []);
      setSessionSummary(null);
      agentSpeech.speak({
        text: result.reply,
        audioUrl: result.audioUrl,
        persona: selectedPersona,
      });
    },
    [agentSpeech, selectedPersona, turns],
  );

  const submitAudio = useCallback(
    async (audioUri) => {
      if (!audioUri || isSubmitting) {
        return;
      }

      setIsSubmitting(true);
      setStatus("Sending voice");

      try {
        const result = await submitVoiceTurn({
          audioUri,
          topic: activeMotion,
          stance,
          sourceId: sourceBrief?.sourceId,
          motion: activeMotion,
          userStance: stance,
          aiStance,
          level,
          personaId,
          history: recentHistory,
        });
        handleAgentResult(result, "voice");
      } catch (error) {
        Alert.alert("Voice turn failed", error.message);
        setStatus("Ready");
      } finally {
        setIsSubmitting(false);
      }
    },
    [activeMotion, aiStance, handleAgentResult, isSubmitting, level, personaId, recentHistory, sourceBrief?.sourceId, stance],
  );

  const recorder = useVoiceRecorder({
    onRecordingReady: submitAudio,
    onStatus: setStatus,
  });

  const createSourceBrief = async () => {
    const cleanText = sourceText.trim();
    if (cleanText.length < 80 || isCreatingSource) {
      setSourceError("Paste at least 80 characters to create a source brief.");
      return;
    }

    setIsCreatingSource(true);
    setSourceError("");
    setStatus("Creating source brief");

    try {
      const brief = await createSource({
        sourceType: "text",
        title: sourceTitle.trim() || "Practice source",
        text: cleanText,
      });
      setSourceBrief(brief);
      setSelectedMotion(brief.debateMotions?.[0] || "");
      setTurns([]);
      setFeedback(initialFeedback);
      setLatency([]);
      setSessionSummary(null);
      setStatus("Source ready");
    } catch (error) {
      setSourceError(error.message);
      setStatus("Ready");
    } finally {
      setIsCreatingSource(false);
    }
  };

  const submitTypedArgument = async () => {
    const cleanText = typedArgument.trim();
    if (!cleanText || isSubmitting) {
      return;
    }

    setTypedArgument("");
    setIsSubmitting(true);
    setStatus("Sending text");

    try {
      const result = await submitTextTurn({
        argument: cleanText,
        topic: activeMotion,
        stance,
        sourceId: sourceBrief?.sourceId,
        motion: activeMotion,
        userStance: stance,
        aiStance,
        level,
        personaId,
        history: recentHistory,
      });
      handleAgentResult(result, "typed");
    } catch (error) {
      Alert.alert("Text turn failed", error.message);
      setStatus("Ready");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleRecording = () => {
    if (isSubmitting) {
      return;
    }

    if (recorder.isRecording) {
      recorder.stopRecording();
      return;
    }

    recorder.startRecording();
  };

  const clearSession = () => {
    agentSpeech.stop();
    setTurns([]);
    setLatency([]);
    setFeedback(initialFeedback);
    setSessionSummary(null);
    setStatus("Ready");
  };

  const summarizeSession = async () => {
    if (turns.length < 2 || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setStatus("Summarizing session");

    try {
      const summary = await createSessionSummary({
        topic: activeMotion,
        motion: activeMotion,
        stance,
        userStance: stance,
        aiStance,
        sourceTitle: sourceBrief?.title,
        history: turns,
      });
      setSessionSummary(summary);
      setStatus("Ready");
    } catch (error) {
      Alert.alert("Summary failed", error.message);
      setStatus("Ready");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    activeMotion,
    aiStance,
    clearSession,
    createSourceBrief,
    debatePersonas,
    fallbackMotions,
    feedback,
    isCreatingSource,
    isSubmitting,
    latency,
    level,
    levels,
    personaId,
    recorder,
    sessionSummary,
    setLevel,
    setPersonaId,
    setSelectedMotion,
    setSourceText,
    setSourceTitle,
    setStance,
    setTypedArgument,
    sourceBrief,
    sourceError,
    sourceText,
    sourceTitle,
    stance,
    status,
    submitTypedArgument,
    summarizeSession,
    toggleRecording,
    turns,
    typedArgument,
  };
}
