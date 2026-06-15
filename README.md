# SportsDoku

A Pokedoku-style daily sports trivia grid game for **NBA, NFL, MLB, NHL, and Soccer**.

## How to Play

- A 3×3 grid is presented with row and column criteria (teams, awards, countries, positions).
- Click a cell and type a player's name who satisfies **both** that row's and column's criteria.
- You have **9 total guesses** — one per cell. Wrong answers still use a guess.
- Each player can only be used **once** across all 9 cells.
- Fill all 9 cells correctly to win!

## Setup & Run

```bash
cd sportsdoku
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Build for Production

```bash
npm run build
npm run preview
```

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS

## Features

- 5 sports: NBA, NFL, MLB, NHL, Soccer
- Daily puzzle seeded by date (same for all players)
- Autocomplete player search with live filtering
- Save/restore progress via localStorage
- Share results (clipboard copy)
- Puzzle answer key shown on game over
- 150+ players across all sports with accurate historical data
