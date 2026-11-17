# Make your own version

Everything you need to edit is in `dist/`. Work on a fork or a copy, run `npm run dev` from the repository root, and refresh the browser after each change. You do not need to rebuild anything.

## 1. Choose how to replace the characters

There are two approaches:

- **A personal picture or one drawing per character:** use the cutout method below. The picture moves, jumps, and flips direction; it does not become a new running animation automatically.
- **Animated characters:** provide multiple poses and use the sprite-sheet instructions in section 3.

Use images you have permission to share. For a public version, fictional characters or pseudonyms are a useful default. A public repository also makes its image files and past commits downloadable.

## 2. Use personal pictures or simple cutouts

Prepare two PNG files with transparent backgrounds, ideally full-body, facing right, with little empty space around them. Crop close to the feet. A rectangular photograph also works, but its background will remain visible in the game.

Save them as:

```text
dist/my-character.png
dist/my-companion.png
```

Near the top of `dist/game.js`, change these two existing image sources:

```js
const pepeSprite = new Image();
pepeSprite.src = 'my-character.png';
// Keep the existing pepeRunCycle declaration for now.
const pinkSprite = new Image();
pinkSprite.src = 'my-companion.png';
```

Edit the existing declarations in place; do not add duplicates. Leave `pinkRunSprite` and `pinkFrames` in place for now as well.

Next, find the complete `drawPepe(...)` and `drawPinkFrame(...)` functions. Replace those two functions with this block, inside the game's existing wrapper. Keep `drawPinkPepe` and `drawPinkPepeRunning` unchanged.

```js
function drawPersonalCutout(image, x, y, scale, facing, height) {
  if (!image.complete || !image.naturalWidth) return;
  const width = height * image.naturalWidth / image.naturalHeight;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale * facing, scale);
  // The anchor is bottom-center: the picture's feet sit on the platform.
  ctx.drawImage(image, -width / 2, -height, width, height);
  ctx.restore();
}

function drawPepe(x, y, s = 1, facing = 1, walk = 0,
                  air = false, holding = false, running = false) {
  drawPersonalCutout(pepeSprite, x, y, s, facing, 96);
  if (holding) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s * facing, s);
    ctx.translate(35, -55);
    ctx.rotate(.15);
    tulip(0, 0, .68);
    ctx.restore();
  }
}

function drawPinkFrame(x, y, s, index, facing = 1, breathe = 0) {
  drawPersonalCutout(pinkSprite, x, y, s, facing, 128);
}
```

The heights match the existing drawing sizes. The caller applies an additional scale. This changes the art, not collision boxes, speed, or jumping. If the feet float, remove transparent padding below them before changing the physics.

**Update the menus too:** in `dist/index.html`, replace the three image references to `pepe-run.png` with `my-character.png` (the character picker and two invitation portraits). Update their `alt` text. Replace the companion's portrait span:

```html
<span class="pink-pepe-portrait" aria-hidden="true"></span>
```

with:

```html
<img src="my-companion.png" alt="">
```

The existing character picker image styles will size it. The old `.pink-pepe-portrait` background rules can then be removed from `dist/style.css`.

The existing running-frame assertions in `scripts/check.mjs` intentionally expect four animated poses. If you switch to cutouts, adapt those rendering assertions and asset filenames to your new format; keep the movement, checkpoint, and progression checks.

## 3. Keep full running animations

Use consistent character proportions and a common feet baseline across all poses. These are the current source layouts, not general sprite-sheet requirements:

| File | Current layout and cropping |
| --- | --- |
| `pepe-run.png` | 1261 × 1247 image; `drawPepe` crops from x=84, y=118, width=1094, height=1068 |
| `pepe-run-cycle.png` | 2172 × 724; four equal-width cells. `drawPepe` takes the middle 78% of each cell's height, starting 11% down |
| `pink-pepe-sheet.png` | 2172 × 724; one idle pose, then four running poses, with custom horizontal bounds |

For the companion, `pinkFrames` contains `[sourceX, sourceWidth]` pairs:

```js
const pinkFrames = [[60,292], [411,446], [902,352], [1270,452], [1800,314]];
```

`drawPinkFrame` uses source y=65 and source height=591 for every frame. If your sheet has different bounds, change both the pairs and the common vertical crop. If you change that height, also change the `sw / 591` aspect-ratio calculation.

The simplest animated swap uses the existing filenames, dimensions, cropping, and pose order. Otherwise update the image sources and drawing calculations. The companion's menu portrait is separately cropped in the `.pink-pepe-portrait` CSS rules, including their responsive overrides. Either update those coordinates or replace the span with a separate idle-image `<img>` as above.

## 4. Change names, dialogue, and the story

There is no central name setting yet. Visible text is in both `dist/index.html` and `dist/game.js`.

| What to change | Where to look |
| --- | --- |
| Game title and motto | HTML `<title>`, description and Open Graph metadata, `.brand`, `#title`, `.intro-description` |
| Character names in menus | HTML buttons `#choose-pepe`, `#choose-pink-pepe`; header `.dedication`; captions in JS `selectCharacter` and `startEndless` |
| Name above the companion | JS `drawHerNameplate`; also search for the sign text `TO HER` |
| Approaching-someone narration | JS `storyBeats` array |
| Love and loneliness quotes | JS `loveQuotes` array: text, author, source, level, and trigger position `x` |
| Invitation and date options | HTML `#letter-overlay`; response messages in the JS `replies` object |
| Diner name | Search HTML and JS for `CUPID` |
| Cabin's final line | HTML `#cabin-thought` |
| Other labels and descriptions | HTML footer, image `alt` text, `aria-label` attributes, and JS HUD text |

For example, change the text inside `<strong>Pink Pepe</strong>` to your companion's nickname and change the string `'HER'` inside `drawHerNameplate` to the same nickname. Keep names short enough to fit; adjust that nameplate's drawing width if needed.

Search for `Pepe`, `PEPE`, `Pink Pepe`, `HER`, and `her` and review each result. **Do not globally replace `her`**: it is also part of unrelated words and code. Keep internal identifiers such as `drawPepe`, `choose-pink-pepe`, and the character value `'pink-pepe'` unless you update all their callers too. Visible labels can change independently.

Story beats and quotations share one display area so they do not overlap. Quote positions are also scaled to the longer routes near the end of the `loveQuotes` definition. Check that scaling before moving triggers. Keep author/source credits accurate when substituting real quotations.

## 5. Replace the music

All five audio files are included. The current mapping is:

| File in `dist/` | When it plays |
| --- | --- |
| `good-or-dont-be.m4a` | Main menu |
| `rooftop-hops.mp3` | City, city Endless, and the invitation |
| `lush-date-adventure.mp3` | Garden, garden Endless, and diner |
| `jungle-theme.mp3` | Jungle, jungle Endless, and cabin |
| `jungle-intro.mp3` | One-shot transition effect at the beginning of the jungle |

The easiest swap is to export your replacement in the **same actual format** and overwrite the corresponding file. Renaming an MP3 to `.m4a` does not convert it. Music loops; the transition effect does not.

If you prefer different filenames or formats, update:

1. The relevant `<audio>` sources near the bottom of `dist/index.html`.
2. The `themeAudio` and `jungleAudio` preload sources near the bottom of `dist/game.js`.
3. The `trackFile` selection and filename comparisons inside `audioWake`.
4. Matching file assertions in `scripts/check.mjs`, plus any visible soundtrack labels and the asset notes.

Use short, web-friendly filenames and reasonably compressed files. Test each level from Level Select, all three Endless worlds, and the menu. Audio usually needs a player gesture: press a game button or the sound control. Test on the phone browser you intend to support as well.

## 6. Change the cover and style

Replace `dist/cover.png` with your own cover. The current image is 1122 × 1402. Keep the main subject away from the extreme edges: the title screen fills the available area and crops differently on portrait phones and desktop screens.

The cover reference and its alternative description are in `dist/index.html`. Title artwork, overlays, menus, quote cards, and responsive layouts are in `dist/style.css`. Preserve the embedded font's license notice if you keep that font.

## 7. Check your version

```sh
npm run check
npm run dev
```

Update assertions that deliberately check the text, filenames, or sprite layout you changed. Do not remove failing gameplay checks merely to get a passing result.

Play each chapter through Level Select, then verify the Story invitation and diner transition. Check both difficulties, both Endless characters, touch buttons, music, and the final line. The automated checks mock the browser and cannot judge whether a sprite looks right or a recording is audible.

Before publishing personal pictures, names, or recordings, check filenames, image metadata, audio title/artist tags, embedded lyrics, and embedded cover art. Remove old files you no longer want to share. Deleting a file in a later commit does not remove it from earlier public commits.

## 8. Publish your version

Deploy `dist/` as a static site. If a host asks for a build output directory, use `dist`; there is no build command. If it accepts a ZIP upload, zip the **contents** of `dist/`, so `index.html` is at the archive root. Keep all audio and image files alongside it.

For a **Cloudflare Pages direct-upload** project, upload that folder or ZIP, using a new deployment for later updates. Official instructions: [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/).

For **GitHub Pages**, publish the contents of `dist/` through a Pages deployment workflow or a separate publishing branch; the current source repository's root is not the playable site root. Official instructions: [Configure a publishing source](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

When updating a hosted version, change the `?v=...` suffixes on the CSS, script, and cover references in `dist/index.html`. For replaced audio or sprites, use new filenames and update their references if old cached copies persist.

Publish the game files only. Local credentials, private reference photos, deployment scripts, and environment files do not belong in a public repository or upload.
