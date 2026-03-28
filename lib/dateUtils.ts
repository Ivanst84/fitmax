import dayjs from 'dayjs';
import 'dayjs/locale/es';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
dayjs.locale('es');

/**
 * Formatea fecha: "28 Marzo, 2026"
 */
export const formatDate = (date: string | Date): string => {
  return dayjs(date).format('D MMMM, YYYY');
};

/**
 * Tiempo relativo: "hace 2 horas"
 */
export const getRelativeTime = (date: string | Date): string => {
  return dayjs(date).fromNow();
};

/**
 * Convierte segundos a formato: "45 min" o "1h 20m"
 */
export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return remainingMins > 0 ? `${hrs}h ${remainingMins}m` : `${hrs}h`;
};