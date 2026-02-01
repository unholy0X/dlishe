// FilteredEmoji - Emoji with luxury bohème styling
// Uses opacity reduction and warm overlay for sophisticated appearance

import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface FilteredEmojiProps {
  emoji: string;
  size?: number;
  /** Opacity for muted effect (0.6-0.8 recommended for bohème look) */
  opacity?: number;
  /** Show warm overlay tint */
  warmTint?: boolean;
}

export function FilteredEmoji({
  emoji,
  size = 48,
  opacity = 0.75,
  warmTint = true
}: FilteredEmojiProps) {
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Emoji with reduced opacity for muted effect */}
      <Text
        style={{
          fontSize: size * 0.85,
          lineHeight: size,
          textAlign: 'center',
          opacity: opacity,
        }}
      >
        {emoji}
      </Text>
      {/* Warm tint overlay */}
      {warmTint && (
        <LinearGradient
          colors={['rgba(193, 154, 107, 0.15)', 'rgba(212, 184, 150, 0.1)']}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: size / 2,
          }}
          pointerEvents="none"
        />
      )}
    </View>
  );
}
