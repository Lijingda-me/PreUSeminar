import { EventEmitter } from 'events';

export const callEvents = new EventEmitter();
callEvents.setMaxListeners(200);

export function emitCallEvent(call, event, payload = {}) {
  for (const userId of call.participantIds || []) {
    callEvents.emit(`call:${userId}`, {
      event,
      callId: call.id,
      call,
      ...payload
    });
  }
}
