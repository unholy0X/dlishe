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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, usePathname } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import FloatingNav from "../components/FloatingNav";
import PantryHeader from "../components/pantry/PantryHeader";
import PantryEmptyState from "../components/pantry/PantryEmptyState";
import BottomSheetModal from "../components/BottomSheetModal";
import AddToPantrySheetContent from "../components/pantry/AddToPantrySheetContent";
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

const CategoryFolder = ({ category, items, isExpanded, onToggle, onDeleteItem }) => {
  const image = CATEGORY_IMAGES[category] || CATEGORY_IMAGES.other;
  const displayName = category.charAt(0).toUpperCase() + category.slice(1);
  const previewItems = items.slice(0, 4);

  return (
    <Pressable style={styles.folder} onPress={onToggle}>
      {/* Folder Header */}
      <View style={styles.folderHeader}>
        <Image source={image} style={styles.folderImage} resizeMode="contain" />
        <View style={styles.folderInfo}>
          <Text style={styles.folderTitle}>{displayName}</Text>
          <Text style={styles.folderCount}>{items.length} item{items.length !== 1 ? "s" : ""}</Text>
        </View>
        <View style={styles.expandIcon}>
          <Text style={styles.expandIconText}>{isExpanded ? "−" : "+"}</Text>
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
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});

  const { getToken } = useAuth();
  const { groups, total, isLoading, error, loadPantry, removeItem } = usePantryStore();

  useEffect(() => {
    loadPantry({ getToken });
  }, []);

  const onRefresh = useCallback(() => {
    loadPantry({ getToken });
  }, [getToken]);

  const handleDelete = useCallback(
    async (itemId) => {
      try {
        await removeItem({ getToken, itemId });
      } catch {
        // Error already set in store
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
    loadPantry({ getToken });
  };

  const isEmpty = !isLoading && groups.length === 0;

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {isEmpty ? (
          <View style={styles.paddedContainer}>
            <PantryHeader
              subtitle="No items yet"
              onPressAdd={() => setSheetOpen(true)}
            />
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
                subtitle={`${total} item${total !== 1 ? "s" : ""} in pantry`}
                onPressAdd={() => setSheetOpen(true)}
              />
            </View>

            {isLoading && groups.length === 0 ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color="#385225" />
                <Text style={styles.loadingText}>Loading pantry…</Text>
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
                    items={group.items}
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

      <FloatingNav
        onPressItem={(key) => {
          router.push(`/${key}`);
        }}
        onPressPlus={() => setSheetOpen(true)}
        activeKey={activeKey}
      />

      <BottomSheetModal visible={isSheetOpen} onClose={handleSheetClose}>
        <AddToPantrySheetContent
          onPressBack={handleSheetClose}
          onItemAdded={handleSheetClose}
        />
      </BottomSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f4f5f7",
  },
  safeArea: {
    flex: 1,
    paddingTop: 12,
  },
  paddedContainer: {
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingBottom: 140,
  },
  foldersContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  // Folder styles
  folder: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
  },
  folderHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  folderImage: {
    width: 48,
    height: 48,
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
  folderCount: {
    fontSize: 13,
    color: "#B4B4B4",
    marginTop: 2,
  },
  expandIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F4F5F7",
    alignItems: "center",
    justifyContent: "center",
  },
  expandIconText: {
    fontSize: 18,
    color: "#6b6b6b",
    fontWeight: "600",
  },
  // Preview chips
  previewRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    gap: 6,
  },
  previewChip: {
    backgroundColor: "#F4F5F7",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 100,
  },
  previewChipText: {
    fontSize: 12,
    color: "#6b6b6b",
  },
  previewMore: {
    backgroundColor: "#E8F5E9",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
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
    backgroundColor: "#F4F5F7",
    borderRadius: 12,
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 10,
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
    color: "#888888",
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
    color: "#B4B4B4",
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
});
