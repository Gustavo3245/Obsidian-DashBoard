<div align="center">
  <img src="Images/icon.svg" width="88" height="88" alt="Dynamic Dashboard logo">

  <h1>Dynamic Dashboard</h1>

  <p>Dynamic metrics and insights for your <a href="https://obsidian.md/">Obsidian</a> vault.</p>

  <p>
    <a href="https://github.com/Gustavo3245/Obsidian-DashBoard/stargazers"><img src="https://img.shields.io/github/stars/Gustavo3245/Obsidian-DashBoard?style=for-the-badge&label=Stars&color=8B5CF6" alt="GitHub stars"></a>
    <a href="https://github.com/Gustavo3245/Obsidian-DashBoard/issues"><img src="https://img.shields.io/github/issues/Gustavo3245/Obsidian-DashBoard?style=for-the-badge&label=Issues&color=EF476F" alt="GitHub issues"></a>
  </p>

  <p>
    <a href="https://github.com/Gustavo3245/Obsidian-DashBoard/releases"><img src="https://img.shields.io/github/downloads/Gustavo3245/Obsidian-DashBoard/total?style=for-the-badge&label=Downloads&color=EC4899" alt="GitHub downloads"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-0--BSD-5B6B8A?style=for-the-badge" alt="0-BSD license"></a>
  </p>

  <p><strong>See your vault at a glance.</strong> Track writing activity, file statistics, tags, recent changes, and more—directly inside Obsidian.</p>
</div>

## Preview

Dynamic Dashboard adapts its cards and insights to the available sidebar space.

<div align="center">
  <img src="Images/Screenshot from 2026-09-21 15-56-56.png" alt="Dynamic Dashboard with expanded insights in an Obsidian sidebar" width="900">
</div>

<table>
  <tr>
    <td align="center" width="50%"><strong>Expanded sidebar</strong><br><br><img src="Images/Screenshot from 2026-09-21 15-57-30.png" alt="Dynamic Dashboard in an expanded sidebar" width="360"></td>
    <td align="center" width="50%"><strong>Compact sidebar</strong><br><br><img src="Images/Screenshot from 2026-09-21 15-56-47.png" alt="Dynamic Dashboard in a compact sidebar" width="300"></td>
  </tr>
</table>

## Features

### Vault overview

- See total files, folders, vault size, words, characters, and average words per file.
- View useful derived ratios, such as words per file and files per folder.
- Estimate reading and speaking time from the current contents of your vault.

### Writing activity

- Follow your **daily average words** with a 30-day bar chart and comparison to the preceding 30 days.
- Visualize writing consistency with a responsive **Writing Streak** calendar.
- Track daily words, characters, sentences, sessions, and active time in the plugin's local data.

### Insights at a glance

- Explore file types and their relative share of the vault.
- Find the most-used tag, most-used frontmatter tag, least-used tag, and total unique tags.
- Review recent note activity, the most active folder, and recently modified notes.

### Vault rankings

- Identify the five folders with the most files.
- Find the five notes with the highest character count.
- Access focused Vault, Tag, and Recent Activity insight cards from the full dashboard.

### Adaptive dashboard

- Use a compact dashboard in the left sidebar or move it into the main workspace for the complete layout.
- Cards and charts adapt to the available space while preserving the information that matters most.

## Installation

> Dynamic Dashboard requires **Obsidian Desktop 1.6.6 or later**. Mobile is not supported.

### Community Plugins

Once Dynamic Dashboard is available in the Community Plugins directory:

1. Open **Settings → Community plugins** in Obsidian.
2. Turn off **Restricted mode**, if necessary.
3. Select **Browse**, search for **Dynamic Dashboard**, then choose **Install**.
4. Enable the plugin after installation.

### Manual installation

1. Download the latest release from the [Releases page](https://github.com/Gustavo3245/Obsidian-DashBoard/releases).
2. In your vault, create the folder `.obsidian/plugins/dynamic-dashboard/` if it does not already exist.
3. Copy `main.js`, `manifest.json`, and `styles.css` from the release into that folder.
4. Restart Obsidian, then enable **Dynamic Dashboard** under **Settings → Community plugins**.

## Privacy

Dynamic Dashboard is local-first by design.

- All metrics are calculated locally from the files and metadata already available in your vault.
- The plugin does not send note contents, file names, tags, usage data, or metrics to external servers.
- It has no account system, telemetry, analytics service, cloud sync, or external API dependency.
- Its saved dashboard state is stored only in Obsidian's local plugin data for your vault.

Your notes remain in your vault and under your control.
