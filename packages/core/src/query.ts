import { DEFAULT_OPTIONS } from './defaults'
import { presets } from './presets'
import type { ShaderGradientInput, ShaderGradientOptions, ShaderName } from './types'
import { clamp, formatUrlString, parseBoolean, parseNumber, parseRangeState, parseToggle } from './utils'

const KNOWN_PRESETS = new Set(Object.keys(presets))
const KNOWN_SHADERS = new Set<ShaderName>(['defaults', 'positionMix', 'cosmic', 'glass', 'lava'])

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

  return {
    preset:
      has('preset') && typeof params.preset === 'string' && KNOWN_PRESETS.has(params.preset)
        ? (params.preset as keyof typeof presets)
        : undefined,
    type:
      has('type') && typeof params.type === 'string'
        ? (params.type as ShaderGradientInput['type'])
        : undefined,
    animate: has('animate') ? parseBoolean(params.animate, DEFAULT_OPTIONS.animate) : undefined,
    uTime: has('uTime') ? parseNumber(params.uTime, DEFAULT_OPTIONS.uTime) : undefined,
    uSpeed: has('uSpeed') ? parseNumber(params.uSpeed, DEFAULT_OPTIONS.uSpeed) : undefined,
    uStrength: has('uStrength') ? parseNumber(params.uStrength, DEFAULT_OPTIONS.uStrength) : undefined,
    uDensity: has('uDensity') ? parseNumber(params.uDensity, DEFAULT_OPTIONS.uDensity) : undefined,
    uFrequency: has('uFrequency') ? parseNumber(params.uFrequency, DEFAULT_OPTIONS.uFrequency) : undefined,
    uAmplitude: has('uAmplitude') ? parseNumber(params.uAmplitude, DEFAULT_OPTIONS.uAmplitude) : undefined,
    range: has('range') ? parseBoolean(params.range, DEFAULT_OPTIONS.range) : undefined,
    rangeStart: has('rangeStart') ? parseNumber(params.rangeStart, DEFAULT_OPTIONS.rangeStart) : undefined,
    rangeEnd: has('rangeEnd') ? parseNumber(params.rangeEnd, DEFAULT_OPTIONS.rangeEnd) : undefined,
    loop: has('loop') ? parseBoolean(params.loop, DEFAULT_OPTIONS.loop) : undefined,
    loopDuration: has('loopDuration') ? parseNumber(params.loopDuration, DEFAULT_OPTIONS.loopDuration) : undefined,
    positionX: has('positionX') ? parseNumber(params.positionX, DEFAULT_OPTIONS.positionX) : undefined,
    positionY: has('positionY') ? parseNumber(params.positionY, DEFAULT_OPTIONS.positionY) : undefined,
    positionZ: has('positionZ') ? parseNumber(params.positionZ, DEFAULT_OPTIONS.positionZ) : undefined,
    rotationX: has('rotationX') ? parseNumber(params.rotationX, DEFAULT_OPTIONS.rotationX) : undefined,
    rotationY: has('rotationY') ? parseNumber(params.rotationY, DEFAULT_OPTIONS.rotationY) : undefined,
    rotationZ: has('rotationZ') ? parseNumber(params.rotationZ, DEFAULT_OPTIONS.rotationZ) : undefined,
    color1: has('color1') && typeof params.color1 === 'string' ? params.color1 : undefined,
    color2: has('color2') && typeof params.color2 === 'string' ? params.color2 : undefined,
    color3: has('color3') && typeof params.color3 === 'string' ? params.color3 : undefined,
    reflection: has('reflection') ? parseNumber(params.reflection, DEFAULT_OPTIONS.reflection) : undefined,
    wireframe: has('wireframe') ? parseBoolean(params.wireframe, DEFAULT_OPTIONS.wireframe) : undefined,
    shader:
      has('shader') && typeof params.shader === 'string' && KNOWN_SHADERS.has(params.shader as ShaderName)
        ? (params.shader as ShaderName)
        : undefined,
    cAzimuthAngle: has('cAzimuthAngle') ? parseNumber(params.cAzimuthAngle, DEFAULT_OPTIONS.cAzimuthAngle) : undefined,
    cPolarAngle: has('cPolarAngle') ? parseNumber(params.cPolarAngle, DEFAULT_OPTIONS.cPolarAngle) : undefined,
    cDistance: has('cDistance') ? parseNumber(params.cDistance, DEFAULT_OPTIONS.cDistance) : undefined,
    cameraZoom: has('cameraZoom') ? parseNumber(params.cameraZoom, DEFAULT_OPTIONS.cameraZoom) : undefined,
    lightType:
      has('lightType') && typeof params.lightType === 'string'
        ? (params.lightType as ShaderGradientInput['lightType'])
        : undefined,
    brightness: has('brightness') ? parseNumber(params.brightness, DEFAULT_OPTIONS.brightness) : undefined,
    envPreset:
      has('envPreset') && typeof params.envPreset === 'string'
        ? (params.envPreset as ShaderGradientInput['envPreset'])
        : undefined,
    grain: has('grain') ? parseBoolean(params.grain, DEFAULT_OPTIONS.grain) : undefined,
    grainBlending: has('grainBlending') ? parseNumber(params.grainBlending, DEFAULT_OPTIONS.grainBlending) : undefined,
    toggleAxis: has('toggleAxis') ? parseBoolean(params.toggleAxis, DEFAULT_OPTIONS.toggleAxis) : undefined,
    pixelDensity: has('pixelDensity') ? parseNumber(params.pixelDensity, DEFAULT_OPTIONS.pixelDensity) : undefined,
    fov: has('fov') ? parseNumber(params.fov, DEFAULT_OPTIONS.fov) : undefined,
    preserveDrawingBuffer: has('preserveDrawingBuffer')
      ? parseBoolean(params.preserveDrawingBuffer, DEFAULT_OPTIONS.preserveDrawingBuffer)
      : undefined,
    powerPreference:
      has('powerPreference') && typeof params.powerPreference === 'string'
        ? (params.powerPreference as WebGLPowerPreference)
        : undefined,
  }
}

export function resolveShaderGradientOptions(input: Partial<ShaderGradientInput> = {}): ShaderGradientOptions {
  const queryInput =
    input.control === 'query' && input.urlString ? parseShaderGradientQuery(input.urlString) : undefined
  const presetInput =
    (queryInput?.preset ?? input.preset) && presets[(queryInput?.preset ?? input.preset) as keyof typeof presets]
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

    color1: merged.color1 ?? DEFAULT_OPTIONS.color1,
    color2: merged.color2 ?? DEFAULT_OPTIONS.color2,
    color3: merged.color3 ?? DEFAULT_OPTIONS.color3,

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
    ['color1', options.color1],
    ['color2', options.color2],
    ['color3', options.color3],
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
