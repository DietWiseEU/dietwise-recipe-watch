import type { CSSProperties, ReactNode } from 'react';
import { Children, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import './SplitPane.css';

export interface SplitPaneProps {
	top: ReactNode;
	bottom: ReactNode;
	minTopHeight?: number;
	minBottomHeight?: number;
	defaultSplit?: number;
	className?: string;
}

const ANIMATION_DURATION_MS = 500;

const hasRenderableContent = (content: ReactNode): boolean => {
	if (content === null || content === undefined || content === false) return false;
	if (typeof content === 'string') return content.trim().length > 0;
	// The children are only inspected for renderable content here, never rendered from the result.
	// eslint-disable-next-line @eslint-react/no-children-to-array
	const items = Children.toArray(content);
	if (items.length === 0) return false;
	return items.some((item) => !(typeof item === 'string' && item.trim().length === 0));
};

const clampRatio = (ratio: number, height: number, minTop: number, minBottom: number): number => {
	if (height <= 0) return ratio;
	const minTopRatio = minTop / height;
	const minBottomRatio = minBottom / height;
	const maxTopRatio = 1 - minBottomRatio;
	if (minTopRatio > maxTopRatio) {
		return Math.max(0, Math.min(1, ratio));
	}
	return Math.max(minTopRatio, Math.min(maxTopRatio, ratio));
};

const SplitPane: React.FC<SplitPaneProps> = ({
	top,
	bottom,
	minTopHeight = 96,
	minBottomHeight = 96,
	defaultSplit = 0.5,
	className,
}) => {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const dividerRef = useRef<HTMLDivElement | null>(null);
	const [containerHeight, setContainerHeight] = useState(0);
	const [topRatio, setTopRatio] = useState<number | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [isAnimating, setIsAnimating] = useState(false);
	const [isSplitInitialized, setIsSplitInitialized] = useState(false);
	const animationTimeoutRef = useRef<number | null>(null);

	const setTopRatioEvent = useEffectEvent((value: number | null) => {
		setTopRatio(value);
	});

	const setIsAnimatingEvent = useEffectEvent((value: boolean) => {
		setIsAnimating(value);
	});

	const clearAnimationTimeout = () => {
		if (animationTimeoutRef.current !== null) {
			window.clearTimeout(animationTimeoutRef.current);
			animationTimeoutRef.current = null;
		}
	};

	const showTop = useMemo(() => hasRenderableContent(top), [top]);
	const showBottom = useMemo(() => hasRenderableContent(bottom), [bottom]);

	const syncLayoutState = useEffectEvent((height: number) => {
		if (height <= 0) return;
		setContainerHeight(height);

		if (!showBottom) {
			clearAnimationTimeout();
			setTopRatio(null);
			setIsAnimating(false);
			setIsSplitInitialized(false);
			return;
		}

		if (!isSplitInitialized) {
			setIsSplitInitialized(true);
			const boundedDefault = clampRatio(defaultSplit, height, minTopHeight, minBottomHeight);
			clearAnimationTimeout();
			setIsAnimating(true);
			requestAnimationFrame(() => {
				setTopRatioEvent(boundedDefault);
			});
			animationTimeoutRef.current = window.setTimeout(() => {
				setIsAnimatingEvent(false);
				animationTimeoutRef.current = null;
			}, ANIMATION_DURATION_MS + 50);
			return;
		}

		setTopRatio((currentTopRatio) => {
			if (currentTopRatio === null) return currentTopRatio;
			const clamped = clampRatio(currentTopRatio, height, minTopHeight, minBottomHeight);
			return clamped === currentTopRatio ? currentTopRatio : clamped;
		});
	});

	useEffect(() => {
		const element = containerRef.current;
		if (!element) return;

		const updateHeight = () => {
			const elementHeight = element.clientHeight;
			if (elementHeight > 0) {
				syncLayoutState(elementHeight);
				return;
			}
			const parentHeight = element.parentElement?.clientHeight ?? 0;
			if (parentHeight > 0) syncLayoutState(parentHeight);
		};

		updateHeight();

		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				syncLayoutState(entry.contentRect.height);
			}
		});

		observer.observe(element);

		return () => {
			clearAnimationTimeout();
			observer.disconnect();
		};
	}, [showTop, showBottom]);

	const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
		if (!isDragging || !containerRef.current) return;
		const rect = containerRef.current.getBoundingClientRect();
		if (rect.height <= 0) return;
		const offset = event.clientY - rect.top;
		const ratio = offset / rect.height;
		setTopRatio(clampRatio(ratio, rect.height, minTopHeight, minBottomHeight));
	};

	const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
		setIsDragging(false);
		dividerRef.current?.releasePointerCapture(event.pointerId);
	};

	const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
		if (!containerRef.current) return;
		const rect = containerRef.current.getBoundingClientRect();
		if (rect.height > 0 && rect.height !== containerHeight) {
			setContainerHeight(rect.height);
		}
		setIsDragging(true);
		dividerRef.current?.setPointerCapture(event.pointerId);
	};

	const handleTransitionEnd = (event: React.TransitionEvent<HTMLDivElement>) => {
		if (event.propertyName !== 'flex-basis') return;
		clearAnimationTimeout();
		setIsAnimating(false);
	};

	if (!showTop && !showBottom) return null;

	if (!showBottom) {
		return (
			<div ref={containerRef} className={`split-pane ${className ?? ''}`.trim()}>
				<div className="split-pane__section split-pane__section--single">{top}</div>
			</div>
		);
	}

	const effectiveTopRatio = isSplitInitialized ? topRatio : null;
	const effectiveRatio = effectiveTopRatio === null ? 1 : effectiveTopRatio;
	const topMinHeight = effectiveTopRatio === null ? 0 : minTopHeight;
	const bottomMinHeight = effectiveTopRatio === null ? 0 : minBottomHeight;
	const topStyle: CSSProperties = {
		flexBasis: `${effectiveRatio * 100}%`,
		minHeight: topMinHeight,
	};
	const bottomStyle: CSSProperties = {
		flexBasis: `${(1 - effectiveRatio) * 100}%`,
		minHeight: bottomMinHeight,
	};

	return (
		<div
			ref={containerRef}
			className={`split-pane ${isDragging ? 'split-pane--dragging' : ''} ${className ?? ''}`.trim()}
		>
			<div
				className={`split-pane__section split-pane__section--top ${
					isAnimating ? 'split-pane__section--animated' : ''
				}`}
				style={topStyle}
				onTransitionEnd={handleTransitionEnd}
			>
				{top}
			</div>
			<div
				ref={dividerRef}
				className="split-pane__divider"
				onPointerDown={handlePointerDown}
				onPointerMove={handlePointerMove}
				onPointerUp={handlePointerUp}
				onContextMenu={(e) => e.preventDefault()}
			/>
			<div
				className={`split-pane__section split-pane__section--bottom ${
					isAnimating ? 'split-pane__section--animated' : ''
				}`}
				style={bottomStyle}
				onTransitionEnd={handleTransitionEnd}
			>
				{bottom}
			</div>
		</div>
	);
};

export default SplitPane;
