# MEDVERSE — Foundation 001

Standalone Vite + React application for the MEDVERSE platform.

## Visual direction
- Holographic identity: deep navy, cyan light, restrained violet accents.
- Immersive page navigation with reveal transitions, scroll progress, responsive menu and interactive environment cards.
- Reduced-motion support and responsive layouts.

## Current functional foundation
- Animated holographic human schematic (illustrative UI artwork, not a medical model).
- Section navigation with scroll tracking.
- Module directory with live search/filter.
- Interactive module detail dialogs.
- Existing Human Atlas opens in a separate tab at https://atlas.taim.best.
- Responsive mobile navigation and feedback notifications.

## Run locally
Requires Node.js >=22.13.

```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## Cloudflare Pages preview
Configure a separate Pages project or a separate deployment target:
- Root directory: `medverse`
- Build command: `npm run build`
- Build output directory: `dist`
- Node.js: 22.13 or newer

Do not change the existing Human Atlas Pages project root or production settings.

## Next integration steps
1. Verify the preview deployment and responsive behavior.
2. Connect the Anatomy Explorer to the Human Atlas through a controlled integration.
3. Add real route-level module pages.
4. Integrate authentication and user data only after environment variables and access rules are verified.
