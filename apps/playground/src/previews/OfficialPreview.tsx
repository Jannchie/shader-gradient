import { ShaderGradient, ShaderGradientCanvas } from '@shadergradient/react'

interface OfficialPreviewProps {
  state: Record<string, unknown>
}

function toOnOff(value: unknown): 'on' | 'off' {
  if (value === 'off' || value === false || value === 0) {
    return 'off'
  }
  if (value === 'on' || value === true) {
    return 'on'
  }
  return value ? 'on' : 'off'
}
function toEnabledDisabled(value: unknown): 'enabled' | 'disabled' {
  if (value === 'disabled' || value === false || value === 0) {
    return 'disabled'
  }
  if (value === 'enabled' || value === true) {
    return 'enabled'
  }
  return value ? 'enabled' : 'disabled'
}

function toOfficialProps(state: Record<string, unknown>) {
  const colors = Array.isArray(state.colors) ? (state.colors as string[]) : []
  const props = {
    type: state.type,
    animate: toOnOff(state.animate),
    uTime: state.uTime,
    uSpeed: state.uSpeed,
    uStrength: state.uStrength,
    uDensity: state.uDensity,
    uFrequency: state.uFrequency,
    uAmplitude: state.uAmplitude,
    range: toEnabledDisabled(state.range),
    rangeStart: state.rangeStart,
    rangeEnd: state.rangeEnd,
    loop: toOnOff(state.loop),
    loopDuration: state.loopDuration,
    positionX: state.positionX,
    positionY: state.positionY,
    positionZ: state.positionZ,
    rotationX: state.rotationX,
    rotationY: state.rotationY,
    rotationZ: state.rotationZ,
    color1: colors[0] ?? state.color1,
    color2: colors[1] ?? state.color2,
    color3: colors[2] ?? state.color3,
    reflection: state.reflection,
    wireframe: state.wireframe,
    shader: state.shader,
    smoothTime: state.smoothTime,
    cAzimuthAngle: state.cAzimuthAngle,
    cPolarAngle: state.cPolarAngle,
    cDistance: state.cDistance,
    cameraZoom: state.cameraZoom,
    lightType: state.lightType,
    brightness: state.brightness,
    envPreset: state.envPreset,
    grain: toOnOff(state.grain),
    grainBlending: state.grainBlending,
    zoomOut: state.zoomOut,
    toggleAxis: state.toggleAxis,
    hoverState: state.hoverState,
    enableTransition: state.enableTransition,
    enableCameraUpdate: state.enableCameraUpdate,
    control: 'props' as const,
  }

  return {
    ...Object.fromEntries(
      Object.entries(props).filter(([, value]) => value !== undefined),
    ),
  }
}

export function OfficialPreview({ state }: OfficialPreviewProps) {
  const props = toOfficialProps(state)

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ShaderGradientCanvas pixelDensity={1} fov={Number(state.fov ?? 45)}>
        <ShaderGradient {...props} />
      </ShaderGradientCanvas>
    </div>
  )
}
