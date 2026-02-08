import React from "react";
import { View, Text, StyleSheet, Image, Pressable, TextInput } from "react-native";
import { BlurView } from "expo-blur";
import ArrowLeftIcon from "../icons/ArrowLeftIcon";
import MagnifierIcon from "../icons/MagnifierIcon";
import ScanWithAiIcon from "../icons/ScanWithAiIcon";

const CATEGORIES = [
  { label: "Dairy", image: require("../../assets/Dairy.png") },
  { label: "Produce", image: require("../../assets/produce.png") },
  { label: "Proteins", image: require("../../assets/proteins.png") },
  { label: "Bakery", image: require("../../assets/bakery.png") },
  { label: "Spices", image: require("../../assets/spices.png") },
  { label: "Pantry", image: require("../../assets/pantry.png") },
  { label: "Beverages", image: require("../../assets/beverages.png") },
  { label: "Beverages", image: require("../../assets/beverages1.png") },
  { label: "Snacks", image: require("../../assets/snacks.png") },
  { label: "Frozen", image: require("../../assets/frozen.png") },
  { label: "Household", image: require("../../assets/household.png") },
];

export default function AddToPantrySheetContent({ onPressBack }) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={onPressBack}>
          <BlurView intensity={100} tint="light" style={styles.backPill}>
            <ArrowLeftIcon width={9} height={8} color="#555555" />
            <Text style={styles.backText}>Back</Text>
          </BlurView>
        </Pressable>
        <Text style={styles.headerTitle}>Add to pantry</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchWrap}>
        <MagnifierIcon width={20} height={20} color="#B4B4B4" />
        <TextInput
          placeholder="Search for a recipe"
          placeholderTextColor="#B4B4B4"
          style={styles.input}
        />
      </View>

      <Text style={styles.sectionTitle}>Browse by category</Text>
      <View style={styles.grid}>
        {CATEGORIES.map((item, index) => (
          <View key={`${item.label}-${index}`} style={styles.card}>
            <Image source={item.image} style={styles.cardImage} resizeMode="contain" />
            <Text style={styles.cardText}>{item.label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Or import in bulk</Text>
      <View style={styles.actionCard}>
        <View style={styles.actionIconWrap}>
          <ScanWithAiIcon width={22} height={20} color="#141B34" />
        </View>
        <View>
          <Text style={styles.actionTitle}>Scan with AI</Text>
          <Text style={styles.actionSubtitle}>Add items from photos</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backPill: {
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
  backText: {
    marginLeft: 8,
    fontSize: 12,
    color: "#555555",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  headerSpacer: {
    width: 56,
  },
  searchWrap: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  input: {
    marginLeft: 10,
    flex: 1,
    color: "#111111",
  },
  sectionTitle: {
    marginTop: 18,
    marginBottom: 12,
    fontSize: 14,
    fontWeight: "medium",
    color: "#000",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 10,
    rowGap: 10
  },
  card: {
    width: "31%",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: "center",
  },
  cardImage: {
    width: 60,
    height: 60,
  },
  cardText: {
    marginTop: 5,
    fontSize: 13,
    fontWeight: "medium",
    color: "#141B34",
    textTransform: "capitalize",
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 999,
    padding: 8,
    marginBottom: 12,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#DFF7C4",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111111",
  },
  actionSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#6b6b6b",
  },
});
