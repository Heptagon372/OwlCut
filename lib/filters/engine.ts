// WebGL 필터 엔진 — 촬영 미리보기(실시간 video), 썸네일, 최종 합성이 같은 셰이더를 쓴다.
// 브라우저 전용. WebGL이 없으면 생성자가 throw → 호출 측이 CSS 필터로 폴백.
import type { FilterParams } from "@/types/filter";
import { curveTextureData, hasCurves } from "./curves";
import { FRAG_BLUR, FRAG_COPY, FRAG_MAIN, VERT } from "./shaders";

export interface RenderOptions {
  width: number;   // 출력 크기(px)
  height: number;
  srcRect?: { x: number; y: number; w: number; h: number }; // 소스에서 쓸 영역(px, 좌상단 기준). 없으면 전체
  intensity?: number; // 0..1 (0 = 원본)
  seed?: number;      // 그레인 난수 시드
}

type Source = TexImageSource;

interface Program {
  prog: WebGLProgram;
  loc: (name: string) => WebGLUniformLocation | null;
  aPos: number;
}

interface Target {
  tex: WebGLTexture;
  fb: WebGLFramebuffer;
  w: number;
  h: number;
}

const QUAD = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
const DEFAULT_BW_MIX: [number, number, number] = [0.2126, 0.7152, 0.0722];

export function hexToRgb(hex: string | undefined, fallback: [number, number, number]): [number, number, number] {
  const m = hex ? /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex) : null;
  return m ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255] : fallback;
}

export class FilterEngine {
  readonly canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private quad: WebGLBuffer;
  private main: Program;
  private copy: Program;
  private blur: Program;
  private srcTex: WebGLTexture;
  private curveTex: WebGLTexture;
  private blankTex: WebGLTexture;
  private curveKey = "";
  private targets: Target[] = [];
  private lost = false;
  private readonly ownsCanvas: boolean;

  constructor(canvas?: HTMLCanvasElement) {
    this.ownsCanvas = !canvas;
    this.canvas = canvas ?? document.createElement("canvas");
    const gl = this.canvas.getContext("webgl", {
      preserveDrawingBuffer: true, // 렌더 직후 drawImage/toDataURL 로 읽어가기 위해
      premultipliedAlpha: false,
      antialias: false,
      alpha: false,
    }) as WebGLRenderingContext | null;
    if (!gl) throw new Error("WebGL을 사용할 수 없어요");
    this.gl = gl;
    this.canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.lost = true;
    });

    this.quad = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW);

    this.main = this.program(FRAG_MAIN);
    this.copy = this.program(FRAG_COPY);
    this.blur = this.program(FRAG_BLUR);
    this.srcTex = this.texture();
    this.curveTex = this.texture();
    this.blankTex = this.texture();
    gl.bindTexture(gl.TEXTURE_2D, this.blankTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
  }

  static isSupported(): boolean {
    try {
      return Boolean(document.createElement("canvas").getContext("webgl"));
    } catch {
      return false;
    }
  }

  get isLost(): boolean {
    return this.lost;
  }

  /** 필터를 적용해 this.canvas 에 그린다. 실패(컨텍스트 손실 등) 시 false. */
  render(source: Source, srcW: number, srcH: number, params: FilterParams, opts: RenderOptions): boolean {
    if (this.lost || !srcW || !srcH) return false;
    const gl = this.gl;
    const width = Math.max(1, Math.round(opts.width));
    const height = Math.max(1, Math.round(opts.height));
    if (this.canvas.width !== width) this.canvas.width = width;
    if (this.canvas.height !== height) this.canvas.height = height;

    // 소스 업로드 (DOM 소스는 위아래를 뒤집어 GL 좌표계와 맞춤)
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.srcTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

    const r = opts.srcRect ?? { x: 0, y: 0, w: srcW, h: srcH };
    const srcRect: [number, number, number, number] = [r.x / srcW, 1 - (r.y + r.h) / srcH, r.w / srcW, r.h / srcH];

    // 소프트 글로우용 저해상도 블러
    const glow = params.glow ?? 0;
    let blurTex = this.blankTex;
    if (glow > 0) {
      const bw = Math.max(16, Math.round(width / 4));
      const bh = Math.max(16, Math.round(height / 4));
      const [a, b] = [this.target(0, bw, bh), this.target(1, bw, bh)];
      this.pass(this.copy, a, (p) => {
        this.bindTex(0, this.srcTex, p.loc("uSrc"));
        gl.uniform4fv(p.loc("uSrcRect"), srcRect);
      });
      for (let i = 0; i < 2; i++) {
        this.pass(this.blur, b, (p) => {
          this.bindTex(0, a.tex, p.loc("uTex"));
          gl.uniform2f(p.loc("uDir"), 1.5 / bw, 0);
        });
        this.pass(this.blur, a, (p) => {
          this.bindTex(0, b.tex, p.loc("uTex"));
          gl.uniform2f(p.loc("uDir"), 0, 1.5 / bh);
        });
      }
      blurTex = a.tex;
    }

    // 톤 커브 LUT (바뀔 때만 업로드)
    const useCurve = hasCurves(params);
    if (useCurve) {
      const key = JSON.stringify(params.curves);
      if (key !== this.curveKey) {
        gl.bindTexture(gl.TEXTURE_2D, this.curveTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, curveTextureData(params));
        this.curveKey = key;
      }
    }

    this.pass(this.main, null, (p) => {
      const f = (name: string, v: number) => gl.uniform1f(p.loc(name), v);
      const v3 = (name: string, v: [number, number, number]) => gl.uniform3fv(p.loc(name), v);
      this.bindTex(0, this.srcTex, p.loc("uSrc"));
      this.bindTex(1, blurTex, p.loc("uBlur"));
      this.bindTex(2, useCurve ? this.curveTex : this.blankTex, p.loc("uCurve"));
      gl.uniform4fv(p.loc("uSrcRect"), srcRect);
      gl.uniform2f(p.loc("uOutSize"), width, height);
      f("uIntensity", Math.min(Math.max(opts.intensity ?? 1, 0), 1));
      f("uExposure", params.exposure ?? 0);
      f("uBrightness", params.brightness ?? 0);
      f("uContrast", params.contrast ?? 1);
      f("uSaturation", params.saturation ?? 1);
      f("uVibrance", params.vibrance ?? 0);
      f("uTemp", params.temperature ?? 0);
      f("uTint", params.tint ?? 0);
      f("uHighlights", params.highlights ?? 0);
      f("uShadows", params.shadows ?? 0);
      f("uFade", params.fade ?? 0);
      f("uBw", params.bw ?? 0);
      v3("uBwMix", params.bwMix ?? DEFAULT_BW_MIX);
      f("uSepia", params.sepia ?? 0);
      v3("uSplitShadow", hexToRgb(params.splitShadow, [0.5, 0.5, 0.5]));
      v3("uSplitHighlight", hexToRgb(params.splitHighlight, [0.5, 0.5, 0.5]));
      f("uSplitAmount", params.splitAmount ?? 0);
      f("uGlow", glow);
      f("uSmooth", params.smooth ?? 0);
      f("uVignette", params.vignette ?? 0);
      f("uGrain", params.grain ?? 0);
      f("uLeak", params.leak ?? 0);
      v3("uLeakColor", hexToRgb(params.leakColor, [1, 0.55, 0.2]));
      f("uSeed", opts.seed ?? 0);
      f("uUseCurve", useCurve ? 1 : 0);
    });
    return true;
  }

  dispose() {
    const gl = this.gl;
    for (const t of this.targets) {
      gl.deleteFramebuffer(t.fb);
      gl.deleteTexture(t.tex);
    }
    [this.srcTex, this.curveTex, this.blankTex].forEach((t) => gl.deleteTexture(t));
    [this.main, this.copy, this.blur].forEach((p) => gl.deleteProgram(p.prog));
    gl.deleteBuffer(this.quad);
    // 직접 만든 캔버스만 컨텍스트를 강제로 해제한다. 화면의 <canvas>는 React가 다시 쓸 수 있어서
    // (개발 모드 이펙트 재실행 등) 여기서 잃게 하면 다음 엔진이 죽은 컨텍스트를 받아 실패한다.
    if (this.ownsCanvas) gl.getExtension("WEBGL_lose_context")?.loseContext();
  }

  // ---------- 내부 ----------

  private pass(p: Program, target: Target | null, setup: (p: Program) => void) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fb : null);
    gl.viewport(0, 0, target ? target.w : this.canvas.width, target ? target.h : this.canvas.height);
    gl.useProgram(p.prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.enableVertexAttribArray(p.aPos);
    gl.vertexAttribPointer(p.aPos, 2, gl.FLOAT, false, 0, 0);
    setup(p);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private bindTex(unit: number, tex: WebGLTexture, loc: WebGLUniformLocation | null) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(loc, unit);
  }

  private texture(): WebGLTexture {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }

  private target(i: number, w: number, h: number): Target {
    const gl = this.gl;
    const existing = this.targets[i];
    if (existing && existing.w === w && existing.h === h) return existing;
    if (existing) {
      gl.deleteFramebuffer(existing.fb);
      gl.deleteTexture(existing.tex);
    }
    const tex = this.texture();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const fb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    const t = { tex, fb, w, h };
    this.targets[i] = t;
    return t;
  }

  private program(frag: string): Program {
    const gl = this.gl;
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        throw new Error(`셰이더 컴파일 실패: ${gl.getShaderInfoLog(s)}`);
      }
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error(`셰이더 링크 실패: ${gl.getProgramInfoLog(prog)}`);
    }
    const cache = new Map<string, WebGLUniformLocation | null>();
    return {
      prog,
      aPos: gl.getAttribLocation(prog, "aPos"),
      loc: (name) => {
        if (!cache.has(name)) cache.set(name, gl.getUniformLocation(prog, name));
        return cache.get(name)!;
      },
    };
  }
}
