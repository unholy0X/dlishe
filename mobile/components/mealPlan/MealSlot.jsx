import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import Svg, { Path, Circle } from "react-native-svg";
import RecipePlaceholder from "../RecipePlaceholder";
import { useTranslation } from "react-i18next";

// SVG icons for each meal type — no emojis
function SunIcon({ size = 14, color = "#7A4A21" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
      <Circle cx="12" cy="12" r="5" fill={color} fillOpacity={0.2} />
      <Path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </Svg>
  );
}

function LeafIcon({ size = 14, color = "#385225" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 21c3-6 7-10 14-14-4 7-8 11-14 14Z" fill={color} fillOpacity={0.15} />
      <Path d="M6 21c0 0-1-7 4-12" />
    </Svg>
  );
}

function MoonIcon({ size = 14, color = "#943040" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color} fillOpacity={0.2} stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z" />
    </Svg>
  );
}

function CookieIcon({ size = 14, color = "#4A2D73" }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round">
      <Circle cx="12" cy="12" r="10" fill={color} fillOpacity={0.12} />
      <Circle cx="10" cy="9" r="1" fill={color} />
      <Circle cx="15" cy="13" r="1" fill={color} />
      <Circle cx="9" cy="14" r="1" fill={color} />
    </Svg>
  );
}

const MEAL_CONFIG = {
  breakfast: { label: "Breakfast", Icon: SunIcon, bg: "#FDF2E8", accent: "#7A4A21", accentBubble: "#F0A45E" },
  lunch: { label: "Lunch", Icon: LeafIcon, bg: "#EAF4E0", accent: "#385225", accentBubble: "#A3D977" },
  dinner: { label: "Dinner", Icon: MoonIcon, bg: "#FDEEEE", accent: "#943040", accentBubble: "#F9BABA" },
  snack: { label: "Snack", Icon: CookieIcon, bg: "#F2EEFD", accent: "#4A2D73", accentBubble: "#CCB7F9" },
};

function buildMeta(entry, t) {
  const totalTime = (entry.prepTime || 0) + (entry.cookTime || 0);
  if (totalTime > 0) return t("time.minOnly", { m: totalTime, ns: "common" });
  return "";
}

export default function MealSlot({ mealType, entries = [], onAdd, onRemove, onPressRecipe }) {
  const { t } = useTranslation("mealPlan");
  const config = MEAL_CONFIG[mealType] || MEAL_CONFIG.dinner;
  const { Icon } = config;

  return (
    <View style={styles.container}>
      {/* Slot header — pastel bg with accent bubble, matching StatsCardsRow */}
      <View style={[styles.header, { backgroundColor: config.bg }]}>
        <View style={[styles.accentBubble, { backgroundColor: config.accentBubble }]} />
        <View style={styles.headerInner}>
          <Icon size={14} color={config.accent} />
          <Text style={[styles.headerLabel, { color: config.accent }]}>
            {t(`mealTypes.${mealType}`, config.label)}
          </Text>
        </View>
        {entries.length > 0 && (
          <View style={[styles.countBadge, { backgroundColor: config.accent }]}>
            <Text style={styles.countBadgeText}>{entries.length}</Text>
          </View>
        )}
      </View>

      {/* Recipe cards */}
      {entries.map((entry) => {
        const meta = buildMeta(entry, t);
        return (
          <Pressable
            key={entry.id}
            style={({ pressed }) => [styles.recipeCard, pressed && { opacity: 0.75 }]}
            onPress={() => onPressRecipe && onPressRecipe(entry.recipeId)}
          >
            <View style={styles.thumbWrap}>
              <RecipePlaceholder title={entry.recipeTitle || ""} variant="small" style={styles.thumb} />
              {entry.thumbnailUrl ? (
                <Image
                  source={{ uri: entry.thumbnailUrl }}
                  style={styles.thumb}
                  transition={200}
                  cachePolicy="memory-disk"
                />
              ) : null}
            </View>
            <View style={styles.recipeInfo}>
              <Text style={styles.recipeTitle} numberOfLines={2}>
                {entry.recipeTitle || t("fallback.recipe", "Recipe")}
              </Text>
              {meta ? <Text style={styles.recipeMeta}>{meta}</Text> : null}
            </View>
            <Pressable
              style={styles.removeBtn}
              onPress={(e) => { e.stopPropagation?.(); onRemove(entry.id); }}
              hitSlop={10}
            >
              <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth={2.5} strokeLinecap="round">
                <Path d="M18 6L6 18M6 6l12 12" />
              </Svg>
            </Pressable>
          </Pressable>
        );
      })}

      {/* Add button */}
      <Pressable
        style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.6 }]}
        onPress={onAdd}
      >
        <Text style={styles.addBtnText}>{t("slot.addBtn", "+ Add recipe")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    marginBottom: 8,
    overflow: "hidden",
  },
  accentBubble: {
    position: "absolute",
    width: 50,
    height: 50,
    borderRadius: 25,
    top: -18,
    right: -12,
    opacity: 0.35,
  },
  headerInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  headerLabel: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ffffff",
  },
  recipeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 10,
    marginBottom: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  thumbWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    overflow: "hidden",
  },
  thumb: {
    width: 48,
    height: 48,
    position: "absolute",
    top: 0,
    left: 0,
  },
  recipeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  recipeTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111111",
    letterSpacing: -0.2,
  },
  recipeMeta: {
    fontSize: 12,
    color: "#6b6b6b",
    marginTop: 2,
  },
  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F4F5F7",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  addBtn: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EAEAEA",
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#385225",
    letterSpacing: -0.1,
  },
});
