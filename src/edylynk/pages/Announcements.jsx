import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Trash2, Megaphone, Mail } from 'lucide-react';

const Announcements = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    target_audience: 'all',
    send_email: false
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const response = await api.getAnnouncements();
      setAnnouncements(response.data);
    } catch (error) {
      toast.error('Failed to fetch announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.createAnnouncement(formData, user?.id || '');
      toast.success(formData.send_email 
        ? 'Announcement created and emails sent!' 
        : 'Announcement created successfully'
      );
      setOpen(false);
      resetForm();
      fetchAnnouncements();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create announcement');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this announcement?')) {
      try {
        await api.deleteAnnouncement(id);
        toast.success('Announcement deleted successfully');
        fetchAnnouncements();
      } catch (error) {
        toast.error('Failed to delete announcement');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      target_audience: 'all',
      send_email: false
    });
  };

  const getAudienceBadgeColor = (audience) => {
    switch(audience) {
      case 'students': return 'bg-blue-100 text-blue-700';
      case 'teachers': return 'bg-purple-100 text-purple-700';
      case 'parents': return 'bg-green-100 text-green-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <DashboardLayout>
      <div data-testid="announcements-page">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight font-heading">Announcements</h1>
            <p className="text-base leading-relaxed text-slate-600 mt-2">Broadcast important messages to students, teachers, and parents</p>
          </div>
          {user?.role === 'admin' && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button
                  data-testid="add-announcement-button"
                  onClick={resetForm}
                  className="bg-primary hover:bg-primary-hover"
                >
                  <Plus size={18} className="mr-2" />
                  Create Announcement
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Announcement</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      data-testid="announcement-title-input"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="content">Content</Label>
                    <Textarea
                      id="content"
                      data-testid="announcement-content-input"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      required
                      className="mt-1"
                      rows={5}
                    />
                  </div>
                  <div>
                    <Label htmlFor="target_audience">Target Audience</Label>
                    <Select
                      value={formData.target_audience}
                      onValueChange={(value) => setFormData({ ...formData, target_audience: value })}
                    >
                      <SelectTrigger className="mt-1" data-testid="announcement-audience-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Everyone</SelectItem>
                        <SelectItem value="students">Students Only</SelectItem>
                        <SelectItem value="teachers">Teachers Only</SelectItem>
                        <SelectItem value="parents">Parents Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Mail size={18} className="text-slate-600" />
                      <div>
                        <Label htmlFor="send_email" className="cursor-pointer">Send Email Notification</Label>
                        <p className="text-xs text-slate-500">Email will be sent to selected audience</p>
                      </div>
                    </div>
                    <Switch
                      id="send_email"
                      data-testid="announcement-send-email-switch"
                      checked={formData.send_email}
                      onCheckedChange={(checked) => setFormData({ ...formData, send_email: checked })}
                    />
                  </div>
                  <Button type="submit" data-testid="announcement-submit-button" className="w-full bg-primary hover:bg-primary-hover">
                    Create & {formData.send_email ? 'Send' : 'Post'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="p-8 text-center text-slate-500 bg-white rounded-lg border border-slate-200">Loading...</div>
          ) : announcements.length === 0 ? (
            <div className="p-8 text-center text-slate-500 bg-white rounded-lg border border-slate-200">
              No announcements yet. Create your first announcement!
            </div>
          ) : (
            announcements.map((announcement) => (
              <Card key={announcement.id} data-testid={`announcement-card-${announcement.id}`} className="border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Megaphone size={20} className="text-primary" />
                        <CardTitle className="text-xl font-heading">{announcement.title}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getAudienceBadgeColor(announcement.target_audience)}`}>
                          {announcement.target_audience.toUpperCase()}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(announcement.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    {user?.role === 'admin' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        data-testid={`delete-announcement-${announcement.id}`}
                        onClick={() => handleDelete(announcement.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-700 whitespace-pre-wrap">{announcement.content}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Announcements;