import { ShaderGradient, ShaderGradientCanvas } from '@shadergradient/react'

type OfficialPreviewProps = {
  state: Record<string, unknown>
}

const toOnOff = (value: unknown): 'on' | 'off' => (value ? 'on' : 'off')
const toEnabledDisabled = (value: unknown): 'enabled' | 'disabled' =>
  value ? 'enabled' : 'disabled'

function toOfficialProps(state: Record<string, unknown>) {
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
    color1: state.color1,
    color2: state.color2,
    color3: state.color3,
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
