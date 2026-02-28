import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  Animated,
  StyleSheet,
  ScrollView,
  AppState,
  Linking,
} from "react-native";
import { Image } from "expo-image";
import Svg, { Path } from "react-native-svg";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { authFetch } from "../services/api";
import {
  useJobsStore,
  ACTIVE_STATUSES,
  TERMINAL_STATUSES,
} from "../store/jobsStore";
import BellIcon from "./icons/BellIcon";
import LinkIcon from "./icons/LinkIcon";
import {
  scheduleJobCompleteNotification,
  scheduleJobFailedNotification,
} from "../services/notifications";

const ACTIVE_STATUS_SET = new Set(ACTIVE_STATUSES);

const C = {
  bg: "#F4F5F7",
  card: "#ffffff",
  border: "#EAEAEA",
  textPrimary: "#111111",
  textSecondary: "#6b6b6b",
  textMeta: "#B4B4B4",
  greenDark: "#385225",
  greenBright: "#7FEF80",
  greenLight: "#DFF7C4",
  blueBg: "#EBF5FF",
  blueIcon: "#3B82F6",
  purpleBg: "#F3F0FF",
  purpleIcon: "#7C3AED",
  errorBg: "#FFF5F5",
  errorIcon: "#cc3b3b",
};

// ─── SVG Icons ───────────────────────────────────────────────────────────────

function KitchenIcon({ size = 20, color = C.greenDark }) {
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
        stroke={C.greenLight}
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function CheckIcon({ size = 16, color = C.greenDark }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 6L9 17L4 12"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function ExclamationIcon({ size = 16, color = C.errorIcon }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 9v4M12 17h.01"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getRecipeName(job) {
  return (
    job.recipe?.title ??
    job.recipeTitle ??
    job.metadata?.recipeTitle ??
    job.metadata?.title ??
    job.title ??
    null
  );
}

function getSourceDomain(job) {
  const url =
    job.sourceUrl ??
    job.inputUrl ??
    job.metadata?.url ??
    job.input?.url ??
    null;
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.length > 28 ? url.slice(0, 28) + "…" : url;
  }
}

function getJobKind(job) {
  if (job.jobType === "thermomix_export") return "kitchen";
  const t = (job.jobType || "").toLowerCase();
  if (t.includes("image") || t.includes("photo") || t.includes("scan")) return "image";
  return "url";
}

function getStatusLabel(job, t) {
  if (job.status === "completed") {
    return job.jobType === "thermomix_export"
      ? t("notif.readyOnCookidoo")
      : t("notif.savedToCollection");
  }
  if (job.status === "failed") return t("notif.exportFailed");
  if (job.status === "pending") return t("notif.waiting");
  if (job.status === "downloading") return t("notif.downloading");
  return job.jobType === "thermomix_export"
    ? t("notif.convertingForKitchen")
    : t("notif.extractingRecipe");
}

// ─── JobCard ─────────────────────────────────────────────────────────────────

function JobCard({ job, t, onDismiss, onTap }) {
  const progress =
    typeof job.progress === "number"
      ? Math.min(Math.max(job.progress, 0), 100)
      : 0;
  const kind = getJobKind(job);
  const recipeName = getRecipeName(job);
  const statusLabel = getStatusLabel(job, t);
  const isCompleted = job.status === "completed";
  const isFailed = job.status === "failed";
  const isTerminal = isCompleted || isFailed;
  const isActive = !isTerminal;
  const id = job.id ?? job.jobId;

  const thumbnail = job.recipeThumbnailUrl ?? null;

  const iconBg =
    isCompleted ? C.greenLight :
      isFailed ? C.errorBg :
        kind === "kitchen" ? C.greenLight :
          kind === "image" ? C.purpleBg : C.blueBg;

  const iconColor =
    isCompleted ? C.greenDark :
      isFailed ? C.errorIcon :
        kind === "kitchen" ? C.greenDark :
          kind === "image" ? C.purpleIcon : C.blueIcon;

  const barColor =
    kind === "kitchen" ? C.greenBright :
      kind === "image" ? "#C4B5FD" : "#93C5FD";

  const isTappable = isCompleted && (
    (job.jobType === "thermomix_export" && job.resultUrl) ||
    job.resultRecipeId
  );

  const tapHint = isTappable
    ? job.jobType === "thermomix_export"
      ? t("notif.tapToOpen")
      : t("notif.tapToView")
    : null;

  const inner = (
    <View style={[s.jobRow, isTerminal && s.completedRow]}>
      <View style={s.jobRowTop}>
        {/* Left: thumbnail or icon */}
        {thumbnail ? (
          <Image source={{ uri: thumbnail }} style={s.thumbnail} contentFit="cover" />
        ) : (
          <View style={[s.jobIconWrap, { backgroundColor: iconBg }]}>
            {kind === "kitchen" ? (
              <KitchenIcon size={20} color={iconColor} />
            ) : (
              <LinkIcon width={20} height={20} color={iconColor} />
            )}
          </View>
        )}

        {/* Center: text */}
        <View style={s.jobContent}>
          {recipeName ? (
            <Text style={s.jobRecipeName} numberOfLines={1}>{recipeName}</Text>
          ) : kind === "kitchen" ? (
            <Text style={s.jobMeta} numberOfLines={1}>{t("notifications.kitchenExport")}</Text>
          ) : (
            <Text style={s.jobMeta} numberOfLines={1}>{getSourceDomain(job) ?? "—"}</Text>
          )}
          <Text
            style={[s.jobStatusLine, isFailed && { color: C.errorIcon }]}
            numberOfLines={1}
          >
            {statusLabel}
          </Text>
          {isActive && (
            <View style={s.progressRow}>
              <View style={s.progressTrack}>
                <View
                  style={[
                    s.progressFill,
                    { width: `${progress}%`, backgroundColor: barColor },
                  ]}
                />
              </View>
              {progress > 0 && (
                <Text style={[s.progressPct, { color: iconColor }]}>
                  {Math.round(progress)}%
                </Text>
              )}
            </View>
          )}
          {tapHint && (
            <Text style={s.tapHint}>{tapHint}</Text>
          )}
        </View>

        {/* Right: badge + dismiss */}
        <View style={s.badgeCol}>
          {isCompleted && (
            <View style={[s.statusBadge, s.statusBadgeDone]}>
              <CheckIcon size={14} color={C.greenDark} />
            </View>
          )}
          {isFailed && (
            <View style={[s.statusBadge, s.statusBadgeFail]}>
              <ExclamationIcon size={14} color={C.errorIcon} />
            </View>
          )}
          {isTerminal && (
            <Pressable
              style={s.dismissBtn}
              onPress={() => onDismiss(id)}
              hitSlop={10}
            >
              <Text style={s.dismissBtnText}>✕</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );

  if (isTappable) {
    return (
      <Pressable
        onPress={() => onTap(job)}
        style={({ pressed }) => pressed && s.pressed}
      >
        {inner}
      </Pressable>
    );
  }

  return inner;
}

// ─── Sheet ────────────────────────────────────────────────────────────────────

function NotificationSheet({ visible, onClose, activeJobs, completedJobs, onDismiss, onTap, t }) {
  const insets = useSafeAreaInsets();
  const hasActive = activeJobs.length > 0;
  const hasCompleted = completedJobs.length > 0;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={s.backdrop} onPress={onClose} />
      <View style={s.sheet}>
        <View style={[s.sheetInner, { paddingBottom: insets.bottom + 20 }]}>
          <View style={s.grabber} />

          {/* Header */}
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>{t("notifications.title")}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={s.closeBtn}>✕</Text>
            </Pressable>
          </View>

          {!hasActive && !hasCompleted ? (
            <View style={s.emptyState}>
              <View style={s.emptyIconWrap}>
                <BellIcon size={40} color={C.textMeta} />
              </View>
              <Text style={s.emptyTitle}>{t("notif.allClear")}</Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={s.jobList}
            >
              {hasActive && (
                <>
                  <Text style={s.sectionLabel}>{t("notif.inProgress")}</Text>
                  {activeJobs.map((job) => (
                    <JobCard
                      key={job.id ?? job.jobId}
                      job={job}
                      t={t}
                      onDismiss={onDismiss}
                      onTap={onTap}
                    />
                  ))}
                </>
              )}

              {hasCompleted && (
                <>
                  {hasActive && <View style={s.divider} />}
                  <Text style={[s.sectionLabel, hasActive && { marginTop: 4 }]}>
                    {t("notif.recentlyCompleted")}
                  </Text>
                  {completedJobs.map((job) => (
                    <JobCard
                      key={job.id ?? job.jobId}
                      job={job}
                      t={t}
                      onDismiss={onDismiss}
                      onTap={onTap}
                    />
                  ))}
                </>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function NotificationCenter() {
  const { getToken } = useAuth();
  const { t } = useTranslation("common");
  const router = useRouter();

  const activeJobs = useJobsStore((s) => s.activeJobs);
  const completedJobs = useJobsStore((s) => s.completedJobs);
  const setActiveJobs = useJobsStore((s) => s.setActiveJobs);
  const addCompletedJob = useJobsStore((s) => s.addCompletedJob);
  const removeCompletedJob = useJobsStore((s) => s.removeCompletedJob);
  const clearExpiredCompleted = useJobsStore((s) => s.clearExpiredCompleted);

  const [sheetOpen, setSheetOpen] = useState(false);
  const badgeAnim = useRef(new Animated.Value(0)).current;
  const prevCount = useRef(0);

  // Animate badge in/out when active count crosses zero
  useEffect(() => {
    const count = activeJobs.length;
    if (count > 0 && prevCount.current === 0) {
      Animated.spring(badgeAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 12,
        stiffness: 260,
      }).start();
    } else if (count === 0 && prevCount.current > 0) {
      Animated.spring(badgeAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 12,
        stiffness: 260,
      }).start();
    }
    prevCount.current = count;
  }, [activeJobs.length]);

  // Stable ref for getToken — avoids fetchJobs changing reference on every render.
  const getTokenRef = useRef(getToken);
  useEffect(() => { getTokenRef.current = getToken; }); // eslint-disable-line react-hooks/exhaustive-deps

  // Map of jobId → job from the last poll, used to detect status transitions
  const prevJobsMapRef = useRef(new Map());
  // Set of jobIds we've already fired notifications for (prevents duplicates)
  const notifiedRef = useRef(new Set());
  // True only on the very first fetch after mount (cold-start recovery)
  const isFirstFetchRef = useRef(true);

  const fetchJobs = useCallback(async () => {
    try {
      const data = await authFetch("/jobs?limit=20", getTokenRef.current);
      const list = Array.isArray(data)
        ? data
        : (data?.jobs ?? data?.data ?? []);

      // Separate active from terminal
      const active = list.filter((j) => ACTIVE_STATUS_SET.has(j.status));
      setActiveJobs(active);

      const isFirstFetch = isFirstFetchRef.current;
      isFirstFetchRef.current = false;

      // 60-minute window for cold-start recovery
      const coldStartCutoff = Date.now() - 60 * 60 * 1000;

      // Detect transitions: was active last poll, now terminal → notify
      const coldStartBatch = [];
      for (const job of list) {
        const id = job.id ?? job.jobId;
        if (!id) continue;
        const prev = prevJobsMapRef.current.get(id);
        const wasActive = prev && ACTIVE_STATUS_SET.has(prev.status);
        const isTerminal = TERMINAL_STATUSES.has(job.status);

        if (wasActive && isTerminal && !notifiedRef.current.has(id)) {
          // Normal path: transition observed within same session
          notifiedRef.current.add(id);
          addCompletedJob(job);
          const recipeName = getRecipeName(job);
          if (job.status === "completed") {
            scheduleJobCompleteNotification({ job, recipeName });
          } else {
            scheduleJobFailedNotification({ job, recipeName });
          }
        } else if (isFirstFetch && isTerminal && !notifiedRef.current.has(id)) {
          // Cold-start path: job completed while app was closed.
          const completedAt = job.completedAt ? new Date(job.completedAt).getTime() : 0;
          if (completedAt > coldStartCutoff) {
            notifiedRef.current.add(id);
            coldStartBatch.push(job);
          }
        }
      }

      // Insert cold-start jobs oldest-first so newest ends up at top of sheet.
      for (const job of [...coldStartBatch].reverse()) {
        addCompletedJob(job);
      }

      // Rebuild the prev map and clean up expired completed jobs
      prevJobsMapRef.current = new Map(
        list.map((j) => [j.id ?? j.jobId, j])
      );
      clearExpiredCompleted();
    } catch {
      // Network hiccup — keep last known state
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial fetch on mount
  useEffect(() => {
    fetchJobs();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Adaptive interval — only runs when there are active jobs or the sheet is open,
  // and paused when the app is backgrounded/locked
  useEffect(() => {
    const shouldPoll = sheetOpen || activeJobs.length > 0;
    if (!shouldPoll) return;

    let timer = null;

    const start = () => {
      if (timer) return;
      const interval = sheetOpen ? 3000 : 5000;
      timer = setInterval(fetchJobs, interval);
    };

    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const handleAppState = (nextState) => {
      if (nextState === "active") {
        fetchJobs(); // immediate refresh on foreground
        start();
      } else {
        stop();
      }
    };

    const sub = AppState.addEventListener("change", handleAppState);
    if (AppState.currentState === "active") start();

    return () => {
      stop();
      sub.remove();
    };
  }, [sheetOpen, activeJobs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Optimistically remove from local store, then delete from backend
  const handleDismiss = useCallback(async (id) => {
    removeCompletedJob(id);
    try {
      await authFetch(`/jobs/${id}`, getTokenRef.current, { method: "DELETE" });
    } catch {
      // Swallow — job may already be absent from DB
    }
  }, [removeCompletedJob]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleJobTap = useCallback((job) => {
    if (job.status !== "completed") return;
    setSheetOpen(false);
    // Delay navigation until the modal slide-out animation completes,
    // otherwise expo-router's push can be swallowed by the active Modal.
    setTimeout(() => {
      if (job.jobType === "thermomix_export" && job.resultUrl) {
        Linking.openURL(job.resultUrl);
      } else if (job.resultRecipeId) {
        router.push(`/recipe/${job.resultRecipeId}`);
      }
    }, 350);
  }, [router]);

  const count = activeJobs.length;
  const hasActivity = count > 0 || completedJobs.length > 0;

  return (
    <>
      <Pressable
        style={[s.bellBtn, hasActivity && s.bellBtnActive]}
        onPress={(e) => {
          e.stopPropagation?.();
          setSheetOpen(true);
        }}
        hitSlop={8}
      >
        <BellIcon size={22} color={hasActivity ? C.greenDark : C.textSecondary} />
        {count > 0 && (
          <Animated.View style={[s.badge, { transform: [{ scale: badgeAnim }] }]}>
            <Text style={s.badgeText}>{count}</Text>
          </Animated.View>
        )}
      </Pressable>

      <NotificationSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        activeJobs={activeJobs}
        completedJobs={completedJobs}
        onDismiss={handleDismiss}
        onTap={handleJobTap}
        t={t}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  bellBtnActive: {
    backgroundColor: C.greenLight,
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: C.greenBright,
    borderRadius: 999,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: C.greenDark,
    lineHeight: 13,
  },
  // Sheet
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    alignItems: "center",
  },
  sheetInner: {
    width: "100%",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  grabber: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#d9d9d9",
    marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: C.textPrimary,
    letterSpacing: -0.2,
  },
  closeBtn: {
    fontSize: 16,
    color: C.textMeta,
    fontWeight: "500",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: C.textMeta,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 16,
  },
  // Empty state
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: C.textMeta,
    textAlign: "center",
  },
  // Job list
  jobList: {
    gap: 8,
    paddingBottom: 8,
  },
  // Shared job row
  jobRow: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  completedRow: {
    opacity: 0.8,
  },
  pressed: {
    opacity: 0.7,
  },
  jobRowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  // Thumbnail
  thumbnail: {
    width: 44,
    height: 44,
    borderRadius: 10,
    flexShrink: 0,
  },
  jobIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  jobContent: {
    flex: 1,
    gap: 3,
  },
  jobRecipeName: {
    fontSize: 15,
    fontWeight: "600",
    color: C.textPrimary,
    letterSpacing: -0.1,
  },
  jobMeta: {
    fontSize: 13,
    color: C.textSecondary,
  },
  jobStatusLine: {
    fontSize: 13,
    color: C.textMeta,
    lineHeight: 17,
  },
  // Progress
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  progressTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: C.border,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  progressPct: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: -0.2,
    flexShrink: 0,
  },
  tapHint: {
    fontSize: 12,
    color: C.greenDark,
    fontWeight: "500",
    marginTop: 2,
  },
  // Right column
  badgeCol: {
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  statusBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadgeDone: {
    backgroundColor: C.greenLight,
  },
  statusBadgeFail: {
    backgroundColor: C.errorBg,
  },
  dismissBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  dismissBtnText: {
    fontSize: 11,
    color: C.textMeta,
    fontWeight: "600",
    lineHeight: 13,
  },
});
