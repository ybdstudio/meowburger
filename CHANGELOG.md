# Meow Sakura — changelog

Meow Sakura continues from Meow Burger v1.6.4 (history below).

## v1.0.1 — Characters and matching art
- Player: the 4 drawn walk frames are used facing the camera and facing away (before: idle art with stepping legs); carrying away from the camera keeps the tray on one side; idle facing screen-right uses the matching profile.
- Walk and carry-walk frames are fitted to the idle head height (`src/19_char_fit.js`, `tools/char_fit.py`), so cats no longer dip when they start walking diagonally or sideways. Character images unchanged.
- Side characters (cashier, waiter, cleaner, customers, VIPs, manager): the one drawn walk now also serves the diagonal front directions (mirrored), and standing sideways shows the front three-quarter view instead of a back view or a cut-off face; cat04 uses clean neighbour views where its tail was clipped.
- Loading, icon, share / home / revisit popups: the kit's grey cat is recoloured to the player's orange and its cap logo replaced by the player's white bear face (`tools/sakura_cat.py`). Both icon sizes now use the same art.
- Map stage pictures: pink roofs, sakura trees and petals.

## v1.0.0 — Meow Sakura
- New name and restaurant: a Japanese sakura diner. All cats (player, staff, customers, VIP) are unchanged.
- Walls: wooden planks with paper lanterns and sakura sprigs along the cap; right baseboard in wood. Trees are sakura trees; petals on the lawn.
- Kitchen stalls as yatai: pink plank roofs (green for salad), noren curtains, paper lanterns on the posts, pink wave band on the counter.
- PICK UP sign with blossoms; VIP rug and table in sakura pink; pennants (white with red sun, pink) at the Grand Opening; pastel balloons and a blossom balloon arch.
- Sprites from the JP kit: register, carry tray, trash bin, menu stand, boxes, plant, wall menus, chicken box, fries, drink, burgers, salad, burger box, ingredients box, used tray.
- TikTok UI art from the JP kit: loading screen (logo relettered "Meow Sakura"), home / revisit / share popups (texts read "Meow Sakura"), side buttons, paw thumb, icons. Native popup aspect ratios updated.
- Save key `meowsakura.v3`; game, share and project names read Meow Sakura.
- Tests: qa_native 44/44, hs-check 0 fail (placeholder warnings only), full bot run 40:59 with 0 customers lost.

# Meow Burger — changelog

Engine history before Meow Burger (Meow Pizza v4.x) is in `docs/pizza-legacy/CHANGELOG_pizza.md`.

## v1.6.4 — TikTok native release
- The 3 TikTok gift buttons (Revisit, Share, Launch/Home) show on the play screen from the first frame after loading, on web and native.
- Auto play turned off (`CFG.autoPlay:false`): AUTO button hidden, a saved auto setting is ignored. Set it to `true` to bring it back.
- HS SDK:
  - `HSGame.start` is always called; with placeholder credentials login fails, and ads, missions and cloud stay off while the game keeps playing.
  - Cloud save: `HSGame.save(progress)` after every save (debounced). `onLoad` keeps the further progress (higher task, then more coins).
  - Gift amounts in popups come from `HSGame.rewards()` (dashboard), with the old numbers as offline defaults.
  - Every placement is logged with `canShowAd` after start.
- Build: credentials and the dashboard placements export come from `src/native/hs-config.json`. The build fills in the appid, `meow-config.js` and the ad unit IDs, and warns when game labels and dashboard labels differ.
- Placement labels match HS: Double Task Bonus, Buying Pad, Meow Rush, VIP tip, Coin Purchase, Grand Opening, Grill Break.
- Tests: qa_native 44/44, hs-check 0 fail (7 capital-letter label warnings).

## v1.6.3 — Native package with placeholders
- First TikTok Minis native package for Meow Burger, with blank App ID, SDK key and ad unit IDs.
- Credentials moved out of the HS bridge into `meow-config.js` next to `game.js`. Meow Pizza credentials removed.
- Sprites under `art/` are converted from WebP to PNG for the native runtime.
- Visual fixes: player cap tip restored in walk and carry frames, walk cycle anchored at the feet, code-drawn planter, loading screen uses the full art with the loading bar drawn live.

## v1.3 – v1.6 — Layout and art passes
- Kitchen stations redrawn in code against the walls (`src/26_stations_code.js`), storage rack and tables drawn in code.
- Seated customers drawn behind their tables; VIP rug on the floor; balloon arches grounded; trees behind the walls painted before the walls.
- Patio expansion and post-grand-opening goals; navigation grid enlarged for the patio.
- Overhead icons for waiting, angry, cash, trash and sleeping.
- Auto play with ×2 speed (now off by default, see v1.6.4).
- Grill Break interstitial every 45 s of play, starting from the first take-food task.

## v1.2 — First web test build
- Meow Burger reskin of the Meow Pizza engine: chicken is the first station; burger, fries, salad, drinks, chicken burger and deluxe burger follow.
- Approved P1 environment, asset-kit characters (cashier, food runner, cleaner, manager, customers, VIP) and the user's player sheets.
- Full bot run 35:13 with no customers lost.
