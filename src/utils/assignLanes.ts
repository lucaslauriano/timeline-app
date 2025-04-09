import { TimelineItem } from '@/types/timeline';

/**
 * Takes an array of items and assigns them to lanes based on start/end dates.
 * Ensures no overlapping in the same lane and proper grid alignment.
 */
export function assignLanes(items: TimelineItem[]): TimelineItem[] {
  // Sort items by start date
  const sortedItems = [...items].sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime()
  );
  const itemsWithLanes = sortedItems.map((item) => ({ ...item }));
  const lanes: TimelineItem[][] = [];

  for (let i = 0; i < itemsWithLanes.length; i++) {
    const currentItem = itemsWithLanes[i];
    let assigned = false;

    // Try to fit item in existing lanes
    for (let laneIndex = 0; laneIndex < lanes.length; laneIndex++) {
      const lane = lanes[laneIndex];
      const hasOverlap = lane.some(
        (existingItem) =>
          currentItem.startDate < existingItem.endDate &&
          currentItem.endDate > existingItem.startDate
      );

      if (!hasOverlap) {
        lane.push(currentItem);
        currentItem.lane = laneIndex;
        assigned = true;
        break;
      }
    }

    // If item doesn't fit in any existing lane, create a new one
    if (!assigned) {
      lanes.push([currentItem]);
      currentItem.lane = lanes.length - 1;
    }
  }

  return itemsWithLanes;
}
