// CategoryTile - Large visual tile for category grid
// Square tile with icon, label, count badge, gradient background

import { Pressable, Text, View, Animated } from 'react-native';
import { useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { getCategoryVisual, getCategoryIcon } from '@/constants/categoryVisuals';
import { FilteredEmoji } from './FilteredEmoji';
import { colors } from '@/constants/colors';
import type { IngredientCategory } from '@/types';
import * as Haptics from 'expo-haptics';

interface CategoryTileProps {
  category: IngredientCategory;
  label: string;
  count: number;
  onPress: () => void;
  isEmpty?: boolean;
}

export function CategoryTile({
  category,
  label,
  count,
  onPress,
  isEmpty = false,
}: CategoryTileProps) {
  const visual = getCategoryVisual(category);
  const icon = getCategoryIcon(category);
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale }], flex: 1 }}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{
          aspectRatio: 1,
          borderRadius: 24,
          overflow: 'hidden',
          opacity: isEmpty ? 0.5 : 1,
          borderWidth: isEmpty ? 2 : 0,
          borderStyle: isEmpty ? 'dashed' : 'solid',
          borderColor: isEmpty ? colors.stone[300] : 'transparent',
        }}
      >
        <LinearGradient
          colors={isEmpty ? [colors.stone[100], colors.stone[100]] : visual.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 16,
          }}
        >
          {/* Large Icon with luxury filter */}
          <FilteredEmoji
            emoji={icon}
            size={56}
            opacity={isEmpty ? 0.4 : 0.8}
            warmTint={!isEmpty}
          />

          {/* Category Label */}
          <Text
            style={{
              fontFamily: 'Cormorant Garamond',
              fontSize: 16,
              fontWeight: '600',
              color: isEmpty ? colors.text.muted : visual.icon,
              textAlign: 'center',
              marginBottom: 6,
            }}
          >
            {label}
          </Text>

          {/* Count Badge */}
          <View
            style={{
              backgroundColor: isEmpty
                ? 'transparent'
                : visual.icon === 'white'
                ? 'rgba(255,255,255,0.25)'
                : 'rgba(0,0,0,0.1)',
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 12,
            }}
          >
            <Text
              style={{
                fontFamily: 'Inter',
                fontSize: 12,
                fontWeight: '500',
                color: isEmpty ? colors.text.muted : visual.icon,
              }}
            >
              {count} {count === 1 ? 'item' : 'items'}
            </Text>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}
