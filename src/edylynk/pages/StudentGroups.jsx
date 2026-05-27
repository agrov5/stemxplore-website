import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Trash2, Users, Pencil } from 'lucide-react';

const StudentGroups = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    student_ids: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [groupsRes, studentsRes] = await Promise.all([
        api.getStudentGroups(),
        api.getStudents()
      ]);
      setGroups(groupsRes.data);
      setStudents(studentsRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingGroup) {
        await api.updateStudentGroup(editingGroup.id, formData);
        toast.success('Group updated successfully');
      } else {
        await api.createStudentGroup(formData, user?.id || '');
        toast.success('Group created successfully');
      }
      setOpen(false);
      setEditingGroup(null);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleEdit = (group) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description,
      student_ids: group.student_ids || []
    });
    setOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this group?')) {
      try {
        await api.deleteStudentGroup(id);
        toast.success('Group deleted successfully');
        fetchData();
      } catch (error) {
        toast.error('Failed to delete group');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      student_ids: []
    });
  };

  const getStudentNames = (studentIds) => {
    return studentIds
      .map(id => students.find(s => s.id === id)?.name)
      .filter(Boolean);
  };

  return (
    <DashboardLayout>
      <div data-testid="student-groups-page">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight font-heading">Student Groups</h1>
            <p className="text-sm sm:text-base leading-relaxed text-slate-600 mt-2">Create groups for easy event scheduling and management</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                data-testid="add-group-button"
                onClick={() => {
                  setEditingGroup(null);
                  resetForm();
                }}
                className="bg-primary hover:bg-primary-hover w-full sm:w-auto"
              >
                <Plus size={18} className="mr-2" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingGroup ? 'Edit Group' : 'Create Student Group'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="name">Group Name</Label>
                  <Input
                    id="name"
                    data-testid="group-name-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="mt-1"
                    placeholder="e.g., Advanced Math Group"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    data-testid="group-description-input"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    className="mt-1"
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Students (Hold Ctrl/Cmd for multiple)</Label>
                  <select
                    multiple
                    data-testid="group-students-select"
                    value={formData.student_ids}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      setFormData({ ...formData, student_ids: selected });
                    }}
                    className="w-full mt-1 px-3 py-2 border rounded-md border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-900/10 transition-colors"
                    style={{ minHeight: '150px' }}
                  >
                    {students.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    {formData.student_ids.length} students selected
                  </p>
                </div>
                <Button type="submit" data-testid="group-submit-button" className="w-full bg-primary hover:bg-primary-hover">
                  {editingGroup ? 'Update Group' : 'Create Group'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {loading ? (
            <div className="col-span-full p-8 text-center text-slate-500">Loading...</div>
          ) : groups.length === 0 ? (
            <div className="col-span-full p-8 text-center text-slate-500 bg-white rounded-lg border border-slate-200">
              No groups created yet. Create your first student group!
            </div>
          ) : (
            groups.map((group) => (
              <Card key={group.id} data-testid={`group-card-${group.id}`} className="border-slate-200 hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-md">
                        <Users className="text-primary" size={20} />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-heading">{group.name}</CardTitle>
                        <p className="text-sm text-slate-500 mt-1">{group.student_ids.length} students</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid={`edit-group-${group.id}`}
                        onClick={() => handleEdit(group)}
                      >
                        <Pencil size={14} />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        data-testid={`delete-group-${group.id}`}
                        onClick={() => handleDelete(group.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 mb-3">{group.description}</p>
                  <div className="bg-slate-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                    <p className="text-xs font-medium text-slate-700 mb-2">Students:</p>
                    <div className="flex flex-wrap gap-2">
                      {getStudentNames(group.student_ids).map((name, idx) => (
                        <span key={idx} className="px-2 py-1 bg-white border border-slate-200 rounded text-xs">
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StudentGroups;