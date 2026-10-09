/**
 * Mercado Pago Integration Service
 *
 * Maneja la creación de preferencias de pago y la verificación de pagos.
 * El Access Token vive SOLO en el backend (server.ts).
 *
 * Documentación oficial: https://www.mercadopago.com.mx/developers/es/docs/checkout-pro/integrate-checkout-pro
 */

import { OrderSeat } from '../types';

// Public Key de Mercado Pago — seguro exponerla en el frontend.
export const MP_PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY as string;

// Link de cobro directo (fallback si el backend falla)
export const MP_CHECKOUT_LINK = import.meta.env.VITE_MP_CHECKOUT_LINK || 'https://mpago.la/1irRumY';

// Clave de localStorage para guardar la orden pendiente mientras el usuario va a pagar
export const PENDING_ORDER_KEY = 'ticketsmx_pending_mp_order';

export interface MpPreferenceItem {
  title: string;
  quantity: number;
  unit_price: number;
  currency_id?: string;
  description?: string;
}

export interface MpPreferenceResult {
  preferenceId: string | null;
  checkoutUrl: string;
  sandboxUrl: string;
}

export interface MpPaymentVerification {
  id: number;
  status: 'approved' | 'rejected' | 'pending' | 'cancelled' | 'in_process' | string;
  status_detail: string;
  external_reference: string;
  transaction_amount: number;
  currency_id: string;
  payment_method_id: string;
  date_approved: string | null;
}

export interface PendingMpOrder {
  orderId: string;
  externalRef: string;
  event: { id: string; title: string; date: string; time: string; venue: string; city: string };
  seats: OrderSeat[];
  subtotal: number;
  serviceFee: number;
  totalAmount: number;
  userId: string;
  userEmail: string;
  userName: string;
  createdAt: string;
}

/**
 * Construye los ítems de la preferencia MP a partir de los asientos seleccionados.
 */
export function buildPreferenceItems(
  eventTitle: string,
  seats: OrderSeat[],
  serviceFee: number
): MpPreferenceItem[] {
  const grouped: Record<string, { sectionName: string; count: number; price: number }> = {};

  seats.forEach(seat => {
    const key = seat.sectionId || seat.sectionName;
    if (!grouped[key]) {
      grouped[key] = { sectionName: seat.sectionName, count: 0, price: seat.price };
    }
    grouped[key].count++;
  });

  const items: MpPreferenceItem[] = Object.values(grouped).map(g => ({
    title: `${eventTitle} — ${g.sectionName}`,
    quantity: g.count,
    unit_price: g.price,
    currency_id: 'MXN',
    description: `Boleto(s) sección ${g.sectionName}`,
  }));

  if (serviceFee > 0) {
    items.push({
      title: 'Cargo por servicio TicketsMX',
      quantity: 1,
      unit_price: serviceFee,
      currency_id: 'MXN',
    });
  }

  return items;
}

/**
 * Crea una preferencia de pago en el backend.
 * El backend genera la URL de checkout con back_urls que apuntan a la app.
 * Si el backend no está disponible, usa el link de cobro directo como fallback.
 */
const API_BASE = import.meta.env.VITE_API_URL || '';

export async function createPaymentPreference(
  items: MpPreferenceItem[],
  externalReference: string,
  payerEmail?: string
): Promise<MpPreferenceResult> {
  try {
    const response = await fetch(`${API_BASE}/api/mp/preference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items,
        external_reference: externalReference,
        payer: payerEmail ? { email: payerEmail } : undefined,
      }),
    });

    if (!response.ok) throw new Error(`Backend respondió ${response.status}`);

    const data = await response.json() as { id?: string; init_point?: string; sandbox_init_point?: string };

    return {
      preferenceId: data.id || null,
      checkoutUrl: data.init_point || MP_CHECKOUT_LINK,
      sandboxUrl: data.sandbox_init_point || MP_CHECKOUT_LINK,
    };
  } catch (err) {
    console.warn('[MP] Backend no disponible, usando link directo:', err);
    return {
      preferenceId: null,
      checkoutUrl: MP_CHECKOUT_LINK,
      sandboxUrl: MP_CHECKOUT_LINK,
    };
  }
}

/**
 * Verifica el estado real de un pago con la API de Mercado Pago (vía backend).
 * Solo devuelve los datos si el pago está aprobado.
 * Lanza un error si el pago no existe, está rechazado o el backend falla.
 */
export async function verifyMpPayment(paymentId: string): Promise<MpPaymentVerification> {
  const response = await fetch(`${API_BASE}/api/mp/verify/${paymentId}`);

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error || `Error verificando pago ${paymentId}`);
  }

  const data = await response.json() as MpPaymentVerification;
  return data;
}

/**
 * Guarda la orden pendiente en localStorage antes de redirigir al usuario a MP.
 * Se recupera después de que MP redirige de vuelta a la app.
 */
export function savePendingOrder(order: PendingMpOrder): void {
  localStorage.setItem(PENDING_ORDER_KEY, JSON.stringify(order));
}

/**
 * Recupera y elimina la orden pendiente del localStorage.
 */
export function consumePendingOrder(): PendingMpOrder | null {
  const raw = localStorage.getItem(PENDING_ORDER_KEY);
  if (!raw) return null;
  localStorage.removeItem(PENDING_ORDER_KEY);
  try {
    return JSON.parse(raw) as PendingMpOrder;
  } catch {
    return null;
  }
}

/**
 * Determina si Mercado Pago está en modo sandbox (pruebas).
 */
export function isMpSandbox(): boolean {
  return !MP_PUBLIC_KEY || MP_PUBLIC_KEY.startsWith('TEST-');
}

/**
 * Genera la referencia externa para la preferencia MP.
 */
export function generateMpExternalReference(orderId: string): string {
  return `TICKETSMX-${orderId}-${Date.now().toString(36).toUpperCase()}`;
}

