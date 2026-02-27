import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  Linking,
  Share,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { exportToThermomix } from "../services/recipes";

const C = {
  greenDark: "#385225",
  greenBright: "#7FEF80",
  greenLight: "#DFF7C4",
  card: "#ffffff",
  textPrimary: "#111111",
  textSecondary: "#6b6b6b",
  textMeta: "#B4B4B4",
  border: "#EAEAEA",
  errorBg: "#7A3535",
};

const STAGE_KEYS = ["thermomixStage1", "thermomixStage2", "thermomixStage3"];
const STAGE_INTERVAL = 3200;

// Thermomix-inspired jug/bowl silhouette with blade cross
function ThermomixIcon({ size = 18, color = "#ffffff", bladeColor = C.greenDark }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      {/* Lid knob */}
      <Path
        d="M9.25 3.25 Q9.25 2.75 10 2.75 Q10.75 2.75 10.75 3.25 L10.75 5.25 L9.25 5.25 Z"
        fill={color}
      />
      {/* Lid body */}
      <Path d="M5 7 Q5 5.25 10 5.25 Q15 5.25 15 7 Z" fill={color} />
      {/* Bowl body */}
      <Path
        d="M4.5 7.5 L3.5 14 Q3.5 17.5 10 17.5 Q16.5 17.5 16.5 14 L15.5 7.5 Z"
        fill={color}
      />
      {/* Blade cross */}
      <Path
        d="M7.5 12.5 L12.5 12.5 M10 10.5 L10 14.5"
        stroke={bladeColor}
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function ThermomixExportButton({ recipeId, getToken, t, FONT, initialUrl }) {
  const [phase, setPhase] = useState(initialUrl ? "success" : "idle");
  const [url, setUrl] = useState(initialUrl || null);
  const [stageIdx, setStageIdx] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef(null);
  const stageTimer = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stageTimer.current) clearInterval(stageTimer.current);
      if (pulseLoop.current) pulseLoop.current.stop();
    };
  }, []);

  // Pulse + stage cycling while loading
  useEffect(() => {
    if (phase === "loading") {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.45, duration: 750, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 750, useNativeDriver: true }),
        ])
      );
      pulseLoop.current.start();

      setStageIdx(0);
      stageTimer.current = setInterval(() => {
        setStageIdx((prev) => (prev + 1) % STAGE_KEYS.length);
      }, STAGE_INTERVAL);
    } else {
      if (pulseLoop.current) {
        pulseLoop.current.stop();
        pulseLoop.current = null;
      }
      pulseAnim.setValue(1);
      if (stageTimer.current) {
        clearInterval(stageTimer.current);
        stageTimer.current = null;
      }
    }
  }, [phase]);

  const runExport = useCallback(async () => {
    setPhase("loading");
    setUrl(null);
    try {
      const result = await exportToThermomix({ recipeId, getToken });
      setUrl(result.url);
      setPhase("success");
    } catch {
      setPhase("error");
    }
  }, [recipeId, getToken]);

  const handlePress = useCallback(() => {
    if (phase === "loading") return;
    runExport();
  }, [phase, runExport]);

  const handleOpen = useCallback(() => {
    if (url) Linking.openURL(url);
  }, [url]);

  const handleShare = useCallback(() => {
    if (url) Share.share({ url, message: url });
  }, [url]);

  // ── Success card ─────────────────────────────────────────────────
  if (phase === "success" && url) {
    return (
      <View style={[s.successCard, s.wrapper]}>
        <View style={s.successHeader}>
          <ThermomixIcon size={18} color={C.greenDark} bladeColor={C.greenLight} />
          <Text style={[s.successTitle, { fontFamily: FONT.semibold }]}>
            {t("detail.thermomixSuccess")}
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [s.openBtn, pressed && { opacity: 0.8 }]}
          onPress={handleOpen}
        >
          <Text style={[s.openBtnText, { fontFamily: FONT.semibold }]}>
            {t("detail.thermomixOpen")}
          </Text>
        </Pressable>

        <Pressable style={s.shareRow} onPress={handleShare}>
          <Text style={[s.shareText, { fontFamily: FONT.medium }]}>
            {t("detail.thermomixShare")}
          </Text>
        </Pressable>

        <Pressable style={s.againRow} onPress={() => setPhase("idle")}>
          <Text style={[s.againText, { fontFamily: FONT.regular }]}>
            {t("detail.thermomixExportAgain")}
          </Text>
        </Pressable>
      </View>
    );
  }

  // ── Button (idle / loading / error) ──────────────────────────────
  const isLoading = phase === "loading";
  const isError = phase === "error";

  return (
    <View style={s.wrapper}>
      <Animated.View style={{ opacity: pulseAnim }}>
        <Pressable
          style={[s.btn, isError && s.btnError]}
          onPress={handlePress}
          disabled={isLoading}
        >
          <ThermomixIcon
            size={18}
            color="#ffffff"
            bladeColor={isError ? "#c07070" : C.greenDark}
          />
          <Text style={[s.btnText, { fontFamily: FONT.semibold }]}>
            {isLoading
              ? t("detail.thermomixLoading")
              : isError
              ? t("detail.thermomixRetry")
              : t("detail.thermomixExport")}
          </Text>
        </Pressable>
      </Animated.View>

      {isLoading && (
        <Text style={[s.stageText, { fontFamily: FONT.regular }]}>
          {t(`detail.${STAGE_KEYS[stageIdx]}`)}
        </Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrapper: {
    width: "100%",
    marginTop: 14,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.greenDark,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: "100%",
  },
  btnError: {
    backgroundColor: C.errorBg,
  },
  btnText: {
    color: "#ffffff",
    fontSize: 15,
  },
  stageText: {
    textAlign: "center",
    color: C.textSecondary,
    fontSize: 12,
    marginTop: 8,
  },
  // Success card
  successCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    gap: 10,
  },
  successHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  successTitle: {
    fontSize: 15,
    color: C.textPrimary,
  },
  openBtn: {
    backgroundColor: C.greenBright,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  openBtnText: {
    color: C.greenDark,
    fontSize: 15,
  },
  shareRow: {
    alignItems: "center",
    paddingVertical: 6,
  },
  shareText: {
    color: C.textSecondary,
    fontSize: 14,
  },
  againRow: {
    alignItems: "center",
    paddingVertical: 2,
  },
  againText: {
    color: C.textMeta,
    fontSize: 13,
  },
});
