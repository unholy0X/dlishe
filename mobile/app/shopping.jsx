import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Alert,
  TextInput,
  AppState,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, usePathname } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { BlurView } from "expo-blur";
import FloatingNav from "../components/FloatingNav";
import SwipeNavigator from "../components/SwipeNavigator";
import BottomSheetModal from "../components/BottomSheetModal";
import ShoppingIcon from "../components/icons/ShoppingIcon";
import CheckIcon from "../components/icons/CheckIcon";
import PlusIcon from "../components/icons/PlusIcon";
import DotsVerticalIcon from "../components/icons/DotsVerticalIcon";
import AddRecipeSheetContent from "../components/recipies/AddRecipeSheetContent";
import { useShoppingStore } from "../store";

// Subtle tinted cards — just enough to tell them apart
const CARD_COLORS = [
  { bg: "#F0F8E8", accent: "#E2F0D4", accent2: "#E8F4DC", text: "#333333", progress: "#C0DFA0", progressBg: "#E2F0D4" },
  { bg: "#EBF3FD", accent: "#DAE8F9", accent2: "#E0ECF9", text: "#333333", progress: "#A8CDF0", progressBg: "#DAE8F9" },
  { bg: "#F2EEFD", accent: "#E6DFFA", accent2: "#EBE5FB", text: "#333333", progress: "#C4B8F0", progressBg: "#E6DFFA" },
  { bg: "#FDF2E8", accent: "#F9E4D0", accent2: "#FBE9D8", text: "#333333", progress: "#F0CDA8", progressBg: "#F9E4D0" },
  { bg: "#FDEEEE", accent: "#F9DEDE", accent2: "#FBE4E4", text: "#333333", progress: "#F0B8B8", progressBg: "#F9DEDE" },
  { bg: "#ECF6F3", accent: "#DBEeE8", accent2: "#E2F0EC", text: "#333333", progress: "#A8D8C8", progressBg: "#DBEeE8" },
];

const ShoppingListCard = ({ list, index, onPress, onLongPress, isSelecting, isSelected, onSelect }) => {
  const itemCount = list.itemCount || 0;
  const checkedCount = list.checkedCount || 0;
  const progress = itemCount > 0 ? checkedCount / itemCount : 0;
  const isComplete = itemCount > 0 && checkedCount === itemCount;
  const palette = CARD_COLORS[index % CARD_COLORS.length];

  const handlePress = () => {
    if (isSelecting) {
      onSelect(list.id);
    } else {
      onPress();
    }
  };

  const handleLongPress = () => {
    if (!isSelecting) {
      onLongPress();
    }
  };

  return (
    <Pressable
      style={[styles.listCard, { backgroundColor: palette.bg }, isSelected && styles.listCardSelected]}
      onPress={handlePress}
      onLongPress={handleLongPress}
    >
      {/* Accent circles */}
      <View style={[styles.cardAccent, { backgroundColor: palette.accent }]} />
      <View style={[styles.cardAccent2, { backgroundColor: palette.accent2 }]} />

      {/* Selection checkbox */}
      {isSelecting && (
        <View style={[styles.selectCheckbox, isSelected && styles.selectCheckboxChecked]}>
          {isSelected && <CheckIcon width={12} height={12} color="#ffffff" />}
        </View>
      )}

      <View style={styles.listInfo}>
        <Text style={[styles.listName, { color: palette.text }]} numberOfLines={1}>{list.name}</Text>
        <Text style={[styles.listCount, { color: palette.text, opacity: 0.7 }]}>
          {checkedCount} of {itemCount} item{itemCount !== 1 ? "s" : ""}
        </Text>
        {itemCount > 0 && (
          <View style={[styles.progressBar, { backgroundColor: palette.progressBg }]}>
            <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: palette.progress }]} />
          </View>
        )}
      </View>
      <View style={styles.listStatus}>
        {isComplete ? (
          <View style={[styles.completeBadge, { backgroundColor: palette.text + "20" }]}>
            <CheckIcon width={14} height={14} color={palette.text} />
          </View>
        ) : itemCount > 0 ? (
          <Text style={[styles.progressText, { color: palette.text }]}>{checkedCount}/{itemCount}</Text>
        ) : null}
      </View>
    </Pressable>
  );
};

const CreateListSheet = ({ onClose, onCreate }) => {
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsCreating(true);
    try {
      await onCreate(name.trim());
      onClose();
    } catch {
      Alert.alert("Error", "Failed to create list");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <View style={styles.sheetContent}>
      <Text style={styles.sheetTitle}>New Shopping List</Text>

      <Text style={styles.inputLabel}>Name</Text>
      <TextInput
        style={styles.textInput}
        placeholder="e.g. Weekly Groceries"
        placeholderTextColor="#B4B4B4"
        value={name}
        onChangeText={setName}
        autoFocus
      />

      <View style={styles.sheetButtons}>
        <Pressable style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[styles.createBtn, (!name.trim() || isCreating) && styles.createBtnDisabled]}
          onPress={handleCreate}
          disabled={!name.trim() || isCreating}
        >
          {isCreating ? (
            <ActivityIndicator size="small" color="#2a5a2a" />
          ) : (
            <Text style={styles.createBtnText}>Create</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
};

export default function ShoppingScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const activeKey = pathname.replace("/", "") || "shopping";
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [isAddRecipeOpen, setAddRecipeOpen] = useState(false);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const { getToken } = useAuth();
  const {
    lists = [], isLoading, isMerging, error,
    loadLists, createList, deleteList, deleteLists, mergeLists,
  } = useShoppingStore();

  // Load lists on mount + when app comes back to foreground
  useEffect(() => {
    loadLists({ getToken });
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") loadLists({ getToken });
    });
    return () => sub.remove();
  }, []);

  // Also reload when pathname changes back to shopping (returning from detail)
  useEffect(() => {
    if (pathname === "/shopping") {
      loadLists({ getToken });
    }
  }, [pathname]);

  const onRefresh = useCallback(() => {
    loadLists({ getToken });
  }, [getToken]);

  const handleCreateList = async (name) => {
    await createList({ getToken, name });
  };

  const handleDeleteList = (list) => {
    Alert.alert("Delete List", `Delete "${list.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteList({ getToken, listId: list.id }).catch((err) => {
            Alert.alert("Error", err?.message || "Failed to delete list");
          });
        },
      },
    ]);
  };

  const handleOpenList = (list) => {
    router.push(`/shoppingList?id=${list.id}`);
  };

  // Selection mode
  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const enterSelectMode = () => {
    setIsSelecting(true);
    setSelectedIds([]);
  };

  const exitSelectMode = () => {
    setIsSelecting(false);
    setSelectedIds([]);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    Alert.alert(
      "Delete Lists",
      `Delete ${selectedIds.length} list${selectedIds.length !== 1 ? "s" : ""}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteLists({ getToken, listIds: selectedIds });
            } catch (err) {
              Alert.alert("Error", err?.message || "Failed to delete lists");
            }
            exitSelectMode();
          },
        },
      ]
    );
  };

  const handleMergeSelected = () => {
    if (selectedIds.length < 2) {
      Alert.alert("Select More", "Select at least 2 lists to merge.");
      return;
    }
    const names = selectedIds.map((id) => {
      const l = safeListsArray.find((x) => x.id === id);
      return l?.name || "Unknown";
    });
    Alert.alert(
      "Smart Merge",
      `Merge ${names.join(", ")} into one list?\n\nDuplicates will be combined intelligently.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Merge",
          onPress: async () => {
            try {
              await mergeLists({ getToken, sourceListIds: selectedIds });
              Alert.alert("Merged", "Lists merged successfully!");
            } catch {
              Alert.alert("Error", "Failed to merge lists");
            }
            exitSelectMode();
          },
        },
      ]
    );
  };

  const safeListsArray = Array.isArray(lists) ? lists : [];
  const isEmpty = !isLoading && safeListsArray.length === 0;

  const handleClearAll = useCallback(() => {
    setMenuOpen(false);
    const count = safeListsArray.length;
    Alert.alert(
      "Clear All Lists",
      `This will permanently delete all ${count} shopping list${count !== 1 ? "s" : ""}. This can't be undone.`,
      [
        { text: "Keep Lists", style: "cancel" },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            setIsClearing(true);
            try {
              const allIds = safeListsArray.map((l) => l.id);
              await deleteLists({ getToken, listIds: allIds });
            } catch (err) {
              Alert.alert("Error", err?.message || "Failed to clear lists");
            } finally {
              setIsClearing(false);
            }
          },
        },
      ]
    );
  }, [getToken, safeListsArray]);

  return (
    <View style={styles.screen}>
      <SwipeNavigator>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Shopping</Text>
            <Text style={styles.subtitle}>
              {safeListsArray.length} list{safeListsArray.length !== 1 ? "s" : ""}
            </Text>
          </View>
          <View style={styles.headerActions}>
            {isSelecting ? (
              <Pressable style={styles.cancelSelectBtn} onPress={exitSelectMode}>
                <Text style={styles.cancelSelectText}>Cancel</Text>
              </Pressable>
            ) : (
              <>
                <Pressable onPress={() => setMenuOpen(true)}>
                  <BlurView intensity={120} tint="light" style={styles.dotsBlur}>
                    <DotsVerticalIcon width={6} height={20} color="#B4B4B4" />
                  </BlurView>
                </Pressable>
                <Pressable style={styles.addButton} onPress={() => setSheetOpen(true)}>
                  <PlusIcon width={24} height={24} color="#385225" />
                </Pressable>
              </>
            )}
          </View>
        </View>

        {isLoading && safeListsArray.length === 0 ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#385225" />
            <Text style={styles.loadingText}>Loading lists…</Text>
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : isEmpty ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <ShoppingIcon width={32} height={28} color="#6b6b6b" />
            </View>
            <Text style={styles.emptyTitle}>No shopping lists yet</Text>
            <Text style={styles.emptySubtitle}>
              Create your first list to start organizing{"\n"}your grocery shopping
            </Text>
            <Pressable style={styles.emptyBtn} onPress={() => setSheetOpen(true)}>
              <Text style={styles.emptyBtnText}>Create List</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor="#385225" />
            }
          >
            {safeListsArray.map((list, index) => (
              <ShoppingListCard
                key={list.id}
                list={list}
                index={index}
                onPress={() => handleOpenList(list)}
                onLongPress={() => isSelecting ? null : handleDeleteList(list)}
                isSelecting={isSelecting}
                isSelected={selectedIds.includes(list.id)}
                onSelect={toggleSelect}
              />
            ))}
          </ScrollView>
        )}

        {/* Selection action bar */}
        {isSelecting && selectedIds.length > 0 && (
          <View style={styles.selectionBar}>
            <Text style={styles.selectionCount}>
              {selectedIds.length} selected
            </Text>
            <View style={styles.selectionActions}>
              {selectedIds.length >= 2 && (
                <Pressable
                  style={[styles.selectionBtn, styles.mergeBtn]}
                  onPress={handleMergeSelected}
                  disabled={isMerging}
                >
                  {isMerging ? (
                    <ActivityIndicator size="small" color="#28457A" />
                  ) : (
                    <Text style={styles.mergeBtnText}>Merge</Text>
                  )}
                </Pressable>
              )}
              <Pressable style={[styles.selectionBtn, styles.deleteBtn]} onPress={handleDeleteSelected}>
                <Text style={styles.deleteBtnText}>Delete</Text>
              </Pressable>
            </View>
          </View>
        )}
      </SafeAreaView>
      </SwipeNavigator>

      {!isSelecting && (
        <FloatingNav
          onPressItem={(key) => { if (key !== activeKey) router.replace(`/${key}`); }}
          onPressPlus={() => setAddRecipeOpen(true)}
          activeKey={activeKey}
        />
      )}

      <BottomSheetModal visible={isSheetOpen} onClose={() => setSheetOpen(false)}>
        <CreateListSheet
          onClose={() => setSheetOpen(false)}
          onCreate={handleCreateList}
        />
      </BottomSheetModal>

      {/* Add Recipe sheet (from FloatingNav +) */}
      <BottomSheetModal visible={isAddRecipeOpen} onClose={() => setAddRecipeOpen(false)}>
        <AddRecipeSheetContent onPressBack={() => setAddRecipeOpen(false)} />
      </BottomSheetModal>

      {/* Menu sheet */}
      <BottomSheetModal visible={isMenuOpen} onClose={() => setMenuOpen(false)}>
        <View style={styles.menuSheet}>
          <Text style={styles.menuTitle}>Shopping Options</Text>

          {/* Select Lists */}
          <Pressable
            style={styles.menuOptionNeutral}
            onPress={() => { setMenuOpen(false); enterSelectMode(); }}
          >
            <View style={styles.menuOptionNeutralIcon}>
              <CheckIcon width={16} height={16} color="#2a5a2a" />
            </View>
            <View style={styles.menuOptionInfo}>
              <Text style={styles.menuOptionNeutralLabel}>Select Lists</Text>
              <Text style={styles.menuOptionDesc}>Merge or delete multiple lists</Text>
            </View>
          </Pressable>

          {/* Clear All */}
          <Pressable
            style={styles.menuOption}
            onPress={handleClearAll}
            disabled={safeListsArray.length === 0 || isClearing}
          >
            <View style={styles.menuOptionIcon}>
              {isClearing ? (
                <ActivityIndicator size="small" color="#cc3b3b" />
              ) : (
                <Text style={styles.menuOptionIconText}>{"\u2715"}</Text>
              )}
            </View>
            <View style={styles.menuOptionInfo}>
              <Text style={styles.menuOptionLabel}>Clear All Lists</Text>
              <Text style={styles.menuOptionDesc}>
                Remove all {safeListsArray.length} list{safeListsArray.length !== 1 ? "s" : ""} permanently
              </Text>
            </View>
          </Pressable>

          <Pressable style={styles.menuDismiss} onPress={() => setMenuOpen(false)}>
            <Text style={styles.menuDismissText}>Cancel</Text>
          </Pressable>
        </View>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  dotsBlur: {
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
  cancelSelectBtn: {
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: "#E8E8E8",
  },
  cancelSelectText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111111",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 140,
    gap: 12,
  },
  // List Card
  listCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    padding: 16,
    overflow: "hidden",
  },
  listCardSelected: {
    borderWidth: 2,
    borderColor: "#2a5a2a",
  },
  cardAccent: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 45,
    top: -30,
    right: -20,
    opacity: 0.3,
  },
  cardAccent2: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 45,
    top: -15,
    right: -10,
    opacity: 0.2,
  },
  selectCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "rgba(0,0,0,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  selectCheckboxChecked: {
    backgroundColor: "#2a5a2a",
    borderColor: "#2a5a2a",
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    fontSize: 16,
    fontWeight: "600",
  },
  listCount: {
    marginTop: 2,
    fontSize: 13,
  },
  progressBar: {
    marginTop: 8,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  listStatus: {
    marginLeft: 12,
  },
  progressText: {
    fontSize: 13,
    fontWeight: "500",
  },
  completeBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  // Selection bar
  selectionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#ffffff",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 40,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  selectionCount: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111111",
  },
  selectionActions: {
    flexDirection: "row",
    gap: 8,
  },
  selectionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    alignItems: "center",
  },
  mergeBtn: {
    backgroundColor: "#9BC6FB",
  },
  mergeBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#28457A",
  },
  deleteBtn: {
    backgroundColor: "#FBBDBD",
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#7A2828",
  },
  // States
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6b6b6b",
  },
  errorText: {
    fontSize: 14,
    color: "#cc3b3b",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E8E8E8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111111",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6b6b6b",
    textAlign: "center",
    lineHeight: 20,
  },
  emptyBtn: {
    marginTop: 24,
    backgroundColor: "#7FEF80",
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  emptyBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#385225",
  },
  // Sheet
  sheetContent: {
    paddingBottom: 20,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111111",
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    color: "#6b6b6b",
    marginBottom: 8,
    marginTop: 12,
  },
  textInput: {
    backgroundColor: "#F4F5F7",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#111111",
  },
  sheetButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 24,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "#F4F5F7",
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 15,
    color: "#6b6b6b",
    fontWeight: "500",
  },
  createBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: "#7FEF80",
    alignItems: "center",
  },
  createBtnDisabled: {
    opacity: 0.5,
  },
  createBtnText: {
    fontSize: 15,
    color: "#2a5a2a",
    fontWeight: "600",
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
  menuOptionNeutral: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F8E8",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  menuOptionNeutralIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E2F0D4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  menuOptionNeutralLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2a5a2a",
  },
  menuOptionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#cc3b3b",
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
