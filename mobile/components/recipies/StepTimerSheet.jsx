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

  // Build subtitle from technique + temperature
  const subtitleParts = [];
  if (step?.technique) subtitleParts.push(step.technique);
  if (step?.temperature) subtitleParts.push(step.temperature);
  const subtitle = subtitleParts.join("  ·  ");

  // Timer progress
  const progress =
    hasDuration && timerSeconds != null
      ? timerSeconds / step.durationSeconds
      : 1;

  return (
    <View style={s.container}>
      {/* Top bar */}
      <View style={s.topBar}>
        <Pressable style={s.backBtn} onPress={onBack}>
          <Text style={s.backIcon}>←</Text>
          <Text style={s.backText}>Back</Text>
        </Pressable>
        <View style={s.stepCounterPill}>
          <Text style={s.stepCounterText}>
            {currentStep + 1} / {totalSteps}
          </Text>
        </View>
      </View>

      {/* Scrollable content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
        style={s.scrollView}
      >
        {/* Instruction */}
        <Text style={s.instruction}>{step?.instruction}</Text>
        {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}

        {/* Timer Card — only if step has explicit duration */}
        {hasDuration ? (
          <View style={s.timerSection}>
            <View style={s.timerCard}>
              <ProgressRing progress={progress} />
              <Text style={s.timerText}>{formatTimer(timerSeconds)}</Text>
            </View>

            <Pressable
              style={[s.timerBtn, timerRunning && s.timerBtnActive]}
              onPress={onStartTimer}
            >
              <Text style={[s.timerBtnText, timerRunning && s.timerBtnTextActive]}>
                {timerRunning ? "⏸" : "▶"}{"  "}
                {getTimerButtonLabel(timerRunning, timerSeconds)}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      {/* Bottom nav — pinned */}
      <View style={s.bottomNav}>
        <Pressable
          style={[s.prevBtn, isFirstStep && s.btnDisabled]}
          onPress={onPrev}
          disabled={isFirstStep}
        >
          <Text style={[s.prevText, isFirstStep && s.textDisabled]}>
            ‹  Previous
          </Text>
        </Pressable>
        <Pressable style={s.nextBtn} onPress={onNext}>
          <Text style={s.nextText}>{isLastStep ? "Finish" : "Next  ›"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ProgressRing({ progress = 1 }) {
  const size = 200;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <Svg width={size} height={size}>
      <Circle
        stroke="#E6E6E6"
        fill="none"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={strokeWidth}
      />
      <Circle
        stroke={C.green}
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  backIcon: {
    fontSize: 14,
    color: C.muted,
    marginRight: 8,
  },
  backText: {
    fontSize: 14,
    fontFamily: FONT.medium,
    color: C.muted,
  },
  stepCounterPill: {
    backgroundColor: "#fff",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  stepCounterText: {
    fontSize: 13,
    fontFamily: FONT.semibold,
    color: C.text,
    letterSpacing: -0.05,
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  instruction: {
    fontSize: 22,
    fontFamily: FONT.semibold,
    color: C.text,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: FONT.regular,
    color: C.muted,
    marginTop: 8,
    textTransform: "capitalize",
  },

  timerSection: {
    marginTop: 28,
  },
  timerCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  timerText: {
    position: "absolute",
    fontSize: 34,
    fontFamily: FONT.semibold,
    color: C.text,
  },

  timerBtn: {
    marginTop: 14,
    backgroundColor: "#F0F0F0",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  timerBtnActive: {
    backgroundColor: "#FFF3E0",
  },
  timerBtnText: {
    fontSize: 15,
    fontFamily: FONT.medium,
    color: C.greenDark,
  },
  timerBtnTextActive: {
    color: "#E8845C",
  },

  bottomNav: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  prevBtn: {
    flex: 1,
    backgroundColor: "#F0F0F0",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  btnDisabled: {
    opacity: 0.35,
  },
  prevText: {
    fontSize: 15,
    fontFamily: FONT.medium,
    color: C.greenDark,
  },
  textDisabled: {
    color: C.muted,
  },
  nextBtn: {
    flex: 1,
    backgroundColor: C.green,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
  },
  nextText: {
    fontSize: 15,
    fontFamily: FONT.semibold,
    color: C.greenDark,
  },
});
