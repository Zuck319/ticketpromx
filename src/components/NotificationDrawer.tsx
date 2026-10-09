import React, { useState } from 'react';
import {
  X,
  Bell,
  Clock,
  Sparkles,
  Ticket,
  Mail,
  Smartphone,
  Check,
} from 'lucide-react';
import { AppNotification } from '../types';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
}) => {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(true);

  if (!isOpen) return null;

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'order_confirmation':
        return <Ticket className="w-4 h-4 text-emerald-600" />;
      case 'seat_reminder':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'event_update':
        return <Bell className="w-4 h-4 text-blue-600" />;
      case 'promo':
        return <Sparkles className="w-4 h-4 text-purple-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl text-slate-900">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Centro de Notificaciones</h3>
              <p className="text-[11px] text-slate-500">Alertas automáticas en tiempo real</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Channels preferences toggle */}
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 text-xs space-y-2">
          <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
            Canales de Entrega Automática
          </span>
          <div className="flex items-center justify-between text-slate-600">
            <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-blue-600" /> Confirmación por Email</span>
            <input
              type="checkbox"
              checked={emailAlerts}
              onChange={e => setEmailAlerts(e.target.checked)}
              className="accent-slate-900 cursor-pointer"
            />
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span className="flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5 text-emerald-600" /> Alertas SMS (Recordatorio 24h)</span>
            <input
              type="checkbox"
              checked={smsAlerts}
              onChange={e => setSmsAlerts(e.target.checked)}
              className="accent-slate-900 cursor-pointer"
            />
          </div>
        </div>

        {/* Actions bar */}
        <div className="px-5 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>{notifications.filter(n => !n.read).length} no leídas</span>
          <button
            onClick={onMarkAllAsRead}
            className="text-slate-900 hover:text-blue-600 font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Marcar todas como leídas</span>
          </button>
        </div>

        {/* Notifications list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
          {notifications.length === 0 ? (
            <div className="py-20 text-center text-slate-400 space-y-2">
              <Bell className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs">No tienes notificaciones pendientes.</p>
            </div>
          ) : (
            notifications.map(notif => (
              <div
                key={notif.id}
                onClick={() => onMarkAsRead(notif.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  notif.read
                    ? 'bg-slate-50 border-slate-200 text-slate-500'
                    : 'bg-white border-slate-300 text-slate-900 shadow-xs ring-1 ring-slate-900/5'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-slate-100 border border-slate-200 shrink-0">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{notif.title}</h4>
                      {!notif.read && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {notif.message}
                    </p>
                    <span className="text-[10px] text-slate-400 mt-2 block font-medium">
                      {new Date(notif.createdAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
