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
import { exportToKitchen } from "../services/recipes";
import { getJobStatus } from "../services/extract";

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

const POLL_INTERVAL = 3000; // 3s between polls
const STAGE_KEYS = ["kitchenStage1", "kitchenStage2", "kitchenStage3"];
const STAGE_INTERVAL = 4000;

function KitchenIcon({ size = 18, color = "#ffffff", bladeColor = C.greenDark }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none">
      <Path
        d="M9.25 3.25 Q9.25 2.75 10 2.75 Q10.75 2.75 10.75 3.25 L10.75 5.25 L9.25 5.25 Z"
        fill={color}
      />
      <Path d="M5 7 Q5 5.25 10 5.25 Q15 5.25 15 7 Z" fill={color} />
      <Path
        d="M4.5 7.5 L3.5 14 Q3.5 17.5 10 17.5 Q16.5 17.5 16.5 14 L15.5 7.5 Z"
        fill={color}
      />
      <Path
        d="M7.5 12.5 L12.5 12.5 M10 10.5 L10 14.5"
        stroke={bladeColor}
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function KitchenExportButton({ recipeId, getToken, t, FONT, initialUrl }) {
  const [phase, setPhase] = useState(initialUrl ? "success" : "idle");
  const [url, setUrl] = useState(initialUrl || null);
  const [stageIdx, setStageIdx] = useState(0);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef(null);
  const stageTimer = useRef(null);
  const pollTimer = useRef(null);
  const jobIdRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stageTimer.current) clearInterval(stageTimer.current);
      if (pollTimer.current) clearInterval(pollTimer.current);
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

  // Poll job status while loading
  const startPolling = useCallback((jobId) => {
    jobIdRef.current = jobId;
    if (pollTimer.current) clearInterval(pollTimer.current);

    pollTimer.current = setInterval(async () => {
      try {
        const job = await getJobStatus({ jobId, getToken });

        if (job.status === "completed" && job.resultUrl) {
          clearInterval(pollTimer.current);
          pollTimer.current = null;
          setUrl(job.resultUrl);
          setPhase("success");
        } else if (job.status === "failed") {
          clearInterval(pollTimer.current);
          pollTimer.current = null;
          setPhase("error");
        }
        // pending/processing → keep polling
      } catch {
        // Network hiccup — keep polling, don't fail yet
      }
    }, POLL_INTERVAL);
  }, [getToken]);

  const runExport = useCallback(async () => {
    setPhase("loading");
    setUrl(null);
    jobIdRef.current = null;

    try {
      const result = await exportToKitchen({ recipeId, getToken });

      if (result.status === "completed" && result.url) {
        // Instant — URL was already cached
        setUrl(result.url);
        setPhase("success");
      } else if (result.status === "processing" && result.jobId) {
        // Job created — start polling
        startPolling(result.jobId);
      } else {
        setPhase("error");
      }
    } catch {
      setPhase("error");
    }
  }, [recipeId, getToken, startPolling]);

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

  const handleReset = useCallback(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
    setPhase("idle");
    setUrl(null);
    jobIdRef.current = null;
  }, []);

  // ── Success card ─────────────────────────────────────────────────
  if (phase === "success" && url) {
    return (
      <View style={[s.successCard, s.wrapper]}>
        <View style={s.successHeader}>
          <KitchenIcon size={18} color={C.greenDark} bladeColor={C.greenLight} />
          <Text style={[s.successTitle, { fontFamily: FONT.semibold }]}>
            {t("detail.kitchenSuccess")}
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [s.openBtn, pressed && { opacity: 0.8 }]}
          onPress={handleOpen}
        >
          <Text style={[s.openBtnText, { fontFamily: FONT.semibold }]}>
            {t("detail.kitchenOpen")}
          </Text>
        </Pressable>

        <Pressable style={s.shareRow} onPress={handleShare}>
          <Text style={[s.shareText, { fontFamily: FONT.medium }]}>
            {t("detail.kitchenShare")}
          </Text>
        </Pressable>

        <Pressable style={s.againRow} onPress={handleReset}>
          <Text style={[s.againText, { fontFamily: FONT.regular }]}>
            {t("detail.kitchenExportAgain")}
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
          <KitchenIcon
            size={18}
            color="#ffffff"
            bladeColor={isError ? "#c07070" : C.greenDark}
          />
          <Text style={[s.btnText, { fontFamily: FONT.semibold }]}>
            {isLoading
              ? t("detail.kitchenLoading")
              : isError
              ? t("detail.kitchenRetry")
              : t("detail.kitchenExport")}
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
