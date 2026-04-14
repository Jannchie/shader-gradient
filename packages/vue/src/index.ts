import { ShaderGradient as CoreShaderGradient } from '@shader-gradient/core'
import type {
  EnvironmentPreset,
  LightType,
  MeshType,
  ShaderGradientCameraUpdate,
  ShaderGradientInput,
  ShaderGradientOptions,
  ShaderGradientPresetName,
  ToggleState,
} from '@shader-gradient/core'
import {
  DEFAULT_OPTIONS,
  parseShaderGradientQuery,
  presetEntries,
  presets,
  resolveShaderGradientOptions,
  serializeShaderGradientOptions,
} from '@shader-gradient/core'
import {
  computed,
  defineComponent,
  h,
  inject,
  onBeforeUnmount,
  onMounted,
  PropType,
  provide,
  ref,
  shallowRef,
  watch,
  watchEffect,
} from 'vue'

type CanvasContextValue = {
  container: ReturnType<typeof shallowRef<HTMLDivElement | null>>
  defaults: { value: Pick<ShaderGradientInput, 'pixelDensity' | 'fov' | 'preserveDrawingBuffer' | 'powerPreference'> }
}

const CONTEXT_KEY = Symbol('shader-gradient-canvas')

const shaderGradientProps = {
  preset: String as PropType<ShaderGradientPresetName>,
  type: String as PropType<MeshType>,
  control: String as PropType<'props' | 'query'>,
  urlString: String,
  animate: [Boolean, String] as PropType<boolean | ToggleState>,
  uTime: Number,
  uSpeed: Number,
  speed: Number,
  uStrength: Number,
  strength: Number,
  uDensity: Number,
  density: Number,
  uFrequency: Number,
  frequency: Number,
  uAmplitude: Number,
  amplitude: Number,
  range: [Boolean, String] as PropType<boolean | 'enabled' | 'disabled'>,
  rangeStart: Number,
  rangeEnd: Number,
  loop: [Boolean, String] as PropType<boolean | ToggleState>,
  loopDuration: Number,
  positionX: Number,
  positionY: Number,
  positionZ: Number,
  rotationX: Number,
  rotationY: Number,
  rotationZ: Number,
  color1: String,
  color2: String,
  color3: String,
  reflection: Number,
  wireframe: Boolean,
  shader: String,
  cAzimuthAngle: Number,
  cameraAzimuth: Number,
  cPolarAngle: Number,
  cameraPolar: Number,
  cDistance: Number,
  cameraDistance: Number,
  cameraZoom: Number,
  fov: Number,
  lightType: String as PropType<LightType>,
  brightness: Number,
  envPreset: String as PropType<EnvironmentPreset>,
  grain: [Boolean, String] as PropType<boolean | ToggleState>,
  grainBlending: Number,
  toggleAxis: Boolean,
  axesHelper: [Boolean, String] as PropType<boolean | ToggleState>,
  zoomOut: Boolean,
  hoverState: String,
  smoothTime: Number,
  enableTransition: Boolean,
  enableCameraControls: Boolean,
  enableCameraUpdate: Boolean,
  pixelDensity: Number,
  pixelRatio: Number,
  preserveDrawingBuffer: Boolean,
  powerPreference: String as PropType<WebGLPowerPreference>,
  onCameraUpdate: Function as PropType<(updates: ShaderGradientCameraUpdate) => void>,
}

function toInput(props: Record<string, unknown>): ShaderGradientInput {
  return Object.fromEntries(Object.entries(props).filter(([, value]) => value !== undefined)) as ShaderGradientInput
}

export const ShaderGradientCanvas = defineComponent({
  name: 'ShaderGradientCanvas',
  props: {
    pixelDensity: Number,
    fov: Number,
    className: String,
    style: {
      type: [String, Object, Array] as PropType<unknown>,
      default: undefined,
    },
    pointerEvents: {
      type: String as PropType<'none' | 'auto'>,
      default: 'auto',
    },
    lazyLoad: {
      type: Boolean,
      default: true,
    },
    threshold: {
      type: Number,
      default: 0.1,
    },
    rootMargin: {
      type: String,
      default: '0px',
    },
    preserveDrawingBuffer: Boolean,
    powerPreference: String as PropType<WebGLPowerPreference>,
  },
  setup(props, { slots }) {
    const container = shallowRef<HTMLDivElement | null>(null)
    const isInView = ref(!props.lazyLoad)
    let observer: IntersectionObserver | null = null

    const defaults = computed(() => ({
      pixelDensity: props.pixelDensity,
      fov: props.fov,
      preserveDrawingBuffer: props.preserveDrawingBuffer,
      powerPreference: props.powerPreference,
    }))

    provide<CanvasContextValue>(CONTEXT_KEY, { container, defaults })

    onMounted(() => {
      if (!props.lazyLoad || !container.value) return

      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            isInView.value = true
            observer?.disconnect()
          }
        },
        {
          threshold: props.threshold,
          rootMargin: props.rootMargin,
        },
      )

      observer.observe(container.value)
    })

    onBeforeUnmount(() => observer?.disconnect())

    return () =>
      h(
        'div',
        {
          ref: container,
          class: props.className,
          style: {
            position: 'relative',
            width: '100%',
            height: '100%',
            pointerEvents: props.pointerEvents,
            ...(typeof props.style === 'object' && !Array.isArray(props.style) ? props.style : {}),
          },
        },
        !props.lazyLoad || isInView.value ? slots.default?.() : [],
      )
  },
})

export const ShaderGradient = defineComponent({
  name: 'ShaderGradient',
  props: shaderGradientProps,
  setup(props) {
    const context = inject<CanvasContextValue | null>(CONTEXT_KEY, null)
    const instance = shallowRef<CoreShaderGradient | null>(null)

    if (!context) {
      throw new Error('ShaderGradient must be used inside ShaderGradientCanvas.')
    }

    watch(
      () => context.container.value,
      (container, _, onCleanup) => {
        if (!container) return

        const created = new CoreShaderGradient(container, {
          ...context.defaults.value,
          ...toInput(props),
        })
        instance.value = created

        onCleanup(() => {
          created.dispose()
          if (instance.value === created) {
            instance.value = null
          }
        })
      },
      { immediate: true },
    )

    watchEffect(() => {
      if (!instance.value) return
      instance.value.update({
        ...context.defaults.value,
        ...toInput(props),
      })
    })

    return () => null
  },
})

export type { ShaderGradientInput, ShaderGradientOptions }
export {
  DEFAULT_OPTIONS,
  parseShaderGradientQuery,
  presetEntries,
  presets,
  resolveShaderGradientOptions,
  serializeShaderGradientOptions,
}
