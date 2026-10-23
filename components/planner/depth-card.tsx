"use client";

import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import type { PointerEvent, ReactNode } from "react";

const surfaces = { article: motion.article, section: motion.section, div: motion.div };

/** A small pointer-driven perspective effect, disabled for touch and reduced motion. */
export function DepthCard({ children, className = "", as = "div", intensity = 3, "aria-label": label }: {
  children: ReactNode;
  className?: string;
  as?: keyof typeof surfaces;
  intensity?: number;
  "aria-label"?: string;
}) {
  const reducedMotion = useReducedMotion();
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const lightX = useMotionValue(50);
  const lightY = useMotionValue(0);
  const springX = useSpring(rotateX, { stiffness: 220, damping: 28 });
  const springY = useSpring(rotateY, { stiffness: 220, damping: 28 });
  const shine = useMotionTemplate`radial-gradient(360px circle at ${lightX}% ${lightY}%, rgba(190, 237, 216, 0.07), transparent 72%)`;
  const Surface = surfaces[as];
  const reset = () => { rotateX.set(0); rotateY.set(0); lightX.set(50); lightY.set(0); };
  const move = (event: PointerEvent<HTMLElement>) => {
    if (reducedMotion || event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    rotateX.set((0.5 - y) * intensity);
    rotateY.set((x - 0.5) * intensity);
    lightX.set(x * 100); lightY.set(y * 100);
  };
  return <Surface aria-label={label} onPointerMove={move} onPointerLeave={reset} onPointerCancel={reset}
    style={{ rotateX: reducedMotion ? 0 : springX, rotateY: reducedMotion ? 0 : springY, transformPerspective: 1100 }}
    className={`vr-depth-card ${className}`}>
    <motion.span aria-hidden="true" className="vr-depth-shine" style={{ background: shine }} />
    {children}
  </Surface>;
}
