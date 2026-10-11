# Ashenwatch: The Hollow Siege

An original dark fantasy browser game. Command a hero, defend your citadel across three lanes, and face escalating demon waves and siege bosses. Explore the jungle for blessings that strengthen you and your army.

Built with **Phaser, TypeScript, and Vite**, with procedural artwork, animated combat, and an original adaptive soundtrack.

## Run locally

Requires Node.js 20.19+ or 22.12+.

```sh
npm ci
npm run dev -- --port 5174
```

Open [localhost:5174](http://127.0.0.1:5174/) and select **Begin the siege**. Music starts after you begin.

## Controls

| Action | Control |
| --- | --- |
| Move / target an enemy | Click or right-click; WASD / arrows to move |
| Attack-move / stop | F, then click / X |
| Cleave / elemental nova / dash | Space / Q / Shift |
| Build, upgrade, or repair nearby structures | E |
| Toggle hero-follow camera | C; scroll to zoom |
| Pause and audio settings | Escape / pause menu |
| Fullscreen | Expand button in the top bar |

Stand near the citadel to heal. Defeat jungle camps for shared army buffs, reinforce your towers, and clear all three siege phases to win.

## Checks and production build

```sh
npm test
npm run build
```

The build is written to `dist/`. Run `npm run preview` to preview it locally.

See the [game guide](docs/game-guide.md) for mechanics, architecture, and browser checks. This prototype has one map and hero; it is single-player with no persistent saves.

## License

[MIT](LICENSE).
