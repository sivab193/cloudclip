---
name: CloudClip
description: Calm, trustworthy interfaces for private text continuity.
colors:
  ink: "#1d2530"
  paper: "#f6f5f1"
  white: "#ffffff"
  deep-ink: "#10151b"
  night-surface: "#1b222b"
  night-text: "#f0f2ef"
  violet: "#3e327f"
  violet-light: "#b8adff"
  quiet-green: "#216b54"
  night-green: "#8bdbb2"
typography:
  display:
    fontFamily: "System sans-serif"
    fontSize: "68px desktop / 44px compact"
    fontWeight: 800
    lineHeight: "1.06"
  body:
    fontFamily: "System sans-serif"
    fontSize: "15-18px"
    fontWeight: 400
    lineHeight: "1.6"
  label:
    fontFamily: "System sans-serif"
    fontSize: "11-13px"
    fontWeight: 700
rounded:
  control: "9px"
  panel: "13px"
  dialog: "16px"
spacing:
  compact: "8px"
  control: "16px"
  section: "70-95px"
components:
  button-primary:
    backgroundColor: "{colors.violet}"
    textColor: "{colors.white}"
    rounded: "{rounded.control}"
    height: "50px"
  panel:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
---

# Design System: CloudClip

## Overview

**Creative North Star: "The Quiet Desk"**

CloudClip should feel like a useful workspace, not a technology spectacle. Clear language, a generous reading rhythm, and concrete examples explain the product before decoration. The identity centers on a compact cloud/clip mark that also reads as a transfer path.

Light and dark are peers. Each has a neutral canvas, a distinct raised surface, restrained violet actions, and green reserved for positive privacy or availability cues.

**Key Characteristics:**

- Editorial hierarchy with one clear action per section.
- Tonal layers and fine borders instead of ornamental glow.
- Plain labels for working, disabled, and coming-soon states.

## Colors

Violet signals action; green signals a verified positive state. Neutral surfaces carry most of the interface.

### Primary

- **Deep violet:** primary controls in light mode.
- **Soft violet:** primary controls and links in dark mode.

### Neutral

- **Warm paper and ink:** light-mode canvas and text.
- **Deep ink and pale text:** dark-mode canvas and text.
- **White and night surface:** cards, forms, and dialogs.

**The One Accent Rule.** Use violet sparingly to make the next useful action obvious; avoid decorative violet glows and gradients.

## Typography

System sans-serif keeps the web and upcoming native surfaces familiar. Headlines are heavy and compact; explanatory text is looser and quieter. Small uppercase labels are limited to functional metadata, never used as a substitute for an actual heading.

## Layout

The web page uses a centered container up to 1240px. The first viewport pairs a compact proposition with a real-world clip-to-link example; below 860px, that pair stacks. Sections have generous vertical separation. Controls keep touch-friendly minimum heights, and the mobile header preserves the mark, theme toggle, and entry action.

## Elevation & Depth

Pages are flat by default. Cards gain definition through a one-pixel border and tonal contrast. Dialogs may use one diffuse shadow to separate them from the scrim; buttons and brand marks do not glow.

## Shapes

Corners are gently rounded: controls around 9px, panels around 13px, dialogs around 16px. The square app mark uses a larger internal curve that belongs to the logo, not to every interface element.

## Components

### Buttons

Primary actions are solid violet with high-contrast text. Secondary actions use the surface color and a visible border. Disabled controls retain readable text rather than fading an entire button. Hover, pressed, and keyboard-focus states are visible and restrained.

### Cards / Containers

Use a raised neutral surface, subtle border, and comfortable padding. A card should contain actual content or a clearly marked example, not decorative placeholder metrics.

### Inputs / Fields

Use a full border and neutral fill, with clear placeholder contrast and an evident focus ring. Support error and disabled states through semantic color and text.

### Navigation

The header is a simple anchored row, not a floating glass panel. The logo links home, and the theme control remains available on small screens.

## Do's and Don'ts

### Do:

- **Do** label samples as examples and future capabilities as coming soon.
- **Do** retain good contrast in both themes and visible keyboard focus.
- **Do** favor concise, factual privacy language.

### Don't:

- **Don't** add ornamental glows, glassmorphism, or animated orbit imagery to explain basic functionality.
- **Don't** imply the native apps or file transfer are shipping today.
- **Don't** use fake activity counts, uptime numbers, or testimonials.
