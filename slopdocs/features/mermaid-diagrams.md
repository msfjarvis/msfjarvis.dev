# Mermaid diagrams

Decision: support Mermaid authoring via fenced `mermaid` code blocks in markdown/MDX and render them at build time to static SVG. Broken diagrams fail the build.

## Why

- Author wants content like:

  ````md
  ```mermaid
  sequenceDiagram
      Alice->>John: Hello John, how are you?
      John-->>Alice: Great!
      Alice-)John: See you later!
  ```
  ````

  ```

  ```

- No client-side Mermaid runtime wanted.
- Build should catch invalid Mermaid syntax immediately.
- Existing site already renders content through Astro content + MDX, so markdown pipeline integration is the natural hook point.

## Chosen approach

Use a local remark plugin in the Astro/MDX pipeline.

- Detect fenced code blocks where `lang === "mermaid"`.
- Render the block source to SVG during build using Mermaid in a server/build context.
- Replace the original code block AST node with HTML containing the generated SVG.
- Throw on render/parse errors so `astro build` fails.

## Architecture

Suggested split:

- `src/remark/remark-mermaid.ts`
  - AST traversal
  - detect Mermaid code fences
  - call renderer helper
  - replace node with raw HTML/SVG
- `src/lib/render-mermaid.ts`
  - own Mermaid initialization/config for build-time use
  - render source string to SVG
  - normalize returned markup if Mermaid wraps output strangely
- `astro.config.mjs`
  - register the remark plugin so content/posts, weeknotes, and other markdown/MDX routes pick it up

## Data flow

1. Author writes fenced Mermaid block in markdown/MDX.
2. Astro content rendering invokes the remark plugin.
3. Plugin finds `mermaid` fence and passes its contents to the renderer helper.
4. Helper renders SVG.
5. Plugin replaces the code block with SVG markup.
6. Invalid Mermaid source throws and aborts build.

## Scope / non-goals

In scope:

- Markdown/MDX fenced blocks named `mermaid`
- Static SVG output in rendered pages
- Build failure on invalid diagrams

Out of scope for first pass:

- Client-side interactive Mermaid rendering
- Fallback UI for broken diagrams
- Alternate authoring syntaxes like custom `<Mermaid />` components
- Diagram theming controls unless Mermaid defaults look obviously wrong

## Error handling

- Mermaid parse/render errors should include enough file/block context to identify the bad content.
- Errors are not swallowed; they fail the build.
- Non-Mermaid fences are untouched.

## Verification

Primary verification should exercise the real Astro content pipeline, not string-based fake tests.

- Add a temporary markdown/MDX file with a valid Mermaid fence.
- Run site build.
- Confirm output contains rendered SVG and build succeeds.
- Remove the temporary validation file unless a real content example is intentionally kept.

Optional extra verification:

- Add a small test around the renderer helper if it pays for itself, but real build-path verification is the main proof.

## Alternatives considered

1. Remark plugin (chosen)
   - Best match for markdown fence input.
   - Cleanest place to convert code fences before HTML output.
2. Rehype plugin
   - Possible, but later than necessary in the pipeline.
   - Less direct for code-fence-driven authoring.
3. Custom component syntax
   - Technically straightforward but rejected because author explicitly wants fenced code blocks.

## Constraints from current repo

- Site uses Astro 6 + `@astrojs/mdx`.
- Content collections load `**/index.{md,mdx}` from `src/content/{posts,notes,weeknotes}`.
- MDX pages also exist under `src/pages/` and should benefit automatically if the plugin is registered globally in the markdown/MDX pipeline.
- There is no existing Mermaid integration in the repo.

## Implementation notes

- Uses `mermaid@11.15.0` and `unist-util-visit@5.1.0`.
- Build-time rendering works by creating a JSDOM window, then requiring Mermaid only after that DOM exists. Importing Mermaid too early caused server-side failures around DOMPurify/window access.
- Mermaid rendering in JSDOM also needed lightweight SVG text measurement shims (`getBBox`, `getComputedTextLength`) for this build environment.
- Plugin is registered through Astro `markdown.remarkPlugins`; in Astro 6 this works for the current markdown/MDX content pipeline, but Astro prints a deprecation warning recommending migration to `@astrojs/markdown-remark` `unified({...})` config later.
- Real validation happened through existing content: `src/content/posts/rewriting-claw-html-parser-for-over-the-air-updates/index.mdx` already had a Mermaid fence. `pnpm run build:drafts` produced inline SVG in `dist/client/posts/rewriting-claw-html-parser-for-over-the-air-updates/index.html`.
- Invalid Mermaid fences still throw from the remark plugin with file-path context.
