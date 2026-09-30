import React, { useState, useRef, useEffect } from "react";

interface CharPos {
  x: number;
  y: number;
}

type RevealStage =
  | "blank"
  | "title"
  | "readyToPress"
  | "dissolving"
  | "revealed";

export const HeroOverlay: React.FC = () => {
  const [stage, setStage] = useState<RevealStage>("blank");

  // Cursor and verse hover effect
  const [lensPos, setLensPos] = useState({ x: -1000, y: -1000 });
  const [isHovered, setIsHovered] = useState(false);
  const [charPositions, setCharPositions] = useState<CharPos[]>([]);

  // Scroll steps after the verse appears:
  // 0 = normal verse, 1 = blur other words, 2 = make "world" red,
  // 3 = center and zoom "world"
  const [worldFocusStep, setWorldFocusStep] = useState(0);
  const [worldOffset, setWorldOffset] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLHeadingElement>(null);
  const worldRef = useRef<HTMLSpanElement>(null);

  const verseText =
    "For God so loved the world, that he gave his only Son, that whoever believes in him should not perish but have eternal life.";

  const measureChars = () => {
    if (!textRef.current || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const spans = textRef.current.querySelectorAll(".wave-char");

    const coords: CharPos[] = [];

    spans.forEach((span) => {
      const rect = span.getBoundingClientRect();

      coords.push({
        x: rect.left + rect.width / 2 - containerRect.left,
        y: rect.top + rect.height / 2 - containerRect.top,
      });
    });

    setCharPositions(coords);
  };

  // Measure after the verse appears and after "world" moves.
  useEffect(() => {
    if (stage !== "revealed") return;

    const hasMovedWord =
      worldFocusStep >= 3 || worldOffset.x !== 0 || worldOffset.y !== 0;

    const timer = window.setTimeout(
      measureChars,
      hasMovedWord ? 800 : 100,
    );

    return () => window.clearTimeout(timer);
  }, [stage, worldFocusStep, worldOffset.x, worldOffset.y]);

  // Recalculate the position of "world" when it reaches the final scroll step.
  useEffect(() => {
    if (stage !== "revealed" || worldFocusStep < 3 || !worldRef.current) {
      setWorldOffset({ x: 0, y: 0 });
      return;
    }

    const rect = worldRef.current.getBoundingClientRect();

    setWorldOffset({
      x: window.innerWidth / 2 - (rect.left + rect.width / 2),
      y: window.innerHeight / 2 - (rect.top + rect.height / 2),
    });
  }, [stage, worldFocusStep]);

  const lastScrollActionRef = useRef(0);
  const SCROLL_DELAY_MS = 1200;

  // Advance or reverse the sequence with the mouse wheel.
  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      const now = Date.now();

      if (now - lastScrollActionRef.current < SCROLL_DELAY_MS) return;

      let advanced = false;

      if (event.deltaY > 0) {
        if (stage === "blank") {
          setStage("title");
          advanced = true;
        } else if (stage === "readyToPress") {
          setStage("dissolving");
          advanced = true;
        } else if (stage === "revealed" && worldFocusStep < 3) {
          setWorldFocusStep((step) => step + 1);
          advanced = true;
        }
      } else if (event.deltaY < 0) {
        if (stage === "revealed" && worldFocusStep > 0) {
          setWorldFocusStep((step) => step - 1);
          advanced = true;
        } else if (stage === "revealed") {
          setStage("readyToPress");
          advanced = true;
        } else if (stage === "dissolving") {
          setStage("readyToPress");
          advanced = true;
        } else if (stage === "readyToPress") {
          setStage("title");
          advanced = true;
        } else if (stage === "title") {
          setStage("blank");
          advanced = true;
        }
      }

      if (advanced) {
        lastScrollActionRef.current = now;
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: true });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [stage, worldFocusStep]);

  // Show the verse after the title transition.
  useEffect(() => {
    if (stage !== "dissolving") return;

    const timer = window.setTimeout(() => {
      setStage("revealed");
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [stage]);

  // Move from the title to the ready-to-scroll state after two seconds.
  useEffect(() => {
    if (stage !== "title") return;

    const timer = window.setTimeout(() => {
      setStage("readyToPress");
    }, 2000);

    return () => window.clearTimeout(timer);
  }, [stage]);

  // Re-measure the verse when the viewport changes.
  useEffect(() => {
    const handleResize = () => {
      if (stage === "revealed") {
        measureChars();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [stage]);

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();

    setLensPos({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  };

  const getCenterCrossStyle = () => {
    if (!containerRef.current || !isHovered || stage !== "revealed") {
      return { opacity: 0, scale: 0.5 };
    }

    const centerX = containerRef.current.clientWidth / 2;
    const centerY = containerRef.current.clientHeight / 2;
    const dx = lensPos.x - centerX;
    const dy = lensPos.y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const activeRadius = 180;

    if (distance < activeRadius) {
      const factor = 1 - distance / activeRadius;

      return {
        opacity: factor,
        scale: 0.6 + factor * 0.4,
      };
    }

    return { opacity: 0, scale: 0.5 };
  };

  // Existing cursor-centered water ripple / letter zoom.
  const getWaveStyle = (index: number) => {
    if (!isHovered || !charPositions[index] || stage !== "revealed") {
      return {};
    }

    const char = charPositions[index];
    const dx = lensPos.x - char.x;
    const dy = lensPos.y - char.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const radius = 125;

    if (distance < radius) {
      const factor = Math.cos((distance / radius) * (Math.PI / 2));
      const scale = 1 + factor * 0.5;
      const translateY = -factor * 12;
      const opacity = 0.8 + factor * 0.2;

      return {
        transform: `translateY(${translateY}px) scale(${scale})`,
        filter: `drop-shadow(0 0 ${6 + factor * 12}px rgba(255, 255, 255, ${
          0.4 + factor * 0.6
        }))`,
        opacity,
      };
    }

    return {};
  };

  const renderWaveText = (isPrimary = true) => {
    const words = verseText.split(" ");
    let charIndex = 0;

    return (
      <h1
        ref={isPrimary ? textRef : null}
        className="w-full max-w-3xl px-6 text-2xl md:text-4xl font-serif leading-relaxed tracking-wide text-stone-100"
      >
        {words.map((word, wordIndex) => {
          const isWorld =
            word.replace(/[.,!?;:]/g, "").toLowerCase() === "world";

          return (
            <React.Fragment key={wordIndex}>
              <span
                ref={isPrimary && isWorld ? worldRef : null}
                className={`relative inline-block whitespace-nowrap transition-all duration-700 ease-in-out ${
                  stage === "revealed" && worldFocusStep >= 1 && !isWorld
                    ? "blur-[3px] opacity-25"
                    : ""
                } ${
                  isWorld && worldFocusStep >= 2 ? "text-red-500" : ""
                }`}
                style={
                  isPrimary && isWorld
                    ? {
                        transform: `translate(${worldOffset.x}px, ${worldOffset.y}px) scale(${
                          worldFocusStep >= 3 ? 1.5 : 1
                        })`,
                        zIndex: worldFocusStep >= 3 ? 50 : undefined,
                      }
                    : undefined
                }
              >
                {word.split("").map((char) => {
                  const index = charIndex++;

                  return (
                    <span
                      key={index}
                      style={getWaveStyle(index)}
                      className="wave-char inline-block transition-transform duration-150 ease-out select-none"
                    >
                      {char}
                    </span>
                  );
                })}
              </span>

              {wordIndex < words.length - 1 ? " " : ""}
            </React.Fragment>
          );
        })}
      </h1>
    );
  };

  const crossState = getCenterCrossStyle();

return (
  <div
    ref={containerRef}
    onMouseMove={handleMouseMove}
    onMouseEnter={() => setIsHovered(true)}
    onMouseLeave={() => setIsHovered(false)}
    className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center cursor-none select-none"
  >
    {/* Blank intro */}
    <div
      className={`flex flex-col items-center transition-all duration-1000 ease-in-out ${
        stage === "blank"
          ? "opacity-100 scale-100"
          : "pointer-events-none absolute opacity-0 scale-95"
      }`}
    >
      <p className="text-stone-400 text-sm tracking-widest uppercase animate-pulse">
        Scroll Down
      </p>
    </div>

    {/* John 3:16 title */}
    <div
      className={`flex flex-col items-center justify-center space-y-8 transition-all duration-1000 ease-in-out ${
        stage === "title" ||
        stage === "readyToPress" ||
        stage === "dissolving"
          ? "opacity-100 scale-100"
          : "pointer-events-none absolute opacity-0 scale-95"
      }`}
    >
      <h2 className="text-4xl md:text-6xl font-serif text-white tracking-widest drop-shadow-[0_0_20px_rgba(255,255,255,0.8)] drop-shadow-[0_0_40px_rgba(200,200,200,0.4)] animate-pulse">
        JOHN 3:16
      </h2>

      <div
        className={`transition-all duration-1000 ease-out ${
          stage === "readyToPress"
            ? "opacity-100 translate-y-0"
            : "pointer-events-none opacity-0 translate-y-4"
        }`}
      >
        <p className="text-stone-400 text-xs tracking-widest uppercase">
          Scroll to reveal
        </p>
      </div>
    </div>

    {/* Verse */}
    <div
      className={`flex flex-col items-center justify-center transition-all duration-1000 ease-in-out ${
        stage === "revealed"
          ? "opacity-100 scale-100"
          : "pointer-events-none absolute opacity-0 scale-95"
      }`}
    >
      {renderWaveText()}
    </div>

    {/* Prompt fixed to the lower-right of the hero */}
    {stage === "revealed" && (
      <p className="pointer-events-none absolute bottom-6 right-6 z-10 text-right text-xs tracking-widest text-stone-700 uppercase drop-shadow-[0_0_6px_rgba(255,255,255,0.3)] sm:bottom-8 sm:right-8">
        Move mouse to explore
      </p>
    )}

    {/* Center glow */}
    {stage === "revealed" && (
      <div
        style={{
          opacity: crossState.opacity,
          transform: `translate(-50%, -50%) scale(${crossState.scale})`,
        }}
        className="fixed top-1/2 left-1/2 z-30 flex items-center justify-center pointer-events-none transition-all duration-300 ease-out"
      >
        <div className="absolute h-28 w-28 rounded-full bg-white/20 blur-xl animate-pulse" />
      </div>
    )}

    {/* Existing cursor lens and magnified verse copy */}
    {isHovered && (
      <div
        style={{
          left: `${lensPos.x}px`,
          top: `${lensPos.y}px`,
        }}
        className={`pointer-events-none absolute z-50 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full transition-opacity duration-300 ${
          stage === "revealed"
            ? "h-5 w-5 overflow-hidden border border-stone-300/30 bg-stone-950/85 shadow-[0_0_40px_rgba(0,0,0,0.9),0_0_20px_rgba(255,255,255,0.15)] backdrop-blur-md"
            : "h-6 w-6 border border-stone-300/60 bg-white/10"
        }`}
      >
        {stage === "revealed" && (
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: containerRef.current
                ? `${containerRef.current.clientWidth}px`
                : "100vw",
              height: containerRef.current
                ? `${containerRef.current.clientHeight}px`
                : "100vh",
              transform: `translate(${-lensPos.x}px, ${-lensPos.y}px)`,
            }}
            className="pointer-events-none flex flex-col items-center justify-center px-6 text-center opacity-60"
          >
            {renderWaveText(false)}
          </div>
        )}
      </div>
    )}
  </div>
);
};