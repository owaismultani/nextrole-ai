/**
 * The particle field's formations, one per act of the journey (progress.ts's STAGE). Every formation places the same
 * number of points, so the field can morph from any one to the next. Each is drawn from the product itself: the board
 * uses the app's stage colours, the template wall has one page per template, the globe one light per language.
 */
import { Color, Euler, IcosahedronGeometry, Vector3 } from "three";

type Formation = { positions: Float32Array; colors: Float32Array };

/** Pixels of the N mark, in the unit square centred on zero, split into the tile's outline and the letter. */
export type MarkPixels = { frame: [number, number][]; letter: [number, number][] };

export type FieldData = {
	formations: Formation[];
	/** How fast each formation turns on its own axis, in radians per second. */
	spin: number[];
	/** Each point's distance from the centre of the discovery terrain, which the scan ring sweeps across. */
	field: Float32Array;
	/** 1 for the few points that light up as matches when the scan ring finds them. */
	match: Float32Array;
};

type Point = { x: number; y: number; z: number; color: Color };

/** A small seeded generator (mulberry32), so the field looks the same on every visit. */
function seeded(seed: number) {
	let state = seed;
	const random = () => {
		state = (state + 0x6d2b79f5) | 0;
		let value = Math.imul(state ^ (state >>> 15), 1 | state);
		value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
		return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
	};
	const gauss = () => (random() + random() + random() - 1.5) / 1.5;
	return { random, gauss };
}

const color = (hex: string) => new Color(hex);
const blend = (from: Color, to: Color, amount: number) => from.clone().lerp(to, Math.min(1, Math.max(0, amount)));

function build(count: number, place: (index: number, point: Point) => void): Formation {
	const positions = new Float32Array(count * 3);
	const colors = new Float32Array(count * 3);
	const point: Point = { x: 0, y: 0, z: 0, color: new Color() };

	for (let index = 0; index < count; index++) {
		place(index, point);
		positions.set([point.x, point.y, point.z], index * 3);
		colors.set([point.color.r, point.color.g, point.color.b], index * 3);
	}

	return { positions, colors };
}

/** A point on the outline of a w × h rectangle centred on zero, `s` running 0 to 4 around it. */
function outline(s: number, width: number, height: number): [number, number] {
	if (s < 1) return [-width / 2 + s * width, height / 2];
	if (s < 2) return [width / 2, height / 2 - (s - 1) * height];
	if (s < 3) return [width / 2 - (s - 2) * width, -height / 2];
	return [-width / 2, -height / 2 + (s - 3) * height];
}

/** The app's application stages, with this example search's count in each. */
const boardStages = [
	{ count: 12, hex: "#b5b1a4" },
	{ count: 9, hex: "#79acdf" },
	{ count: 5, hex: "#2fc4ca" },
	{ count: 3, hex: "#d4a654" },
	{ count: 1, hex: "#7cc48d" },
	{ count: 4, hex: "#e08f86" },
];

type FieldOptions = { count: number; templates: number; languages: number; mark: MarkPixels };

export function createField({ count, templates, languages, mark }: FieldOptions): FieldData {
	const { random, gauss } = seeded(7);
	const field = new Float32Array(count);
	const match = new Float32Array(count);

	// 0 · The job market: a three-armed galaxy, warm at the core.
	const galaxyCore = color("#fff0da");
	const galaxyMid = color("#a99cff");
	const galaxyCyan = color("#58d6f5");
	const galaxyMagenta = color("#f06acb");
	const galaxy = build(count, (index, point) => {
		const radius = random() ** 1.7 * 4.6 + 0.2;
		const angle = (index % 3) * ((Math.PI * 2) / 3) + radius * 1.15 + gauss() * 0.32 * (0.6 + radius * 0.25);
		point.x = Math.cos(angle) * radius;
		point.z = Math.sin(angle) * radius;
		point.y = (gauss() * 0.16) / (0.5 + radius * 0.35);
		const t = radius / 4.8;
		point.color =
			t < 0.22
				? blend(galaxyCore, galaxyMid, t / 0.22)
				: blend(galaxyMid, index % 3 === 1 ? galaxyCyan : galaxyMagenta, (t - 0.22) / 0.78);
		point.color.multiplyScalar(0.75);
	});

	// 1 · Knowledge: a crystal lattice, facts gathered at its joints.
	const icosahedron = new IcosahedronGeometry(2.25, 1);
	const raw = icosahedron.getAttribute("position");
	const vertices: Vector3[] = [];
	const vertexIndex = new Map<string, number>();
	const keyOf = (vector: Vector3) =>
		vector
			.toArray()
			.map((value) => value.toFixed(3))
			.join(",");
	const indexOf = (offset: number) => {
		const vector = new Vector3().fromBufferAttribute(raw, offset);
		const key = keyOf(vector);
		if (!vertexIndex.has(key)) {
			vertexIndex.set(key, vertices.length);
			vertices.push(vector);
		}
		return vertexIndex.get(key) as number;
	};
	const edgeKeys = new Set<string>();
	for (let offset = 0; offset < raw.count; offset += 3) {
		const [a, b, c] = [indexOf(offset), indexOf(offset + 1), indexOf(offset + 2)];
		for (const [from, to] of [
			[a, b],
			[b, c],
			[c, a],
		] as const) {
			edgeKeys.add(from < to ? `${from}-${to}` : `${to}-${from}`);
		}
	}
	icosahedron.dispose();
	const edges = [...edgeKeys].map((key) => key.split("-").map(Number) as [number, number]);
	const latticeLine = color("#8f84ff");
	const latticeNode = color("#ffc46b");
	const white = color("#ffffff");
	const knowledge = build(count, (_, point) => {
		if (random() < 0.16) {
			const vertex = vertices[Math.floor(random() * vertices.length)] as Vector3;
			point.x = vertex.x + gauss() * 0.07;
			point.y = vertex.y + gauss() * 0.07;
			point.z = vertex.z + gauss() * 0.07;
			point.color = blend(latticeNode, white, random() * 0.4).multiplyScalar(0.9);
			return;
		}
		const [from, to] = edges[Math.floor(random() * edges.length)] as [number, number];
		const a = vertices[from] as Vector3;
		const b = vertices[to] as Vector3;
		const t = random();
		point.x = a.x + (b.x - a.x) * t + gauss() * 0.012;
		point.y = a.y + (b.y - a.y) * t + gauss() * 0.012;
		point.z = a.z + (b.z - a.z) * t + gauss() * 0.012;
		point.color = latticeLine.clone().multiplyScalar(0.45 + random() * 0.25);
	});

	// 2 · Discovery: a terrain of postings on a grid, with a few matches for the scan ring to find.
	const terrainLow = color("#262c58");
	const terrainHigh = color("#4b56a8");
	const terrain = build(count, (index, point) => {
		const x = Math.round((random() * 2 - 1) * 6.4 * 6) / 6 + gauss() * 0.01;
		const z = Math.round((random() * 2 - 1) * 4.2 * 6) / 6 + gauss() * 0.01;
		const y = 0.32 * Math.sin(x * 0.7 + 1) * Math.cos(z * 0.8) + 0.12 * Math.sin(x * 2.1 + z * 1.3);
		point.x = x;
		point.y = y;
		point.z = z;
		field[index] = Math.hypot(x, z);
		match[index] = random() < 0.03 ? 1 : 0;
		point.color = blend(terrainLow, terrainHigh, (y + 0.45) / 0.9);
	});

	// 3 · Tailoring: three resume pages fanned out, each with its own matched phrases lit.
	const lines: { y: number; width: number; height: number; kind: "name" | "role" | "heading" | "body"; row: number }[] =
		[
			{ y: 1.12, width: 1, height: 0.09, kind: "name", row: -1 },
			{ y: 0.96, width: 0.55, height: 0.035, kind: "role", row: -1 },
		];
	let lineY = 0.74;
	let row = 0;
	for (const block of [4, 4, 3, 3]) {
		lines.push({ y: lineY, width: 0.42, height: 0.045, kind: "heading", row: -1 });
		lineY -= 0.12;
		for (let line = 0; line < block; line++, row++) {
			lines.push({ y: lineY, width: 1.64 - ((row * 37) % 50) / 100, height: 0.022, kind: "body", row });
			lineY -= 0.085;
		}
		lineY -= 0.07;
	}
	const lineWeights = lines.map((line) => line.width * (line.height + 0.02));
	const lineTotal = lineWeights.reduce((sum, weight) => sum + weight, 0);
	const pickLine = () => {
		let remaining = random() * lineTotal;
		for (const [index, line] of lines.entries()) {
			remaining -= lineWeights[index] as number;
			if (remaining <= 0) return line;
		}
		return lines[lines.length - 1] as (typeof lines)[number];
	};
	const pageBody = color("#c9c8ee");
	const pageName = color("#ffffff");
	const pageFrame = color("#4a4f86");
	const pageHighlights = [color("#f06acb"), color("#b3a6ff"), color("#58d6f5")];
	const highlightedRows = [
		[1, 5, 9],
		[2, 6, 10],
		[0, 7, 12],
	];
	const pages = build(count, (index, point) => {
		const page = index % 3;
		const offset = page - 1;
		let x: number;
		let y: number;
		let tint: Color;
		if (random() < 0.12) {
			[x, y] = outline(random() * 4, 1.9, 2.7);
			tint = pageFrame.clone();
		} else {
			const line = pickLine();
			x = -0.82 + random() * line.width;
			y = line.y + (random() - 0.5) * line.height;
			const lit = line.kind === "body" && highlightedRows[page]?.includes(line.row);
			if (line.kind === "name") tint = pageName.clone();
			else if (line.kind === "role" || lit) tint = (pageHighlights[page] as Color).clone();
			else tint = pageBody.clone().multiplyScalar(line.kind === "heading" ? 0.95 : 0.55);
		}
		const angle = -offset * 0.42;
		point.x = x * Math.cos(angle) + offset * 2.15;
		point.z = -x * Math.sin(angle) - Math.abs(offset) * 0.6;
		point.y = y;
		point.color = tint.multiplyScalar(0.8);
	});

	// 4 · The studio: a curved wall with one page per template, sidebars on the left, the right or neither.
	const accents = [
		"#b3a6ff",
		"#58d6f5",
		"#f06acb",
		"#ffc46b",
		"#7fe0a6",
		"#ff9d94",
		"#79acdf",
		"#d4a654",
		"#c9a0ff",
		"#2fc4ca",
		"#ff8fb1",
		"#a3e36b",
	].map(color);
	const wallFrame = color("#3d4275");
	const wallBody = color("#9a9cc8");
	const columns = Math.ceil(templates / 3);
	const wall = build(count, (index, point) => {
		const template = index % templates;
		const column = (template % columns) - (columns - 1) / 2;
		const wallRow = 1 - Math.floor(template / columns);
		const width = 0.8;
		const height = 1.12;
		const side = template % 3;
		let x: number;
		let y: number;
		let tint: Color;
		const roll = random();
		if (roll < 0.22) {
			[x, y] = outline(random() * 4, width, height);
			tint = wallFrame.clone();
		} else if (roll < 0.42) {
			if (side === 2) {
				x = -width / 2 + random() * width;
				y = height / 2 - random() * 0.2;
			} else {
				x = (side === 0 ? -width / 2 : width / 2 - 0.24) + random() * 0.24;
				y = height / 2 - random() * height;
			}
			tint = (accents[template % accents.length] as Color).clone();
		} else {
			const line = Math.floor(random() * 9);
			const start = side === 0 ? -width / 2 + 0.3 : -width / 2 + 0.06;
			const end = side === 1 ? width / 2 - 0.3 : width / 2 - 0.06;
			x = start + random() * (end - start) * (0.6 + ((line * 13) % 40) / 100);
			y = (side === 2 ? height / 2 - 0.3 : height / 2 - 0.12) - line * 0.09;
			tint = wallBody.clone().multiplyScalar(0.55);
		}
		const wallX = column * 1.02 + x;
		point.x = wallX;
		point.y = wallRow * 1.36 + y;
		point.z = -wallX * wallX * 0.06;
		point.color = tint.multiplyScalar(0.85);
	});

	// 5 · The coach: a sphere that ripples like a voice (the shader moves it), circled by sound rings.
	const voiceLow = color("#f06acb");
	const voiceMid = color("#8f84ff");
	const voiceHigh = color("#58d6f5");
	const voice = build(count, (index, point) => {
		if (random() < 0.16) {
			const ring = Math.floor(random() * 3);
			const radius = 2.65 + ring * 0.42;
			const angle = random() * Math.PI * 2;
			point.x = Math.cos(angle) * radius;
			point.z = Math.sin(angle) * radius;
			point.y = gauss() * 0.02;
			point.color = voiceMid.clone().multiplyScalar(0.35 - ring * 0.07);
			return;
		}
		const k = index + 0.5;
		const phi = Math.acos(1 - (2 * k) / count);
		const theta = Math.PI * (1 + Math.sqrt(5)) * k;
		point.x = Math.cos(theta) * Math.sin(phi) * 1.95;
		point.y = Math.cos(phi) * 1.95;
		point.z = Math.sin(theta) * Math.sin(phi) * 1.95;
		const t = (point.y / 1.95 + 1) / 2;
		point.color = (
			t < 0.5 ? blend(voiceLow, voiceMid, t * 2) : blend(voiceMid, voiceHigh, (t - 0.5) * 2)
		).multiplyScalar(0.7);
	});

	// 6 · The tracker: the board's columns, in the app's stage colours, as tall as each stage is full.
	const stageColors = boardStages.map((stage) => color(stage.hex));
	const boardTotal = boardStages.reduce((sum, stage) => sum + stage.count, 0);
	const tallest = Math.max(...boardStages.map((stage) => stage.count));
	const board = build(count, (_, point) => {
		let remaining = random() * boardTotal;
		let column = 0;
		while (column < boardStages.length - 1 && remaining > (boardStages[column] as (typeof boardStages)[number]).count) {
			remaining -= (boardStages[column] as (typeof boardStages)[number]).count;
			column++;
		}
		const height = ((boardStages[column] as (typeof boardStages)[number]).count / tallest) * 3.6;
		const width = 0.66;
		const centre = (column - (boardStages.length - 1) / 2) * 1.0;
		if (random() < 0.55) {
			const face = Math.floor(random() * 4);
			const along = random() - 0.5;
			point.x = centre + (face === 0 ? -width / 2 : face === 1 ? width / 2 : along * width);
			point.z = face === 2 ? -width / 2 : face === 3 ? width / 2 : along * width;
		} else {
			point.x = centre + (random() - 0.5) * width;
			point.z = (random() - 0.5) * width;
		}
		point.y = -1.8 + random() * height;
		point.color = (stageColors[column] as Color).clone().multiplyScalar(0.55 + 0.35 * ((point.y + 1.8) / height));
	});

	// 7 · Everywhere: a dotted globe with one light per language, and an orbit.
	const languagePoints = Array.from({ length: languages }, () => {
		const angle = random() * Math.PI * 2;
		const z = random() * 1.6 - 0.8;
		const ring = Math.sqrt(1 - z * z);
		return new Vector3(Math.cos(angle) * ring, z, Math.sin(angle) * ring);
	});
	const globeDim = color("#2f4a7a");
	const globeLight = color("#58d6f5");
	const globeLanguage = color("#ffd08a");
	const globeOrbit = color("#b3a6ff");
	const orbitTilt = new Euler(1.15, 0, 0.35);
	const globe = build(count, (_, point) => {
		const roll = random();
		if (roll < 0.14) {
			const language = languagePoints[Math.floor(random() * languagePoints.length)] as Vector3;
			point.x = language.x * 2.25 + gauss() * 0.04;
			point.y = language.y * 2.25 + gauss() * 0.04;
			point.z = language.z * 2.25 + gauss() * 0.04;
			point.color = globeLanguage.clone().multiplyScalar(0.95);
		} else if (roll < 0.28) {
			const angle = random() * Math.PI * 2;
			const orbit = new Vector3(Math.cos(angle) * 3.2, gauss() * 0.02, Math.sin(angle) * 3.2).applyEuler(orbitTilt);
			point.x = orbit.x;
			point.y = orbit.y;
			point.z = orbit.z;
			point.color = globeOrbit.clone().multiplyScalar(0.5);
		} else {
			const onParallel = random() < 0.5;
			const latitude = onParallel
				? (Math.floor(random() * 18) / 17 - 0.5) * Math.PI * 0.94
				: (random() - 0.5) * Math.PI;
			const longitude = onParallel ? random() * Math.PI * 2 : (Math.floor(random() * 24) / 24) * Math.PI * 2;
			point.x = Math.cos(latitude) * Math.cos(longitude) * 2.2;
			point.y = Math.sin(latitude) * 2.2;
			point.z = Math.cos(latitude) * Math.sin(longitude) * 2.2;
			point.color = blend(globeDim, globeLight, random() * 0.35).multiplyScalar(0.55);
		}
	});

	// 8 · Your rules: a protective ring, crossed by a second like a gyroscope.
	const ringMain = color("#b3a6ff");
	const ringCross = color("#7fe0a6");
	const crossTilt = new Euler(Math.PI / 2, 0.5, 0);
	const ring = build(count, (_, point) => {
		const u = random() * Math.PI * 2;
		const v = random() * Math.PI * 2;
		if (random() < 0.72) {
			const tube = 0.24 + gauss() * 0.02;
			point.x = (2.6 + tube * Math.cos(v)) * Math.cos(u);
			point.y = tube * Math.sin(v);
			point.z = (2.6 + tube * Math.cos(v)) * Math.sin(u);
			point.color = ringMain.clone().multiplyScalar(0.55);
			return;
		}
		const cross = new Vector3(Math.cos(u) * 3.2, gauss() * 0.015, Math.sin(u) * 3.2).applyEuler(crossTilt);
		point.x = cross.x;
		point.y = cross.y;
		point.z = cross.z;
		point.color = ringCross.clone().multiplyScalar(0.45);
	});

	// 9 · The finale: the N mark in its tile.
	const markTop = color("#ffffff");
	const markBottom = color("#b3a6ff");
	const markFrame = color("#6be4ff");
	const nMark = build(count, (_, point) => {
		const useFrame = random() < 0.28 && mark.frame.length > 0;
		const source = useFrame ? mark.frame : mark.letter;
		const [u, v] = source.length > 0 ? (source[Math.floor(random() * source.length)] as [number, number]) : [0, 0];
		point.x = u * 5 + gauss() * 0.01;
		point.y = -v * 5 + gauss() * 0.01;
		point.z = gauss() * (useFrame ? 0.05 : 0.14);
		point.color = useFrame
			? markFrame.clone().multiplyScalar(0.55)
			: blend(markTop, markBottom, v + 0.5).multiplyScalar(0.85);
	});

	return {
		formations: [galaxy, knowledge, terrain, pages, wall, voice, board, globe, ring, nMark],
		spin: [0.05, 0.09, 0, 0, 0, 0.12, 0, 0.1, 0.07, 0],
		field,
		match,
	};
}
