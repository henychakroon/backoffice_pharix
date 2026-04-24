import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { Client, IMessage } from '@stomp/stompjs';
import * as SockJS from 'sockjs-client';

export interface AdminOrderEvent {
  orderId: number;
  status: string;
  clientId: number;
  clientName: string;
  vendorId: number;
  pharmacyName: string;
  total?: number;
  createdAt: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {

  private client: Client | null = null;
  private _orderEvents = new Subject<AdminOrderEvent>();

  /** Stream of live order events pushed from the backend */
  orderEvents$ = this._orderEvents.asObservable();

  connect(token: string): void {
    if (this.client?.active) return;

    this.client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8082/ws'),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        console.log('[WS] Connected to /topic/admin/orders');
        this.client!.subscribe('/topic/admin/orders', (msg: IMessage) => {
          try {
            const event: AdminOrderEvent = JSON.parse(msg.body);
            this._orderEvents.next(event);
          } catch {
            console.warn('[WS] Failed to parse order event', msg.body);
          }
        });
      },
      onStompError: (frame) => {
        console.error('[WS] STOMP error', frame);
      },
      onDisconnect: () => {
        console.log('[WS] Disconnected');
      }
    });

    this.client.activate();
  }

  disconnect(): void {
    if (this.client?.active) {
      this.client.deactivate();
    }
    this.client = null;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
