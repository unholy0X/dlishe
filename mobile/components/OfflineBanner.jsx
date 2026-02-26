import React, { useEffect, useRef, useState } from "react";
import { Text, StyleSheet, Animated } from "react-native";
import * as Network from "expo-network";
import { useTranslation } from "react-i18next";

/**
 * Returns true ONLY when connectivity is definitively offline.
 * - isConnected === false  → definitely no network
 * - isInternetReachable === false  → connected but no internet (captive portal, etc.)
 * - null / undefined → unknown (Android returns null while probing); treat as online
 *   to avoid false-positive offline banners on launch.
 */
function isDefinitelyOffline(state) {
  if (!state) return false;
  if (state.isConnected === false) return true;
  if (state.isInternetReachable === false) return true;
  return false;
}

export default function OfflineBanner() {
  const { t } = useTranslation("common");
  const [offline, setOffline] = useState(false);
  const slideAnim = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    let mounted = true;

    // Seed the initial state synchronously so there is no gap on mount.
    Network.getNetworkStateAsync()
      .then((state) => {
        if (mounted) setOffline(isDefinitelyOffline(state));
      })
      .catch(() => {
        // If the initial probe fails, assume online — do not show false alarm.
      });

    // Subscribe to real-time state changes; no polling, zero battery overhead.
    const subscription = Network.addNetworkStateListener((state) => {
      if (mounted) setOffline(isDefinitelyOffline(state));
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: offline ? 0 : -60,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [offline, slideAnim]);

  return (
    <Animated.View
      style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}
      pointerEvents="none"
    >
      <Text style={styles.text}>{t("noInternet")}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: "#cc3b3b",
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  text: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
});
