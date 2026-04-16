# shader-gradient

Animated shader gradients inspired by [`ruucm/shadergradient`](https://github.com/ruucm/shadergradient), rebuilt around a framework-agnostic core.

This project keeps the visual direction and much of the public API shape that made the original project great, but moves the rendering engine into a plain TypeScript package so you can use it without React.

## Why This Project

- `@shader-gradient/core` works directly with DOM + Three.js, so React is not required.
- `@shader-gradient/react` and `@shader-gradient/vue` are thin bindings on top of the same renderer.
- Presets, query-string serialization, camera controls, HDR environments, and shader families are shared across packages.
- A playground is included for tuning, sharing, and exporting configurations.

## Credit

This project would not exist without the excellent work in [`ruucm/shadergradient`](https://github.com/ruucm/shadergradient).

- Visual direction and overall API inspiration come from that repository.
- Several behaviors in this project intentionally follow the original package closely so migration and comparison are easier.
- If you want the original React-first implementation, please support and explore the upstream project directly.

This repository is an independent reimplementation and is not an official fork or affiliated package.

## Packages

- `@shader-gradient/core`
  Framework-agnostic renderer.
- `@shader-gradient/react`
  React bindings with `<ShaderGradientCanvas />` and `<ShaderGradient />`.
- `@shader-gradient/vue`
  Vue bindings with the same nested canvas API.
- `@shader-gradient/playground`
  Local playground used for tuning and export.

## Install

### Core

```bash
npm install @shader-gradient/core
```

### React

```bash
npm install @shader-gradient/react react react-dom
```

### Vue

```bash
npm install @shader-gradient/vue vue
```

## Core Usage

```ts
import { ShaderGradient } from '@shader-gradient/core'

const container = document.querySelector('#shader-gradient')

if (!container) {
  throw new Error('Missing #shader-gradient container.')
}

const gradient = new ShaderGradient(container, {
  preset: 'pensive',
  type: 'sphere',
  shader: 'defaults',
  lightType: 'env',
  envPreset: 'city',
})

gradient.update({
  grain: true,
  grainBlending: 0.3,
})

// Later
gradient.dispose()
```

## React Usage

```tsx
import { ShaderGradient, ShaderGradientCanvas } from '@shader-gradient/react'

export function HeroGradient() {
  return (
    <ShaderGradientCanvas
      style={{ width: '100%', height: '100%' }}
      pixelDensity={1.5}
      fov={45}
    >
      <ShaderGradient
        preset="halo"
        type="plane"
        shader="defaults"
        grain="on"
      />
    </ShaderGradientCanvas>
  )
}
```

## Vue Usage

```vue
<script setup lang="ts">
import { ShaderGradient, ShaderGradientCanvas } from '@shader-gradient/vue'
</script>

<template>
  <ShaderGradientCanvas
    :pixel-density="1.5"
    :fov="45"
    style="width: 100%; height: 100%;"
  >
    <ShaderGradient
      preset="mint"
      type="waterPlane"
      shader="defaults"
    />
  </ShaderGradientCanvas>
</template>
```

## Features

- Presets such as `halo`, `pensive`, `mint`, `interstella`, and more
- Shader families: `defaults`, `positionMix`, `cosmic`, `glass`, `lava`, `aurora`, `marble`, `pulse`
- Mesh types: `plane`, `sphere`, `waterPlane`
- Query-string import/export
- Camera controls and camera parameter serialization
- HDR environment presets: `city`, `dawn`, `lobby`
- Grain post-processing
- Shared configuration model across core, React, and Vue

## Query String Support

You can serialize the current configuration and restore it later:

```ts
import {
  parseShaderGradientQuery,
  serializeShaderGradientOptions,
} from '@shader-gradient/core'

const query = serializeShaderGradientOptions({
  preset: 'halo',
  grain: true,
  grainBlending: 0.25,
})

const parsed = parseShaderGradientQuery(query)
```

## Original Shaders & Presets

In addition to the shaders ported from the upstream project, this repository includes several original shader families and presets:

### Original Shaders

| Shader | Description |
|--------|-------------|
| `lava` | Molten lava with domain-warped FBM flow, Voronoi crust cracks, and subsurface glow |
| `aurora` | Northern-lights curtains built from layered FBM bands, vertical fade, and shimmer |
| `marble` | Organic stone / fluid-art veining via double domain warping and polished surface sheen |
| `pulse` | Cyberpunk energy rings with multi-center wave interference, scanlines, and beat pulses |

#### Design Notes

- **Aurora** draws on the natural shape of real aurora borealis — light curtains that hang vertically and ripple horizontally. Technically it stretches multi-layer FBM noise along the horizontal axis to form "curtains", applies a vertical gradient fade to simulate light draping down from the sky, and overlays a high-frequency noise layer for fine shimmer.
- **Marble** leverages the well-known observation that double domain warping (warping already-warped coordinates) naturally produces organic, marble-like veining — a technique widely discussed in Inigo Quilez's articles on domain distortion. Sharp vein edges are carved out with `smoothstep`, and a subtle rim sheen mimics the look of polished stone.
- **Pulse** starts from a simple physics idea: what if ripples on water were made of light? Multiple moving wave centers create an interference pattern; `smoothstep` sharpens the rings, and additive scanlines plus a `pow`-driven beat pulse push the result toward a cyberpunk aesthetic.
- **Lava** combines domain-warped FBM for molten flow with Voronoi distance fields for cooling crust cracks. Hot magma glows through the cracks via an inverted Voronoi edge mask, and a pulsing heat term keeps the surface alive.

### Original Presets

| Preset | Shader | Mesh | Palette |
|--------|--------|------|---------|
| `lavaFlow` | lava | waterPlane | Deep purple / crimson |
| `borealis` | aurora | waterPlane | Green / cyan / purple |
| `deepOcean` | aurora | sphere | Navy / teal / seafoam |
| `silkRoad` | marble | plane | Ivory / gold / dark walnut |
| `jade` | marble | sphere | Emerald / mint / forest green |
| `neonGrid` | pulse | waterPlane | Magenta / cyan / midnight blue |
| `heartbeat` | pulse | sphere | Red / pink / dark crimson |

## Local Development

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm build
pnpm typecheck
```
