export const CHROMATIC_ABERRATION_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    offset: { value: 0.004 },
    radial: { value: 1 },
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
    uniform float offset;
    uniform float radial;

    varying vec2 vUV;

    void main() {
      // Radial mode warps the offset by distance from center, so edges get
      // the familiar "cheap lens" fringe while the center stays crisp.
      vec2 centered = vUV - 0.5;
      float dist = length(centered) * 1.414213;
      float scale = mix(1.0, dist, clamp(radial, 0.0, 1.0));
      vec2 dir = centered * scale;

      vec2 off = dir * offset;
      float r = texture2D(tDiffuse, vUV + off).r;
      float g = texture2D(tDiffuse, vUV).g;
      float b = texture2D(tDiffuse, vUV - off).b;
      float a = texture2D(tDiffuse, vUV).a;
      gl_FragColor = vec4(r, g, b, a);
    }
  `,
} as const
