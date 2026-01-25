// ItemTile - Visual tile for pantry item grid
// Square tile with letter badge, name, quantity

import { Pressable, Text, View, Animated } from 'react-native';
import { useRef } from 'react';
import { ItemBadge } from './ItemBadge';
import { colors } from '@/constants/colors';
import type { PantryItem } from '@/types';
import * as Haptics from 'expo-haptics';

interface ItemTileProps {
  item: PantryItem;
  onPress: () => void;
  onLongPress: () => void;
}

export function ItemTile({ item, onPress, onLongPress }: ItemTileProps) {
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

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLongPress();
  };

  // Format quantity display
  const quantityDisplay =
    item.quantity && item.unit
      ? `${item.quantity} ${item.unit}`
      : item.quantity
        ? `${item.quantity}`
        : '';

  return (
    <Animated.View style={{ transform: [{ scale }], flex: 1 }}>
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{
          backgroundColor: colors.stone[100],
          borderRadius: 20,
          borderWidth: 1,
          borderColor: colors.stone[200],
          padding: 12,
          alignItems: 'center',
          minHeight: 120,
          justifyContent: 'center',
        }}
      >
        {/* Letter Badge */}
        <ItemBadge name={item.name} category={item.category} size={44} />

        {/* Item Name */}
        <Text
          numberOfLines={2}
          style={{
            fontFamily: 'Inter',
            fontSize: 13,
            fontWeight: '600',
            color: colors.text.primary,
            textAlign: 'center',
            marginTop: 10,
            lineHeight: 16,
          }}
        >
          {item.name}
        </Text>

        {/* Quantity */}
        {quantityDisplay ? (
          <Text
            style={{
              fontFamily: 'Inter',
              fontSize: 11,
              color: colors.text.muted,
              textAlign: 'center',
              marginTop: 4,
            }}
          >
            {quantityDisplay}
          </Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}
