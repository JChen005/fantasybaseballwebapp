import { useEffect, useState } from "react";
import { playerApi } from "lib/playerApi";

export function useDraftDepthChart({ activeView, selectedTeamId }) {
  const [depthChart, setDepthChart] = useState(null);
  const [depthError, setDepthError] = useState("");
  const [isLoadingDepth, setIsLoadingDepth] = useState(false);

  useEffect(() => {
    if (activeView !== "depth") return undefined;

    let cancelled = false;

    async function loadDepthChart() {
      setIsLoadingDepth(true);
      setDepthError("");

      try {
        const data = await playerApi.getTeamDepthChart({
          teamId: selectedTeamId,
        });
        if (cancelled) return;
        setDepthChart(data);
      } catch (err) {
        if (cancelled) return;
        setDepthError(err.message || "Failed to load depth chart");
      } finally {
        if (!cancelled) {
          setIsLoadingDepth(false);
        }
      }
    }

    loadDepthChart();

    return () => {
      cancelled = true;
    };
  }, [activeView, selectedTeamId]);

  return {
    depthChart,
    depthError,
    isLoadingDepth,
  };
}
