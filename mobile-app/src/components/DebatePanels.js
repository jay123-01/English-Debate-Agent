import { Pressable, Text, View } from "react-native";

export function ConversationPanel({ styles, turns }) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.sectionTitle}>Conversation</Text>
        <Text style={styles.badge}>{Math.floor(turns.length / 2)} turns</Text>
      </View>
      {turns.length === 0 ? (
        <Text style={styles.emptyText}>Your debate turns will appear here.</Text>
      ) : (
        turns.map((turn) => (
          <View key={turn.id} style={[styles.turnCard, turn.role === "agent" && styles.agentTurn]}>
            <Text style={styles.turnRole}>
              {turn.role === "agent" ? turn.personaName || "Debate Agent" : "You"}
            </Text>
            {turn.role === "agent" && turn.phase ? (
              <Text style={styles.phaseText}>{turn.phase}</Text>
            ) : null}
            <Text style={styles.turnText}>{turn.text}</Text>
            {turn.role === "agent" && turn.sourceContext?.length ? (
              <View style={styles.contextBox}>
                <Text style={styles.contextTitle}>Source used</Text>
                {turn.sourceContext.slice(0, 2).map((item) => (
                  <Text key={item.id} style={styles.contextText}>
                    {item.preview}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        ))
      )}
    </View>
  );
}

export function FeedbackPanel({ feedback, styles }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>Coach feedback</Text>
      <Metric label="Clarity" styles={styles} value={feedback.clarity} />
      <Metric label="Structure" styles={styles} value={feedback.structure} />
      <Metric label="Evidence" styles={styles} value={feedback.evidence} />
      <Metric label="Source use" styles={styles} value={feedback.sourceUse || 0} />
      <Text style={styles.tipText}>{feedback.tip}</Text>
      {feedback.argumentTip ? <Text style={styles.tipText}>{feedback.argumentTip}</Text> : null}
      {feedback.revisedSentence ? (
        <View style={styles.feedbackBox}>
          <Text style={styles.contextTitle}>Natural English</Text>
          <Text style={styles.contextText}>{feedback.revisedSentence}</Text>
        </View>
      ) : null}
      {feedback.sourceMove ? (
        <View style={styles.feedbackBox}>
          <Text style={styles.contextTitle}>Source move</Text>
          <Text style={styles.contextText}>{feedback.sourceMove}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function SessionSummaryPanel({
  disabled,
  onSummarize,
  sessionSummary,
  styles,
  turnCount,
}) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.sectionTitle}>Session summary</Text>
        <Pressable
          style={[styles.inlineButton, disabled && styles.disabledButton]}
          onPress={onSummarize}
          disabled={disabled}
        >
          <Text style={styles.inlineButtonText}>Summarize</Text>
        </Pressable>
      </View>
      {sessionSummary ? (
        <View style={styles.summaryStack}>
          <Text style={styles.turnText}>{sessionSummary.summary}</Text>
          <SummaryItem label="Strongest point" styles={styles} value={sessionSummary.strongestUserPoint} />
          <SummaryItem label="Weakest point" styles={styles} value={sessionSummary.weakestUserPoint} />
          <SummaryItem label="Language focus" styles={styles} value={sessionSummary.languageFocus} />
          <SummaryItem label="Next drill" styles={styles} value={sessionSummary.nextDrill} />
        </View>
      ) : (
        <Text style={styles.emptyText}>
          {turnCount < 2 ? "Finish a few turns, then summarize the session." : "Ready to summarize this session."}
        </Text>
      )}
    </View>
  );
}

export function LatencyPanel({ latency, styles }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>Latency trace</Text>
      {latency.length === 0 ? (
        <Text style={styles.emptyText}>No trace yet.</Text>
      ) : (
        latency.map((item) => (
          <View key={item.label} style={styles.latencyRow}>
            <Text style={styles.latencyLabel}>{item.label}</Text>
            <Text style={styles.latencyValue}>{item.ms} ms</Text>
          </View>
        ))
      )}
    </View>
  );
}

function Metric({ label, styles, value }) {
  return (
    <View style={styles.metric}>
      <View style={styles.metricTop}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricValue}>{value}/100</Text>
      </View>
      <View style={styles.meter}>
        <View style={[styles.meterFill, { width: `${value}%` }]} />
      </View>
    </View>
  );
}

function SummaryItem({ label, styles, value }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.contextTitle}>{label}</Text>
      <Text style={styles.contextText}>{value}</Text>
    </View>
  );
}
