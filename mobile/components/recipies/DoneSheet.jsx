import React, { useEffect, useRef, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import RecipePlaceholder from "../RecipePlaceholder";
import { useLanguageStore } from "../../store/languageStore";
import { getFontFamily } from "../../utils/fonts";
import { sc } from "../../utils/deviceScale";

const C = {
  bg: "#F4F5F7",
  card: "#ffffff",
  text: "#111111",
  muted: "#B4B4B4",
  green: "#7FEF80",
  greenDark: "#385225",
  greenLight: "#DFF7C4",
};

function makeStyles(FONT) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.bg,
    },
    topBar: {
      paddingHorizontal: 20,
      paddingBottom: 4,
    },
    backBtn: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: C.card,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    backIcon: {
      fontSize: sc(14),
      color: C.muted,
      marginRight: 6,
    },
    backText: {
      fontSize: sc(13),
      fontFamily: FONT.medium,
      color: C.muted,
    },

    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: "center",
      paddingHorizontal: 20,
      paddingBottom: 20,
    },

    // ─── Hero card ────────────────────────────────
    heroCard: {
      backgroundColor: C.card,
      borderRadius: 28,
      overflow: "hidden",
    },
    imageWrap: {
      backgroundColor: C.bg,
      overflow: "hidden",
    },
    image: {
      width: "100%",
      height: sc(240),
    },
    heroBody: {
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 32,
      alignItems: "flex-end", // Align text right for RTL context
    },
    doneLabel: {
      fontSize: sc(13),
      fontFamily: FONT.semibold,
      color: C.green,
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: 6,
    },
    recipeTitle: {
      fontSize: sc(22),
      fontFamily: FONT.semibold,
      color: C.text,
      lineHeight: sc(32),
      paddingTop: 4,
      textAlign: "right", // Ensure RTL rendering matches
    },
    subtitle: {
      fontSize: sc(14),
      fontFamily: FONT.regular,
      color: C.muted,
      marginTop: 8,
      textAlign: "right",
    },
    metaRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 16,
    },
    metaPill: {
      backgroundColor: C.greenLight,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 7,
    },
    metaPillText: {
      fontSize: sc(12),
      fontFamily: FONT.semibold,
      color: C.greenDark,
      letterSpacing: -0.05,
    },

    // ─── Bottom action ────────────────────────────
    bottomAction: {
      paddingHorizontal: 20,
      paddingTop: 10,
    },
    primaryBtn: {
      backgroundColor: C.green,
      borderRadius: 999,
      paddingVertical: 16,
      alignItems: "center",
    },
    primaryText: {
      fontSize: sc(16),
      fontFamily: FONT.semibold,
      color: C.greenDark,
    },
  });
}

export default function DoneSheet({
  title,
  imageUri,
  totalSteps,
  totalTime,
  onBack,
  onServe,
}) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation("recipe");
  const language = useLanguageStore((st) => st.language);

  const FONT = useMemo(() => ({
    regular: getFontFamily(language, "regular"),
    medium: getFontFamily(language, "medium"),
    semibold: getFontFamily(language, "semibold"),
  }), [language]);

  const s = useMemo(() => makeStyles(FONT), [FONT]);

  const metaParts = [];
  if (totalSteps) metaParts.push(t("doneSheet.stepsCompleted", { count: totalSteps }));
  if (totalTime > 0) metaParts.push(t("doneSheet.timeApprox", { time: totalTime }));

  // Entrance animation
  const cardScale = useRef(new Animated.Value(0.95)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardScale, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Delayed text fade-in
    const timeout = setTimeout(() => {
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, 200);

    return () => clearTimeout(timeout);
  }, []);

  return (
    <View style={s.container}>
      {/* Top bar */}
      <View style={[s.topBar, { paddingTop: insets.top + 10 }]}>
        <Pressable style={s.backBtn} onPress={onBack}>
          <Text style={s.backIcon}>←</Text>
          <Text style={s.backText}>{t("doneSheet.back")}</Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scrollContent}
        style={s.scrollView}
      >
        {/* Hero card */}
        <Animated.View
          style={[
            s.heroCard,
            {
              opacity: cardOpacity,
              transform: [{ scale: cardScale }],
            },
          ]}
        >
          <View style={s.imageWrap}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={s.image} transition={200} />
            ) : (
              <RecipePlaceholder title={title} variant="hero" style={s.image} />
            )}
          </View>

          <View style={s.heroBody}>
            <Animated.Text style={[s.doneLabel, { opacity: textOpacity }]}>
              {t("doneSheet.allDone")}
            </Animated.Text>
            {title ? (
              <Text style={s.recipeTitle} numberOfLines={2}>{title}</Text>
            ) : null}
            <Text style={s.subtitle}>{t("doneSheet.subtitle")}</Text>

            {metaParts.length > 0 ? (
              <View style={s.metaRow}>
                {metaParts.map((part, i) => (
                  <View key={i} style={s.metaPill}>
                    <Text style={s.metaPillText}>{part}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Primary — pinned bottom */}
      <View style={[s.bottomAction, { paddingBottom: insets.bottom + 8 }]}>
        <Pressable style={s.primaryBtn} onPress={onServe}>
          <Text style={s.primaryText}>{t("doneSheet.serveAndEnjoy")}</Text>
        </Pressable>
      </View>
    </View>
  );
}
