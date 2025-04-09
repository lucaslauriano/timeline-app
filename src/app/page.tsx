'use client';

import { Timeline } from '@/components/Timeline';
import timelineItems from '@/utils/timelineItems';

export default function Home() {
  const startDate = new Date(2025, 1, 1); // March 1, 2025
  const endDate = new Date(2025, 2, 28); // February 28, 2025

  const items = timelineItems.map((item) => ({
    id: item.id.toString(),
    title: item.name,
    startDate: new Date(item.start),
    endDate: new Date(item.end),
    color: '#3b82f6', // Default blue color
  }));

  return (
    <main className='p-8'>
      <h1 className='text-2xl font-bold mb-6'>Project Timeline</h1>
      <Timeline
        items={items}
        startDate={startDate}
        endDate={endDate}
        onItemUpdate={(item) => console.log('Item updated:', item)}
      />
    </main>
  );
}
