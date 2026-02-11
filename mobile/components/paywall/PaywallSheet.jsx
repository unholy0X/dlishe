import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useAuth } from "@clerk/clerk-expo";
import BottomSheetModal from "../BottomSheetModal";
import { useSubscriptionStore } from "../../store";

const REASON_MESSAGES = {
  extraction_limit: "You've used all your free extractions this month",
  scan_limit: "You've used all your free pantry scans this month",
  recipe_limit: "You've reached the saved recipe limit",
};

export default function PaywallSheet({ visible, onClose, reason }) {
  const { getToken } = useAuth();
  const offerings = useSubscriptionStore((s) => s.offerings);
  const entitlement = useSubscriptionStore((s) => s.entitlement);
  const purchasePackage = useSubscriptionStore((s) => s.purchasePackage);
  const restorePurchases = useSubscriptionStore((s) => s.restorePurchases);

  const [purchasing, setPurchasing] = useState(null); // "monthly" | "annual" | null
  const [restoring, setRestoring] = useState(false);

  const monthlyPkg = offerings?.availablePackages?.find(
    (p) => p.packageType === "MONTHLY" || p.identifier === "$rc_monthly"
  );
  const annualPkg = offerings?.availablePackages?.find(
    (p) => p.packageType === "ANNUAL" || p.identifier === "$rc_annual"
  );

  const monthlyPrice = monthlyPkg?.product?.priceString || "$2.99/month";
  const annualPrice = annualPkg?.product?.priceString || "$19.99/year";

  const handlePurchase = async (pkg, label) => {
    if (!pkg) {
      Alert.alert("Unavailable", "This plan isn't available right now. Please try again later.");
      return;
    }
    setPurchasing(label);
    try {
      await purchasePackage({ pkg, getToken });
      onClose();
      Alert.alert("Welcome to Pro!", "You now have unlimited access.");
    } catch (err) {
      if (err.userCancelled) return;
      Alert.alert("Purchase failed", err?.message || "Something went wrong. Please try again.");
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
        Alert.alert("Restored!", "Your Pro subscription has been restored.");
      } else {
        Alert.alert("No subscription found", "We couldn't find an active subscription to restore.");
      }
    } catch (err) {
      Alert.alert("Restore failed", err?.message || "Something went wrong.");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <BottomSheetModal visible={visible} onClose={onClose}>
      <Text style={styles.title}>Upgrade to Pro</Text>

      {reason && REASON_MESSAGES[reason] ? (
        <View style={styles.reasonBanner}>
          <Text style={styles.reasonText}>{REASON_MESSAGES[reason]}</Text>
        </View>
      ) : null}

      {/* Free tier card */}
      <View style={styles.tierCard}>
        <View style={styles.tierHeader}>
          <Text style={styles.tierName}>Free</Text>
          {entitlement === "free" && (
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>Current</Text>
            </View>
          )}
        </View>
        <Text style={styles.tierFeature}>10 recipe extractions/mo</Text>
        <Text style={styles.tierFeature}>5 pantry scans/mo</Text>
        <Text style={styles.tierFeature}>25 saved recipes</Text>
      </View>

      {/* Pro tier card */}
      <View style={[styles.tierCard, styles.proCard]}>
        <View style={styles.tierHeader}>
          <Text style={[styles.tierName, styles.proTierName]}>Pro</Text>
          {entitlement === "pro" ? (
            <View style={[styles.currentBadge, styles.proBadge]}>
              <Text style={[styles.currentBadgeText, styles.proBadgeText]}>Active</Text>
            </View>
          ) : (
            <View style={[styles.currentBadge, styles.proBadge]}>
              <Text style={[styles.currentBadgeText, styles.proBadgeText]}>Best value</Text>
            </View>
          )}
        </View>
        <Text style={[styles.tierFeature, styles.proFeature]}>Unlimited extractions</Text>
        <Text style={[styles.tierFeature, styles.proFeature]}>Unlimited pantry scans</Text>
        <Text style={[styles.tierFeature, styles.proFeature]}>Unlimited saved recipes</Text>
      </View>

      {entitlement !== "pro" && (
        <>
          {/* Monthly button */}
          <Pressable
            style={styles.purchaseButton}
            onPress={() => handlePurchase(monthlyPkg, "monthly")}
            disabled={!!purchasing || restoring}
          >
            {purchasing === "monthly" ? (
              <ActivityIndicator size="small" color="#385225" />
            ) : (
              <Text style={styles.purchaseButtonText}>{monthlyPrice}</Text>
            )}
          </Pressable>

          {/* Annual button */}
          <Pressable
            style={[styles.purchaseButton, styles.annualButton]}
            onPress={() => handlePurchase(annualPkg, "annual")}
            disabled={!!purchasing || restoring}
          >
            {purchasing === "annual" ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={[styles.purchaseButtonText, styles.annualButtonText]}>
                {annualPrice} — Save 44%
              </Text>
            )}
          </Pressable>

          {/* Restore */}
          <Pressable
            style={styles.restoreButton}
            onPress={handleRestore}
            disabled={!!purchasing || restoring}
          >
            {restoring ? (
              <ActivityIndicator size="small" color="#6b6b6b" />
            ) : (
              <Text style={styles.restoreText}>Restore purchases</Text>
            )}
          </Pressable>
        </>
      )}
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: "#111111",
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: -0.2,
  },
  reasonBanner: {
    backgroundColor: "#FFF3E0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  reasonText: {
    fontSize: 14,
    color: "#E65100",
    textAlign: "center",
    fontWeight: "500",
  },
  tierCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
  },
  proCard: {
    backgroundColor: "#385225",
  },
  tierHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  tierName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111111",
  },
  proTierName: {
    color: "#ffffff",
  },
  currentBadge: {
    backgroundColor: "#F4F5F7",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  currentBadgeText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#6b6b6b",
  },
  proBadge: {
    backgroundColor: "#7FEF80",
  },
  proBadgeText: {
    color: "#385225",
  },
  tierFeature: {
    fontSize: 14,
    color: "#6b6b6b",
    marginTop: 4,
    letterSpacing: -0.05,
  },
  proFeature: {
    color: "rgba(255,255,255,0.8)",
  },
  purchaseButton: {
    backgroundColor: "#7FEF80",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  purchaseButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#385225",
  },
  annualButton: {
    backgroundColor: "#385225",
  },
  annualButtonText: {
    color: "#ffffff",
  },
  restoreButton: {
    marginTop: 14,
    alignItems: "center",
    paddingVertical: 8,
    marginBottom: 8,
  },
  restoreText: {
    fontSize: 14,
    color: "#6b6b6b",
  },
});
