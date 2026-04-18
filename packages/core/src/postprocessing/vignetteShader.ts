export const VIGNETTE_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    strength: { value: 0.8 },
    softness: { value: 0.6 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUV;

    void main() {
      vUV = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float strength;
    uniform float softness;

    varying vec2 vUV;

    void main() {
      vec4 tex = texture2D(tDiffuse, vUV);
      vec2 centered = vUV - 0.5;
      float d = length(centered) * 1.414213;
      float inner = clamp(1.0 - softness, 0.0, 0.98);
      float falloff = smoothstep(inner, 1.0, d);
      float vignette = 1.0 - falloff * clamp(strength, 0.0, 2.0);
      gl_FragColor = vec4(tex.rgb * vignette, tex.a);
    }
  `,
} as const
