import type { ShaderGradientOptions } from './types'

export const DEFAULT_OPTIONS: ShaderGradientOptions = {
  type: 'plane',
  control: 'props',
  urlString: '',

  animate: true,
  uTime: 0,
  uSpeed: 0.4,
  uStrength: 4,
  uDensity: 1.3,
  uFrequency: 5.5,
  uAmplitude: 1,

  range: false,
  rangeStart: 0,
  rangeEnd: 40,
  loop: false,
  loopDuration: 8,

  positionX: -1.4,
  positionY: 0,
  positionZ: 0,
  rotationX: 0,
  rotationY: 10,
  rotationZ: 50,

  color1: '#ff5005',
  color2: '#dbba95',
  color3: '#d0bce1',

  reflection: 0.1,
  wireframe: false,
  shader: 'defaults',

  cAzimuthAngle: 180,
  cPolarAngle: 90,
  cDistance: 3.6,
  cameraZoom: 1,
  fov: 45,

  lightType: '3d',
  brightness: 1.2,
  envPreset: 'city',
  grain: false,
  grainBlending: 1,

  toggleAxis: false,
  zoomOut: false,
  hoverState: '',

  smoothTime: 0.14,
  enableTransition: false,
  enableCameraControls: false,
  enableCameraUpdate: false,

  pixelDensity: 2,
  preserveDrawingBuffer: false,
  powerPreference: undefined,
  envBasePath: 'https://ruucm.github.io/shadergradient/ui@0.0.0/assets/hdr/',

  onCameraUpdate: undefined,
}
