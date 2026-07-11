/**
 * Hero 3D scene — "signal surface".
 *
 * A GPU-displaced grid of glowing points that undulates like a live market /
 * loss surface, plus a sparse cloud of drifting dust motes. Sits behind the
 * hero copy at z-0 and fades out as the user scrolls past the hero.
 *
 * Design constraints (all enforced here or in Hero3D.astro's gate):
 *   - Lazy: this module (and three) load in a separate chunk, post-idle.
 *   - Theme-aware: colors come from the live `--color-accent` tokens, so the
 *     scene follows dark / light / trader without a rebuild. Additive glow on
 *     dark surfaces, normal blending on light so points stay visible.
 *   - Polite: pauses when the hero is offscreen or the tab is hidden; caps
 *     device-pixel-ratio at 2; all wave math runs in the vertex shader.
 *   - Reversible: returns a teardown that disposes GPU resources so the
 *     reduced-motion listener can shut the whole thing off mid-session.
 */
import * as THREE from "three";

const SURFACE_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute float aSeed;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    float t = uTime;

    // Layered travelling waves — reads as a live signal surface, not noise.
    float y =
      sin(p.x * 0.42 + t * 0.9) * cos(p.z * 0.31 + t * 0.6) * 0.55 +
      sin(p.x * 1.30 - t * 1.4) * 0.12 +
      cos(p.z * 0.90 + t * 1.1) * 0.18;
    // Slow radial pulse rolling out from the origin.
    y += sin(length(p.xz) * 0.55 - t * 1.2) * 0.16;
    p.y += y;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    // Nearer points render larger and brighter; far ones dissolve into the
    // background (cheap stand-in for fog that works with a transparent canvas).
    float depth = clamp(1.0 - (-mv.z - 2.0) / 20.0, 0.0, 1.0);
    gl_PointSize = (1.1 + depth * 2.4 + aSeed * 1.1) * uPixelRatio;
    vAlpha = 0.08 + depth * 0.92;
  }
`;

const DUST_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute float aSeed;
  varying float vAlpha;

  void main() {
    vec3 p = position;
    // Slow upward drift with wraparound, plus a lazy horizontal sway.
    p.y = mod(p.y + uTime * (0.06 + aSeed * 0.10), 6.0);
    p.x += sin(uTime * 0.2 + aSeed * 40.0) * 0.35;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    gl_PointSize = (0.9 + aSeed * 1.8) * uPixelRatio;
    // Twinkle, de-synced per mote by its seed.
    vAlpha = (0.55 + 0.45 * sin(uTime * (0.6 + aSeed) + aSeed * 20.0)) * 0.5;
  }
`;

const POINT_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vAlpha;

  void main() {
    // Soft round sprite — discard the square's corners with a smooth falloff.
    float d = length(gl_PointCoord - 0.5);
    float circle = smoothstep(0.5, 0.12, d);
    if (circle < 0.01) discard;
    gl_FragColor = vec4(uColor, circle * vAlpha * uOpacity);
  }
`;

function makePointsMaterial(vertexShader: string) {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader: POINT_FRAG,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
      uColor: { value: new THREE.Color("#3d52fe") },
      uOpacity: { value: 1 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

function buildSurfaceGeometry(compact: boolean) {
  const nx = compact ? 88 : 144;
  const nz = compact ? 56 : 88;
  const positions = new Float32Array(nx * nz * 3);
  const seeds = new Float32Array(nx * nz);
  let i = 0;
  for (let ix = 0; ix < nx; ix++) {
    for (let iz = 0; iz < nz; iz++) {
      positions[i * 3] = -17 + (34 * ix) / (nx - 1);
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = -19 + (21.5 * iz) / (nz - 1);
      // Deterministic per-point jitter — keeps the grid from looking stamped.
      seeds[i] = Math.abs(Math.sin(ix * 12.9898 + iz * 78.233) * 43758.5453) % 1;
      i++;
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  return geo;
}

function buildDustGeometry(compact: boolean) {
  const count = compact ? 90 : 170;
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    // Deterministic pseudo-random spread (seeded by index) inside the box the
    // camera looks through: x ∈ [-9, 9], y ∈ [0, 6), z ∈ [-9, 2].
    const r1 = Math.abs(Math.sin(i * 127.1 + 311.7) * 43758.5453) % 1;
    const r2 = Math.abs(Math.sin(i * 269.5 + 183.3) * 43758.5453) % 1;
    const r3 = Math.abs(Math.sin(i * 419.2 + 371.9) * 43758.5453) % 1;
    positions[i * 3] = -9 + r1 * 18;
    positions[i * 3 + 1] = r2 * 6;
    positions[i * 3 + 2] = -9 + r3 * 11;
    seeds[i] = r1;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
  return geo;
}

export function initHero3D(host: HTMLElement): () => void {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      powerPreference: "low-power",
    });
  } catch {
    // Context creation can fail even when the probe succeeded (GPU pressure,
    // blocklisted drivers). The static gradient hero remains — just bail.
    return () => {};
  }

  const hero = host.closest<HTMLElement>("[data-hero]") ?? host;
  const compact = window.matchMedia("(max-width: 768px)").matches;

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(host.clientWidth, host.clientHeight);
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    55,
    host.clientWidth / Math.max(host.clientHeight, 1),
    0.1,
    60
  );
  camera.position.set(0, 2.1, 6.2);

  const surfaceMat = makePointsMaterial(SURFACE_VERT);
  const dustMat = makePointsMaterial(DUST_VERT);
  const surfaceGeo = buildSurfaceGeometry(compact);
  const dustGeo = buildDustGeometry(compact);
  scene.add(new THREE.Points(surfaceGeo, surfaceMat));
  scene.add(new THREE.Points(dustGeo, dustMat));

  const pixelRatio = renderer.getPixelRatio();
  surfaceMat.uniforms.uPixelRatio.value = pixelRatio;
  dustMat.uniforms.uPixelRatio.value = pixelRatio;

  /* Theme — follow the live CSS tokens so dark / light / trader all work. */
  const applyTheme = () => {
    const root = document.documentElement;
    const styles = getComputedStyle(root);
    const accent = styles.getPropertyValue("--color-accent").trim() || "#3d52fe";
    const accentText =
      styles.getPropertyValue("--color-accent-text").trim() || accent;
    const isLight = root.getAttribute("data-theme") === "light";
    try {
      // Dark themes: brighter token + additive blending = glow. Light theme:
      // the darker accent reads as fine ink on the paper-like surface.
      surfaceMat.uniforms.uColor.value.set(isLight ? accent : accentText);
      dustMat.uniforms.uColor.value.set(accentText);
    } catch {
      /* unparseable custom value — keep previous colors */
    }
    // Additive glow washes out to invisible on a light surface.
    const blending = isLight ? THREE.NormalBlending : THREE.AdditiveBlending;
    surfaceMat.blending = blending;
    dustMat.blending = blending;
    surfaceMat.uniforms.uOpacity.value = isLight ? 0.8 : 1.0;
    dustMat.uniforms.uOpacity.value = isLight ? 0.55 : 0.9;
    surfaceMat.needsUpdate = true;
    dustMat.needsUpdate = true;
  };
  applyTheme();
  const themeObserver = new MutationObserver(applyTheme);
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  /* Pointer parallax — gentle camera sway toward the cursor. */
  let targetX = 0;
  let targetY = 0;
  const onPointerMove = (e: PointerEvent) => {
    targetX = (e.clientX / window.innerWidth - 0.5) * 2;
    targetY = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  const hoverCapable = window.matchMedia("(hover: hover)").matches;
  if (hoverCapable) {
    window.addEventListener("pointermove", onPointerMove, { passive: true });
  }

  /* Render loop — time-based, paused when hidden or offscreen. */
  const clock = new THREE.Clock();
  let elapsed = 0;
  let raf = 0;
  let visible = true;
  let contextLost = false;

  const tick = () => {
    raf = 0;
    if (!visible || document.hidden || contextLost) return;

    // Clamp delta so a background-tab return doesn't jump the waves.
    elapsed += Math.min(clock.getDelta(), 0.05);
    surfaceMat.uniforms.uTime.value = elapsed;
    dustMat.uniforms.uTime.value = elapsed;

    camera.position.x += (targetX * 0.55 - camera.position.x) * 0.045;
    camera.position.y += (2.1 - targetY * 0.35 - camera.position.y) * 0.045;
    camera.lookAt(0, 0.4, -7);

    // Fade the whole layer as the hero scrolls away; skip drawing at zero.
    const rect = hero.getBoundingClientRect();
    const fade = Math.min(
      1,
      Math.max(0, rect.bottom / Math.max(rect.height * 0.85, 1))
    );
    host.style.opacity = fade.toFixed(3);
    if (fade > 0.001) renderer.render(scene, camera);

    raf = requestAnimationFrame(tick);
  };
  const resume = () => {
    if (!raf && visible && !document.hidden && !contextLost) {
      clock.getDelta(); // swallow the pause so waves don't leap forward
      raf = requestAnimationFrame(tick);
    }
  };

  const io = new IntersectionObserver((entries) => {
    visible = entries[0]?.isIntersecting ?? true;
    if (visible) resume();
  });
  io.observe(hero);

  const onVisibility = () => resume();
  document.addEventListener("visibilitychange", onVisibility);

  const onContextLost = (e: Event) => {
    e.preventDefault();
    contextLost = true;
  };
  const onContextRestored = () => {
    contextLost = false;
    resume();
  };
  renderer.domElement.addEventListener("webglcontextlost", onContextLost);
  renderer.domElement.addEventListener("webglcontextrestored", onContextRestored);

  const resizeObserver = new ResizeObserver(() => {
    const w = host.clientWidth;
    const h = Math.max(host.clientHeight, 1);
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });
  resizeObserver.observe(host);

  resume();

  return () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    io.disconnect();
    resizeObserver.disconnect();
    themeObserver.disconnect();
    document.removeEventListener("visibilitychange", onVisibility);
    if (hoverCapable) window.removeEventListener("pointermove", onPointerMove);
    renderer.domElement.removeEventListener("webglcontextlost", onContextLost);
    renderer.domElement.removeEventListener(
      "webglcontextrestored",
      onContextRestored
    );
    surfaceGeo.dispose();
    dustGeo.dispose();
    surfaceMat.dispose();
    dustMat.dispose();
    renderer.dispose();
    renderer.domElement.remove();
    host.style.opacity = "";
  };
}
