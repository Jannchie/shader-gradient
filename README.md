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

const container = document.getElementById('shader-gradient')

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
import { ShaderGradientCanvas, ShaderGradient } from '@shader-gradient/react'

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
import { ShaderGradientCanvas, ShaderGradient } from '@shader-gradient/vue'
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

- Presets such as `halo`, `pensive`, `mint`, and `interstella`
- Shader families: `defaults`, `positionMix`, `cosmic`, `glass`
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
