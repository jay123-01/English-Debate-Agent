import {
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";

import {
  ConversationPanel,
  FeedbackPanel,
  LatencyPanel,
  SessionSummaryPanel,
} from "./src/components/DebatePanels";
import {
  DebateSetupPanel,
  SourceBriefPanel,
  SourceImportPanel,
  StagePanel,
  TextFallbackPanel,
} from "./src/components/SetupPanels";
import { useDebateController } from "./src/hooks/useDebateController";
import { styles } from "./src/styles";

export default function App() {
  const debate = useDebateController();
  const {
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
  } = debate;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.app}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Voice AI Agent</Text>
            <Text style={styles.title}>Voice Debate Lab</Text>
          </View>
          <Pressable style={styles.clearButton} onPress={clearSession}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <SourceImportPanel
            isCreatingSource={isCreatingSource}
            onCreateSource={createSourceBrief}
            setSourceText={setSourceText}
            setSourceTitle={setSourceTitle}
            sourceError={sourceError}
            sourceText={sourceText}
            sourceTitle={sourceTitle}
            styles={styles}
          />
          <SourceBriefPanel sourceBrief={sourceBrief} styles={styles} />
          <DebateSetupPanel
            activeMotion={activeMotion}
            aiStance={aiStance}
            debatePersonas={debatePersonas}
            fallbackMotions={fallbackMotions}
            level={level}
            levels={levels}
            onSetLevel={setLevel}
            onSetPersonaId={setPersonaId}
            onSetSelectedMotion={setSelectedMotion}
            onSetStance={setStance}
            personaId={personaId}
            sourceBrief={sourceBrief}
            stance={stance}
            styles={styles}
          />
          <StagePanel
            isSubmitting={isSubmitting}
            onToggleRecording={toggleRecording}
            recorder={recorder}
            status={status}
            styles={styles}
          />
          <TextFallbackPanel
            onSetTypedArgument={setTypedArgument}
            onSubmitTypedArgument={submitTypedArgument}
            styles={styles}
            typedArgument={typedArgument}
          />
          <ConversationPanel styles={styles} turns={turns} />
          <FeedbackPanel feedback={feedback} styles={styles} />
          <SessionSummaryPanel
            disabled={turns.length < 2 || isSubmitting}
            onSummarize={summarizeSession}
            sessionSummary={sessionSummary}
            styles={styles}
            turnCount={turns.length}
          />
          <LatencyPanel latency={latency} styles={styles} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
