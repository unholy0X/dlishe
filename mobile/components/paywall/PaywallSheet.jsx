import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import { useTranslation } from "react-i18next";
import BottomSheetModal from "../BottomSheetModal";
import { useSubscriptionStore } from "../../store";

const LOAD_TIMEOUT_MS = 8000;

const PRO_FEATURE_KEYS = ["extractions", "scans", "savedRecipes", "support"];

export default function PaywallSheet({ visible, onClose, reason }) {
  const { getToken } = useAuth();
  const { t } = useTranslation("paywall");
  const offerings = useSubscriptionStore((s) => s.offerings);
  const entitlement = useSubscriptionStore((s) => s.entitlement);
  const purchasePackage = useSubscriptionStore((s) => s.purchasePackage);
  const restorePurchases = useSubscriptionStore((s) => s.restorePurchases);
  const loadOfferings = useSubscriptionStore((s) => s.loadOfferings);

  const [purchasing, setPurchasing] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("annual");
  const [loadFailed, setLoadFailed] = useState(false);
  const timeoutRef = useRef(null);

  const monthlyPkg = offerings?.availablePackages?.find(
    (p) => p.packageType === "MONTHLY" || p.identifier === "$rc_monthly"
  );
  const annualPkg = offerings?.availablePackages?.find(
    (p) => p.packageType === "ANNUAL" || p.identifier === "$rc_annual"
  );

  const monthlyPrice = monthlyPkg?.product?.priceString;
  const annualPrice = annualPkg?.product?.priceString;
  const packagesLoaded = !!(monthlyPrice || annualPrice);

  // Compute real savings % so the badge stays accurate if prices change
  const savingsPct = (() => {
    const mo = monthlyPkg?.product?.price;
    const yr = annualPkg?.product?.price;
    if (!mo || !yr) return null;
    return Math.round((1 - yr / 12 / mo) * 100);
  })();

  // Timeout: if packages don't load within LOAD_TIMEOUT_MS, show retry
  useEffect(() => {
    if (!visible || packagesLoaded) {
      setLoadFailed(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      return;
    }

    setLoadFailed(false);
    timeoutRef.current = setTimeout(() => {
      if (!packagesLoaded) setLoadFailed(true);
    }, LOAD_TIMEOUT_MS);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [visible, packagesLoaded]);

  const handleRetry = async () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setLoadFailed(false);
    try {
      if (loadOfferings) await loadOfferings();
    } catch {}
    // Re-arm timeout
    timeoutRef.current = setTimeout(() => {
      const state = useSubscriptionStore.getState();
      const pkgs = state.offerings?.availablePackages;
      const hasMonthly = pkgs?.find(
        (p) => p.packageType === "MONTHLY" || p.identifier === "$rc_monthly"
      );
      const hasAnnual = pkgs?.find(
        (p) => p.packageType === "ANNUAL" || p.identifier === "$rc_annual"
      );
      if (!hasMonthly?.product?.priceString && !hasAnnual?.product?.priceString) {
        setLoadFailed(true);
      }
    }, LOAD_TIMEOUT_MS);
  };

  const handlePurchase = async () => {
    const pkg = selectedPlan === "annual" ? annualPkg : monthlyPkg;
    if (!pkg) {
      Alert.alert(t("unavailable.title"), t("unavailable.message"));
      return;
    }
    setPurchasing(selectedPlan);
    try {
      const result = await purchasePackage({ pkg, getToken });
      if (!result) return;
      const current = useSubscriptionStore.getState().entitlement;
      if (current === "pro" || current === "admin") {
        onClose();
        Alert.alert(t("purchaseSuccess.title"), t("purchaseSuccess.message"));
      } else {
        onClose();
        Alert.alert(t("purchasePending.title"), t("purchasePending.message"));
      }
    } catch (err) {
      if (err.userCancelled) return;
      Alert.alert(t("purchaseFailed.title"), err?.message || t("purchaseFailed.message"));
    } finally {
      setPurchasing(null);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      await restorePurchases({ getToken });
      const current = useSubscriptionStore.getState().entitlement;
      if (current === "pro") {
        onClose();
        Alert.alert(t("restored.title"), t("restored.message"));
      } else {
        Alert.alert(t("notFound.title"), t("notFound.message"));
      }
    } catch (err) {
      Alert.alert(t("restoreFailed.title"), err?.message || t("restoreFailed.message"));
    } finally {
      setRestoring(false);
    }
  };

  const isPro = entitlement === "pro" || entitlement === "admin";

  return (
    <BottomSheetModal visible={visible} onClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <Text style={styles.title}>{t("title")}</Text>
        <Text style={styles.subtitle}>
          {reason && t(`subtitle.${reason}`) !== `subtitle.${reason}`
            ? t(`subtitle.${reason}`)
            : t("subtitle.default")}
        </Text>

        {/* Pro features */}
        <View style={styles.featuresCard}>
          {PRO_FEATURE_KEYS.map((key, i) => (
            <View key={key} style={[styles.featureRow, i === PRO_FEATURE_KEYS.length - 1 && { marginBottom: 0 }]}>
              <View style={styles.checkCircle}>
                <Text style={styles.checkMark}>{"+"}</Text>
              </View>
              <Text style={styles.featureText}>{t(`features.${key}`)}</Text>
            </View>
          ))}
        </View>

        {!isPro && (
          <>
            {/* Plan selector */}
            {packagesLoaded ? (
              <View style={styles.planSelector}>
                {annualPkg && (
                  <Pressable
                    style={[
                      styles.planOption,
                      selectedPlan === "annual" && styles.planOptionSelected,
                    ]}
                    onPress={() => setSelectedPlan("annual")}
                  >
                    <View style={styles.planOptionHeader}>
                      <Text
                        style={[
                          styles.planLabel,
                          selectedPlan === "annual" && styles.planLabelSelected,
                        ]}
                      >
                        {t("plans.annual")}
                      </Text>
                      {savingsPct ? (
                        <View style={styles.saveBadge}>
                          <Text style={styles.saveBadgeText}>{t("plans.save", { pct: savingsPct })}</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text
                      style={[
                        styles.planPrice,
                        selectedPlan === "annual" && styles.planPriceSelected,
                      ]}
                    >
                      {annualPrice}
                      <Text style={styles.planPeriod}>{t("plans.perYear")}</Text>
                    </Text>
                  </Pressable>
                )}

                {monthlyPkg && (
                  <Pressable
                    style={[
                      styles.planOption,
                      selectedPlan === "monthly" && styles.planOptionSelected,
                    ]}
                    onPress={() => setSelectedPlan("monthly")}
                  >
                    <Text
                      style={[
                        styles.planLabel,
                        selectedPlan === "monthly" && styles.planLabelSelected,
                      ]}
                    >
                      {t("plans.monthly")}
                    </Text>
                    <Text
                      style={[
                        styles.planPrice,
                        selectedPlan === "monthly" && styles.planPriceSelected,
                      ]}
                    >
                      {monthlyPrice}
                      <Text style={styles.planPeriod}>{t("plans.perMonth")}</Text>
                    </Text>
                  </Pressable>
                )}
              </View>
            ) : loadFailed ? (
              /* Retry state — products failed to load */
              <View style={styles.failedContainer}>
                <Text style={styles.failedText}>{t("loadFailed")}</Text>
                <View style={styles.failedButtons}>
                  <Pressable style={styles.retryButton} onPress={handleRetry}>
                    <Text style={styles.retryButtonText}>{t("buttons.retry")}</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.failedRestoreButton,
                      restoring && { opacity: 0.5 },
                    ]}
                    onPress={handleRestore}
                    disabled={restoring}
                  >
                    {restoring ? (
                      <ActivityIndicator size="small" color="#385225" />
                    ) : (
                      <Text style={styles.failedRestoreText}>{t("buttons.restore")}</Text>
                    )}
                  </Pressable>
                  <Pressable style={styles.failedCancelButton} onPress={onClose}>
                    <Text style={styles.failedCancelText}>{t("buttons.notNow")}</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              /* Loading state */
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#385225" />
                <Text style={styles.loadingText}>{t("loading")}</Text>
              </View>
            )}

            {/* Subscribe button — only when packages are loaded */}
            {packagesLoaded && (
              <Pressable
                style={[
                  styles.subscribeButton,
                  (!!purchasing || restoring) && styles.subscribeButtonDisabled,
                ]}
                onPress={handlePurchase}
                disabled={!!purchasing || restoring}
              >
                {purchasing ? (
                  <ActivityIndicator size="small" color="#385225" />
                ) : (
                  <Text style={styles.subscribeButtonText}>{t("buttons.continue")}</Text>
                )}
              </Pressable>
            )}

            {/* Restore — only in normal state (failed state has its own) */}
            {packagesLoaded && (
              <Pressable
                style={[
                  styles.restoreButton,
                  (!!purchasing || restoring) && { opacity: 0.5 },
                ]}
                onPress={handleRestore}
                disabled={!!purchasing || restoring}
              >
                {restoring ? (
                  <ActivityIndicator size="small" color="#385225" />
                ) : (
                  <Text style={styles.restoreText}>{t("buttons.restore")}</Text>
                )}
              </Pressable>
            )}

            {/* Store-required subscription terms */}
            <Text style={styles.subscriptionTerms}>
              {Platform.OS === "ios" ? t("terms.ios") : t("terms.android")}
            </Text>
          </>
        )}

        {/* Legal links — clearly tappable */}
        <View style={styles.legalRow}>
          <Pressable
            style={styles.legalLink}
            onPress={() => Linking.openURL("https://dlishe.com/terms")}
          >
            <Text style={styles.legalText}>{t("termsOfUse", { ns: "common" })}</Text>
          </Pressable>
          <Text style={styles.legalDot}> · </Text>
          <Pressable
            style={styles.legalLink}
            onPress={() => Linking.openURL("https://dlishe.com/privacy")}
          >
            <Text style={styles.legalText}>{t("privacyPolicy", { ns: "common" })}</Text>
          </Pressable>
        </View>
      </View>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111111",
    textAlign: "center",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 15,
    color: "#6b6b6b",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 20,
    letterSpacing: -0.1,
  },
  featuresCard: {
    backgroundColor: "#385225",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(127, 239, 128, 0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  checkMark: {
    fontSize: 14,
    fontWeight: "700",
    color: "#7FEF80",
  },
  featureText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#ffffff",
    letterSpacing: -0.1,
  },
  planSelector: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  planOption: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E8E8E8",
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 80,
  },
  planOptionSelected: {
    borderColor: "#385225",
    backgroundColor: "#F5F9F0",
  },
  planOptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  planLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#999",
  },
  planLabelSelected: {
    color: "#385225",
  },
  saveBadge: {
    backgroundColor: "#7FEF80",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  saveBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#385225",
  },
  planPrice: {
    fontSize: 18,
    fontWeight: "700",
    color: "#999",
    marginTop: 2,
  },
  planPriceSelected: {
    color: "#111111",
  },
  planPeriod: {
    fontSize: 13,
    fontWeight: "500",
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 24,
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 13,
    color: "#6b6b6b",
    marginTop: 8,
  },
  failedContainer: {
    alignItems: "center",
    paddingVertical: 16,
    marginBottom: 4,
  },
  failedText: {
    fontSize: 14,
    color: "#6b6b6b",
    textAlign: "center",
    marginBottom: 16,
  },
  failedButtons: {
    width: "100%",
    gap: 10,
  },
  retryButton: {
    backgroundColor: "#7FEF80",
    borderRadius: 999,
    paddingVertical: 15,
    alignItems: "center",
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#385225",
    letterSpacing: -0.2,
  },
  failedCancelButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  failedCancelText: {
    fontSize: 14,
    color: "#B4B4B4",
  },
  failedRestoreButton: {
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    backgroundColor: "#ffffff",
  },
  failedRestoreText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#385225",
  },
  subscribeButton: {
    backgroundColor: "#7FEF80",
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
  },
  subscribeButtonDisabled: {
    opacity: 0.45,
  },
  subscribeButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#385225",
    letterSpacing: -0.2,
  },
  restoreButton: {
    alignItems: "center",
    paddingVertical: 13,
    marginTop: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    backgroundColor: "#ffffff",
  },
  restoreText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#385225",
  },
  subscriptionTerms: {
    fontSize: 10,
    color: "#B4B4B4",
    textAlign: "center",
    lineHeight: 14,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  legalRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 6,
  },
  legalLink: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  legalText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6b6b6b",
    textDecorationLine: "underline",
  },
  legalDot: {
    fontSize: 13,
    color: "#6b6b6b",
  },
});
