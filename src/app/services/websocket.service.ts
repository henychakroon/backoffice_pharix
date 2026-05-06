import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { Client, IMessage } from '@stomp/stompjs';
import * as SockJS from 'sockjs-client';

const WS_PATH = '/ws';

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
  dispatchFailed?: boolean;
}

/** Same shape as AdminOrderDTO — reused for pharmacien topic */
export type PharmacienOrderEvent = AdminOrderEvent;

export interface ChatMessageEvent {
  id: number;
  conversationId: number;
  orderId: number;
  revisionNumber?: number | null;
  senderId: number;
  senderRole: string;
  messageType: string;
  content: string;
  timestamp: string;
  seen: boolean;
}

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {

  private client: Client | null = null;
  private _orderEvents = new Subject<AdminOrderEvent>();
  private _pharmacienOrderEvents = new Subject<PharmacienOrderEvent>();
  private _chatMessages = new Subject<ChatMessageEvent>();

  /** Stream of live order events for admin dashboard */
  orderEvents$ = this._orderEvents.asObservable();

  /** Stream of live order events for pharmacien interface */
  pharmacienOrderEvents$ = this._pharmacienOrderEvents.asObservable();

  /** Stream of live chat messages for the current authenticated user */
  chatMessages$ = this._chatMessages.asObservable();

  /** Connect for admin — subscribes to /topic/admin/orders */
  connect(token: string): void {
    if (this.client?.active) return;

    this.client = new Client({
      webSocketFactory: () => new SockJS(WS_PATH),
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

  /** Connect for pharmacien — subscribes to /topic/pharmacien/{pharmacienId}/orders */
  connectPharmacien(token: string, pharmacienId: number): void {
    if (this.client?.active) {
      // Already connected (e.g. same session) — just add subscription
      this.client.subscribe(
        `/topic/pharmacien/${pharmacienId}/orders`,
        (msg: IMessage) => {
          try {
            const event: PharmacienOrderEvent = JSON.parse(msg.body);
            this._pharmacienOrderEvents.next(event);
          } catch {
            console.warn('[WS] Failed to parse pharmacien order event', msg.body);
          }
        }
      );
      this.subscribePharmacienChat(pharmacienId);
      return;
    }

    this.client = new Client({
      webSocketFactory: () => new SockJS(WS_PATH),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        console.log(`[WS] Connected to /topic/pharmacien/${pharmacienId}/orders`);
        this.client!.subscribe(
          `/topic/pharmacien/${pharmacienId}/orders`,
          (msg: IMessage) => {
            try {
              const event: PharmacienOrderEvent = JSON.parse(msg.body);
              this._pharmacienOrderEvents.next(event);
            } catch {
              console.warn('[WS] Failed to parse pharmacien order event', msg.body);
            }
          }
        );
        this.subscribePharmacienChat(pharmacienId);
      },
      onStompError: (frame) => {
        console.error('[WS] STOMP error (pharmacien)', frame);
      },
      onDisconnect: () => {
        console.log('[WS] Disconnected (pharmacien)');
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

  private subscribePharmacienChat(pharmacienId: number): void {
    this.client!.subscribe(`/queue/chat/pharmacien/${pharmacienId}`, (msg: IMessage) => {
      try {
        const event: ChatMessageEvent = JSON.parse(msg.body);
        this._chatMessages.next(event);
      } catch {
        console.warn('[WS] Failed to parse chat message', msg.body);
      }
    });
  }
}
