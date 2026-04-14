# @shader-gradient/react

React bindings for `@shader-gradient/core`.

This package keeps the familiar nested canvas API while using the framework-agnostic core renderer under the hood.

## Install

```bash
npm install @shader-gradient/react react react-dom
```

## Usage

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
        preset="pensive"
        type="sphere"
        shader="defaults"
      />
    </ShaderGradientCanvas>
  )
}
```

## Credit

The visual direction and API inspiration come from [`ruucm/shadergradient`](https://github.com/ruucm/shadergradient). This package is an independent binding layer built on top of `@shader-gradient/core`.
