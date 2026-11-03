# Farm Sim Status

Status board and reminder notebook for Farming Simulator 25. See [README.md](README.md) for what it
does and how to install, update and back it up.

## Stack and layout
- No build step. Express backend, plain HTML/CSS/JS frontend.
- `server.js`: JSON store and API. Exports `app`, and only listens when run directly, so tests can
  start it themselves.
- `public/`: classic scripts that share one global scope, so top-level names must be unique across
  files. Load order is set in `index.html`, and `app.js` loads last and starts the page.
  - `app.js`: saving, shared building blocks, tabs, add menu, map name, startup.
  - `fields.js`, `animals.js`, `todos.js`, `notes.js`: one tab each.
  - `welcome.js`: Welcome back panel.
- `test/smoke.test.js`: API and storage tests. Nothing tests the frontend behaviour.

## Data flow
- The page keeps a working copy in `farm`, and edits change it directly.
- `scheduleSave()` waits for a 500ms pause, then sends the whole farm with `PUT /api/farm`. Only one
  save runs at a time.
- The server checks only the top-level shape (a non-empty `mapName` and the five lists), stamps
  `lastUpdated`, and writes `farm.json` atomically. It doesn't look inside list items.
- There's no merging, so a stale second tab overwrites newer edits.
- `PORT` in `.env` changes only the host side of the port mapping. The container always listens on 8210.

## `farm.json` shape
```js
{
  mapName, lastUpdated, // ISO date, or null before the first save
  fields:  [{ name, crop, growth, plow, lime, weed, fertilize, notes, todos, plans, updatedAt }],
  animals: [{ type, location, food /* 'good' | 'bad' */, foodNeeds, notes, todos, plans, updatedAt }],
  todos:   [{ text, priority /* 'urgent' | 'normal' */, done }], // also the shape of a card's todos
  plans:   [{ text }],                                           // also the shape of a card's plans
  notes:   [{ text, details, updatedAt }],
}
```

## Conventions to keep
- Build elements with `el()`.
- Edits update the page in place instead of rebuilding a card, so the box being typed in keeps its focus.
- Every edit goes through `scheduleSave()`, which also refreshes the Welcome back panel.
- Cards re-sort only on page load, so they can't jump mid-edit. Fields sort by name (numeric, so
  "Field 2" comes before "Field 10"); animals sort by type, then location.
- Reuse `todoSection()` and `planSection()` for anything with `.todos` or `.plans`. The farm itself has
  both lists, which is how the To-Do & Plans tab works.
- When a saved shape changes, migrate old data on load, as `upgradeField()` does.
- `fieldFlags()` and `animalFlags()` are shared by the card badges and the Welcome back panel, so add new
  flags there.
- Add a smoke test when the saved data or API changes.

## Product rules
**Overall**
- 1440p desktop only. No mobile layout.
- Cards are edited in place and always show the current state, with a "last updated" date. No session
  journal or change history.
- Must keep working as fields and animals are added. It starts with fewer than 10 fields.
- No ntfy or Stream Deck button in v1.

**Header**
- The map name defaults to "Alma, Missouri". An edit icon appears on hover and opens a text box.
- There's one + button. Fields and Animals add a blank card; To-do, Future plan and Note put the cursor
  in that list's Add box.

**Badges**, one line per colour:
- **Fields:** red for a withered crop and for each unticked urgent to-do, shown by name side by side.
  Amber for ready to harvest or any need. Green if neither applies.
- **Animals:** red for each unticked urgent to-do, shown by name side by side. Amber for food not good,
  showing what they need. Green if neither applies.

**Welcome back panel**
- Read-only. Clicking an item opens its tab, then scrolls to and highlights its card or note.
- Three columns (To-dos, Needs attention, Notes), each scrolling past about 320px.
- Each item shows where it's from. Urgent to-dos appear only under To-dos, and future plans stay out.
- Updates live as you edit, so the date changes to today after the first edit.
- Can be collapsed, but always reopens on page load so it can't be missed on coming back.

**Lists and notes**
- To-dos have a priority (urgent or normal). Unticked items come first, most urgent at the top.
- General to-dos and plans are separate from field and animal items.
- Notes are short personal reminders, not guides on how the game works. Newest first, and each shows
  its last edited date.
- Deleting a note only asks first if it has details. A note with details always shows them.
- The animal "What they need" box only hides, so its text returns if food goes back to not good.
  Specifics per animal type are still to be supplied.

## Running tests
`npm test` runs `node --test` against a temporary data folder. The source folder has no `node_modules`,
so copy the project to a local folder and run `npm ci` there first.

## Viewing the page
Use the same local copy, then take 2560x1440 screenshots with playwright-core using `channel: 'chrome'`.
Edge isn't at the path Playwright expects.
