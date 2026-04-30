# Tutorial Authoring Standard

This document defines the expected pattern for textbook-style lab tutorials.

## Canonical Reference

Use `src/content/lab/2026-04-27-dodge-tutorial.mdx` as the reference tutorial.

Use `src/components/dodge-tutorial/TutorialChapter.astro` as the canonical chapter layout unless the user explicitly asks for a different layout. Do not invent a custom tutorial layout just because the topic is different.

## Required Chapter Structure

Each tutorial chapter should include:

- A clear topic title that names the concept being taught.
- Text that explains the concept at a beginner-friendly level without skipping the why.
- A live embedded result in the chapter's `canvas` slot.
- A Sandpack checkpoint in the `playground` slot when code is being taught.
- A short `Checkpoint:` paragraph that states what the reader should understand before continuing.

The tutorial should feel like a textbook. Do not rely on final-code dumps or high-level summaries. If a new variable, algorithm, API, transform, animation, state transition, or lifecycle rule appears in code, the surrounding text should explain why it exists.

## Layout Rules

Use the same slot structure as Dodge:

```astro
<TutorialChapter title="1. Chapter Title">
  <div slot="text">
    ...
  </div>

  <div slot="canvas" class="w-full h-full">
    <PreviewComponent client:load />
  </div>

  <div slot="playground">
    <SandpackPlayground client:load files={{ ... }} />
  </div>
</TutorialChapter>
```

The `canvas` slot wrapper must include `class="w-full h-full"`. Without it, React islands using `w-full h-full` may size against an anonymous MDX wrapper instead of the sticky preview frame.

The page route should treat tutorial posts like the Dodge tutorial: wide article body, full-width chapter sections, and no unrelated breakout demo inserted above the text unless the tutorial explicitly needs it.

## Embedded Result Rules

The embedded result is not a screenshot and not a decorative preview. It is a teaching surface.

- The result must directly show the concept currently being explained.
- The result must fill the visible preview frame in a way comparable to the Dodge tutorial.
- For Canvas, draw into the full preview canvas unless there is a teaching reason not to.
- For SVG, choose a tutorial-specific `viewBox` camera. Do not blindly reuse a production artwork coordinate system if it makes the taught object tiny.
- If the production interaction uses a large coordinate system, add a preview camera/crop/scale that makes the current concept legible.
- Make embedded results responsive. Test the wrapper, the React root, and the SVG/canvas itself; do not only resize the outer card.
- If a preview has controls, the controls should help the reader inspect the concept, such as scrubbing recursion levels or replaying a transition.

## Sandpack Rules

Sandpack examples should be relevant to the chapter, not just final-state code.

- Keep each example focused on the current concept.
- Include the code that the surrounding text discusses.
- Avoid introducing unexplained concepts in the Sandpack code.
- If the site's built HTML validator checks for literal `className=`, remember that serialized Sandpack source appears in built HTML. Use JSX-valid spacing like `className = "..."` inside embedded source strings if needed.
- Set a preview/editor size that makes both code and result usable.

## Review Checklist

Before finishing a tutorial task:

- Compare the layout against the Dodge tutorial.
- Confirm every chapter has text, live result, Sandpack checkpoint, and a `Checkpoint:` statement.
- Inspect the DOM around each `canvas` slot and verify the preview island fills the sticky frame.
- Verify SVG/canvas content is visually large enough inside the frame, not just that the outer frame is large.
- Check that text flow introduces concepts before code depends on them.
- Run `npm run check`.
- If browser layout behavior was changed, manually inspect or reason from the generated DOM because static validation will not catch visual sizing mistakes.
