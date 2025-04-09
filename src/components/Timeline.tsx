'use client';

import React, { useMemo, useRef, useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  startOfMonth,
} from 'date-fns';
import { cn } from '@/utils/cn';
import { assignLanes } from '@/utils/assignLanes';

const MILLISECONDS_PER_DAY = 1000 * 60 * 60 * 24;
const LANE_HEIGHT = 60;
const HEADER_HEIGHT = 80;
const DAY_WIDTH = 120;

interface TimelineItem {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  color?: string;
  lane?: number;
}

interface TimelineProps {
  items: TimelineItem[];
  startDate: Date;
  endDate: Date;
  onItemUpdate?: (item: TimelineItem) => void;
}

interface ResizeHandleProps {
  onResizeStart: () => void;
  onResizeEnd: () => void;
}

function ResizeHandle({ onResizeStart, onResizeEnd }: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startPosRef = useRef(0);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation(); // Prevent drag start
    setIsDragging(true);
    startPosRef.current = e.clientX;
    onResizeStart();

    const handlePointerMove = (e: PointerEvent) => {
      if (isDragging) {
        const delta = e.clientX - startPosRef.current;
        startPosRef.current = e.clientX;
        const customEvent = new CustomEvent('resize-move', {
          detail: { delta },
        });
        window.dispatchEvent(customEvent);
      }
    };

    const handlePointerUp = () => {
      setIsDragging(false);
      onResizeEnd();
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      className='absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 rounded-r-lg'
      style={{ touchAction: 'none' }}
    />
  );
}

function TimelineItemComponent({
  item,
  style,
  isDragging,
  onTitleChange,
  onResizeStart,
  onResizeEnd,
}: {
  item: TimelineItem;
  style: React.CSSProperties;
  isDragging?: boolean;
  onTitleChange: (id: string, title: string) => void;
  onResizeStart: () => void;
  onResizeEnd: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: item.id,
      disabled: isDragging,
    });

  const itemStyle: React.CSSProperties = {
    ...style,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        'absolute rounded-lg p-3 shadow-md transition-colors',
        isDragging ? 'ring-2 ring-blue-500 bg-opacity-90' : ''
      )}
      style={itemStyle}
    >
      <input
        type='text'
        value={item.title}
        onChange={(e) => onTitleChange(item.id, e.target.value)}
        className='text-sm font-medium bg-transparent border-none focus:outline-none w-full text-white'
      />
      <div className='text-xs text-white/90 mt-1'>
        {format(item.startDate, 'MMM d')} - {format(item.endDate, 'MMM d')}
      </div>
      <ResizeHandle onResizeStart={onResizeStart} onResizeEnd={onResizeEnd} />
    </div>
  );
}

export function Timeline({
  items: initialItems,
  startDate,
  endDate,
  onItemUpdate,
}: TimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [items, setItems] = useState(initialItems);
  const [draggingItem, setDraggingItem] = useState<TimelineItem | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDelta, setResizeDelta] = useState(0);

  const timelineDuration =
    (endDate.getTime() - startDate.getTime()) / MILLISECONDS_PER_DAY;
  const pixelsPerDay = DAY_WIDTH * zoom;
  const timelineWidth = timelineDuration * pixelsPerDay;

  const handleResize = useCallback(
    (e: Event) => {
      const customEvent = e as CustomEvent;
      const delta = customEvent.detail.delta;

      if (!draggingItem) return;

      const daysChange = Math.round(delta / pixelsPerDay);
      const newEndDate = new Date(
        draggingItem.endDate.getTime() + daysChange * MILLISECONDS_PER_DAY
      );

      if (newEndDate > draggingItem.startDate) {
        const updatedItem = {
          ...draggingItem,
          endDate: newEndDate,
        };

        setItems((prevItems) =>
          prevItems.map((i) => (i.id === draggingItem.id ? updatedItem : i))
        );
        setDraggingItem(updatedItem); // importante: atualiza o draggingItem para refletir o novo endDate
      }
    },
    [draggingItem, pixelsPerDay]
  );

  const handleResizeStart = (item: TimelineItem) => {
    setIsResizing(true);
    setDraggingItem(item);
    setResizeDelta(0);
  };

  const handleResizeEnd = () => {
    if (draggingItem) {
      onItemUpdate?.(draggingItem);
    }

    setIsResizing(false);
    setDraggingItem(null);
    setResizeDelta(0);
  };

  React.useEffect(() => {
    window.addEventListener('resize-move', handleResize);
    return () => window.removeEventListener('resize-move', handleResize);
  }, [handleResize]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const itemsWithLanes = useMemo(() => assignLanes(items), [items]);

  const months = useMemo(() => {
    const result = [];
    let currentDate = startOfMonth(startDate);
    const lastDate = endOfMonth(endDate);

    while (currentDate <= lastDate) {
      result.push({
        date: currentDate,
        days: eachDayOfInterval({
          start: currentDate,
          end: endOfMonth(currentDate),
        }),
      });
      currentDate = addDays(endOfMonth(currentDate), 1);
    }
    return result;
  }, [startDate, endDate]);

  const handleDragStart = (event: DragStartEvent) => {
    if (isResizing) return;
    const item = items.find((i) => i.id === event.active.id);
    if (item) setDraggingItem(item);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (isResizing || !draggingItem || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const activeRect =
      event.active.rect.current.translated || event.active.rect.current.initial;
    if (!activeRect) return;

    const cursorX = event.delta.x + activeRect.left - rect.left;
    const exactDays = cursorX / pixelsPerDay;
    const duration =
      draggingItem.endDate.getTime() - draggingItem.startDate.getTime();

    const newStartDate = new Date(
      startDate.getTime() + Math.round(exactDays) * MILLISECONDS_PER_DAY
    );
    const newEndDate = new Date(newStartDate.getTime() + duration);

    const updatedItem = {
      ...draggingItem,
      startDate: newStartDate,
      endDate: newEndDate,
    };

    setItems(items.map((i) => (i.id === draggingItem.id ? updatedItem : i)));
    onItemUpdate?.(updatedItem);
    setDraggingItem(null);
  };

  const handleTitleChange = (id: string, title: string) => {
    const newItems = items.map((item) =>
      item.id === id ? { ...item, title } : item
    );
    setItems(newItems);
    const updatedItem = newItems.find((item) => item.id === id);
    if (updatedItem) onItemUpdate?.(updatedItem);
  };

  return (
    <div className='w-full'>
      <div className='flex justify-end gap-2 mb-4'>
        <button
          onClick={() => setZoom((z) => Math.max(0.5, z * 0.8))}
          className='px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-sm'
        >
          -
        </button>
        <button
          onClick={() => setZoom((z) => Math.min(2, z * 1.25))}
          className='px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-sm'
        >
          +
        </button>
      </div>

      <div className='border rounded-lg shadow-sm bg-white overflow-hidden'>
        <div
          ref={containerRef}
          className='relative overflow-x-auto'
          style={{ height: `${LANE_HEIGHT * 10 + HEADER_HEIGHT}px` }}
        >
          <div
            className='absolute left-0 top-0'
            style={{ width: timelineWidth }}
          >
            {/* Header */}
            <div className='sticky top-0 bg-white z-10 border-b'>
              {months.map((month) => (
                <div key={month.date.toString()}>
                  <div className='px-4 py-2 text-sm font-medium text-gray-500 border-b'>
                    {format(month.date, 'MMMM yyyy')}
                  </div>
                  <div className='flex'>
                    {month.days.map((day) => (
                      <div
                        key={day.toString()}
                        className='flex-shrink-0 text-center border-r border-gray-100'
                        style={{ width: pixelsPerDay }}
                      >
                        <div className='text-xs text-gray-400'>
                          {format(day, 'EEE')}
                        </div>
                        <div className='text-sm text-gray-600'>
                          {format(day, 'd')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Timeline items */}
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={items.map((item) => item.id)}
                strategy={horizontalListSortingStrategy}
              >
                {itemsWithLanes.map((item) => (
                  <TimelineItemComponent
                    key={item.id}
                    item={item}
                    style={{
                      left: `${
                        ((item.startDate.getTime() - startDate.getTime()) /
                          MILLISECONDS_PER_DAY) *
                        pixelsPerDay
                      }px`,
                      width: `${
                        ((item.endDate.getTime() - item.startDate.getTime()) /
                          MILLISECONDS_PER_DAY +
                          1) *
                          pixelsPerDay +
                        (draggingItem?.id === item.id ? resizeDelta : 0)
                      }px`,
                      top: `${
                        (item.lane || 0) * LANE_HEIGHT + HEADER_HEIGHT
                      }px`,
                      backgroundColor: item.color || '#3b82f6',
                    }}
                    isDragging={draggingItem?.id === item.id}
                    onTitleChange={handleTitleChange}
                    onResizeStart={() => handleResizeStart(item)}
                    onResizeEnd={handleResizeEnd}
                  />
                ))}
              </SortableContext>

              <DragOverlay>
                {draggingItem && !isResizing && (
                  <TimelineItemComponent
                    item={draggingItem}
                    style={{
                      left: `${
                        ((draggingItem.startDate.getTime() -
                          startDate.getTime()) /
                          MILLISECONDS_PER_DAY) *
                        pixelsPerDay
                      }px`,
                      width: `${
                        ((draggingItem.endDate.getTime() -
                          draggingItem.startDate.getTime()) /
                          MILLISECONDS_PER_DAY +
                          1) *
                        pixelsPerDay
                      }px`,
                      top: `${
                        (draggingItem.lane || 0) * LANE_HEIGHT + HEADER_HEIGHT
                      }px`,
                      backgroundColor: draggingItem.color || '#3b82f6',
                    }}
                    isDragging
                    onTitleChange={handleTitleChange}
                    onResizeStart={() => handleResizeStart(draggingItem)}
                    onResizeEnd={handleResizeEnd}
                  />
                )}
              </DragOverlay>
            </DndContext>
          </div>
        </div>
      </div>
    </div>
  );
}
