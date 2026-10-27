"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, type MotionValue } from "framer-motion";
export const EV_IMAGE = "/images/voltroute-ev-studio.png";

const FRAME_COUNT = 59;
// Begin just into the existing turn, with a subtle three-quarter view.
const START_FRAME = 8;
const frameUrl = (index: number) => `/images/ev-frames/f${String(index + 1).padStart(3, "0")}.webp`;
export const EV_FIRST_FRAME = frameUrl(START_FRAME);

export function EVScene({
  variant = "hero",
  x,
  rotateY,
  scale,
  progress,
}: {
  variant?: "hero" | "auth";
  x?: MotionValue<number>;
  rotateY?: MotionValue<number>;
  scale?: MotionValue<number>;
  progress?: MotionValue<number>;
}) {
  const reduce = useReducedMotion();
  const isHero = variant === "hero";
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const animated = isHero && !reduce && !!progress;
  useEffect(() => {
    const element = canvas.current;
    if (!animated || !element || !progress) return;
    const context = element.getContext("2d");
    if (!context) return;
    const frames: HTMLImageElement[] = [];
    let disposed = false;
    let animationFrame = 0;
    let drawn = -1;
    const draw = () => {
      animationFrame = 0;
      if (disposed) return;
      const wanted = START_FRAME + Math.round(Math.min(1, Math.max(0, progress.get())) * (FRAME_COUNT - 1 - START_FRAME));
      let index = -1;
      for (let distance = 0; distance < FRAME_COUNT && index < 0; distance++) {
        for (const candidate of [wanted - distance, wanted + distance]) {
          if (frames[candidate]?.complete && frames[candidate].naturalWidth) { index = candidate; break; }
        }
      }
      if (index < 0 || index === drawn) return;
      const { width, height } = element;
      if (!width || !height) return;
      const image = frames[index];
      const fit = Math.min(width / image.naturalWidth, height / image.naturalHeight);
      const w = image.naturalWidth * fit, h = image.naturalHeight * fit;
      context.clearRect(0, 0, width, height);
      context.imageSmoothingQuality = "high";
      context.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
      drawn = index;
      setReady(true);
    };
    const requestDraw = () => {
      if (!disposed && !animationFrame) animationFrame = requestAnimationFrame(draw);
    };
    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = element.getBoundingClientRect();
      element.width = Math.round(width * ratio);
      element.height = Math.round(height * ratio);
      drawn = -1;
      draw();
    };
    const order = Array.from({ length: FRAME_COUNT - START_FRAME }, (_, index) => START_FRAME + index).sort(
      (a, b) => ((a - START_FRAME) % 8 === 0 ? 0 : 1) - ((b - START_FRAME) % 8 === 0 ? 0 : 1) || a - b,
    );
    for (const index of order) {
      const image = new Image();
      image.decoding = "async";
      image.onload = requestDraw;
      image.src = frameUrl(index);
      frames[index] = image;
    }
    const unsubscribe = progress.on("change", requestDraw);
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    return () => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
      unsubscribe();
      observer.disconnect();
    };
  }, [animated, progress]);


  return (
    <div
      className={`ev-scene ev-scene-${variant} ${isHero ? "ev-scene-sequence" : ""}`}
      aria-label={
        isHero
          ? "Electric car turntable controlled by scrolling"
          : "Silver electric sports coupe in a mint-lit studio"
      }
    >
      <div className="ev-scene-halo" />
      <div className="ev-scene-orbit ev-scene-orbit-one" />
      <div className="ev-scene-orbit ev-scene-orbit-two" />
      <div className="ev-scene-floor" />
      <motion.div
        className="ev-scene-car-scroll"
        style={reduce ? {} : { x, rotateY, scale }}
      >
        {isHero ? (
          <>
            {!(animated && ready) && <img
              className="ev-scene-car ev-sequence-poster"
              src={EV_FIRST_FRAME}
              onError={(event) => {
                const image = event.currentTarget;
                if (image.getAttribute("src") !== EV_IMAGE) image.src = EV_IMAGE;
              }}
              alt="Silver electric car on a turntable"
              width={1302}
              height={464}
              fetchPriority="high"
              draggable={false}
            />}
            {animated && <canvas ref={canvas} className={`ev-scene-car ev-sequence-canvas ${ready ? "is-ready" : ""}`} aria-label="Scroll to turn the electric car" role="img" />}
          </>
        ) : (
          <motion.img
            className="ev-scene-car"
            src={EV_IMAGE}
            alt="Silver electric coupe with mint reflections"
            width={1696}
            height={944}
            fetchPriority="high"
            initial={
              reduce ? false : { opacity: 0, x: 90, rotateY: 32, rotateZ: -2, scale: 0.9 }
            }
            animate={{ opacity: 1, x: 0, rotateY: 0, rotateZ: 0, scale: 1 }}
            transition={{
              duration: reduce ? 0 : 1.7,
              delay: 0.12,
              ease: [0.16, 1, 0.3, 1],
            }}
            draggable={false}
          />
        )}
      </motion.div>
      <div className="ev-scene-ground-light" />
      <div className="ev-scene-shadow" aria-hidden="true" />
    </div>
  );
}
