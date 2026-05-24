Original prompt: Generate a cookie-clicker clone using the Obsidian Winds logo as the big cookie. We can figure out what all the other parts of the game will be called but for now let's focus on building the game itself.

Notes:
- Implemented the first playable static Obsidian Clicker scaffold with vanilla HTML/CSS/JS.
- Uses `assets/obsidian-winds-logo.png` as the main clickable logo.
- Includes click income, passive generators, upgrade unlocks, floating click feedback, save/reset, event log, responsive layout, and test hooks.
- First Playwright smoke run confirmed the logo renders, clicking increases Shards, state JSON is emitted, and no console errors were produced.
- Tuned the logo focus style after screenshot review so mouse clicks do not leave a distracting default browser focus ring.
- Deeper Playwright scenario found store buttons detaching during rapid renders; generator and upgrade rendering now keeps button DOM nodes stable while updating their labels and disabled states.
- Final screenshot review led to a subtler logo focus glow instead of a large circular outline.
- Full verification passed for click income, generator purchase, passive income via `advanceTime`, upgrade purchase, save, reset, desktop screenshot, mobile screenshot, and console-error checks.

TODO:
- Optional future pass: replace temporary generator and upgrade names with final Obsidian Winds lore.
