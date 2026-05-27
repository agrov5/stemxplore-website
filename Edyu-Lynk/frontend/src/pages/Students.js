import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, UserCheck, Eye, MoreVertical, Search, SortAsc, Columns } from 'lucide-react';

const Students = () => {
  const { user } = useAuth();
  const { currencySymbol } = useCurrency();
  const [students, setStudents] = useState([]);
  const [parents, setParents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [activeTab, setActiveTab] = useState('students');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Group Tag state
  const [groupOpen, setGroupOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [viewGroupOpen, setViewGroupOpen] = useState(false);
  const [viewingGroup, setViewingGroup] = useState(null);
  const [groupFormData, setGroupFormData] = useState({
    name: '',
    description: '',
    student_ids: [],
    color: '#FED7AA' // Default peach/beach color
  });
  
  // Color options for group tags
  const colorOptions = [
    { name: 'Beach', value: '#FED7AA' },
    { name: 'Sky', value: '#BAE6FD' },
    { name: 'Mint', value: '#A7F3D0' },
    { name: 'Lavender', value: '#DDD6FE' },
    { name: 'Rose', value: '#FECDD3' },
    { name: 'Amber', value: '#FDE68A' },
  ];
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    enrollment_date: new Date().toISOString().split('T')[0],
    class_type: 'paid',
    fee_amount: 0,
    class_ids: [],
    group_ids: []
  });

  useEffect(() => {
    fetchStudents();
    fetchParents();
    fetchClasses();
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await api.getStudentGroups();
      setGroups(response.data);
    } catch (error) {
      console.error('Failed to fetch groups');
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await api.getClasses();
      setClasses(response.data);
    } catch (error) {
      console.error('Failed to fetch classes');
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await api.getStudents();
      setStudents(response.data);
    } catch (error) {
      toast.error('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  const fetchParents = async () => {
    try {
      const response = await api.getParents();
      setParents(response.data);
    } catch (error) {
      console.error('Failed to fetch parents');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        enrollment_date: new Date(formData.enrollment_date).toISOString(),
        fee_amount: parseFloat(formData.fee_amount)
      };
      
      if (editingStudent) {
        await api.updateStudent(editingStudent.id, data);
        toast.success('Student updated successfully');
      } else {
        await api.createStudent(data);
        toast.success('Student created successfully');
      }
      
      setOpen(false);
      setEditingStudent(null);
      resetForm();
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleEdit = (student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      email: student.email,
      phone: student.phone,
      enrollment_date: new Date(student.enrollment_date).toISOString().split('T')[0],
      class_type: student.class_type,
      fee_amount: student.fee_amount,
      class_ids: student.class_ids || [],
      group_ids: student.group_ids || []
    });
    setOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await api.deleteStudent(id);
        toast.success('Student deleted successfully');
        fetchStudents();
      } catch (error) {
        toast.error('Failed to delete student');
      }
    }
  };

  const handleViewDetails = (student) => {
    setSelectedStudent(student);
    setDetailsOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      enrollment_date: new Date().toISOString().split('T')[0],
      class_type: 'paid',
      fee_amount: 0,
      class_ids: [],
      group_ids: []
    });
  };

  const getStudentParents = (studentId) => {
    return parents.filter(p => p.student_ids?.includes(studentId));
  };

  // Group Tag functions
  const handleGroupSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingGroup) {
        await api.updateStudentGroup(editingGroup.id, groupFormData);
        toast.success('Group tag updated successfully');
      } else {
        await api.createStudentGroup(groupFormData, user?.id || '');
        toast.success('Group tag created successfully');
      }
      setGroupOpen(false);
      setEditingGroup(null);
      resetGroupForm();
      fetchGroups();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleEditGroup = (group) => {
    setEditingGroup(group);
    setGroupFormData({
      name: group.name,
      description: group.description || '',
      student_ids: group.student_ids || [],
      color: group.color || '#FED7AA'
    });
    setGroupOpen(true);
  };

  const handleViewGroup = (group) => {
    setViewingGroup(group);
    setViewGroupOpen(true);
  };

  const handleDeleteGroup = async (id) => {
    if (window.confirm('Are you sure you want to delete this group tag?')) {
      try {
        await api.deleteStudentGroup(id);
        toast.success('Group tag deleted successfully');
        fetchGroups();
      } catch (error) {
        toast.error('Failed to delete group tag');
      }
    }
  };

  const resetGroupForm = () => {
    setGroupFormData({
      name: '',
      description: '',
      student_ids: [],
      color: '#FED7AA'
    });
  };

  const getGroupStudentNames = (studentIds) => {
    return studentIds
      .map(id => students.find(s => s.id === id)?.name)
      .filter(Boolean);
  };

  const getStudentGroups = (studentId) => {
    // Check group_ids on student first, then check groups that contain this student
    const student = students.find(s => s.id === studentId);
    const studentGroupIds = student?.group_ids || [];
    
    // Combine both sources
    const fromStudent = groups.filter(g => studentGroupIds.includes(g.id));
    const fromGroups = groups.filter(g => g.student_ids?.includes(studentId) && !studentGroupIds.includes(g.id));
    
    return [...fromStudent, ...fromGroups];
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div data-testid="students-page">
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight font-heading">Students</h1>
          <p className="text-sm sm:text-base leading-relaxed text-slate-600 mt-2">Manage student information and group tags</p>
        </div>

        {/* Tabs */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 sm:p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="students" data-testid="students-tab">Students</TabsTrigger>
              <TabsTrigger value="groups" data-testid="group-tags-tab" className="text-teal-600">Group Tags</TabsTrigger>
            </TabsList>

            {/* Students Tab */}
            <TabsContent value="students">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button
                      data-testid="add-student-button"
                      onClick={() => {
                        setEditingStudent(null);
                        resetForm();
                      }}
                      className="bg-primary hover:bg-primary-hover"
                    >
                      <Plus size={18} className="mr-2" />
                      Add Student
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>{editingStudent ? 'Edit Student' : 'Add New Student'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                      <div>
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          data-testid="student-name-input"
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
                          data-testid="student-email-input"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone">Phone</Label>
                        <Input
                          id="phone"
                          data-testid="student-phone-input"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          required
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="enrollment_date">Enrollment Date</Label>
                        <Input
                          id="enrollment_date"
                          type="date"
                          data-testid="student-enrollment-date-input"
                          value={formData.enrollment_date}
                          onChange={(e) => setFormData({ ...formData, enrollment_date: e.target.value })}
                          required
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="class_type">Class Type</Label>
                        <Select
                          value={formData.class_type}
                          onValueChange={(value) => setFormData({ ...formData, class_type: value })}
                        >
                          <SelectTrigger className="mt-1" data-testid="student-class-type-select">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="demo">Demo</SelectItem>
                            <SelectItem value="free">Free</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="fee_amount">Fee Amount ({currencySymbol})</Label>
                        <Input
                          id="fee_amount"
                          type="number"
                          data-testid="student-fee-amount-input"
                          value={formData.fee_amount}
                          onChange={(e) => setFormData({ ...formData, fee_amount: e.target.value })}
                          required
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Enrolled Classes (Hold Ctrl/Cmd for multiple)</Label>
                        <select
                          multiple
                          data-testid="student-classes-select"
                          value={formData.class_ids}
                          onChange={(e) => {
                            const selected = Array.from(e.target.selectedOptions, option => option.value);
                            setFormData({ ...formData, class_ids: selected });
                          }}
                          className="w-full mt-1 px-3 py-2 border rounded-md border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-900/10 transition-colors"
                          style={{ minHeight: '100px' }}
                        >
                          {classes.map(cls => (
                            <option key={cls.id} value={cls.id}>
                              {cls.name} - {cls.subject}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label>Group Tags</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {groups.map(group => (
                            <label
                              key={group.id}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                                formData.group_ids.includes(group.id)
                                  ? 'border-primary bg-primary/5'
                                  : 'border-slate-200 hover:border-primary/50'
                              }`}
                              style={{ backgroundColor: formData.group_ids.includes(group.id) ? group.color + '40' : undefined }}
                            >
                              <input
                                type="checkbox"
                                checked={formData.group_ids.includes(group.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({ ...formData, group_ids: [...formData.group_ids, group.id] });
                                  } else {
                                    setFormData({ ...formData, group_ids: formData.group_ids.filter(id => id !== group.id) });
                                  }
                                }}
                                className="sr-only"
                                data-testid={`student-group-checkbox-${group.id}`}
                              />
                              <span 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: group.color || '#FED7AA' }}
                              />
                              <span className="text-sm font-medium">{group.name}</span>
                            </label>
                          ))}
                        </div>
                        {groups.length === 0 && (
                          <p className="text-xs text-slate-500 mt-2">No group tags available. Create them in the Group Tags tab.</p>
                        )}
                      </div>
                      <Button type="submit" data-testid="student-submit-button" className="w-full bg-primary hover:bg-primary-hover">
                        {editingStudent ? 'Update Student' : 'Add Student'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Columns size={16} className="mr-2" />
                    Columns
                  </Button>
                  <Button variant="outline" size="sm">
                    <SortAsc size={16} className="mr-2" />
                    Sort
                  </Button>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-40"
                    />
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="p-8 text-center text-slate-500">Loading...</div>
              ) : filteredStudents.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No students found.</div>
              ) : (
                <div className="overflow-x-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="whitespace-nowrap font-semibold">Name</TableHead>
                        <TableHead className="whitespace-nowrap font-semibold">Email</TableHead>
                        <TableHead className="whitespace-nowrap font-semibold">Phone</TableHead>
                        <TableHead className="whitespace-nowrap font-semibold">Class Type</TableHead>
                        <TableHead className="whitespace-nowrap font-semibold">Group Tags</TableHead>
                        <TableHead className="whitespace-nowrap font-semibold">Fee Amount</TableHead>
                        <TableHead className="whitespace-nowrap font-semibold">Parents</TableHead>
                        <TableHead className="whitespace-nowrap font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map((student) => {
                        const studentParents = getStudentParents(student.id);
                        const studentGroups = getStudentGroups(student.id);
                        return (
                          <TableRow key={student.id} data-testid={`student-row-${student.id}`}>
                            <TableCell className="font-medium whitespace-nowrap">{student.name}</TableCell>
                            <TableCell className="whitespace-nowrap">{student.email}</TableCell>
                            <TableCell className="whitespace-nowrap">{student.phone}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                student.class_type === 'paid' ? 'bg-green-100 text-green-700' :
                                student.class_type === 'demo' ? 'bg-blue-100 text-blue-700' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {student.class_type.toUpperCase()}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {studentGroups.length > 0 ? (
                                  studentGroups.map(group => (
                                    <Badge 
                                      key={group.id}
                                      style={{ backgroundColor: group.color || '#FED7AA' }}
                                      className="text-slate-800 text-xs font-normal"
                                    >
                                      {group.name}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-xs text-slate-400">-</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{currencySymbol}{student.fee_amount.toLocaleString()}</TableCell>
                            <TableCell>
                              {studentParents.length > 0 ? (
                                <div className="flex items-center gap-1">
                                  <UserCheck size={14} className="text-blue-600" />
                                  <span className="text-sm">{studentParents.length}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">None</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  data-testid={`view-student-${student.id}`}
                                  onClick={() => handleViewDetails(student)}
                                >
                                  <Eye size={14} />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  data-testid={`edit-student-${student.id}`}
                                  onClick={() => handleEdit(student)}
                                >
                                  <Pencil size={14} />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  data-testid={`delete-student-${student.id}`}
                                  onClick={() => handleDelete(student.id)}
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Group Tags Tab */}
            <TabsContent value="groups">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <Dialog open={groupOpen} onOpenChange={setGroupOpen}>
                  <DialogTrigger asChild>
                    <Button
                      data-testid="add-group-tag-button"
                      onClick={() => {
                        setEditingGroup(null);
                        resetGroupForm();
                      }}
                      className="bg-teal-600 hover:bg-teal-700"
                    >
                      <Plus size={18} className="mr-2" />
                      Add Group Tag
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>{editingGroup ? 'Edit Group Tag' : 'Add Group Tag'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleGroupSubmit} className="space-y-4 mt-4">
                      <div>
                        <Label htmlFor="group-name">Name</Label>
                        <Input
                          id="group-name"
                          data-testid="group-name-input"
                          value={groupFormData.name}
                          onChange={(e) => setGroupFormData({ ...groupFormData, name: e.target.value })}
                          required
                          className="mt-1"
                          placeholder="e.g., Mechatronix"
                        />
                      </div>
                      <div>
                        <Label htmlFor="group-description">Description</Label>
                        <Textarea
                          id="group-description"
                          data-testid="group-description-input"
                          value={groupFormData.description}
                          onChange={(e) => setGroupFormData({ ...groupFormData, description: e.target.value })}
                          className="mt-1"
                          rows={2}
                          placeholder="Optional description"
                        />
                      </div>
                      <div>
                        <Label>Color</Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {colorOptions.map((color) => (
                            <button
                              key={color.value}
                              type="button"
                              onClick={() => setGroupFormData({ ...groupFormData, color: color.value })}
                              className={`w-10 h-10 rounded-lg border-2 transition-all ${
                                groupFormData.color === color.value 
                                  ? 'border-slate-900 scale-110' 
                                  : 'border-transparent hover:scale-105'
                              }`}
                              style={{ backgroundColor: color.value }}
                              title={color.name}
                            />
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label>Students (Hold Ctrl/Cmd for multiple)</Label>
                        <select
                          multiple
                          data-testid="group-students-select"
                          value={groupFormData.student_ids}
                          onChange={(e) => {
                            const selected = Array.from(e.target.selectedOptions, option => option.value);
                            setGroupFormData({ ...groupFormData, student_ids: selected });
                          }}
                          className="w-full mt-1 px-3 py-2 border rounded-md border-slate-200 bg-slate-50 focus:bg-white transition-colors"
                          style={{ minHeight: '120px' }}
                        >
                          {students.map(student => (
                            <option key={student.id} value={student.id}>
                              {student.name}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-slate-500 mt-1">
                          {groupFormData.student_ids.length} students selected
                        </p>
                      </div>
                      <Button type="submit" data-testid="group-submit-button" className="w-full bg-teal-600 hover:bg-teal-700">
                        {editingGroup ? 'Update Group Tag' : 'Add Group Tag'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Columns size={16} className="mr-2" />
                    Columns
                  </Button>
                  <Button variant="outline" size="sm">
                    <SortAsc size={16} className="mr-2" />
                    Sort
                  </Button>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-40"
                    />
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="p-8 text-center text-slate-500">Loading...</div>
              ) : filteredGroups.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No group tags found. Create your first group tag!</div>
              ) : (
                <div className="overflow-x-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50">
                        <TableHead className="whitespace-nowrap font-semibold">Name</TableHead>
                        <TableHead className="font-semibold">Students</TableHead>
                        <TableHead className="whitespace-nowrap font-semibold">Color</TableHead>
                        <TableHead className="whitespace-nowrap font-semibold text-center">Number of Students</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGroups.map((group) => {
                        const studentNames = getGroupStudentNames(group.student_ids);
                        return (
                          <TableRow key={group.id} data-testid={`group-row-${group.id}`}>
                            <TableCell className="font-medium whitespace-nowrap">{group.name}</TableCell>
                            <TableCell className="max-w-md">
                              <span className="text-sm text-slate-600">
                                {studentNames.length > 0 
                                  ? studentNames.join('; ') + ';'
                                  : <span className="text-slate-400">No students</span>
                                }
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                style={{ backgroundColor: group.color || '#FED7AA' }}
                                className="text-slate-800 font-normal"
                              >
                                {colorOptions.find(c => c.value === group.color)?.name || 'Beach'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              {group.student_ids?.length || 0}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  data-testid={`view-group-${group.id}`}
                                  onClick={() => handleViewGroup(group)}
                                  title="View Details"
                                >
                                  <Eye size={14} className="text-blue-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  data-testid={`edit-group-${group.id}`}
                                  onClick={() => handleEditGroup(group)}
                                  title="Edit"
                                >
                                  <Pencil size={14} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  data-testid={`delete-group-${group.id}`}
                                  onClick={() => handleDeleteGroup(group.id)}
                                  title="Delete"
                                >
                                  <Trash2 size={14} className="text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Group Tag View Dialog */}
        <Dialog open={viewGroupOpen} onOpenChange={setViewGroupOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {viewingGroup && (
                  <Badge 
                    style={{ backgroundColor: viewingGroup.color || '#FED7AA' }}
                    className="text-slate-800 font-normal"
                  >
                    {viewingGroup.name}
                  </Badge>
                )}
                Group Tag Details
              </DialogTitle>
            </DialogHeader>
            {viewingGroup && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-500">Name</p>
                  <p className="font-medium text-lg">{viewingGroup.name}</p>
                </div>
                
                {viewingGroup.description && (
                  <div>
                    <p className="text-sm text-slate-500">Description</p>
                    <p className="text-slate-700">{viewingGroup.description}</p>
                  </div>
                )}
                
                <div>
                  <p className="text-sm text-slate-500 mb-2">
                    Students ({viewingGroup.student_ids?.length || 0})
                  </p>
                  {viewingGroup.student_ids?.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {viewingGroup.student_ids.map(studentId => {
                        const student = students.find(s => s.id === studentId);
                        return student ? (
                          <div 
                            key={studentId} 
                            className="flex items-center justify-between p-2 bg-slate-50 rounded border"
                          >
                            <div>
                              <p className="font-medium">{student.name}</p>
                              <p className="text-xs text-slate-500">{student.email}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setViewGroupOpen(false);
                                setSelectedStudent(student);
                                setDetailsOpen(true);
                              }}
                            >
                              <Eye size={14} />
                            </Button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm">No students in this group</p>
                  )}
                </div>
                
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setViewGroupOpen(false)}>
                    Close
                  </Button>
                  <Button onClick={() => {
                    setViewGroupOpen(false);
                    handleEditGroup(viewingGroup);
                  }}>
                    <Pencil size={14} className="mr-2" />
                    Edit Group
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Student Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Student Details</DialogTitle>
            </DialogHeader>
            {selectedStudent && (
              <div className="space-y-6" data-testid="student-details">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500">Name</p>
                    <p className="font-medium">{selectedStudent.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Email</p>
                    <p className="font-medium">{selectedStudent.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Phone</p>
                    <p className="font-medium">{selectedStudent.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Class Type</p>
                    <p className="font-medium">{selectedStudent.class_type.toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Fee Amount</p>
                    <p className="font-medium">{currencySymbol}{selectedStudent.fee_amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Enrollment Date</p>
                    <p className="font-medium">{new Date(selectedStudent.enrollment_date).toLocaleDateString()}</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <UserCheck size={20} className="text-blue-600" />
                    Parent Information
                  </h3>
                  {getStudentParents(selectedStudent.id).length > 0 ? (
                    <div className="space-y-3">
                      {getStudentParents(selectedStudent.id).map((parent) => (
                        <div key={parent.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs text-slate-500">Name</p>
                              <p className="font-medium text-sm">{parent.name}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Relationship</p>
                              <p className="font-medium text-sm capitalize">{parent.relationship}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Email</p>
                              <p className="font-medium text-sm">{parent.email}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Phone</p>
                              <p className="font-medium text-sm">{parent.phone}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">No parent information available</p>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Students;