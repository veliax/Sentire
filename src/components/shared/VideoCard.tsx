import { VideoEvent } from '../../types';
import { RiskBadge } from './RiskBadge';
import { TimelinePreview } from './TimelinePreview';
import { ImageWithFallback } from '../common/ImageWithFallback';
import { Card } from '../ui/card';
import { Clock, MapPin } from 'lucide-react';

interface VideoCardProps {
  event: VideoEvent;
  onClick: () => void;
}

export function VideoCard({ event, onClick }: VideoCardProps) {
  const formatTime = (date: Date) =>
    new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
      day: 'numeric',
    }).format(date);

  return (
    <Card
      className="overflow-hidden cursor-pointer hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30 transition-all duration-300 bg-card/50 backdrop-blur"
      onClick={onClick}
    >
      <div className="relative aspect-video">
        <ImageWithFallback
          src={event.thumbnailUrl}
          alt={event.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        {!event.reviewed && (
          <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-3 py-1 rounded">
            New
          </div>
        )}
      </div>
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="flex-1 text-foreground">{event.title}</h3>
          <RiskBadge level={event.riskLevel} />
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="w-4 h-4 shrink-0" />
          <span className="text-sm truncate">{event.location}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-4 h-4 shrink-0" />
          <span className="text-sm">{formatTime(event.timestamp)}</span>
        </div>
        {event.timeline && event.timeline.length > 0 && (
          <TimelinePreview timeline={event.timeline} />
        )}
      </div>
    </Card>
  );
}
