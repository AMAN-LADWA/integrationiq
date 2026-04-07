import { useEffect, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import type { AnalysisUpdate } from '../types';

type Handler = (update: AnalysisUpdate) => void;

export function useWebSocket(onUpdate: Handler) {
  const clientRef = useRef<Client | null>(null);
  const handlerRef = useRef<Handler>(onUpdate);

  // Keep handler ref current without re-subscribing
  useEffect(() => {
    handlerRef.current = onUpdate;
  }, [onUpdate]);

  const connect = useCallback(() => {
    if (clientRef.current?.connected) return;

    const client = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe('/topic/analysis', (message) => {
          try {
            const update: AnalysisUpdate = JSON.parse(message.body);
            handlerRef.current(update);
          } catch (e) {
            console.error('Failed to parse WebSocket message', e);
          }
        });
      },
      onStompError: (frame) => {
        console.error('STOMP error', frame);
      },
    });

    client.activate();
    clientRef.current = client;
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clientRef.current?.deactivate();
    };
  }, [connect]);

  return { connect };
}
