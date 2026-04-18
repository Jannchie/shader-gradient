<script setup lang="ts">
import type { ShaderGradientPresetName, ShaderName } from '@shader-gradient/core'
import type { Root } from 'react-dom/client'
import {
  OFFICIAL_SHADERS,
  parseShaderGradientQuery,
  presetEntries,
  presets,
  resolveShaderGradientOptions,
  ShaderGradient,
} from '@shader-gradient/core'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { OfficialPreview } from './previews/OfficialPreview'

const canvasRef = ref<HTMLElement>()
const officialCompareRef = ref<HTMLElement>()
let gradient: ShaderGradient | null = null
let officialRoot: Root | null = null
const transitionReady = ref(false)
const PLAYGROUND_DEFAULTS = {
  pixelDensity: 1.5,
  enableTransition: true,
  smoothTime: 0.18,
  enableCameraControls: true,
  enableCameraUpdate: true,
}

const queryInput
  = globalThis.window !== undefined
    ? parseShaderGradientQuery(globalThis.location.search)
    : {}

const initialPreset: ShaderGradientPresetName
  = queryInput.preset && presets[queryInput.preset as ShaderGradientPresetName]
    ? (queryInput.preset as ShaderGradientPresetName)
    : 'halo'

const state = reactive({
  ...PLAYGROUND_DEFAULTS,
  preset: initialPreset as string,
  ...presets[initialPreset].props,
  ...queryInput,
})

const panelOpen = ref(true)
const copied = ref(false)
const exportMode = ref<'url' | 'react' | 'vue' | 'core'>('url')

const presetBaseline = computed(() =>
  state.preset && presets[state.preset as ShaderGradientPresetName]
    ? resolveShaderGradientOptions({ preset: state.preset as ShaderGradientPresetName })
    : resolveShaderGradientOptions({}),
)
const resolvedState = computed(() => resolveShaderGradientOptions(state))
const OFFICIAL_SHADER_SET = new Set<ShaderName>(OFFICIAL_SHADERS)
const shaderIsOfficial = computed(() =>
  OFFICIAL_SHADER_SET.has(state.shader as ShaderName),
)

function isSameArray(a: unknown, b: unknown): boolean {
  if (!Array.isArray(a) || !Array.isArray(b)) {
    return false
  }
  if (a.length !== b.length) {
    return false
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false
    }
  }
  return true
}

function diffAgainstPreset(keys: readonly string[]): Record<string, unknown> {
  const baseline = presetBaseline.value as Record<string, unknown>
  const current = resolvedState.value as Record<string, unknown>
  const result: Record<string, unknown> = {}
  for (const key of keys) {
    const cur = current[key]
    if (cur === undefined) {
      continue
    }
    const base = baseline[key]
    if (Array.isArray(cur) || Array.isArray(base)) {
      if (!isSameArray(cur, base)) {
        result[key] = cur
      }
      continue
    }
    if (cur !== base) {
      result[key] = cur
    }
  }
  return result
}

const runtimeState = computed(() => ({
  ...state,
  enableTransition: transitionReady.value ? state.enableTransition : false,
}))

const exportModes = [
  { key: 'url', label: 'Share URL' },
  { key: 'react', label: 'React' },
  { key: 'vue', label: 'Vue' },
  { key: 'core', label: 'Core TS' },
] as const

function onCameraUpdate(updates: { cAzimuthAngle: number, cPolarAngle: number, cDistance: number, cameraZoom: number }) {
  state.cAzimuthAngle = updates.cAzimuthAngle
  state.cPolarAngle = updates.cPolarAngle
  state.cDistance = updates.cDistance
  state.cameraZoom = updates.cameraZoom
}

onMounted(() => {
  if (canvasRef.value) {
    gradient = new ShaderGradient(canvasRef.value, { ...runtimeState.value, onCameraUpdate })
  }

  mountOfficialPreview()

  requestAnimationFrame(() => {
    transitionReady.value = true
    gradient?.update({ ...runtimeState.value })
    officialRoot?.render(React.createElement(OfficialPreview, { state: { ...runtimeState.value } }))
  })
})

function mountOfficialPreview() {
  if (!shaderIsOfficial.value || officialRoot || !officialCompareRef.value) {
    return
  }
  officialRoot = createRoot(officialCompareRef.value)
  officialRoot.render(React.createElement(OfficialPreview, { state: { ...runtimeState.value } }))
}

function unmountOfficialPreview() {
  officialRoot?.unmount()
  officialRoot = null
}

watch(shaderIsOfficial, (isOfficial) => {
  if (isOfficial) {
    mountOfficialPreview()
  }
  else {
    unmountOfficialPreview()
  }
})

watch(state, () => {
  gradient?.update({ ...runtimeState.value, onCameraUpdate })
  officialRoot?.render(React.createElement(OfficialPreview, { state: { ...runtimeState.value } }))

  if (globalThis.window !== undefined) {
    globalThis.history.replaceState(null, '', queryString.value)
  }
}, { deep: true })

onBeforeUnmount(() => {
  gradient?.dispose()
  officialRoot?.unmount()
  officialRoot = null
})

function toBool(val: unknown): boolean {
  if (val === 'on') {
    return true
  }
  if (val === 'off') {
    return false
  }
  return Boolean(val)
}

function getNum(key: string): number {
  return Number((state as Record<string, unknown>)[key]) || 0
}

function setNum(key: string, e: Event) {
  ;(state as Record<string, unknown>)[key] = Number(
    (e.target as HTMLInputElement).value,
  )
}

function formatNum(key: string): string {
  return getNum(key).toFixed(2)
}

function sliderFill(min: number, max: number, key: string): string {
  const val = getNum(key)
  const pct = ((val - min) / (max - min)) * 100
  return `${Math.min(100, Math.max(0, pct))}%`
}

function selectPreset(name: string) {
  const preset = presets[name as keyof typeof presets]
  if (preset) {
    Object.assign(state, { preset: name, ...preset.props })
  }
}

function setCheck(key: string, e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  ;(state as Record<string, unknown>)[key] = checked
}

const MAX_COLOR_STOPS = 9

function setColor(i: number, e: Event) {
  const next = (state.colors as string[]).slice()
  next[i] = (e.target as HTMLInputElement).value
  state.colors = next
}

function addColor() {
  const current = state.colors as string[]
  if (current.length >= MAX_COLOR_STOPS) {
    return
  }
  state.colors = [...current, '#ffffff']
}

function removeColor(i: number) {
  const current = state.colors as string[]
  if (current.length <= 1) {
    return
  }
  state.colors = current.filter((_, idx) => idx !== i)
}

function formatLiteral(value: unknown): string {
  if (typeof value === 'string') {
    return JSON.stringify(value)
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  return JSON.stringify(value)
}

function formatObjectLiteral(input: Record<string, unknown>, indent = 2): string {
  const space = ' '.repeat(indent)
  const entries = Object.entries(input)

  if (entries.length === 0) {
    return '{}'
  }

  return `{\n${entries
    .map(([key, value]) => `${space}${key}: ${formatLiteral(value)},`)
    .join('\n')}\n}`
}

const noiseSliders = [
  { key: 'uSpeed', label: 'Speed', min: 0, max: 4, step: 0.01 },
  { key: 'uDensity', label: 'Density', min: 0.2, max: 3, step: 0.1 },
  { key: 'uStrength', label: 'Strength', min: 0, max: 8, step: 0.1 },
  { key: 'uAmplitude', label: 'Amplitude', min: 0, max: 8, step: 0.1 },
]

const lightSliders = [
  { key: 'brightness', label: 'Brightness', min: 0, max: 2.5, step: 0.05 },
  { key: 'reflection', label: 'Reflection', min: 0, max: 1, step: 0.01 },
  { key: 'grainBlending', label: 'Grain Blend', min: 0, max: 1, step: 0.01 },
]

const cameraSliders = [
  { key: 'cAzimuthAngle', label: 'Azimuth', min: 0, max: 360, step: 1 },
  { key: 'cPolarAngle', label: 'Polar', min: 0, max: 180, step: 1 },
  { key: 'cDistance', label: 'Distance', min: 0.5, max: 10, step: 0.1 },
  { key: 'cameraZoom', label: 'Zoom', min: 0.5, max: 18, step: 0.1 },
]

const toggles = [
  { key: 'animate', label: 'Animate' },
  { key: 'wireframe', label: 'Wireframe' },
  { key: 'enableCameraControls', label: 'Drag Control' },
  { key: 'toggleAxis', label: 'Axis' },
]

const postFxToggles = [
  { key: 'grain', label: 'Grain (Halftone)' },
  { key: 'bloom', label: 'Bloom' },
  { key: 'vignette', label: 'Vignette' },
  { key: 'chromaticAberration', label: 'Chromatic Aberration' },
]

const postFxSliders = [
  { key: 'grainBlending', label: 'Grain Blend', min: 0, max: 1, step: 0.01, gate: 'grain' },
  { key: 'bloomStrength', label: 'Bloom Strength', min: 0, max: 3, step: 0.01, gate: 'bloom' },
  { key: 'bloomRadius', label: 'Bloom Radius', min: 0, max: 1, step: 0.01, gate: 'bloom' },
  { key: 'bloomThreshold', label: 'Bloom Threshold', min: 0, max: 1, step: 0.01, gate: 'bloom' },
  { key: 'vignetteStrength', label: 'Vignette Strength', min: 0, max: 2, step: 0.01, gate: 'vignette' },
  { key: 'vignetteSoftness', label: 'Vignette Softness', min: 0, max: 1, step: 0.01, gate: 'vignette' },
  { key: 'chromaticAberrationStrength', label: 'CA Offset', min: 0, max: 0.05, step: 0.001, gate: 'chromaticAberration' },
]

const canvasExportKeys = [
  'pixelDensity',
  'fov',
  'preserveDrawingBuffer',
  'powerPreference',
] as const

const gradientExportKeys = [
  'type',
  'animate',
  'uTime',
  'uSpeed',
  'uStrength',
  'uDensity',
  'uFrequency',
  'uAmplitude',
  'range',
  'rangeStart',
  'rangeEnd',
  'loop',
  'loopDuration',
  'positionX',
  'positionY',
  'positionZ',
  'rotationX',
  'rotationY',
  'rotationZ',
  'colors',
  'reflection',
  'wireframe',
  'shader',
  'cAzimuthAngle',
  'cPolarAngle',
  'cDistance',
  'cameraZoom',
  'lightType',
  'brightness',
  'envPreset',
  'grain',
  'grainBlending',
  'bloom',
  'bloomStrength',
  'bloomRadius',
  'bloomThreshold',
  'vignette',
  'vignetteStrength',
  'vignetteSoftness',
  'chromaticAberration',
  'chromaticAberrationStrength',
  'toggleAxis',
  'zoomOut',
] as const

const canvasExportProps = computed(() => diffAgainstPreset(canvasExportKeys))
const gradientExportProps = computed(() => {
  const diff = diffAgainstPreset(gradientExportKeys)
  return state.preset ? { preset: state.preset, ...diff } : diff
})

const queryString = computed(() => {
  const combined = { ...gradientExportProps.value, ...canvasExportProps.value }
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(combined)) {
    if (v === undefined) {
      continue
    }
    if (Array.isArray(v)) {
      params.set(k, v.join(','))
      continue
    }
    params.set(k, String(v))
  }
  const str = params.toString()
  return str ? `?${str}` : ''
})
const shareUrl = computed(() => {
  if (globalThis.window === undefined) {
    return queryString.value
  }
  return `${globalThis.location.origin}${globalThis.location.pathname}${queryString.value}`
})

const exportContent = computed(() => {
  if (exportMode.value === 'url') {
    return shareUrl.value
  }

  if (exportMode.value === 'react') {
    return `import { ShaderGradientCanvas, ShaderGradient } from '@shader-gradient/react'

const canvasProps = ${formatObjectLiteral(canvasExportProps.value)}
const gradientProps = ${formatObjectLiteral(gradientExportProps.value)}

export function GradientDemo() {
  return (
    <ShaderGradientCanvas
      style={{ width: '100%', height: '100%' }}
      {...canvasProps}
    >
      <ShaderGradient {...gradientProps} />
    </ShaderGradientCanvas>
  )
}`
  }

  if (exportMode.value === 'vue') {
    return `<script setup lang="ts">
import { ShaderGradientCanvas, ShaderGradient } from '@shader-gradient/vue'

const canvasProps = ${formatObjectLiteral(canvasExportProps.value)}
const gradientProps = ${formatObjectLiteral(gradientExportProps.value)}
<\/script>

<template>
  <ShaderGradientCanvas
    v-bind="canvasProps"
    style="width: 100%; height: 100%;"
  >
    <ShaderGradient v-bind="gradientProps" />
  </ShaderGradientCanvas>
</template>`
  }

  return `import { ShaderGradient } from '@shader-gradient/core'

const gradientOptions = ${formatObjectLiteral({
  ...canvasExportProps.value,
  ...gradientExportProps.value,
})}

const container = document.getElementById('shader-gradient')

if (!container) {
  throw new Error('Missing #shader-gradient container.')
}

const gradient = new ShaderGradient(container, gradientOptions)

// Later:
// gradient.dispose()`
})

function copyQuery() {
  navigator.clipboard.writeText(exportContent.value).then(() => {
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 1500)
  })
}
</script>

<template>
  <div class="app">
    <div
      ref="canvasRef"
      class="gradient-bg"
    />

    <section
      class="compare-dock"
      :class="{ 'compare-dock-minimized': !shaderIsOfficial }"
    >
      <template v-if="shaderIsOfficial">
        <div class="compare-preview-wrapper">
          <div
            ref="officialCompareRef"
            class="official-preview"
          />
          <span class="compare-tag compare-tag-official">
            Official <code>@shadergradient/react</code>
          </span>
          <span class="compare-tag compare-tag-local">
            Local · background
          </span>
        </div>
      </template>
      <div
        v-else
        class="compare-empty"
      >
        <span class="compare-empty-icon" aria-hidden="true">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 2l2.39 4.84L20 8l-4 3.9.94 5.5L12 14.77 7.06 17.4 8 11.9 4 8l5.61-1.16L12 2z" />
          </svg>
        </span>
        <div class="compare-empty-body">
          <p class="compare-kicker">
            Original shader
          </p>
          <p class="compare-empty-text">
            <code>{{ state.shader }}</code> is unique to this fork — no official comparison available.
          </p>
        </div>
      </div>
    </section>

    <Transition name="fade">
      <button
        v-if="!panelOpen"
        type="button"
        class="fab"
        title="Open controls"
        @click="panelOpen = true"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        >
          <line
            x1="4"
            y1="21"
            x2="4"
            y2="14"
          />
          <line
            x1="4"
            y1="10"
            x2="4"
            y2="3"
          />
          <line
            x1="12"
            y1="21"
            x2="12"
            y2="12"
          />
          <line
            x1="12"
            y1="8"
            x2="12"
            y2="3"
          />
          <line
            x1="20"
            y1="21"
            x2="20"
            y2="16"
          />
          <line
            x1="20"
            y1="12"
            x2="20"
            y2="3"
          />
          <line
            x1="1"
            y1="14"
            x2="7"
            y2="14"
          />
          <line
            x1="9"
            y1="8"
            x2="15"
            y2="8"
          />
          <line
            x1="17"
            y1="16"
            x2="23"
            y2="16"
          />
        </svg>
      </button>
    </Transition>

    <Transition name="slide">
      <aside
        v-if="panelOpen"
        class="panel"
      >
        <header class="panel-header">
          <div class="panel-title">
            <h1>Shader Gradient</h1>
            <span class="badge">Playground</span>
          </div>
          <button
            type="button"
            class="icon-btn"
            title="Close panel"
            @click="panelOpen = false"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            >
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </header>

        <div class="panel-body">
          <!-- Presets -->
          <section class="section">
            <h2 class="section-title">
              Presets
            </h2>
            <div class="chip-row">
              <button
                v-for="[name, preset] in presetEntries"
                :key="name"
                type="button"
                :class="{ active: state.preset === name }"
                @click="selectPreset(name)"
              >
                {{ preset.title }}
              </button>
            </div>
          </section>

          <!-- Shape -->
          <section class="section">
            <h2 class="section-title">
              Shape
            </h2>
            <div class="field-grid">
              <div class="field">
                <label>Mesh Type</label>
                <select v-model="state.type">
                  <option value="plane">
                    Plane
                  </option>
                  <option value="sphere">
                    Sphere
                  </option>
                  <option value="waterPlane">
                    Water Plane
                  </option>
                </select>
              </div>
              <div class="field">
                <label>Shader</label>
                <select v-model="state.shader">
                  <option value="defaults">
                    defaults
                  </option>
                  <option value="positionMix">
                    positionMix
                  </option>
                  <option value="cosmic">
                    cosmic
                  </option>
                  <option value="glass">
                    glass
                  </option>
                  <option value="lava">
                    lava
                  </option>
                  <option value="aurora">
                    aurora
                  </option>
                  <option value="marble">
                    marble
                  </option>
                  <option value="pulse">
                    pulse
                  </option>
                  <option value="spectrum">
                    spectrum
                  </option>
                  <option value="halo">
                    halo
                  </option>
                </select>
              </div>
            </div>
          </section>

          <!-- Colors -->
          <section class="section">
            <h2 class="section-title">
              Colors
            </h2>
            <div class="color-row color-row-dynamic">
              <div
                v-for="(c, i) in (state.colors as string[])"
                :key="i"
                class="color-field"
              >
                <div class="color-swatch">
                  <input
                    type="color"
                    :value="c"
                    @input="setColor(i, $event)"
                  >
                  <button
                    v-if="(state.colors as string[]).length > 1"
                    type="button"
                    class="color-remove"
                    title="Remove color"
                    @click="removeColor(i)"
                  >
                    ×
                  </button>
                </div>
                <span>Color {{ i + 1 }}</span>
              </div>
              <div
                v-if="(state.colors as string[]).length < MAX_COLOR_STOPS"
                class="color-field color-field-add"
              >
                <button
                  type="button"
                  class="color-add"
                  title="Add color"
                  @click="addColor"
                >
                  +
                </button>
                <span>Add</span>
              </div>
            </div>
          </section>

          <!-- Noise -->
          <section class="section">
            <h2 class="section-title">
              Noise
            </h2>
            <div class="slider-group">
              <div
                v-for="s in noiseSliders"
                :key="s.key"
                class="slider-field"
              >
                <div class="slider-header">
                  <label>{{ s.label }}</label>
                  <span class="slider-val">{{ formatNum(s.key) }}</span>
                </div>
                <input
                  type="range"
                  :min="s.min"
                  :max="s.max"
                  :step="s.step"
                  :value="getNum(s.key)"
                  :style="{ '--fill': sliderFill(s.min, s.max, s.key) }"
                  @input="setNum(s.key, $event)"
                >
              </div>
            </div>
          </section>

          <!-- Lighting -->
          <section class="section">
            <h2 class="section-title">
              Lighting
            </h2>
            <div class="field-grid">
              <div class="field">
                <label>Type</label>
                <select v-model="state.lightType">
                  <option value="3d">
                    3D
                  </option>
                  <option value="env">
                    Environment
                  </option>
                </select>
              </div>
              <div class="field">
                <label>Environment</label>
                <select v-model="state.envPreset">
                  <option value="city">
                    City
                  </option>
                  <option value="dawn">
                    Dawn
                  </option>
                  <option value="lobby">
                    Lobby
                  </option>
                </select>
              </div>
            </div>
            <div class="slider-group slider-group-mt">
              <div
                v-for="s in lightSliders"
                :key="s.key"
                class="slider-field"
              >
                <div class="slider-header">
                  <label>{{ s.label }}</label>
                  <span class="slider-val">{{ formatNum(s.key) }}</span>
                </div>
                <input
                  type="range"
                  :min="s.min"
                  :max="s.max"
                  :step="s.step"
                  :value="getNum(s.key)"
                  :style="{ '--fill': sliderFill(s.min, s.max, s.key) }"
                  @input="setNum(s.key, $event)"
                >
              </div>
            </div>
          </section>

          <!-- Camera -->
          <section class="section">
            <h2 class="section-title">
              Camera
            </h2>
            <div class="slider-group">
              <div
                v-for="s in cameraSliders"
                :key="s.key"
                class="slider-field"
              >
                <div class="slider-header">
                  <label>{{ s.label }}</label>
                  <span class="slider-val">{{ formatNum(s.key) }}</span>
                </div>
                <input
                  type="range"
                  :min="s.min"
                  :max="s.max"
                  :step="s.step"
                  :value="getNum(s.key)"
                  :style="{ '--fill': sliderFill(s.min, s.max, s.key) }"
                  @input="setNum(s.key, $event)"
                >
              </div>
            </div>
          </section>

          <!-- Options -->
          <section class="section">
            <h2 class="section-title">
              Options
            </h2>
            <div class="toggle-grid">
              <label
                v-for="t in toggles"
                :key="t.key"
                class="toggle-field"
              >
                <input
                  type="checkbox"
                  :checked="toBool((state as Record<string, unknown>)[t.key])"
                  @change="setCheck(t.key, $event)"
                >
                <span>{{ t.label }}</span>
              </label>
            </div>
          </section>

          <!-- Post FX -->
          <section class="section">
            <h2 class="section-title">
              Post FX
            </h2>
            <div class="toggle-grid">
              <label
                v-for="t in postFxToggles"
                :key="t.key"
                class="toggle-field"
              >
                <input
                  type="checkbox"
                  :checked="toBool((state as Record<string, unknown>)[t.key])"
                  @change="setCheck(t.key, $event)"
                >
                <span>{{ t.label }}</span>
              </label>
            </div>
            <div class="slider-group slider-group-mt">
              <div
                v-for="s in postFxSliders"
                v-show="toBool((state as Record<string, unknown>)[s.gate])"
                :key="s.key"
                class="slider-field"
              >
                <div class="slider-header">
                  <label>{{ s.label }}</label>
                  <span class="slider-val">{{ formatNum(s.key) }}</span>
                </div>
                <input
                  type="range"
                  :min="s.min"
                  :max="s.max"
                  :step="s.step"
                  :value="getNum(s.key)"
                  :style="{ '--fill': sliderFill(s.min, s.max, s.key) }"
                  @input="setNum(s.key, $event)"
                >
              </div>
            </div>
          </section>

          <!-- Export -->
          <section class="section">
            <h2 class="section-title">
              Export
            </h2>
            <div class="export-tabs">
              <button
                v-for="mode in exportModes"
                :key="mode.key"
                type="button"
                :class="{ active: exportMode === mode.key }"
                @click="exportMode = mode.key"
              >
                {{ mode.label }}
              </button>
            </div>
            <div class="query-wrapper">
              <pre class="query-output">{{ exportContent }}</pre>
              <button
                type="button"
                class="copy-btn"
                @click="copyQuery"
              >
                {{ copied ? 'Copied!' : 'Copy' }}
              </button>
            </div>
          </section>
        </div>
      </aside>
    </Transition>
  </div>
</template>
