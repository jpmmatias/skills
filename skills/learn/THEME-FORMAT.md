# Theme Format

A theme is one CSS file, copied into a workspace as `./assets/theme.css`. Every page links it **after** `style.css`:

```html
<link rel="stylesheet" href="../assets/style.css">
<link rel="stylesheet" href="../assets/theme.css">
```

`style.css` holds every rule; the theme only overrides **tokens**, plus a few optional signature details. Because components read tokens, one theme restyles lessons, quizzes, diagrams, the dashboard and motion scenes together.

## Tokens

| Group | Tokens | Notes |
|---|---|---|
| Colour | `--bg` `--fg` `--muted` `--rule` `--accent` `--code-bg` `--card` | Define light on `:root`, dark in **both** dark blocks (see below). |
| Meaning | `--ok` `--bad` `--act(-bg)` `--confirm(-bg)` `--triage(-bg)` | Usually keep the defaults: these colours carry meaning across lessons. |
| Type | `--font-body` `--font-head` `--font-ui` `--font-mono` | `--font-ui` is labels, kickers, buttons, diagram text. |
| Headings | `--head-weight` `--head-transform` `--head-tracking` | e.g. `700`, `uppercase`, `.02em`. |
| Shape | `--radius` `--radius-sm` | Cards / small chips. `0` for square. |
| Motion scene | `--sc-bg` `--sc-panel` `--sc-line` `--sc-fg` `--sc-muted` `--sc-accent` `--sc-gold` `--sc-glow` `--sc-chrome` | Scenes stay dark in both themes. Keep `--sc-gold` as the signal colour. |

Dark mode goes in two blocks, so it works for both the OS setting and an explicit toggle:

```css
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { /* dark tokens */ } }
:root[data-theme="dark"] { /* same dark tokens */ }
```

Web fonts: load them with an `@import` from Google Fonts on the first line of the theme, and always end each font stack with a system fallback.

## Rules

- **Theme-local tokens are fine.** A theme can add its own, such as `--font-label` for uppercase labels, as long as only its own signature selectors read them.
- **Tokens first.** Only add selectors for signature details the tokens can't express (an uppercase kicker, a grid backdrop). Never restyle a component's layout.
- **Keep one signal colour.** If the brand is monochrome, `--accent` can be the text colour; the motion scenes' gold and the meaning colours still do the signalling.
- **Check contrast.** Body text and `--muted` must stay readable (WCAG AA, 4.5:1) on `--bg` and `--card`, in both modes.
- **Print stays plain.** Hide decorative backdrops under `@media print`.

## Making a theme from a website

When the user asks for courses that look like their site or brand:

1. Read the site's source (global CSS, Tailwind config, layout, a page or two) or fetch the live page. Collect: background and text colours in light and dark, border colour, accent, font families for headings / body / code, heading case and tracking, corner radius, and one or two signature details.
2. Map them onto the tokens above in `themes/<name>.css`, with a header comment describing the look in one sentence.
3. Render one lesson with it in light and dark, and at phone width, before using it for a whole course.

See [`themes/joaopdmatias.css`](./themes/joaopdmatias.css) for a worked example.
