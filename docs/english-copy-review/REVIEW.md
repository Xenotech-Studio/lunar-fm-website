# English-only editorial revision

The public site now uses English throughout: chapter headings, decks, body copy, navigation, HUD, captions, scientific disclosures, loading and failure states, accessible names, document title and share metadata. The old text is retained only in the [comparison record](COPY-COMPARISON.md), not the built website.

## Narrative

1. **SEE IT CLOSER.** Orbital maps lead into sub-metre source imagery.
2. **RIDGE BY RIDGE.** The survey pauses over terrain that retains overlapping marks.
3. **EARTH ABOVE.** Source pixel size and elevation post spacing accompany the close view.
4. **SUNLESS GROUND.** Permanent shadow introduces an unanswered question, not an ice claim.
5. **MORE THAN AN IMAGE.** The foundation model brings different observations together.
6. **THE NEXT FOOTPRINT.** Learning the ground leads toward future human exploration: “First, we learn the ground. One day, new crews will walk these ridges.”

The site does not describe the source-data resolution as model accuracy. The sources panel distinguishes data from presentation: resampling, level of detail, mobile downsampling, virtual altitude, artistic Earth placement, procedural rocks, simulated polar relief and illustrative scan guides. It states explicitly that no model inference runs on the site.

## Layout

The six-chapter structure, anchors, camera paths, click timing, imagery, terrain and shaders are unchanged. The only scene-file edit translates the canvas fallback message. English uses tighter tracking and bounded lines; HUD labels wrap within their columns. The former `chinese-title` class is now `chapter-deck`.

The first responsive check found the survey disclosure extending below the navigation boundary at 375×667. Short-screen survey and polar text now starts earlier, with smaller gaps. The complete English disclosure remains present. A full-size finale frame also revealed the desktop deck touching the Moon’s lower edge; its spacing was increased and checked again at both desktop heights. Automated bounds checks pass at 1200×800, 1280×720, 390×844 and 375×667.

## Browser review

Screenshots use real Chrome with SwiftShader on an isolated preview at port 4427. Test preview uses port 4428. User development servers are not touched.

Desktop review samples 38 story positions from 0% to 100%, including every chapter's entrance, full text and exit, with denser samples during the descent. File names are story percentages, not native page-scroll percentages. PNGs preserve the actual rendered frame; contact sheets aid sequential inspection.

## Reproduction

```sh
npm run build
LUNAR_TEST_PORT=4428 npm test
npm run preview -- --port 4427 --strictPort
REVIEW_MODE=story REVIEW_POINTS=0,10,18,20,24,28,30,33,34.5,36.5,38,39,40,41,42,44,45.5,47,50,53.5,56,59,62,65,68,70.5,72.5,75.5,78,80,82,84,88,92,94,96,98,100 LUNAR_REVIEW_URL=http://127.0.0.1:4427 node scripts/review-scroll.mjs docs/english-copy-review/desktop 1
```

The English-copy test uses a static renderer to isolate typography and checks the full DOM, hidden text, accessible labels and metadata for Han characters. The existing journey tests and screenshot review exercise live WebGL.

Short-phone review runs in reverse at 375×667 through 21 story positions, from the finale back to orbit. Desktop and phone frames were inspected sequentially, with full-size checks of the landing, polar map and finale. The text retains its margins through entry and exit; measured terrain, Earth and the PSR layer remain visible.

The short-phone surface frame exposed a caption/counter overlap. The surface readout, eye-height caption and artistic disclosure were moved up together only at short phone heights. The layout test now includes all three elements. Four affected frames were recaptured and replaced in the final sequence. The desktop finale was likewise recaptured after its spacing adjustment. Sources-panel top and bottom were checked at desktop and phone sizes.

The production HTML, JavaScript, CSS and JSON were also scanned for Han characters; none were found. Historical Chinese copy appears only in the comparison document, which is not part of the production build.

## Final evidence

- 38 desktop frames, 21 short-phone frames and 4 sources-panel frames: 63 PNGs total. All affected spacing revisions were recaptured.
- [Frame viewer](index.html) · [Complete old/new copy table](COPY-COMPARISON.md)
- [Opening](desktop/0.png) · [Survey](desktop/34.5.png) · [Surface](desktop/53.5.png) · [PSR](desktop/72.5.png) · [Model](desktop/84.png) · [Future](desktop/100.png)
- [Short-phone surface](mobile-reverse/53.5.png) · [Short-phone finale](mobile-reverse/100.png)
- Chrome capture sequences recorded no page or console errors.

## Validation result

- `npm run build`: passed ([log](build.log)).
- `LUNAR_TEST_PORT=4428 npm test`: all 14 tests passed in 7.6 minutes ([log](tests.log)).
- English-only metadata, full DOM, accessible names and four viewport bounds passed.
- Only copy, typography, copy-related assertions and this review are included in the commit. `yarn.lock` remains untracked and untouched.
- Own capture preview on 4427 was stopped through its process session. Playwright test previews exited with their test runs. No user development server was stopped.
