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
uniform float uC1r; uniform float uC1g; uniform float uC1b;
uniform float uC3r; uniform float uC3g; uniform float uC3b;
uniform vec3 uColors[9];
uniform int uColorCount;
uniform float uFrequency;
uniform float uNoiseDensity;

float linearToRelativeLuminance2(const in vec3 color) {
  vec3 weights = vec3(0.2126, 0.7152, 0.0722);
  return dot(weights, color.rgb);
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise2D(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

// Sample the user palette as a cyclic gradient — any count between 2 and 9.
vec3 sampleSpectrum(float p) {
  int count = uColorCount;
  if (count < 2) count = 2;
  if (count > 9) count = 9;
  float fcount = float(count);
  float s = fract(p) * fcount;
  float f = fract(s);
  int idx = int(floor(s));
  if (idx >= count) idx = count - 1;
  int nextIdx = idx + 1;
  if (nextIdx >= count) nextIdx = 0;

  vec3 a = uColors[0];
  vec3 b = uColors[0];
  for (int i = 0; i < 9; i++) {
    if (i == idx) {
      a = uColors[i];
    }
    if (i == nextIdx) {
      b = uColors[i];
    }
  }
  return mix(a, b, f);
}

void main() {
  vec3 color1 = vec3(uC1r, uC1g, uC1b);
  vec3 color3 = vec3(uC3r, uC3g, uC3b);
  float clearcoat = 0.25;
  float clearcoatRoughness = 0.35;

  #include <clipping_planes_fragment>

  float t = uTime * uSpeed;
  vec3 normalDir = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);

  vec2 uv = vUv * 2.0 - 1.0;

  float wave = sin(uv.x * (2.0 + uFrequency * 0.15) + t * 0.7) * 0.06;
  float drift = noise2D(uv * (1.8 + uNoiseDensity * 0.25) + t * 0.12) * 0.08;

  float bandPos = uv.y * 0.5 + wave + drift + t * 0.12;
  vec3 baseColor = sampleSpectrum(bandPos);

  // Slightly amplified copy of the sampled color for band interior shading.
  float bands = fract(bandPos * (5.0 + uFrequency * 0.25));
  float bandShape = smoothstep(0.08, 0.2, bands) * (1.0 - smoothstep(0.8, 0.92, bands));
  vec3 stripe = mix(baseColor * 0.75, baseColor * 1.2, bandShape);

  // Hairline between bands, brightened toward white for a shimmer cue.
  float hairline = smoothstep(0.02, 0.0, abs(bands - 0.5) - 0.48);
  stripe += hairline * vec3(1.0, 0.96, 0.88) * 0.45;

  // Top/bottom vignette softens the edges of the waterPlane.
  float vertFade = smoothstep(1.05, 0.25, abs(uv.y));
  stripe *= 0.55 + vertFade * 0.55;

  // Rim glow pulls in color3 tint.
  float fresnel = pow(1.0 - abs(dot(viewDir, normalDir)), 2.0);
  stripe += fresnel * mix(color3, stripe, 0.4) * 0.3;

  // Pointed spec highlight.
  vec3 lightDir = normalize(vec3(0.3, 0.8, 0.6));
  vec3 halfDir = normalize(lightDir + viewDir);
  float spec = pow(max(0.0, dot(normalDir, halfDir)), 48.0);
  stripe += spec * 0.55;

  vec3 finalColor = max(stripe, vec3(0.0));

  vec4 diffuseColor = vec4(finalColor, 1.0);
  ReflectedLight reflectedLight = ReflectedLight(vec3(0.0), vec3(0.0), vec3(0.0), vec3(0.0));

  float emissionStrength = 0.28 + hairline * 0.7 + bandShape * 0.2;
  vec3 totalEmissiveRadiance = emissive + baseColor * emissionStrength;
  totalEmissiveRadiance += color1 * 0.0;

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
