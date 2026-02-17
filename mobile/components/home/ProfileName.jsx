import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Modal,
  Alert,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useClerk, useUser } from "@clerk/clerk-expo";
import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import RulerIcon from "../icons/RulerIcon";
import LogoutIcon from "../icons/LogoutIcon";
import CrownIcon from "../icons/CrownIcon";
import { FOOD_AVATARS, AVATAR_COLORS } from "../avatars/FoodAvatars";
import { useUserStore, useSubscriptionStore } from "../../store";
import PaywallSheet from "../paywall/PaywallSheet";

function hashName(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = name.charCodeAt(i) + ((h << 5) - h);
  }
  return Math.abs(h);
}

function Avatar({ imageUrl, firstName, lastName, size = 50 }) {
  if (imageUrl) {
    return (
      <Image
        style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
        source={{ uri: imageUrl }}
      />
    );
  }

  const name = `${firstName || ""}${lastName || ""}`;
  const idx = hashName(name) % FOOD_AVATARS.length;
  const bg = AVATAR_COLORS[idx];
  const FoodIcon = FOOD_AVATARS[idx];

  return (
    <View
      style={[
        styles.avatarFallback,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
      ]}
    >
      <FoodIcon size={size} />
    </View>
  );
}

export default function ProfileName({ subtitle = "Your kitchen awaits" }) {
  const { signOut } = useClerk();
  const { getToken } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);

  const entitlement = useSubscriptionStore((s) => s.entitlement);

  const firstName = useUserStore((s) => s.firstName);
  const lastName = useUserStore((s) => s.lastName);
  const imageUrl = useUserStore((s) => s.imageUrl);
  const preferredUnitSystem = useUserStore((s) => s.preferredUnitSystem);
  const updatePreferences = useUserStore((s) => s.updatePreferences);

  const displayName = firstName || lastName ? `${firstName} ${lastName}`.trim() : "Chef";
  const email = user?.primaryEmailAddress?.emailAddress || "";

  const toggleUnit = () => {
    const next = preferredUnitSystem === "metric" ? "imperial" : "metric";
    updatePreferences({ preferredUnitSystem: next, getToken });
  };

  return (
    <View style={styles.wrapper}>
      <Pressable onPress={() => setOpen(true)}>
        <View style={styles.welcomeCard}>
          <Avatar
            imageUrl={imageUrl}
            firstName={firstName}
            lastName={lastName}
            size={50}
          />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.welcomeTitle}>Welcome {displayName}!</Text>
            <Text style={styles.welcomeSubtitle}>{subtitle}</Text>
          </View>
        </View>
      </Pressable>

      <Modal
        transparent
        visible={open}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
        <View style={[styles.menuSheet, { paddingBottom: insets.bottom + 20 }]}>
          {/* Grabber */}
          <View style={styles.grabber} />

          {/* Profile header */}
          <View style={styles.profileSection}>
            <Avatar
              imageUrl={imageUrl}
              firstName={firstName}
              lastName={lastName}
              size={56}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{displayName}</Text>
              {email ? <Text style={styles.profileEmail}>{email}</Text> : null}
            </View>
          </View>

          {/* Preferences */}
          <Text style={styles.sectionLabel}>Kitchen preferences</Text>

          <Pressable style={styles.menuRow} onPress={toggleUnit}>
            <View style={styles.menuRowIconWrap}>
              <RulerIcon width={20} height={20} color="#385225" />
            </View>
            <View style={styles.menuRowContent}>
              <Text style={styles.menuRowTitle}>Measurement units</Text>
              <Text style={styles.menuRowValue}>
                {preferredUnitSystem === "metric" ? "Metric (g, ml)" : "Imperial (oz, cups)"}
              </Text>
            </View>
            <View style={styles.unitToggle}>
              <Text style={[
                styles.unitOption,
                preferredUnitSystem === "metric" && styles.unitOptionActive,
              ]}>Metric</Text>
              <Text style={[
                styles.unitOption,
                preferredUnitSystem === "imperial" && styles.unitOptionActive,
              ]}>Imperial</Text>
            </View>
          </Pressable>

          {/* Subscription */}
          {entitlement === "pro" ? (
            <View style={[styles.menuRow, { marginTop: 10 }]}>
              <View style={[styles.menuRowIconWrap, { backgroundColor: "#DFF7C4" }]}>
                <CrownIcon width={20} height={20} color="#385225" />
              </View>
              <View style={styles.menuRowContent}>
                <Text style={styles.menuRowTitle}>Pro Member</Text>
                <Text style={styles.menuRowValue}>All limits removed</Text>
              </View>
            </View>
          ) : (
            <Pressable
              style={[styles.menuRow, { marginTop: 10 }]}
              onPress={() => {
                setOpen(false);
                setTimeout(() => setPaywallVisible(true), 300);
              }}
            >
              <View style={[styles.menuRowIconWrap, { backgroundColor: "#FFF8E1" }]}>
                <CrownIcon width={20} height={20} color="#F9A825" />
              </View>
              <View style={styles.menuRowContent}>
                <Text style={styles.menuRowTitle}>Upgrade to Pro</Text>
                <Text style={styles.menuRowValue}>No limits on recipes & more</Text>
              </View>
            </Pressable>
          )}

          {/* Log out */}
          <View style={styles.menuDivider} />

          <Pressable
            style={styles.logoutRow}
            onPress={async () => {
              setOpen(false);
              try {
                await signOut();
                router.replace("/");
              } catch {
                Alert.alert("Sign out failed", "Please try again.");
              }
            }}
          >
            <View style={styles.logoutIconWrap}>
              <LogoutIcon width={20} height={20} color="#cc3b3b" />
            </View>
            <Text style={styles.logoutText}>Log out</Text>
          </Pressable>

          {/* Legal links */}
          <View style={styles.legalRow}>
            <Pressable
              style={styles.legalLinkWrap}
              onPress={() => Linking.openURL("https://dlishe.com/terms")}
            >
              <Text style={styles.legalLink}>Terms of Use (EULA)</Text>
            </Pressable>
            <Text style={styles.legalDot}> · </Text>
            <Pressable
              style={styles.legalLinkWrap}
              onPress={() => Linking.openURL("https://dlishe.com/privacy")}
            >
              <Text style={styles.legalLink}>Privacy Policy</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <PaywallSheet
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    marginBottom: 13,
  },
  welcomeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  avatar: {},
  avatarFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  welcomeTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111111",
    letterSpacing: -0.05,
  },
  welcomeSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#6b6b6b",
    letterSpacing: -0.05,
  },
  // Menu overlay
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  menuSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#F4F5F7",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
  // Profile section
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  profileInfo: {
    marginLeft: 14,
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111111",
    letterSpacing: -0.2,
  },
  profileEmail: {
    marginTop: 3,
    fontSize: 13,
    color: "#B4B4B4",
    letterSpacing: -0.05,
  },
  // Section
  sectionLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#B4B4B4",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  // Menu rows
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 14,
  },
  menuRowIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F4F5F7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuRowContent: {
    flex: 1,
  },
  menuRowTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111111",
    letterSpacing: -0.1,
  },
  menuRowValue: {
    marginTop: 2,
    fontSize: 12,
    color: "#B4B4B4",
  },
  unitToggle: {
    flexDirection: "row",
    backgroundColor: "#F4F5F7",
    borderRadius: 10,
    overflow: "hidden",
  },
  unitOption: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    fontSize: 12,
    fontWeight: "500",
    color: "#B4B4B4",
  },
  unitOptionActive: {
    backgroundColor: "#7FEF80",
    color: "#385225",
    fontWeight: "600",
    borderRadius: 10,
    overflow: "hidden",
  },
  // Divider & logout
  menuDivider: {
    height: 1,
    backgroundColor: "#EAEAEA",
    marginVertical: 16,
  },
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingBottom: 8,
  },
  logoutIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF0F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#cc3b3b",
  },
  legalRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 6,
  },
  legalLinkWrap: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  legalLink: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6b6b6b",
    textDecorationLine: "underline",
  },
  legalDot: {
    fontSize: 13,
    color: "#6b6b6b",
    marginHorizontal: 4,
  },
});
