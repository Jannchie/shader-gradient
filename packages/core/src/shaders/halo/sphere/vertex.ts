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

  // Gentle radial breathing along the sphere normal.
  float time = uTime * uSpeed;
  vec3 sphereDir = normalize(position);
  float breath = sin(time * 0.6) * 0.03;
  float ripple = sin(sphereDir.y * (uFrequency * 1.2 + 2.0) + time * 0.9) * 0.015;
  float displacement = (breath + ripple) * uNoiseStrength * (0.1 + uAmplitude * 0.02);
  transformed += normal * displacement;

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
