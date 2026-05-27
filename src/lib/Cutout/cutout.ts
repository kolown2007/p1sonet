import { Container, Graphics, Rectangle, type FederatedPointerEvent, type PointData } from 'pixi.js';

export type ClusterPointConfig = {
	count: number;
	width: number;
	height: number;
	clusterRadius?: number;
	minDistance?: number;
	edgePadding?: number;
	maxAttemptsPerPoint?: number;
};

export type ClickShapeConfig = {
	stage: Container;
	points: PointData[];
	requiredPoints?: number;
	pointRadius?: number;
	pointColor?: number;
	selectedPointColor?: number;
	lineColor?: number;
	lineWidth?: number;
	fillColor?: number;
	fillAlpha?: number;
	onShapeCreated?: (shapePoints: PointData[]) => void;
};

export type ClickShapeController = {
	pointGraphics: Graphics[];
	lineGraphics: Graphics;
	fillGraphics: Graphics;
	reset: () => void;
	destroy: () => void;
};

export type CanvasClickShapeConfig = {
	stage: Container;
	width: number;
	height: number;
	pointRadius?: number;
	pointColor?: number;
	firstPointColor?: number;
	lineColor?: number;
	lineWidth?: number;
	fillColor?: number;
	fillAlpha?: number;
	closeThreshold?: number;
	onShapeCreated?: (shapePoints: PointData[]) => void;
};

export type CanvasClickShapeController = {
	pointGraphics: Graphics[];
	lineGraphics: Graphics;
	fillGraphics: Graphics;
	getPoints: () => PointData[];
	isClosed: () => boolean;
	reset: () => void;
	destroy: () => void;
};

function randomInRange(min: number, max: number): number {
	return min + Math.random() * (max - min);
}

function distance(a: PointData, b: PointData): number {
	const dx = a.x - b.x;
	const dy = a.y - b.y;
	return Math.hypot(dx, dy);
}

/**
 * Creates random points that stay near each other so polygons look natural.
 * Pass count=3 for a triangle, 4 for a quad, and so on.
 */
export function createClusteredRandomPoints({
	count,
	width,
	height,
	clusterRadius = Math.min(width, height) * 0.2,
	minDistance = 28,
	edgePadding = 48,
	maxAttemptsPerPoint = 120
}: ClusterPointConfig): PointData[] {
	if (count < 3) {
		throw new Error('count must be at least 3 to create a shape.');
	}

	const center: PointData = {
		x: randomInRange(edgePadding + clusterRadius, width - edgePadding - clusterRadius),
		y: randomInRange(edgePadding + clusterRadius, height - edgePadding - clusterRadius)
	};

	const points: PointData[] = [];

	for (let i = 0; i < count; i += 1) {
		let candidate: PointData | null = null;

		for (let attempt = 0; attempt < maxAttemptsPerPoint; attempt += 1) {
			const angle = Math.random() * Math.PI * 2;
			const radius = Math.sqrt(Math.random()) * clusterRadius;
			const maybePoint: PointData = {
				x: center.x + Math.cos(angle) * radius,
				y: center.y + Math.sin(angle) * radius
			};

			if (
				maybePoint.x < edgePadding ||
				maybePoint.x > width - edgePadding ||
				maybePoint.y < edgePadding ||
				maybePoint.y > height - edgePadding
			) {
				continue;
			}

			const tooClose = points.some((p) => distance(p, maybePoint) < minDistance);
			if (!tooClose) {
				candidate = maybePoint;
				break;
			}
		}

		if (!candidate) {
			candidate = {
				x: center.x + randomInRange(-clusterRadius * 0.4, clusterRadius * 0.4),
				y: center.y + randomInRange(-clusterRadius * 0.4, clusterRadius * 0.4)
			};
		}

		points.push(candidate);
	}

	return points;
}

/**
 * Draws clickable points. Clicking points in order will create and fill a polygon.
 */
export function enablePointClickShapeCreation({
	stage,
	points,
	requiredPoints = points.length,
	pointRadius = 8,
	pointColor = 0xffffff,
	selectedPointColor = 0xff6f00,
	lineColor = 0x21c1ff,
	lineWidth = 3,
	fillColor = 0x21c1ff,
	fillAlpha = 0.22,
	onShapeCreated
}: ClickShapeConfig): ClickShapeController {
	if (requiredPoints < 3) {
		throw new Error('requiredPoints must be at least 3.');
	}

	const selectedIndices: number[] = [];
	const lineGraphics = new Graphics();
	const fillGraphics = new Graphics();
	const pointGraphics: Graphics[] = [];

	stage.addChild(fillGraphics);
	stage.addChild(lineGraphics);

	const drawPoint = (g: Graphics, color: number) => {
		g.clear();
		g.circle(0, 0, pointRadius);
		g.fill(color);
	};

	const redraw = () => {
		lineGraphics.clear();
		fillGraphics.clear();

		if (selectedIndices.length === 0) {
			return;
		}

		const selectedPoints = selectedIndices.map((index) => points[index]);

		lineGraphics.moveTo(selectedPoints[0].x, selectedPoints[0].y);
		for (let i = 1; i < selectedPoints.length; i += 1) {
			lineGraphics.lineTo(selectedPoints[i].x, selectedPoints[i].y);
		}
		lineGraphics.stroke({ color: lineColor, width: lineWidth });

		if (selectedPoints.length === requiredPoints) {
			fillGraphics.moveTo(selectedPoints[0].x, selectedPoints[0].y);
			for (let i = 1; i < selectedPoints.length; i += 1) {
				fillGraphics.lineTo(selectedPoints[i].x, selectedPoints[i].y);
			}
			fillGraphics.closePath();
			fillGraphics.fill({ color: fillColor, alpha: fillAlpha });

			lineGraphics.closePath();
			lineGraphics.stroke({ color: lineColor, width: lineWidth });

			onShapeCreated?.(selectedPoints);
		}
	};

	for (let index = 0; index < points.length; index += 1) {
		const point = points[index];
		const pointGraphic = new Graphics();

		pointGraphic.x = point.x;
		pointGraphic.y = point.y;
		pointGraphic.eventMode = 'static';
		pointGraphic.cursor = 'pointer';
		drawPoint(pointGraphic, pointColor);

		pointGraphic.on('pointertap', () => {
			if (selectedIndices.length >= requiredPoints || selectedIndices.includes(index)) {
				return;
			}

			selectedIndices.push(index);
			drawPoint(pointGraphic, selectedPointColor);
			redraw();
		});

		pointGraphics.push(pointGraphic);
		stage.addChild(pointGraphic);
	}

	const reset = () => {
		selectedIndices.length = 0;
		for (const g of pointGraphics) {
			drawPoint(g, pointColor);
		}
		lineGraphics.clear();
		fillGraphics.clear();
	};

	const destroy = () => {
		for (const g of pointGraphics) {
			g.removeAllListeners();
			g.destroy();
		}
		lineGraphics.destroy();
		fillGraphics.destroy();
	};

	return {
		pointGraphics,
		lineGraphics,
		fillGraphics,
		reset,
		destroy
	};
}

/**
 * Adds points directly on canvas click and closes the shape by clicking near the first point.
 */
export function enableCanvasClickShapeCreation({
	stage,
	width,
	height,
	pointRadius = 7,
	pointColor = 0xffffff,
	firstPointColor = 0xff6f00,
	lineColor = 0x21c1ff,
	lineWidth = 3,
	fillColor = 0x21c1ff,
	fillAlpha = 0.2,
	closeThreshold = 24,
	onShapeCreated
}: CanvasClickShapeConfig): CanvasClickShapeController {
	const points: PointData[] = [];
	const pointGraphics: Graphics[] = [];
	const completedShapeGraphics: Graphics[] = [];
	const lineGraphics = new Graphics();
	const fillGraphics = new Graphics();
	let hasClosedShape = false;

	stage.eventMode = 'static';
	stage.hitArea = new Rectangle(0, 0, width, height);
	stage.cursor = 'crosshair';

	stage.addChild(fillGraphics);
	stage.addChild(lineGraphics);

	const drawPointGraphic = (x: number, y: number, color: number) => {
		const g = new Graphics();
		g.x = x;
		g.y = y;
		g.circle(0, 0, pointRadius);
		g.fill(color);
		pointGraphics.push(g);
		stage.addChild(g);
	};

	const drawOpenPath = () => {
		lineGraphics.clear();
		if (points.length < 2) {
			return;
		}

		lineGraphics.moveTo(points[0].x, points[0].y);
		for (let i = 1; i < points.length; i += 1) {
			lineGraphics.lineTo(points[i].x, points[i].y);
		}
		lineGraphics.stroke({ color: lineColor, width: lineWidth });
	};

	const drawClosedShape = (shapePoints: PointData[]) => {
		if (shapePoints.length < 3) {
			return;
		}

		const shapeGraphic = new Graphics();
		shapeGraphic.moveTo(shapePoints[0].x, shapePoints[0].y);
		for (let i = 1; i < shapePoints.length; i += 1) {
			shapeGraphic.lineTo(shapePoints[i].x, shapePoints[i].y);
		}
		shapeGraphic.closePath();
		shapeGraphic.fill({ color: fillColor, alpha: fillAlpha });
		completedShapeGraphics.push(shapeGraphic);
		stage.addChild(shapeGraphic);
	};

	const closeCurrentShape = () => {
		if (points.length < 3) {
			return;
		}

		const shapePoints = [...points];
		drawClosedShape(shapePoints);
		hasClosedShape = true;
		onShapeCreated?.(shapePoints);

		points.length = 0;
		lineGraphics.clear();
		fillGraphics.clear();
		clearPointMarkers();
	};

	const clearPointMarkers = () => {
		for (const g of pointGraphics) {
			g.destroy();
		}
		pointGraphics.length = 0;
	};

	const pointerHandler = (event: FederatedPointerEvent) => {
		const clickPoint: PointData = {
			x: event.global.x,
			y: event.global.y
		};

		if (points.length >= 3 && distance(clickPoint, points[0]) <= closeThreshold) {
			closeCurrentShape();
			return;
		}

		points.push(clickPoint);
		drawPointGraphic(
			clickPoint.x,
			clickPoint.y,
			points.length === 1 ? firstPointColor : pointColor
		);
		drawOpenPath();
	};

	stage.on('pointertap', pointerHandler);

	const reset = () => {
		hasClosedShape = false;
		points.length = 0;
		clearPointMarkers();
		for (const g of completedShapeGraphics) {
			g.destroy();
		}
		completedShapeGraphics.length = 0;
		lineGraphics.clear();
		fillGraphics.clear();
	};

	const destroy = () => {
		stage.off('pointertap', pointerHandler);
		clearPointMarkers();
		for (const g of completedShapeGraphics) {
			g.destroy();
		}
		completedShapeGraphics.length = 0;
		lineGraphics.destroy();
		fillGraphics.destroy();
	};

	return {
		pointGraphics,
		lineGraphics,
		fillGraphics,
		getPoints: () => [...points],
		isClosed: () => hasClosedShape,
		reset,
		destroy
	};
}

export class CutoutShapeBuilder {
	private readonly stage: Container;

	constructor(stage: Container) {
		this.stage = stage;
	}

	build(pointCount: number, width: number, height: number, onShapeCreated?: (shapePoints: PointData[]) => void) {
		const points = createClusteredRandomPoints({
			count: pointCount,
			width,
			height
		});

		return enablePointClickShapeCreation({
			stage: this.stage,
			points,
			requiredPoints: pointCount,
			onShapeCreated
		});
	}
}
