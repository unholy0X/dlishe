import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { BlurView } from "expo-blur";
import ArrowLeftIcon from "../icons/ArrowLeftIcon";
import LinkIcon from "../icons/LinkIcon";
import PasteIcon from "../icons/PasteIcon";
import AddManualIcon from "../icons/AddManualIcon";
import SparkleBadgeIcon from "../icons/SparkleBadgeIcon";
import { useAuth } from "@clerk/clerk-expo";
import { useExtractStore } from "../../store";

export default function AddRecipeSheetContent({ onPressBack }) {
  const { getToken } = useAuth();
  const {
    url,
    setUrl,
    startExtraction,
    status,
    message,
    progress,
    error,
    isRunning,
  } = useExtractStore();

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={onPressBack}>
          <BlurView intensity={100} tint="light" style={styles.backPill}>
            <ArrowLeftIcon width={9} height={8} color="#555555" />
            <Text style={styles.backText}>Back</Text>
          </BlurView>
        </Pressable>
        <Text style={styles.headerTitle}>Add a recipe</Text>
        <View style={styles.headerSpacer} />
      </View>

      <Image
        source={require("../../assets/AddRecipie.png")}
        style={styles.heroImage}
        resizeMode="contain"
      />

      <Text style={styles.title}>Add a new recipe</Text>
      <Text style={styles.subtitle}>Paste a link from YouTube or any recipe website and watch the magic happen</Text>

      <View style={styles.inputWrap}>
        <LinkIcon width={20} height={20} color="#B4B4B4" />
        <TextInput
          placeholder="Search for a recipe"
          placeholderTextColor="#B4B4B4"
          style={styles.input}
          value={url}
          onChangeText={setUrl}
          editable={!isRunning}
        />
      </View>

      <Pressable
        style={[styles.primaryButton, isRunning && styles.primaryButtonDisabled]}
        onPress={() => startExtraction({ getToken })}
        disabled={isRunning}
      >
        <SparkleBadgeIcon width={22} height={22} />
        <Text style={styles.primaryText}>
          {isRunning ? "Extracting…" : "Extract with AI"}
        </Text>
      </Pressable>

      {isRunning ? (
        <View style={styles.statusRow}>
          <ActivityIndicator size="small" color="#385225" />
          <Text style={styles.statusText}>
            {message || "Working…"}
            {typeof progress === "number" && progress > 0 ? ` (${progress}%)` : ""}
          </Text>
        </View>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.dividerRow}>
        <View style={styles.divider} />
        <Text style={styles.dividerText}>Or</Text>
        <View style={styles.divider} />
      </View>

      <View style={styles.actionCard}>
        <View style={styles.actionIconWrap}>
          <PasteIcon width={22} height={22} />
        </View>
        <View style={styles.actionTextBlock}>
          <Text style={styles.actionTitle}>Paste description</Text>
          <Text style={styles.actionSubtitle}>For TikTok & Instagram videos</Text>
        </View>
      </View>

      <View style={styles.actionCard}>
        <View style={styles.actionIconWrap}>
          <AddManualIcon width={22} height={22} />
        </View>
        <View style={styles.actionTextBlock}>
          <Text style={styles.actionTitle}>Add Manually</Text>
          <Text style={styles.actionSubtitle}>Type in your recipe by hand</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 0,
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
    fontSize: 22,
    fontWeight: "normal",
    color: "#000",
    letterSpacing: -0.05
  },
  headerSpacer: {
    width: 56,
  },
  heroImage: {
    width: "100%",
    height: 130,
    marginTop: 44,
  },
  title: {
    marginTop: 10,
    fontSize: 26,
    fontWeight: "normal",
    color: "#000",
    textAlign: "center",
    letterSpacing: -0.05
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: "#B4B4B4",
    textAlign: "center",
    lineHeight: 20,
    letterSpacing: -0.05,
    paddingHorizontal: 20
  },
  inputWrap: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  input: {
    marginLeft: 10,
    flex: 1,
    color: "#111111",
  },
  primaryButton: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#7FEF80",
    borderRadius: 999,
    paddingVertical: 12,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "medium",
    color: "#385225",
    letterSpacing: -0.05
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  statusText: {
    marginLeft: 8,
    fontSize: 12,
    color: "#6b6b6b",
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    color: "#cc3b3b",
    textAlign: "center",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#DFDFDF",
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 12,
    color: "#B4B4B4",
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 999,
    padding: 10,
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
  actionTextBlock: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: "normal",
    color: "#111111",
  },
  actionSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#385225",
  },
});
