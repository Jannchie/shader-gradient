import type { ShaderGradientInput } from '@shader-gradient/core'
import type { CSSProperties, ReactNode } from 'react'
import { ShaderGradient as CoreShaderGradient } from '@shader-gradient/core'
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

interface CanvasContextValue {
  container: HTMLDivElement | null
  defaults: Pick<
    ShaderGradientInput,
    'pixelDensity' | 'fov' | 'preserveDrawingBuffer' | 'powerPreference'
  >
}

interface ShaderGradientCanvasProps {
  children: ReactNode
  style?: CSSProperties
  className?: string
  pixelDensity?: number
  fov?: number
  pointerEvents?: CSSProperties['pointerEvents']
  lazyLoad?: boolean
  threshold?: number
  rootMargin?: string
  preserveDrawingBuffer?: boolean
  powerPreference?: WebGLPowerPreference
}

type ShaderGradientProps = Partial<ShaderGradientInput>

const ShaderGradientCanvasContext = createContext<CanvasContextValue | null>(null)

function useInView(
  enabled: boolean,
  threshold: number,
  rootMargin: string,
): [(node: HTMLDivElement | null) => void, HTMLDivElement | null, boolean] {
  const [container, setContainer] = useState<HTMLDivElement | null>(null)
  const [isInView, setIsInView] = useState(!enabled)

  useEffect(() => {
    if (!enabled || !container) {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      { threshold, rootMargin },
    )

    observer.observe(container)
    return () => observer.disconnect()
  }, [container, enabled, threshold, rootMargin])

  return [setContainer, container, isInView]
}

export function ShaderGradientCanvas({
  children,
  style,
  className,
  pixelDensity = 1,
  fov = 45,
  pointerEvents = 'auto',
  lazyLoad = true,
  threshold = 0.1,
  rootMargin = '0px',
  preserveDrawingBuffer,
  powerPreference,
}: ShaderGradientCanvasProps) {
  const [
    containerRef,
    container,
    isInView,
  ] = useInView(lazyLoad, threshold, rootMargin)

  const contextValue = useMemo<CanvasContextValue>(
    () => ({
      container,
      defaults: {
        pixelDensity,
        fov,
        preserveDrawingBuffer,
        powerPreference,
      },
    }),
    [container, fov, pixelDensity, powerPreference, preserveDrawingBuffer],
  )

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: 'relative', width: '100%', height: '100%', pointerEvents, ...style }}
    >
      {(!lazyLoad || isInView) && (
        <ShaderGradientCanvasContext.Provider value={contextValue}>
          {children}
        </ShaderGradientCanvasContext.Provider>
      )}
    </div>
  )
}

export function ShaderGradient(props: ShaderGradientProps) {
  const context = useContext(ShaderGradientCanvasContext)
  const instanceRef = useRef<CoreShaderGradient | null>(null)

  if (!context) {
    throw new Error('ShaderGradient must be used inside ShaderGradientCanvas.')
  }

  const mergedProps: ShaderGradientInput = {
    ...context.defaults,
    ...props,
  }
  const latestPropsRef = useRef(mergedProps)
  latestPropsRef.current = mergedProps

  useEffect(() => {
    if (!context.container) {
      return
    }

    const instance = new CoreShaderGradient(context.container, latestPropsRef.current)
    instanceRef.current = instance

    return () => {
      instance.dispose()
      instanceRef.current = null
    }
  }, [context.container])

  useEffect(() => {
    if (!instanceRef.current) {
      return
    }
    instanceRef.current.update(mergedProps)
  })

  return null
}

export type { ShaderGradientCanvasProps, ShaderGradientProps }

export type {
  EnvironmentPreset,
  LightType,
  MeshType,
  ShaderGradientCameraUpdate,
  ShaderGradientInput,
  ShaderGradientOptions,
  ShaderGradientPresetName,
} from '@shader-gradient/core'
