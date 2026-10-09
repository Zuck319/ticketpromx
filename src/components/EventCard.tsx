import React from 'react';
import { MapPin, Clock, Ticket, AlertCircle, Star } from 'lucide-react';
import { EventItem } from '../types';

interface EventCardProps {
  event: EventItem;
  onSelect: (event: EventItem) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onSelect }) => {
  const dateObj = new Date(`${event.date}T00:00:00`);
  const day = dateObj.getDate() || 1;
  const month = dateObj.toLocaleDateString('es-MX', { month: 'short' }).toUpperCase();
  const weekday = dateObj.toLocaleDateString('es-MX', { weekday: 'short' });

  const isLowStock = event.availableSeats > 0 && event.availableSeats < 60;
  const isSoldOut = event.availableSeats <= 0;

  return (
    <div className="group relative bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs hover:shadow-xl hover:border-slate-400 hover:-translate-y-1 transition-all duration-300 flex flex-col">
      {/* Event Image Banner with Date Overlay */}
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        <img
          src={event.imageUrl}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-95"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent" />

        {/* Date badge */}
        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl px-2.5 py-1.5 text-center shadow-md">
          <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">{month}</span>
          <span className="block text-lg font-black text-slate-900 leading-none">{day}</span>
          <span className="block text-[9px] text-slate-400 capitalize">{weekday}</span>
        </div>

        {/* Category tag */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {event.isFeatured && (
            <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
              <Star className="w-3 h-3 fill-current" />
              Destacado
            </span>
          )}
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-900/80 text-white backdrop-blur-md">
            {event.category}
          </span>
        </div>

        {/* Availability & Starting Price Tag */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs">
          {isSoldOut ? (
            <span className="bg-rose-600 text-white font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm">
              <AlertCircle className="w-3.5 h-3.5" /> Agotado
            </span>
          ) : isLowStock ? (
            <span className="bg-amber-500 text-slate-950 font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-sm">
              Últimos {event.availableSeats} boletos
            </span>
          ) : (
            <span className="bg-white/90 text-emerald-700 font-semibold px-2.5 py-1 rounded-lg border border-emerald-200/80 backdrop-blur-sm flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {event.availableSeats} disponibles
            </span>
          )}

          <div className="text-right bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm">
            <span className="text-[10px] text-slate-500 block leading-tight">Desde</span>
            <span className="font-extrabold text-sm text-slate-900">
              ${event.basePrice.toLocaleString('es-MX')} <span className="text-[10px] font-normal text-slate-500">MXN</span>
            </span>
          </div>
        </div>
      </div>

      {/* Event Details Content */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-blue-600 mb-0.5 tracking-wide uppercase">
            {event.artist}
          </p>
          <h3 className="font-bold text-base text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
            {event.title}
          </h3>
          <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
            {event.description}
          </p>
        </div>

        <div className="pt-2 border-t border-slate-100 space-y-1 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{event.venue}, {event.city}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Inicio: {event.time} hrs</span>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={() => onSelect(event)}
          disabled={isSoldOut}
          className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            isSoldOut
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm group-hover:shadow-md'
          }`}
        >
          <Ticket className="w-4 h-4" />
          <span>{isSoldOut ? 'Sin Disponibilidad' : 'Seleccionar Asientos'}</span>
        </button>
      </div>
    </div>
  );
};
