# Farm Sim Status — Plan

A status board / reminder notebook for Farming Simulator 25. At the end of a session
I update everything; when I come back weeks or months later it reminds me where I am.

## Decisions (agreed 2026-11-03)
- **Viewed on:** 1440p desktop monitor only. No mobile layout.
- **Stack:** plain HTML/CSS/JS, no build step; small Node/Express backend.
- **Hosting:** Docker on REDDIRTSERVER (Unraid), LAN only, no login.
- **Port:** 8210, set via `PORT` in a server-only `.env`; commit `.env.example`.
- **Folders:** code in `/mnt/user/appdata/farm-sim-status-src`, data in
  `/mnt/user/appdata/farm-sim-status` mapped to `/data`.
- **Data:** one `farm.json` file in `/data`. No database.
- **Logging style:** cards are edited in place and always show current state, each with
  a "last updated" date. No session journal and no change history (maybe later).
- **Map name:** shown in the header, with an edit icon on hover that opens a text box.
  Default "Alma, Missouri".
- **Size:** starts small (fewer than 10 fields) but must grow as fields and animals are added.
- **Extras:** no ntfy or Stream Deck button in v1.

## Layout
- **Add menu:** one + button on the right of the header. It opens a list of what can be added;
  picking one switches to that tab and adds the new entry.
  Fields and Animals add a blank card; To-do, Future plan and Note put the cursor in that list's
  Add box.
- **Welcome back panel** at the top: the date of the last update, all unticked to-dos
  across the farm (urgent first), everything flagged "needs attention", and the notes.
- **Tabs** below it: Fields, Animals, To-Do & Plans, Notes.
- Fields and Animals tabs are **card grids**. Each card has a colour-coded
  "needs attention" badge.

## Field card
- Name / field number
- Crop type (dropdown of FS25 crops)
- Growth state (dropdown)
- Needs plowing, lime, weeding, fertilizer (toggles)
- Notes box
- To-dos (checklist with priority) and future plans
- Badges, one line per colour: red for a withered crop and for each unticked urgent to-do,
  shown by name side by side; amber for ready to harvest or any need; green if neither applies.

## Animal card
- Animal type and location
- Food status: good / not good; if not good, a "what they need" box
  (specifics per animal type to be supplied later)
- Notes box
- To-dos (checklist with priority) and future plans
- Badges, one line per colour: red for each unticked urgent to-do, shown by name side by side;
  amber for food not good, showing what they need; green if neither applies.
- Cards sort by animal type, then location.

## To-Do & Plans tab
- General to-dos: checklist items with priority (urgent / normal).
- Future plans: a list of ideas.
- Separate from field and animal items.

## Notes tab
- Short reminders to myself, such as "left a grain trailer at the silo". Not guides on how the
  game works.
- Each note is one line with its last edited date, plus an optional longer explanation.
- Newest first. Removing a note only asks first if it has details.

## Build order (each step tested on Unraid before the next)
1. Backend and JSON storage, Docker files, page shell (header with editable map name,
   tabs).
2. Fields tab.
3. Animals tab.
4. To-Do & Plans tab and Notes tab.
5. Welcome back summary.

## Later ideas
- More sections, animal-specific food needs, ntfy reminders, Stream Deck button.
