# @shader-gradient/vue

Vue bindings for `@shader-gradient/core`.

This package provides the same nested canvas API as the React package, but for Vue 3.

## Install

```bash
npm install @shader-gradient/vue vue
```

## Usage

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

## Credit

The visual direction and API inspiration come from [`ruucm/shadergradient`](https://github.com/ruucm/shadergradient). This package is an independent binding layer built on top of `@shader-gradient/core`.
