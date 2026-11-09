import { useEffect, useRef, useState } from 'react';
import { Mesh, Program, Renderer, Triangle, Vec3 } from 'ogl';
import { cn } from '../ui';

interface VoicePoweredOrbProps {
  className?: string;
  hue?: number;
  isActive?: boolean;
  voiceLevel?: number;
  onVoiceDetected?: (detected: boolean) => void;
}

const vertexShader = `
  attribute vec2 position;
  attribute vec2 uv;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;

  uniform float iTime;
  uniform vec3 iResolution;
  uniform float hue;
  uniform float voice;
  uniform float active;
  varying vec2 vUv;

  vec3 rotateHue(vec3 color, float degrees) {
    const mat3 yiq = mat3(
      0.299, 0.596, 0.211,
      0.587, -0.274, -0.523,
      0.114, -0.322, 0.312
    );
    const mat3 rgb = mat3(
      1.0, 1.0, 1.0,
      0.956, -0.272, -1.106,
      0.621, -0.647, 1.703
    );
    vec3 converted = yiq * color;
    float angle = degrees * 0.0174532925;
    float i = converted.y * cos(angle) - converted.z * sin(angle);
    float q = converted.y * sin(angle) + converted.z * cos(angle);
    return rgb * vec3(converted.x, i, q);
  }

  float field(vec2 point, float time) {
    float angle = atan(point.y, point.x);
    return sin(angle * 3.0 + time * 1.25 + point.x * 5.0)
      * cos(point.y * 4.0 - time * 0.8) * 0.5;
  }

  void main() {
    vec2 point = (vUv * iResolution.xy - iResolution.xy * 0.5)
      / min(iResolution.x, iResolution.y);
    float radius = length(point);
    float time = iTime * mix(0.2, 1.0, active);
    float wave = field(point, time) * (0.025 + voice * 0.11);
    float edge = 0.48 + wave;
    float body = 1.0 - smoothstep(edge - 0.018, edge + 0.018, radius);
    float glow = exp(-max(radius - edge, 0.0) * 18.0) * 0.24;
    float angle = atan(point.y, point.x) + time * (0.35 + voice * 1.4);
    float sweep = smoothstep(0.94, 1.0, sin(angle * 2.0 + radius * 9.0) * 0.5 + 0.5);

    vec3 aubergine = vec3(0.227, 0.059, 0.204);
    vec3 marigold = vec3(0.918, 0.667, 0.0);
    vec3 silver = vec3(0.867, 0.890, 0.910);
    vec3 color = mix(aubergine, marigold, smoothstep(-0.4, 0.55, point.x + wave * 4.0));
    color = mix(color, silver, sweep * body * (0.2 + voice * 0.45));
    color = rotateHue(color, hue);

    float alpha = clamp(body + glow, 0.0, 1.0);
    gl_FragColor = vec4(color * alpha, alpha);
  }
`;

export function VoicePoweredOrb({
  className,
  hue = 0,
  isActive = false,
  voiceLevel = 0,
  onVoiceDetected,
}: VoicePoweredOrbProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onVoiceDetectedRef = useRef(onVoiceDetected);
  const activeRef = useRef(isActive);
  const levelRef = useRef(voiceLevel);
  const [webglAvailable, setWebglAvailable] = useState(true);

  useEffect(() => {
    onVoiceDetectedRef.current = onVoiceDetected;
    activeRef.current = isActive;
    levelRef.current = Math.max(0, Math.min(1, voiceLevel));
  }, [isActive, onVoiceDetected, voiceLevel]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: Renderer;
    try {
      renderer = new Renderer({
        alpha: true,
        antialias: true,
        dpr: Math.min(window.devicePixelRatio || 1, 2),
        premultipliedAlpha: false,
      });
    } catch {
      setWebglAvailable(false);
      return;
    }

    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    const canvas = gl.canvas;
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.display = 'block';
    canvas.style.pointerEvents = 'none';
    container.appendChild(canvas);

    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Vec3(1, 1, 1) },
        hue: { value: hue },
        voice: { value: 0 },
        active: { value: 0 },
      },
    });
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      if (!width || !height) return;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setSize(width * pixelRatio, height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      program.uniforms.iResolution.value.set(canvas.width, canvas.height, canvas.width / canvas.height);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frameId = 0;
    let smoothedVoice = 0;
    const render = (time: number) => {
      const active = activeRef.current;
      const targetVoice = active ? levelRef.current : 0;
      smoothedVoice += (targetVoice - smoothedVoice) * 0.12;
      program.uniforms.iTime.value = reducedMotion.matches ? 0 : time * 0.001;
      program.uniforms.voice.value = smoothedVoice;
      program.uniforms.active.value = active ? 1 : 0;
      program.uniforms.hue.value = hue;
      renderer.render({ scene: mesh });
      frameId = window.requestAnimationFrame(render);
    };
    frameId = window.requestAnimationFrame(render);

    const reportVoice = () => onVoiceDetectedRef.current?.(activeRef.current && levelRef.current > 0.12);
    const voiceInterval = window.setInterval(reportVoice, 100);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearInterval(voiceInterval);
      resizeObserver.disconnect();
      if (container.contains(canvas)) container.removeChild(canvas);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [hue]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative isolate h-full w-full overflow-hidden rounded-full bg-[radial-gradient(circle_at_35%_30%,#eaaa00_0%,#3a0f34_70%)]',
        !webglAvailable && 'motion-safe:animate-pulse',
        className,
      )}
      aria-hidden="true"
    />
  );
}
