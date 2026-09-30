"use client";

import { cn } from "../../lib/utils";
import { motion, useSpring } from "motion/react";
import React, {
  createContext,
  useState,
  useContext,
  useRef,
  useEffect,
} from "react";

const MouseEnterContext = createContext<
  [boolean, React.Dispatch<React.SetStateAction<boolean>>] | undefined
>(undefined);

export const CardContainer = ({
  children,
  className,
  containerClassName,
}: {
  children?: React.ReactNode;
  className?: string;
  containerClassName?: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMouseEntered, setIsMouseEntered] = useState(false);
  const rotateX = useSpring(0, { stiffness: 180, damping: 26, mass: .7 });
  const rotateY = useSpring(0, { stiffness: 180, damping: 26, mass: .7 });

  useEffect(() => {
    const container = containerRef.current!;
    const media = window.matchMedia('(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)');
    let bounds: DOMRect | undefined;
    let frame = 0;
    let pointerX = 0, pointerY = 0;
    const update = () => {
      frame = 0;
      // Measure the stable outer container, never the surface being tilted.
      bounds ??= container.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const x = Math.max(-1, Math.min(1, (pointerX - bounds.left) / bounds.width * 2 - 1));
      const y = Math.max(-1, Math.min(1, (pointerY - bounds.top) / bounds.height * 2 - 1));
      rotateX.set(-y * 4); rotateY.set(x * 6);
      container.style.setProperty('--card-x', `${(x + 1) * 50}%`);
      container.style.setProperty('--card-y', `${(y + 1) * 50}%`);
    };
    const move = (event: PointerEvent) => {
      if (!media.matches || event.pointerType !== 'mouse') return;
      pointerX = event.clientX; pointerY = event.clientY;
      if (!frame) frame = requestAnimationFrame(update);
    };
    const enter = (event: PointerEvent) => {
      if (!media.matches || event.pointerType !== 'mouse') return;
      bounds = undefined;
      setIsMouseEntered(true);
      move(event);
    };
    const leave = () => {
      cancelAnimationFrame(frame); frame = 0; bounds = undefined;
      setIsMouseEntered(false);
      if (media.matches) { rotateX.set(0); rotateY.set(0); }
      else { rotateX.jump(0); rotateY.jump(0); }
    };
    const invalidate = () => { bounds = undefined; };
    const resize = new ResizeObserver(invalidate);
    resize.observe(container);
    container.addEventListener('pointerenter', enter);
    container.addEventListener('pointermove', move, { passive: true });
    container.addEventListener('pointerleave', leave);
    window.addEventListener('scroll', invalidate, { passive: true });
    media.addEventListener('change', leave);
    return () => {
      cancelAnimationFrame(frame); resize.disconnect();
      container.removeEventListener('pointerenter', enter);
      container.removeEventListener('pointermove', move);
      container.removeEventListener('pointerleave', leave);
      window.removeEventListener('scroll', invalidate);
      media.removeEventListener('change', leave);
    };
  }, [rotateX, rotateY]);

  return (
    <MouseEnterContext.Provider value={[isMouseEntered, setIsMouseEntered]}>
      <div
        ref={containerRef}
        className={cn(containerClassName)}
        style={{
          perspective: "1000px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <motion.div
          className={cn(className)}
          style={{
            transformStyle: "preserve-3d",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            rotateX,
            rotateY,
          }}
        >
          {children}
        </motion.div>
      </div>
    </MouseEnterContext.Provider>
  );
};

export const CardBody = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(className)}
      style={{
        transformStyle: "preserve-3d",
        width: "100%",
        height: "100%",
      }}
    >
      {children}
    </div>
  );
};

export const CardItem = ({
  as: Tag = "div",
  children,
  className,
  translateX = 0,
  translateY = 0,
  translateZ = 0,
  rotateX = 0,
  rotateY = 0,
  rotateZ = 0,
  ...rest
}: {
  as?: React.ElementType<any, keyof HTMLElementTagNameMap>;
  children: React.ReactNode;
  className?: string;
  translateX?: number | string;
  translateY?: number | string;
  translateZ?: number | string;
  rotateX?: number | string;
  rotateY?: number | string;
  rotateZ?: number | string;
  [key: string]: any;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isMouseEntered] = useMouseEnter();

  useEffect(() => {
    handleAnimations();
  }, [isMouseEntered]);

  const handleAnimations = () => {
    if (!ref.current) return;
    if (isMouseEntered) {
      ref.current.style.transform = `translateX(${translateX}px) translateY(${translateY}px) translateZ(${translateZ}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg)`;
    } else {
      ref.current.style.transform = `translateX(0px) translateY(0px) translateZ(0px) rotateX(0deg) rotateY(0deg) rotateZ(0deg)`;
    }
  };

  return (
    <Tag
      ref={ref}
      className={cn(className)}
      style={{
        transition: "transform 420ms cubic-bezier(.16,1,.3,1)",
        transformStyle: "preserve-3d",
        ...rest.style,
      }}
      {...rest}
    >
      {children}
    </Tag>
  );
};

export const useMouseEnter = () => {
  const context = useContext(MouseEnterContext);
  if (context === undefined) {
    throw new Error("useMouseEnter must be used within a MouseEnterProvider");
  }
  return context;
};
