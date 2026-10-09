import React, { useState, useEffect } from 'react';
import {
  Star,
  Ticket,
  Calendar,
  MapPin,
  Clock,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { EventItem } from '../types';

interface FeaturedEventsSectionProps {
  events: EventItem[];
  onSelectEvent: (event: EventItem) => void;
}

export const FeaturedEventsSection: React.FC<FeaturedEventsSectionProps> = ({
  events,
  onSelectEvent,
}) => {
  const featuredEvents = events.filter(e => e.isFeatured);
  const displayEvents = featuredEvents.length > 0 ? featuredEvents : events.slice(0, 3);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (displayEvents.length <= 1 || isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % displayEvents.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [displayEvents.length, isPaused]);

  if (displayEvents.length === 0) return null;

  const currentEvent = displayEvents[currentIndex] || displayEvents[0];

  const handlePrev = () => {
    setCurrentIndex(prev => (prev === 0 ? displayEvents.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % displayEvents.length);
  };

  const dateObj = new Date(`${currentEvent.date}T00:00:00`);
  const formattedDate = dateObj.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center shadow-sm">
            <Star className="w-4 h-4 fill-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Eventos Destacados
              </h2>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                Selección Curada
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Los conciertos, obras y torneos estelares seleccionados por la administración
            </p>
          </div>
        </div>

        {/* Carousel arrows */}
        {displayEvents.length > 1 && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrev}
              aria-label="Anterior evento destacado"
              className="p-2 rounded-xl bg-white border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-all shadow-xs"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNext}
              aria-label="Siguiente evento destacado"
              className="p-2 rounded-xl bg-white border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-slate-700 hover:text-slate-900 transition-all shadow-xs"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Main Spotlight Banner */}
      <div
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="relative rounded-3xl overflow-hidden border border-slate-200/90 bg-slate-900 shadow-xl transition-all duration-500 group"
      >
        {/* Background Image with Measured Contrast Scrim */}
        <div className="relative aspect-[16/9] sm:aspect-[21/9] w-full overflow-hidden">
          <img
            src={currentEvent.imageUrl}
            alt={currentEvent.title}
            className="w-full h-full object-cover object-center group-hover:scale-103 transition-transform duration-700 brightness-85"
          />
          {/* Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/50 to-transparent sm:w-3/4" />
        </div>

        {/* Content Overlay */}
        <div className="absolute inset-0 p-5 sm:p-8 lg:p-10 flex flex-col justify-between text-white">
          {/* Top Badges */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-400 text-slate-950 shadow-sm">
                <Star className="w-3.5 h-3.5 fill-current" />
                Destacado Oficial
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-md border border-white/20">
                {currentEvent.category}
              </span>
            </div>

            <div className="bg-slate-950/70 backdrop-blur-md border border-white/15 px-3 py-1 rounded-xl text-xs text-emerald-300 font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Garantía Oficial</span>
            </div>
          </div>

          {/* Center Details */}
          <div className="max-w-2xl space-y-2 sm:space-y-3">
            <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-blue-300">
              {currentEvent.artist}
            </p>
            <h3 className="text-xl sm:text-3xl lg:text-4xl font-black text-white leading-tight drop-shadow-sm">
              {currentEvent.title}
            </h3>
            <p className="text-xs sm:text-sm text-slate-200 line-clamp-2 leading-relaxed max-w-xl">
              {currentEvent.description}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-300">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-blue-300" />
                <span className="font-semibold text-white">{currentEvent.venue}</span>
                <span className="text-slate-300">({currentEvent.city})</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-300" />
                <span className="capitalize">{formattedDate}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-300" />
                <span>{currentEvent.time} hrs</span>
              </div>
            </div>
          </div>

          {/* Bottom Bar: Pricing & Direct Seat Selector CTA */}
          <div className="pt-3 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-slate-300">Boletos desde:</span>
              <span className="text-xl sm:text-2xl font-black text-white text-emerald-300">
                ${currentEvent.basePrice.toLocaleString('es-MX')}{' '}
                <span className="text-xs font-semibold text-slate-300">MXN</span>
              </span>
              <span className="text-[11px] text-slate-300 ml-2">
                &bull; Disponibles: <strong className="text-white">{currentEvent.availableSeats}</strong> butacas
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => onSelectEvent(currentEvent)}
                className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] transition-all cursor-pointer"
              >
                <Ticket className="w-4 h-4 text-slate-900" />
                <span>Seleccionar Asientos</span>
                <ArrowRight className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Thumbnails Selector in modern light card style */}
      {displayEvents.length > 1 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
          {displayEvents.map((evt, idx) => {
            const isSelected = idx === currentIndex;
            return (
              <div
                key={evt.id}
                onClick={() => setCurrentIndex(idx)}
                className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 group bg-white ${
                  isSelected
                    ? 'border-slate-900 ring-2 ring-slate-900/15 shadow-md'
                    : 'border-slate-200/90 hover:border-slate-400 hover:shadow-sm'
                }`}
              >
                <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-slate-100 relative">
                  <img
                    src={evt.imageUrl}
                    alt={evt.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                  {isSelected && (
                    <div className="absolute inset-0 bg-slate-900/10 border-2 border-slate-900 rounded-xl pointer-events-none" />
                  )}
                </div>
                <div className="min-w-0 flex-1 text-xs">
                  <div className="flex items-center gap-1 text-[10px] text-amber-600 font-bold uppercase">
                    <Star className="w-2.5 h-2.5 fill-current" />
                    <span>Destacado</span>
                  </div>
                  <h4 className="font-bold text-slate-900 truncate text-xs group-hover:text-blue-600 transition-colors">
                    {evt.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 truncate">
                    {evt.venue}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
