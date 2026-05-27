import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/services/api';
import { useCurrency } from '@/context/CurrencyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const COUNTRY_CODES = [
  { code: '+91', country: 'India' },
  { code: '+1', country: 'USA/Canada' },
  { code: '+44', country: 'UK' },
  { code: '+61', country: 'Australia' },
  { code: '+971', country: 'UAE' },
  { code: '+65', country: 'Singapore' },
  { code: '+60', country: 'Malaysia' },
  { code: '+49', country: 'Germany' },
  { code: '+33', country: 'France' },
  { code: '+81', country: 'Japan' },
  { code: '+86', country: 'China' },
  { code: '+82', country: 'South Korea' },
];

const Teachers = () => {
  const { formatAmount, currencySymbol } = useCurrency();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    country_code: '+91',
    subject: '',
    joining_date: new Date().toISOString().split('T')[0],
    fee_per_session: 0
  });

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    try {
      const response = await api.getTeachers();
      setTeachers(response.data);
    } catch (error) {
      toast.error('Failed to fetch teachers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        joining_date: new Date(formData.joining_date).toISOString(),
        fee_per_session: parseFloat(formData.fee_per_session) || 0
      };
      
      if (editingTeacher) {
        await api.updateTeacher(editingTeacher.id, data);
        toast.success('Teacher updated successfully');
      } else {
        await api.createTeacher(data);
        toast.success('Teacher created successfully');
      }
      
      setOpen(false);
      setEditingTeacher(null);
      resetForm();
      fetchTeachers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleEdit = (teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      name: teacher.name,
      email: teacher.email,
      phone: teacher.phone,
      country_code: teacher.country_code || '+91',
      subject: teacher.subject,
      joining_date: new Date(teacher.joining_date).toISOString().split('T')[0],
      fee_per_session: teacher.fee_per_session || 0
    });
    setOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this teacher?')) {
      try {
        await api.deleteTeacher(id);
        toast.success('Teacher deleted successfully');
        fetchTeachers();
      } catch (error) {
        toast.error('Failed to delete teacher');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      country_code: '+91',
      subject: '',
      joining_date: new Date().toISOString().split('T')[0],
      fee_per_session: 0
    });
  };

  const formatPhone = (countryCode, phone) => {
    if (!phone) return '-';
    return `${countryCode || ''} ${phone}`;
  };

  return (
    <DashboardLayout>
      <div data-testid="teachers-page">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight font-heading">Teachers</h1>
            <p className="text-base leading-relaxed text-slate-600 mt-2">Manage teacher information and subjects</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                data-testid="add-teacher-button"
                onClick={() => {
                  setEditingTeacher(null);
                  resetForm();
                }}
                className="bg-primary hover:bg-primary-hover"
              >
                <Plus size={18} className="mr-2" />
                Add Teacher
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}</DialogTitle>
                <DialogDescription className="text-sm text-slate-500">
                  {editingTeacher ? 'Update teacher details below.' : 'Fill in the details to add a new teacher.'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    data-testid="teacher-name-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    data-testid="teacher-email-input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <div className="flex gap-2 mt-1">
                    <Select
                      value={formData.country_code}
                      onValueChange={(value) => setFormData({ ...formData, country_code: value })}
                    >
                      <SelectTrigger className="w-32" data-testid="teacher-country-code-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRY_CODES.map(({ code, country }) => (
                          <SelectItem key={code} value={code}>
                            {code} {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      id="phone"
                      data-testid="teacher-phone-input"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                      placeholder="Phone number"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    data-testid="teacher-subject-input"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="fee_per_session">Fee per Session ({currencySymbol})</Label>
                  <Input
                    id="fee_per_session"
                    type="number"
                    step="0.01"
                    data-testid="teacher-fee-input"
                    value={formData.fee_per_session}
                    onChange={(e) => setFormData({ ...formData, fee_per_session: e.target.value })}
                    placeholder="0.00"
                    className="mt-1"
                  />
                  <p className="text-xs text-slate-500 mt-1">Amount paid to teacher per class/session</p>
                </div>
                <div>
                  <Label htmlFor="joining_date">Joining Date</Label>
                  <Input
                    id="joining_date"
                    type="date"
                    data-testid="teacher-joining-date-input"
                    value={formData.joining_date}
                    onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <Button type="submit" data-testid="teacher-submit-button" className="w-full bg-primary hover:bg-primary-hover">
                  {editingTeacher ? 'Update Teacher' : 'Add Teacher'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : teachers.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No teachers found. Add your first teacher!</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Fee/Session</TableHead>
                    <TableHead>Joining Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachers.map((teacher) => (
                    <TableRow key={teacher.id} data-testid={`teacher-row-${teacher.id}`}>
                      <TableCell className="font-medium">{teacher.name}</TableCell>
                      <TableCell>{teacher.email}</TableCell>
                      <TableCell>{formatPhone(teacher.country_code, teacher.phone)}</TableCell>
                      <TableCell>{teacher.subject}</TableCell>
                      <TableCell>
                        {teacher.fee_per_session ? formatAmount(teacher.fee_per_session) : '-'}
                      </TableCell>
                      <TableCell>{new Date(teacher.joining_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            data-testid={`edit-teacher-${teacher.id}`}
                            onClick={() => handleEdit(teacher)}
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            data-testid={`delete-teacher-${teacher.id}`}
                            onClick={() => handleDelete(teacher.id)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Teachers;
