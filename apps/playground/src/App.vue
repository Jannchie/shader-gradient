<script setup lang="ts">
import React from 'react'
import { ref, reactive, computed, onMounted, watch, onBeforeUnmount } from 'vue'
import { createRoot, type Root } from 'react-dom/client'
import {
  parseShaderGradientQuery,
  ShaderGradient,
  presetEntries,
  presets,
  serializeShaderGradientOptions,
} from '@shader-gradient/core'
import { OfficialPreview } from './previews/OfficialPreview'

const canvasRef = ref<HTMLElement>()
const officialCompareRef = ref<HTMLElement>()
let gradient: ShaderGradient | null = null
let officialRoot: Root | null = null
const transitionReady = ref(false)
const hasInitialQuery =
  typeof window !== 'undefined' &&
  window.location.search.trim() !== '' &&
  window.location.search.trim() !== '?'

const queryInput =
  !hasInitialQuery
    ? {}
    : parseShaderGradientQuery(window.location.search)

const initialPreset =
  queryInput.preset && presets[queryInput.preset as keyof typeof presets]
    ? (queryInput.preset as keyof typeof presets)
    : 'halo'

const queryPreset =
  queryInput.preset && presets[queryInput.preset as keyof typeof presets]
    ? presets[queryInput.preset as keyof typeof presets].props
    : {}

const state = reactive({
  preset: initialPreset as string,
  pixelDensity: 1.5,
  enableTransition: true,
  smoothTime: 0.18,
  enableCameraControls: true,
  enableCameraUpdate: false,
  ...presets[initialPreset].props,
  ...queryPreset,
  ...queryInput,
})

const panelOpen = ref(true)
const copied = ref(false)
const exportMode = ref<'url' | 'react' | 'vue' | 'core'>('url')
const queryString = computed(() => serializeShaderGradientOptions(state))
const shareUrl = computed(() => {
  if (typeof window === 'undefined') return queryString.value
  return `${window.location.origin}${window.location.pathname}${queryString.value}`
})
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

onMounted(() => {
  if (canvasRef.value) {
    gradient = new ShaderGradient(canvasRef.value, { ...runtimeState.value })
  }

  if (officialCompareRef.value) {
    officialRoot = createRoot(officialCompareRef.value)
    officialRoot.render(React.createElement(OfficialPreview, { state: { ...runtimeState.value } }))
  }

  requestAnimationFrame(() => {
    transitionReady.value = true
    gradient?.update({ ...runtimeState.value })
    officialRoot?.render(React.createElement(OfficialPreview, { state: { ...runtimeState.value } }))
  })
})

watch(state, () => {
  gradient?.update({ ...runtimeState.value })
  officialRoot?.render(React.createElement(OfficialPreview, { state: { ...runtimeState.value } }))

  if (typeof window !== 'undefined') {
    window.history.replaceState(null, '', queryString.value)
  }
}, { deep: true })

onBeforeUnmount(() => {
  gradient?.dispose()
  officialRoot?.unmount()
  officialRoot = null
})

function toBool(val: unknown): boolean {
  if (val === 'on') return true
  if (val === 'off') return false
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

function copyQuery() {
  navigator.clipboard.writeText(exportContent.value).then(() => {
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 1500)
  })
}

function formatLiteral(value: unknown): string {
  if (typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return JSON.stringify(value)
}

function formatObjectLiteral(input: Record<string, unknown>, indent = 2): string {
  const space = ' '.repeat(indent)
  const entries = Object.entries(input)

  if (!entries.length) return '{}'

  return `{\n${entries
    .map(([key, value]) => `${space}${key}: ${formatLiteral(value)},`)
    .join('\n')}\n}`
}

function pickState(keys: readonly string[]): Record<string, unknown> {
  return Object.fromEntries(
    keys
      .map((key) => [key, (state as Record<string, unknown>)[key]])
      .filter(([, value]) => value !== undefined),
  )
}

const noiseSliders = [
  { key: 'uSpeed', label: 'Speed', min: 0, max: 1.2, step: 0.01 },
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
  { key: 'grain', label: 'Grain' },
  { key: 'wireframe', label: 'Wireframe' },
  { key: 'enableCameraControls', label: 'Drag Control' },
  { key: 'toggleAxis', label: 'Axis' },
]

const canvasExportKeys = [
  'pixelDensity',
  'fov',
  'preserveDrawingBuffer',
  'powerPreference',
] as const

const gradientExportKeys = [
  'preset',
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
  'color1',
  'color2',
  'color3',
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
  'toggleAxis',
  'zoomOut',
  'hoverState',
  'smoothTime',
  'enableTransition',
  'enableCameraControls',
  'enableCameraUpdate',
] as const

const canvasExportProps = computed(() => pickState(canvasExportKeys))
const gradientExportProps = computed(() => pickState(gradientExportKeys))

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
</script>

<template>
  <div class="app">
    <div ref="canvasRef" class="gradient-bg" />

    <section class="compare-dock">
      <header class="compare-header">
        <div>
          <p class="compare-kicker">Preset Compare</p>
          <h2>Official vs Local</h2>
        </div>
        <p class="compare-note">
          Same preset, same controls. The page background is local core; the card below is official
          <code>@shadergradient/react</code>.
        </p>
      </header>
      <div class="compare-grid">
        <div class="compare-preview-block">
          <div ref="officialCompareRef" class="official-preview" />
        </div>
      </div>
    </section>

    <Transition name="fade">
      <button
        v-if="!panelOpen"
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
          <line x1="4" y1="21" x2="4" y2="14" />
          <line x1="4" y1="10" x2="4" y2="3" />
          <line x1="12" y1="21" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12" y2="3" />
          <line x1="20" y1="21" x2="20" y2="16" />
          <line x1="20" y1="12" x2="20" y2="3" />
          <line x1="1" y1="14" x2="7" y2="14" />
          <line x1="9" y1="8" x2="15" y2="8" />
          <line x1="17" y1="16" x2="23" y2="16" />
        </svg>
      </button>
    </Transition>

    <Transition name="slide">
      <aside v-if="panelOpen" class="panel">
        <header class="panel-header">
          <div class="panel-title">
            <h1>Shader Gradient</h1>
            <span class="badge">Playground</span>
          </div>
          <button
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
            <h2 class="section-title">Presets</h2>
            <div class="chip-row">
              <button
                v-for="[name, preset] in presetEntries"
                :key="name"
                :class="{ active: state.preset === name }"
                @click="selectPreset(name)"
              >
                {{ preset.title }}
              </button>
            </div>
          </section>

          <!-- Shape -->
          <section class="section">
            <h2 class="section-title">Shape</h2>
            <div class="field-grid">
              <div class="field">
                <label>Mesh Type</label>
                <select v-model="state.type">
                  <option value="plane">Plane</option>
                  <option value="sphere">Sphere</option>
                  <option value="waterPlane">Water Plane</option>
                </select>
              </div>
              <div class="field">
                <label>Shader</label>
                <select v-model="state.shader">
                  <option value="defaults">defaults</option>
                  <option value="positionMix">positionMix</option>
                  <option value="cosmic">cosmic</option>
                  <option value="glass">glass</option>
                </select>
              </div>
            </div>
          </section>

          <!-- Colors -->
          <section class="section">
            <h2 class="section-title">Colors</h2>
            <div class="color-row">
              <label class="color-field">
                <input v-model="state.color1" type="color" />
                <span>Color 1</span>
              </label>
              <label class="color-field">
                <input v-model="state.color2" type="color" />
                <span>Color 2</span>
              </label>
              <label class="color-field">
                <input v-model="state.color3" type="color" />
                <span>Color 3</span>
              </label>
            </div>
          </section>

          <!-- Noise -->
          <section class="section">
            <h2 class="section-title">Noise</h2>
            <div class="slider-group">
              <div v-for="s in noiseSliders" :key="s.key" class="slider-field">
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
                />
              </div>
            </div>
          </section>

          <!-- Lighting -->
          <section class="section">
            <h2 class="section-title">Lighting</h2>
            <div class="field-grid">
              <div class="field">
                <label>Type</label>
                <select v-model="state.lightType">
                  <option value="3d">3D</option>
                  <option value="env">Environment</option>
                </select>
              </div>
              <div class="field">
                <label>Environment</label>
                <select v-model="state.envPreset">
                  <option value="city">City</option>
                  <option value="dawn">Dawn</option>
                  <option value="lobby">Lobby</option>
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
                />
              </div>
            </div>
          </section>

          <!-- Camera -->
          <section class="section">
            <h2 class="section-title">Camera</h2>
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
                />
              </div>
            </div>
          </section>

          <!-- Options -->
          <section class="section">
            <h2 class="section-title">Options</h2>
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
                />
                <span>{{ t.label }}</span>
              </label>
            </div>
          </section>

          <!-- Export -->
          <section class="section">
            <h2 class="section-title">Export</h2>
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
              <button class="copy-btn" @click="copyQuery">
                {{ copied ? 'Copied!' : 'Copy' }}
              </button>
            </div>
          </section>
        </div>
      </aside>
    </Transition>
  </div>
</template>
