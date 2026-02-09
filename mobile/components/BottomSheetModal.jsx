import React, { useEffect, useRef, useState } from "react";
import { Modal, View, Pressable, StyleSheet, Animated, ScrollView, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SLIDE_OFFSET = 800;

export default function BottomSheetModal({
  visible,
  onClose,
  children,
}) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SLIDE_OFFSET)).current;
  const [render, setRender] = useState(visible);

  useEffect(() => {
    if (visible) {
      setRender(true);
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SLIDE_OFFSET,
        duration: 200,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setRender(false);
      });
    }
  }, [visible, translateY]);

  if (!render) return null;

  return (
    <Modal transparent visible={render} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY }] },
          ]}
        >
          <View style={styles.grabber} />
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={[styles.content, { paddingBottom: insets.bottom + 16 }]}>{children}</View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: "#F4F5F7",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: SCREEN_HEIGHT * 0.9,
  },
  grabber: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#d9d9d9",
    marginBottom: 10,
  },
  content: {
    paddingBottom: 0,
  },
});
