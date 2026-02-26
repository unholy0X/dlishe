import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import DotsVerticalIcon from "../icons/DotsVerticalIcon";
import PlusIcon from "../icons/PlusIcon";
import { useTranslation } from "react-i18next";

export default function RecipesHeader({
  title,
  subtitle,
  onPressMore,
  onPressAdd,
}) {
  const { t } = useTranslation("recipe");
  const defaultTitle = t("list.menuTitle", "My Recipes");
  const defaultSubtitle = t("list.title_other", { count: 0 }, "0 recipes saved");
  return (
    <View style={styles.row}>
      <View>
        <Text style={styles.title}>{title || defaultTitle}</Text>
        <Text style={styles.subtitle}>{subtitle || defaultSubtitle}</Text>
      </View>

      <View style={styles.actions}>
        <Pressable onPress={onPressMore}>
          <BlurView intensity={120} tint="light" style={styles.blur}>
            <DotsVerticalIcon width={6} height={20} color="#B4B4B4" />
          </BlurView>
        </Pressable>

        <Pressable onPress={onPressAdd} style={styles.addButton}>
          <PlusIcon width={24} height={24} color="#385225" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 24,
    fontWeight: "500",
    color: "#000",
    letterSpacing: -0.05,
  },
  subtitle: {
    marginTop: 3,
    fontSize: 14,
    color: "#B4B4B4",
    letterSpacing: -0.05,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
  },
  blur: {
    width: 50,
    height: 50,
    borderWidth: 1,
    borderColor: "#ffffff",
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(0, 0, 0, 0.15)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    margin: 3,
  },
  addButton: {
    width: 50,
    height: 50,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7FEF80",
  },
});
