"use client";
import React, { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  type MotionValue,
} from "motion/react";

export type DomainProduct = {
  title: string;
  subtitle: string;
  description: string;
  tags: readonly string[];
  element: React.ReactNode;
  onClick: () => void;
};

export const HeroParallax = ({
  products,
  header,
}: {
  products: DomainProduct[];
  header?: React.ReactNode;
}) => {
  const firstRow = products.slice(0, Math.ceil(products.length / 2));
  const secondRow = products.slice(Math.ceil(products.length / 2));
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const springConfig = { stiffness: 300, damping: 30, bounce: 100 };

  const translateX = useSpring(
    useTransform(scrollYProgress, [0, 1], [0, 1000]),
    springConfig
  );
  const translateXReverse = useSpring(
    useTransform(scrollYProgress, [0, 1], [0, -1000]),
    springConfig
  );
  const rotateX = useSpring(
    useTransform(scrollYProgress, [0, 0.2], [15, 0]),
    springConfig
  );
  const opacity = useSpring(
    useTransform(scrollYProgress, [0, 0.2], [0.3, 1]),
    springConfig
  );
  const rotateZ = useSpring(
    useTransform(scrollYProgress, [0, 0.2], [20, 0]),
    springConfig
  );
  const translateY = useSpring(
    useTransform(scrollYProgress, [0, 0.2], [-700, 100]),
    springConfig
  );

  return (
    <div
      ref={ref}
      className="h-[250vh] py-40 overflow-hidden antialiased relative flex flex-col self-auto [perspective:1000px] [transform-style:preserve-3d]"
      style={{ background: "#000" }}
    >
      {header && (
        <Header header={header} />
      )}
      <motion.div
        style={{
          rotateX,
          rotateZ,
          translateY,
          opacity,
        }}
        className=""
      >
        <motion.div className="flex flex-row-reverse space-x-reverse space-x-20 mb-20">
          {firstRow.map((product) => (
            <ProductCard
              product={product}
              translate={translateX}
              key={product.title}
            />
          ))}
        </motion.div>
        <motion.div className="flex flex-row mb-20 space-x-20">
          {secondRow.map((product) => (
            <ProductCard
              product={product}
              translate={translateXReverse}
              key={product.title}
            />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};

export const Header = ({ header }: { header: React.ReactNode }) => {
  return (
    <div className="max-w-7xl relative mx-auto py-20 md:py-40 px-4 w-full left-0 top-0">
      {header}
    </div>
  );
};

export const ProductCard = ({
  product,
  translate,
}: {
  product: DomainProduct;
  translate: MotionValue<number>;
}) => {
  return (
    <motion.div
      style={{
        x: translate,
        width: "380px",
      }}
      whileHover={{
        y: -20,
      }}
      onClick={product.onClick}
      key={product.title}
      className="group/product relative flex-shrink-0 cursor-pointer"
    >
      <div
        className="domain-parallax-card"
        style={{
          width: "380px",
          height: "280px",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(107, 164, 171, 0.2)",
          borderRadius: "16px",
          padding: "2rem",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backdropFilter: "blur(8px)",
          transition: "border-color 0.3s ease",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Hover glow */}
        <div
          className="absolute inset-0 opacity-0 group-hover/product:opacity-100 transition-opacity duration-300"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(107,164,171,0.12) 0%, transparent 70%)",
          }}
        />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ marginBottom: "1.5rem" }}>
            {product.element}
          </div>
          <h3
            style={{
              fontFamily: "'Comfortaa', sans-serif",
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "#fff",
              marginBottom: "0.25rem",
            }}
          >
            {product.title}
          </h3>
          <p
            style={{
              fontSize: "0.85rem",
              color: "#6ba4ab",
              marginBottom: "0.75rem",
              fontWeight: 500,
            }}
          >
            {product.subtitle}
          </p>
          <p
            style={{
              fontSize: "0.8rem",
              color: "rgba(255,255,255,0.5)",
              lineHeight: 1.5,
            }}
          >
            {product.description}
          </p>
        </div>
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            flexWrap: "wrap",
            gap: "0.4rem",
          }}
        >
          {product.tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: "0.7rem",
                padding: "0.2rem 0.6rem",
                border: "1px solid rgba(107,164,171,0.4)",
                borderRadius: "999px",
                color: "#6ba4ab",
                letterSpacing: "0.05em",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
