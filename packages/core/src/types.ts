export type MeshType = 'plane' | 'sphere' | 'waterPlane'
export type ToggleState = 'on' | 'off'
export type RangeState = 'enabled' | 'disabled'
export type ShaderControlMode = 'props' | 'query'
export type LightType = '3d' | 'env'
export type EnvironmentPreset = 'city' | 'dawn' | 'lobby'
export type ShaderName = 'defaults' | 'positionMix' | 'cosmic' | 'glass'

export type ShaderGradientPresetName =
  | 'halo'
  | 'pensive'
  | 'mint'
  | 'interstella'
  | 'nightyNight'
  | 'violaOrientalis'
  | 'universe'
  | 'sunset'
  | 'mandarin'
  | 'cottonCandy'

export interface ShaderGradientCameraUpdate {
  cAzimuthAngle: number
  cPolarAngle: number
  cDistance: number
  cameraZoom: number
}

export interface ShaderGradientInput {
  preset?: ShaderGradientPresetName
  type?: MeshType
  control?: ShaderControlMode
  urlString?: string

  animate?: boolean | ToggleState
  uTime?: number
  uSpeed?: number
  speed?: number
  uStrength?: number
  strength?: number
  uDensity?: number
  density?: number
  uFrequency?: number
  frequency?: number
  uAmplitude?: number
  amplitude?: number

  range?: boolean | RangeState
  rangeStart?: number
  rangeEnd?: number
  loop?: boolean | ToggleState
  loopDuration?: number

  positionX?: number
  positionY?: number
  positionZ?: number
  rotationX?: number
  rotationY?: number
  rotationZ?: number

  color1?: string
  color2?: string
  color3?: string

  reflection?: number
  wireframe?: boolean
  shader?: ShaderName | string

  cAzimuthAngle?: number
  cameraAzimuth?: number
  cPolarAngle?: number
  cameraPolar?: number
  cDistance?: number
  cameraDistance?: number
  cameraZoom?: number
  fov?: number

  lightType?: LightType
  brightness?: number
  envPreset?: EnvironmentPreset
  grain?: boolean | ToggleState
  grainBlending?: number

  toggleAxis?: boolean
  axesHelper?: boolean | ToggleState
  zoomOut?: boolean
  hoverState?: string

  smoothTime?: number
  enableTransition?: boolean
  enableCameraControls?: boolean
  enableCameraUpdate?: boolean

  pixelDensity?: number
  pixelRatio?: number
  preserveDrawingBuffer?: boolean
  powerPreference?: WebGLPowerPreference
  envBasePath?: string

  onCameraUpdate?: (updates: ShaderGradientCameraUpdate) => void
}

export interface ShaderGradientOptions {
  preset?: ShaderGradientPresetName
  type: MeshType
  control: ShaderControlMode
  urlString: string

  animate: boolean
  uTime: number
  uSpeed: number
  uStrength: number
  uDensity: number
  uFrequency: number
  uAmplitude: number

  range: boolean
  rangeStart: number
  rangeEnd: number
  loop: boolean
  loopDuration: number

  positionX: number
  positionY: number
  positionZ: number
  rotationX: number
  rotationY: number
  rotationZ: number

  color1: string
  color2: string
  color3: string

  reflection: number
  wireframe: boolean
  shader: ShaderName

  cAzimuthAngle: number
  cPolarAngle: number
  cDistance: number
  cameraZoom: number
  fov: number

  lightType: LightType
  brightness: number
  envPreset: EnvironmentPreset
  grain: boolean
  grainBlending: number

  toggleAxis: boolean
  zoomOut: boolean
  hoverState: string

  smoothTime: number
  enableTransition: boolean
  enableCameraControls: boolean
  enableCameraUpdate: boolean

  pixelDensity: number
  preserveDrawingBuffer: boolean
  powerPreference?: WebGLPowerPreference
  envBasePath: string

  onCameraUpdate?: (updates: ShaderGradientCameraUpdate) => void
}

export interface ShaderGradientPreset {
  title: string
  color: string
  props: Partial<ShaderGradientInput>
}
