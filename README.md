# Dot / Lab

20 dot patterns and eight dynamical systems for React. Both libraries have a playground, and you can download the source to use in your own project.

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
        speed={0.4}
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
| `speed` | `0.5` | Speed multiplier, clamped between `0` and `5`. Zero freezes motion. |
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

## Dynamical systems

Open [Dynamical systems](https://dotlab.grantpedersen.com/dynamical-systems/) for Lorenz, Rössler, Thomas, Hénon, Clifford, Chua, Rucklidge, and Rabinovich–Fabrikant. Locally, the page is at `/dynamical-systems/`.

Its playground shows the equations and current values. Every dot has its own base state and advances under the selected system; the tracking dot supplies the live readout. Adjust a coefficient to restart the simulation, or pause and step every particle together. A preview check rejects settings that diverge and keeps the previous values. If a later orbit diverges, the playground restores the default coefficients and explains what happened.

Speed, Fade amount, and View drift control playback and appearance. Each dot fades on its own cycle. View drift gently moves the camera without changing particle states. All motion freezes when paused. **Show tracking dot** displays the large marker; it starts hidden, and live values update either way. This setting is saved in the TSX export as `showMarker` (default `false`).

**Random motion** adds independent wandering to each dot's displayed position. Choose **All directions** or **Side to side**, then use **Reseed** for a different repeatable pattern. The equations and live values continue to describe the underlying system. Random motion starts off.

Download `.tsx` saves `Attractor.tsx` with your selected system, coefficients, appearance, motion settings, and random seed. It includes the renderer and MIT license, and only imports React. Use the default export to reproduce your preset:

```tsx
import Attractor from './Attractor';

export default function Hero() {
  return <Attractor style={{ height: 480 }} />;
}
```

The equations and presets are in [dynamics.ts](src/lib/dynamics.ts), with a source link for each system. Flows use fixed-step fourth-order Runge–Kutta integration and interpolate between steps for smooth drawing. Maps apply their recurrence directly, with visual easing between calculated states. The live values always show exact numerical states. Playback speed changes how many steps run per second, not the integration step size. Particles start across a settled trajectory, then evolve independently. Short trails show their motion.

The `fade`, `drift`, and `trails` props each accept `0`–`1`; defaults are `0.7`, `0.6`, and `0.55`. Set any of them to `0` to disable that effect. `speed` defaults to `0.5` and accepts `0`–`5`.

The `randomness` prop accepts `0`–`1` and defaults to `0`. `noiseDirection` accepts `'all'` (default) or `'horizontal'`. `noiseSeed` defaults to `42`; changing it reseeds the visual wandering. These controls leave the numerical particle states unchanged.

Some parameter settings settle into a point or repeating orbit. These are numerical visualizations, not proofs of chaos for every setting. The standalone renderer stops on divergence; it does not silently clamp the coordinates or replace the equations.

## Development

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the local site. |
| `npm run build` | Check TypeScript and build the site into `dist/`. |
| `npm run preview` | Serve the built site locally. |
| `npm test` | Check shape geometry, animation behavior, dialog closing, and mobile navigation. |

The shape formulas are in [patterns.ts](src/lib/patterns.ts). [DotField.tsx](src/components/DotField.tsx) handles drawing and motion. The website uses React, TypeScript, Vite, and [Motion](https://motion.dev/) for the mobile menu.

The [llms.txt](public/llms.txt) reference is served at `/llms.txt`.

The build includes `dynamical-systems/index.html` for direct navigation on static hosts, plus `404.html`. Configure your static host to serve the latter for missing pages with an HTTP 404 response.

## License and credit

[MIT](LICENSE). You can use this in personal and commercial projects. Keep the license notice when distributing the code.

The starting reference was [Thinking Orbs from Libraries.dev](https://libraries.dev/orbs.html). The website uses `thinking-orbs` in its credit link; the downloaded `DotField` component uses its own renderer and shape formulas.
