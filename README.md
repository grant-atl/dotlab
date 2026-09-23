# Dot / Lab

20 dot animations for React, with a playground for adjusting color, speed, and density. You can copy the source into your project and change it there.

The animations use Canvas 2D. The downloaded component needs React 18 or newer and has no other runtime dependencies.

## Run the site

Use Node.js 22.12 or newer.

```sh
npm install
npm run dev
```

Open [localhost:5173](http://localhost:5173).

## Use an animation

Click an animation to open the playground. Download `.tsx` saves the component and all 20 patterns in one file, `DotField.tsx`. Put that file in your React project, then import it:

```tsx
import { DotField } from './DotField';

export default function Hero() {
  return (
    <div style={{ background: '#111310' }}>
      <DotField
        pattern="sphere"
        color="#baff66"
        speed={0.8}
        style={{ height: 480 }}
      />
    </div>
  );
}
```

Give the canvas a height, as in the example. Its background is transparent; set the background on its parent.

To use your playground settings, open the Code tab and choose Copy usage. Downloading the component doesn't change its defaults. Copy component includes the source with your settings in a commented usage example.

The exported file includes `'use client'` for React frameworks that use server components.

## Props

| Prop | Default | Description |
| --- | --- | --- |
| `pattern` | `'sphere'` | Shape to draw. See the IDs below. |
| `color` | `'#baff66'` | Dot color. Accepts a CSS color. |
| `speed` | `1` | Speed multiplier, clamped between `0` and `5`. Zero freezes motion. |
| `paused` | `false` | Freeze the current animation. |
| `density` | `1` | Dot count multiplier. `1` draws 1,150 dots; the limit is 160 to 2,200. |
| `morph` | `false` | Move the dots into the next shape when `pattern` changes. |
| `className` | None | CSS class for the canvas. |
| `style` | None | React styles for the canvas. |

## Shapes

```text
sphere · torus · wave · vortex · helix
ripple · galaxy · cube · infinity · aurora
dna · bloom · tunnel · orbit · terrain
knot · rain · constellation · pulse · lattice
```

## Motion

With `morph={true}`, changing `pattern` makes the dots reform over about 1.4 seconds. The component doesn't cycle through shapes on its own. The site's hero does that by changing the pattern every six seconds.

Animations stop when the canvas leaves the viewport or the tab is hidden. People with reduced motion enabled see a still shape. Selecting another shape while paused, at zero speed, or with reduced motion enabled shows it immediately.

## Development

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the local site. |
| `npm run build` | Check TypeScript and build the site into `dist/`. |
| `npm run preview` | Serve the built site locally. |
| `npm test` | Check shape geometry, animation behavior, dialog closing, and mobile navigation. |

The shape formulas are in [patterns.ts](src/lib/patterns.ts). [DotField.tsx](src/components/DotField.tsx) handles drawing and motion. The website uses React, TypeScript, Vite, and [Motion](https://motion.dev/) for the mobile menu.

The [llms.txt](public/llms.txt) reference is served at `/llms.txt`.

The build includes `404.html`. Configure your static host to serve it for missing pages with an HTTP 404 response.

## License and credit

[MIT](LICENSE). You can use this in personal and commercial projects. Keep the license notice when distributing the code.

The starting reference was [Thinking Orbs from Libraries.dev](https://libraries.dev/orbs.html). The website uses `thinking-orbs` in its credit link; the downloaded `DotField` component uses its own renderer and shape formulas.
