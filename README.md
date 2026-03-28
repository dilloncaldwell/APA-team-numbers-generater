# APA Team Numbers Generator

A web tool for calculating valid 5-player team combinations under APA (American Poolplayers Association) rules.

## What it does

Enter your roster of players (skill levels 2-7 for 8-ball, or 1-9 for 9-ball) and the calculator shows all possible team combinations that meet APA requirements:

- Exactly 5 players per team
- Total skill level cannot exceed 23
- Maximum 2 high-ranked players (6-7 in 8-ball, 7-8-9 in 9-ball)

The app filters out duplicate combinations, so you only see unique team compositions.

## Features

The interface is designed for mobile use with a number pad for quick entry. It includes dark/light theme support using the Catppuccin color palette and respects your system preference by default.

Click any team result to copy the numbers to your clipboard.

## Usage

Open `index.html` in your browser or visit the live version at:
https://dilloncaldwell.github.io/apa-team-numbers-generator

1. Choose 8-ball or 9-ball format
2. Tap numbers to add players (5-8 players total)
3. Click Generate Teams
4. Review all valid combinations

## Local Development

No build process or dependencies required. Just open `index.html` in any modern browser.

For live reload during development, use any HTTP server:

```bash
python3 -m http.server 8000
```

## Deployment

Push to GitHub and enable Pages in repository settings. Select the main branch and root folder. The site will be live at `https://yourusername.github.io/apa-team-numbers-generator`

## Technical Notes

Built with vanilla HTML, CSS, and JavaScript. No frameworks or build tools. The combination algorithm runs entirely client-side. Theme preference is stored in localStorage.

Colors from [Catppuccin](https://github.com/catppuccin/catppuccin) (Latte for light mode, Mocha for dark mode).
