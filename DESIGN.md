---
name: Options Planner
description: A fast, visually legible workspace for planning US equity options strategies.
colors:
  background: "oklch(0.09 0.012 250)"
  surface: "oklch(0.13 0.01 250)"
  surface-raised: "oklch(0.18 0.01 250)"
  ink: "oklch(0.95 0.006 250)"
  muted-ink: "oklch(0.54 0.016 250)"
  primary: "oklch(0.7 0.16 195)"
  profit: "oklch(0.68 0.17 150)"
  destructive: "oklch(0.63 0.22 25)"
  border: "oklch(0.24 0.012 250)"
typography:
  headline:
    fontFamily: "Outfit, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Outfit, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.33
    letterSpacing: "0.14em"
rounded:
  sm: "4.8px"
  md: "6.4px"
  lg: "8px"
  control: "24px"
  component: "32px"
  pill: "9999px"
spacing:
  compact: "8px"
  control: "12px"
  section: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.background}"
    rounded: "{rounded.component}"
    height: "36px"
    padding: "0 12px"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.ink}"
    rounded: "{rounded.component}"
    height: "36px"
    padding: "0 12px"
  input:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "36px"
    padding: "0 12px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.component}"
    padding: "24px"
---

# Design System: Options Planner

## Overview

**Creative North Star: "The Analyst's Instrument"**

Options Planner is a dark, cool-toned decision workspace for options learners and self-directed traders. It turns high-density financial information into a composed field of evidence: price, payoff, probability, and controls should read as one instrument panel rather than a collection of interchangeable SaaS widgets.

The system is modern, snappy, and confident. Cyan directs attention to the next deliberate action; green and red reserve their intensity for financial outcomes. The surface stays flat and quiet so charts, values, and the user's decision carry the visual weight. It explicitly rejects the generic SaaS-dashboard look: decorative metric tiles, interchangeable card grids, weak hierarchy, and polish that does not improve a trading decision.

**Key Characteristics:**

- Dark navy layers that reduce glare and let data colors stay legible.
- An Outfit interface voice paired with JetBrains Mono for symbols, metrics, and technical labels.
- Compact controls and a two-level radius system: large shared primitives and tighter structural panels.
- Tonal layering, fine rings, and dividers in place of ornamental depth.
- Semantic profit, loss, and chart colors that never serve as casual decoration.

## Colors

The palette is a precise dark instrument panel: cool-neutral surfaces establish calm while saturated cyan, green, amber, red, and violet separate actions and analytical series.

### Primary

- **Signal Cyan:** the single active accent for primary actions, focus, active selection, and principal chart series. It is scarce by design.
- **Measured Green:** reserved for positive P&L, profit, and favorable outcomes.
- **Caution Amber:** reserved for warning-level metrics and tertiary chart series.
- **Risk Red:** reserved for destructive actions, losses, and invalid states.

### Secondary

- **Analytical Violet:** a distinct fifth chart series only; never a second general-purpose action color.

### Neutral

- **Midnight Field:** the page background and deepest reading plane.
- **Panel Navy:** standard card and popover surface.
- **Raised Navy:** inputs, secondary controls, and selected-panel treatment.
- **Cold White:** primary text and high-confidence data.
- **Faded Steel:** supporting copy, secondary labels, and chart axes.
- **Instrument Line:** dividers, input boundaries, and low-emphasis structure.

**The One Signal Rule.** Signal Cyan is for actions, focus, current selection, and the principal data series. It must not become general decoration or fill inactive controls.

## Typography

**Display Font:** Outfit (with a system sans-serif fallback)
**Body Font:** Outfit (with a system sans-serif fallback)
**Label/Mono Font:** JetBrains Mono (with a monospace fallback)

**Character:** Outfit makes the application direct and highly readable; its moderate weight range keeps dense screens from feeling mechanical. JetBrains Mono distinguishes tickers, values, dates, and analytical labels without turning routine UI copy into terminal noise.

### Hierarchy

- **Headline** (600, 1.875rem, 1.2): page titles and the most important view-level conclusion.
- **Title** (600, 1rem, 1.25): panel titles, strategy names, and grouped controls.
- **Body** (400, 0.875rem, 1.5): explanations, helper copy, and compact prose. Keep explanatory paragraphs within 65–75ch.
- **Label** (500, 0.75rem, 0.14em): uppercase section labels and technical metadata; use Mono only where its precision improves scanning.
- **Metric** (600–700, 0.875–1.5rem, tabular): prices, P&L, Greeks, and counts. Use tabular figures whenever values align or change.

**The Evidence-First Rule.** Use the sans-serif voice for decisions and explanations; reserve monospace for the evidence that supports them.

## Elevation

This is flat by default. Depth comes from Midnight Field, Panel Navy, Raised Navy, and restrained one-pixel rings; components should not float merely to look premium. The existing shared card primitive uses a soft, low-contrast shadow, but it is secondary to tonal separation and must not be compounded with a heavy border.

### Shadow Vocabulary

- **Low Ambient Lift** (`0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`): the shared card's subtle resting lift. Use only for a reusable container where hierarchy requires it.

**The Flat-By-Default Rule.** If a surface reads correctly through tonal contrast and an Instrument Line, it gets no shadow. Never pair a decorative wide shadow with a visible border.

## Components

### Buttons

Compact controls that feel responsive rather than ornamental. The shared primitives use large, fixed radii; page-level analytical panels use tighter structural corners.

- **Shape:** large rounded corners (32px); default and large heights are 36px and 40px.
- **Primary:** Signal Cyan with Midnight Field text; use for the single clearest next action.
- **Outline:** Midnight Field with an Instrument Line; use for adjacent, lower-priority actions.
- **Hover / Focus:** primary reduces its opacity slightly on hover; keyboard focus uses a cyan border and translucent three-pixel ring. Active buttons move down by one pixel as feedback.
- **Disabled / Invalid:** disabled controls reduce opacity and lose pointer input; invalid controls change to Risk Red with a red focus ring.

### Chips

- **Style:** compact 24px-radius labels with a 20px height, small text, and a semantic fill or outline.
- **State:** primary chips indicate a selected or principal state; secondary and outline chips categorize without competing with the primary action.

### Cards / Containers

- **Corner Style:** the shared Card primitive uses large corners (32px); route-level analytical panels use tighter corners (8px). Do not introduce additional rounded container variants without a structural reason.
- **Background:** Panel Navy with Cold White text.
- **Shadow Strategy:** flat or Low Ambient Lift only; structural rings carry the edge.
- **Border:** a subtle Instrument Line or low-opacity foreground ring where separation is needed.
- **Internal Padding:** 24px by default and 16px for compact panels.

### Inputs / Fields

- **Style:** 36px controls with large rounded corners (24px) on Raised Navy and a transparent resting border.
- **Focus:** Signal Cyan border and translucent three-pixel ring; focus must be visible without relying on motion.
- **Error / Disabled:** Risk Red ring and border for invalid values; disabled fields lose pointer input and reduce opacity.

### Navigation

- **Style:** a sticky top bar with a thin bottom divider and a translucent Midnight Field backdrop. The mark anchors the left edge, followed by compact text links.
- **States:** navigation links begin in Faded Steel and resolve to Cold White on hover or active state. Do not use a second color for ordinary navigation.

### Analytical Charts

- **Style:** use Instrument Line for grids and the zero reference; use Faded Steel for axes and labels.
- **Series:** Signal Cyan is primary; Measured Green, Caution Amber, Risk Red, and Analytical Violet distinguish comparable series. Every color encoding needs a label, legend, or value companion.

## Do's and Don'ts

### Do:

- **Do** use the dark navy layer stack to separate page, panel, and input surfaces before adding any shadow.
- **Do** reserve Signal Cyan for primary actions, focus, current selection, and the principal chart series.
- **Do** use tabular Mono values for prices, P&L, Greeks, and counts that users compare line by line.
- **Do** make profit, loss, warning, and informational states understandable through labels, icons, or copy in addition to color.
- **Do** keep state transitions brisk (roughly 150–250ms) and honor reduced-motion preferences.

### Don't:

- **Don't** recreate the generic SaaS-dashboard look with decorative metric tiles, interchangeable card grids, or visual polish that does not help a trader make a decision.
- **Don't** use cyan as a decorative highlight, a muted inactive state, or a second background color.
- **Don't** use a colored side stripe, gradient text, glassmorphism, or a decorative CSS grid background.
- **Don't** make every section a rounded card; dense analytical layouts need direct structure, tables, and dividers as well.
- **Don't** pair an obvious border with a broad soft shadow on the same component.
