import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  Animated,
  StyleSheet,
  ScrollView,
} from "react-native";
import Svg, { Path } from "react-native-svg";
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

// Classify job type for display
function getJobKind(job) {
  if (job.jobType === "thermomix_export") return "kitchen";
  const t = (job.jobType || "").toLowerCase();
  if (t.includes("image") || t.includes("photo") || t.includes("scan")) return "image";
  return "url"; // generic extraction
}

// Use the backend message when available — it's more informative
function getStatusLine(job, t) {
  if (job.message && job.message.length > 0) return job.message;
  if (job.status === "pending") return t("notifications.pending");
  return t("notifications.processing");
}

// ─── Job rows ─────────────────────────────────────────────────────────────────

function JobRow({ job, t }) {
  const progress =
    typeof job.progress === "number"
      ? Math.min(Math.max(job.progress, 0), 100)
      : 0;
  const kind = getJobKind(job);
  const recipeName = getRecipeName(job);
  const sourceDomain = kind !== "kitchen" ? getSourceDomain(job) : null;
  const statusLine = getStatusLine(job, t);

  const label =
    kind === "kitchen"
      ? t("notifications.kitchenExport")
      : kind === "image"
      ? t("notifications.imageExtract")
      : t("notifications.urlExtract");

  const iconBg =
    kind === "kitchen" ? C.greenLight : kind === "image" ? C.purpleBg : C.blueBg;
  const iconColor =
    kind === "kitchen" ? C.greenDark : kind === "image" ? C.purpleIcon : C.blueIcon;
  const barColor =
    kind === "kitchen" ? C.greenBright : kind === "image" ? "#C4B5FD" : "#93C5FD";

  return (
    <View style={s.jobRow}>
      <View style={s.jobRowTop}>
        {/* Icon */}
        <View style={[s.jobIconWrap, { backgroundColor: iconBg }]}>
          {kind === "kitchen" ? (
            <KitchenIcon size={20} color={iconColor} />
          ) : (
            <LinkIcon width={20} height={20} color={iconColor} />
          )}
        </View>

        {/* Text block */}
        <View style={s.jobContent}>
          <Text style={s.jobLabel} numberOfLines={1}>{label}</Text>
          {recipeName ? (
            <Text style={s.jobRecipeName} numberOfLines={1}>{recipeName}</Text>
          ) : sourceDomain ? (
            <Text style={s.jobMeta} numberOfLines={1}>{sourceDomain}</Text>
          ) : null}
          <Text style={s.jobStatusLine} numberOfLines={2}>{statusLine}</Text>
        </View>

        {/* Progress % */}
        {progress > 0 && (
          <Text style={[s.jobProgressText, { color: iconColor }]}>
            {Math.round(progress)}%
          </Text>
        )}
      </View>

      {/* Progress bar */}
      <View style={s.progressTrack}>
        <View style={[s.progressFill, { width: `${progress}%`, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

function CompletedJobRow({ job, t, onDismiss }) {
  const kind = getJobKind(job);
  const recipeName = getRecipeName(job);
  const isSuccess = job.status === "completed";
  const id = job.id ?? job.jobId;

  const label =
    kind === "kitchen"
      ? t("notifications.kitchenExport")
      : kind === "image"
      ? t("notifications.imageExtract")
      : t("notifications.urlExtract");

  const iconBg = isSuccess ? C.greenLight : C.errorBg;
  const iconColor = isSuccess ? C.greenDark : C.errorIcon;

  return (
    <View style={[s.jobRow, s.completedRow]}>
      <View style={s.jobRowTop}>
        <View style={[s.jobIconWrap, { backgroundColor: iconBg }]}>
          {kind === "kitchen" ? (
            <KitchenIcon size={20} color={iconColor} />
          ) : (
            <LinkIcon width={20} height={20} color={iconColor} />
          )}
        </View>
        <View style={s.jobContent}>
          <Text style={s.jobLabel} numberOfLines={1}>{label}</Text>
          {recipeName && (
            <Text style={s.jobRecipeName} numberOfLines={1}>{recipeName}</Text>
          )}
        </View>
        <View style={[s.statusPill, isSuccess ? s.statusPillDone : s.statusPillFail]}>
          {isSuccess && <CheckIcon size={12} color={C.greenDark} />}
          <Text
            style={[
              s.statusPillText,
              isSuccess ? s.statusPillTextDone : s.statusPillTextFail,
            ]}
          >
            {isSuccess ? t("notifications.completed") : t("notifications.failed")}
          </Text>
        </View>
        <Pressable
          style={s.dismissBtn}
          onPress={() => onDismiss(id)}
          hitSlop={10}
        >
          <Text style={s.dismissBtnText}>✕</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Sheet ────────────────────────────────────────────────────────────────────

function NotificationSheet({ visible, onClose, activeJobs, completedJobs, onDismiss, t }) {
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
            /* Empty state */
            <View style={s.emptyState}>
              <View style={s.emptyIconWrap}>
                <KitchenIcon size={28} color={C.textMeta} />
              </View>
              <Text style={s.emptyTitle}>{t("notifications.empty")}</Text>
              <Text style={s.emptySubtitle}>
                {t("notifications.emptySubtitle")}
              </Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={s.jobList}
            >
              {/* Active jobs */}
              {hasActive && (
                <>
                  <Text style={s.sectionLabel}>{t("notifications.title")}</Text>
                  {activeJobs.map((job) => (
                    <JobRow key={job.id ?? job.jobId} job={job} t={t} />
                  ))}
                </>
              )}

              {/* Recently completed */}
              {hasCompleted && (
                <>
                  <Text style={[s.sectionLabel, hasActive && { marginTop: 20 }]}>
                    {t("notifications.recentTitle")}
                  </Text>
                  {completedJobs.map((job) => (
                    <CompletedJobRow
                      key={job.id ?? job.jobId}
                      job={job}
                      t={t}
                      onDismiss={onDismiss}
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
  // No deps array is intentional: runs after every commit to keep the ref fresh
  // with whatever getToken Clerk provides without forcing fetchJobs to re-create.
  const getTokenRef = useRef(getToken);
  useEffect(() => { getTokenRef.current = getToken; }); // eslint-disable-line react-hooks/exhaustive-deps

  // Map of jobId → job from the last poll, used to detect status transitions
  const prevJobsMapRef = useRef(new Map());
  // Set of jobIds we've already fired notifications for (prevents duplicates)
  const notifiedRef = useRef(new Set());

  const fetchJobs = useCallback(async () => {
    try {
      const data = await authFetch("/jobs?limit=20", getTokenRef.current);
      const list = Array.isArray(data)
        ? data
        : (data?.jobs ?? data?.data ?? []);

      // Separate active from terminal
      const active = list.filter((j) => ACTIVE_STATUS_SET.has(j.status));
      setActiveJobs(active);

      // Detect transitions: was active last poll, now terminal → notify
      for (const job of list) {
        const id = job.id ?? job.jobId;
        if (!id) continue;
        const prev = prevJobsMapRef.current.get(id);
        const wasActive = prev && ACTIVE_STATUS_SET.has(prev.status);
        const isTerminal = TERMINAL_STATUSES.has(job.status);

        if (wasActive && isTerminal && !notifiedRef.current.has(id)) {
          notifiedRef.current.add(id);
          addCompletedJob(job);
          const recipeName = getRecipeName(job);
          if (job.status === "completed") {
            scheduleJobCompleteNotification({ job, recipeName });
          } else {
            scheduleJobFailedNotification({ job, recipeName });
          }
        }
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

  // Adaptive interval — no immediate call here (avoids double-call on store update)
  useEffect(() => {
    const interval = sheetOpen ? 3000 : activeJobs.length > 0 ? 5000 : 30000;
    const timer = setInterval(fetchJobs, interval);
    return () => clearInterval(timer);
  }, [sheetOpen, activeJobs.length]); // eslint-disable-line react-hooks/exhaustive-deps — fetchJobs is stable (useCallback with [] deps + Zustand stable actions)

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
        onDismiss={removeCompletedJob}
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
    fontSize: 16,
    fontWeight: "600",
    color: C.textPrimary,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: C.textMeta,
    textAlign: "center",
    maxWidth: 220,
    lineHeight: 18,
  },
  // Job list
  jobList: {
    gap: 8,
    paddingBottom: 8,
  },
  // Shared job row base
  jobRow: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    gap: 10,
  },
  completedRow: {
    opacity: 0.75,
  },
  jobRowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  jobIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  jobContent: {
    flex: 1,
    gap: 2,
  },
  jobLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textMeta,
    letterSpacing: 0.1,
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
    fontSize: 12,
    color: C.textMeta,
    lineHeight: 16,
  },
  jobProgressText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2,
    flexShrink: 0,
  },
  // Progress bar
  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: C.border,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  // Status pill for completed rows
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    flexShrink: 0,
  },
  statusPillDone: {
    backgroundColor: C.greenLight,
  },
  statusPillFail: {
    backgroundColor: "#FFF0F0",
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusPillTextDone: {
    color: C.greenDark,
  },
  statusPillTextFail: {
    color: C.errorIcon,
  },
  dismissBtn: {
    marginLeft: 6,
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
