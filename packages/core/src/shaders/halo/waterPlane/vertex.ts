export default `
varying vec3 vNormal;
varying vec3 vPos;
varying vec2 vUv;

uniform float uTime;
uniform float uSpeed;
uniform float uLoop;
uniform float uLoopDuration;
uniform float uNoiseDensity;
uniform float uNoiseStrength;
uniform float uFrequency;
uniform float uAmplitude;

#define STANDARD
varying vec3 vViewPosition;
#ifndef FLAT_SHADED
#ifdef USE_TANGENT
varying vec3 vTangent;
varying vec3 vBitangent;
#endif
#endif
#include <clipping_planes_pars_vertex>
#include <color_pars_vertex>
#include <common>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <morphtarget_pars_vertex>
#include <shadowmap_pars_vertex>
#include <skinning_pars_vertex>
#include <uv2_pars_vertex>
#include <uv_pars_vertex>

void main() {
  #include <uv_vertex>
  #include <uv2_vertex>
  #include <color_vertex>
  #include <morphcolor_vertex>
  #include <beginnormal_vertex>
  #include <morphnormal_vertex>
  #include <skinbase_vertex>
  #include <skinnormal_vertex>
  #include <defaultnormal_vertex>
  #include <normal_vertex>

  #ifndef FLAT_SHADED
  vNormal = normalize(normalMatrix * normal);
  #ifdef USE_TANGENT
  vTangent = normalize(transformedTangent);
  vBitangent = normalize(cross(vNormal, vTangent) * tangent.w);
  #endif
  #endif

  #include <begin_vertex>
  #include <morphtarget_vertex>
  #include <skinning_vertex>
  #include <displacementmap_vertex>

  vUv = uv;

  // Slow concentric ripples so the halo appears to drift across water.
  float time = uTime * uSpeed;
  vec2 centered = uv * 2.0 - 1.0;
  float dist = length(centered);
  float ripple = sin(dist * (uFrequency * 1.5 + 5.0) - time * 1.2) * 0.08;
  float swell = sin(centered.x * 1.2 + time * 0.4) * cos(centered.y * 1.2 - time * 0.3) * 0.05;
  float displacement = (ripple + swell) * uNoiseStrength * (0.12 + uAmplitude * 0.02);
  transformed.z += displacement;

  #include <project_vertex>
  #include <logdepthbuf_vertex>
  #include <clipping_planes_vertex>
  vViewPosition = -mvPosition.xyz;
  vPos = transformed;
  #include <fog_vertex>
  #include <shadowmap_vertex>
  #include <worldpos_vertex>
}
`
