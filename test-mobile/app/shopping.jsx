import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, usePathname } from "expo-router";
import FloatingNav from "../components/FloatingNav";
import BottomSheetModal from "../components/BottomSheetModal";
import AddRecipeSheetContent from "../components/recipies/AddRecipeSheetContent";

export default function ShoppingScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const activeKey = pathname.replace("/", "") || "shopping";
  const [isSheetOpen, setSheetOpen] = useState(false);

  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <Text style={styles.title}>Shopping</Text>
        <Text style={styles.subtitle}>Create your grocery list</Text>
      </SafeAreaView>

      <FloatingNav
        onPressItem={(key) => {
          router.push(`/${key}`);
        }}
        onPressPlus={() => setSheetOpen(true)}
        activeKey={activeKey}
      />

      <BottomSheetModal
        visible={isSheetOpen}
        onClose={() => setSheetOpen(false)}
      >
        <AddRecipeSheetContent onPressBack={() => setSheetOpen(false)} />
      </BottomSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  safeArea: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    color: "#111111",
  },
  subtitle: {
    marginTop: 4,
    color: "#6b6b6b",
  },
});
