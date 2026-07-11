"use client";

import { type CSSProperties, useEffect, useMemo, useRef } from "react";

type Particle = {
  id: number;
  left: string;
  size: string;
  duration: string;
  delay: string;
  opacity: string;
};

type ParticleStyle = CSSProperties & {
  "--particle-opacity": string;
};

export function DynamicLoginBackground() {
  const spotlightRef = useRef<HTMLDivElement>(null);
  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: 45 }, (_, index) => {
        const leftSeed = seededValue(index, 11);
        const sizeSeed = seededValue(index, 23);
        const durationSeed = seededValue(index, 37);
        const delaySeed = seededValue(index, 53);
        const opacitySeed = seededValue(index, 71);
        const size = 2 + sizeSeed * 5;

        return {
          id: index,
          left: `${formatParticleNumber(leftSeed * 100)}%`,
          size: `${formatParticleNumber(size)}px`,
          duration: `${formatParticleNumber(8 + durationSeed * 12)}s`,
          delay: `${formatParticleNumber(delaySeed * 10)}s`,
          opacity: formatParticleNumber(0.42 + opacitySeed * 0.38),
        };
      }),
    [],
  );

  useEffect(() => {
    const spotlight = spotlightRef.current;
    if (!spotlight) return;
    const spotlightElement: HTMLDivElement = spotlight;

    function moveSpotlight(event: PointerEvent) {
      spotlightElement.style.left = `${event.clientX}px`;
      spotlightElement.style.top = `${event.clientY}px`;
      spotlightElement.style.opacity = "1";
    }

    function hideSpotlight() {
      spotlightElement.style.opacity = "0";
    }

    window.addEventListener("pointermove", moveSpotlight);
    window.addEventListener("pointerleave", hideSpotlight);
    window.addEventListener("blur", hideSpotlight);

    return () => {
      window.removeEventListener("pointermove", moveSpotlight);
      window.removeEventListener("pointerleave", hideSpotlight);
      window.removeEventListener("blur", hideSpotlight);
    };
  }, []);

  return (
    <>
      <div className="login-background-animation" aria-hidden="true">
        <div className="login-blob login-blob-one" />
        <div className="login-blob login-blob-two" />
        <div className="login-blob login-blob-three" />

        <div className="login-particles">
          {particles.map((particle) => {
            const style: ParticleStyle = {
              left: particle.left,
              width: particle.size,
              height: particle.size,
              animationDuration: particle.duration,
              animationDelay: particle.delay,
              "--particle-opacity": particle.opacity,
            };

            return <span key={particle.id} className="login-particle" style={style} />;
          })}
        </div>
      </div>

      <div ref={spotlightRef} className="login-spotlight" aria-hidden="true" />
    </>
  );
}

function seededValue(index: number, salt: number) {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;

  return value - Math.floor(value);
}

function formatParticleNumber(value: number) {
  return value.toFixed(4);
}
