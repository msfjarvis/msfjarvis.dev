# ImageModal redesign

## Goal

Redesign `src/components/ImageModal.astro` from scratch so it feels more premium, improves usability and accessibility, better matches the site aesthetic, and has more intentional interaction design without turning into a gallery system.

## Chosen direction

Use an **editorial lightbox** approach:

- quiet, article-friendly inline figure
- soft rise/fade modal motion
- subtle affordances instead of heavy UI chrome
- image-first presentation with secondary caption treatment

This is the best fit for the site’s restrained visual language and prose-heavy layouts.

## Non-goals

- multi-image gallery navigation
- thumbnail strips
- zoom/pan gestures
- turning the component into a generic media viewer
- broad refactors outside `ImageModal` and its immediate call sites

## Current state summary

The current component:

- duplicates image markup inline and in the modal
- uses inline styles extensively
- opens/closes by mutating `display`
- has limited dialog semantics and focus management
- attaches document-level listeners per trigger
- has basic animation, but the interaction does not feel especially polished

## Design

### 1. Inline figure

The inline figure should remain visually quiet inside prose.

Behavior and presentation:

- preserve the existing `figure` / `figcaption` structure
- keep the image full-width and responsive
- add a subtle hover/focus affordance that suggests expandability
- avoid card-like framing that pulls too much attention away from article text
- keep caption styling refined and low-emphasis

Affordance guidance:

- small hover change in opacity, lift, or overlay hint
- visible keyboard focus state on the trigger
- no loud badges or persistent controls

### 2. Modal presentation

The modal should feel like a calm extension of the article, not a separate app surface.

Behavior and presentation:

- darkened overlay with gentle blur
- image centered with generous breathing room
- soft rise/fade entrance and exit motion
- minimal but visible close control
- optional caption/title shown in a restrained treatment below or near the image

The modal should prioritize the image while still making controls discoverable.

### 3. Motion

Motion direction is based on the preferred prototype: **Option A, with subtle chrome**.

Animation characteristics:

- overlay fades in/out smoothly
- modal content lifts slightly and settles into place
- timing should feel soft and editorial, not springy or theatrical
- hover motion on the inline trigger should be mild
- respect `prefers-reduced-motion` by disabling or minimizing transitions

### 4. Accessibility

The redesign must behave like a proper dialog.

Requirements:

- dialog semantics on the modal container
- accessible name for close control
- keyboard activation from the inline trigger
- close on `Escape`
- close on overlay click
- focus moves into the modal on open
- focus returns to the trigger on close
- background content should not remain interactable while modal is open
- maintain meaningful alt text and caption behavior

## Architecture

### Component responsibilities

`src/components/ImageModal.astro` will remain the main component responsible for:

- rendering the inline figure trigger
- rendering the modal markup
- styling both inline and modal states
- wiring up client-side open/close behavior

### Internal structure

Refactor toward clearer internal sections:

- shared image rendering block or helper markup pattern to avoid unnecessary duplication
- semantic inline trigger region
- semantic modal/dialog region
- consolidated script initialization with safer event attachment
- CSS organized around inline state, modal state, and motion

### Integration points

- `src/components/Figure.astro` should continue to delegate object-based Astro image data to `ImageModal`
- feed cleanup logic in `src/lib/feed.ts` depends on current lightbox markers, so any data-attribute changes must either preserve those hooks or update the cleanup logic accordingly
- gallery layouts should continue to work without special casing

## Styling guidance

Use existing site tokens from `src/styles/global.css` where possible:

- `--bg`, `--bg-subtle`
- `--border`
- `--text`, `--text-2`, `--text-3`
- `--accent`, `--accent-subtle`

Visual tone should align with the rest of the site:

- restrained
- typographically clean
- premium through spacing and motion rather than ornament

## Interaction flow

1. User encounters an inline figure in article prose.
2. Hover/focus suggests that the image can be expanded.
3. User activates the trigger.
4. Overlay fades in and modal image rises gently into view.
5. Focus moves to the modal/close control.
6. User closes via close button, overlay click, or `Escape`.
7. Motion reverses softly and focus returns to the original trigger.

## Error handling and robustness

- if required modal elements are missing, client script should fail safely without breaking the page
- event listeners should be attached once per component instance
- body scroll locking should be restored reliably on close
- closing logic should be resilient to repeated interactions

## Testing and validation

Because this repository should not keep permanent tests for this UI exploration, validation should focus on runtime behavior:

- verify trigger opens modal
- verify close button, overlay click, and `Escape` all close it
- verify focus return to trigger
- verify reduced-motion behavior
- verify responsive behavior for large and tall images
- verify no feed regression from lightbox markup changes

## Implementation notes

Expected files most likely involved:

- `src/components/ImageModal.astro`
- `src/components/Figure.astro` (only if interface adjustments are needed)
- `src/lib/feed.ts` (only if marker attributes change)

## Open decisions already resolved

- preferred motion direction: **soft rise**
- preferred chrome level: **subtle affordances**
- preferred product framing: **single-image editorial lightbox**

## Success criteria

The redesign is successful if:

- the modal feels noticeably more polished and premium
- the interaction better fits the site’s editorial tone
- controls are clearer without feeling heavy
- accessibility is materially improved
- the component remains simple and focused rather than expanding into a gallery feature
