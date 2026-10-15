import { css } from 'lit';

export const LUCARNE_PALETTE: Record<string, string> = {
  family: '#a8d8b9',
  anton: '#a8c5e8',
  ingrid: '#c8b4e0',
  kid1: '#f5c89c',
  kid2: '#b8e0d2',
  kid3: '#f0b8c8',
  holidays: '#d4cfc4',
  birthdays: '#f0dca0',
  lesLilas: '#b8b4e8',
};

export const LUCARNE_SPACING = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  xxl: '32px',
} as const;

export const LUCARNE_RADII = {
  sm: '4px',
  md: '8px',
  lg: '16px',
} as const;

export const LUCARNE_TYPE_SCALE = {
  sm: 'clamp(0.75rem, 0.5vw + 0.5rem, 0.875rem)',
  md: 'clamp(0.875rem, 0.75vw + 0.6rem, 1rem)',
  lg: 'clamp(1rem, 1vw + 0.75rem, 1.25rem)',
  xl: 'clamp(1.25rem, 1.5vw + 0.875rem, 1.75rem)',
} as const;

export const LUCARNE_SHADOWS = {
  card: '0 1px 4px rgba(0,0,0,0.08)',
} as const;

export const lucarneStyles = css`
  :host {
    --lucarne-spacing-xs: 4px;
    --lucarne-spacing-sm: 8px;
    --lucarne-spacing-md: 12px;
    --lucarne-spacing-lg: 16px;
    --lucarne-spacing-xl: 24px;
    --lucarne-spacing-xxl: 32px;

    --lucarne-radius-sm: 4px;
    --lucarne-radius-md: 8px;
    --lucarne-radius-lg: 16px;

    --lucarne-fs-sm: clamp(0.75rem, 0.5vw + 0.5rem, 0.875rem);
    --lucarne-fs-md: clamp(0.875rem, 0.75vw + 0.6rem, 1rem);
    --lucarne-fs-lg: clamp(1rem, 1vw + 0.75rem, 1.25rem);
    --lucarne-fs-xl: clamp(1.25rem, 1.5vw + 0.875rem, 1.75rem);

    --lucarne-shadow-card: 0 1px 4px rgba(0, 0, 0, 0.08);

    --lucarne-color-family: #a8d8b9;
    --lucarne-color-anton: #a8c5e8;
    --lucarne-color-ingrid: #c8b4e0;
    --lucarne-color-holidays: #d4cfc4;
    --lucarne-color-birthdays: #f0dca0;
    --lucarne-color-les-lilas: #b8b4e8;

    --lucarne-success-bg: #e8f5e9;
    --lucarne-success-fg: #2e7d32;

    --lucarne-surface: var(--ha-card-background, var(--card-background-color, #fff));
    --lucarne-on-surface: var(--primary-text-color, #212121);
    --lucarne-on-surface-muted: var(--secondary-text-color, #727272);

    --lucarne-skeleton-base: rgba(0, 0, 0, 0.06);
    --lucarne-skeleton-highlight: rgba(0, 0, 0, 0.12);
    --lucarne-pan-easing: cubic-bezier(0.32, 0.72, 0, 1);
    --lucarne-pan-duration: 240ms;

    /* Shared OUTER height for the Today + Calendar cards so their ha-card boxes
       line up side by side regardless of differing header/chrome heights. Applied
       to each card's ha-card under fill_viewport; the inner scroll region flexes to fill. The ~114px
       offset is the dashboard chrome above the card plus the gap below it. */
    --lucarne-card-fill-height: calc(100vh - 114px);
  }

  @supports (height: 100dvh) {
    :host {
      --lucarne-card-fill-height: calc(100dvh - 114px);
    }
  }

  @media (prefers-color-scheme: dark) {
    :host {
      --lucarne-skeleton-base: rgba(255, 255, 255, 0.08);
      --lucarne-skeleton-highlight: rgba(255, 255, 255, 0.16);
    }
  }
`;
