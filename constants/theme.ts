/**
 * Modern Dark Theme for UK Shop Owners
 * Sleek, professional design with neon accents and glassmorphism
 */

import { Platform } from 'react-native';

// Modern Dark Theme Colors
const neonGreen = '#00FF88'; // Bright neon green for savings
const neonBlue = '#00D4FF'; // Electric blue for primary actions
const neonPurple = '#8B5CF6'; // Purple for promotions
const neonPink = '#FF0080'; // Pink for highlights

// Dark backgrounds
const darkBg = '#0A0A0A'; // Deep black
const darkCard = '#1A1A1A'; // Dark gray cards
const darkSurface = '#2A2A2A'; // Surface elements
const darkBorder = '#333333'; // Subtle borders

// Text colors
const textPrimary = '#FFFFFF'; // Pure white
const textSecondary = '#B0B0B0'; // Light gray
const textMuted = '#666666'; // Muted gray

export const Colors = {
  light: {
    // Text colors
    text: '#1A1A1A',
    textSecondary: '#666666',
    textLight: '#999999',
    
    // Background colors
    background: '#FFFFFF',
    backgroundSecondary: '#F8F9FA',
    backgroundCard: '#FFFFFF',
    
    // Brand colors
    primary: '#2563EB',
    primaryLight: '#EFF6FF',
    accent: '#10B981',
    secondary: '#8B5CF6',
    warning: '#F59E0B',
    
    // UI colors
    tint: '#2563EB',
    icon: '#666666',
    tabIconDefault: '#999999',
    tabIconSelected: '#2563EB',
    
    // Status colors
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
    
    // Border and divider
    border: '#E5E7EB',
    divider: '#F3F4F6',
    
    // Shadow
    shadow: 'rgba(0, 0, 0, 0.1)',
  },
  dark: {
    // Text colors
    text: textPrimary,
    textSecondary: textSecondary,
    textLight: textMuted,
    
    // Background colors
    background: darkBg,
    backgroundSecondary: darkCard,
    backgroundCard: darkSurface,
    
    // Brand colors
    primary: neonGreen,
    primaryLight: 'rgba(0, 255, 136, 0.1)',
    accent: neonBlue,
    secondary: neonPurple,
    warning: neonPink,
    
    // UI colors
    tint: neonGreen,
    icon: textSecondary,
    tabIconDefault: textMuted,
    tabIconSelected: neonGreen,
    
    // Status colors
    success: neonGreen,
    error: '#FF4757',
    warning: neonPink,
    info: neonBlue,
    
    // Border and divider
    border: darkBorder,
    divider: '#333333',
    
    // Shadow
    shadow: 'rgba(0, 0, 0, 0.5)',
    
    // Glassmorphism
    glass: 'rgba(255, 255, 255, 0.05)',
    glassBorder: 'rgba(255, 255, 255, 0.1)',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

// Modern Typography Scale
export const Typography = {
  // Headers
  h1: {
    fontSize: 36,
    fontWeight: '800' as const,
    lineHeight: 44,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
    letterSpacing: -0.2,
  },
  h4: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
  },
  
  // Body text
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  
  // Labels and captions
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
  
  // Special text
  price: {
    fontSize: 20,
    fontWeight: '800' as const,
    lineHeight: 28,
  },
  savings: {
    fontSize: 14,
    fontWeight: '700' as const,
    lineHeight: 20,
  },
  
  // Modern styles
  neon: {
    fontSize: 16,
    fontWeight: '700' as const,
    lineHeight: 24,
    textShadowColor: 'rgba(0, 255, 136, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
};

// Modern Spacing Scale
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

// Modern Border Radius
export const BorderRadius = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  full: 9999,
};

// Modern Shadow Effects
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  neon: {
    shadowColor: '#00FF88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 0,
  },
  glow: {
    shadowColor: '#00D4FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 0,
  },
};

// Glassmorphism Effects
export const Glassmorphism = {
  light: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
  },
  dark: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
  },
};

// Modern Gradients
export const Gradients = {
  primary: ['#00FF88', '#00D4FF'],
  secondary: ['#8B5CF6', '#FF0080'],
  dark: ['#1A1A1A', '#0A0A0A'],
  glass: ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)'],
};
