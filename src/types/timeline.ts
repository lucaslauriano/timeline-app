export type TimelineItem = {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  color?: string;
  lane?: number;
};

export type TimelineProps = {
  items: TimelineItem[];
  startDate: Date;
  endDate: Date;
  onItemCreate?: (date: Date) => void;
  onItemUpdate?: (item: TimelineItem) => void;
};
