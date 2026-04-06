import { TimelineEvent } from '../../types';
import { TrendingUp } from 'lucide-react';

interface TimelinePreviewProps {
  timeline: TimelineEvent[];
}

const riskColor: Record<string, string> = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-red-500',
};

export function TimelinePreview({ timeline }: TimelinePreviewProps) {
  if (!timeline || timeline.length === 0) return null;

  return (
    <div className="flex items-center gap-2 pt-2 border-t border-border">
      <TrendingUp className="w-4 h-4 text-primary shrink-0" />
      <div className="flex-1 flex items-center gap-1">
        {timeline.map((event, index) => (
          <div
            key={index}
            className={`h-2 flex-1 rounded ${riskColor[event.riskLevel]}`}
            title={`${event.riskLevel.toUpperCase()}: ${event.description.substring(0, 50)}...`}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground shrink-0">{timeline.length} phases</span>
    </div>
  );
}
