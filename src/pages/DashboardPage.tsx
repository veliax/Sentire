import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Clock, Eye, TrendingUp } from 'lucide-react';
import { RiskLevel } from '../types';
import { VideoCard } from '../components/shared/VideoCard';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useApp } from '../context/AppContext';

export function DashboardPage() {
  const { events, statistics } = useApp();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');
  const [showOnlyTimeline, setShowOnlyTimeline] = useState(false);

  const filteredEvents = events.filter(event => {
    const matchesSearch =
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = riskFilter === 'all' || event.riskLevel === riskFilter;
    const matchesTimeline = !showOnlyTimeline || (event.timeline && event.timeline.length > 0);
    return matchesSearch && matchesRisk && matchesTimeline;
  });

  const eventsWithTimeline = events.filter(e => e.timeline && e.timeline.length > 0);

  const summaryCards = [
    { title: 'High Risk Events', value: statistics.highRisk, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/20 border border-red-500/30' },
    { title: 'Pending Review', value: statistics.pendingReview, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/20 border border-yellow-500/30' },
    { title: 'Reviewed Today', value: statistics.reviewedToday, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20 border border-green-500/30' },
    { title: 'Total Events', value: statistics.totalEvents, icon: Eye, color: 'text-primary', bg: 'bg-primary/20 border border-primary/30' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Dashboard Overview</h2>
        <p className="text-muted-foreground mt-1">Monitor and manage security events in real-time</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(({ title, value, icon: Icon, color, bg }) => (
          <Card key={title} className="p-6 bg-card/50 backdrop-blur border-border hover:border-primary/30 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{title}</p>
                <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
              </div>
              <div className={`${bg} p-3 rounded-lg`}>
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Critical Incidents with Timeline */}
      {eventsWithTimeline.length > 0 && (
        <Card className="p-6 bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/30">
          <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-red-500/20 border border-red-500/30 p-2 rounded-lg">
                <TrendingUp className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-foreground font-semibold">Critical Incidents with Timeline Analysis</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {eventsWithTimeline.length} events showing escalation from start to critical point
                </p>
              </div>
            </div>
            <Badge className="bg-red-500/20 text-red-400 border border-red-500/30">
              {eventsWithTimeline.length} Active
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {eventsWithTimeline.slice(0, 3).map(event => (
              <VideoCard
                key={event.id}
                event={event}
                onClick={() => navigate(`/dashboard/event/${event.id}`)}
              />
            ))}
          </div>
          {eventsWithTimeline.length > 3 && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowOnlyTimeline(true)}
                className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
              >
                View all {eventsWithTimeline.length} incidents with timelines
              </button>
            </div>
          )}
        </Card>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            className="flex-1"
            placeholder="Search events by title or location..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <div className="w-full sm:w-48">
            <Select value={riskFilter} onValueChange={v => setRiskFilter(v as RiskLevel | 'all')}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by risk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk Levels</SelectItem>
                <SelectItem value="high">High Risk</SelectItem>
                <SelectItem value="medium">Medium Risk</SelectItem>
                <SelectItem value="low">Low Risk</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <button
            onClick={() => setShowOnlyTimeline(v => !v)}
            className={`w-full sm:w-auto px-4 py-2 rounded-md border text-sm font-medium transition-colors whitespace-nowrap ${
              showOnlyTimeline
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-foreground border-border hover:bg-accent'
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-2" />
            {showOnlyTimeline ? 'Showing Timeline Events' : 'Show Timeline Events'}
          </button>
        </div>
      </Card>

      {/* Events Grid */}
      <div>
        <h3 className="mb-4 text-lg font-semibold text-foreground">Recent Events</h3>
        {filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map(event => (
              <VideoCard
                key={event.id}
                event={event}
                onClick={() => navigate(`/dashboard/event/${event.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No events found matching your filters
          </div>
        )}
      </div>
    </div>
  );
}
