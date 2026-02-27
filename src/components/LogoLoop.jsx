import { useCallback, useEffect, useMemo, useRef, useState, memo } from 'react';
import './LogoLoop.css';

const ANIMATION_CONFIG = { SMOOTH_TAU: 0.25, MIN_COPIES: 2, COPY_HEADROOM: 2 };

const toCssLength = value => (typeof value === 'number' ? `${value}px` : (value ?? undefined));

const useResizeObserver = (callback, elements) => {
    useEffect(() => {
        if (!window.ResizeObserver) {
            const handleResize = () => callback();
            window.addEventListener('resize', handleResize);
            callback();
            return () => window.removeEventListener('resize', handleResize);
        }
        const observers = elements.map(ref => {
            if (!ref.current) return null;
            const observer = new ResizeObserver(callback);
            observer.observe(ref.current);
            return observer;
        });
        callback();
        return () => {
            observers.forEach(observer => observer?.disconnect());
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [callback]);
};

const useImageLoader = (seqRef, onLoad) => {
    useEffect(() => {
        const images = seqRef.current?.querySelectorAll('img') ?? [];
        if (images.length === 0) { onLoad(); return; }
        let remaining = images.length;
        const handleLoad = () => { remaining -= 1; if (remaining === 0) onLoad(); };
        images.forEach(img => {
            if (img.complete) { handleLoad(); }
            else {
                img.addEventListener('load', handleLoad, { once: true });
                img.addEventListener('error', handleLoad, { once: true });
            }
        });
        return () => {
            images.forEach(img => {
                img.removeEventListener('load', handleLoad);
                img.removeEventListener('error', handleLoad);
            });
        };
    }, [onLoad, seqRef]);
};

const useAnimationLoop = (trackRef, targetVelocity, seqWidth, seqHeight, isHovered, hoverSpeed, isVertical) => {
    const rafRef = useRef(null);
    const lastTimestampRef = useRef(null);
    const offsetRef = useRef(0);
    const velocityRef = useRef(0);

    useEffect(() => {
        const track = trackRef.current;
        if (!track) return;
        const seqSize = isVertical ? seqHeight : seqWidth;

        if (seqSize > 0) {
            offsetRef.current = ((offsetRef.current % seqSize) + seqSize) % seqSize;
            track.style.transform = isVertical
                ? `translate3d(0, ${-offsetRef.current}px, 0)`
                : `translate3d(${-offsetRef.current}px, 0, 0)`;
        }

        const animate = timestamp => {
            if (lastTimestampRef.current === null) lastTimestampRef.current = timestamp;
            const deltaTime = Math.max(0, timestamp - lastTimestampRef.current) / 1000;
            lastTimestampRef.current = timestamp;
            const target = isHovered && hoverSpeed !== undefined ? hoverSpeed : targetVelocity;
            const easing = 1 - Math.exp(-deltaTime / ANIMATION_CONFIG.SMOOTH_TAU);
            velocityRef.current += (target - velocityRef.current) * easing;
            if (seqSize > 0) {
                let next = offsetRef.current + velocityRef.current * deltaTime;
                next = ((next % seqSize) + seqSize) % seqSize;
                offsetRef.current = next;
                track.style.transform = isVertical
                    ? `translate3d(0, ${-offsetRef.current}px, 0)`
                    : `translate3d(${-offsetRef.current}px, 0, 0)`;
            }
            rafRef.current = requestAnimationFrame(animate);
        };

        rafRef.current = requestAnimationFrame(animate);
        return () => {
            if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
            lastTimestampRef.current = null;
        };
    }, [targetVelocity, seqWidth, seqHeight, isHovered, hoverSpeed, isVertical, trackRef]);
};

export const LogoLoop = memo(({
    logos,
    speed = 120,
    direction = 'left',
    width = '100%',
    logoHeight = 160,
    gap = 24,
    pauseOnHover,
    hoverSpeed,
    fadeOut = false,
    fadeOutColor,
    scaleOnHover = false,
    renderItem,
    ariaLabel = 'Image gallery',
    className,
    style,
}) => {
    const containerRef = useRef(null);
    const trackRef = useRef(null);
    const seqRef = useRef(null);

    const [seqWidth, setSeqWidth] = useState(0);
    const [seqHeight, setSeqHeight] = useState(0);
    const [copyCount, setCopyCount] = useState(ANIMATION_CONFIG.MIN_COPIES);
    const [isHovered, setIsHovered] = useState(false);

    const effectiveHoverSpeed = useMemo(() => {
        if (hoverSpeed !== undefined) return hoverSpeed;
        if (pauseOnHover === true) return 0;
        if (pauseOnHover === false) return undefined;
        return 0;
    }, [hoverSpeed, pauseOnHover]);

    const isVertical = direction === 'up' || direction === 'down';

    const targetVelocity = useMemo(() => {
        const magnitude = Math.abs(speed);
        const dirMul = isVertical ? (direction === 'up' ? 1 : -1) : (direction === 'left' ? 1 : -1);
        return magnitude * dirMul * (speed < 0 ? -1 : 1);
    }, [speed, direction, isVertical]);

    const updateDimensions = useCallback(() => {
        const containerWidth = containerRef.current?.clientWidth ?? 0;
        const rect = seqRef.current?.getBoundingClientRect?.();
        const sw = rect?.width ?? 0;
        const sh = rect?.height ?? 0;
        if (isVertical) {
            const parentHeight = containerRef.current?.parentElement?.clientHeight ?? 0;
            if (containerRef.current && parentHeight > 0) {
                const h = Math.ceil(parentHeight);
                if (containerRef.current.style.height !== `${h}px`) containerRef.current.style.height = `${h}px`;
            }
            if (sh > 0) {
                setSeqHeight(Math.ceil(sh));
                const viewport = containerRef.current?.clientHeight ?? parentHeight ?? sh;
                setCopyCount(Math.max(ANIMATION_CONFIG.MIN_COPIES, Math.ceil(viewport / sh) + ANIMATION_CONFIG.COPY_HEADROOM));
            }
        } else if (sw > 0) {
            setSeqWidth(Math.ceil(sw));
            setCopyCount(Math.max(ANIMATION_CONFIG.MIN_COPIES, Math.ceil(containerWidth / sw) + ANIMATION_CONFIG.COPY_HEADROOM));
        }
    }, [isVertical]);

    useResizeObserver(updateDimensions, [containerRef, seqRef]);
    useImageLoader(seqRef, updateDimensions);
    useAnimationLoop(trackRef, targetVelocity, seqWidth, seqHeight, isHovered, effectiveHoverSpeed, isVertical);

    const cssVariables = useMemo(() => ({
        '--logoloop-gap': `${gap}px`,
        '--logoloop-logoHeight': `${logoHeight}px`,
        ...(fadeOutColor && { '--logoloop-fadeColor': fadeOutColor }),
    }), [gap, logoHeight, fadeOutColor]);

    const rootClassName = useMemo(() =>
        ['logoloop', isVertical ? 'logoloop--vertical' : 'logoloop--horizontal',
            fadeOut && 'logoloop--fade', scaleOnHover && 'logoloop--scale-hover', className]
            .filter(Boolean).join(' '),
        [isVertical, fadeOut, scaleOnHover, className]);

    const handleMouseEnter = useCallback(() => { if (effectiveHoverSpeed !== undefined) setIsHovered(true); }, [effectiveHoverSpeed]);
    const handleMouseLeave = useCallback(() => { if (effectiveHoverSpeed !== undefined) setIsHovered(false); }, [effectiveHoverSpeed]);

    const renderLogoItem = useCallback((item, key) => {
        if (renderItem) {
            return <li className="logoloop__item" key={key} role="listitem">{renderItem(item, key)}</li>;
        }
        const isNodeItem = 'node' in item;
        const content = isNodeItem ? (
            <span className="logoloop__node" aria-hidden={!!item.href && !item.ariaLabel}>{item.node}</span>
        ) : (
            <img
                src={item.src}
                alt={item.alt ?? ''}
                title={item.title}
                loading="lazy"
                decoding="async"
                draggable={false}
            />
        );
        const label = isNodeItem ? (item.ariaLabel ?? item.title) : (item.alt ?? item.title);
        const itemContent = item.href ? (
            <a className="logoloop__link" href={item.href} aria-label={label || 'link'} target="_blank" rel="noreferrer noopener">
                {content}
            </a>
        ) : content;
        return <li className="logoloop__item" key={key} role="listitem">{itemContent}</li>;
    }, [renderItem]);

    const logoLists = useMemo(() =>
        Array.from({ length: copyCount }, (_, ci) => (
            <ul className="logoloop__list" key={`copy-${ci}`} role="list" aria-hidden={ci > 0} ref={ci === 0 ? seqRef : undefined}>
                {logos.map((item, ii) => renderLogoItem(item, `${ci}-${ii}`))}
            </ul>
        )),
        [copyCount, logos, renderLogoItem]);

    const containerStyle = useMemo(() => ({
        width: isVertical
            ? (toCssLength(width) === '100%' ? undefined : toCssLength(width))
            : (toCssLength(width) ?? '100%'),
        ...cssVariables,
        ...style,
    }), [width, cssVariables, style, isVertical]);

    return (
        <div ref={containerRef} className={rootClassName} style={containerStyle} role="region" aria-label={ariaLabel}>
            <div className="logoloop__track" ref={trackRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
                {logoLists}
            </div>
        </div>
    );
});

LogoLoop.displayName = 'LogoLoop';
export default LogoLoop;
