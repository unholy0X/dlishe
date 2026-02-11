import React, { useCallback } from "react";
import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import CameraIcon from "./icons/CameraIcon";

/**
 * Unified image capture component supporting camera, library, single/multi-image.
 *
 * Props:
 *   images           - [{uri, base64, mimeType}] controlled by parent
 *   onImagesChange   - (newImages) => void
 *   maxImages        - 1 (pantry) or 3 (recipe)
 *   quality          - 0.6 default
 *   disabled         - true during upload/scan
 *   label            - "Snap your groceries" | "Snap a cookbook"
 *   sublabel         - "Add items from a photo" | "Up to 3 pages"
 */
export default function ImageCapture({
  images = [],
  onImagesChange,
  maxImages = 1,
  quality = 0.6,
  disabled = false,
  label = "Take a photo",
  sublabel = "",
}) {
  const remaining = maxImages - images.length;

  const requestCameraPermission = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Camera access needed",
        "Allow camera access so you can snap a photo."
      );
      return false;
    }
    return true;
  }, []);

  const requestLibraryPermission = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Photo access needed",
        "Allow photo access so you can pick from your library."
      );
      return false;
    }
    return true;
  }, []);

  const handleCamera = useCallback(async () => {
    try {
      const granted = await requestCameraPermission();
      if (!granted) return;

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality,
        base64: true,
        allowsEditing: false,
        exif: false,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      if (!asset.base64) {
        Alert.alert("Oops", "Couldn't read the photo. Try again?");
        return;
      }

      const newImage = {
        uri: asset.uri,
        base64: asset.base64,
        mimeType: asset.mimeType || "image/jpeg",
      };
      onImagesChange([...images, newImage].slice(0, maxImages));
    } catch {
      Alert.alert("Oops", "Something went wrong with the camera.");
    }
  }, [images, maxImages, quality, onImagesChange, requestCameraPermission]);

  const handleLibrary = useCallback(async () => {
    try {
      const granted = await requestLibraryPermission();
      if (!granted) return;

      const allowMulti = maxImages > 1 && remaining > 1;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality,
        base64: true,
        allowsEditing: false,
        allowsMultipleSelection: allowMulti,
        selectionLimit: remaining,
        exif: false,
      });

      if (result.canceled || !result.assets?.length) return;

      const newImages = result.assets
        .filter((a) => a.base64)
        .map((a) => ({
          uri: a.uri,
          base64: a.base64,
          mimeType: a.mimeType || "image/jpeg",
        }));

      if (newImages.length === 0) {
        Alert.alert("Oops", "Couldn't read the photo(s). Try again?");
        return;
      }

      onImagesChange([...images, ...newImages].slice(0, maxImages));
    } catch {
      Alert.alert("Oops", "Something went wrong picking the photo.");
    }
  }, [images, maxImages, remaining, quality, onImagesChange, requestLibraryPermission]);

  const showSourceChooser = useCallback(() => {
    Alert.alert("Add a photo", "How would you like to add your photo?", [
      { text: "Take Photo", onPress: handleCamera },
      { text: "Choose from Library", onPress: handleLibrary },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [handleCamera, handleLibrary]);

  const removeImage = useCallback(
    (index) => {
      const next = images.filter((_, i) => i !== index);
      onImagesChange(next);
    },
    [images, onImagesChange]
  );

  const clearAll = useCallback(() => {
    onImagesChange([]);
  }, [onImagesChange]);

  // ── Empty state: action card ──
  if (images.length === 0) {
    return (
      <Pressable
        style={[styles.actionCard, disabled && styles.actionCardDisabled]}
        onPress={showSourceChooser}
        disabled={disabled}
      >
        <View style={styles.actionIconWrap}>
          <CameraIcon width={22} height={22} />
        </View>
        <View style={styles.actionTextBlock}>
          <Text style={styles.actionTitle}>{label}</Text>
          {sublabel ? (
            <Text style={styles.actionSubtitle}>{sublabel}</Text>
          ) : null}
        </View>
      </Pressable>
    );
  }

  // ── Has images: thumbnails row ──
  return (
    <View style={styles.container}>
      <View style={styles.thumbRow}>
        {images.map((img, idx) => (
          <View key={idx} style={styles.thumbWrap}>
            <Image source={{ uri: img.uri }} style={styles.thumb} />
            <Pressable
              style={styles.removeBadge}
              onPress={() => removeImage(idx)}
              hitSlop={8}
              disabled={disabled}
            >
              <Text style={styles.removeBadgeText}>{"\u00D7"}</Text>
            </Pressable>
          </View>
        ))}
        {remaining > 0 && (
          <Pressable
            style={[styles.addThumb, disabled && styles.addThumbDisabled]}
            onPress={showSourceChooser}
            disabled={disabled}
          >
            <Text style={styles.addThumbText}>+</Text>
          </Pressable>
        )}
      </View>
      <Pressable onPress={clearAll} disabled={disabled}>
        <Text style={styles.clearText}>Clear all</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // Action card (empty state)
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 999,
    padding: 10,
    marginBottom: 12,
  },
  actionCardDisabled: {
    opacity: 0.5,
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
  // Thumbnails state
  container: {
    marginBottom: 12,
  },
  thumbRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
  },
  thumbWrap: {
    position: "relative",
  },
  thumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: "#EAEAEA",
  },
  removeBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#cc3b3b",
    alignItems: "center",
    justifyContent: "center",
  },
  removeBadgeText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
    lineHeight: 16,
  },
  addThumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#DFDFDF",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  addThumbDisabled: {
    opacity: 0.4,
  },
  addThumbText: {
    fontSize: 24,
    color: "#B4B4B4",
    fontWeight: "300",
  },
  clearText: {
    fontSize: 13,
    color: "#cc3b3b",
    textAlign: "center",
  },
});
