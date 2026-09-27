import { useEffect, useRef } from "react";

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
      <iframe
        ref={frameRef}
        title="可交互身体星球地图"
        src="/planet.html?mode=app"
        loading="eager"
      />
    </section>
  );
}
