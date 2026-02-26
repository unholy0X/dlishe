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
  ActivityIndicator,
} from "react-native";
import { sc, isTablet } from "../../utils/deviceScale";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useClerk, useUser } from "@clerk/clerk-expo";
import { useAuth } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import RulerIcon from "../icons/RulerIcon";
import GlobeIcon from "../icons/GlobeIcon";
import LogoutIcon from "../icons/LogoutIcon";
import TrashIcon from "../icons/TrashIcon";
import CrownIcon from "../icons/CrownIcon";
import { FOOD_AVATARS, AVATAR_COLORS } from "../avatars/FoodAvatars";
import { useUserStore, useSubscriptionStore, useDemoStore } from "../../store";
import { useLanguageStore } from "../../store/languageStore";
import PaywallSheet from "../paywall/PaywallSheet";
import { deleteAccount } from "../../services/user";

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
  const { t } = useTranslation("home");
  const { t: tc } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const entitlement = useSubscriptionStore((s) => s.entitlement);

  const firstName = useUserStore((s) => s.firstName);
  const lastName = useUserStore((s) => s.lastName);
  const imageUrl = useUserStore((s) => s.imageUrl);
  const preferredUnitSystem = useUserStore((s) => s.preferredUnitSystem);
  const updatePreferences = useUserStore((s) => s.updatePreferences);

  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);

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
            size={sc(50)}
          />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.welcomeTitle}>{t("profile.welcome", { name: displayName })}</Text>
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
        <View style={styles.menuSheet}>
          {/* Constrained inner content for iPad centering */}
          <View style={[styles.sheetInner, { paddingBottom: insets.bottom + 20 }]}>
            {/* Grabber */}
            <View style={styles.grabber} />

            {/* Profile header */}
            <View style={styles.profileSection}>
              <Avatar
                imageUrl={imageUrl}
                firstName={firstName}
                lastName={lastName}
                size={sc(56)}
              />
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{displayName}</Text>
                {email ? <Text style={styles.profileEmail}>{email}</Text> : null}
              </View>
            </View>

            {/* Preferences */}
            <Text style={styles.sectionLabel}>{t("profile.kitchenPrefs")}</Text>

            <Pressable style={styles.menuRow} onPress={toggleUnit}>
              <View style={styles.menuRowIconWrap}>
                <RulerIcon width={sc(20)} height={sc(20)} color="#385225" />
              </View>
              <View style={styles.menuRowContent}>
                <Text style={styles.menuRowTitle}>{t("profile.measurementUnits")}</Text>
                <Text style={styles.menuRowValue}>
                  {preferredUnitSystem === "metric" ? t("profile.metricLabel") : t("profile.imperialLabel")}
                </Text>
              </View>
              <View style={styles.unitToggle}>
                <Text style={[
                  styles.unitOption,
                  preferredUnitSystem === "metric" && styles.unitOptionActive,
                ]}>{t("profile.metric")}</Text>
                <Text style={[
                  styles.unitOption,
                  preferredUnitSystem === "imperial" && styles.unitOptionActive,
                ]}>{t("profile.imperial")}</Text>
              </View>
            </Pressable>

            {/* Language selector */}
            <View style={[styles.menuRow, { marginTop: sc(8) }]}>
              <View style={styles.menuRowIconWrap}>
                <GlobeIcon width={sc(20)} height={sc(20)} color="#385225" />
              </View>
              <View style={styles.menuRowContent}>
                <Text style={styles.menuRowTitle}>{t("profile.language")}</Text>
                <Text style={styles.menuRowValue}>{t(`profile.languageValue_${language}`)}</Text>
              </View>
              <View style={styles.unitToggle}>
                {["en", "fr", "ar"].map((lang) => (
                  <Pressable key={lang} onPress={() => setLanguage(lang, getToken)}>
                    <Text style={[
                      styles.unitOption,
                      language === lang && styles.unitOptionActive,
                    ]}>{lang.toUpperCase()}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Subscription */}
            {entitlement === "pro" ? (
              <View style={[styles.menuRow, { marginTop: sc(10) }]}>
                <View style={[styles.menuRowIconWrap, { backgroundColor: "#DFF7C4" }]}>
                  <CrownIcon width={sc(20)} height={sc(20)} color="#385225" />
                </View>
                <View style={styles.menuRowContent}>
                  <Text style={styles.menuRowTitle}>{t("profile.proPlan")}</Text>
                  <Text style={styles.menuRowValue}>{t("profile.proValue")}</Text>
                </View>
              </View>
            ) : (
              <Pressable
                style={[styles.menuRow, { marginTop: sc(10) }]}
                onPress={() => {
                  setOpen(false);
                  setTimeout(() => setPaywallVisible(true), 300);
                }}
              >
                <View style={[styles.menuRowIconWrap, { backgroundColor: "#FFF8E1" }]}>
                  <CrownIcon width={sc(20)} height={sc(20)} color="#F9A825" />
                </View>
                <View style={styles.menuRowContent}>
                  <Text style={styles.menuRowTitle}>{t("profile.upgradePro")}</Text>
                  <Text style={styles.menuRowValue}>{t("profile.upgradeValue")}</Text>
                </View>
              </Pressable>
            )}

            {/* Log out */}
            <View style={styles.menuDivider} />

            <Pressable
              style={styles.logoutRow}
              onPress={async () => {
                setOpen(false);
                // Demo mode — deactivate without calling Clerk
                if (useDemoStore.getState().isDemoMode) {
                  await useDemoStore.getState().deactivate();
                  router.replace("/");
                  return;
                }
                try {
                  await signOut();
                  router.replace("/");
                } catch {
                  Alert.alert(t("profile.logoutFailed"), t("profile.logoutFailedMsg"));
                }
              }}
            >
              <View style={styles.logoutIconWrap}>
                <LogoutIcon width={sc(20)} height={sc(20)} color="#cc3b3b" />
              </View>
              <Text style={styles.logoutText}>{t("profile.logout")}</Text>
            </Pressable>

            {/* Delete account — Apple Settings-style danger row */}
            <Text style={[styles.sectionLabel, styles.dangerLabel]}>{tc("deleteAccount").toUpperCase()}</Text>
            <Pressable
              style={({ pressed }) => [
                styles.menuRow,
                styles.deleteRow,
                pressed && styles.deleteRowPressed,
                deletingAccount && styles.deleteRowDisabled,
              ]}
              onPress={() => {
                Alert.alert(
                  tc("deleteAccount"),
                  tc("deleteAccountMsg"),
                  [
                    { text: tc("buttons.cancel"), style: "cancel" },
                    {
                      text: tc("deleteAccountConfirm"),
                      style: "destructive",
                      onPress: async () => {
                        setDeletingAccount(true);
                        try {
                          await deleteAccount({ getToken });
                          // Backend data wiped — delete Clerk identity.
                          // If Clerk delete fails, fall back to signOut so the
                          // session is still cleared (data is already gone).
                          try {
                            await user?.delete();
                          } catch {
                            await signOut();
                          }
                          router.replace("/");
                        } catch {
                          Alert.alert(tc("deleteAccount"), tc("deleteAccountError"));
                        } finally {
                          setDeletingAccount(false);
                        }
                      },
                    },
                  ]
                );
              }}
              disabled={deletingAccount}
            >
              <View style={styles.deleteIconWrap}>
                {deletingAccount ? (
                  <ActivityIndicator size="small" color="#D63031" />
                ) : (
                  <TrashIcon width={sc(20)} height={sc(20)} color="#D63031" />
                )}
              </View>
              <View style={styles.menuRowContent}>
                <Text style={styles.deleteTitle}>{tc("deleteAccount")}</Text>
                <Text style={styles.deleteSubtitle}>{tc("deleteAccountMsg").split(".")[0]}.</Text>
              </View>
            </Pressable>

            {/* Legal links */}
            <View style={styles.legalRow}>
              <Pressable
                style={styles.legalLinkWrap}
                onPress={() => Linking.openURL("https://dlishe.com/terms")}
              >
                <Text style={styles.legalLink}>{t("termsOfUse", { ns: "common" })}</Text>
              </Pressable>
              <Text style={styles.legalDot}> · </Text>
              <Pressable
                style={styles.legalLinkWrap}
                onPress={() => Linking.openURL("https://dlishe.com/privacy")}
              >
                <Text style={styles.legalLink}>{t("privacyPolicy", { ns: "common" })}</Text>
              </Pressable>
            </View>
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
    fontSize: sc(16),
    fontWeight: "600",
    color: "#111111",
    letterSpacing: -0.05,
  },
  welcomeSubtitle: {
    marginTop: 2,
    fontSize: sc(12),
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
    // Center content on iPad while background spans full width
    alignItems: "center",
  },
  // Constrained content wrapper — max 620pt on iPad, full-width on phone
  sheetInner: {
    width: "100%",
    maxWidth: isTablet ? 620 : undefined,
    paddingHorizontal: sc(20),
    paddingTop: 10,
  },
  grabber: {
    alignSelf: "center",
    width: sc(44),
    height: sc(4),
    borderRadius: sc(2),
    backgroundColor: "#d9d9d9",
    marginBottom: sc(20),
  },
  // Profile section
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: sc(24),
  },
  profileInfo: {
    marginLeft: sc(14),
    flex: 1,
  },
  profileName: {
    fontSize: sc(20),
    fontWeight: "600",
    color: "#111111",
    letterSpacing: -0.2,
    lineHeight: sc(26),
  },
  profileEmail: {
    marginTop: 3,
    fontSize: sc(13),
    color: "#B4B4B4",
    letterSpacing: -0.05,
    lineHeight: sc(18),
  },
  // Section label
  sectionLabel: {
    fontSize: sc(12),
    fontWeight: "500",
    color: "#B4B4B4",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: sc(10),
    lineHeight: sc(16),
  },
  // Menu rows
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: sc(16),
  },
  menuRowIconWrap: {
    width: sc(44),
    height: sc(44),
    borderRadius: sc(22),
    backgroundColor: "#F4F5F7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: sc(14),
  },
  menuRowContent: {
    flex: 1,
  },
  menuRowTitle: {
    fontSize: sc(15),
    fontWeight: "600",
    color: "#111111",
    letterSpacing: -0.1,
    lineHeight: sc(20),
  },
  menuRowValue: {
    marginTop: 2,
    fontSize: sc(12),
    color: "#B4B4B4",
    lineHeight: sc(16),
  },
  // Segmented control (Metric/Imperial, EN/FR/AR)
  unitToggle: {
    flexDirection: "row",
    backgroundColor: "#F4F5F7",
    borderRadius: sc(10),
    overflow: "hidden",
    marginLeft: sc(12),
  },
  unitOption: {
    paddingHorizontal: sc(12),
    paddingVertical: sc(8),
    fontSize: sc(12),
    fontWeight: "500",
    color: "#B4B4B4",
    lineHeight: sc(16),
  },
  unitOptionActive: {
    backgroundColor: "#7FEF80",
    color: "#385225",
    fontWeight: "600",
    borderRadius: sc(10),
    overflow: "hidden",
  },
  // Divider & logout
  menuDivider: {
    height: 1,
    backgroundColor: "#EAEAEA",
    marginVertical: sc(16),
  },
  logoutRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: sc(10),
    paddingBottom: sc(10),
  },
  logoutIconWrap: {
    width: sc(44),
    height: sc(44),
    borderRadius: sc(22),
    backgroundColor: "#FFF0F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: sc(14),
  },
  logoutText: {
    fontSize: sc(15),
    fontWeight: "500",
    color: "#cc3b3b",
    lineHeight: sc(20),
  },
  // Danger section
  dangerLabel: {
    marginTop: sc(20),
    color: "#D63031",
    opacity: 0.6,
  },
  deleteRow: {
    borderWidth: 1,
    borderColor: "rgba(214, 48, 49, 0.15)",
    backgroundColor: "#FFF5F5",
  },
  deleteRowPressed: {
    backgroundColor: "#FFE8E8",
    opacity: 0.85,
  },
  deleteRowDisabled: {
    opacity: 0.5,
  },
  deleteIconWrap: {
    width: sc(44),
    height: sc(44),
    borderRadius: sc(22),
    backgroundColor: "rgba(214, 48, 49, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: sc(14),
  },
  deleteTitle: {
    fontSize: sc(15),
    fontWeight: "600",
    color: "#D63031",
    letterSpacing: -0.1,
    lineHeight: sc(20),
  },
  deleteSubtitle: {
    marginTop: 2,
    fontSize: sc(12),
    color: "rgba(214, 48, 49, 0.55)",
    lineHeight: sc(16),
  },
  legalRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: sc(16),
    paddingVertical: 6,
  },
  legalLinkWrap: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  legalLink: {
    fontSize: sc(13),
    fontWeight: "500",
    color: "#6b6b6b",
    textDecorationLine: "underline",
    lineHeight: sc(18),
  },
  legalDot: {
    fontSize: sc(13),
    color: "#6b6b6b",
    marginHorizontal: 4,
  },
});
