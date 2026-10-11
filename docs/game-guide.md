# Ashenwatch: The Hollow Siege

An original, solo browser prototype built with Game Studio's Phaser, simulation, HUD, and playtesting workflows. Inspired by the hero combat, defense-to-offense structure, and elemental progression described in EverSiege's official overview: https://eversiegegame.com/.

## Play locally

Requires Node.js 20.19+ or 22.12+.

```powershell
npm install
npm run dev -- --port 5174
```

Open http://127.0.0.1:5174/ and select **Begin the siege**.

## Controls

| Action | Control |
| --- | --- |
| Move | Right-click / left-click / tap ground; WASD or arrows also work |
| Chase and automatically attack | Click / right-click / tap an enemy |
| Attack-move | F, then click ground |
| Stop current order | X |
| Cleave nearby enemies | Hold Space, or tap Cleave |
| Elemental nova | Q / nova button |
| Dash | Shift (toward cursor) / Riftstep button |
| Rebuild, reinforce, or repair | E / Rebuild button near a structure; Fortifications list marches to a tower |
| Call nine additional soldiers | Reinforcements button, 40 gold; army limit 36 |
| Pause / field guide | Escape / header buttons; music toggle and volume are inside |
| Fullscreen / windowed | Expand button in the top bar; Escape exits fullscreen |
| Follow the hero / tactical view | C |
| Zoom and follow the hero | Scroll wheel |

Combat starts with the original wide battlefield view. **C** optionally switches to hero follow and back. Scroll zooms in toward your hero; scrolling out restores the wide view. Restarting an expedition restores the wide view. Portrait screens retain their original framing.

Stand near Ashenwatch to automatically recover **13 HP per second**. A green aura and rising healing particles show recovery; the hero HUD reads **Citadel healing · +13 HP/s**, then **Citadel · HP full** when finished. The healing circle appears while you are nearby.

## Music and sound

An original 49-second dark fantasy score loops after **Begin the siege**. Bowed chords, a dulcimer-like melody, and bass form the quieter theme; marching drums join waves, with a heavier warlord layer during boss assaults. Pause and upgrade menus soften the music. Hidden tabs suspend audio. Toggle music and adjust its volume in the pause/guide menu; the top-bar speaker mutes all audio. Preferences are remembered. Music is synthesized locally, with no network downloads.

## Three siege phases

Start with **12 guards and archers**, **two active watchtowers**, 140 gold, and 10 seconds to prepare. Six soldiers deploy every 12 seconds, up to 36. Guards hold lane positions; archers fire from range. During a boss assault, the army advances to engage the warlord. Buying reinforcements adds up to nine soldiers for 40 gold, and costs nothing when the army is full.

| Phase | Warlord | Supporting mobs | Boss attack |
| --- | --- | --- | --- |
| The Cinder Vanguard | Ashhorn, the Breachmaker | Cinder raiders and armored brutes | Telegraphs a cinder stomp around himself |
| The Frostbound Host | The Rime Oracle | Frost revenants and ranged Icebinders | Icefall targets a nearby defender and slows troops it hits |
| The Hollow Eclipse | The Hollow King | Fast shades and Eclipse guards | Wide eclipse pulse damages the army and nearby towers |

Each phase has three waves, 14 seconds apart; its warlord arrives on the third wave with two elite escorts per lane and summons its own minions throughout the fight (every 8 seconds for the Rime Oracle, 10 for the others). Waves overlap: enemies do not wait for the previous assault to clear. Defeat the warlord **and clear its remaining raiders** to progress. Between phases receive 120 gold, 120 citadel healing, 40% hero healing, 50 health for surviving troops, a six-soldier deployment, and an 8-second preparation window. Clearing all three phases wins the expedition. Another age increases hostile health and damage.

Sanctuaries are optional strategic objectives: defeat their guardians and remain in the circle for four seconds. Each grants gold, experience, an elemental attunement, and reduces newly arriving warlords' maximum health by 10%. Your citadel heals the warden. Level-ups pause the action for a choice of hero or army upgrades; army upgrades also apply to future recruits.

## Fortifications

**Westwatch** and **Southwatch** start active. **Crownwatch** starts as a marked construction site. All three have names, health bars, and markers on the minimap. Open **Fortifications**, select a post to march there, then press **E** or the Rebuild button. An active tower fires automatically within 280 world units. Nearby enemies can attack and destroy it; a destroyed tower becomes a rebuilding site.

- Rebuild: 55 gold; 480 health, 32 damage every 0.9 seconds.
- Reinforce: 80 gold; fully repairs and upgrades to 680 health, 64 damage every 0.65 seconds.
- Repair a damaged reinforced tower: 35 gold; restores full health.
- Repair the citadel: 45 gold; restores 200 health.

## Jungle encounters

Jungle blessings affect **both the hero and the defending army**, including newly recruited troops. Buffed units display a ground aura, and the HUD lists active blessings. Neutral creatures stay in camps and fight the warden when approached or attacked. They ignore lane troops. If pulled more than 265 world units from their camp, they return home, heal, and become temporarily immune while resetting. Camps respawn after their entire group is defeated. Use the collapsible **Jungle encounters** list to inspect camps or order your warden to march to them; amber diamonds mark them on the minimap.

| Camp | Encounter | Respawn | Reward |
| --- | --- | --- | --- |
| Briarwolf camp | Three wolves | 45 seconds | Pack oath: hero and soldiers regenerate 3 health per second for 60 seconds; a new clear refreshes the timer |
| Forgotten quarry | Two sentinels and the Stonewarden | 90 seconds | Stoneheart: hero and soldiers gain 30 maximum health; towers take 20% less damage; heals the hero 60 on first claim |
| Thornmaw's den | Two wolves and Thornmaw | 120 seconds | Predator sigil: +20% damage and +10% movement speed |

Both jungle bosses telegraph area attacks for 1.15 seconds. Leave the warning circle or dash away before it resolves. The Stonewarden's slam also slows heroes it hits. Artifacts are claimed once per expedition; subsequent clears still give gold and experience. Jungle bosses are optional and do not trigger the victory condition.

Characters have generated sprite frames for idle breathing, walking, attacks, spell casting, hit reactions, and death fades. Walking animates legs, cloaks, and arms; wolves bound and bite; stone creatures raise their arms during boss telegraphs. Animation timing follows simulation time, so pausing freezes the action.

The demon spawn portal is a fractured standing stone ring with runes, braziers, and an animated crimson vortex. It flares as waves emerge.

## Validation

```powershell
npm test
npm run build
npx playwright install chromium
# With the dev server running on port 5174:
node tests/browser.mjs
node tests/jungle-browser.mjs
node tests/camera-browser.mjs
node tests/animation-browser.mjs
node tests/siege-browser.mjs
node tests/fullscreen-browser.mjs
node tests/audio-browser.mjs
# Verify the deployed production game:
node tests/pages-browser.mjs
```

Screenshots from the browser test are saved under `test-results/`.

## Architecture

- `src/game/`: authored content and framework-independent simulation.
- `src/phaser/`: generated canvas artwork, input, camera, actors, and combat effects.
- `src/ui/`: DOM HUD, menus, field guide, and upgrade choices.
- `src/main.ts`: wiring.
- `src/audio/`: original looping score, adaptive music mix, effects, and saved audio preferences.

All battlefield and character art is procedurally drawn in source. Fonts use Google Fonts with local serif/sans-serif fallbacks. No copyrighted reference assets are bundled. The dev-only `window.__ASHENWATCH__` accessor supports browser validation and is omitted from production.

This slice has one map and hero, three siege phases and warlords, six siege mob types, guards and archers, three essences, four repeatable upgrades, three destructible watchtowers, two sanctuaries, three respawning jungle camps, two jungle bosses, and shared jungle blessings. Terrain is decorative and does not block movement. There is no multiplayer, persistent save, or campaign. Ages continue in the current session only.
