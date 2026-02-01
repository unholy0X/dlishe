// ItemBadge - Visual letter badge for pantry items
// Shows first 1-2 letters of item name with category-colored background

import { View, Text } from 'react-native';
import { getCategoryVisual } from '@/constants/categoryVisuals';
import type { IngredientCategory } from '@/types';

interface ItemBadgeProps {
  name: string;
  category: IngredientCategory;
  size?: number;
}

export function ItemBadge({ name, category, size = 44 }: ItemBadgeProps) {
  const visual = getCategoryVisual(category);

  // Get first 2 characters, capitalized
  const initials = name.slice(0, 2).charAt(0).toUpperCase() + name.slice(1, 2).toLowerCase();

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: visual.bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: visual.icon,
          fontSize: size * 0.4,
          fontFamily: 'Inter',
          fontWeight: '600',
        }}
      >
        {initials}
      </Text>
    </View>
  );
}
