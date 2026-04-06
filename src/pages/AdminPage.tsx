import { useState } from 'react';
import { Search, Trash2, Eye, Video, Users } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import { RiskBadge } from '../components/shared/RiskBadge';
import { useApp } from '../context/AppContext';
import { User } from '../types';

export function AdminPage() {
  const { users, events, deleteUser, deleteVideo } = useApp();
  const [userSearch, setUserSearch] = useState('');
  const [videoSearch, setVideoSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const filteredUsers = users.filter(u =>
    u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredVideos = events.filter(v =>
    v.title.toLowerCase().includes(videoSearch.toLowerCase()) ||
    v.location.toLowerCase().includes(videoSearch.toLowerCase())
  );

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Admin Panel</h2>
        <p className="text-muted-foreground mt-1">Manage users and video content</p>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="users">
            <Users className="w-4 h-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="videos">
            <Video className="w-4 h-4 mr-2" />
            Videos
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4 mt-6">
          <Card className="p-4 bg-card/50 backdrop-blur border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </Card>

          <Card className="bg-card/50 backdrop-blur border-border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map(user => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.fullName}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(user.joinedDate)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setSelectedUser(user)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete {user.fullName}? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteUser(user.id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* User Detail Panel */}
          {selectedUser && (
            <Card className="p-6 bg-card/50 backdrop-blur border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">User Details</h3>
                <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>
                  Close
                </Button>
              </div>
              <dl className="space-y-3">
                {[
                  { label: 'Full Name', value: selectedUser.fullName },
                  { label: 'Email', value: selectedUser.email },
                  { label: 'Role', value: selectedUser.role },
                  { label: 'User ID', value: selectedUser.id, mono: true },
                  { label: 'Joined Date', value: formatDate(selectedUser.joinedDate) },
                ].map(({ label, value, mono }) => (
                  <div key={label}>
                    <dt className="text-sm text-muted-foreground">{label}</dt>
                    <dd className={`text-foreground capitalize ${mono ? 'font-mono text-sm' : ''}`}>{value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Total Users', value: users.length },
              { label: 'Administrators', value: users.filter(u => u.role === 'admin').length },
              { label: 'Regular Users', value: users.filter(u => u.role === 'user').length },
            ].map(({ label, value }) => (
              <Card key={label} className="p-4 bg-card/50 backdrop-blur border-border">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Videos Tab */}
        <TabsContent value="videos" className="space-y-4 mt-6">
          <Card className="p-4 bg-card/50 backdrop-blur border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search videos by title or location..."
                value={videoSearch}
                onChange={e => setVideoSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </Card>

          <Card className="bg-card/50 backdrop-blur border-border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVideos.map(video => (
                    <TableRow key={video.id}>
                      <TableCell className="font-medium">{video.title}</TableCell>
                      <TableCell>{video.location}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDate(video.timestamp)}</TableCell>
                      <TableCell><RiskBadge level={video.riskLevel} /></TableCell>
                      <TableCell>
                        <Badge variant={video.reviewed ? 'default' : 'secondary'}>
                          {video.reviewed ? 'Reviewed' : 'Pending'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Video</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{video.title}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteVideo(video.id)}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Total Videos', value: events.length },
              { label: 'Reviewed', value: events.filter(v => v.reviewed).length },
              { label: 'Pending Review', value: events.filter(v => !v.reviewed).length },
            ].map(({ label, value }) => (
              <Card key={label} className="p-4 bg-card/50 backdrop-blur border-border">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
