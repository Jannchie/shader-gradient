import { ShaderGradient, ShaderGradientCanvas } from '@shadergradient/react'

type OfficialPreviewProps = {
  state: Record<string, unknown>
}

const toOnOff = (value: unknown): 'on' | 'off' => (value ? 'on' : 'off')
const toEnabledDisabled = (value: unknown): 'enabled' | 'disabled' =>
  value ? 'enabled' : 'disabled'

function toOfficialProps(state: Record<string, unknown>) {
  return {
    ...state,
    animate: toOnOff(state.animate),
    grain: toOnOff(state.grain),
    range: toEnabledDisabled(state.range),
    loop: toOnOff(state.loop),
    control: 'props' as const,
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
