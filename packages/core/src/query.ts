import type { ShaderGradientInput, ShaderGradientOptions, ShaderName } from './types'
import { DEFAULT_OPTIONS } from './defaults'
import { presets } from './presets'
import { MAX_COLOR_STOPS } from './types'
import { clamp, formatUrlString, parseBoolean, parseNumber, parseRangeState, parseToggle } from './utils'

function mergeColorStops(input: Partial<ShaderGradientInput>): string[] {
  if (Array.isArray(input.colors) && input.colors.length > 0) {
    return input.colors.slice(0, MAX_COLOR_STOPS)
  }
  const legacy: string[] = []
  for (let i = 1; i <= 7; i++) {
    const key = `color${i}` as keyof ShaderGradientInput
    const value = input[key]
    if (typeof value === 'string') {
      legacy.push(value)
    }
  }
  return legacy.length > 0 ? legacy : DEFAULT_OPTIONS.colors.slice()
}

const KNOWN_PRESETS = new Set(Object.keys(presets))
const KNOWN_SHADERS = new Set<ShaderName>(['defaults', 'positionMix', 'cosmic', 'glass', 'lava', 'aurora', 'marble', 'pulse', 'spectrum', 'halo'])

type QueryValue = string | number | boolean

function parseSearchParams(urlString: string): Record<string, QueryValue> {
  const trimmed = formatUrlString(urlString).trim()
  const search = trimmed.startsWith('?') ? trimmed.slice(1) : trimmed.split('?')[1] ?? trimmed
  const params = new URLSearchParams(search)
  const result: Record<string, QueryValue> = {}

  for (const [key, value] of params.entries()) {
    if (value === 'true' || value === 'false') {
      result[key] = value === 'true'
      continue
    }

    const numeric = Number(value)
    result[key] = Number.isFinite(numeric) && value.trim() !== '' ? numeric : value
  }

  return result
}

export function parseShaderGradientQuery(urlString: string): Partial<ShaderGradientInput> {
  const params = parseSearchParams(urlString)
  const has = (key: string) => Object.prototype.hasOwnProperty.call(params, key)
  const result: Partial<ShaderGradientInput> = {}

  if (has('preset') && typeof params.preset === 'string' && KNOWN_PRESETS.has(params.preset)) {
    result.preset = params.preset as keyof typeof presets
  }
  if (has('type') && typeof params.type === 'string') {
    result.type = params.type as ShaderGradientInput['type']
  }
  if (has('animate')) {
    result.animate = parseBoolean(params.animate, DEFAULT_OPTIONS.animate)
  }
  if (has('uTime')) {
    result.uTime = parseNumber(params.uTime, DEFAULT_OPTIONS.uTime)
  }
  if (has('uSpeed')) {
    result.uSpeed = parseNumber(params.uSpeed, DEFAULT_OPTIONS.uSpeed)
  }
  if (has('uStrength')) {
    result.uStrength = parseNumber(params.uStrength, DEFAULT_OPTIONS.uStrength)
  }
  if (has('uDensity')) {
    result.uDensity = parseNumber(params.uDensity, DEFAULT_OPTIONS.uDensity)
  }
  if (has('uFrequency')) {
    result.uFrequency = parseNumber(params.uFrequency, DEFAULT_OPTIONS.uFrequency)
  }
  if (has('uAmplitude')) {
    result.uAmplitude = parseNumber(params.uAmplitude, DEFAULT_OPTIONS.uAmplitude)
  }
  if (has('range')) {
    result.range = parseBoolean(params.range, DEFAULT_OPTIONS.range)
  }
  if (has('rangeStart')) {
    result.rangeStart = parseNumber(params.rangeStart, DEFAULT_OPTIONS.rangeStart)
  }
  if (has('rangeEnd')) {
    result.rangeEnd = parseNumber(params.rangeEnd, DEFAULT_OPTIONS.rangeEnd)
  }
  if (has('loop')) {
    result.loop = parseBoolean(params.loop, DEFAULT_OPTIONS.loop)
  }
  if (has('loopDuration')) {
    result.loopDuration = parseNumber(params.loopDuration, DEFAULT_OPTIONS.loopDuration)
  }
  if (has('positionX')) {
    result.positionX = parseNumber(params.positionX, DEFAULT_OPTIONS.positionX)
  }
  if (has('positionY')) {
    result.positionY = parseNumber(params.positionY, DEFAULT_OPTIONS.positionY)
  }
  if (has('positionZ')) {
    result.positionZ = parseNumber(params.positionZ, DEFAULT_OPTIONS.positionZ)
  }
  if (has('rotationX')) {
    result.rotationX = parseNumber(params.rotationX, DEFAULT_OPTIONS.rotationX)
  }
  if (has('rotationY')) {
    result.rotationY = parseNumber(params.rotationY, DEFAULT_OPTIONS.rotationY)
  }
  if (has('rotationZ')) {
    result.rotationZ = parseNumber(params.rotationZ, DEFAULT_OPTIONS.rotationZ)
  }
  if (has('colors') && typeof params.colors === 'string') {
    const parts = params.colors.split(',').map(s => s.trim()).filter(s => s.length > 0)
    if (parts.length > 0) {
      result.colors = parts.slice(0, MAX_COLOR_STOPS)
    }
  }
  for (let i = 1; i <= 7; i++) {
    const key = `color${i}`
    if (has(key) && typeof params[key] === 'string') {
      ;(result as Record<string, string>)[key] = params[key] as string
    }
  }
  if (has('reflection')) {
    result.reflection = parseNumber(params.reflection, DEFAULT_OPTIONS.reflection)
  }
  if (has('wireframe')) {
    result.wireframe = parseBoolean(params.wireframe, DEFAULT_OPTIONS.wireframe)
  }
  if (has('shader') && typeof params.shader === 'string' && KNOWN_SHADERS.has(params.shader as ShaderName)) {
    result.shader = params.shader as ShaderName
  }
  if (has('cAzimuthAngle')) {
    result.cAzimuthAngle = parseNumber(params.cAzimuthAngle, DEFAULT_OPTIONS.cAzimuthAngle)
  }
  if (has('cPolarAngle')) {
    result.cPolarAngle = parseNumber(params.cPolarAngle, DEFAULT_OPTIONS.cPolarAngle)
  }
  if (has('cDistance')) {
    result.cDistance = parseNumber(params.cDistance, DEFAULT_OPTIONS.cDistance)
  }
  if (has('cameraZoom')) {
    result.cameraZoom = parseNumber(params.cameraZoom, DEFAULT_OPTIONS.cameraZoom)
  }
  if (has('lightType') && typeof params.lightType === 'string') {
    result.lightType = params.lightType as ShaderGradientInput['lightType']
  }
  if (has('brightness')) {
    result.brightness = parseNumber(params.brightness, DEFAULT_OPTIONS.brightness)
  }
  if (has('envPreset') && typeof params.envPreset === 'string') {
    result.envPreset = params.envPreset as ShaderGradientInput['envPreset']
  }
  if (has('grain')) {
    result.grain = parseBoolean(params.grain, DEFAULT_OPTIONS.grain)
  }
  if (has('grainBlending')) {
    result.grainBlending = parseNumber(params.grainBlending, DEFAULT_OPTIONS.grainBlending)
  }
  if (has('bloom')) {
    result.bloom = parseBoolean(params.bloom, DEFAULT_OPTIONS.bloom)
  }
  if (has('bloomStrength')) {
    result.bloomStrength = parseNumber(params.bloomStrength, DEFAULT_OPTIONS.bloomStrength)
  }
  if (has('bloomRadius')) {
    result.bloomRadius = parseNumber(params.bloomRadius, DEFAULT_OPTIONS.bloomRadius)
  }
  if (has('bloomThreshold')) {
    result.bloomThreshold = parseNumber(params.bloomThreshold, DEFAULT_OPTIONS.bloomThreshold)
  }
  if (has('vignette')) {
    result.vignette = parseBoolean(params.vignette, DEFAULT_OPTIONS.vignette)
  }
  if (has('vignetteStrength')) {
    result.vignetteStrength = parseNumber(params.vignetteStrength, DEFAULT_OPTIONS.vignetteStrength)
  }
  if (has('vignetteSoftness')) {
    result.vignetteSoftness = parseNumber(params.vignetteSoftness, DEFAULT_OPTIONS.vignetteSoftness)
  }
  if (has('chromaticAberration')) {
    result.chromaticAberration = parseBoolean(params.chromaticAberration, DEFAULT_OPTIONS.chromaticAberration)
  }
  if (has('chromaticAberrationStrength')) {
    result.chromaticAberrationStrength = parseNumber(params.chromaticAberrationStrength, DEFAULT_OPTIONS.chromaticAberrationStrength)
  }
  if (has('toggleAxis')) {
    result.toggleAxis = parseBoolean(params.toggleAxis, DEFAULT_OPTIONS.toggleAxis)
  }
  if (has('zoomOut')) {
    result.zoomOut = parseBoolean(params.zoomOut, DEFAULT_OPTIONS.zoomOut)
  }
  if (has('pixelDensity')) {
    result.pixelDensity = parseNumber(params.pixelDensity, DEFAULT_OPTIONS.pixelDensity)
  }
  if (has('fov')) {
    result.fov = parseNumber(params.fov, DEFAULT_OPTIONS.fov)
  }
  if (has('preserveDrawingBuffer')) {
    result.preserveDrawingBuffer = parseBoolean(params.preserveDrawingBuffer, DEFAULT_OPTIONS.preserveDrawingBuffer)
  }
  if (has('powerPreference') && typeof params.powerPreference === 'string') {
    result.powerPreference = params.powerPreference as WebGLPowerPreference
  }

  return result
}

export function resolveShaderGradientOptions(input: Partial<ShaderGradientInput> = {}): ShaderGradientOptions {
  const queryInput
    = input.control === 'query' && input.urlString ? parseShaderGradientQuery(input.urlString) : undefined
  const presetInput
    = (queryInput?.preset ?? input.preset) && presets[(queryInput?.preset ?? input.preset) as keyof typeof presets]
      ? presets[(queryInput?.preset ?? input.preset) as keyof typeof presets].props
      : undefined

  const merged: Partial<ShaderGradientInput> = {
    ...presetInput,
    ...input,
    ...queryInput,
  }

  return {
    preset: merged.preset,
    type: merged.type ?? DEFAULT_OPTIONS.type,
    control: merged.control ?? DEFAULT_OPTIONS.control,
    urlString: merged.urlString ?? DEFAULT_OPTIONS.urlString,

    animate: parseToggle(merged.animate, DEFAULT_OPTIONS.animate),
    uTime: parseNumber(merged.uTime, DEFAULT_OPTIONS.uTime),
    uSpeed: parseNumber(merged.uSpeed ?? merged.speed, DEFAULT_OPTIONS.uSpeed),
    uStrength: parseNumber(merged.uStrength ?? merged.strength, DEFAULT_OPTIONS.uStrength),
    uDensity: parseNumber(merged.uDensity ?? merged.density, DEFAULT_OPTIONS.uDensity),
    uFrequency: parseNumber(merged.uFrequency ?? merged.frequency, DEFAULT_OPTIONS.uFrequency),
    uAmplitude: parseNumber(merged.uAmplitude ?? merged.amplitude, DEFAULT_OPTIONS.uAmplitude),

    range: parseRangeState(merged.range, DEFAULT_OPTIONS.range),
    rangeStart: parseNumber(merged.rangeStart, DEFAULT_OPTIONS.rangeStart),
    rangeEnd: parseNumber(merged.rangeEnd, DEFAULT_OPTIONS.rangeEnd),
    loop: parseToggle(merged.loop, DEFAULT_OPTIONS.loop),
    loopDuration: Math.max(0.1, parseNumber(merged.loopDuration, DEFAULT_OPTIONS.loopDuration)),

    positionX: parseNumber(merged.positionX, DEFAULT_OPTIONS.positionX),
    positionY: parseNumber(merged.positionY, DEFAULT_OPTIONS.positionY),
    positionZ: parseNumber(merged.positionZ, DEFAULT_OPTIONS.positionZ),
    rotationX: parseNumber(merged.rotationX, DEFAULT_OPTIONS.rotationX),
    rotationY: parseNumber(merged.rotationY, DEFAULT_OPTIONS.rotationY),
    rotationZ: parseNumber(merged.rotationZ, DEFAULT_OPTIONS.rotationZ),

    colors: mergeColorStops(merged),

    reflection: clamp(parseNumber(merged.reflection, DEFAULT_OPTIONS.reflection), 0, 1),
    wireframe: parseBoolean(merged.wireframe, DEFAULT_OPTIONS.wireframe),
    shader:
      typeof merged.shader === 'string' && KNOWN_SHADERS.has(merged.shader as ShaderName)
        ? (merged.shader as ShaderName)
        : DEFAULT_OPTIONS.shader,

    cAzimuthAngle: parseNumber(merged.cAzimuthAngle ?? merged.cameraAzimuth, DEFAULT_OPTIONS.cAzimuthAngle),
    cPolarAngle: parseNumber(merged.cPolarAngle ?? merged.cameraPolar, DEFAULT_OPTIONS.cPolarAngle),
    cDistance: Math.max(0.1, parseNumber(merged.cDistance ?? merged.cameraDistance, DEFAULT_OPTIONS.cDistance)),
    cameraZoom: Math.max(0.1, parseNumber(merged.cameraZoom, DEFAULT_OPTIONS.cameraZoom)),
    fov: clamp(parseNumber(merged.fov, DEFAULT_OPTIONS.fov), 10, 120),

    lightType: merged.lightType ?? DEFAULT_OPTIONS.lightType,
    brightness: Math.max(0, parseNumber(merged.brightness, DEFAULT_OPTIONS.brightness)),
    envPreset: merged.envPreset ?? DEFAULT_OPTIONS.envPreset,
    grain: parseToggle(merged.grain, DEFAULT_OPTIONS.grain),
    grainBlending: clamp(parseNumber(merged.grainBlending, DEFAULT_OPTIONS.grainBlending), 0, 1),

    bloom: parseToggle(merged.bloom, DEFAULT_OPTIONS.bloom),
    bloomStrength: Math.max(0, parseNumber(merged.bloomStrength, DEFAULT_OPTIONS.bloomStrength)),
    bloomRadius: clamp(parseNumber(merged.bloomRadius, DEFAULT_OPTIONS.bloomRadius), 0, 1),
    bloomThreshold: clamp(parseNumber(merged.bloomThreshold, DEFAULT_OPTIONS.bloomThreshold), 0, 1),

    vignette: parseToggle(merged.vignette, DEFAULT_OPTIONS.vignette),
    vignetteStrength: clamp(parseNumber(merged.vignetteStrength, DEFAULT_OPTIONS.vignetteStrength), 0, 2),
    vignetteSoftness: clamp(parseNumber(merged.vignetteSoftness, DEFAULT_OPTIONS.vignetteSoftness), 0, 1),

    chromaticAberration: parseToggle(merged.chromaticAberration, DEFAULT_OPTIONS.chromaticAberration),
    chromaticAberrationStrength: clamp(parseNumber(merged.chromaticAberrationStrength, DEFAULT_OPTIONS.chromaticAberrationStrength), 0, 0.05),

    toggleAxis: parseBoolean(merged.toggleAxis ?? merged.axesHelper, DEFAULT_OPTIONS.toggleAxis),
    zoomOut: parseBoolean(merged.zoomOut, DEFAULT_OPTIONS.zoomOut),
    hoverState: typeof merged.hoverState === 'string' ? merged.hoverState : DEFAULT_OPTIONS.hoverState,

    smoothTime: Math.max(0.01, parseNumber(merged.smoothTime, DEFAULT_OPTIONS.smoothTime)),
    enableTransition: parseBoolean(merged.enableTransition, DEFAULT_OPTIONS.enableTransition),
    enableCameraControls: parseBoolean(merged.enableCameraControls, DEFAULT_OPTIONS.enableCameraControls),
    enableCameraUpdate: parseBoolean(merged.enableCameraUpdate, DEFAULT_OPTIONS.enableCameraUpdate),

    pixelDensity: clamp(parseNumber(merged.pixelDensity ?? merged.pixelRatio, DEFAULT_OPTIONS.pixelDensity), 0.5, 3),
    preserveDrawingBuffer: parseBoolean(
      merged.preserveDrawingBuffer,
      DEFAULT_OPTIONS.preserveDrawingBuffer,
    ),
    powerPreference: merged.powerPreference ?? DEFAULT_OPTIONS.powerPreference,
    envBasePath: typeof merged.envBasePath === 'string' ? merged.envBasePath : DEFAULT_OPTIONS.envBasePath,

    onCameraUpdate: merged.onCameraUpdate,
  }
}

export function serializeShaderGradientOptions(input: Partial<ShaderGradientInput>): string {
  const options = resolveShaderGradientOptions(input)
  const params = new URLSearchParams()

  const entries: Array<[string, string]> = [
    ['type', options.type],
    ['animate', options.animate ? 'on' : 'off'],
    ['uTime', String(options.uTime)],
    ['uSpeed', String(options.uSpeed)],
    ['uStrength', String(options.uStrength)],
    ['uDensity', String(options.uDensity)],
    ['uFrequency', String(options.uFrequency)],
    ['uAmplitude', String(options.uAmplitude)],
    ['range', options.range ? 'enabled' : 'disabled'],
    ['rangeStart', String(options.rangeStart)],
    ['rangeEnd', String(options.rangeEnd)],
    ['loop', options.loop ? 'on' : 'off'],
    ['loopDuration', String(options.loopDuration)],
    ['positionX', String(options.positionX)],
    ['positionY', String(options.positionY)],
    ['positionZ', String(options.positionZ)],
    ['rotationX', String(options.rotationX)],
    ['rotationY', String(options.rotationY)],
    ['rotationZ', String(options.rotationZ)],
    ['colors', options.colors.join(',')],
    ['reflection', String(options.reflection)],
    ['wireframe', String(options.wireframe)],
    ['shader', options.shader],
    ['cAzimuthAngle', String(options.cAzimuthAngle)],
    ['cPolarAngle', String(options.cPolarAngle)],
    ['cDistance', String(options.cDistance)],
    ['cameraZoom', String(options.cameraZoom)],
    ['lightType', options.lightType],
    ['brightness', String(options.brightness)],
    ['envPreset', options.envPreset],
    ['grain', options.grain ? 'on' : 'off'],
    ['grainBlending', String(options.grainBlending)],
    ['bloom', options.bloom ? 'on' : 'off'],
    ['bloomStrength', String(options.bloomStrength)],
    ['bloomRadius', String(options.bloomRadius)],
    ['bloomThreshold', String(options.bloomThreshold)],
    ['vignette', options.vignette ? 'on' : 'off'],
    ['vignetteStrength', String(options.vignetteStrength)],
    ['vignetteSoftness', String(options.vignetteSoftness)],
    ['chromaticAberration', options.chromaticAberration ? 'on' : 'off'],
    ['chromaticAberrationStrength', String(options.chromaticAberrationStrength)],
    ['toggleAxis', String(options.toggleAxis)],
    ['pixelDensity', String(options.pixelDensity)],
    ['fov', String(options.fov)],
    ['preserveDrawingBuffer', String(options.preserveDrawingBuffer)],
  ]

  for (const [key, value] of entries) {
    params.set(key, value)
  }

  if (options.preset) {
    params.set('preset', options.preset)
  }

  if (options.powerPreference) {
    params.set('powerPreference', options.powerPreference)
  }

  return `?${params.toString()}`
}
