import type {
  WebGLRenderTarget,
} from 'three'
import type { MeshType, ShaderGradientInput, ShaderGradientOptions } from './types'
import CameraControls from 'camera-controls'
import * as THREE from 'three'
import {
  AmbientLight,
  AxesHelper,
  Clock,
  DoubleSide,
  IcosahedronGeometry,
  Mesh,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  ShaderChunk,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three'
import { MAX_COLOR_STOPS } from './types'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'

import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import * as officialShaders from './official-shaders'
import { CHROMATIC_ABERRATION_SHADER } from './postprocessing/chromaticAberrationShader'
import { HALFTONE_SHADER } from './postprocessing/halftoneShader'
import { VIGNETTE_SHADER } from './postprocessing/vignetteShader'
import { BASE_PRESET_PROPS } from './presets'
import { resolveShaderGradientOptions } from './query'
import { damp, dampColor, degToRad, hexToRgb, radToDeg, rgbToHex } from './utils'

const PRESET_FIELD_KEYS = new Set<keyof ShaderGradientInput>(
  Object.keys(BASE_PRESET_PROPS) as (keyof ShaderGradientInput)[],
)

function stripPresetFields(options: ShaderGradientOptions): Partial<ShaderGradientInput> {
  const result: Partial<ShaderGradientInput> = {}
  for (const key of Object.keys(options) as (keyof ShaderGradientOptions)[]) {
    if (PRESET_FIELD_KEYS.has(key as keyof ShaderGradientInput)) {
      continue
    }
    ;(result as Record<string, unknown>)[key] = options[key]
  }
  return result
}

type RGB = [number, number, number]

function buildColorStops(options: ShaderGradientOptions): RGB[] {
  return options.colors.map(hex => hexToRgb(hex))
}

function colorAt(stops: RGB[], index: number): RGB {
  if (stops.length === 0) {
    return [0, 0, 0]
  }
  return stops[Math.min(index, stops.length - 1)]
}

type ShaderUniforms = Record<string, { value: unknown }>

const DEFAULT_PLANES_ZOOM = 1
const DEFAULT_SPHERE_DISTANCE = 14
const ZOOM_OUT_PLANES = { zoom: 1, distance: 14 }
const ZOOM_OUT_SPHERE = { zoom: 5, distance: 14 }

const ENVIRONMENT_FILES: Record<ShaderGradientOptions['envPreset'], string> = {
  city: 'city.hdr',
  dawn: 'dawn.hdr',
  lobby: 'lobby.hdr',
}

const TRANSITION_KEYS: Array<keyof ShaderGradientOptions> = [
  'uTime',
  'uSpeed',
  'uStrength',
  'uDensity',
  'uFrequency',
  'uAmplitude',
  'rangeStart',
  'rangeEnd',
  'loopDuration',
  'positionX',
  'positionY',
  'positionZ',
  'rotationX',
  'rotationY',
  'rotationZ',
  'reflection',
  'cAzimuthAngle',
  'cPolarAngle',
  'cDistance',
  'cameraZoom',
  'brightness',
  'grainBlending',
  'bloomStrength',
  'bloomRadius',
  'bloomThreshold',
  'vignetteStrength',
  'vignetteSoftness',
  'chromaticAberrationStrength',
  'fov',
  'pixelDensity',
]

const environmentCache = new Map<string, Promise<WebGLRenderTarget>>()

CameraControls.install({ THREE })

function ensureShaderChunkCompat(): void {
  const chunks = ShaderChunk as Record<string, string | undefined>
  chunks.uv2_pars_vertex = chunks.uv2_pars_vertex ?? ''
  chunks.uv2_vertex = chunks.uv2_vertex ?? ''
  chunks.uv2_pars_fragment = chunks.uv2_pars_fragment ?? ''
  chunks.encodings_fragment = chunks.encodings_fragment ?? chunks.colorspace_fragment ?? ''
}

function createGeometry(type: MeshType) {
  switch (type) {
    case 'sphere': {
      return new IcosahedronGeometry(1, 64)
    }
    case 'waterPlane': {
      return new PlaneGeometry(10, 10, 192, 192)
    }
    default: {
      return new PlaneGeometry(10, 10, 1, 192)
    }
  }
}

function getShaderProgram(shader: ShaderGradientOptions['shader'], type: MeshType) {
  const family = officialShaders[shader] as Record<MeshType, { vertex: string, fragment: string }>
  return family[type]
}

function loadEnvironmentTarget(
  pmremGenerator: PMREMGenerator,
  basePath: string,
  preset: ShaderGradientOptions['envPreset'],
): Promise<WebGLRenderTarget> {
  const base = basePath.endsWith('/') ? basePath : `${basePath}/`
  const url = `${base}${ENVIRONMENT_FILES[preset]}`
  const cached = environmentCache.get(url)
  if (cached) {
    return cached
  }

  const next = new Promise<WebGLRenderTarget>((resolve, reject) => {
    new RGBELoader().load(
      url,
      (texture) => {
        const target = pmremGenerator.fromEquirectangular(texture)
        texture.dispose()
        resolve(target)
      },
      undefined,
      reject,
    )
  })

  environmentCache.set(url, next)
  return next
}

function createMaterial(options: ShaderGradientOptions): MeshPhysicalMaterial {
  const isGlass = options.shader === 'glass'

  return new MeshPhysicalMaterial({
    userData: {},
    metalness: isGlass ? 0 : 0.2,
    roughness: isGlass ? 0.1 : 1 - options.reflection,
    side: DoubleSide,
    wireframe: options.wireframe,
    transparent: isGlass,
    opacity: isGlass ? 0.3 : 1,
    transmission: isGlass ? 0.9 : 0,
    thickness: isGlass ? 0.5 : 0,
    clearcoat: isGlass ? 1 : 0,
    clearcoatRoughness: 0,
    ior: 1.5,
    envMapIntensity: 1,
  })
}

export class ShaderGradient {
  private container: HTMLElement
  private options: ShaderGradientOptions
  private currentOptions: ShaderGradientOptions
  private currentColors: RGB[]

  private renderer: WebGLRenderer | null = null
  private scene: Scene | null = null
  private camera: PerspectiveCamera | null = null
  private mesh: Mesh | null = null
  private material: MeshPhysicalMaterial | null = null
  private clock: Clock | null = null
  private ambientLight: AmbientLight | null = null
  private axisHelper: AxesHelper | null = null
  private cameraControls: CameraControls | null = null
  private pmremGenerator: PMREMGenerator | null = null
  private composer: EffectComposer | null = null
  private grainPass: ShaderPass | null = null
  private bloomPass: UnrealBloomPass | null = null
  private vignettePass: ShaderPass | null = null
  private chromaticAberrationPass: ShaderPass | null = null
  private environmentTarget: WebGLRenderTarget | null = null
  private environmentKey = ''
  private environmentRequestId = 0
  private animationId = 0
  private resizeObserver: ResizeObserver | null = null
  private shaderUniforms: ShaderUniforms | null = null

  constructor(container: HTMLElement, options?: Partial<ShaderGradientInput>) {
    this.container = container
    this.options = resolveShaderGradientOptions(options)
    this.currentOptions = { ...this.options }
    this.currentColors = buildColorStops(this.options)

    ensureShaderChunkCompat()
    this.initScene()
    this.resizeObserver = new ResizeObserver(() => this.handleResize())
    this.resizeObserver.observe(this.container)
  }

  getOptions(): ShaderGradientOptions {
    return { ...this.options }
  }

  update(options: Partial<ShaderGradientInput>): void {
    const isPresetSwitch
      = options.preset !== undefined && options.preset !== this.options.preset
    const carryOver = isPresetSwitch ? stripPresetFields(this.options) : { ...this.options }
    const next = resolveShaderGradientOptions({
      ...carryOver,
      ...options,
      onCameraUpdate: options.onCameraUpdate ?? this.options.onCameraUpdate,
    })
    const previous = this.options
    this.options = next

    const requiresRebuild
      = previous.type !== next.type
      || previous.shader !== next.shader
      || previous.preserveDrawingBuffer !== next.preserveDrawingBuffer
      || previous.powerPreference !== next.powerPreference

    if (!next.enableTransition) {
      this.currentOptions = { ...next }
      this.currentColors = buildColorStops(next)
    }

    if (requiresRebuild) {
      this.rebuild()
      return
    }

    this.syncRendererState()
    this.syncLighting()
    this.syncAxisHelper()

    const cameraChanged
      = previous.cAzimuthAngle !== next.cAzimuthAngle
      || previous.cPolarAngle !== next.cPolarAngle
      || previous.cDistance !== next.cDistance
      || previous.cameraZoom !== next.cameraZoom
      || previous.zoomOut !== next.zoomOut
      || previous.type !== next.type
      || previous.enableCameraControls !== next.enableCameraControls
      || previous.enableCameraUpdate !== next.enableCameraUpdate
    if (cameraChanged) {
      this.syncCameraControls(this.options.enableTransition)
    }

    this.applyCurrentState()
  }

  dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = 0
    }

    this.resizeObserver?.disconnect()
    this.resizeObserver = null

    this.cameraControls?.dispose()
    this.cameraControls = null

    if (this.mesh) {
      this.mesh.geometry.dispose()
      this.material?.dispose()
      this.mesh.removeFromParent()
      this.mesh = null
      this.material = null
    }

    if (this.axisHelper) {
      this.axisHelper.removeFromParent()
      this.axisHelper = null
    }

    this.pmremGenerator?.dispose()
    this.pmremGenerator = null
    this.grainPass?.dispose()
    this.grainPass = null
    this.bloomPass?.dispose()
    this.bloomPass = null
    this.vignettePass?.dispose()
    this.vignettePass = null
    this.chromaticAberrationPass?.dispose()
    this.chromaticAberrationPass = null
    this.composer?.dispose()
    this.composer = null

    if (this.renderer) {
      this.renderer.dispose()
      this.renderer.domElement.remove()
      this.renderer = null
    }

    this.scene = null
    this.camera = null
    this.clock = null
    this.ambientLight = null
    this.shaderUniforms = null
  }

  private rebuild(): void {
    const observer = this.resizeObserver
    this.resizeObserver = null
    this.dispose()
    this.resizeObserver = observer
    this.currentOptions = { ...this.options }
    this.currentColors = buildColorStops(this.options)
    this.initScene()
  }

  private initScene(): void {
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    if (!width || !height) {
      return
    }

    this.renderer = new WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: this.options.preserveDrawingBuffer,
      powerPreference: this.options.powerPreference,
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.currentOptions.pixelDensity))
    this.renderer.setSize(width, height)
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace
    this.renderer.toneMapping = THREE.NoToneMapping
    this.renderer.domElement.style.display = 'block'
    this.renderer.domElement.style.width = '100%'
    this.renderer.domElement.style.height = '100%'
    this.container.append(this.renderer.domElement)

    this.scene = new Scene()
    this.camera = new PerspectiveCamera(this.currentOptions.fov, width / height, 0.1, 100)
    this.clock = new Clock()
    this.pmremGenerator = new PMREMGenerator(this.renderer)

    this.ambientLight = new AmbientLight(0xFF_FF_FF, 0)
    this.scene.add(this.ambientLight)

    this.mountMesh()
    this.syncLighting()
    this.syncAxisHelper()
    this.syncCameraControls(false)
    this.syncPostProcessing()
    this.applyCurrentState()

    const animate = () => {
      this.animationId = requestAnimationFrame(animate)

      const delta = this.clock?.getDelta() ?? 0
      if (this.options.enableTransition) {
        this.updateTransitionState(delta)
      }

      this.cameraControls?.update(delta)

      if (this.shaderUniforms) {
        this.shaderUniforms.uTime.value = this.getAnimatedTime()
      }

      this.applyCurrentState()
      if (this.composer) {
        this.composer.render(delta)
      }
      else {
        this.renderer?.render(this.scene!, this.camera!)
      }
    }

    animate()
  }

  private mountMesh(): void {
    if (!this.scene) {
      return
    }

    const geometry = createGeometry(this.options.type)
    const material = createMaterial(this.options)
    const program = getShaderProgram(this.options.shader, this.options.type)
    const uniforms = this.createUniforms()

    material.onBeforeCompile = (shader) => {
      shader.uniforms = {
        ...shader.uniforms,
        ...uniforms,
      }
      shader.vertexShader = program.vertex
      shader.fragmentShader = program.fragment
      this.shaderUniforms = shader.uniforms as ShaderUniforms
    }

    this.material = material
    this.mesh = new Mesh(geometry, material)
    this.scene.add(this.mesh)
  }

  private createUniforms(): ShaderUniforms {
    return {
      uTime: { value: this.currentOptions.uTime },
      uSpeed: { value: this.currentOptions.uSpeed },
      uLoadingTime: { value: 1 },
      uNoiseDensity: { value: this.currentOptions.uDensity },
      uNoiseStrength: { value: this.currentOptions.uStrength },
      uFrequency: { value: this.currentOptions.uFrequency },
      uAmplitude: { value: this.currentOptions.uAmplitude },
      uIntensity: { value: 0.5 },
      uLoop: { value: this.currentOptions.loop ? 1 : 0 },
      uLoopDuration: { value: this.currentOptions.loopDuration },
      uColors: {
        value: Array.from({ length: MAX_COLOR_STOPS }, (_, i) => {
          const rgb = colorAt(this.currentColors, i)
          return new Vector3(rgb[0], rgb[1], rgb[2])
        }),
      },
      uColorCount: { value: Math.max(2, Math.min(this.currentColors.length, MAX_COLOR_STOPS)) },
      uC1r: { value: colorAt(this.currentColors, 0)[0] },
      uC1g: { value: colorAt(this.currentColors, 0)[1] },
      uC1b: { value: colorAt(this.currentColors, 0)[2] },
      uC2r: { value: colorAt(this.currentColors, 1)[0] },
      uC2g: { value: colorAt(this.currentColors, 1)[1] },
      uC2b: { value: colorAt(this.currentColors, 1)[2] },
      uC3r: { value: colorAt(this.currentColors, 2)[0] },
      uC3g: { value: colorAt(this.currentColors, 2)[1] },
      uC3b: { value: colorAt(this.currentColors, 2)[2] },
      uColor1: { value: new THREE.Color(this.currentOptions.colors[0] ?? '#000000') },
      uColor2: { value: new THREE.Color(this.currentOptions.colors[1] ?? this.currentOptions.colors[0] ?? '#000000') },
      uColor3: { value: new THREE.Color(this.currentOptions.colors[2] ?? this.currentOptions.colors[0] ?? '#000000') },
      uTransparency: { value: 0.1 },
      uRefraction: { value: 1.5 },
      uChromaticAberration: { value: 0.1 },
      uFresnelPower: { value: 2 },
      uReflectivity: { value: 0.9 },
      uWaveAmplitude: { value: 0.02 },
      uWaveFrequency: { value: 5 },
      uDistortion: { value: 0.1 },
      uFlowSpeed: { value: 0.1 },
      uFlowDirection: { value: new Vector2(1, 0.5) },
      uLiquidEffect: { value: 0.5 },
      uFoamIntensity: { value: 0.3 },
    }
  }

  private updateTransitionState(delta: number): void {
    const smoothing = this.options.smoothTime

    for (const key of TRANSITION_KEYS) {
      this.currentOptions[key] = damp(
        this.currentOptions[key] as number,
        this.options[key] as number,
        smoothing,
        delta,
      ) as never
    }

    const targetColors = this.options.colors
    while (this.currentColors.length < targetColors.length) {
      this.currentColors.push(hexToRgb(targetColors[this.currentColors.length]))
    }
    while (this.currentColors.length > targetColors.length) {
      this.currentColors.pop()
    }
    for (let i = 0; i < this.currentColors.length; i++) {
      this.currentColors[i] = dampColor(
        this.currentColors[i],
        hexToRgb(targetColors[i]),
        smoothing,
        delta,
      )
    }
    this.currentOptions.colors = this.currentColors.map(rgb => rgbToHex(rgb))

    for (const key of [
      'animate',
      'range',
      'loop',
      'wireframe',
      'lightType',
      'envPreset',
      'grain',
      'bloom',
      'vignette',
      'chromaticAberration',
      'toggleAxis',
      'zoomOut',
      'hoverState',
      'enableCameraControls',
      'enableCameraUpdate',
      'preserveDrawingBuffer',
      'powerPreference',
      'envBasePath',
      'onCameraUpdate',
    ] as const) {
      this.currentOptions[key] = this.options[key] as never
    }
  }

  private applyCurrentState(): void {
    if (!this.mesh || !this.camera) {
      return
    }

    this.syncClock()
    this.syncPostProcessing()

    this.mesh.position.set(
      this.currentOptions.positionX,
      this.currentOptions.positionY,
      this.currentOptions.positionZ,
    )
    this.mesh.rotation.set(
      degToRad(this.currentOptions.rotationX),
      degToRad(this.currentOptions.rotationY),
      degToRad(this.currentOptions.rotationZ),
    )

    if (this.material) {
      const isGlass = this.currentOptions.shader === 'glass'
      this.material.roughness = isGlass ? 0.1 : 1 - this.currentOptions.reflection
      this.material.metalness = isGlass ? 0 : 0.2
      this.material.wireframe = this.currentOptions.wireframe
      this.material.transparent = isGlass
      this.material.opacity = isGlass ? 0.3 : 1
      this.material.transmission = isGlass ? 0.9 : 0
      this.material.thickness = isGlass ? 0.5 : 0
      this.material.clearcoat = isGlass ? 1 : 0
      this.material.clearcoatRoughness = 0
      this.material.ior = 1.5
    }

    if (this.shaderUniforms) {
      this.shaderUniforms.uSpeed.value = this.currentOptions.uSpeed
      this.shaderUniforms.uNoiseDensity.value = this.currentOptions.uDensity
      this.shaderUniforms.uNoiseStrength.value = this.currentOptions.uStrength
      this.shaderUniforms.uFrequency.value = this.currentOptions.uFrequency
      this.shaderUniforms.uAmplitude.value = this.currentOptions.uAmplitude
      this.shaderUniforms.uLoop.value = this.currentOptions.loop ? 1 : 0
      this.shaderUniforms.uLoopDuration.value = this.currentOptions.loopDuration
      const c1 = colorAt(this.currentColors, 0)
      const c2 = colorAt(this.currentColors, 1)
      const c3 = colorAt(this.currentColors, 2)
      this.shaderUniforms.uC1r.value = c1[0]
      this.shaderUniforms.uC1g.value = c1[1]
      this.shaderUniforms.uC1b.value = c1[2]
      this.shaderUniforms.uC2r.value = c2[0]
      this.shaderUniforms.uC2g.value = c2[1]
      this.shaderUniforms.uC2b.value = c2[2]
      this.shaderUniforms.uC3r.value = c3[0]
      this.shaderUniforms.uC3g.value = c3[1]
      this.shaderUniforms.uC3b.value = c3[2]
      const colorsUniform = this.shaderUniforms.uColors
      if (colorsUniform && Array.isArray(colorsUniform.value)) {
        const arr = colorsUniform.value as Vector3[]
        for (let i = 0; i < arr.length; i++) {
          const rgb = colorAt(this.currentColors, i)
          arr[i].set(rgb[0], rgb[1], rgb[2])
        }
      }
      if (this.shaderUniforms.uColorCount) {
        this.shaderUniforms.uColorCount.value
          = Math.max(2, Math.min(this.currentColors.length, MAX_COLOR_STOPS))
      }
      const colorHexes = [
        this.currentOptions.colors[0] ?? '#000000',
        this.currentOptions.colors[1] ?? this.currentOptions.colors[0] ?? '#000000',
        this.currentOptions.colors[2] ?? this.currentOptions.colors[0] ?? '#000000',
      ]
      for (let i = 0; i < 3; i++) {
        const uniform = this.shaderUniforms[`uColor${i + 1}`]
        if (uniform) {
          uniform.value = new THREE.Color(colorHexes[i])
        }
      }
    }

    this.camera.fov = this.currentOptions.fov
    this.camera.updateProjectionMatrix()

    if (this.ambientLight) {
      this.ambientLight.intensity
        = this.currentOptions.lightType === '3d' ? this.currentOptions.brightness * Math.PI : 0.4
    }

    if (this.grainPass) {
      this.grainPass.enabled = this.currentOptions.grain
      this.grainPass.uniforms.disable.value = !this.currentOptions.grain
      this.grainPass.uniforms.blending.value = this.currentOptions.grainBlending
    }
  }

  private syncRendererState(): void {
    if (!this.renderer || !this.camera) {
      return
    }

    const pixelRatio = Math.min(window.devicePixelRatio, this.currentOptions.pixelDensity)
    this.renderer.setPixelRatio(pixelRatio)
    this.composer?.setPixelRatio(pixelRatio)
    this.camera.fov = this.currentOptions.fov
    this.camera.updateProjectionMatrix()
  }

  private syncLighting(): void {
    if (!this.scene || !this.pmremGenerator) {
      return
    }

    if (this.options.lightType === 'env') {
      const environmentKey = `${this.options.envBasePath}|${this.options.envPreset}`
      if (this.environmentKey === environmentKey && this.environmentTarget) {
        this.scene.environment = this.environmentTarget.texture
        return
      }

      this.environmentKey = environmentKey
      const requestId = ++this.environmentRequestId
      loadEnvironmentTarget(this.pmremGenerator, this.options.envBasePath, this.options.envPreset)
        .then((target) => {
          if (!this.scene || requestId !== this.environmentRequestId || this.options.lightType !== 'env') {
            return
          }
          this.environmentTarget = target
          this.scene.environment = target.texture
        })
        .catch(() => {
          if (!this.scene || requestId !== this.environmentRequestId) {
            return
          }
          this.scene.environment = null
        })
      return
    }

    this.environmentKey = ''
    this.environmentRequestId += 1
    this.scene.environment = null
  }

  private syncAxisHelper(): void {
    if (!this.scene) {
      return
    }

    if (this.options.toggleAxis && !this.axisHelper) {
      this.axisHelper = new AxesHelper(3)
      this.scene.add(this.axisHelper)
    }

    if (!this.options.toggleAxis && this.axisHelper) {
      this.axisHelper.removeFromParent()
      this.axisHelper = null
    }
  }

  private get postProcessingSignature(): string {
    const o = this.currentOptions
    return [
      o.bloom ? 'b' : '',
      o.grain ? 'g' : '',
      o.chromaticAberration ? 'c' : '',
      o.vignette ? 'v' : '',
    ].join('')
  }

  private postSignatureSnapshot = ''

  private disposePostProcessing(): void {
    this.grainPass?.dispose()
    this.grainPass = null
    this.bloomPass?.dispose()
    this.bloomPass = null
    this.vignettePass?.dispose()
    this.vignettePass = null
    this.chromaticAberrationPass?.dispose()
    this.chromaticAberrationPass = null
    this.composer?.dispose()
    this.composer = null
    this.postSignatureSnapshot = ''
  }

  private syncPostProcessing(): void {
    if (!this.renderer || !this.scene || !this.camera) {
      return
    }

    const width = this.container.clientWidth
    const height = this.container.clientHeight
    const o = this.currentOptions
    const signature = this.postProcessingSignature

    // When no pass is enabled, tear everything down so the renderer draws
    // straight to the canvas without composer overhead.
    if (signature === '') {
      this.disposePostProcessing()
      return
    }

    // Rebuild the composer chain whenever the enabled passes change. Passes
    // in three.js can't be re-ordered in place, so swap-rebuild is cleanest.
    if (signature !== this.postSignatureSnapshot) {
      this.disposePostProcessing()

      const composer = new EffectComposer(this.renderer)
      composer.setPixelRatio(Math.min(window.devicePixelRatio, o.pixelDensity))
      composer.setSize(width, height)

      const renderPass = new RenderPass(this.scene, this.camera)
      composer.addPass(renderPass)

      if (o.bloom) {
        const bloomPass = new UnrealBloomPass(
          new Vector2(width, height),
          o.bloomStrength,
          o.bloomRadius,
          o.bloomThreshold,
        )
        composer.addPass(bloomPass)
        this.bloomPass = bloomPass
      }

      if (o.chromaticAberration) {
        const caPass = new ShaderPass(CHROMATIC_ABERRATION_SHADER)
        caPass.uniforms.offset.value = o.chromaticAberrationStrength
        composer.addPass(caPass)
        this.chromaticAberrationPass = caPass
      }

      if (o.grain) {
        const grainPass = new ShaderPass(HALFTONE_SHADER)
        grainPass.uniforms.width.value = width
        grainPass.uniforms.height.value = height
        grainPass.uniforms.blending.value = o.grainBlending
        grainPass.uniforms.disable.value = false
        composer.addPass(grainPass)
        this.grainPass = grainPass
      }

      if (o.vignette) {
        const vignettePass = new ShaderPass(VIGNETTE_SHADER)
        vignettePass.uniforms.strength.value = o.vignetteStrength
        vignettePass.uniforms.softness.value = o.vignetteSoftness
        composer.addPass(vignettePass)
        this.vignettePass = vignettePass
      }

      this.composer = composer
      this.postSignatureSnapshot = signature
    }

    // Keep pass uniforms synced even when the chain is unchanged so the user
    // can live-tune sliders without rebuilding the composer.
    if (this.bloomPass) {
      this.bloomPass.strength = o.bloomStrength
      this.bloomPass.radius = o.bloomRadius
      this.bloomPass.threshold = o.bloomThreshold
      this.bloomPass.setSize(width, height)
    }

    if (this.chromaticAberrationPass) {
      this.chromaticAberrationPass.uniforms.offset.value = o.chromaticAberrationStrength
    }

    if (this.grainPass) {
      this.grainPass.uniforms.width.value = width
      this.grainPass.uniforms.height.value = height
      this.grainPass.uniforms.blending.value = o.grainBlending
      this.grainPass.uniforms.disable.value = false
    }

    if (this.vignettePass) {
      this.vignettePass.uniforms.strength.value = o.vignetteStrength
      this.vignettePass.uniforms.softness.value = o.vignetteSoftness
    }
  }

  private syncClock(): void {
    if (!this.clock) {
      return
    }

    if (this.currentOptions.animate) {
      if (!this.clock.running) {
        this.clock.start()
      }
      return
    }

    if (this.clock.running) {
      this.clock.stop()
    }
  }

  private syncCameraControls(shouldTransition: boolean): void {
    if (!this.camera || !this.renderer) {
      return
    }

    if (!this.cameraControls) {
      const controls = new CameraControls(this.camera, this.renderer.domElement)
      controls.addEventListener('rest', () => this.emitCameraUpdate())
      controls.mouseButtons.left = (CameraControls as any).ACTION.ROTATE
      controls.mouseButtons.right = (CameraControls as any).ACTION.NONE
      controls.touches.one = (CameraControls as any).ACTION.ROTATE
      controls.touches.two = (CameraControls as any).ACTION.NONE
      controls.touches.three = (CameraControls as any).ACTION.NONE
      this.cameraControls = controls
    }

    this.cameraControls.enabled = this.options.enableCameraControls || this.options.enableCameraUpdate
    this.cameraControls.smoothTime = shouldTransition ? Math.max(0.05, this.options.smoothTime) : 0
    this.cameraControls.dollySpeed = 5
    this.cameraControls.maxDistance = 1000
    this.cameraControls.restThreshold = 0.01
    this.cameraControls.mouseButtons.middle
      = this.options.type === 'sphere'
        ? (CameraControls as any).ACTION.ZOOM
        : (CameraControls as any).ACTION.DOLLY
    this.cameraControls.mouseButtons.wheel
      = this.options.type === 'sphere'
        ? (CameraControls as any).ACTION.ZOOM
        : (CameraControls as any).ACTION.DOLLY

    this.cameraControls.rotateTo(
      degToRad(this.options.cAzimuthAngle),
      degToRad(this.options.cPolarAngle),
      shouldTransition,
    )

    if (this.options.zoomOut) {
      if (this.options.type === 'sphere') {
        this.cameraControls.dollyTo(ZOOM_OUT_SPHERE.distance, shouldTransition)
        this.cameraControls.zoomTo(ZOOM_OUT_SPHERE.zoom, shouldTransition)
      }
      else {
        this.cameraControls.dollyTo(ZOOM_OUT_PLANES.distance, shouldTransition)
        this.cameraControls.zoomTo(ZOOM_OUT_PLANES.zoom, shouldTransition)
      }
      return
    }

    if (this.options.type === 'sphere') {
      this.cameraControls.zoomTo(this.options.cameraZoom, shouldTransition)
      this.cameraControls.dollyTo(DEFAULT_SPHERE_DISTANCE, shouldTransition)
      return
    }

    this.cameraControls.dollyTo(this.options.cDistance, shouldTransition)
    this.cameraControls.zoomTo(DEFAULT_PLANES_ZOOM, shouldTransition)
  }

  private emitCameraUpdate(): void {
    if (!this.cameraControls || !this.camera || !this.options.onCameraUpdate || !this.options.enableCameraUpdate) {
      return
    }

    const cAzimuthAngle = Math.round(radToDeg(this.cameraControls.azimuthAngle))
    const cPolarAngle = Math.round(radToDeg(this.cameraControls.polarAngle))

    this.options.onCameraUpdate({
      cAzimuthAngle,
      cPolarAngle,
      cDistance:
        this.options.type === 'sphere'
          ? this.currentOptions.cDistance
          : Number(this.cameraControls.distance.toFixed(2)),
      cameraZoom:
        this.options.type === 'sphere'
          ? Number(this.camera.zoom.toFixed(2))
          : this.currentOptions.cameraZoom,
    })
  }

  private getAnimatedTime(): number {
    if (!this.clock) {
      return this.currentOptions.uTime
    }
    if (!this.currentOptions.animate) {
      return this.currentOptions.uTime
    }

    const elapsed = this.clock.getElapsedTime()

    if (this.currentOptions.loop && Number.isFinite(this.currentOptions.loopDuration) && this.currentOptions.loopDuration > 0) {
      return elapsed % this.currentOptions.loopDuration
    }

    if (!this.currentOptions.range) {
      return elapsed
    }

    const start = this.currentOptions.rangeStart
    const end = this.currentOptions.rangeEnd
    if (!(Number.isFinite(start) && Number.isFinite(end) && end > start)) {
      return elapsed
    }

    const rangedTime = start + elapsed
    if (rangedTime >= end) {
      this.clock.start()
      return start
    }

    return rangedTime
  }

  private handleResize(): void {
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    if (!width || !height) {
      return
    }

    if (!this.renderer) {
      this.initScene()
      return
    }

    this.renderer.setSize(width, height)
    this.composer?.setSize(width, height)
    if (this.grainPass) {
      this.grainPass.uniforms.width.value = width
      this.grainPass.uniforms.height.value = height
    }
    this.bloomPass?.setSize(width, height)
    if (this.camera) {
      this.camera.aspect = width / height
      this.camera.updateProjectionMatrix()
    }
  }
}

export class ShaderGradientRenderer extends ShaderGradient {}
