# Static assets

Files in this `public/` folder are served at the site root (e.g. `public/bg-dark.jpg` → `http://localhost:4200/bg-dark.jpg`).

## Background wallpapers (required for the app theme)

Save the two wallpaper images here with these EXACT names:

- **`bg-light.jpg`** — the black & white collage → used in **light mode**
- **`bg-dark.jpg`**  — the colorful doodles on dark → used in **dark mode**

The CSS in `src/styles.css` references `/bg-light.jpg` and `/bg-dark.jpg`.
If you save them as `.png`, update those two `url(...)` paths accordingly.
