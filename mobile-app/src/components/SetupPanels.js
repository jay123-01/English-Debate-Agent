import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { colors } from "../theme";

export function SourceImportPanel({
  isCreatingSource,
  onCreateSource,
  setSourceText,
  setSourceTitle,
  sourceError,
  sourceText,
  sourceTitle,
  styles,
}) {
  return (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>Import source</Text>
      <TextInput
        value={sourceTitle}
        onChangeText={setSourceTitle}
        placeholder="Optional title"
        placeholderTextColor={colors.muted}
        style={[styles.textInput, styles.titleInput]}
      />
      <TextInput
        multiline
        value={sourceText}
        onChangeText={setSourceText}
        placeholder="Paste an article, prompt, transcript, or notes you want to debate."
        placeholderTextColor={colors.muted}
        style={[styles.textInput, styles.sourceInput]}
      />
      {sourceError ? <Text style={styles.errorText}>{sourceError}</Text> : null}
      <Pressable
        style={[styles.submitButton, isCreatingSource && styles.disabledButton]}
        onPress={onCreateSource}
        disabled={isCreatingSource}
      >
        {isCreatingSource ? (
          <ActivityIndicator color={colors.surface} />
        ) : (
          <Text style={styles.submitButtonText}>Create source brief</Text>
        )}
      </Pressable>
    </View>
  );
}

export function SourceBriefPanel({ sourceBrief, styles }) {
  if (!sourceBrief) {
    return null;
  }

  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.sectionTitle}>Source brief</Text>
        <Text style={styles.badge}>{sourceBrief.chunkCount} chunks</Text>
      </View>
      <Text style={styles.briefTitle}>{sourceBrief.title}</Text>
      <Text style={styles.turnText}>{sourceBrief.summary}</Text>

      <Text style={styles.subsectionTitle}>Key claims</Text>
      {sourceBrief.keyClaims.map((claim) => (
        <Text key={claim} style={styles.listText}>
          - {claim}
        </Text>
      ))}

      <Text style={styles.subsectionTitle}>Useful vocabulary</Text>
      <View style={styles.wrapRow}>
        {sourceBrief.usefulVocabulary.map((word) => (
          <Text key={word} style={styles.smallChip}>
            {word}
          </Text>
        ))}
      </View>
    </View>
  );
}

export function DebateSetupPanel({
  activeMotion,
  aiStance,
  debatePersonas,
  fallbackMotions,
  level,
  levels,
  onSetLevel,
  onSetPersonaId,
  onSetSelectedMotion,
  onSetStance,
  personaId,
  sourceBrief,
  stance,
  styles,
}) {
  const motions = sourceBrief?.debateMotions || fallbackMotions;

  return (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>Debate setup</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.topicRow}>
          {motions.map((item) => (
            <Pressable
              key={item}
              onPress={() => onSetSelectedMotion(item)}
              style={[styles.topicChip, activeMotion === item && styles.topicChipActive]}
            >
              <Text style={[styles.topicChipText, activeMotion === item && styles.topicChipTextActive]}>
                {item}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Text style={styles.subsectionTitle}>Opponent</Text>
      <View style={styles.personaRow}>
        {debatePersonas.map((persona) => {
          const isActive = personaId === persona.id;

          return (
            <Pressable
              key={persona.id}
              onPress={() => onSetPersonaId(persona.id)}
              style={[styles.personaCard, isActive && styles.personaCardActive]}
            >
              <View style={styles.personaHeader}>
                <Text style={[styles.personaName, isActive && styles.personaNameActive]}>
                  {persona.name}
                </Text>
                <Text style={[styles.personaGender, isActive && styles.personaGenderActive]}>
                  {persona.gender}
                </Text>
              </View>
              <Text style={[styles.personaLabel, isActive && styles.personaLabelActive]}>
                {persona.label}
              </Text>
              <Text style={[styles.personaDescription, isActive && styles.personaDescriptionActive]}>
                {persona.description}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.segmented}>
        <Pressable
          onPress={() => onSetStance("support")}
          style={[styles.segment, stance === "support" && styles.segmentActive]}
        >
          <Text style={[styles.segmentText, stance === "support" && styles.segmentTextActive]}>
            Support
          </Text>
        </Pressable>
        <Pressable
          onPress={() => onSetStance("oppose")}
          style={[styles.segment, stance === "oppose" && styles.segmentActive]}
        >
          <Text style={[styles.segmentText, stance === "oppose" && styles.segmentTextActive]}>
            Oppose
          </Text>
        </Pressable>
      </View>
      <View style={styles.stanceLine}>
        <Text style={styles.stanceLabel}>AI stance</Text>
        <Text style={styles.stanceValue}>{aiStance}</Text>
      </View>

      <View style={styles.levelRow}>
        {levels.map((item) => (
          <Pressable
            key={item}
            onPress={() => onSetLevel(item)}
            style={[styles.levelChip, level === item && styles.levelChipActive]}
          >
            <Text style={[styles.levelChipText, level === item && styles.levelChipTextActive]}>
              {item}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function StagePanel({ isSubmitting, onToggleRecording, recorder, status, styles }) {
  return (
    <View style={styles.stage}>
      <Text style={styles.stageStatus}>{status}</Text>
      <View style={[styles.wave, recorder.isRecording && styles.waveActive]}>
        <View style={styles.waveBar} />
        <View style={[styles.waveBar, styles.waveBarTall]} />
        <View style={styles.waveBar} />
        <View style={[styles.waveBar, styles.waveBarTall]} />
        <View style={styles.waveBar} />
      </View>

      <Pressable
        onPress={onToggleRecording}
        style={[
          styles.recordButton,
          recorder.isRecording && styles.recordButtonActive,
          isSubmitting && styles.recordButtonDisabled,
        ]}
      >
        {isSubmitting ? (
          <ActivityIndicator color={colors.onInk} />
        ) : (
          <Text style={styles.recordButtonText}>{recorder.isRecording ? "Stop" : "Record"}</Text>
        )}
      </Pressable>
    </View>
  );
}

export function TextFallbackPanel({
  onSetTypedArgument,
  onSubmitTypedArgument,
  styles,
  typedArgument,
}) {
  return (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>Text fallback</Text>
      <TextInput
        multiline
        value={typedArgument}
        onChangeText={onSetTypedArgument}
        placeholder="Type your English argument here."
        placeholderTextColor={colors.muted}
        style={styles.textInput}
      />
      <Pressable style={styles.submitButton} onPress={onSubmitTypedArgument}>
        <Text style={styles.submitButtonText}>Send argument</Text>
      </Pressable>
    </View>
  );
}
