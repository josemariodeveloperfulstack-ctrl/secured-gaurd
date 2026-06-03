/**
 * URL do broker STOMP via WebSocket nativo (sem SockJS).
 * Evita o aviso "Permissions policy violation: unload" do sockjs-client.
 */
export function resolveStompBrokerUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws`;
}
