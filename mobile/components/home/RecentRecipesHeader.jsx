import { BlurView } from "expo-blur";
import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import ChevronRightIcon from "../icons/ChevronRightIcon";
import { sc } from "../../utils/deviceScale";

export default function RecentRecipesHeader({ onPressSeeAll }) {
  const { t } = useTranslation("home");

  return (
    <View style={styles.row}>
      <View>
        <Text style={styles.title}>{t("sheets.suggestedTitle")}</Text>
        <Text style={styles.subtitle}>{t("basedOnYourTaste")}</Text>
      </View>
      <Pressable onPress={onPressSeeAll}>
        <BlurView intensity={105} tint="extraLight" style={styles.blur}>
          <Text style={styles.buttonText}>{t("seeAll")}</Text>
          <View style={styles.arrow}>
            <ChevronRightIcon width={sc(9)} height={sc(8)} color="#385225" />
          </View>
        </BlurView>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
  },
  blur: {
    borderWidth: 1,
    borderColor: "#ffffff",
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(0, 0, 0, 0.15)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  title: {
    fontSize: sc(18),
    fontWeight: "600",
    color: "#111111",
  },
  subtitle: {
    marginTop: 2,
    fontSize: sc(13),
    color: "#B4B4B4",
    letterSpacing: -0.05,
  },
  buttonText: {
    fontSize: sc(13),
    fontWeight: "600",
    color: "#385225",
  },
  arrow: {
    marginLeft: 8,
  },
});
