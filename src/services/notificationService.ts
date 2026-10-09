import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import { AppNotification } from '../types';

let localNotifications: AppNotification[] = [
  {
    id: 'notif-welcome',
    userId: 'guest',
    title: '¡Bienvenido a TicketsMX Pro!',
    message: 'Explora los mejores conciertos, eventos deportivos y obras de teatro con compra segura y selección de asientos 3D.',
    type: 'promo',
    read: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'notif-seats-coldplay',
    userId: 'guest',
    title: 'Nuevos asientos liberados: Coldplay',
    message: 'Se han abierto nuevas localidades en Zona Preferente para el show del 14 de Noviembre.',
    type: 'seat_reminder',
    read: false,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
];

export async function fetchUserNotifications(userId: string): Promise<AppNotification[]> {
  try {
    const path = `users/${userId}/notifications`;
    const colRef = collection(db, path);
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const list: AppNotification[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as AppNotification);
      });
      return list;
    }
  } catch (err) {
    console.warn('Notifications fetch error, fallback to local notifications:', err);
  }
  return localNotifications.filter(n => n.userId === userId || n.userId === 'guest');
}

export async function sendNotification(
  userId: string,
  notification: Omit<AppNotification, 'id' | 'createdAt' | 'read' | 'userId'>
): Promise<AppNotification> {
  const newId = `notif-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
  const item: AppNotification = {
    ...notification,
    id: newId,
    userId,
    read: false,
    createdAt: new Date().toISOString(),
  };

  try {
    const path = `users/${userId}/notifications`;
    const docRef = doc(db, path, newId);
    await setDoc(docRef, item);
  } catch (err) {
    console.warn('Could not persist notification in Firestore, saved locally:', err);
  }

  localNotifications.unshift(item);
  return item;
}

export async function markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
  try {
    const path = `users/${userId}/notifications`;
    const docRef = doc(db, path, notificationId);
    await updateDoc(docRef, { read: true });
  } catch (err) {
    console.warn('Could not update notification in Firestore, updating locally:', err);
  }
  localNotifications = localNotifications.map(n =>
    n.id === notificationId ? { ...n, read: true } : n
  );
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  localNotifications = localNotifications.map(n =>
    n.userId === userId || n.userId === 'guest' ? { ...n, read: true } : n
  );
}
