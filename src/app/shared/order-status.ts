export interface OrderCancellationMetadata {
  status?: string | null;
  cancelledByRole?: string | null;
  cancelledByLivreur?: boolean | null;
}

export type OrderStatusLabelVariant = 'admin' | 'notification' | 'pharmacist';
export type OrderStatusBadgeVariant = 'admin' | 'pharmacist';

const ORDER_STATUS_BADGES: Record<OrderStatusBadgeVariant, Record<string, string>> = {
  admin: {
    PENDING: 'badge-warning',
    AWAITING_CLIENT_ACCEPTANCE: 'badge-warning',
    AWAITING_PAYMENT: 'badge-warning',
    ASSIGNED: 'badge-primary',
    ASSIGNED_FROM_ADMIN: 'badge-primary',
    ACCEPTED: 'badge-info',
    ACCEPTED_FROM_PHARMACIEN: 'badge-primary',
    ACCEPTED_FROM_LIVREUR: 'badge-primary',
    READY_FOR_DELIVERY: 'badge-primary',
    DELIVERING: 'badge-info',
    DELIVERED: 'badge-success',
    REFUSED: 'badge-danger',
    REFUSED_FROM_PHARMACIEN: 'badge-danger',
    REFUSED_FROM_LIVREUR: 'badge-danger',
    CANCELLED: 'badge-danger',
    ACCEPTANCE_EXPIRED: 'badge-danger',
    DISPATCH_FAILED: 'badge-dispatch-failed'
  },
  pharmacist: {
    PENDING: 'badge-warning',
    AWAITING_CLIENT_ACCEPTANCE: 'badge-warning',
    AWAITING_PAYMENT: 'badge-warning',
    ASSIGNED: 'badge-primary',
    ASSIGNED_FROM_ADMIN: 'badge-primary',
    ACCEPTED: 'badge-info',
    ACCEPTED_FROM_PHARMACIEN: 'badge-info',
    ACCEPTED_FROM_LIVREUR: 'badge-primary',
    READY_FOR_DELIVERY: 'badge-accent',
    DELIVERING: 'badge-info',
    DELIVERED: 'badge-success',
    REFUSED: 'badge-danger',
    REFUSED_FROM_PHARMACIEN: 'badge-danger',
    REFUSED_FROM_LIVREUR: 'badge-danger',
    CANCELLED: 'badge-danger',
    ACCEPTANCE_EXPIRED: 'badge-danger',
    DISPATCH_FAILED: 'badge-dispatch-failed'
  }
};

const ORDER_STATUS_LABELS: Record<OrderStatusLabelVariant, Record<string, string>> = {
  admin: {
    PENDING: 'En attente',
    AWAITING_CLIENT_ACCEPTANCE: 'En attente client',
    AWAITING_PAYMENT: 'En attente paiement',
    ASSIGNED: 'Assignee',
    ASSIGNED_FROM_ADMIN: 'Assignee (admin)',
    ACCEPTED: 'Acceptee',
    ACCEPTED_FROM_PHARMACIEN: 'Acceptee',
    ACCEPTED_FROM_LIVREUR: 'Livreur en route',
    READY_FOR_DELIVERY: 'Prete',
    DELIVERING: 'En livraison',
    DELIVERED: 'Livree',
    REFUSED: 'Refusee',
    REFUSED_FROM_PHARMACIEN: 'Refusee',
    REFUSED_FROM_LIVREUR: 'Refusee livreur',
    CANCELLED: 'Annulee',
    ACCEPTANCE_EXPIRED: 'Validation expiree',
    DISPATCH_FAILED: 'Dispatch echoue'
  },
  pharmacist: {
    PENDING: 'En attente',
    AWAITING_CLIENT_ACCEPTANCE: 'En attente client',
    AWAITING_PAYMENT: 'En attente paiement',
    ASSIGNED: 'Assigne',
    ASSIGNED_FROM_ADMIN: 'Assigne (admin)',
    ACCEPTED: 'Acceptee',
    ACCEPTED_FROM_PHARMACIEN: 'Acceptee',
    ACCEPTED_FROM_LIVREUR: 'Pris en charge',
    READY_FOR_DELIVERY: 'Prete',
    DELIVERING: 'En livraison',
    DELIVERED: 'Livree',
    REFUSED: 'Refusee',
    REFUSED_FROM_PHARMACIEN: 'Refusee',
    REFUSED_FROM_LIVREUR: 'Refusee (livreur)',
    CANCELLED: 'Annulee',
    ACCEPTANCE_EXPIRED: 'Validation expiree',
    DISPATCH_FAILED: 'Echec dispatch'
  },
  notification: {
    PENDING: 'Nouvelle commande',
    AWAITING_CLIENT_ACCEPTANCE: 'Attente client',
    AWAITING_PAYMENT: 'Attente paiement',
    ACCEPTED_FROM_PHARMACIEN: 'Acceptee',
    ACCEPTANCE_EXPIRED: 'Validation expiree',
    READY_FOR_DELIVERY: 'Prete',
    ASSIGNED: 'Livreur assigne',
    ASSIGNED_FROM_ADMIN: 'Assignee (admin)',
    ACCEPTED_FROM_LIVREUR: 'Livreur en route',
    DELIVERING: 'En livraison',
    DELIVERED: 'Livree',
    DISPATCH_FAILED: 'Aucun livreur',
    REFUSED_FROM_PHARMACIEN: 'Refusee',
    CANCELLED: 'Annulee'
  }
};

const CANCELLATION_ROLE_LABELS: Record<string, string> = {
  LIVREUR: 'Livreur',
  CLIENT: 'Client',
  PHARMACIEN: 'Pharmacien',
  ADMIN: 'Admin',
  SYSTEM: 'Systeme',
  UNKNOWN: 'Inconnu'
};

export function getOrderStatusBadge(status?: string | null, variant: OrderStatusBadgeVariant = 'admin'): string {
  const normalizedStatus = status ?? '';
  return ORDER_STATUS_BADGES[variant][normalizedStatus] ?? ORDER_STATUS_BADGES.admin[normalizedStatus] ?? 'badge-gray';
}

export function getOrderStatusLabel(status?: string | null, variant: OrderStatusLabelVariant = 'admin'): string {
  const normalizedStatus = status ?? '';
  return ORDER_STATUS_LABELS[variant][normalizedStatus] ?? ORDER_STATUS_LABELS.admin[normalizedStatus] ?? normalizedStatus;
}

export function getCancellationRoleLabel(role?: string | null): string {
  return CANCELLATION_ROLE_LABELS[role ?? 'UNKNOWN'] ?? role ?? 'Inconnu';
}

export function formatCancelledOrderLabel(role?: string | null): string {
  return `Annulee par ${getCancellationRoleLabel(role).toLowerCase()}`;
}

export function isLivreurCancelledOrder(order: OrderCancellationMetadata): boolean {
  return !!(order.cancelledByLivreur || (order.status === 'CANCELLED' && order.cancelledByRole === 'LIVREUR'));
}