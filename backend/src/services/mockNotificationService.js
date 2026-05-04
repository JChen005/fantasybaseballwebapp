const MAX_RECENT_NOTIFICATIONS = 20;

const recentNotifications = [];

function recordMockTransactionNotification({ event, resolvedPlayer }) {
  const notification = {
    id: event?.eventId || `${resolvedPlayer?.id || event?.playerId || 'player'}-${Date.now()}`,
    playerId: String(resolvedPlayer?.id || event?.playerId || ''),
    playerName: resolvedPlayer?.name || event?.playerName || 'Player update',
    type: event?.type || 'NEWS_ALERT',
    detail: event?.detail || '',
    timestamp: event?.timestamp || new Date().toISOString(),
  };

  recentNotifications.unshift(notification);
  recentNotifications.splice(MAX_RECENT_NOTIFICATIONS);

  return notification;
}

function listRecentMockTransactionNotifications({ since } = {}) {
  const sinceTime = since ? Date.parse(since) : 0;

  return recentNotifications.filter((notification) => {
    if (!Number.isFinite(sinceTime) || sinceTime <= 0) return true;
    return Date.parse(notification.timestamp) > sinceTime;
  });
}

module.exports = {
  listRecentMockTransactionNotifications,
  recordMockTransactionNotification,
};
