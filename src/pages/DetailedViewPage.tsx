import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, CheckCircle, MapPin, Clock, AlertCircle } from 'lucide-react';
import { RiskBadge } from '../components/shared/RiskBadge';
import { IncidentTimeline } from '../components/shared/IncidentTimeline';
import { ImageWithFallback } from '../components/common/ImageWithFallback';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useApp } from '../context/AppContext';

export function DetailedViewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getEventById, markReviewed } = useApp();

  const event = getEventById(id ?? '');

  if (!event) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Event not found.{' '}
        <button onClick={() => navigate('/dashboard')} className="text-primary hover:underline">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const formatDateTime = (date: Date) =>
    new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeStyle: 'long' }).format(date);

  return (
    <div className="space-y-6">
      {/* Actions bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Button variant="ghost" onClick={() => navigate('/dashboard')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => alert('Report download started...')}>
            <Download className="w-4 h-4 mr-2" />
            Download Report
          </Button>
          {!event.reviewed && (
            <Button onClick={() => markReviewed(event.id)}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark as Reviewed
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="overflow-hidden bg-card/50 backdrop-blur border-border">
            <div className="aspect-video bg-black relative">
              <ImageWithFallback
                src={event.thumbnailUrl}
                alt={event.title}
                className="w-full h-full object-contain"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-card/90 backdrop-blur-sm px-4 py-2 rounded-lg border border-border">
                  <p className="text-sm text-muted-foreground">Video Preview</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card/50 backdrop-blur border-border">
            <h3 className="mb-4 font-semibold text-foreground">Event Description</h3>
            <p className="text-foreground/90 leading-relaxed">{event.description}</p>
          </Card>

          {event.timeline && event.timeline.length > 0 && (
            <Card className="p-6 bg-card/50 backdrop-blur border-border">
              <IncidentTimeline timeline={event.timeline} />
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="p-6 bg-card/50 backdrop-blur border-border">
            <h3 className="mb-4 font-semibold text-foreground">Event Details</h3>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-muted-foreground flex items-center gap-2 mb-1">
                  <AlertCircle className="w-4 h-4" /> Event Title
                </dt>
                <dd className="text-foreground">{event.title}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4" /> Location
                </dt>
                <dd className="text-foreground">{event.location}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4" /> Date &amp; Time
                </dt>
                <dd className="text-sm text-foreground">{formatDateTime(event.timestamp)}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground mb-1">Risk Level</dt>
                <dd><RiskBadge level={event.riskLevel} /></dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground mb-1">Review Status</dt>
                <dd>
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded border text-sm ${
                    event.reviewed
                      ? 'bg-green-500/20 text-green-400 border-green-500/30'
                      : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                  }`}>
                    {event.reviewed ? (
                      <><CheckCircle className="w-4 h-4" /> Reviewed</>
                    ) : (
                      <><Clock className="w-4 h-4" /> Pending Review</>
                    )}
                  </div>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground mb-1">Event ID</dt>
                <dd className="text-sm text-muted-foreground font-mono">{event.id}</dd>
              </div>
            </dl>
          </Card>

          <Card className="p-6 bg-primary/10 border-primary/30 backdrop-blur">
            <h4 className="mb-2 font-semibold text-foreground">Quick Actions</h4>
            <p className="text-sm text-foreground/80 mb-4">
              Use the buttons above to download a detailed report or mark this event as reviewed.
            </p>
            <div className="text-xs text-muted-foreground">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
