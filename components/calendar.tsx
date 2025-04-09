'use client';

import type React from 'react';

import { useRef, useState, useEffect } from 'react';
import {
  format,
  addDays,
  startOfWeek,
  addHours,
  parseISO,
  differenceInMinutes,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Appointment } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CalendarProps {
  appointments: Appointment[];
  onEdit: (appointment: Appointment) => void;
  onDelete: (id: string) => void;
  onUpdate: (appointment: Appointment) => void;
}

export function Calendar({
  appointments,
  onEdit,
  onDelete,
  onUpdate,
}: CalendarProps) {
  const [startDate, setStartDate] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [resizeDirection, setResizeDirection] = useState<
    'start' | 'end' | 'left' | 'right' | null
  >(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

  const days = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));

  const hours = Array.from({ length: 13 }, (_, i) =>
    addHours(new Date().setHours(8, 0, 0, 0), i)
  );

  const getAppointmentStyle = (appointment: Appointment) => {
    const startTime = parseISO(appointment.startTime);
    const endTime = parseISO(appointment.endTime);

    const startDayIndex = days.findIndex(
      (day) =>
        day.getDate() === startTime.getDate() &&
        day.getMonth() === startTime.getMonth()
    );

    const endDayIndex = days.findIndex(
      (day) =>
        day.getDate() === endTime.getDate() &&
        day.getMonth() === endTime.getMonth()
    );

    if (startDayIndex === -1) return { display: 'none' };

    const effectiveEndDayIndex = endDayIndex === -1 ? 6 : endDayIndex;

    const startHour = startTime.getHours() + startTime.getMinutes() / 60;
    const endHour = endTime.getHours() + endTime.getMinutes() / 60;

    const top = (startHour - 8) * 60;
    const height = (endHour - startHour) * 60;

    const width = ((effectiveEndDayIndex - startDayIndex + 1) / 7) * 100;

    return {
      left: `${(startDayIndex / 7) * 100}%`,
      width: `${width}%`,
      top: `${top}px`,
      height: `${height}px`,
    };
  };

  const handleMouseDown = (e: React.MouseEvent, appointment: Appointment) => {
    e.stopPropagation();
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const appointmentStyle = getAppointmentStyle(appointment);
      const appointmentTop = Number.parseInt(appointmentStyle.top as string);
      const appointmentLeft =
        (Number.parseInt((appointmentStyle.left as string).replace('%', '')) *
          rect.width) /
        100;
      const appointmentWidth =
        (Number.parseInt((appointmentStyle.width as string).replace('%', '')) *
          rect.width) /
        100;
      const appointmentHeight = Number.parseInt(
        appointmentStyle.height as string
      );

      const isNearTop = Math.abs(y - appointmentTop) < 10;
      const isNearBottom =
        Math.abs(y - (appointmentTop + appointmentHeight)) < 10;
      const isNearLeft = Math.abs(x - appointmentLeft) < 10;
      const isNearRight =
        Math.abs(x - (appointmentLeft + appointmentWidth)) < 10;

      const offsetY = y - appointmentTop;
      const offsetX = x - appointmentLeft;

      if (isNearLeft) {
        setResizingId(appointment.id);
        setResizeDirection('left');
      } else if (isNearRight) {
        setResizingId(appointment.id);
        setResizeDirection('right');
      } else if (isNearTop) {
        setResizingId(appointment.id);
        setResizeDirection('start');
      } else if (isNearBottom) {
        setResizingId(appointment.id);
        setResizeDirection('end');
      } else {
        setDraggingId(appointment.id);
      }

      setMouseOffset({ x: offsetX, y: offsetY });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!containerRef.current || (!draggingId && !resizingId)) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dayWidth = rect.width / 7;
    const minuteHeight = 1;

    if (draggingId) {
      const appointment = appointments.find((app) => app.id === draggingId);
      if (!appointment) return;

      const newY = y - mouseOffset.y;
      const newX = x - mouseOffset.x;

      const dayIndex = Math.floor(newX / dayWidth);
      const clampedDayIndex = Math.max(0, Math.min(6, dayIndex));

      const minutes = Math.max(0, Math.round(newY));
      const hours = Math.floor(minutes / 60) + 8;
      const mins = minutes % 60;

      const startTime = parseISO(appointment.startTime);
      const endTime = parseISO(appointment.endTime);
      const daysDiff = Math.floor(
        (endTime.getTime() - startTime.getTime()) / (24 * 60 * 60 * 1000)
      );
      const timeDiff = differenceInMinutes(endTime, startTime) % (24 * 60);

      const newStartDay = addDays(startDate, clampedDayIndex);
      const newStartTime = new Date(
        newStartDay.getFullYear(),
        newStartDay.getMonth(),
        newStartDay.getDate(),
        hours,
        mins
      );

      const newEndTime = new Date(newStartTime.getTime());
      newEndTime.setDate(newEndTime.getDate() + daysDiff);
      newEndTime.setMinutes(newEndTime.getMinutes() + timeDiff);

      onUpdate({
        ...appointment,
        startTime: newStartTime.toISOString(),
        endTime: newEndTime.toISOString(),
      });
    } else if (resizingId) {
      const appointment = appointments.find((app) => app.id === resizingId);
      if (!appointment) return;

      const startTime = parseISO(appointment.startTime);
      const endTime = parseISO(appointment.endTime);

      if (resizeDirection === 'start') {
        const minutes = Math.max(0, Math.round(y));
        const hours = Math.floor(minutes / 60) + 8;
        const mins = minutes % 60;

        const newStartTime = new Date(
          startTime.getFullYear(),
          startTime.getMonth(),
          startTime.getDate(),
          hours,
          mins
        );

        if (newStartTime < endTime) {
          onUpdate({
            ...appointment,
            startTime: newStartTime.toISOString(),
          });
        }
      } else if (resizeDirection === 'end') {
        const minutes = Math.max(0, Math.round(y));
        const hours = Math.floor(minutes / 60) + 8;
        const mins = minutes % 60;

        const newEndTime = new Date(
          endTime.getFullYear(),
          endTime.getMonth(),
          endTime.getDate(),
          hours,
          mins
        );

        if (newEndTime > startTime) {
          onUpdate({
            ...appointment,
            endTime: newEndTime.toISOString(),
          });
        }
      } else if (resizeDirection === 'left') {
        const dayIndex = Math.floor(x / dayWidth);
        const clampedDayIndex = Math.max(0, Math.min(6, dayIndex));

        const newStartDay = addDays(startDate, clampedDayIndex);
        const newStartTime = new Date(
          newStartDay.getFullYear(),
          newStartDay.getMonth(),
          newStartDay.getDate(),
          startTime.getHours(),
          startTime.getMinutes()
        );

        if (newStartTime < endTime) {
          onUpdate({
            ...appointment,
            startTime: newStartTime.toISOString(),
          });
        }
      } else if (resizeDirection === 'right') {
        const dayIndex = Math.floor(x / dayWidth);
        const clampedDayIndex = Math.max(0, Math.min(6, dayIndex));

        const newEndDay = addDays(startDate, clampedDayIndex);
        const newEndTime = new Date(
          newEndDay.getFullYear(),
          newEndDay.getMonth(),
          newEndDay.getDate(),
          endTime.getHours(),
          endTime.getMinutes()
        );

        if (newEndTime > startTime) {
          onUpdate({
            ...appointment,
            endTime: newEndTime.toISOString(),
          });
        }
      }
    }
  };

  const handleMouseUp = () => {
    setDraggingId(null);
    setResizingId(null);
    setResizeDirection(null);
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingId, resizingId, mouseOffset, appointments]);

  const previousWeek = () => {
    setStartDate((date) => addDays(date, -7));
  };

  const nextWeek = () => {
    setStartDate((date) => addDays(date, 7));
  };

  return (
    <div className='border rounded-lg overflow-hidden'>
      <div className='flex justify-between items-center p-4 bg-muted'>
        <Button variant='outline' onClick={previousWeek}>
          Semana Anterior
        </Button>
        <h2 className='text-xl font-semibold'>
          {format(startDate, "d 'de' MMMM", { locale: ptBR })} -{' '}
          {format(addDays(startDate, 6), "d 'de' MMMM yyyy", { locale: ptBR })}
        </h2>
        <Button variant='outline' onClick={nextWeek}>
          Próxima Semana
        </Button>
      </div>

      <div className='relative'>
        <div className='flex border-b'>
          <div className='w-20 shrink-0 border-r bg-muted'></div>
          {days.map((day, i) => (
            <div
              key={i}
              className={cn(
                'flex-1 text-center py-2 font-medium',
                day.getDate() === new Date().getDate() &&
                  day.getMonth() === new Date().getMonth() &&
                  'bg-primary/10'
              )}
            >
              <div>{format(day, 'EEE', { locale: ptBR })}</div>
              <div>{format(day, 'd')}</div>
            </div>
          ))}
        </div>

        <div className='flex' style={{ height: '780px' }} ref={containerRef}>
          <div className='w-20 shrink-0 border-r'>
            {hours.map((hour, i) => (
              <div
                key={i}
                className='h-[60px] border-b flex items-center justify-center text-sm text-muted-foreground'
              >
                {format(hour, 'HH:mm')}
              </div>
            ))}
          </div>

          <div className='flex flex-1 relative'>
            {days.map((day, dayIndex) => (
              <div key={dayIndex} className='flex-1 border-r last:border-r-0'>
                {hours.map((_, hourIndex) => (
                  <div key={hourIndex} className='h-[60px] border-b'></div>
                ))}
              </div>
            ))}

            {appointments.map((appointment) => {
              const style = getAppointmentStyle(appointment);
              if (style.display === 'none') return null;

              const isDragging = draggingId === appointment.id;
              const isResizing = resizingId === appointment.id;

              return (
                <div
                  key={appointment.id}
                  className={cn(
                    'absolute rounded-md p-2 overflow-hidden',
                    'border border-primary/20 bg-primary/10',
                    isDragging && 'opacity-70 shadow-lg cursor-grabbing',
                    isResizing && 'opacity-70',
                    !isDragging && !isResizing && 'cursor-grab'
                  )}
                  style={{
                    ...style,
                    backgroundColor: appointment.color + '20',
                    borderColor: appointment.color,
                  }}
                  onMouseDown={(e) => handleMouseDown(e, appointment)}
                >
                  <div className='flex justify-between items-start'>
                    <div className='font-medium truncate'>
                      {appointment.title}
                    </div>
                    <div className='flex gap-1'>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-5 w-5'
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(appointment);
                        }}
                      >
                        <Pencil className='h-3 w-3' />
                      </Button>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-5 w-5'
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(appointment.id);
                        }}
                      >
                        <Trash2 className='h-3 w-3' />
                      </Button>
                    </div>
                  </div>
                  <div className='text-xs text-muted-foreground'>
                    {format(parseISO(appointment.startTime), 'dd/MM HH:mm')} -{' '}
                    {format(parseISO(appointment.endTime), 'dd/MM HH:mm')}
                  </div>
                  {appointment.description && (
                    <div className='text-xs mt-1 truncate'>
                      {appointment.description}
                    </div>
                  )}

                  <div
                    className='absolute top-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-primary/20'
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setResizingId(appointment.id);
                      setResizeDirection('start');
                      setMouseOffset({ x: 0, y: 0 });
                    }}
                  />
                  <div
                    className='absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize hover:bg-primary/20'
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setResizingId(appointment.id);
                      setResizeDirection('end');
                      setMouseOffset({ x: 0, y: 0 });
                    }}
                  />

                  <div
                    className='absolute top-0 bottom-0 left-0 w-2 cursor-ew-resize hover:bg-primary/20'
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setResizingId(appointment.id);
                      setResizeDirection('left');
                      setMouseOffset({ x: 0, y: 0 });
                    }}
                  />
                  <div
                    className='absolute top-0 bottom-0 right-0 w-2 cursor-ew-resize hover:bg-primary/20'
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setResizingId(appointment.id);
                      setResizeDirection('right');
                      setMouseOffset({ x: 0, y: 0 });
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
