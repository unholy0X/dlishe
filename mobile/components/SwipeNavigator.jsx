import React, { useRef, useCallback } from "react";
import { Animated, PanResponder, Dimensions, Easing, StyleSheet } from "react-native";
import { useRouter, usePathname } from "expo-router";

const TABS = ["home", "recipies", "pantry", "shopping"];
const { width: SCREEN_W } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_W * 0.2; // 20% of screen
const VELOCITY_THRESHOLD = 0.4;

export default function SwipeNavigator({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const current = pathname.replace("/", "") || "home";
  const currentRef = useRef(current);
  currentRef.current = current;
  const translateX = useRef(new Animated.Value(0)).current;
  const isNavigating = useRef(false);

  const getDirection = useCallback((dx, vx) => {
    const idx = TABS.indexOf(currentRef.current);
    if ((dx < -SWIPE_THRESHOLD || vx < -VELOCITY_THRESHOLD) && idx < TABS.length - 1) return 1;
    if ((dx > SWIPE_THRESHOLD || vx > VELOCITY_THRESHOLD) && idx > 0) return -1;
    return 0;
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => {
        if (isNavigating.current) return false;
        return Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 2;
      },
      onPanResponderGrant: () => {
        translateX.stopAnimation();
        translateX.setValue(0);
      },
      onPanResponderMove: (_, g) => {
        const idx = TABS.indexOf(currentRef.current);
        let dx = g.dx;

        if ((idx === 0 && dx > 0) || (idx === TABS.length - 1 && dx < 0)) {
          dx = dx * 0.15;
        }

        translateX.setValue(dx);
      },
      onPanResponderRelease: (_, g) => {
        if (isNavigating.current) return;

        const idx = TABS.indexOf(currentRef.current);
        const dir = getDirection(g.dx, g.vx);
        const nextIdx = idx + dir;

        if (dir !== 0 && nextIdx >= 0 && nextIdx < TABS.length) {
          isNavigating.current = true;
          const target = dir > 0 ? -SCREEN_W * 0.4 : SCREEN_W * 0.4;

          Animated.timing(translateX, {
            toValue: target,
            duration: 180,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start(() => {
            router.replace(`/${TABS[nextIdx]}`);
            setTimeout(() => {
              translateX.setValue(0);
              isNavigating.current = false;
            }, 50);
          });
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            damping: 20,
            stiffness: 200,
            mass: 0.8,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 200,
        }).start();
        isNavigating.current = false;
      },
    })
  ).current;

  // Derive opacity from translation — fades as you swipe further
  const opacity = translateX.interpolate({
    inputRange: [-SCREEN_W * 0.4, 0, SCREEN_W * 0.4],
    outputRange: [0.4, 1, 0.4],
    extrapolate: "clamp",
  });

  // Subtle scale-down as you swipe for depth
  const scale = translateX.interpolate({
    inputRange: [-SCREEN_W * 0.4, 0, SCREEN_W * 0.4],
    outputRange: [0.95, 1, 0.95],
    extrapolate: "clamp",
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX }, { scale }],
          opacity,
        },
      ]}
      {...panResponder.panHandlers}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
