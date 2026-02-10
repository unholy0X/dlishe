import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import Svg, { Circle } from "react-native-svg";

const C = {
  bg: "#F4F5F7",
  card: "#ffffff",
  text: "#111111",
  muted: "#B4B4B4",
  green: "#7FEF80",
  greenDark: "#385225",
  greenLight: "#DFF7C4",
  border: "#EAEAEA",
};

const FONT = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
};

function formatTimer(seconds) {
  if (seconds == null || seconds < 0) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDurationHint(seconds) {
  if (!seconds || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return s ? `${m}m ${s}s` : `${m} min`;
}

function getTimerButtonLabel(timerRunning, timerSeconds) {
  if (timerRunning) return "Pause";
  if (timerSeconds != null && timerSeconds > 0) return "Resume";
  return "Start timer";
}

export default function StepTimerSheet({
  step,
  currentStep,
  totalSteps,
  timerSeconds,
  timerRunning,
  onBack,
  onStartTimer,
  onPrev,
  onNext,
}) {
  const hasDuration = step?.durationSeconds > 0;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  // Build chips
  const chips = [];
  if (step?.technique) chips.push(step.technique);
  if (step?.temperature) chips.push(step.temperature);

  // Timer display value: show initial duration before start, then live countdown
  const displaySeconds = timerSeconds ?? (hasDuration ? step.durationSeconds : 0);

  // Timer progress
  const progress =
    hasDuration && displaySeconds != null
      ? displaySeconds / step.durationSeconds
      : 1;

  return (
    <View style={s.container}>
      {/* Top bar */}
      <View style={s.topBar}>
        <Pressable style={s.backBtn} onPress={onBack}>
          <Text style={s.backIcon}>←</Text>
          <Text style={s.backText}>Back</Text>
        </Pressable>
        <View style={s.stepPill}>
          <Text style={s.stepPillText}>
            Step {currentStep + 1} of {totalSteps}
          </Text>
        </View>
      </View>

      {/* Center content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          s.scrollContent,
          !hasDuration && s.scrollContentCentered,
        ]}
        style={s.scrollView}
      >
        {/* Instruction card */}
        <View style={s.instructionCard}>
          <View style={s.stepBadge}>
            <Text style={s.stepBadgeText}>{currentStep + 1}</Text>
          </View>

          <Text style={s.instructionText}>{step?.instruction}</Text>

          {(chips.length > 0 || hasDuration) ? (
            <View style={s.chipsRow}>
              {chips.map((chip, i) => (
                <View key={i} style={s.chip}>
                  <Text style={s.chipText}>{chip}</Text>
                </View>
              ))}
              {hasDuration ? (
                <View style={s.chipDuration}>
                  <Text style={s.chipDurationText}>
                    ⏱ {formatDurationHint(step.durationSeconds)}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {step?.tip ? (
            <View style={s.tipBanner}>
              <Text style={s.tipText}>{step.tip}</Text>
            </View>
          ) : null}
        </View>

        {/* Timer section — only if step has a real duration */}
        {hasDuration ? (
          <View style={s.timerCard}>
            <View style={s.timerRow}>
              <View style={s.timerRingWrap}>
                <ProgressRing progress={progress} running={timerRunning} />
                <Text style={s.timerRingTime}>{formatTimer(displaySeconds)}</Text>
              </View>
              <View style={s.timerInfo}>
                <Text style={s.timerLabel}>
                  {timerRunning
                    ? "Counting down…"
                    : timerSeconds === 0
                    ? "Timer done!"
                    : `${formatDurationHint(step.durationSeconds)} for this step`}
                </Text>
                <Pressable
                  style={[
                    s.timerBtn,
                    timerRunning && s.timerBtnPause,
                    timerSeconds === 0 && !timerRunning && s.timerBtnReset,
                  ]}
                  onPress={onStartTimer}
                >
                  <Text
                    style={[
                      s.timerBtnText,
                      timerRunning && s.timerBtnTextPause,
                    ]}
                  >
                    {getTimerButtonLabel(timerRunning, timerSeconds)}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {/* Bottom nav — pinned */}
      <View style={s.bottomNav}>
        <Pressable
          style={[s.navBtn, s.navBtnPrev, isFirstStep && s.navBtnDisabled]}
          onPress={onPrev}
          disabled={isFirstStep}
        >
          <Text style={[s.navBtnPrevText, isFirstStep && s.navBtnTextDisabled]}>
            ‹  Previous
          </Text>
        </Pressable>
        <Pressable style={[s.navBtn, s.navBtnNext]} onPress={onNext}>
          <Text style={s.navBtnNextText}>
            {isLastStep ? "Finish" : "Next  ›"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function ProgressRing({ progress = 1, running }) {
  const size = 80;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <Svg width={size} height={size}>
      <Circle
        stroke="#EFEFEF"
        fill="none"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
      />
      <Circle
        stroke={running ? C.green : C.greenLight}
        fill="none"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
        strokeDasharray={`${circumference} ${circumference}`}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        rotation="-90"
        origin={`${size / 2}, ${size / 2}`}
      />
    </Svg>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // ─── Top bar ──────────────────────────────────
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  backIcon: {
    fontSize: 14,
    color: C.muted,
    marginRight: 6,
  },
  backText: {
    fontSize: 13,
    fontFamily: FONT.medium,
    color: C.muted,
  },
  stepPill: {
    backgroundColor: C.card,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  stepPillText: {
    fontSize: 13,
    fontFamily: FONT.medium,
    color: C.muted,
    letterSpacing: -0.05,
  },

  // ─── Scroll content ───────────────────────────
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  scrollContentCentered: {
    flexGrow: 1,
    justifyContent: "center",
    paddingTop: 0,
  },

  // ─── Instruction card ─────────────────────────
  instructionCard: {
    backgroundColor: C.card,
    borderRadius: 24,
    padding: 24,
  },
  stepBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.greenLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  stepBadgeText: {
    fontSize: 15,
    fontFamily: FONT.semibold,
    color: C.greenDark,
  },
  instructionText: {
    fontSize: 17,
    fontFamily: FONT.regular,
    color: C.text,
    lineHeight: 26,
    letterSpacing: -0.1,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 18,
  },
  chip: {
    backgroundColor: C.bg,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 12,
    fontFamily: FONT.medium,
    color: C.muted,
    textTransform: "capitalize",
    letterSpacing: -0.05,
  },
  chipDuration: {
    backgroundColor: C.greenLight,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipDurationText: {
    fontSize: 12,
    fontFamily: FONT.semibold,
    color: C.greenDark,
    letterSpacing: -0.05,
  },
  tipBanner: {
    backgroundColor: "#FFF9F0",
    borderLeftWidth: 3,
    borderLeftColor: "#FDC597",
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  tipText: {
    fontSize: 13,
    fontFamily: FONT.regular,
    color: "#7A4A21",
    fontStyle: "italic",
    lineHeight: 19,
  },

  // ─── Timer card ───────────────────────────────
  timerCard: {
    backgroundColor: C.card,
    borderRadius: 24,
    padding: 20,
    marginTop: 16,
  },
  timerRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  timerRingWrap: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 18,
  },
  timerRingTime: {
    position: "absolute",
    fontSize: 16,
    fontFamily: FONT.semibold,
    color: C.text,
  },
  timerInfo: {
    flex: 1,
  },
  timerLabel: {
    fontSize: 13,
    fontFamily: FONT.regular,
    color: C.muted,
    marginBottom: 10,
    lineHeight: 18,
  },
  timerBtn: {
    backgroundColor: C.greenLight,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: "flex-start",
    alignItems: "center",
  },
  timerBtnPause: {
    backgroundColor: "#FFF3E0",
  },
  timerBtnReset: {
    backgroundColor: C.greenLight,
  },
  timerBtnText: {
    fontSize: 14,
    fontFamily: FONT.semibold,
    color: C.greenDark,
  },
  timerBtnTextPause: {
    color: "#C17A4E",
  },

  // ─── Bottom nav ───────────────────────────────
  bottomNav: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: "row",
    gap: 12,
  },
  navBtn: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: "center",
  },
  navBtnPrev: {
    backgroundColor: C.card,
  },
  navBtnNext: {
    backgroundColor: C.green,
  },
  navBtnDisabled: {
    opacity: 0.35,
  },
  navBtnPrevText: {
    fontSize: 15,
    fontFamily: FONT.medium,
    color: C.greenDark,
  },
  navBtnTextDisabled: {
    color: C.muted,
  },
  navBtnNextText: {
    fontSize: 15,
    fontFamily: FONT.semibold,
    color: C.greenDark,
  },
});
