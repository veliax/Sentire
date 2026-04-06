import { useState } from 'react';
import { TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useApp } from '../context/AppContext';

const WEEKLY_DATA: Record<string, { day: string; events: number; highRisk: number }[]> = {
  all: [
    { day: 'Mon', events: 32, highRisk: 5 },
    { day: 'Tue', events: 28, highRisk: 3 },
    { day: 'Wed', events: 45, highRisk: 8 },
    { day: 'Thu', events: 38, highRisk: 6 },
    { day: 'Fri', events: 52, highRisk: 7 },
    { day: 'Sat', events: 25, highRisk: 2 },
    { day: 'Sun', events: 27, highRisk: 3 },
  ],
  'Building A': [
    { day: 'Mon', events: 12, highRisk: 2 }, { day: 'Tue', events: 11, highRisk: 1 },
    { day: 'Wed', events: 16, highRisk: 3 }, { day: 'Thu', events: 14, highRisk: 2 },
    { day: 'Fri', events: 19, highRisk: 3 }, { day: 'Sat', events: 9, highRisk: 1 },
    { day: 'Sun', events: 8, highRisk: 0 },
  ],
  'Building B': [
    { day: 'Mon', events: 10, highRisk: 2 }, { day: 'Tue', events: 8, highRisk: 1 },
    { day: 'Wed', events: 13, highRisk: 3 }, { day: 'Thu', events: 11, highRisk: 2 },
    { day: 'Fri', events: 15, highRisk: 2 }, { day: 'Sat', events: 6, highRisk: 0 },
    { day: 'Sun', events: 4, highRisk: 0 },
  ],
  'Building C': [
    { day: 'Mon', events: 6, highRisk: 1 }, { day: 'Tue', events: 5, highRisk: 1 },
    { day: 'Wed', events: 9, highRisk: 1 }, { day: 'Thu', events: 7, highRisk: 1 },
    { day: 'Fri', events: 10, highRisk: 1 }, { day: 'Sat', events: 5, highRisk: 1 },
    { day: 'Sun', events: 3, highRisk: 0 },
  ],
  'Parking Lot': [
    { day: 'Mon', events: 3, highRisk: 0 }, { day: 'Tue', events: 3, highRisk: 0 },
    { day: 'Wed', events: 5, highRisk: 1 }, { day: 'Thu', events: 4, highRisk: 1 },
    { day: 'Fri', events: 6, highRisk: 1 }, { day: 'Sat', events: 4, highRisk: 0 },
    { day: 'Sun', events: 7, highRisk: 0 },
  ],
  'Main Entrance': [
    { day: 'Mon', events: 1, highRisk: 0 }, { day: 'Tue', events: 1, highRisk: 0 },
    { day: 'Wed', events: 2, highRisk: 0 }, { day: 'Thu', events: 2, highRisk: 0 },
    { day: 'Fri', events: 2, highRisk: 0 }, { day: 'Sat', events: 1, highRisk: 0 },
    { day: 'Sun', events: 5, highRisk: 3 },
  ],
};

const LOCATIONS = ['all', 'Building A', 'Building B', 'Building C', 'Parking Lot', 'Main Entrance'];

export function StatisticsPage() {
  const { statistics } = useApp();
  const [selectedLocation, setSelectedLocation] = useState('all');

  const summaryCards = [
    { title: 'Total Events', value: statistics.totalEvents, change: '+12%', icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/20 border border-primary/30', changeColor: 'text-green-400' },
    { title: 'High Risk Events', value: statistics.highRisk, change: '-5%', icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/20 border border-red-500/30', changeColor: 'text-green-400' },
    { title: 'Reviewed', value: statistics.reviewedToday, change: '+8%', icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20 border border-green-500/30', changeColor: 'text-green-400' },
    { title: 'Pending', value: statistics.pendingReview, change: '-3%', icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-500/20 border border-yellow-500/30', changeColor: 'text-green-400' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Statistics Overview</h2>
        <p className="text-muted-foreground mt-1">Analyze security trends and event patterns</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(({ title, value, change, icon: Icon, color, bg, changeColor }) => (
          <Card key={title} className="p-6 bg-card/50 backdrop-blur border-border hover:border-primary/30 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className={`${bg} p-3 rounded-lg`}>
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
              <span className={`text-sm font-medium ${changeColor}`}>{change}</span>
            </div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
          </Card>
        ))}
      </div>

      {/* Weekly Trend Chart */}
      <Card className="p-6 bg-card/50 backdrop-blur border-border">
        <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
          <h3 className="font-semibold text-foreground">Weekly Event Trend</h3>
          <div className="flex flex-wrap gap-2">
            {LOCATIONS.map(loc => (
              <Button
                key={loc}
                variant={selectedLocation === loc ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedLocation(loc)}
                className={selectedLocation === loc ? 'bg-primary hover:bg-primary/90' : ''}
              >
                {loc === 'all' ? 'All Locations' : loc}
              </Button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={WEEKLY_DATA[selectedLocation]}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(179,150,217,0.1)" />
            <XAxis dataKey="day" stroke="#a89bb8" />
            <YAxis stroke="#a89bb8" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1a1a1d',
                border: '1px solid rgba(179,150,217,0.3)',
                color: '#e8e4f0',
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="events" stroke="#b396d9" strokeWidth={2} name="Total Events" dot={false} />
            <Line type="monotone" dataKey="highRisk" stroke="#ef4444" strokeWidth={2} name="High Risk" dot={false} />
          </LineChart>
        </ResponsiveContainer>
        <p className="mt-4 text-sm text-muted-foreground">
          {selectedLocation === 'all'
            ? 'Showing events from all monitored locations'
            : `Showing events from ${selectedLocation}`}
        </p>
      </Card>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { title: 'Average Response Time', value: '12.5 minutes', sub: '-2.3 min from last week' },
          { title: 'Resolution Rate', value: '94.2%', sub: '+1.8% from last week' },
          { title: 'Active Cameras', value: '127 / 130', sub: '97.7% operational' },
        ].map(({ title, value, sub }) => (
          <Card key={title} className="p-6 bg-card/50 backdrop-blur border-border">
            <h4 className="mb-2 font-semibold text-foreground">{title}</h4>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-sm text-muted-foreground mt-1">{sub}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
