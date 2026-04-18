export default `
#define STANDARD
#ifdef PHYSICAL
#define REFLECTIVITY
#define CLEARCOAT
#define TRANSMISSION
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef TRANSMISSION
uniform float transmission;
#endif
#ifdef REFLECTIVITY
uniform float reflectivity;
#endif
#ifdef CLEARCOAT
uniform float clearcoat;
uniform float clearcoatRoughness;
#endif
#ifdef USE_SHEEN
uniform vec3 sheen;
#endif
varying vec3 vViewPosition;
#ifndef FLAT_SHADED
#ifdef USE_TANGENT
varying vec3 vTangent;
varying vec3 vBitangent;
#endif
#endif
#include <alphamap_pars_fragment>
#include <aomap_pars_fragment>
#include <color_pars_fragment>
#include <common>
#include <dithering_pars_fragment>
#include <emissivemap_pars_fragment>
#include <lightmap_pars_fragment>
#include <map_pars_fragment>
#include <packing>
#include <uv2_pars_fragment>
#include <uv_pars_fragment>
#include <bsdfs>
#include <bumpmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <clipping_planes_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <lights_physical_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <shadowmap_pars_fragment>

varying vec3 vNormal;
varying vec3 vPos;
varying vec2 vUv;

uniform float uTime;
uniform float uSpeed;
uniform float uNoiseDensity;
uniform float uNoiseStrength;
uniform float uFrequency;
uniform float uAmplitude;
uniform float uC1r;
uniform float uC1g;
uniform float uC1b;
uniform float uC2r;
uniform float uC2g;
uniform float uC2b;
uniform float uC3r;
uniform float uC3g;
uniform float uC3b;

#define BOKEH_COUNT 28

float linearToRelativeLuminance2(const in vec3 color) {
  vec3 weights = vec3(0.2126, 0.7152, 0.0722);
  return dot(weights, color.rgb);
}

float hash11(float n) {
  return fract(sin(n * 91.3458) * 47453.5453);
}

float hash12(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise2D(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
             mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}

// Anchors are placed inside roughly [-1.8, 1.8] world units, which matches
// the viewport when the camera sits at a close cDistance (~3.2). Each point
// drifts on a lazy Lissajous so the field feels alive without swirling.
vec2 bokehCenter(float i, float t) {
  float s = i * 0.173 + 1.3;
  vec2 anchor = vec2(hash11(s * 1.7), hash11(s * 2.9)) * 3.6 - 1.8;
  float speedA = 0.18 + hash11(s * 3.1) * 0.35;
  float speedB = 0.22 + hash11(s * 4.3) * 0.4;
  float ampA = 0.25 + hash11(s * 5.1) * 0.45;
  float ampB = 0.25 + hash11(s * 6.7) * 0.45;
  float phaseA = hash11(s * 7.9) * 6.28318;
  float phaseB = hash11(s * 8.3) * 6.28318;
  vec2 drift = vec2(
    sin(t * speedA + phaseA) * ampA,
    cos(t * speedB + phaseB) * ampB
  );
  return anchor + drift;
}

void main() {
  vec3 c1 = vec3(uC1r, uC1g, uC1b);
  vec3 c2 = vec3(uC2r, uC2g, uC2b);
  vec3 c3 = vec3(uC3r, uC3g, uC3b);
  float clearcoat = 0.0;
  float clearcoatRoughness = 0.0;

  #include <clipping_planes_fragment>

  float t = uTime * uSpeed;

  // Work in world units on the plane so the bokeh layout does not depend on
  // how much of the mesh the camera sees. With the plane at origin, a close
  // camera (cDistance ~3.2, fov 45) sees roughly a 2.6x2.6 square centered
  // on (0, 0), which is the target for our bokeh field.
  vec2 p = vPos.xy;

  // Very faint nebulous wash so the background isn't pitch black but still
  // reads as deep night with a hint of color drift.
  float neb = noise2D(p * (0.35 + uNoiseDensity * 0.18) + vec2(t * 0.04, -t * 0.03));
  vec3 nebColor = mix(c3, mix(c1, c2, 0.5), 0.08) * neb * 0.05;

  vec3 col = nebColor;

  for (int i = 0; i < BOKEH_COUNT; i++) {
    float fi = float(i);
    vec2 center = bokehCenter(fi, t);

    // Wide size range so the field mixes tiny pinpoints with large soft
    // blobs — that contrast is what makes a bokeh shot look photographic.
    float sizeRoll = hash11(fi * 0.53 + 0.7);
    float size = 0.08 + pow(sizeRoll, 1.8) * 0.9;
    size *= 0.85 + uAmplitude * 0.18;

    float intensity = 0.18 + hash11(fi * 0.41 + 1.9) * 0.55;

    // Slow pulsation adds life to each point.
    float pulseSpeed = 0.35 + hash11(fi * 0.77 + 2.3) * 1.1;
    float pulsePhase = hash11(fi * 0.61 + 3.1) * 6.28318;
    float pulse = 0.6 + 0.4 * sin(t * pulseSpeed + pulsePhase);

    // Soft Gaussian-ish falloff — the signature dreamy defocus look.
    vec2 d = p - center;
    float r2 = dot(d, d);
    float glow = exp(-r2 / (size * size));

    // Thin brighter inner kernel only for smaller points so larger blobs
    // stay soft and overexposure stays under control.
    float coreMask = 1.0 - smoothstep(0.2, 0.6, size);
    float core = exp(-r2 / (size * size * 0.18)) * 0.35 * coreMask;

    // Assign a base color per index and tint subtly over time.
    float sel = hash11(fi * 0.31 + 4.7);
    vec3 baseColor;
    if (sel < 0.34) {
      baseColor = c1;
    } else if (sel < 0.67) {
      baseColor = c2;
    } else {
      baseColor = c3;
    }
    float shift = 0.2 + 0.15 * sin(t * 0.5 + fi);
    vec3 ptColor = mix(baseColor, mix(c1, c2, shift), 0.2);

    col += ptColor * (glow + core) * intensity * pulse;
  }

  // Subtle screen-wide grain to hide any remaining banding and sell the
  // photographic-blur vibe.
  col += vec3((noise2D(p * 160.0 + t * 4.0) - 0.5) * 0.012);

  // Soft per-channel ceiling so hot overlap zones bloom into saturated
  // colour rather than clipping to white.
  col = col / (1.0 + col * 0.55);

  vec3 finalColor = max(col, vec3(0.0));

  // Make the material purely emissive so the dark background stays dark
  // regardless of scene lighting.
  vec4 diffuseColor = vec4(vec3(0.0), 1.0);
  ReflectedLight reflectedLight = ReflectedLight(vec3(0.0), vec3(0.0), vec3(0.0), vec3(0.0));
  vec3 totalEmissiveRadiance = emissive + finalColor;

  #ifdef TRANSMISSION
  float totalTransmission = transmission;
  #endif
  #include <logdepthbuf_fragment>
  #include <map_fragment>
  #include <color_fragment>
  #include <alphamap_fragment>
  #include <alphatest_fragment>
  #include <roughnessmap_fragment>
  #include <metalnessmap_fragment>
  #include <normal_fragment_begin>
  #include <normal_fragment_maps>
  #include <clearcoat_normal_fragment_begin>
  #include <clearcoat_normal_fragment_maps>
  #include <emissivemap_fragment>
  #include <lights_physical_fragment>
  #include <lights_fragment_begin>
  #include <lights_fragment_maps>
  #include <lights_fragment_end>
  #include <aomap_fragment>

  vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;

  #ifdef TRANSMISSION
  diffuseColor.a *= mix(saturate(1. - totalTransmission + linearToRelativeLuminance2(reflectedLight.directSpecular + reflectedLight.indirectSpecular)), 1.0, metalness);
  #endif

  gl_FragColor = vec4(outgoingLight, diffuseColor.a);

  #include <tonemapping_fragment>
  #include <encodings_fragment>
  #include <fog_fragment>
  #include <premultiplied_alpha_fragment>
  #include <dithering_fragment>
}
`
