import type { EnvironmentPreset, RangeState, ShaderGradientCameraUpdate, ToggleState } from './types'

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180
}

export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI
}

export function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.trim().replace('#', '')
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized

  return [
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255,
  ]
}

export function rgbToHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b]
    .map((value) => Math.round(clamp(value, 0, 1) * 255).toString(16).padStart(2, '0'))
    .join('')}`
}

export function parseToggle(value: boolean | ToggleState | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback
  if (typeof value === 'boolean') return value
  return value === 'on'
}

export function parseRangeState(value: boolean | RangeState | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback
  if (typeof value === 'boolean') return value
  return value === 'enabled'
}

export function parseNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

export function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    if (value === 'true' || value === 'on' || value === 'enabled') return true
    if (value === 'false' || value === 'off' || value === 'disabled') return false
  }
  return fallback
}

export function damp(current: number, target: number, smoothing: number, delta: number): number {
  const lambda = Math.max(0.0001, 1 / Math.max(0.001, smoothing))
  return current + (target - current) * (1 - Math.exp(-lambda * delta))
}

export function dampColor(
  current: [number, number, number],
  target: [number, number, number],
  smoothing: number,
  delta: number,
): [number, number, number] {
  return [
    damp(current[0], target[0], smoothing, delta),
    damp(current[1], target[1], smoothing, delta),
    damp(current[2], target[2], smoothing, delta),
  ]
}

export function formatUrlString(urlString: string): string {
  return urlString
    .replace('http://localhost:3001/customize', '')
    .replace('https://shadergradient.co/customize', '')
    .replace('https://www.shadergradient.co/customize', '')
}

export function cameraPositionFromSpherical(update: ShaderGradientCameraUpdate) {
  const azimuth = degToRad(update.cAzimuthAngle)
  const polar = degToRad(update.cPolarAngle)
  const distance = update.cDistance

  return {
    x: distance * Math.sin(polar) * Math.sin(azimuth),
    y: distance * Math.cos(polar),
    z: distance * Math.sin(polar) * Math.cos(azimuth),
  }
}

export function environmentTint(preset: EnvironmentPreset): [number, number, number] {
  switch (preset) {
    case 'dawn':
      return [1.0, 0.78, 0.6]
    case 'lobby':
      return [0.78, 0.84, 1.0]
    default:
      return [0.92, 0.95, 1.0]
  }
}
