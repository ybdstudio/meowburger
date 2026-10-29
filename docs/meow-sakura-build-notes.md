# Meow Sakura — build notes
- Owner's rule: keep every character exactly as in Meow Burger; only the restaurant and its graphics change (JP sakura kit `meow-jp-full`).
- Target look = the kit's `00_overview/restaurant_full_game_jp.png` mockup: plank walls, lanterns, sakura branches, pennants, pink yatai stalls with noren, sakura trees, pink sakura VIP rug.

## Base game notes (Meow Burger, kept for the engine and layout)

Base: Meow Pizza v4.8.0 engine (reskin of data + art). Customer flow kept as Pizza (player serves).

## Decisions (from the owner)
- Name: Meow Burger. First station: Chicken.
- Approved look = P1 scene (beige brick walls, wooden caps/posts, cat door, cream tiles, wooden dining floor, trees, street) + kit atlases.
- Kitchen grouped in one block like Meow Pizza; storage shelf next to the burger station; 2nd chicken station lives in the kitchen expansion. Dining sits right next to the customer queue.
- Ready food appears on flat steel trays over each station's display spot; chicken in paper boxes. Player carries a tray with food on it.
- Kitchen stations, counter, tables, storage rack and planters are drawn in code against the walls.
- Staff order: cashier ~4 min, cleaner ~8.5 min, food runner ~11 min, kitchen runner ~19 min, manager last (~23 min).
- Overhead icons: hourglass bubble for waiting customers (red when about to leave), angry bubble when leaving, trash bubble over tables to clean.
- Characters: one scale per pose group, matched by face width; floor shadows removed from sprites.
- Cashier = kit sheets 016+002; food runner = grey cat with chef-hat-and-plate cap; player = owner-supplied sheets.
- Interstitial "Grill Break" (earlier first ad). Auto play off since v1.6.4.
- The 3 TikTok gift buttons show right after loading.
- Ad scenario: see tycoon-ads-scenario.md (standard for all Meow tycoon games).

## Layout (world tiles)
Kitchen x0–7 y0–11. Counter x6.3–7.4 y3–9. Hall x7–16 y0–11: dining, queue along y≈8, customers enter from the right (x16–23). Expansion: kitchen2 x0–7 y11–19.6, dining hall2 x7–16 y11–17.6 (family tables, VIP, manager desk), patio y17.6–21.6+.

## Bot results (no ads)
v1.2: full game 35:13, 0 customers lost. Later builds: full game ~40 min.
