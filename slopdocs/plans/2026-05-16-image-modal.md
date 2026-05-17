# ImageModal Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `src/components/ImageModal.astro` as a polished editorial lightbox with soft motion, subtle affordances, and materially better accessibility while preserving existing content integration.

**Architecture:** Keep `ImageModal.astro` as the single component that renders the inline figure and its dialog markup, but restructure it around a clearer trigger/dialog split with shared image markup generation and one guarded client initializer. Preserve the feed cleanup contract by keeping the existing lightbox marker attributes unless a matching `src/lib/feed.ts` update is included in the same task.

**Tech Stack:** Astro components, inline client script, site CSS tokens from `src/styles/global.css`, existing feed cleanup in `src/lib/feed.ts`

---

## File structure

- `src/components/ImageModal.astro`
  - Main implementation target.
  - Replace inline-style-heavy markup with a cleaner editorial trigger + dialog structure.
  - Add soft-rise motion, reduced-motion handling, focus return, and safer open/close lifecycle.
- `src/components/Figure.astro`
  - Likely unchanged.
  - Only touch if `ImageModal` prop or wrapper expectations need adjustment.
- `src/lib/feed.ts`
  - Only touch if the redesign changes `data-image-lightbox`, `data-lightbox-trigger`, or `data-lightbox-container` hooks used by `removeLightboxDuplicates()`.
- `slopdocs/features/image-modal.md`
  - Optional follow-up living doc if implementation introduces behavior future agents will need to preserve.

## Scope check

This is a single subsystem plan. All work is confined to one component plus one integration point (`feed.ts`) if selector compatibility changes.

### Task 1: Lock the current cleanup contract and modal hooks

**Files:**

- Read: `src/components/ImageModal.astro`
- Read: `src/components/Figure.astro`
- Read: `src/lib/feed.ts:106-121`

- [ ] **Step 1: Re-read the feed cleanup selectors before editing the component**

```ts
/** Remove duplicate images from lightbox components for feeds. */
function removeLightboxDuplicates(html: string): string {
  const $ = load(html);
  $("[data-image-lightbox]").each((_, figure) => {
    const $figure = $(figure);
    const $button = $figure.find("[data-lightbox-trigger]");
    if ($button.length > 0) {
      const imageHtml = $button.html();
      if (!imageHtml) {
        throw Error("Failed to find lightbox trigger in page, has the layout changed?");
      }
      $button.replaceWith(imageHtml);
    }
  });
  $("[data-lightbox-container]").remove();
  $("script").remove();
  return $.html();
}
```

Reason: this is the existing integration contract. The redesign should preserve these attributes unless Task 5 updates them in lockstep.

- [ ] **Step 2: Confirm the current Figure/ImageModal interface still fits the redesign**

```astro
---
import ImageModal from './ImageModal.astro';

interface Props {
  src: ImageMetadata | string;
  alt?: string;
  title?: string;
}

const { src, alt = '', title } = Astro.props;
---

{typeof src === 'object' ? (
  <ImageModal src={src} alt={alt} title={title} />
) : (
  <figure>
    <img src={src} alt={alt} />
    {title && <figcaption>{title}</figcaption>}
  </figure>
)}
```

Expected outcome: no interface expansion unless the redesign truly needs additional metadata.

- [ ] **Step 3: Commit the scope checkpoint**

```bash
git add slopdocs/plans/2026-05-16-image-modal.md
git commit -m "docs: add ImageModal implementation plan"
```

Expected: commit succeeds or is skipped if the plan doc was already committed separately.

### Task 2: Rebuild the component markup around an editorial trigger + dialog

**Files:**

- Modify: `src/components/ImageModal.astro`
- Reference: `src/styles/global.css:1-27`

- [ ] **Step 1: Write a temporary runtime fixture page that renders one `ImageModal` instance**

Create a temporary page for behavioral validation only, then remove it later.

```astro
---
import ImageModal from '../components/ImageModal.astro';
import sample from '../assets/placeholder.png';
---

<html lang="en">
  <body>
    <main>
      <ImageModal
        src={sample}
        alt="Temporary validation image"
        title="Temporary validation caption"
      />
    </main>
  </body>
</html>
```

Suggested path: `src/pages/image-modal-temp.astro`

Reason: this repository should not keep permanent tests for this UI exploration; use a temporary runtime path instead.

- [ ] **Step 2: Start the dev server and confirm the current component behavior before rewriting**

Run:

```bash
astro dev
```

Then open the temporary page and verify the current baseline:

- inline figure renders
- click opens the current modal
- `Escape` closes it

Expected: current behavior works and gives you a before/after comparison.

- [ ] **Step 3: Replace the component markup with a cleaner semantic structure**

Use this shape inside `src/components/ImageModal.astro`:

```astro
---
import { Picture } from 'astro:assets';

interface Props {
  src: ImageMetadata | string;
  alt?: string;
  title?: string;
}

type ImageMetadata = {
  src: string;
  width: number;
  height: number;
  format: string;
};

const { src, alt = '', title } = Astro.props;
const dialogLabel = title || alt || 'Expanded image';
---

<figure data-image-lightbox>
  <button
    data-lightbox-trigger
    type="button"
    class="image-modal__trigger"
    aria-haspopup="dialog"
    aria-label={`Open ${alt || title || 'image'} in lightbox`}
  >
    <span class="image-modal__media">
      {typeof src === 'object' ? (
        <Picture src={src} alt={alt} formats={['avif', 'webp']} fallbackFormat="webp" />
      ) : (
        <img src={src} alt={alt} loading="lazy" decoding="async" />
      )}
      <span class="image-modal__hint" aria-hidden="true">Expand image</span>
    </span>
  </button>
  {title && <figcaption class="image-modal__caption">{title}</figcaption>}
</figure>

<div
  data-lightbox-container
  class="image-modal__dialog"
  role="dialog"
  aria-modal="true"
  aria-label={dialogLabel}
  aria-hidden="true"
  inert
>
  <button
    type="button"
    class="image-modal__overlay"
    data-lightbox-overlay
    aria-label="Close image lightbox"
  ></button>
  <div class="image-modal__sheet" role="document">
    <button
      data-lightbox-close
      type="button"
      class="image-modal__close"
      aria-label="Close image lightbox"
    >
      <span aria-hidden="true">✕</span>
    </button>
    <div data-lightbox-inner class="image-modal__content">
      {typeof src === 'object' ? (
        <Picture src={src} alt={alt} formats={['avif', 'webp']} fallbackFormat="webp" />
      ) : (
        <img src={src} alt={alt} loading="eager" decoding="async" />
      )}
    </div>
    {title && <p class="image-modal__meta">{title}</p>}
  </div>
</div>
```

Notes:

- keep `data-image-lightbox`, `data-lightbox-trigger`, `data-lightbox-container`, `data-lightbox-overlay`, `data-lightbox-close`, and `data-lightbox-inner`
- avoid inline styles
- keep the dialog markup adjacent to the figure so the script can find its owning instance cheaply

- [ ] **Step 4: Refresh the temp page and verify the rewrite did not break basic rendering**

Run:

```bash
# if astro dev is already running, just refresh the browser
```

Expected:

- inline image still renders
- hint only appears visually, not as duplicate spoken text
- caption still renders when present
- modal markup exists but may not behave correctly until Task 3 script work is done

- [ ] **Step 5: Commit the semantic markup rewrite**

```bash
git add src/components/ImageModal.astro src/pages/image-modal-temp.astro
git commit -m "refactor: rebuild ImageModal markup"
```

### Task 3: Add the editorial visual system and soft-rise motion

**Files:**

- Modify: `src/components/ImageModal.astro`

- [ ] **Step 1: Replace the current styles with token-based component styles**

Add or adapt CSS like this inside `src/components/ImageModal.astro`:

```css
figure[data-image-lightbox] {
  margin: 1.5rem 0;
  text-align: center;
}

.image-modal__trigger {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  background: none;
  cursor: zoom-in;
  text-align: inherit;
}

.image-modal__media {
  position: relative;
  display: block;
  overflow: hidden;
  border-radius: 10px;
  transform: translateY(0);
  transition:
    transform 220ms ease,
    opacity 220ms ease;
}

.image-modal__media :is(img, picture) {
  display: block;
  width: 100%;
  max-width: 100%;
  height: auto;
  border-radius: inherit;
}

.image-modal__hint {
  position: absolute;
  right: 0.75rem;
  bottom: 0.75rem;
  padding: 0.3rem 0.55rem;
  border: 1px solid color-mix(in srgb, var(--bg) 40%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--bg) 82%, transparent);
  color: var(--text);
  font-family: var(--font-mono);
  font-size: 0.7rem;
  opacity: 0;
  transform: translateY(0.35rem);
  transition:
    opacity 200ms ease,
    transform 200ms ease;
}

.image-modal__trigger:hover .image-modal__media,
.image-modal__trigger:focus-visible .image-modal__media {
  transform: translateY(-2px);
}

.image-modal__trigger:hover .image-modal__hint,
.image-modal__trigger:focus-visible .image-modal__hint {
  opacity: 1;
  transform: translateY(0);
}

.image-modal__trigger:focus-visible {
  outline: none;
}

.image-modal__trigger:focus-visible .image-modal__media {
  box-shadow:
    0 0 0 2px var(--bg),
    0 0 0 4px var(--accent);
}

.image-modal__caption {
  margin-top: 0.6rem;
  color: var(--text-2);
  font-size: 0.95rem;
  font-style: italic;
}

.image-modal__dialog {
  position: fixed;
  inset: 0;
  z-index: 40000;
  display: grid;
  place-items: center;
  padding: 1.5rem;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition:
    opacity 220ms ease,
    visibility 220ms ease;
}

.image-modal__dialog[data-open="true"] {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.image-modal__overlay {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgb(0 0 0 / 0.72);
  backdrop-filter: blur(10px);
}

.image-modal__sheet {
  position: relative;
  width: min(100%, 960px);
  max-height: calc(100vh - 3rem);
  display: grid;
  gap: 0.85rem;
  transform: translateY(1rem) scale(0.985);
  opacity: 0;
  transition:
    transform 260ms ease,
    opacity 260ms ease;
}

.image-modal__dialog[data-open="true"] .image-modal__sheet {
  transform: translateY(0) scale(1);
  opacity: 1;
}

.image-modal__content {
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-modal__content :is(img, picture) {
  display: block;
  width: auto;
  max-width: 100%;
  max-height: calc(100vh - 8rem);
  border-radius: 12px;
}

.image-modal__close {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  z-index: 1;
  border: 1px solid color-mix(in srgb, white 24%, transparent);
  border-radius: 999px;
  background: rgb(17 17 17 / 0.55);
  color: white;
  padding: 0.6rem;
}

.image-modal__meta {
  margin: 0;
  color: rgb(255 255 255 / 0.86);
  text-align: center;
}

@media (prefers-reduced-motion: reduce) {
  .image-modal__media,
  .image-modal__hint,
  .image-modal__dialog,
  .image-modal__sheet {
    transition: none;
  }
}
```

Keep the motion profile calm. Do not introduce springy or cinematic transitions.

- [ ] **Step 2: Verify the new visual behavior in the temporary page**

Manual runtime checks:

- hover/focus reveals a subtle affordance
- inline image lifts slightly, not dramatically
- modal now visibly fades/soft-rises
- caption remains secondary

Expected: the component matches the chosen editorial direction.

- [ ] **Step 3: Commit the styling and motion work**

```bash
git add src/components/ImageModal.astro
git commit -m "feat: add editorial ImageModal styling"
```

### Task 4: Rebuild the client script for robust dialog behavior

**Files:**

- Modify: `src/components/ImageModal.astro`

- [ ] **Step 1: Replace the existing initializer with per-instance guarded setup**

Use this script shape:

```html
<script is:inline>
  if (!window.__imageModalInit) {
    window.__imageModalInit = true;

    const lockScroll = () => {
      document.body.dataset.imageModalScrollLock = "true";
      document.body.style.overflow = "hidden";
    };

    const unlockScroll = () => {
      delete document.body.dataset.imageModalScrollLock;
      document.body.style.overflow = "";
    };

    const setupImageModal = (root) => {
      if (!(root instanceof HTMLElement) || root.dataset.imageModalBound === "true") return;

      const trigger = root.querySelector("[data-lightbox-trigger]");
      const dialog = root.querySelector("[data-lightbox-container]");
      const closeButton = root.querySelector("[data-lightbox-close]");
      const overlay = root.querySelector("[data-lightbox-overlay]");

      if (
        !(trigger instanceof HTMLButtonElement) ||
        !(dialog instanceof HTMLElement) ||
        !(closeButton instanceof HTMLButtonElement) ||
        !(overlay instanceof HTMLButtonElement)
      ) {
        return;
      }

      root.dataset.imageModalBound = "true";
      let lastFocused = null;

      const open = () => {
        lastFocused =
          document.activeElement instanceof HTMLElement ? document.activeElement : trigger;
        dialog.dataset.open = "true";
        dialog.removeAttribute("inert");
        dialog.setAttribute("aria-hidden", "false");
        lockScroll();
        closeButton.focus();
      };

      const close = () => {
        dialog.dataset.open = "false";
        dialog.setAttribute("inert", "");
        dialog.setAttribute("aria-hidden", "true");
        unlockScroll();
        lastFocused?.focus?.();
      };

      trigger.addEventListener("click", (event) => {
        event.preventDefault();
        open();
      });

      closeButton.addEventListener("click", close);
      overlay.addEventListener("click", close);

      dialog.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          close();
        }
      });
    };

    const init = () => {
      document.querySelectorAll("[data-image-lightbox]").forEach((figure) => {
        const dialog = figure.nextElementSibling;
        if (!(dialog instanceof HTMLElement) || !dialog.hasAttribute("data-lightbox-container"))
          return;

        const wrapper = document.createElement("div");
        wrapper.dataset.imageModalRoot = "true";
        figure.before(wrapper);
        wrapper.append(figure, dialog);
        setupImageModal(wrapper);
      });
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
      init();
    }
  }
</script>
```

Implementation note: if wrapping DOM nodes after render feels too invasive, instead add a static wrapper in Astro markup and scope all selectors through it. That is the preferred outcome.

- [ ] **Step 2: Improve the script to use a static wrapper instead of runtime DOM surgery**

Preferred final markup shape:

```astro
<div data-image-modal-root>
  <figure data-image-lightbox>…</figure>
  <div data-lightbox-container>…</div>
</div>
```

Then simplify the initializer to:

```js
document.querySelectorAll("[data-image-modal-root]").forEach((root) => {
  setupImageModal(root);
});
```

This keeps the script smaller and avoids moving nodes in the live DOM.

- [ ] **Step 3: Validate dialog behavior end-to-end in the browser**

Manual runtime checks on the temporary page:

- click trigger opens modal
- close button closes modal
- overlay click closes modal
- `Escape` closes modal
- focus lands on the close button when opened
- focus returns to the trigger when closed
- body scrolling is locked only while the modal is open
- repeated open/close cycles do not break behavior

Expected: all checks pass without console errors.

- [ ] **Step 4: Commit the accessibility and lifecycle script rewrite**

```bash
git add src/components/ImageModal.astro
git commit -m "feat: improve ImageModal dialog behavior"
```

### Task 5: Reconcile feed cleanup if selectors or structure changed

**Files:**

- Modify if needed: `src/lib/feed.ts`
- Reference: `src/components/ImageModal.astro`

- [ ] **Step 1: Compare the final component against the existing cleanup hooks**

These selectors must still work unless explicitly updated:

```ts
$("[data-image-lightbox]");
$figure.find("[data-lightbox-trigger]");
$("[data-lightbox-container]").remove();
```

Expected: if the final component still exposes these hooks, `src/lib/feed.ts` stays unchanged.

- [ ] **Step 2: If the hooks changed, update `removeLightboxDuplicates()` in one edit**

Target shape if the trigger gains an extra wrapper:

```ts
function removeLightboxDuplicates(html: string): string {
  const $ = load(html);
  $("[data-image-lightbox]").each((_, figure) => {
    const $figure = $(figure);
    const $trigger = $figure.find("[data-lightbox-trigger]").first();
    const imageHtml = $trigger.find("picture, img").first().prop("outerHTML");
    if (!imageHtml) {
      throw Error("Failed to extract lightbox image for feeds, has the layout changed?");
    }
    $trigger.replaceWith(imageHtml);
  });
  $("[data-lightbox-container]").remove();
  $("script").remove();
  return $.html();
}
```

Only make this change if the old `$button.html()` behavior no longer returns the correct inline image HTML.

- [ ] **Step 3: Validate the feed cleanup behavior with a small script or focused run**

Run a focused check that exercises `removeLightboxDuplicates()` against rendered HTML or a feed generation path.

Suggested command:

```bash
build-brief ./gradlew tasks
```

If Gradle is irrelevant here, use the project-appropriate HTML/feed validation command instead. The real goal is verifying no duplicate modal markup leaks into feed HTML.

Expected: feed HTML contains the inline image but not the modal container or script.

- [ ] **Step 4: Commit the feed compatibility fix if one was needed**

```bash
git add src/lib/feed.ts
git commit -m "fix: preserve feed cleanup for ImageModal"
```

Skip this commit if `src/lib/feed.ts` was unchanged.

### Task 6: Final validation and cleanup of temporary files

**Files:**

- Delete: `src/pages/image-modal-temp.astro`
- Modify: `src/components/ImageModal.astro`
- Modify if needed: `src/lib/feed.ts`

- [ ] **Step 1: Run the final manual validation pass on the temporary page**

Checklist:

- inline figure looks quiet in article flow
- hover/focus affordance is visible but subtle
- modal animation feels like the chosen soft-rise prototype
- close control is visible without feeling heavy
- keyboard flow is correct
- reduced-motion mode removes unnecessary transitions
- large/tall image sizing stays contained in the viewport

Expected: all acceptance criteria from the spec are satisfied.

- [ ] **Step 2: Remove the temporary validation page**

```bash
rm src/pages/image-modal-temp.astro
```

Expected: temporary file is gone before completion.

- [ ] **Step 3: Run one final project verification command**

Use the lightest command that exercises the Astro app and any relevant checks. Suggested order:

```bash
astro check
```

If `astro check` is unavailable, use the repo’s existing validation command instead.

Expected: command exits successfully with no new errors from `ImageModal` changes.

- [ ] **Step 4: Review the final diff before commit**

Run:

```bash
git diff -- src/components/ImageModal.astro src/components/Figure.astro src/lib/feed.ts
```

Expected: only the intended editorial lightbox changes remain.

- [ ] **Step 5: Commit the finished redesign**

```bash
git add src/components/ImageModal.astro src/components/Figure.astro src/lib/feed.ts
git commit -m "feat: redesign ImageModal"
```

- [ ] **Step 6: Optional follow-up doc if implementation details become non-obvious**

If the final implementation includes fragile constraints worth preserving, add a living feature note:

```md
# ImageModal

- Single-image editorial lightbox only; do not add gallery behavior casually.
- Feed cleanup depends on `data-image-lightbox`, `data-lightbox-trigger`, and `data-lightbox-container`.
- Motion should stay soft-rise, not cinematic.
- Focus must return to the trigger on close.
```

Suggested path: `slopdocs/features/image-modal.md`

## Self-review

- Spec coverage:
  - editorial inline figure: Task 2 + Task 3
  - soft-rise motion: Task 3
  - subtle chrome: Task 2 + Task 3
  - accessibility/focus/keyboard/scroll lock: Task 4
  - feed compatibility: Task 5
  - temporary runtime validation and cleanup: Task 2 + Task 6
- Placeholder scan:
  - no `TODO`/`TBD`
  - all touched files named explicitly
  - code blocks included for code-changing steps
- Type consistency:
  - marker attributes are consistent across markup, script, and feed cleanup tasks
  - `title`, `alt`, and `src` props are preserved through the whole plan
