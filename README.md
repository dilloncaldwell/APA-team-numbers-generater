# APA Team Numbers Generator

A web tool for calculating valid 5-player team combinations under APA (American Poolplayers Association) rules. You can then filter the results by selected skill levels.

## What it does

Enter your roster of players (skill levels 2-7 for 8-ball, or 1-9 for 9-ball) and the calculator shows all possible team combinations that meet APA requirements:

- Exactly 5 players per team
- Total skill level cannot exceed 23
- Maximum 2 high-ranked players (6-7 in 8-ball, 7-8-9 in 9-ball)

The app filters out duplicate combinations, so you only see unique team compositions. You can then filter the combinations by skill levels entered to narrow down matches.

The goal of the app is just to add a nice UI to finding out all avaliable combinations your team can play each night, with options to filter results. There is a copy to clipboard feature as well that will copy the found combinations to your clipboard.

### Example:
Your nineball team has these skill levels (2 3 3 4 4 5 6 7) there at league (can be less but needs to be at least 5) enter the number of players you have there, with those skill levels, the app finds 25 unique 5 player combinations respecting the rules. But lets say you plan on playing the 7 you can then filter results with a skill level 7, narrowing down results to 13 plays, if you also play a skill level 6 this narrows plays down to 5, if you then decide to play a skill level 4, this leaves you 3 plays left to choose from. 2,3 or 2,4 or 3,3 are the plays you have left. 


## Usage

Open `index.html` in your browser or visit the live version at:
https://dilloncaldwell.github.io/apa-team-numbers-generator

1. Choose 8-ball or 9-ball format
2. Tap numbers to add players (5-8 players total)
3. Click Generate Teams
4. Review all valid combinations
5. Can filter lists by skill levels inputed

## Local Development

No build process or dependencies required. Just open `index.html` in any modern browser.

For live reload during development, use any HTTP server:

```bash
python3 -m http.server 8000
```

## Technical Notes

Built with vanilla HTML, CSS, and JavaScript. No frameworks or build tools.
