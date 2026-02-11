import React, { useEffect, useRef, useState, useCallback } from "react";
import { Modal, View, Pressable, StyleSheet, Animated, ScrollView, Dimensions, KeyboardAvoidingView, Platform, PanResponder } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SLIDE_OFFSET = 800;

export default function BottomSheetModal({
  visible,
  onClose,
  children,
  customScroll,
}) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SLIDE_OFFSET)).current;
  const panY = useRef(new Animated.Value(0)).current;
  const scrollOffset = useRef(0);
  const isDragging = useRef(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [render, setRender] = useState(visible);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      // Capture phase fires BEFORE children (ScrollView) — this is the key fix
      onMoveShouldSetPanResponderCapture: (_, gs) => {
        // Only capture when at top of scroll AND swiping clearly downward
        if (scrollOffset.current <= 2 && gs.dy > 8 && Math.abs(gs.dy) > Math.abs(gs.dx)) {
          return true;
        }
        return false;
      },
      onMoveShouldSetPanResponder: (_, gs) => {
        return gs.dy > 8 && scrollOffset.current <= 2;
      },
      onPanResponderGrant: () => {
        isDragging.current = true;
        setScrollEnabled(false);
        panY.setOffset(panY._value);
        panY.setValue(0);
      },
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) panY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        panY.flattenOffset();
        isDragging.current = false;
        setScrollEnabled(true);
        if (gs.dy > 120 || gs.vy > 0.5) {
          Animated.timing(panY, {
            toValue: SLIDE_OFFSET,
            duration: 200,
            useNativeDriver: true,
          }).start(() => onClose());
        } else {
          Animated.spring(panY, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  const combinedTranslateY = Animated.add(translateY, panY);

  const backdropOpacity = panY.interpolate({
    inputRange: [0, 300],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const handleContentScroll = useCallback((e) => {
    scrollOffset.current = e.nativeEvent.contentOffset.y;
  }, []);

  useEffect(() => {
    if (visible) {
      setRender(true);
      panY.setValue(0);
      scrollOffset.current = 0;
      setScrollEnabled(true);
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
        if (finished) {
          setRender(false);
          panY.setValue(0);
        }
      });
    }
  }, [visible, translateY, panY]);

  if (!render) return null;

  return (
    <Modal transparent visible={render} onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={styles.backdropPressable} onPress={onClose} />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            customScroll && { height: SCREEN_HEIGHT * 0.9 },
            { transform: [{ translateY: combinedTranslateY }] },
          ]}
          {...panResponder.panHandlers}
        >
          <View style={styles.grabber} />
          {customScroll ? (
            <View style={[styles.customScrollWrap, { paddingBottom: insets.bottom + 16 }]}>
              {typeof children === "function"
                ? children({ onScroll: handleContentScroll, scrollEnabled })
                : children}
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              scrollEnabled={scrollEnabled}
              onScroll={(e) => {
                scrollOffset.current = e.nativeEvent.contentOffset.y;
              }}
              scrollEventThrottle={16}
            >
              <View style={[styles.content, { paddingBottom: insets.bottom + 16 }]}>{children}</View>
            </ScrollView>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  backdropPressable: {
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
  customScrollWrap: {
    flex: 1,
  },
});
