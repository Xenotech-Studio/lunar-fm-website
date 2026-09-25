export const moonVertex = /* glsl */ `
  uniform highp sampler2D uHeight;
  uniform float uRelief;
  varying vec2 vUv;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying vec3 vTangent;
  varying vec3 vLocal;
  float elevation(vec2 uv) {
    vec2 packed = texture2D(uHeight, uv).rg;
    return ((packed.r * 65280.0 + packed.g * 255.0) * 0.5 - 10000.0) / 1737400.0;
  }
  void main() {
    vUv = uv;
    vLocal = normalize(position);
    vec3 displaced = position + normal * elevation(uv) * 1.62 * uRelief;
    vWorld = (modelMatrix * vec4(displaced, 1.0)).xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    float phi = uv.x * 6.2831853;
    vTangent = normalize(mat3(modelMatrix) * vec3(sin(phi), 0.0, cos(phi)));
    gl_Position = projectionMatrix * viewMatrix * vec4(vWorld, 1.0);
  }
`

export const moonFragment = /* glsl */ `
  uniform sampler2D uColor;
  uniform highp sampler2D uHeight;
  uniform vec3 uSun;
  uniform float uRelief;
  uniform float uScan;
  uniform float uPolar;
  uniform float uProgress;
  varying vec2 vUv;
  varying vec3 vWorld;
  varying vec3 vNormal;
  varying vec3 vTangent;
  varying vec3 vLocal;
  float elevation(vec2 uv) {
    vec2 packed = texture2D(uHeight, uv).rg;
    return ((packed.r * 65280.0 + packed.g * 255.0) * 0.5 - 10000.0) / 1737400.0;
  }
  float lunarLuma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
  float hash3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float noise3(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash3(i), hash3(i + vec3(1,0,0)), f.x),
                   mix(hash3(i + vec3(0,1,0)), hash3(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash3(i + vec3(0,0,1)), hash3(i + vec3(1,0,1)), f.x),
                   mix(hash3(i + vec3(0,1,1)), hash3(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  void main() {
    vec2 texel = vec2(1.0 / 4096.0, 1.0 / 2048.0);
    float hu = elevation(vUv + vec2(texel.x, 0.0)) - elevation(vUv - vec2(texel.x, 0.0));
    float hv = elevation(vUv + vec2(0.0, texel.y)) - elevation(vUv - vec2(0.0, texel.y));
    float latitude = max(sin(vUv.y * 3.14159265), 0.08);
    vec3 tangent = normalize(vTangent);
    vec3 bitangent = normalize(cross(vNormal, tangent));
    vec3 n = normalize(vNormal - (uRelief * 0.65) * (tangent * hu / (12.56637 * texel.x * latitude) + bitangent * hv / (6.28318 * texel.y)));
    // Fine optical variation is deliberately subtle; the measured LOLA gradient
    // remains the dominant source of relief, rather than a procedural crater map.
    float bu = lunarLuma(texture2D(uColor, vUv + vec2(texel.x, 0.0)).rgb) - lunarLuma(texture2D(uColor, vUv - vec2(texel.x, 0.0)).rgb);
    float bv = lunarLuma(texture2D(uColor, vUv + vec2(0.0, texel.y)).rgb) - lunarLuma(texture2D(uColor, vUv - vec2(0.0, texel.y)).rgb);
    n = normalize(n - (tangent * bu + bitangent * bv) * 0.36);
    vec3 viewDir = normalize(cameraPosition - vWorld);
    float mu0 = dot(n, normalize(uSun));
    float mu = max(dot(n, viewDir), 0.025);
    // Lommel–Seeliger / Lambert hybrid: a rough, airless regolith, with a
    // geometrical day/night boundary. This is an artistic BRDF, not a solver.
    float lit = max(mu0, 0.0);
    float terminator = smoothstep(-0.009, 0.019, mu0);
    float diffuse = (0.38 * lit + 0.62 * lit / max(lit + mu, 0.05)) * terminator;
    vec3 albedo = texture2D(uColor, vUv).rgb;
    vec3 color = albedo * (vec3(0.010, 0.016, 0.026) + vec3(1.0, 0.935, 0.83) * diffuse * 2.25);
    float fresnel = pow(1.0 - max(dot(normalize(vNormal), viewDir), 0.0), 5.0);
    color += vec3(0.25, 0.32, 0.40) * fresnel * terminator * 0.08;
    // Cartographic overlays are illustrative, not model predictions.
    vec2 cell = vUv * vec2(48.0, 24.0);
    vec2 width = max(fwidth(cell), vec2(0.0001));
    vec2 grid = abs(fract(cell - 0.5) - 0.5) / width;
    float line = 1.0 - smoothstep(0.4, 1.2, min(grid.x, grid.y));
    float sweep = exp(-pow((vUv.y - mix(0.05, 0.95, uProgress)) * 65.0, 2.0));
    color *= 1.0 - 0.38 * uScan;
    color += vec3(0.65, 0.46, 0.22) * (line * 0.45 + sweep * 0.65) * uScan * (0.25 + mu * 0.75);
    // Object-space noise avoids latitude/longitude pinching at the pole.
    // Sparse soft glints suggest areas of interest, never an ice measurement.
    float cap = smoothstep(0.76, 0.97, -vLocal.y);
    float field = noise3(vLocal * 24.0) * 0.6 + noise3(vLocal * 67.0) * 0.4;
    float patches = smoothstep(0.61, 0.77, field);
    color += (vec3(0.008, 0.035, 0.055) + vec3(0.06, 0.35, 0.55) * patches) * cap * uPolar;
    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

export const haloVertex = /* glsl */ `
  varying vec3 vPoint;
  varying vec3 vEye;
  varying vec3 vLight;
  uniform vec3 uSun;
  void main() {
    vPoint = position;
    vEye = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
    vLight = normalize((inverse(modelMatrix) * vec4(uSun, 0.0)).xyz);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

export const haloFragment = /* glsl */ `
  varying vec3 vPoint;
  varying vec3 vEye;
  varying vec3 vLight;
  void main() {
    vec3 ray = normalize(vPoint - vEye);
    float b = dot(vEye, ray);
    float disc = b*b - dot(vEye, vEye) + 1.72*1.72;
    if (disc < 0.0) discard;
    float start = max(0.0, -b - sqrt(disc));
    float end = -b + sqrt(disc);
    float stepSize = (end - start) / 12.0;
    float opticalDepth = 0.0;
    for (int i = 0; i < 12; i++) {
      vec3 p = vEye + ray * (start + (float(i) + 0.5) * stepSize);
      float radius = length(p);
      if (radius < 1.623) break;
      float height = max(radius - 1.623, 0.0);
      float light = smoothstep(-0.22, 0.65, dot(normalize(p), vLight));
      opticalDepth += exp(-height * 95.0) * light * stepSize;
    }
    // An art-directed optical halo, explicitly identified as such in the UI.
    float intensity = 1.0 - exp(-opticalDepth * 2.6);
    gl_FragColor = vec4(vec3(0.46, 0.56, 0.69) * intensity, intensity * 0.5);
  }
`
