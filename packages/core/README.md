# @shader-gradient/core

Framework-agnostic animated shader gradients powered by Three.js.

This package is the core renderer behind the monorepo. It is inspired by [`ruucm/shadergradient`](https://github.com/ruucm/shadergradient), but it does not require React.

## Install

```bash
npm install @shader-gradient/core
```

## Usage

```ts
import { ShaderGradient } from '@shader-gradient/core'

const container = document.querySelector('#shader-gradient')

if (!container) {
  throw new Error('Missing #shader-gradient container.')
}

const gradient = new ShaderGradient(container, {
  preset: 'halo',
  shader: 'defaults',
  type: 'plane',
})

gradient.update({
  grain: true,
  grainBlending: 0.25,
})

// Later
gradient.dispose()
```

## Features

- Framework-agnostic DOM API
- Shared presets and query-string serialization
- Shader families: `defaults`, `positionMix`, `cosmic`, `glass`
- Mesh types: `plane`, `sphere`, `waterPlane`
- HDR environments and camera controls

## Credit

This package is heavily inspired by [`ruucm/shadergradient`](https://github.com/ruucm/shadergradient). Please check out the original project if you want the React-first upstream implementation.
