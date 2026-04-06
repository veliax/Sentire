import { TimelineEvent } from '../../types';
import { ImageWithFallback } from '../common/ImageWithFallback';
import { Card } from '../ui/card';
import { AlertTriangle, Clock } from 'lucide-react';

interface IncidentTimelineProps {
  timeline: TimelineEvent[];
}

const riskDotColor: Record<string, string> = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-red-500',
};

const riskBorderColor: Record<string, string> = {
  low: 'border-green-500/30 bg-green-500/5',
  medium: 'border-yellow-500/30 bg-yellow-500/5',
  high: 'border-red-500/30 bg-red-500/5',
};

const riskTextColor: Record<string, string> = {
  low: 'bg-green-500/20 text-green-400 border-green-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  high: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export function IncidentTimeline({ timeline }: IncidentTimelineProps) {
  const formatTime = (date: Date) =>
    new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);

  const totalDuration =
    timeline.length > 0
      ? Math.round(
          (timeline[timeline.length - 1].timestamp.getTime() - timeline[0].timestamp.getTime()) /
            60000
        )
      : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-primary" />
          <h3 className="text-foreground">Incident Timeline — Progression to Extreme Danger</h3>
        </div>
        <span className="text-sm text-muted-foreground">Duration: {totalDuration} minutes</span>
      </div>

      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-green-500 via-yellow-500 to-red-500" />

        <div className="space-y-6">
          {timeline.map((event, index) => {
            const isFirst = index === 0;
            const isLast = index === timeline.length - 1;

            return (
              <div key={index} className="relative pl-12">
                <div
                  className={`absolute left-0 w-8 h-8 rounded-full ${riskDotColor[event.riskLevel]} flex items-center justify-center ring-4 ring-background shadow-md`}
                >
                  {isFirst && <span className="text-white text-xs">●</span>}
                  {isLast && <AlertTriangle className="w-4 h-4 text-white" />}
                  {!isFirst && !isLast && <Clock className="w-4 h-4 text-white" />}
                </div>

                {isFirst && (
                  <div className="absolute -left-2 -top-8 bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-1 rounded text-xs">
                    INITIAL DETECTION
                  </div>
                )}
                {isLast && (
                  <div className="absolute -left-2 -top-8 bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded text-xs animate-pulse">
                    CRITICAL POINT
                  </div>
                )}

                <Card className={`border-2 ${riskBorderColor[event.riskLevel]} p-4 ${isLast ? 'shadow-lg' : ''}`}>
                  <div className="flex flex-col md:flex-row gap-4">
                    {event.imageUrl && (
                      <div className="w-full md:w-48 shrink-0">
                        <div className="aspect-video rounded-lg overflow-hidden">
                          <ImageWithFallback
                            src={event.imageUrl}
                            alt={`Timeline event ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-sm text-muted-foreground flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          {formatTime(event.timestamp)}
                          <span className="text-muted-foreground/50">•</span>
                          Phase {index + 1} of {timeline.length}
                        </span>
                        <span className={`px-3 py-1 rounded text-sm border ${riskTextColor[event.riskLevel]}`}>
                          {event.riskLevel.toUpperCase()} RISK
                        </span>
                      </div>
                      <p className={`text-foreground ${event.riskLevel === 'high' ? 'font-semibold' : ''}`}>
                        {event.description}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      </div>

      <Card className="bg-red-500/10 border-red-500/30 p-4 mt-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <h4 className="text-red-400 mb-2">Incident Escalation Analysis</h4>
            <div className="space-y-2 text-sm">
              <p className="text-foreground">
                <span className="font-semibold">Timeline Overview:</span> Event progressed from initial
                detection ({timeline[0]?.riskLevel} risk) to extreme danger point (
                {timeline[timeline.length - 1]?.riskLevel} risk) over {totalDuration} minutes.
              </p>
              <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-red-500/20">
                <div>
                  <p className="text-muted-foreground text-xs">Total Phases</p>
                  <p className="text-lg text-foreground">{timeline.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Escalation Time</p>
                  <p className="text-lg text-foreground">{totalDuration} min</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Final Status</p>
                  <p className="text-lg text-red-400 uppercase">
                    {timeline[timeline.length - 1]?.riskLevel}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
