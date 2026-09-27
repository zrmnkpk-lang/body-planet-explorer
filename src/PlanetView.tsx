import { useEffect, useRef, useState } from "react";

interface BodyMetrics {
  muscle: string;
  water: string;
  bone: string;
  fat: string;
}

function metricValues(bodyMetrics: BodyMetrics) {
  return Object.fromEntries(
    Object.entries(bodyMetrics).map(([zone, value]) => [zone, Number.parseFloat(value)]),
  );
}

/**
 * The production planet lives in the shared standalone renderer so the APP and
 * the full preview use the same terrain, workers, landmarks and WebGL controls.
 * Metrics are sent into the same-origin frame whenever the data page changes.
 */
export default function PlanetView({ bodyMetrics }: { bodyMetrics: BodyMetrics }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [frameReady, setFrameReady] = useState(false);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const publishMetrics = () => {
      const frameWindow = frame.contentWindow;
      if (!frameWindow) return;
      const MetricsEvent = frameWindow.CustomEvent;
      frameWindow.dispatchEvent(
        new MetricsEvent("body-planet:metrics", {
          detail: metricValues(bodyMetrics),
        }),
      );
    };

    frame.addEventListener("load", publishMetrics);
    publishMetrics();
    return () => frame.removeEventListener("load", publishMetrics);
  }, [bodyMetrics]);

  return (
    <section className="latest-planet-view" aria-label="可交互身体星球">
      <div className={`planet-loading ${frameReady ? "is-hidden" : ""}`} role="status" aria-live="polite">
        <div className="planet-loading-orb" aria-hidden="true" />
        <span>正在加载身体星球…</span>
      </div>
      <iframe
        ref={frameRef}
        className={frameReady ? "is-ready" : ""}
        title="可交互身体星球地图"
        src="/planet.html?mode=app"
        loading="eager"
        onLoad={() => setFrameReady(true)}
      />
    </section>
  );
}
