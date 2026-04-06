import { useState } from 'react';
import { Download, Search } from 'lucide-react';
import { RiskBadge } from '../components/shared/RiskBadge';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { useApp } from '../context/AppContext';

export function ReportsPage() {
  const { reports } = useApp();
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = reports.filter(r =>
    r.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.eventId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date);

  const now = new Date();
  const thisMonthCount = reports.filter(r => {
    const d = new Date(r.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Event Reports</h2>
          <p className="text-muted-foreground mt-1">View and manage all security event reports</p>
        </div>
        <Button onClick={() => alert('Exporting reports to CSV...')}>
          <Download className="w-4 h-4 mr-2" />
          Export Reports
        </Button>
      </div>

      {/* Search */}
      <Card className="p-4 bg-card/50 backdrop-blur border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by event ID, location, or description..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Table */}
      <Card className="bg-card/50 backdrop-blur border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event ID</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Date &amp; Time</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(report => (
                <TableRow key={report.eventId}>
                  <TableCell className="font-mono text-sm">{report.eventId}</TableCell>
                  <TableCell>{report.location}</TableCell>
                  <TableCell><RiskBadge level={report.riskLevel} /></TableCell>
                  <TableCell className="text-sm whitespace-nowrap">{formatDate(report.date)}</TableCell>
                  <TableCell className="max-w-xs truncate">{report.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No reports found matching your search
          </div>
        )}
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Reports', value: reports.length, className: 'text-foreground' },
          { label: 'High Risk Events', value: reports.filter(r => r.riskLevel === 'high').length, className: 'text-red-400' },
          { label: 'This Month', value: thisMonthCount, className: 'text-foreground' },
        ].map(({ label, value, className }) => (
          <Card key={label} className="p-4 bg-card/50 backdrop-blur border-border">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={`mt-1 text-2xl font-bold ${className}`}>{value}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
