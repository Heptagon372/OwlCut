// WebGL(GLSL ES 1.0) 셰이더. 파이프라인:
//   [glow가 있으면] 크롭·축소(COPY) → 가우시안 블러 가로/세로(BLUR) x2
//   → MAIN: 피부보정 → 노출·화이트밸런스·대비 → 하이라이트/섀도 → 채도/바이브런스 → 커브
//           → 흑백·세피아 → 스플릿 토닝 → 페이드 → 글로우 → 비네팅 → 빛샘 → 그레인 → 강도 섞기
//   (MAIN 맨 앞에서 AR 얼굴 왜곡·모자이크로 샘플 좌표를 먼저 옮긴다)

export const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

// 소스의 크롭 영역을 출력(또는 축소 버퍼)으로 복사
export const FRAG_COPY = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uSrc;
uniform vec4 uSrcRect;
void main() {
  gl_FragColor = vec4(texture2D(uSrc, uSrcRect.xy + vUv * uSrcRect.zw).rgb, 1.0);
}`;

// 9탭 가우시안 (한 방향)
export const FRAG_BLUR = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uDir;
void main() {
  vec3 c = texture2D(uTex, vUv).rgb * 0.2270270270;
  c += texture2D(uTex, vUv + uDir).rgb * 0.1945945946;
  c += texture2D(uTex, vUv - uDir).rgb * 0.1945945946;
  c += texture2D(uTex, vUv + uDir * 2.0).rgb * 0.1216216216;
  c += texture2D(uTex, vUv - uDir * 2.0).rgb * 0.1216216216;
  c += texture2D(uTex, vUv + uDir * 3.0).rgb * 0.0540540541;
  c += texture2D(uTex, vUv - uDir * 3.0).rgb * 0.0540540541;
  c += texture2D(uTex, vUv + uDir * 4.0).rgb * 0.0162162162;
  c += texture2D(uTex, vUv - uDir * 4.0).rgb * 0.0162162162;
  gl_FragColor = vec4(c, 1.0);
}`;

export const FRAG_MAIN = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
uniform sampler2D uSrc;
uniform sampler2D uBlur;
uniform sampler2D uCurve;
uniform vec4 uSrcRect;
uniform vec2 uOutSize;
uniform float uIntensity;
uniform float uExposure;
uniform float uBrightness;
uniform float uContrast;
uniform float uSaturation;
uniform float uVibrance;
uniform float uTemp;
uniform float uTint;
uniform float uHighlights;
uniform float uShadows;
uniform float uFade;
uniform float uBw;
uniform vec3 uBwMix;
uniform float uSepia;
uniform vec3 uSplitShadow;
uniform vec3 uSplitHighlight;
uniform float uSplitAmount;
uniform float uGlow;
uniform float uSmooth;
uniform float uVignette;
uniform float uGrain;
uniform float uLeak;
uniform vec3 uLeakColor;
uniform float uSeed;
uniform float uUseCurve;
// AR 얼굴 효과 — 좌표는 소스 텍스처 픽셀 (y 위쪽이 +, 업로드 시 FLIP_Y 기준)
uniform vec2 uSrcSize;
uniform vec4 uWarp[8];   // 중심 x, y, 반경, 세기(+ 볼록 / - 오목)
uniform float uWarpCount;
uniform vec4 uMosaicA[4]; // 중심 x, y, 반경 x, 반경 y
uniform vec4 uMosaicB[4]; // 회전(라디안), 블록 크기
uniform float uMosaicCount;

float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

// 볼록 렌즈: 반경 안쪽을 중심 쪽에서 샘플 → 확대.
// 배율 곡선 k(u) = 1 - s(1-u²)² : 안쪽 절반까지 배율이 고르게 유지되고(눈 전체가 커짐),
// 가장자리(u=1)에서 값·기울기가 모두 이어져 경계선이 안 생긴다. |s| < 1 이면 접히지 않음.
vec2 applyWarps(vec2 uv) {
  vec2 p = uv * uSrcSize;
  for (int i = 0; i < 8; i++) {
    if (float(i) >= uWarpCount) break;
    vec4 w = uWarp[i];
    vec2 d = p - w.xy;
    float u = length(d) / w.z;
    if (u < 1.0) {
      float q = 1.0 - u * u;
      p = w.xy + d * (1.0 - w.w * q * q);
    }
  }
  return p / uSrcSize;
}

// 얼굴 타원 안쪽만 블록 단위로 뭉갬
vec2 applyMosaic(vec2 uv) {
  vec2 p = uv * uSrcSize;
  for (int i = 0; i < 4; i++) {
    if (float(i) >= uMosaicCount) break;
    vec4 a = uMosaicA[i];
    vec4 b = uMosaicB[i];
    vec2 d = p - a.xy;
    float cs = cos(b.x);
    float sn = sin(b.x);
    vec2 r = vec2(cs * d.x + sn * d.y, -sn * d.x + cs * d.y) / a.zw;
    if (dot(r, r) < 1.0) return (floor(p / b.y) + 0.5) * b.y / uSrcSize;
  }
  return uv;
}

// 피부색 마스크: YCbCr에서 Cb 77~127, Cr 133~173 (0~255 기준) 부근
float skinMask(vec3 c) {
  float y = dot(c, vec3(0.299, 0.587, 0.114));
  float cb = 0.5 + dot(c, vec3(-0.168736, -0.331264, 0.5));
  float cr = 0.5 + dot(c, vec3(0.5, -0.418688, -0.081312));
  float mCb = smoothstep(0.28, 0.31, cb) * (1.0 - smoothstep(0.50, 0.53, cb));
  float mCr = smoothstep(0.51, 0.54, cr) * (1.0 - smoothstep(0.68, 0.71, cr));
  return mCb * mCr * smoothstep(0.12, 0.22, y);
}

// 윤곽 보존 블러 (bilateral, 12탭 두 고리) — 눈·입 경계는 살리고 피부 결만 부드럽게
vec3 bilateral(vec2 uv, vec3 center, vec2 radius) {
  vec3 sum = center;
  float wsum = 1.0;
  for (int i = 0; i < 12; i++) {
    float fi = float(i);
    float inner = fi < 6.0 ? 1.0 : 0.0;
    float ring = mix(1.0, 0.5, inner);
    float ang = fi * 1.0471976 + (1.0 - inner) * 0.5235988;
    vec3 s = texture2D(uSrc, uv + vec2(cos(ang), sin(ang)) * ring * radius).rgb;
    vec3 d = s - center;
    float w = exp(-dot(d, d) * 60.0) * mix(0.6, 1.0, inner);
    sum += s * w;
    wsum += w;
  }
  return sum / wsum;
}

vec3 softLight(vec3 b, vec3 s) {
  return mix(2.0 * b * s + b * b * (1.0 - 2.0 * s),
             sqrt(b) * (2.0 * s - 1.0) + 2.0 * b * (1.0 - s),
             step(0.5, s));
}

float lutX(float v) { return clamp(v, 0.0, 1.0) * (255.0 / 256.0) + 0.5 / 256.0; }

vec3 applyCurves(vec3 c) {
  c = vec3(texture2D(uCurve, vec2(lutX(c.r), 0.5)).a,
           texture2D(uCurve, vec2(lutX(c.g), 0.5)).a,
           texture2D(uCurve, vec2(lutX(c.b), 0.5)).a);
  return vec3(texture2D(uCurve, vec2(lutX(c.r), 0.5)).r,
              texture2D(uCurve, vec2(lutX(c.g), 0.5)).g,
              texture2D(uCurve, vec2(lutX(c.b), 0.5)).b);
}

float rand(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  vec2 uv = uSrcRect.xy + vUv * uSrcRect.zw;
  if (uWarpCount > 0.0) uv = applyWarps(uv);
  if (uMosaicCount > 0.0) uv = applyMosaic(uv);
  vec3 orig = texture2D(uSrc, uv).rgb; // 강도 섞기의 "원본"도 얼굴 효과는 적용된 상태
  vec3 c = orig;

  if (uSmooth > 0.0) {
    vec2 px = uSrcRect.zw / uOutSize; // 출력 1px 에 해당하는 소스 UV
    vec3 sm = bilateral(uv, c, px * (uSmooth * uOutSize.y * 0.012));
    float m = skinMask(c);
    c = mix(c, sm, clamp(m * uSmooth * 1.4, 0.0, 1.0));
    c += m * uSmooth * 0.04; // 피부 톤을 살짝 밝게
  }

  c *= exp2(uExposure);
  c += uBrightness;
  // 화이트밸런스: ±1 = 강한 색 틀어짐, 보통 0.05~0.3 (프리셋 레시피 기준에 맞춘 세기)
  c *= vec3(1.0 + uTemp * 0.18 + uTint * 0.06, 1.0 - uTint * 0.12, 1.0 - uTemp * 0.18 + uTint * 0.06);
  c = (c - 0.5) * uContrast + 0.5;

  float l = luma(c);
  c += uShadows * 0.25 * (1.0 - smoothstep(0.0, 0.5, l));
  c += uHighlights * 0.25 * smoothstep(0.5, 1.0, l);

  l = luma(c);
  c = mix(vec3(l), c, uSaturation);
  float mx = max(c.r, max(c.g, c.b));
  float mn = min(c.r, min(c.g, c.b));
  c = mix(vec3(luma(c)), c, 1.0 + uVibrance * (1.0 - clamp(mx - mn, 0.0, 1.0)));

  c = clamp(c, 0.0, 1.0);
  if (uUseCurve > 0.5) c = applyCurves(c);

  c = mix(c, vec3(dot(c, uBwMix)), uBw);
  vec3 sep = vec3(dot(c, vec3(0.393, 0.769, 0.189)),
                  dot(c, vec3(0.349, 0.686, 0.168)),
                  dot(c, vec3(0.272, 0.534, 0.131)));
  c = mix(c, sep, uSepia);

  c = clamp(c, 0.0, 1.0);
  vec3 tone = mix(uSplitShadow, uSplitHighlight, smoothstep(0.15, 0.85, luma(c)));
  c = mix(c, softLight(c, tone), uSplitAmount);

  c = c * (1.0 - uFade) + uFade;

  if (uGlow > 0.0) {
    vec3 b = texture2D(uBlur, vUv).rgb;
    // 번짐 레이어도 흑백·세피아를 똑같이 적용 (안 하면 흑백 사진에 원본 색이 다시 스며듦)
    b = mix(b, vec3(dot(b, uBwMix)), uBw);
    b = mix(b, vec3(dot(b, vec3(0.393, 0.769, 0.189)), dot(b, vec3(0.349, 0.686, 0.168)), dot(b, vec3(0.272, 0.534, 0.131))), uSepia);
    c = mix(c, 1.0 - (1.0 - c) * (1.0 - b), uGlow * 0.6);
  }

  float aspect = uOutSize.x / uOutSize.y;
  vec2 d = vUv - 0.5;
  d.x *= aspect;
  c *= mix(1.0, smoothstep(0.95, 0.3, length(d)), uVignette);

  float lk = 1.0 - smoothstep(0.0, 0.9, length((vUv - vec2(0.0, 1.0)) * vec2(aspect, 1.0)));
  c += uLeakColor * lk * uLeak * 0.55;

  // 필름 입자: 어두운·중간 톤에서 잘 보이고 밝은 곳에선 옅어짐 (실제 필름처럼)
  float response = smoothstep(0.05, 0.5, luma(c));
  c += (rand(vUv * uOutSize + uSeed) - 0.5) * uGrain * (1.0 - 0.7 * response * response);

  gl_FragColor = vec4(mix(orig, clamp(c, 0.0, 1.0), uIntensity), 1.0);
}`;
