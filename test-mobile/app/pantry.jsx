import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, usePathname } from "expo-router";
import FloatingNav from "../components/FloatingNav";
import PantryHeader from "../components/pantry/PantryHeader";
import PantryEmptyState from "../components/pantry/PantryEmptyState";
import QuickAddChips from "../components/pantry/QuickAddChips";
import BottomSheetModal from "../components/BottomSheetModal";
import AddToPantrySheetContent from "../components/pantry/AddToPantrySheetContent";

export default function PantryScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const activeKey = pathname.replace("/", "") || "pantry";
  const [isSheetOpen, setSheetOpen] = useState(false);

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <PantryHeader onPressAdd={() => setSheetOpen(true)} />
          <PantryEmptyState onPressAdd={() => setSheetOpen(true)} />
          <QuickAddChips />
        </ScrollView>
      </SafeAreaView>

      <FloatingNav
        onPressItem={(key) => {
          router.push(`/${key}`);
        }}
        onPressPlus={() => setSheetOpen(true)}
        activeKey={activeKey}
      />

      <BottomSheetModal visible={isSheetOpen} onClose={() => setSheetOpen(false)}>
        <AddToPantrySheetContent onPressBack={() => setSheetOpen(false)} />
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
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  scrollContent: {
    paddingBottom: 140,
  },
});
