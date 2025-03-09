+++
categories = ["journaling"]
date = 2025-03-09T15:59:00+05:30
lastmod = 2025-03-09T15:59:00+05:30
summary = "Logseq's clunky apps and glacial development pace finally motivated me to migrate my journaling to Obsidian, here's how I did it."
slug = "migrating-from-logseq-to-obsidian"
tags = ["logseq", "obsidian", "notes"]
title = "Migrating from Logseq to Obsidian"
+++

I have been using [Logseq](https://logseq.com) for just over [a year](https://androiddev.social/@msfjarvis/112378523734491769) to maintain a daily journal, but I've been eyeing Obsidian for the last couple months as my note-keeping needs have expanded past daily journaling.

Logseq has had a long-standing problem with [the version of Electron used by it](https://github.com/logseq/logseq/issues/11644) being EOL, which finally prompted its removal from [Nixpkgs](https://github.com/NixOS/nixpkgs) on security grounds this week and accelerating my migration to Obsidian. The below is a short list of things I did to make Obsidian more comfortable as a daily journaling system.

## Moving over content

I made the following changes to the files in my Logseq graph when moving to the new Obsidian Vault

- `assets` and `pages` got copied over as-is
- The `journals` folder got renamed to `Daily` since I wanna do notes for longer durations as well, and all the files inside renamed to replace underscores with hyphens since it looked like that was more common in Obsidian.

## Plugins

I enabled the following core plugins:

- **Daily Notes**: Automates creation of daily notes
- **Templates**: Allows you to create reusable templates
- **Backlinks**: Shows references to the current note

Looking around other people's experience with this migration path I also found the following community plugins:

- **Periodic Notes**: Enhanced daily/weekly/monthly notes
- **Natural Language Dates**: Type dates like "tomorrow" or "next Monday"
- **Tasks**: Advanced task management
- **Dataview**: Query and display info from your notes
- **Templater**: More powerful templating than the core plugin
- **Git**: Self-managed sync for vaults

> Side note: I greatly appreciate the fact that Obsidian defaults to vendoring plugins in the Vault itself so if you're tracking the `.obsidian` folder in Git, you get a fully reproducible Vault regardless of what machine you open it on.

## Configuration changes

In Settings → Daily Notes:

- **Date format**: `YYYY-MM-DD`
- **New file location**: `Daily/`
- **Open daily note on startup**: `Enabled`

In Settings → Hotkeys:

- Open today's daily note: `Alt+D`
- Create new note: `Ctrl+N`
- Toggle edit/preview mode: `Ctrl+E`
- Search in all notes: `Ctrl+Shift+F`

# Pending changes

What I've done so far is just the result of 30 minutes of looking around, and there is still a bunch of currently broken stuff that needs resolving.

- I used internal links of `[[this format]]` pretty liberally in my Logseq graph as a tag system, which will need migration to Obsidian's tags mechanism.

- Some of my pages refer to daily journal pages using a humanized date variant which Logseq automatically converted to proper links, which does not work in Obsidian.

Despite these issues, I think the move to Obsidian will end up being a net positive to my note taking process. Please let me know on [Mastodon](https://androiddev.social/@msfjarvis) or the comments here if you have any tips to improve things.
