import type { MarkPixels } from "./formations";
/**
 * The landing page's living field: about 22,000 points (9,000 on phones) in one draw call, morphing between the
 * formations in formations.ts as the visitor scrolls through the acts. The morph, its staggered burst, the coach's
 * voice ripple and the scout's scan ring all run in the vertex shader; an iridescent core sits inside the shapes that
 * have a centre. Loaded on demand by stage.tsx, so three.js never delays the prerendered page.
 */
import {
	AdditiveBlending,
	BufferAttribute,
	BufferGeometry,
	Color,
	Group,
	MathUtils,
	Mesh,
	PerspectiveCamera,
	PlaneGeometry,
	Points,
	PointsMaterial,
	Scene,
	ShaderMaterial,
	Sphere,
	SphereGeometry,
	Vector3,
	WebGLRenderer,
} from "three";
import { createField } from "./formations";
import { coverAt, lastStage, readCopy, readStages, stageAt } from "./progress";

type SceneOptions = {
	canvas: HTMLCanvasElement;
	/** The page, whose `[data-stage]` sections drive the journey. */
	root: HTMLElement;
	reducedMotion: boolean;
	rtl: boolean;
	templates: number;
	languages: number;
	/** Called when the GPU drops the context, so the page can show its still fallback. */
	onLost: () => void;
	/** Called when the GPU gives the context back, so the page can show the field again. */
	onRestored: () => void;
};

/**
 * On phones the field rides in the top half of the screen above the copy, and every act's copy scrolls up through it.
 * It glows at this fraction of its full strength while the band is clear and fades to `phoneCovered` of that as copy
 * fills it, so the copy always reads.
 */
const phoneGlow = 0.7;
const phoneCovered = 0.28;

type Vec = [number, number, number];

/** How the field sits for each stage: where it is (beside that act's copy), how it's turned and what's switched on. */
type Pose = {
	position: Vec;
	rotation: Vec;
	scale: number;
	core: number;
	scan: number;
	voice: number;
	dim: number;
	nebulaA: Vec;
	nebulaB: Vec;
};

const tint = (hex: string): Vec => new Color(hex).multiplyScalar(0.55).toArray() as Vec;

const POSES: Pose[] = [
	{
		position: [2.5, 0.2, 0],
		rotation: [0.5, 0, 0.18],
		scale: 1,
		core: 1,
		scan: 0,
		voice: 0,
		dim: 1,
		nebulaA: tint("#2b2190"),
		nebulaB: tint("#0c3d55"),
	},
	{
		position: [-2.6, 0, 0],
		rotation: [0.25, 0, 0],
		scale: 1,
		core: 0.72,
		scan: 0,
		voice: 0,
		dim: 1,
		nebulaA: tint("#2b2190"),
		nebulaB: tint("#3a2a0e"),
	},
	{
		position: [2.2, -0.5, 0],
		rotation: [0.72, -0.25, 0],
		scale: 0.85,
		core: 0,
		scan: 1,
		voice: 0,
		dim: 1,
		nebulaA: tint("#0c4a66"),
		nebulaB: tint("#1b1f6a"),
	},
	{
		position: [-2.1, 0, 0],
		rotation: [0, 0, 0],
		scale: 0.82,
		core: 0,
		scan: 0,
		voice: 0,
		dim: 1,
		nebulaA: tint("#4d1a5a"),
		nebulaB: tint("#0c4a66"),
	},
	{
		position: [2.6, 0.1, 0],
		rotation: [0.05, -0.35, 0],
		scale: 0.72,
		core: 0,
		scan: 0,
		voice: 0,
		dim: 1,
		nebulaA: tint("#2b2190"),
		nebulaB: tint("#4a3510"),
	},
	{
		position: [-2.5, 0, 0],
		rotation: [0.2, 0, 0],
		scale: 1,
		core: 0.85,
		scan: 0,
		voice: 1,
		dim: 1,
		nebulaA: tint("#5a1a50"),
		nebulaB: tint("#2b2190"),
	},
	{
		position: [2.6, -0.1, 0],
		rotation: [0.22, -0.5, 0],
		scale: 0.95,
		core: 0,
		scan: 0,
		voice: 0,
		dim: 1,
		nebulaA: tint("#1f3a2a"),
		nebulaB: tint("#2b2190"),
	},
	{
		position: [-2.6, 0, 0],
		rotation: [0.3, 0, 0.25],
		scale: 1,
		core: 0.55,
		scan: 0,
		voice: 0,
		dim: 1,
		nebulaA: tint("#0c4a66"),
		nebulaB: tint("#2b2190"),
	},
	{
		position: [0, 0, -4],
		rotation: [0.9, 0, 0.2],
		scale: 1.5,
		core: 0.9,
		scan: 0,
		voice: 0,
		dim: 0.42,
		nebulaA: tint("#1a1660"),
		nebulaB: tint("#0c2f40"),
	},
	{
		position: [0, 1.95, 0],
		rotation: [0, 0, 0],
		scale: 0.46,
		core: 0,
		scan: 0,
		voice: 0,
		dim: 1.05,
		nebulaA: tint("#3b2fb8"),
		nebulaB: tint("#0c4a66"),
	},
];

const mixValue = (from: number, to: number, amount: number) => from + (to - from) * amount;
const mixVec = (from: Vec, to: Vec, amount: number): Vec => [
	mixValue(from[0], to[0], amount),
	mixValue(from[1], to[1], amount),
	mixValue(from[2], to[2], amount),
];
const smooth = (amount: number) => amount * amount * (3 - 2 * amount);

function mixPose(from: Pose, to: Pose, amount: number): Pose {
	return {
		position: mixVec(from.position, to.position, amount),
		rotation: mixVec(from.rotation, to.rotation, amount),
		scale: mixValue(from.scale, to.scale, amount),
		core: mixValue(from.core, to.core, amount),
		scan: mixValue(from.scan, to.scan, amount),
		voice: mixValue(from.voice, to.voice, amount),
		dim: mixValue(from.dim, to.dim, amount),
		nebulaA: mixVec(from.nebulaA, to.nebulaA, amount),
		nebulaB: mixVec(from.nebulaB, to.nebulaB, amount),
	};
}

function poseAt(stage: number): Pose {
	const index = Math.max(0, Math.min(lastStage, Math.floor(stage)));
	const next = Math.min(lastStage, index + 1);
	return mixPose(POSES[index] as Pose, POSES[next] as Pose, smooth(Math.max(0, Math.min(1, stage - index))));
}

/** Samples the N mark from type: the tile's outline drawn in red, the letter in green. */
async function sampleMark(): Promise<MarkPixels> {
	await Promise.race([
		document.fonts.load('800 230px "Bricolage Grotesque Variable"'),
		new Promise((resolve) => setTimeout(resolve, 1500)),
	]).catch(() => undefined);

	const size = 320;
	const canvas = document.createElement("canvas");
	canvas.width = canvas.height = size;
	const context = canvas.getContext("2d", { willReadFrequently: true });
	if (!context) return { frame: [], letter: [] };

	context.lineWidth = 10;
	context.strokeStyle = "rgb(255,0,0)";
	context.beginPath();
	context.roundRect(16, 16, size - 32, size - 32, 64);
	context.stroke();
	context.fillStyle = "rgb(0,255,0)";
	context.font = '800 230px "Bricolage Grotesque Variable", "Arial Black", sans-serif';
	context.textAlign = "center";
	context.textBaseline = "middle";
	context.fillText("N", size / 2, size / 2 + 14);

	const pixels = context.getImageData(0, 0, size, size).data;
	const frame: [number, number][] = [];
	const letter: [number, number][] = [];
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			const offset = (y * size + x) * 4;
			const point: [number, number] = [x / size - 0.5, y / size - 0.5];
			if ((pixels[offset + 1] as number) > 128) letter.push(point);
			else if ((pixels[offset] as number) > 128) frame.push(point);
		}
	}
	return { frame, letter };
}

const fieldVertex = /* glsl */ `
	attribute vec3 aTo;
	attribute vec3 aColorFrom;
	attribute vec3 aColorTo;
	attribute float aRandom;
	attribute float aField;
	attribute float aMatch;
	uniform float uMix, uTime, uPixelRatio, uSize, uSpinFrom, uSpinTo, uScanAmount, uScan, uVoice, uDim;
	varying vec3 vColor;

	vec3 turn(vec3 p, float angle) {
		float c = cos(angle), s = sin(angle);
		return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
	}

	void main() {
		// Each point leaves on its own delay, bursts outward mid-flight, and settles into the next formation.
		float delay = aRandom * 0.42;
		float m = smoothstep(delay, delay + 0.58, uMix);
		vec3 p = mix(turn(position, uSpinFrom), turn(aTo, uSpinTo), m);
		vec3 direction = normalize(vec3(sin(aRandom * 91.7), cos(aRandom * 47.3), sin(aRandom * 13.1 + 1.0)) + 1e-4);
		p += direction * sin(m * 3.14159) * (0.5 + aRandom * 1.1);

		// The coach's sphere ripples like a voice.
		float wave = sin(p.y * 4.0 + uTime * 2.6) * 0.5 + sin(atan(p.z, p.x) * 5.0 - uTime * 1.8) * 0.5;
		p += normalize(p + 1e-4) * wave * 0.24 * uVoice;
		p += 0.018 * vec3(sin(uTime * 1.3 + aRandom * 40.0), cos(uTime * 1.1 + aRandom * 30.0), sin(uTime * 0.9 + aRandom * 20.0));

		// The scout's ring sweeps the terrain and the matches it finds stay lit.
		vec3 color = mix(aColorFrom, aColorTo, m);
		float ring = exp(-pow((aField - uScan) * 2.4, 2.0)) * uScanAmount;
		float hit = aMatch * uScanAmount;
		color += vec3(0.25, 0.75, 0.95) * ring * 0.8;
		color = mix(color, vec3(0.9, 0.86, 1.0), hit * 0.9);

		vec4 view = modelViewMatrix * vec4(p, 1.0);
		gl_PointSize = uSize * (0.5 + aRandom) * (1.0 + ring * 1.3 + hit * 2.4) * uPixelRatio * (10.0 / -view.z);
		gl_Position = projectionMatrix * view;
		vColor = color * uDim;
	}
`;

const fieldFragment = /* glsl */ `
	varying vec3 vColor;
	void main() {
		float glow = smoothstep(0.5, 0.0, length(gl_PointCoord - 0.5));
		glow *= glow;
		gl_FragColor = vec4(vColor * glow, glow);
	}
`;

const coreVertex = /* glsl */ `
	varying vec3 vNormal;
	varying vec3 vView;
	void main() {
		vec4 view = modelViewMatrix * vec4(position, 1.0);
		vNormal = normalize(normalMatrix * normal);
		vView = normalize(-view.xyz);
		gl_Position = projectionMatrix * view;
	}
`;

const coreFragment = /* glsl */ `
	uniform float uTime, uAlpha;
	varying vec3 vNormal;
	varying vec3 vView;
	void main() {
		float rim = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.2);
		// A thin film drifting between the page's cyan and magenta, pulled towards the accent; clear in the middle.
		vec3 film = mix(vec3(0.42, 0.89, 1.0), vec3(1.0, 0.48, 0.85), 0.5 + 0.5 * sin(rim * 5.0 + uTime * 0.25));
		film = mix(film, vec3(0.7, 0.65, 1.0), 0.35);
		vec3 color = film * rim + vec3(0.85, 0.82, 1.0) * pow(rim, 6.0) * 0.6;
		gl_FragColor = vec4(color, rim * 0.9 * uAlpha);
	}
`;

const nebulaVertex = /* glsl */ `
	varying vec2 vUv;
	void main() {
		vUv = uv;
		gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
	}
`;

const nebulaFragment = /* glsl */ `
	uniform float uTime, uAspect, uGlow;
	uniform vec3 uA, uB;
	varying vec2 vUv;
	float blob(vec2 p, vec2 c, float r) { vec2 d = p - c; return exp(-dot(d, d) / (r * r)); }
	void main() {
		vec2 p = vUv * 2.0 - 1.0;
		p.x *= uAspect;
		float t = uTime * 0.05;
		vec3 color = vec3(0.012, 0.014, 0.034);
		color += uA * blob(p, vec2(0.8 + sin(t) * 0.5, 0.3 + cos(t * 1.3) * 0.3), 0.9) * uGlow;
		color += uB * blob(p, vec2(-1.0 + cos(t * 0.7) * 0.5, -0.35 + sin(t) * 0.3), 1.0) * uGlow;
		gl_FragColor = vec4(color, 1.0);
	}
`;

/** Starts the field and returns a function that stops it and frees the GPU. */
export async function startScene(options: SceneOptions): Promise<() => void> {
	const { canvas, root, reducedMotion, rtl } = options;
	const narrow = () => window.matchMedia("(max-width: 900px)").matches;
	const count = narrow() ? 9000 : 22000;

	const renderer = new WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
	const scene = new Scene();
	scene.background = new Color("#04050b");
	const camera = new PerspectiveCamera(40, 1, 0.1, 200);
	camera.position.set(0, 0, 10);

	const mark = await sampleMark();
	const data = createField({ count, templates: options.templates, languages: options.languages, mark });
	const { formations, spin } = data;

	// The field: positions and colours of the current pair of formations, morphed in the shader.
	const geometry = new BufferGeometry();
	const from = new BufferAttribute(new Float32Array(count * 3), 3);
	const to = new BufferAttribute(new Float32Array(count * 3), 3);
	const colorFrom = new BufferAttribute(new Float32Array(count * 3), 3);
	const colorTo = new BufferAttribute(new Float32Array(count * 3), 3);
	const random = new Float32Array(count).map((_, index) => (Math.sin(index * 12.9898) * 43758.5453) % 1);
	geometry.setAttribute("position", from);
	geometry.setAttribute("aTo", to);
	geometry.setAttribute("aColorFrom", colorFrom);
	geometry.setAttribute("aColorTo", colorTo);
	geometry.setAttribute("aRandom", new BufferAttribute(random.map(Math.abs), 1));
	geometry.setAttribute("aField", new BufferAttribute(data.field, 1));
	geometry.setAttribute("aMatch", new BufferAttribute(data.match, 1));
	geometry.boundingSphere = new Sphere(new Vector3(), 50);

	const fieldUniforms = {
		uMix: { value: 0 },
		uTime: { value: 0 },
		uPixelRatio: { value: 1 },
		uSize: { value: narrow() ? 2.4 : 3 },
		uSpinFrom: { value: 0 },
		uSpinTo: { value: 0 },
		uScanAmount: { value: 0 },
		uScan: { value: 0 },
		uVoice: { value: 0 },
		uDim: { value: 1 },
	};
	const fieldMaterial = new ShaderMaterial({
		vertexShader: fieldVertex,
		fragmentShader: fieldFragment,
		transparent: true,
		depthWrite: false,
		blending: AdditiveBlending,
		uniforms: fieldUniforms,
	});
	const field = new Points(geometry, fieldMaterial);
	field.frustumCulled = false;

	const coreUniforms = { uTime: { value: 0 }, uAlpha: { value: 1 } };
	const coreMaterial = new ShaderMaterial({
		vertexShader: coreVertex,
		fragmentShader: coreFragment,
		transparent: true,
		depthWrite: false,
		uniforms: coreUniforms,
	});
	const core = new Mesh(new SphereGeometry(0.85, 64, 48), coreMaterial);

	const group = new Group();
	group.add(field, core);
	scene.add(group);

	// A faint starfield and a slow nebula behind everything.
	const starCount = narrow() ? 700 : 1600;
	const stars = new Float32Array(starCount * 3);
	for (let index = 0; index < starCount; index++) {
		const r = (offset: number) => (Math.sin((index + offset) * 78.233) * 43758.5453) % 1;
		stars.set([r(1) * 40, r(2) * 25, -20 - Math.abs(r(3)) * 30], index * 3);
	}
	const starGeometry = new BufferGeometry();
	starGeometry.setAttribute("position", new BufferAttribute(stars, 3));
	const starMaterial = new PointsMaterial({
		size: 0.09,
		color: "#8b90c8",
		transparent: true,
		opacity: 0.55,
		depthWrite: false,
	});
	const starfield = new Points(starGeometry, starMaterial);
	scene.add(starfield);

	const nebulaUniforms = {
		uTime: { value: 0 },
		uAspect: { value: 1 },
		uGlow: { value: 1 },
		uA: { value: new Color() },
		uB: { value: new Color() },
	};
	const nebulaMaterial = new ShaderMaterial({
		vertexShader: nebulaVertex,
		fragmentShader: nebulaFragment,
		depthWrite: false,
		uniforms: nebulaUniforms,
	});
	const nebulaGeometry = new PlaneGeometry(1, 1);
	const nebula = new Mesh(nebulaGeometry, nebulaMaterial);
	nebula.position.z = -60;
	nebula.renderOrder = -1;
	scene.add(nebula);

	let pair = -1;
	const loadPair = (index: number) => {
		const next = Math.min(lastStage, index + 1);
		const start = formations[index];
		const end = formations[next];
		if (!start || !end) return;
		from.array.set(start.positions);
		to.array.set(end.positions);
		colorFrom.array.set(start.colors);
		colorTo.array.set(end.colors);
		from.needsUpdate = to.needsUpdate = colorFrom.needsUpdate = colorTo.needsUpdate = true;
		pair = index;
	};

	const resize = () => {
		const width = canvas.clientWidth || window.innerWidth;
		const height = canvas.clientHeight || window.innerHeight;
		const pixelRatio = Math.min(window.devicePixelRatio, narrow() ? 1.5 : 2);
		renderer.setPixelRatio(pixelRatio);
		renderer.setSize(width, height, false);
		camera.aspect = width / height;
		camera.updateProjectionMatrix();
		fieldUniforms.uPixelRatio.value = pixelRatio;
		const span = 2 * Math.tan(MathUtils.degToRad(camera.fov / 2)) * (camera.position.z - nebula.position.z) * 1.2;
		nebula.scale.set(span * camera.aspect, span, 1);
		nebulaUniforms.uAspect.value = camera.aspect;
	};
	resize();

	const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
	const onPointer = (event: PointerEvent) => {
		// A finger scrolling the page isn't pointing at anything; following it would swing the camera with every swipe.
		if (event.pointerType !== "mouse") return;
		pointer.targetX = (event.clientX / window.innerWidth) * 2 - 1;
		pointer.targetY = (event.clientY / window.innerHeight) * 2 - 1;
	};

	const spun = spin.map(() => 0);
	let current = poseAt(0);
	let smoothed = stageAt(readStages(root), window.innerHeight);
	let covered = 0;
	let time = 0;
	let last = performance.now();
	let frame = 0;

	const render = (now: number) => {
		const delta = Math.min((now - last) / 1000, 0.05);
		last = now;
		if (!reducedMotion) time += delta;

		const stage = stageAt(readStages(root), window.innerHeight);
		smoothed = reducedMotion ? stage : smoothed + (stage - smoothed) * (1 - Math.exp(-delta * 4));
		const index = Math.min(lastStage - 1, Math.floor(smoothed + 1e-4));
		if (index !== pair) loadPair(index);
		if (!reducedMotion) spin.forEach((speed, formation) => (spun[formation] = (spun[formation] ?? 0) + speed * delta));

		const target = poseAt(smoothed);
		current = reducedMotion ? target : mixPose(current, target, 1 - Math.exp(-delta * 5));

		const phone = narrow();
		const cover = phone ? coverAt(readCopy(root), window.innerHeight / 2) : 0;
		covered = reducedMotion ? cover : covered + (cover - covered) * (1 - Math.exp(-delta * 8));
		const dim = current.dim * (phone ? phoneGlow * (1 - covered * (1 - phoneCovered)) : 1);

		const side = rtl ? -1 : 1;
		group.position.set(
			phone ? 0 : current.position[0] * side,
			phone ? current.position[1] * 0.3 + 1.75 : current.position[1],
			current.position[2],
		);
		group.rotation.set(current.rotation[0], current.rotation[1] * side, current.rotation[2] * side);
		group.scale.setScalar(phone ? current.scale * 0.5 : current.scale);

		const uniforms = fieldUniforms;
		uniforms.uMix.value = Math.max(0, Math.min(1, smoothed - index));
		uniforms.uTime.value = time;
		uniforms.uSpinFrom.value = spun[index] ?? 0;
		uniforms.uSpinTo.value = spun[index + 1] ?? 0;
		uniforms.uScanAmount.value = current.scan;
		uniforms.uScan.value = (time * 1.7) % 9;
		uniforms.uVoice.value = current.voice;
		uniforms.uDim.value = dim;

		const pulse = 1 + Math.sin(time * 1.4) * 0.03 + current.voice * 0.06 * Math.sin(time * 6);
		core.visible = current.core > 0.02;
		core.scale.setScalar(Math.max(1e-4, current.core * pulse));
		coreUniforms.uTime.value = time;
		coreUniforms.uAlpha.value = Math.min(1, current.core * 1.4) * dim;

		pointer.x += (pointer.targetX - pointer.x) * 0.045;
		pointer.y += (pointer.targetY - pointer.y) * 0.045;
		camera.position.x = reducedMotion ? 0 : pointer.x * 0.45;
		camera.position.y = reducedMotion ? 0 : -pointer.y * 0.3;
		camera.lookAt(0, 0, 0);

		starfield.rotation.z = time * 0.004;
		nebulaUniforms.uTime.value = time;
		nebulaUniforms.uA.value.fromArray(current.nebulaA);
		nebulaUniforms.uB.value.fromArray(current.nebulaB);
		nebulaUniforms.uGlow.value = 0.6 + 0.4 * current.dim;

		renderer.render(scene, camera);
		frame = requestAnimationFrame(render);
	};

	const onVisibility = () => {
		cancelAnimationFrame(frame);
		if (document.hidden) return;
		last = performance.now();
		frame = requestAnimationFrame(render);
	};
	const onLost = (event: Event) => {
		event.preventDefault();
		cancelAnimationFrame(frame);
		options.onLost();
	};
	// Phones drop the context when the browser goes to the background; three.js rebuilds its state when it comes back.
	const onRestored = () => {
		options.onRestored();
		onVisibility();
	};

	// The canvas, not the window: its height is fixed to the large viewport, so a phone's toolbar doesn't resize it.
	const observer = new ResizeObserver(resize);
	observer.observe(canvas);
	window.addEventListener("pointermove", onPointer, { passive: true });
	document.addEventListener("visibilitychange", onVisibility);
	canvas.addEventListener("webglcontextlost", onLost);
	canvas.addEventListener("webglcontextrestored", onRestored);
	frame = requestAnimationFrame(render);

	return () => {
		cancelAnimationFrame(frame);
		observer.disconnect();
		window.removeEventListener("pointermove", onPointer);
		document.removeEventListener("visibilitychange", onVisibility);
		canvas.removeEventListener("webglcontextlost", onLost);
		canvas.removeEventListener("webglcontextrestored", onRestored);
		for (const disposable of [
			geometry,
			fieldMaterial,
			core.geometry,
			coreMaterial,
			starGeometry,
			starMaterial,
			nebulaGeometry,
			nebulaMaterial,
		]) {
			disposable.dispose();
		}
		renderer.dispose();
	};
}
