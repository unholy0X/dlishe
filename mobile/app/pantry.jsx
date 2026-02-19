import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Image,
  LayoutAnimation,
  UIManager,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, usePathname } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import FloatingNav from "../components/FloatingNav";
import SwipeNavigator from "../components/SwipeNavigator";
import PantryHeader from "../components/pantry/PantryHeader";
import PantryEmptyState from "../components/pantry/PantryEmptyState";
import BottomSheetModal from "../components/BottomSheetModal";
import AddToPantrySheetContent from "../components/pantry/AddToPantrySheetContent";
import AddRecipeSheetContent from "../components/recipies/AddRecipeSheetContent";
import { useTranslation } from "react-i18next";
import { usePantryStore } from "../store";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Category images - same as AddToPantrySheetContent
const CATEGORY_IMAGES = {
  dairy: require("../assets/Dairy.png"),
  produce: require("../assets/produce.png"),
  proteins: require("../assets/proteins.png"),
  bakery: require("../assets/bakery.png"),
  spices: require("../assets/spices.png"),
  pantry: require("../assets/pantry.png"),
  beverages: require("../assets/beverages.png"),
  condiments: require("../assets/beverages1.png"),
  snacks: require("../assets/snacks.png"),
  frozen: require("../assets/frozen.png"),
  household: require("../assets/household.png"),
  other: require("../assets/pantry.png"),
};

// Subtle tinted backgrounds per category
const CATEGORY_TINTS = {
  dairy: { bg: "#EBF3FD", accent: "#DAE8F9" },
  produce: { bg: "#F0F8E8", accent: "#E2F0D4" },
  proteins: { bg: "#FDEEEE", accent: "#F9DEDE" },
  bakery: { bg: "#FDF2E8", accent: "#F9E4D0" },
  spices: { bg: "#FDF2E8", accent: "#F9E4D0" },
  pantry: { bg: "#F2EEFD", accent: "#E6DFFA" },
  beverages: { bg: "#ECF6F3", accent: "#DBEeE8" },
  condiments: { bg: "#FDF2E8", accent: "#F9E4D0" },
  snacks: { bg: "#F2EEFD", accent: "#E6DFFA" },
  frozen: { bg: "#EBF3FD", accent: "#DAE8F9" },
  household: { bg: "#ECF6F3", accent: "#DBEeE8" },
  other: { bg: "#F4F5F7", accent: "#E8E8E8" },
};

const CategoryFolder = ({ category, items, isExpanded, onToggle, onDeleteItem }) => {
  const { t } = useTranslation("pantry");
  const image = CATEGORY_IMAGES[category] || CATEGORY_IMAGES.other;
  const tint = CATEGORY_TINTS[category] || CATEGORY_TINTS.other;
  const displayName = t(`categories.${category}`);
  const previewItems = items.slice(0, 4);

  return (
    <Pressable
      style={[styles.folder, { backgroundColor: isExpanded ? "#ffffff" : tint.bg }]}
      onPress={onToggle}
    >
      {/* Accent circle */}
      <View style={[styles.folderAccent, { backgroundColor: tint.accent }]} />

      {/* Folder Header */}
      <View style={styles.folderHeader}>
        <View style={styles.folderImageWrap}>
          <Image source={image} style={styles.folderImage} resizeMode="contain" />
        </View>
        <View style={styles.folderInfo}>
          <Text style={styles.folderTitle}>{displayName}</Text>
          <View style={styles.folderMeta}>
            <Text style={styles.folderCount}>{t("itemCount", { count: items.length })}</Text>
          </View>
        </View>
        <View style={[styles.expandIcon, isExpanded && styles.expandIconActive]}>
          <Text style={[styles.expandIconText, isExpanded && styles.expandIconTextActive]}>
            {isExpanded ? "−" : "+"}
          </Text>
        </View>
      </View>

      {/* Preview chips when collapsed */}
      {!isExpanded && items.length > 0 && (
        <View style={styles.previewRow}>
          {previewItems.map((item) => (
            <View key={item.id} style={styles.previewChip}>
              <Text style={styles.previewChipText} numberOfLines={1}>{item.name}</Text>
            </View>
          ))}
          {items.length > 4 && (
            <View style={styles.previewMore}>
              <Text style={styles.previewMoreText}>+{items.length - 4}</Text>
            </View>
          )}
        </View>
      )}

      {/* Expanded items grid */}
      {isExpanded && (
        <View style={styles.expandedGrid}>
          {items.map((item) => (
            <Pressable
              key={item.id}
              style={styles.itemChip}
              onLongPress={() => onDeleteItem(item.id)}
              delayLongPress={400}
            >
              <View style={styles.itemContent}>
                <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                {item.quantity && (
                  <Text style={styles.itemQty}>
                    {item.quantity}{item.unit ? ` ${item.unit}` : ""}
                  </Text>
                )}
              </View>
              <Pressable
                style={styles.itemDelete}
                onPress={() => onDeleteItem(item.id)}
                hitSlop={10}
              >
                <Text style={styles.itemDeleteText}>✕</Text>
              </Pressable>
            </Pressable>
          ))}
        </View>
      )}
    </Pressable>
  );
};

export default function PantryScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const activeKey = pathname.replace("/", "") || "pantry";
  const { t } = useTranslation("pantry");
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [isAddRecipeOpen, setAddRecipeOpen] = useState(false);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});

  const { getToken } = useAuth();
  const { groups, total, isLoading, error, loadPantry, removeItem, clearPantry } = usePantryStore();

  useEffect(() => {
    loadPantry({ getToken }).catch(() => {});
  }, []);

  // Refresh when navigating back to this screen
  useEffect(() => {
    if (pathname === "/pantry") {
      loadPantry({ getToken }).catch(() => {});
    }
  }, [pathname]);

  const onRefresh = useCallback(() => {
    loadPantry({ getToken }).catch(() => {});
  }, [getToken]);

  const handleDelete = useCallback(
    async (itemId) => {
      try {
        await removeItem({ getToken, itemId });
      } catch (err) {
        Alert.alert(t("errors:pantry.removeItemFailed"), t("tryAgain", { ns: "common" }));
      }
    },
    [getToken]
  );

  const toggleCategory = useCallback((category) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  }, []);

  const handleSheetClose = () => {
    setSheetOpen(false);
    loadPantry({ getToken }).catch(() => {});
  };

  const handleClearPantry = useCallback(() => {
    setMenuOpen(false);
    Alert.alert(
      t("resetConfirm.title"),
      t("resetConfirm.message", { count: total }),
      [
        { text: t("resetConfirm.keep"), style: "cancel" },
        {
          text: t("resetConfirm.reset"),
          style: "destructive",
          onPress: async () => {
            setIsClearing(true);
            try {
              await clearPantry({ getToken });
            } catch (err) {
              Alert.alert(t("errors:pantry.clearFailed"), t("tryAgain", { ns: "common" }));
            } finally {
              setIsClearing(false);
            }
          },
        },
      ]
    );
  }, [getToken, total]);

  const isEmpty = !isLoading && groups.length === 0;

  return (
    <View style={styles.screen}>
      <SwipeNavigator>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {isEmpty ? (
          <View style={styles.emptyWrapper}>
            <PantryEmptyState onPressAdd={() => setSheetOpen(true)} />
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={isLoading && groups.length > 0}
                onRefresh={onRefresh}
                tintColor="#385225"
              />
            }
          >
            <View style={styles.paddedContainer}>
              <PantryHeader
                subtitle={t("header.title", { count: total })}
                onPressMore={() => setMenuOpen(true)}
                onPressAdd={() => setSheetOpen(true)}
              />
            </View>

            {isLoading && groups.length === 0 ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color="#385225" />
                <Text style={styles.loadingText}>{t("loading")}</Text>
              </View>
            ) : error ? (
              <View style={styles.centered}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : (
              <View style={styles.foldersContainer}>
                {groups.map((group) => (
                  <CategoryFolder
                    key={group.category}
                    category={group.category}
                    items={group.items || []}
                    isExpanded={expandedCategories[group.category]}
                    onToggle={() => toggleCategory(group.category)}
                    onDeleteItem={handleDelete}
                  />
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
      </SwipeNavigator>

      <FloatingNav
        onPressItem={(key) => {
          if (key !== activeKey) router.replace(`/${key}`);
        }}
        onPressPlus={() => setAddRecipeOpen(true)}
        activeKey={activeKey}
      />

      <BottomSheetModal visible={isSheetOpen} onClose={handleSheetClose}>
        <AddToPantrySheetContent
          onPressBack={handleSheetClose}
          onItemAdded={handleSheetClose}
        />
      </BottomSheetModal>

      {/* Add Recipe sheet (from FloatingNav +) */}
      <BottomSheetModal visible={isAddRecipeOpen} onClose={() => setAddRecipeOpen(false)}>
        <AddRecipeSheetContent onPressBack={() => setAddRecipeOpen(false)} />
      </BottomSheetModal>

      {/* Menu sheet */}
      <BottomSheetModal visible={isMenuOpen} onClose={() => setMenuOpen(false)}>
        <View style={styles.menuSheet}>
          <Text style={styles.menuTitle}>{t("menu.title")}</Text>
          <Pressable
            style={styles.menuOption}
            onPress={handleClearPantry}
            disabled={total === 0 || isClearing}
          >
            <View style={styles.menuOptionIcon}>
              {isClearing ? (
                <ActivityIndicator size="small" color="#cc3b3b" />
              ) : (
                <Text style={styles.menuOptionIconText}>{"\u2715"}</Text>
              )}
            </View>
            <View style={styles.menuOptionInfo}>
              <Text style={[styles.menuOptionLabel, total === 0 && styles.menuOptionDisabled]}>
                {t("menu.reset")}
              </Text>
              <Text style={styles.menuOptionDesc}>
                {total === 0 ? t("empty.alreadyEmpty") : t("removeAll", { count: total })}
              </Text>
            </View>
          </Pressable>
          <Pressable style={styles.menuDismiss} onPress={() => setMenuOpen(false)}>
            <Text style={styles.menuDismissText}>{t("buttons.cancel", { ns: "common" })}</Text>
          </Pressable>
        </View>
      </BottomSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F4F5F7",
  },
  safeArea: {
    flex: 1,
    paddingTop: 12,
  },
  paddedContainer: {
    paddingHorizontal: 20,
  },
  emptyWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  scrollContent: {
    paddingBottom: 140,
  },
  foldersContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 10,
  },
  // Folder styles
  folder: {
    borderRadius: 20,
    padding: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  folderAccent: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 35,
    top: -25,
    right: -15,
    opacity: 0.3,
  },
  folderHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  folderImageWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  folderImage: {
    width: 40,
    height: 40,
  },
  folderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  folderTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111111",
  },
  folderMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  folderCount: {
    fontSize: 12,
    color: "#999999",
    fontWeight: "500",
  },
  expandIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  expandIconActive: {
    backgroundColor: "#E8F5E9",
  },
  expandIconText: {
    fontSize: 16,
    color: "#999999",
    fontWeight: "600",
  },
  expandIconTextActive: {
    color: "#2a5a2a",
  },
  // Preview chips
  previewRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    gap: 6,
  },
  previewChip: {
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: 100,
  },
  previewChipText: {
    fontSize: 12,
    color: "#6b6b6b",
  },
  previewMore: {
    backgroundColor: "rgba(56,82,37,0.08)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  previewMoreText: {
    fontSize: 12,
    color: "#385225",
    fontWeight: "500",
  },
  // Expanded grid
  expandedGrid: {
    marginTop: 14,
    gap: 8,
  },
  itemChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 12,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#EBEBEB",
  },
  itemContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  itemName: {
    fontSize: 15,
    color: "#111111",
    fontWeight: "500",
    flexShrink: 1,
  },
  itemQty: {
    fontSize: 13,
    color: "#999999",
    marginLeft: 8,
  },
  itemDelete: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  itemDeleteText: {
    fontSize: 12,
    color: "#C0C0C0",
    fontWeight: "600",
  },
  // States
  centered: {
    alignItems: "center",
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6b6b6b",
  },
  errorText: {
    fontSize: 14,
    color: "#cc3b3b",
    textAlign: "center",
  },
  // Menu sheet
  menuSheet: {
    paddingBottom: 20,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111111",
    marginBottom: 16,
  },
  menuOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF5F5",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  menuOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FDDEDE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  menuOptionIconText: {
    fontSize: 16,
    color: "#cc3b3b",
    fontWeight: "600",
  },
  menuOptionInfo: {
    flex: 1,
  },
  menuOptionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#cc3b3b",
  },
  menuOptionDisabled: {
    color: "#C0C0C0",
  },
  menuOptionDesc: {
    fontSize: 13,
    color: "#999999",
    marginTop: 2,
  },
  menuDismiss: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "#F4F5F7",
  },
  menuDismissText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#6b6b6b",
  },
});
