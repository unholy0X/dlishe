import React, { useEffect, useRef, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Animated, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useLanguageStore } from "../../store/languageStore";
import { getFontFamily } from "../../utils/fonts";

const C = {
  text: "#111111",
  muted: "#B4B4B4",
  green: "#7FEF80",
  greenDark: "#385225",
  greenLight: "#DFF7C4",
};

const STEP_GRADIENTS = [
  ["#FFF8F0", "#FFEEDD"], // warm cream
  ["#F0FFF4", "#DDEFDD"], // soft sage
  ["#F5F0FF", "#E8E0FF"], // lavender
  ["#FFF9E6", "#FFF0CC"], // golden
  ["#F0F7FF", "#DCE8FF"], // sky
  ["#FFF0F3", "#FFDDE4"], // rose
  ["#F0FFFA", "#D8F5EB"], // mint
  ["#FFF5F0", "#FFE4D6"], // peach
];

function makeStyles(FONT, isRTL) {
  return StyleSheet.create({
    container: {
      flex: 1,
    },

    // ─── Top bar ──────────────────────────────────
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingBottom: 4,
    },
    quitPill: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      backgroundColor: "rgba(255,255,255,0.5)",
    },
    quitText: {
      fontSize: 16,
      fontFamily: FONT.medium,
      color: C.text,
    },
    stepPill: {
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 8,
      overflow: "hidden",
      backgroundColor: "rgba(255,255,255,0.5)",
    },
    stepPillText: {
      fontSize: 13,
      fontFamily: FONT.medium,
      color: C.text,
      letterSpacing: -0.05,
    },

    // ─── Segmented progress bar ───────────────────
    progressBar: {
      flexDirection: "row",
      paddingHorizontal: 20,
      gap: 4,
      marginTop: 12,
    },
    progressSegment: {
      flex: 1,
      height: 4,
      borderRadius: 2,
    },
    progressCompleted: {
      backgroundColor: C.green,
    },
    progressCurrent: {
      backgroundColor: C.greenDark,
    },
    progressUpcoming: {
      backgroundColor: "rgba(0,0,0,0.08)",
    },

    // ─── Center content ───────────────────────────
    centerContent: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 28,
    },
    instructionWrap: {
      alignItems: "center",
      maxWidth: "100%",
    },
    instructionText: {
      fontSize: 20,
      fontFamily: FONT.regular,
      color: C.text,
      lineHeight: 30,
      textAlign: "center",
      letterSpacing: -0.2,
    },
    chipsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: 8,
      marginTop: 20,
    },
    chip: {
      backgroundColor: "rgba(0,0,0,0.05)",
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 7,
    },
    chipText: {
      fontSize: 13,
      fontFamily: FONT.medium,
      color: C.text,
      textTransform: "capitalize",
      letterSpacing: -0.05,
    },
    // ─── Tip banner ───────────────────────────────
    tipBanner: {
      backgroundColor: "rgba(253,197,151,0.18)",
      borderLeftWidth: isRTL ? 0 : 3,
      borderLeftColor: isRTL ? "transparent" : "#FDC597",
      borderRightWidth: isRTL ? 3 : 0,
      borderRightColor: isRTL ? "#FDC597" : "transparent",
      borderRadius: 10,
      padding: 14,
      marginTop: 24,
      alignSelf: "stretch",
    },
    tipLabel: {
      fontSize: 13,
      fontFamily: FONT.semibold,
      color: "#7A4A21",
      marginBottom: 4,
    },
    tipText: {
      fontSize: 13,
      fontFamily: FONT.regular,
      color: "#7A4A21",
      fontStyle: "italic",
      lineHeight: 19,
    },

    // ─── Bottom nav ───────────────────────────────
    bottomNav: {
      paddingHorizontal: 20,
      paddingTop: 10,
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
      backgroundColor: "rgba(255,255,255,0.7)",
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
}

export default function StepTimerSheet({
  step,
  currentStep,
  totalSteps,
  onQuit,
  onPrev,
  onNext,
}) {
  const insets = useSafeAreaInsets();
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const { t } = useTranslation("recipe");
  const language = useLanguageStore((st) => st.language);
  const isRTL = useLanguageStore((st) => st.isRTL);

  const FONT = useMemo(() => ({
    regular: getFontFamily(language, "regular"),
    medium: getFontFamily(language, "medium"),
    semibold: getFontFamily(language, "semibold"),
  }), [language]);

  const s = useMemo(() => makeStyles(FONT, isRTL), [FONT, isRTL]);

  // Build info chips
  const chips = [];
  if (step?.technique) chips.push({ label: step.technique, type: "default" });
  if (step?.temperature) chips.push({ label: step.temperature, type: "default" });

  // Gradient for this step
  const gradient = STEP_GRADIENTS[currentStep % STEP_GRADIENTS.length];

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentStep]);

  const handleQuit = () => {
    Alert.alert(
      t("cooking.quitTitle"),
      t("cooking.quitMessage"),
      [
        { text: t("cooking.keepCooking") },
        { text: t("cooking.leave"), style: "destructive", onPress: onQuit },
      ],
    );
  };

  return (
    <LinearGradient colors={gradient} style={s.container}>
      {/* ─── Top bar ─────────────────────────────── */}
      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={handleQuit} hitSlop={8}>
          <BlurView intensity={40} tint="light" style={s.quitPill}>
            <Text style={s.quitText}>{"\u2715"}</Text>
          </BlurView>
        </Pressable>
        <BlurView intensity={40} tint="light" style={s.stepPill}>
          <Text style={s.stepPillText}>
            {t("cooking.step", { current: currentStep + 1, total: totalSteps })}
          </Text>
        </BlurView>
      </View>

      {/* ─── Segmented progress bar ──────────────── */}
      <View style={s.progressBar}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View
            key={i}
            style={[
              s.progressSegment,
              i < currentStep && s.progressCompleted,
              i === currentStep && s.progressCurrent,
              i > currentStep && s.progressUpcoming,
            ]}
          />
        ))}
      </View>

      {/* ─── Center content ──────────────────────── */}
      <View style={s.centerContent}>
        {/* Instruction + chips + tip */}
        <Animated.View
          style={[
            s.instructionWrap,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={s.instructionText}>{step?.instruction}</Text>

          {chips.length > 0 ? (
            <View style={s.chipsRow}>
              {chips.map((chip, i) => (
                <View key={i} style={s.chip}>
                  <Text style={s.chipText}>{chip.label}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {step?.tip ? (
            <View style={s.tipBanner}>
              <Text style={s.tipLabel}>{"\uD83D\uDCA1"} {t("cooking.tip")}</Text>
              <Text style={s.tipText}>{step.tip}</Text>
            </View>
          ) : null}
        </Animated.View>
      </View>

      {/* ─── Bottom nav ──────────────────────────── */}
      <View style={[s.bottomNav, { paddingBottom: insets.bottom + 8 }]}>
        <Pressable
          style={[s.navBtn, s.navBtnPrev, isFirstStep && s.navBtnDisabled]}
          onPress={onPrev}
          disabled={isFirstStep}
        >
          <Text
            style={[s.navBtnPrevText, isFirstStep && s.navBtnTextDisabled]}
          >
            {"\u2039"}  {t("cooking.previous")}
          </Text>
        </Pressable>
        <Pressable style={[s.navBtn, s.navBtnNext]} onPress={onNext}>
          <Text style={s.navBtnNextText}>
            {isLastStep ? t("cooking.done", "Done!") : `${t("cooking.next")}  \u203A`}
          </Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}
