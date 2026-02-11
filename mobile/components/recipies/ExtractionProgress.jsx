import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";

const STEPS = [
  { label: "Setting up the kitchen", threshold: 0 },
  { label: "Collecting the ingredients", threshold: 15 },
  { label: "Preparing the recipe", threshold: 30 },
  { label: "Putting it into steps", threshold: 50 },
  { label: "Adding the final touches", threshold: 70 },
  { label: "Almost ready to cook", threshold: 90 },
];

function getActiveIndex(progress) {
  let idx = 0;
  for (let i = STEPS.length - 1; i >= 0; i--) {
    if (progress >= STEPS[i].threshold) {
      idx = i;
      break;
    }
  }
  return idx;
}

function PulsingDot() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 2.2,
            duration: 900,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 900,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.4,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.pulseRing,
        { transform: [{ scale }], opacity },
      ]}
    />
  );
}

function StepRow({ label, state, isLast }) {
  const fadeAnim = useRef(new Animated.Value(state === "pending" ? 0.35 : 1)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: state === "pending" ? 0.35 : 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [state]);

  return (
    <Animated.View style={[styles.stepRow, { opacity: fadeAnim }]}>
      <View style={styles.stepIndicatorCol}>
        <View style={styles.dotWrap}>
          {state === "active" && <PulsingDot />}
          <View
            style={[
              styles.dot,
              state === "done" && styles.dotDone,
              state === "active" && styles.dotActive,
            ]}
          >
            {state === "done" && (
              <Text style={styles.checkmark}>{"\u2713"}</Text>
            )}
          </View>
        </View>
        {!isLast && (
          <View
            style={[
              styles.line,
              state === "done" && styles.lineDone,
            ]}
          />
        )}
      </View>
      <View style={styles.stepContent}>
        <Text
          style={[
            styles.stepLabel,
            state === "active" && styles.stepLabelActive,
            state === "done" && styles.stepLabelDone,
          ]}
        >
          {label}{state === "active" ? "…" : ""}
        </Text>
      </View>
    </Animated.View>
  );
}

export default function ExtractionProgress({ progress = 0 }) {
  const activeIndex = getActiveIndex(progress);
  const barWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barWidth, {
      toValue: Math.min(progress, 100),
      duration: 500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <View style={styles.container}>
      <View style={styles.heroWrap}>
        <Text style={styles.heroEmoji}>{activeIndex < 3 ? "\uD83D\uDC68\u200D\uD83C\uDF73" : "\uD83C\uDF73"}</Text>
      </View>

      <Text style={styles.title}>Cooking up your recipe</Text>
      <Text style={styles.subtitle}>This usually takes 2–3 minutes</Text>

      {/* Progress bar */}
      <View style={styles.progressBarTrack}>
        <Animated.View
          style={[
            styles.progressBarFill,
            {
              width: barWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>

      {/* Timeline */}
      <View style={styles.timeline}>
        {STEPS.map((step, i) => {
          let state = "pending";
          if (i < activeIndex) state = "done";
          else if (i === activeIndex) state = "active";

          return (
            <StepRow
              key={i}
              label={step.label}
              state={state}
              isLast={i === STEPS.length - 1}
            />
          );
        })}
      </View>
    </View>
  );
}

const DOT_SIZE = 24;
const LINE_WIDTH = 2;

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingTop: 10,
  },
  heroWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#DFF7C4",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  heroEmoji: {
    fontSize: 34,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    color: "#111111",
    letterSpacing: -0.3,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "#B4B4B4",
    letterSpacing: -0.05,
  },
  // Progress bar
  progressBarTrack: {
    width: "100%",
    height: 4,
    backgroundColor: "#EAEAEA",
    borderRadius: 2,
    marginTop: 24,
    marginBottom: 28,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#7FEF80",
    borderRadius: 2,
  },
  // Timeline
  timeline: {
    alignSelf: "stretch",
  },
  stepRow: {
    flexDirection: "row",
    minHeight: 48,
  },
  stepIndicatorCol: {
    width: DOT_SIZE,
    alignItems: "center",
  },
  dotWrap: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: "#EAEAEA",
    alignItems: "center",
    justifyContent: "center",
  },
  dotActive: {
    backgroundColor: "#7FEF80",
  },
  dotDone: {
    backgroundColor: "#385225",
  },
  pulseRing: {
    position: "absolute",
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: "#7FEF80",
  },
  checkmark: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#ffffff",
    marginTop: -1,
  },
  line: {
    flex: 1,
    width: LINE_WIDTH,
    backgroundColor: "#EAEAEA",
    minHeight: 24,
  },
  lineDone: {
    backgroundColor: "#385225",
  },
  stepContent: {
    flex: 1,
    marginLeft: 14,
    justifyContent: "center",
    paddingBottom: 24,
  },
  stepLabel: {
    fontSize: 15,
    color: "#B4B4B4",
    letterSpacing: -0.1,
  },
  stepLabelActive: {
    color: "#111111",
    fontWeight: "600",
  },
  stepLabelDone: {
    color: "#385225",
    fontWeight: "500",
  },
});
