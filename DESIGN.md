# Voice Debate Lab Design System

## 1. Atmosphere & Identity

Voice Debate Lab should feel like a premium AI-agent workspace for source-grounded debate practice. The visual reference is closer to delight.ai's crisp product UI than a tutoring worksheet: warm off-white canvas, strong ink surfaces for decisive actions, soft lavender analysis panels, lime highlights for active state, and green source/progress accents.

The app should still be compact and useful under repeated practice. It is an operating console first, with enough polish that the debate opponent feels intentional rather than generic.

## 2. Color

### Palette

| Role | Token | Light | Dark | Usage |
|------|-------|-------|------|-------|
| Surface/app | `colors.background` | `#f5f3ee` | Not defined | Warm app canvas |
| Surface/panel | `colors.surface` | `#fffefa` | Not defined | Default panels |
| Surface/raised | `colors.surfaceRaised` | `#ffffff` | Not defined | Elevated cards and inputs |
| Surface/muted | `colors.surfaceMuted` | `#ece9e0` | Not defined | Inactive controls, quiet fills |
| Text/primary | `colors.ink` | `#151512` | Not defined | Titles, primary text, black surfaces |
| Text/on dark | `colors.onInk` | `#fffdf7` | Not defined | Text over ink |
| Text/secondary | `colors.muted` | `#706b61` | Not defined | Hints, labels, metadata |
| Border/default | `colors.line` | `#ded9ce` | Not defined | Panel borders, dividers |
| Accent/agent | `colors.lavender` | `#eeeaff` | Not defined | AI analysis surfaces |
| Accent/agentStrong | `colors.lavenderStrong` | `#7567e8` | Not defined | Active persona, phase |
| Accent/live | `colors.lime` | `#e7fb57` | Not defined | Primary live/record highlights |
| Accent/source | `colors.green` | `#008f6d` | Not defined | Source grounding, progress meters |
| Accent/user | `colors.amber` | `#a86608` | Not defined | User turn accent |
| Status/destructive | `colors.coral` | `#c4493f` | Not defined | Active recording and errors |

### Rules

- Use `colors.ink` for the header, focused speaking area, and main CTA surfaces.
- Use lime sparingly: live recording, primary glow, and high-signal active states only.
- Use lavender for agent/persona/coaching surfaces and green for source evidence/progress.
- Do not add raw colors in components. Add semantic tokens in `mobile-app/src/theme.js` first.

## 3. Typography

### Scale

| Level | Size | Weight | Line Height | Tracking | Usage |
|-------|------|--------|-------------|----------|-------|
| Title | 25 | 900 | Default | 0 | App title |
| Section | 16 | 900 | Default | 0 | Panel titles |
| Body | Default | 400 | 22 | 0 | Turn text, tips, summaries |
| Control | Default | 800-900 | Default | 0 | Buttons, chips, segmented controls |
| Eyebrow | 12 | 800-900 | Default | Uppercase | Metadata labels |

### Font Stack

- Primary: React Native platform system font.
- Mono: Not used.
- Serif: Not used.

### Rules

- Keep panel headings compact; avoid hero-scale type inside the app workflow.
- Use uppercase only for short metadata labels and speaker roles.

## 4. Spacing & Layout

### Base Unit

All spacing derives from a base of 4px.

| Token | Value | Usage |
|-------|-------|-------|
| `spacing.xs` | 4 | Tight internal offsets |
| `spacing.sm` | 8 | Small gaps, row spacing |
| `spacing.md` | 14 | Default panel/input padding |
| `spacing.lg` | 20 | Header and stage padding |
| `spacing.xl` | 28 | Larger workflow separation |

### Grid

- Mobile-first single-column scroll layout.
- Horizontal scroll rows are acceptable for topic/motion chips.
- Panels use generous rounded corners, subtle depth, and thin warm borders.

### Rules

- Keep repeated workflow sections as sibling panels, not nested cards.
- Prefer stable minimum heights for touch targets and text inputs.

## 5. Components

### Panel

- **Structure**: `View` with `styles.panel`, section title, then content.
- **Variants**: standard, dark `stage`.
- **Spacing**: `spacing.md` padding, `spacing.sm` inner gaps.
- **States**: empty, loading, error text should remain inside the panel.
- **Accessibility**: visible labels before editable fields.
- **Motion**: none.

### Chip / Segmented Control

- **Structure**: `Pressable` with text label.
- **Variants**: default raised surface, active ink/lavender/lime surface.
- **Spacing**: minimum height 42, horizontal `spacing.md`.
- **States**: active, disabled via opacity when needed.
- **Accessibility**: readable label text; do not rely on color alone when status text is available.
- **Motion**: none.

### Debate Turn Card

- **Structure**: card with role label and body.
- **Variants**: user amber accent, agent lavender accent, source green context.
- **Spacing**: `spacing.md` padding, `spacing.sm` top margin.
- **States**: warning/source mode can be shown in role metadata.
- **Accessibility**: role appears as text.
- **Motion**: none.

## 6. Motion & Interaction

### Timing

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Micro | Native default | Native default | Press feedback |
| Recording | Continuous visual state | Native default | Waveform active state |

### Rules

- Do not animate layout properties in custom animations.
- Keep loading indicators visible for API calls.
- Disable submit/record actions while a turn is in flight.

## 7. Depth & Surface

### Strategy

Use light depth like a premium SaaS console: warm canvas, raised white panels, subtle shadows, and stronger dark surfaces only where the user is speaking or taking action.

| Type | Value | Usage |
|------|-------|-------|
| Default border | 1px using `colors.line` | Panels, inputs, chips |
| Soft shadow | `colors.shadow` at low opacity | Panels and stage |
| Muted surface | `colors.surfaceMuted` | Inactive controls |
| Dark surface | `colors.ink` | Header, primary CTA, active recording/debate stage |

Avoid heavy drop shadows and avoid turning every component into a floating card. The layout should feel deliberate, not decorative.
