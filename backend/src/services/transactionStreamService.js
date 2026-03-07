const { EventEmitter } = require('events');
const crypto = require('crypto');

const { SSE_EVENTS } = require('../constants/sseEvents');

const transactionEventBus = new EventEmitter();
transactionEventBus.setMaxListeners(1000);

function buildTransactionEvent({ playerId, playerName, type, detail }) {
  return {
    eventId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    playerId: String(playerId),
    playerName: String(playerName),
    type: String(type),
    detail: String(detail),
  };
}

function formatSseFrame(eventName, payload) {
  return `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
}

function publishTransactionEvent(payload) {
  transactionEventBus.emit(SSE_EVENTS.PLAYER_TRANSACTION_CREATED, payload);
}

module.exports = {
  SSE_EVENTS,
  transactionEventBus,
  buildTransactionEvent,
  formatSseFrame,
  publishTransactionEvent,
};
