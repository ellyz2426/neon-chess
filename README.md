# Neon Chess VR

A complete chess game with AI opponents in a holographic VR arena, built with IWSDK.

**[Play Now](https://ellyz2426.github.io/neon-chess/)**

## Features

### Chess Engine
- Full chess rules: legal move generation, check/checkmate/stalemate detection
- En passant, castling (kingside and queenside), pawn promotion with piece selection
- Draw detection: 50-move rule, threefold repetition, insufficient material
- AI opponent with minimax search and alpha-beta pruning (depths 0-4)
- Piece-square tables for positional evaluation
- Move ordering for search efficiency

### Game Modes
- **VS AI** - Play against the computer with 4 difficulty levels (Easy/Medium/Hard/Expert)
- **Local 2P** - Play against a friend on the same device
- **Timed (5min)** - Standard timed game
- **Blitz (2min)** - Fast-paced blitz chess
- **Daily Puzzle** - New challenge each day
- **Practice** - Random AI moves for learning

### Visual Design
- 3D neon wireframe chess pieces (6 types x 2 colors)
- 5 board themes: Neon Holodeck, Crimson Arena, Toxic Neon, Ultra Violet, Solar Blaze
- 8 unlockable piece skins with progression-based conditions
- Holodeck-style environment with animated floating decorations
- Particle effects for captures, promotions, and victories
- Check highlight with pulsing glow on the king
- Last-move highlighting
- Captured pieces display trays
- Material advantage indicator in HUD

### Audio
- Procedural audio for all game events: moves, captures, checks, checkmate, castling, promotion
- Ambient drone soundtrack with LFO modulation
- Volume controls for master, SFX, and music

### UI & Controls
- 16 PanelUI spatial panels (zero HTML DOM overlays)
- Head-locked HUD with turn indicator, timer, material balance
- Move history panel
- Achievement tracking (30 achievements)
- XP/Level progression system with chess titles (Novice to Immortal)
- Leaderboard with top 20 scores
- Full keyboard shortcuts: Esc/P (pause), U (undo), H (hint), R (restart)
- XR controller support with B button for pause
- Mouse raycasting for board interaction

### XR Support
- Full VR/XR support with head-tracked panels
- XR controller laser pointer interaction
- Spatial panels positioned for comfortable viewing
- Browser-first with VR entry option

## Tech Stack
- IWSDK (Immersive Web SDK) v0.4.x
- Three.js (super-three) r181
- EliCS (ECS framework)
- PanelUI with uikitml templates
- TypeScript, Vite 7

## Controls

| Input | Action |
|-------|--------|
| Click | Select piece / Move piece |
| Esc / P | Pause / Resume |
| U | Undo last move |
| H | Show hint |
| R | Restart (on game over screen) |
| XR B Button | Pause / Resume |

## Build

```bash
npm install
npm run dev      # Start dev server
npm run build    # Production build
```
