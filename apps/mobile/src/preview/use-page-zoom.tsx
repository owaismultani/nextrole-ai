import type { ComponentRef, ReactNode } from "react";
import { useLayoutEffect, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { snapZoom, zoomOffset } from "./zoom";
import { useReducedMotion, useTheme, workletEaseMove } from "@/ui";

export function usePageZoom() {
	const [zoom, setZoom] = useState<number | null>(null);
	const live = useSharedValue(1);
	const reduced = useReducedMotion();
	const { motion } = useTheme();
	const commit = (value: number) => setZoom(snapZoom(value));
	const change = (value: number) => {
		const target = snapZoom(value) ?? 1;
		live.set(
			withTiming(target, { duration: reduced ? 0 : motion.d2, easing: workletEaseMove }, (finished) => {
				if (finished) scheduleOnRN(commit, target);
			}),
		);
	};
	const doubleTap = Gesture.Tap()
		.numberOfTaps(2)
		.runOnJS(true)
		.onEnd((_event, success) => {
			if (success) change((zoom ?? 1) === 1.5 ? 1 : 1.5);
		});
	return { zoom, live, change, commit, doubleTap, step: (delta: number) => change((zoom ?? 1) + delta) };
}

type ZoomViewportProps = {
	controller: ReturnType<typeof usePageZoom>;
	width: number;
	pageWidth: number;
	children: ReactNode;
	onScroll?: (offset: number) => void;
};

/** Layout stays at fit width. Scale the existing rasters, then request sharper ones after settling. */
export function ZoomViewport({ controller, width, pageWidth, children, onScroll }: ZoomViewportProps) {
	const { zoom, live, commit } = controller;
	const effective = zoom ?? 1;
	const { space } = useTheme();
	const [height, setHeight] = useState(0);
	const horizontal = useRef<ComponentRef<typeof ScrollView>>(null);
	const vertical = useRef<ComponentRef<typeof ScrollView>>(null);
	const scrollX = useSharedValue(0);
	const scrollY = useSharedValue(0);
	const start = useSharedValue(1);
	const focal = useSharedValue({ x: 0, y: 0 });
	const anchor = useSharedValue({ x: 0, y: 0 });
	const pinching = useSharedValue(false);
	const [pending, setPending] = useState<{ x: number; y: number } | null>(null);
	const insetX = Math.max(space.s4, (width - pageWidth * effective) / 2);
	const finish = (value: number, x: number, y: number, fx: number, fy: number) => {
		const next = snapZoom(value) ?? 1;
		if (next === effective) return;
		const nextInset = Math.max(space.s4, (width - pageWidth * next) / 2);
		setPending({
			x: Math.max(0, zoomOffset(x, fx, effective, next, insetX) + nextInset - insetX),
			y: zoomOffset(y, fy, effective, next, space.s4),
		});
		commit(next);
	};
	const restore = () => {
		if (!pending) return;
		const { x, y } = pending;
		setPending(null);
		horizontal.current?.scrollTo({ x, animated: false });
		vertical.current?.scrollTo({ y, animated: false });
		onScroll?.(y);
	};
	useLayoutEffect(() => {
		live.set(effective);
		pinching.set(false);
	}, [effective, live, pinching]);
	const pinch = Gesture.Pinch()
		.onStart((event) => {
			start.set(live.get());
			focal.set({ x: event.focalX, y: event.focalY });
			anchor.set({ x: scrollX.get() + event.focalX - insetX, y: scrollY.get() + event.focalY - space.s4 });
			pinching.set(true);
		})
		.onUpdate((event) => live.set(Math.min(1.5, Math.max(0.6, start.get() * event.scale))))
		.onFinalize((_event, success) => {
			if (!success) {
				live.set(effective);
				pinching.set(false);
				return;
			}
			const target = live.get();
			if ((snapZoom(target) ?? 1) === effective) {
				live.set(effective);
				pinching.set(false);
			}
			scheduleOnRN(finish, target, scrollX.get(), scrollY.get(), focal.get().x, focal.get().y);
		});
	const style = useAnimatedStyle(() => {
		const ratio = live.get() / effective;
		return {
			transform: [
				{ translateX: pinching.get() ? anchor.get().x * (1 - ratio) : 0 },
				{ translateY: pinching.get() ? anchor.get().y * (1 - ratio) : 0 },
				{ scale: live.get() },
			],
		};
	});
	return (
		<GestureDetector gesture={Gesture.Simultaneous(pinch, controller.doubleTap)}>
			<ScrollView
				ref={horizontal}
				horizontal
				style={{ flex: 1 }}
				onContentSizeChange={() => requestAnimationFrame(restore)}
				onScroll={(event) => scrollX.set(event.nativeEvent.contentOffset.x)}
				scrollEventThrottle={16}
			>
				<ScrollView
					ref={vertical}
					style={{ width: Math.max(width, pageWidth * effective + space.s4 * 2) }}
					onContentSizeChange={() => requestAnimationFrame(restore)}
					scrollEventThrottle={16}
					onScroll={(event) => {
						const y = event.nativeEvent.contentOffset.y;
						scrollY.set(y);
						onScroll?.(y);
					}}
					contentContainerStyle={{ padding: space.s4, alignItems: "center" }}
				>
					<View style={{ width: pageWidth * effective, height: height * effective }}>
						<Animated.View
							onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
							style={[{ position: "absolute", width: pageWidth, transformOrigin: "left top" }, style]}
						>
							{children}
						</Animated.View>
					</View>
				</ScrollView>
			</ScrollView>
		</GestureDetector>
	);
}
