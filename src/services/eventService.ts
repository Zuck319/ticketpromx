import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { EventItem, Order, OrderSeat } from '../types';
import { INITIAL_EVENTS } from '../data/mockEvents';

const EVENTS_COLLECTION = 'events';
const ORDERS_COLLECTION = 'orders';

// Persistent orders storage in browser
const STORAGE_ORDERS_KEY = 'ticketmaster_orders_cache_v2';

export const INITIAL_DEMO_ORDER: Order = {
  id: 'TM-2026-CP891',
  userId: 'demo-user',
  userEmail: 'angel.solis.hdz.mxn@gmail.com',
  userName: 'Angel Solís Hernández',
  eventId: 'evt-coldplay-2026',
  eventTitle: 'Coldplay - Music of the Spheres World Tour',
  eventDate: '2026-11-14 | 20:30 hrs',
  venue: 'Estadio GNP Seguros, Ciudad de México',
  seats: [
    {
      seatId: 'sec-vip-A-7',
      sectionId: 'sec-vip',
      sectionName: 'VIP Platino Front Stage',
      row: 'A',
      number: 7,
      price: 3450,
    },
    {
      seatId: 'sec-vip-A-8',
      sectionId: 'sec-vip',
      sectionName: 'VIP Platino Front Stage',
      row: 'A',
      number: 8,
      price: 3450,
    },
  ],
  subtotal: 6900,
  serviceFee: 966,
  totalAmount: 7866,
  status: 'completed',
  paymentMethodMasked: 'Visa •••• 4242',
  paymentRef: 'TXN-99827-AUTH',
  encryptedPayloadHash: '8f43a290c8832a76f2da713501a3de7b4946328a9efb8451f280148b37ad2159',
  qrCodeToken: 'QR_TM2026CP891_SEC_VIP_FRONT_CRYPT',
  createdAt: new Date().toISOString(),
};

function getStoredOrders(): Order[] {
  try {
    const raw = localStorage.getItem(STORAGE_ORDERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // fallback
  }
  return [INITIAL_DEMO_ORDER];
}

function persistOrders(orders: Order[]) {
  try {
    localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(orders));
  } catch {
    // fallback
  }
}

// In-memory cache fallback for immediate fluid UX
let localEventsCache: EventItem[] = [...INITIAL_EVENTS];
let localOrdersCache: Order[] = getStoredOrders();

// ─────────────────────────────────────────
// Cambios locales de eventos (cuando Firestore rechaza la escritura,
// p. ej. sin sesión de admin). Se guardan en localStorage y se
// aplican encima de los datos de Firestore al cargar.
// ─────────────────────────────────────────
const STORAGE_EVENT_OVERRIDES_KEY = 'ticketsmx_event_overrides_v1';

interface EventOverrides {
  upserts: Record<string, EventItem>;
  deleted: string[];
}

function getEventOverrides(): EventOverrides {
  try {
    const raw = localStorage.getItem(STORAGE_EVENT_OVERRIDES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as EventOverrides;
      return { upserts: parsed.upserts || {}, deleted: parsed.deleted || [] };
    }
  } catch {
    // fallback
  }
  return { upserts: {}, deleted: [] };
}

function saveEventOverrides(overrides: EventOverrides) {
  try {
    localStorage.setItem(STORAGE_EVENT_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch {
    // fallback
  }
}

function recordLocalUpsert(evt: EventItem) {
  const o = getEventOverrides();
  o.upserts[evt.id] = evt;
  o.deleted = o.deleted.filter(id => id !== evt.id);
  saveEventOverrides(o);
}

function recordLocalDelete(id: string) {
  const o = getEventOverrides();
  delete o.upserts[id];
  if (!o.deleted.includes(id)) o.deleted.push(id);
  saveEventOverrides(o);
}

function clearLocalOverride(id: string) {
  const o = getEventOverrides();
  delete o.upserts[id];
  o.deleted = o.deleted.filter(d => d !== id);
  saveEventOverrides(o);
}

function applyEventOverrides(items: EventItem[]): EventItem[] {
  const { upserts, deleted } = getEventOverrides();
  const existingIds = new Set(items.map(e => e.id));
  const merged = items
    .filter(e => !deleted.includes(e.id))
    .map(e => upserts[e.id] || e);
  // Eventos creados localmente que no existen en Firestore van primero
  const newOnes = Object.values(upserts).filter(e => !existingIds.has(e.id) && !deleted.includes(e.id));
  return [...newOnes, ...merged];
}

export async function fetchEvents(): Promise<EventItem[]> {
  try {
    const colRef = collection(db, EVENTS_COLLECTION);
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const items: EventItem[] = [];
      snap.forEach(d => {
        items.push({ id: d.id, ...d.data() } as EventItem);
      });
      localEventsCache = applyEventOverrides(items);
      return localEventsCache;
    } else {
      // Seed default events to Firestore for initial population
      await seedDefaultEvents();
      localEventsCache = applyEventOverrides(localEventsCache);
      return localEventsCache;
    }
  } catch (err) {
    console.warn('Could not fetch from Firestore, utilizing in-memory cache:', err);
    localEventsCache = applyEventOverrides(localEventsCache);
    return localEventsCache;
  }
}

export async function seedDefaultEvents(): Promise<void> {
  try {
    for (const evt of INITIAL_EVENTS) {
      const docRef = doc(db, EVENTS_COLLECTION, evt.id);
      await setDoc(docRef, {
        ...evt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn('Seed operation error (expected if permissions require admin or offline):', err);
  }
}

export async function getEventById(id: string): Promise<EventItem | null> {
  try {
    const docRef = doc(db, EVENTS_COLLECTION, id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as EventItem;
    }
  } catch (err) {
    console.warn(`Could not get event ${id} from Firestore:`, err);
  }
  return localEventsCache.find(e => e.id === id) || null;
}

export async function createEvent(eventData: Omit<EventItem, 'id'>): Promise<EventItem> {
  const newId = `evt-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const newEvent: EventItem = {
    ...eventData,
    id: newId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    const docRef = doc(db, EVENTS_COLLECTION, newId);
    await setDoc(docRef, newEvent);
  } catch (err) {
    console.warn('Firestore rechazó la creación del evento, se guarda localmente:', err);
    recordLocalUpsert(newEvent);
  }

  localEventsCache.unshift(newEvent);
  return newEvent;
}

export async function updateEvent(id: string, updates: Partial<EventItem>): Promise<EventItem> {
  const existing = localEventsCache.find(e => e.id === id);
  const updatedItem: EventItem = {
    ...(existing || {} as EventItem),
    ...updates,
    id,
    updatedAt: new Date().toISOString(),
  };

  try {
    const docRef = doc(db, EVENTS_COLLECTION, id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    clearLocalOverride(id);
  } catch (err) {
    console.warn('Firestore rechazó la actualización del evento, se guarda localmente:', err);
    recordLocalUpsert(updatedItem);
  }

  localEventsCache = localEventsCache.map(e => e.id === id ? updatedItem : e);
  return updatedItem;
}

export async function deleteEvent(id: string): Promise<void> {
  try {
    const docRef = doc(db, EVENTS_COLLECTION, id);
    await deleteDoc(docRef);
    clearLocalOverride(id);
  } catch (err) {
    console.warn('Firestore rechazó la eliminación del evento, se aplica localmente:', err);
    recordLocalDelete(id);
  }
  localEventsCache = localEventsCache.filter(e => e.id !== id);
}
export async function saveOrder(order: Order): Promise<Order> {
  try {
    const docRef = doc(db, ORDERS_COLLECTION, order.id);
    await setDoc(docRef, {
      id: order.id,
      userId: order.userId,
      userEmail: order.userEmail,
      userName: order.userName,
      eventId: order.eventId,
      eventTitle: order.eventTitle,
      eventDate: order.eventDate,
      venue: order.venue,
      totalAmount: order.totalAmount,
      subtotal: order.subtotal,
      serviceFee: order.serviceFee,
      status: order.status,
      paymentMethodMasked: order.paymentMethodMasked,
      paymentRef: order.paymentRef,
      encryptedPayloadHash: order.encryptedPayloadHash,
      qrCodeToken: order.qrCodeToken,
      seats: order.seats,
      createdAt: order.createdAt,
    });

    // Update event seat count and seats map
    const evt = localEventsCache.find(e => e.id === order.eventId);
    if (evt) {
      const updatedSeats = { ...(evt.seats || {}) };
      order.seats.forEach(s => {
        updatedSeats[s.seatId] = 'sold';
      });
      const newAvailable = Math.max(0, evt.availableSeats - order.seats.length);
      await updateEvent(evt.id, {
        availableSeats: newAvailable,
        seats: updatedSeats,
      });
    }
  } catch (err) {
    // If permission or offline, record locally
    console.warn('Order could not be saved to Firestore, saving to local cache:', err);
  }

  localOrdersCache = [order, ...localOrdersCache.filter(o => o.id !== order.id)];
  persistOrders(localOrdersCache);
  return order;
}

export async function fetchUserOrders(userId: string): Promise<Order[]> {
  try {
    const q = query(
      collection(db, ORDERS_COLLECTION),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      const orders: Order[] = [];
      snap.forEach(d => {
        const data = d.data() as Order;
        const local = localOrdersCache.find(o => o.id === d.id);
        orders.push({
          ...data,
          seats: data.seats && data.seats.length > 0 ? data.seats : (local?.seats || []),
          subtotal: data.subtotal || local?.subtotal || data.totalAmount,
          serviceFee: data.serviceFee || local?.serviceFee || 0,
          qrCodeToken: data.qrCodeToken || local?.qrCodeToken || `QR_${d.id}`,
        });
      });
      // Merge with any local orders for this user
      const merged = [...orders];
      localOrdersCache.forEach(lo => {
        if (!merged.some(m => m.id === lo.id)) {
          merged.push(lo);
        }
      });
      return merged;
    }
  } catch (err) {
    console.warn('Orders query error, falling back to local user orders:', err);
  }

  // If user has no specific orders yet or offline/guest, return local orders
  return localOrdersCache;
}

export async function fetchAllOrders(): Promise<Order[]> {
  try {
    const snap = await getDocs(collection(db, ORDERS_COLLECTION));
    if (!snap.empty) {
      const orders: Order[] = [];
      snap.forEach(d => {
        const data = d.data() as Order;
        const local = localOrdersCache.find(o => o.id === d.id);
        orders.push({
          ...data,
          seats: data.seats && data.seats.length > 0 ? data.seats : (local?.seats || []),
          subtotal: data.subtotal || local?.subtotal || data.totalAmount,
          serviceFee: data.serviceFee || local?.serviceFee || 0,
          qrCodeToken: data.qrCodeToken || local?.qrCodeToken || `QR_${d.id}`,
        });
      });
      return orders;
    }
  } catch (err) {
    console.warn('Admin orders query error, falling back to local orders:', err);
  }
  return localOrdersCache;
}

export async function updateOrderStatus(orderId: string, status: 'completed' | 'cancelled' | 'refunded'): Promise<void> {
  try {
    const docRef = doc(db, ORDERS_COLLECTION, orderId);
    await updateDoc(docRef, { status });
  } catch (err) {
    console.warn(`Firestore rechazó el cambio de estado de la orden ${orderId}, se guarda localmente:`, err);
  }
  localOrdersCache = localOrdersCache.map(o => o.id === orderId ? { ...o, status } : o);
  persistOrders(localOrdersCache);
}
