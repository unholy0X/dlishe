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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, usePathname } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import FloatingNav from "../components/FloatingNav";
import BottomSheetModal from "../components/BottomSheetModal";
import { useShoppingStore } from "../store";

// Icons for shopping lists
const LIST_ICONS = ["🛒", "🏠", "🎉", "🍽️", "🥗", "📦", "✨", "❤️"];

const ShoppingListCard = ({ list, onPress, onDelete }) => {
  const itemCount = list.itemCount || 0;
  const checkedCount = list.checkedCount || 0;
  const progress = itemCount > 0 ? checkedCount / itemCount : 0;
  const isComplete = itemCount > 0 && checkedCount === itemCount;

  return (
    <Pressable style={styles.listCard} onPress={onPress} onLongPress={onDelete}>
      <View style={styles.listIconWrap}>
        <Text style={styles.listIcon}>{list.icon || "🛒"}</Text>
      </View>
      <View style={styles.listInfo}>
        <Text style={styles.listName} numberOfLines={1}>{list.name}</Text>
        <Text style={styles.listCount}>
          {itemCount} item{itemCount !== 1 ? "s" : ""}
        </Text>
        {itemCount > 0 && (
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        )}
      </View>
      <View style={styles.listStatus}>
        {isComplete ? (
          <View style={styles.completeBadge}>
            <Text style={styles.completeText}>✓</Text>
          </View>
        ) : itemCount > 0 ? (
          <Text style={styles.progressText}>{checkedCount}/{itemCount}</Text>
        ) : null}
      </View>
    </Pressable>
  );
};

const CreateListSheet = ({ onClose, onCreate }) => {
  const [name, setName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("🛒");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsCreating(true);
    try {
      await onCreate(name.trim(), selectedIcon);
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

      <Text style={styles.inputLabel}>Pick an icon</Text>
      <View style={styles.iconGrid}>
        {LIST_ICONS.map((icon) => (
          <Pressable
            key={icon}
            style={[styles.iconOption, selectedIcon === icon && styles.iconOptionSelected]}
            onPress={() => setSelectedIcon(icon)}
          >
            <Text style={styles.iconOptionText}>{icon}</Text>
          </Pressable>
        ))}
      </View>

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

  const { getToken } = useAuth();
  const { lists = [], isLoading, error, loadLists, createList, deleteList } = useShoppingStore();

  useEffect(() => {
    loadLists({ getToken });
  }, []);

  const onRefresh = useCallback(() => {
    loadLists({ getToken });
  }, [getToken]);

  const handleCreateList = async (name, icon) => {
    await createList({ getToken, name, icon });
  };

  const handleDeleteList = (list) => {
    Alert.alert("Delete List", `Delete "${list.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteList({ getToken, listId: list.id }),
      },
    ]);
  };

  const handleOpenList = (list) => {
    router.push(`/shoppingList?id=${list.id}`);
  };

  // Safely handle undefined lists
  const safeListsArray = Array.isArray(lists) ? lists : [];
  const isEmpty = !isLoading && safeListsArray.length === 0;

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Shopping</Text>
            <Text style={styles.subtitle}>
              {safeListsArray.length} list{safeListsArray.length !== 1 ? "s" : ""}
            </Text>
          </View>
          <Pressable style={styles.addBtn} onPress={() => setSheetOpen(true)}>
            <Text style={styles.addBtnText}>+ New List</Text>
          </Pressable>
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
            <Text style={styles.emptyIcon}>🛒</Text>
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
            {safeListsArray.map((list) => (
              <ShoppingListCard
                key={list.id}
                list={list}
                onPress={() => handleOpenList(list)}
                onDelete={() => handleDeleteList(list)}
              />
            ))}
          </ScrollView>
        )}
      </SafeAreaView>

      <FloatingNav
        onPressItem={(key) => router.push(`/${key}`)}
        onPressPlus={() => setSheetOpen(true)}
        activeKey={activeKey}
      />

      <BottomSheetModal visible={isSheetOpen} onClose={() => setSheetOpen(false)}>
        <CreateListSheet
          onClose={() => setSheetOpen(false)}
          onCreate={handleCreateList}
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111111",
  },
  subtitle: {
    marginTop: 2,
    fontSize: 14,
    color: "#6b6b6b",
  },
  addBtn: {
    backgroundColor: "#2a5a2a",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff",
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
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 16,
  },
  listIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#F4F5F7",
    alignItems: "center",
    justifyContent: "center",
  },
  listIcon: {
    fontSize: 24,
  },
  listInfo: {
    flex: 1,
    marginLeft: 14,
  },
  listName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111111",
  },
  listCount: {
    marginTop: 2,
    fontSize: 13,
    color: "#B4B4B4",
  },
  progressBar: {
    marginTop: 8,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E8E8E8",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#7FEF80",
    borderRadius: 2,
  },
  listStatus: {
    marginLeft: 12,
  },
  progressText: {
    fontSize: 13,
    color: "#6b6b6b",
    fontWeight: "500",
  },
  completeBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
  },
  completeText: {
    fontSize: 14,
    color: "#2a5a2a",
    fontWeight: "600",
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
  emptyIcon: {
    fontSize: 64,
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
    backgroundColor: "#2a5a2a",
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  emptyBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff",
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
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#F4F5F7",
    alignItems: "center",
    justifyContent: "center",
  },
  iconOptionSelected: {
    backgroundColor: "#E8F5E9",
    borderWidth: 2,
    borderColor: "#7FEF80",
  },
  iconOptionText: {
    fontSize: 22,
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
});
