import { useEffect, useState } from "react";
import { playerApi } from "lib/playerApi";

export function useDraftNotifications({ activeView }) {
  const [draftNotification, setDraftNotification] = useState(null);
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState([]);

  useEffect(() => {
    if (activeView !== "draft") return undefined;

    let cancelled = false;
    let latestSeenTimestamp = "";

    async function loadRecentNotifications() {
      try {
        const response = await playerApi.getRecentTransactionNotifications({
          since: latestSeenTimestamp,
        });
        if (cancelled) return;

        const notifications = Array.isArray(response?.notifications)
          ? response.notifications
          : [];
        const nextNotification = notifications.find(
          (notification) => !dismissedNotificationIds.includes(notification.id),
        );

        if (notifications[0]?.timestamp) {
          latestSeenTimestamp = notifications[0].timestamp;
        }

        if (nextNotification) {
          setDraftNotification(nextNotification);
        }
      } catch (err) {
        console.log(err);
      }
    }

    const intervalId = setInterval(loadRecentNotifications, 15_000);
    loadRecentNotifications();

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [activeView, dismissedNotificationIds]);

  function dismissDraftNotification() {
    if (draftNotification?.id) {
      setDismissedNotificationIds((current) => [
        ...current,
        draftNotification.id,
      ]);
    }
    setDraftNotification(null);
  }

  return {
    draftNotification,
    dismissDraftNotification,
  };
}
