import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
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

export default function StepTimerSheet({ onBack, onStart, onWatch, onPrev, onNext }) {
  return (
    <View style={s.container}>
      {/* Back */}
      <Pressable style={s.backBtn} onPress={onBack}>
        <Text style={s.backIcon}>←</Text>
        <Text style={s.backText}>Back</Text>
      </Pressable>

      {/* Title */}
      <Text style={s.title}>Heat olive oil in a pan{"\n"}over medium heat.</Text>
      <Text style={s.subtitle}>Sauté - Medium heat</Text>

      {/* Timer Card */}
      <View style={s.timerCard}>
        <ProgressRing progress={0.65} />
        <Text style={s.timerText}>04:00</Text>
      </View>

      {/* Action buttons */}
      <Pressable style={s.secondaryBtn} onPress={onStart}>
        <Text style={s.secondaryText}>▶  Start timer</Text>
      </Pressable>

      <Pressable style={s.secondaryBtn} onPress={onWatch}>
        <Text style={s.secondaryText}>🖥  Watch this step</Text>
      </Pressable>

      {/* Bottom nav */}
      <View style={s.bottomNav}>
        <Pressable style={s.prevBtn} onPress={onPrev}>
          <Text style={s.prevText}>‹  Previous</Text>
        </Pressable>
        <Pressable style={s.nextBtn} onPress={onNext}>
          <Text style={s.nextText}>Next  ›</Text>
        </Pressable>
      </View>
    </View>
  );
}

// Simple static ring
function ProgressRing({ progress = 0.6 }) {
  const size = 220;
  const strokeWidth = 12;
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backBtn: {
    alignSelf: "flex-start",
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
  title: {
    marginTop: 18,
    fontSize: 28,
    fontFamily: FONT.semibold,
    color: C.text,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: FONT.regular,
    color: C.muted,
    marginTop: 6,
  },

  timerCard: {
    marginTop: 22,
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

  secondaryBtn: {
    marginTop: 14,
    backgroundColor: "#F0F0F0",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  secondaryText: {
    fontSize: 15,
    fontFamily: FONT.medium,
    color: C.greenDark,
  },

  bottomNav: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  prevBtn: {
    flex: 1,
    backgroundColor: "#F0F0F0",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  prevText: {
    fontSize: 15,
    fontFamily: FONT.medium,
    color: C.greenDark,
  },
  nextBtn: {
    flex: 1,
    backgroundColor: C.green,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
  },
  nextText: {
    fontSize: 15,
    fontFamily: FONT.semibold,
    color: C.greenDark,
  },
});
