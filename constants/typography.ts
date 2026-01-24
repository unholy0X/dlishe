import { colors } from '@/constants/colors';

export const typography = {
    fontFamily: {
        display: 'Cormorant Garamond',
        body: 'Inter',
        accent: 'Crimson Text',
    },
    fontSize: {
        hero: 40,
        h1: 32,
        h2: 24,
        h3: 20,
        bodyLarge: 17,
        body: 15,
        bodySmall: 13,
        caption: 11,
    },
    lineHeight: {
        hero: 48,
        h1: 40,
        h2: 32,
        h3: 28,
        bodyLarge: 26,
        body: 24,
        bodySmall: 20,
        caption: 16,
    },
    fontWeight: {
        light: '300' as const,
        regular: '400' as const,
        medium: '500' as const,
        semibold: '600' as const,
    },
    letterSpacing: {
        tight: -0.02,
        normal: 0,
    },
} as const;

// Text style presets for common use cases
export const textStyles = {
    hero: {
        fontFamily: typography.fontFamily.display,
        fontSize: typography.fontSize.hero,
        lineHeight: typography.lineHeight.hero,
        fontWeight: typography.fontWeight.light,
        letterSpacing: typography.letterSpacing.tight,
        color: colors.text.primary,
    },
    h1: {
        fontFamily: typography.fontFamily.display,
        fontSize: typography.fontSize.h1,
        lineHeight: typography.lineHeight.h1,
        fontWeight: typography.fontWeight.regular,
        letterSpacing: typography.letterSpacing.tight,
        color: colors.text.primary,
    },
    h2: {
        fontFamily: typography.fontFamily.display,
        fontSize: typography.fontSize.h2,
        lineHeight: typography.lineHeight.h2,
        fontWeight: typography.fontWeight.medium,
        letterSpacing: typography.letterSpacing.tight,
        color: colors.text.primary,
    },
    h3: {
        fontFamily: typography.fontFamily.body,
        fontSize: typography.fontSize.h3,
        lineHeight: typography.lineHeight.h3,
        fontWeight: typography.fontWeight.semibold,
        color: colors.text.primary,
    },
    bodyLarge: {
        fontFamily: typography.fontFamily.body,
        fontSize: typography.fontSize.bodyLarge,
        lineHeight: typography.lineHeight.bodyLarge,
        fontWeight: typography.fontWeight.regular,
        color: colors.text.secondary,
    },
    body: {
        fontFamily: typography.fontFamily.body,
        fontSize: typography.fontSize.body,
        lineHeight: typography.lineHeight.body,
        fontWeight: typography.fontWeight.regular,
        color: colors.text.secondary,
    },
    bodySmall: {
        fontFamily: typography.fontFamily.body,
        fontSize: typography.fontSize.bodySmall,
        lineHeight: typography.lineHeight.bodySmall,
        fontWeight: typography.fontWeight.regular,
        color: colors.text.tertiary,
    },
    caption: {
        fontFamily: typography.fontFamily.body,
        fontSize: typography.fontSize.caption,
        lineHeight: typography.lineHeight.caption,
        fontWeight: typography.fontWeight.medium,
        color: colors.text.muted,
    },
} as const;
