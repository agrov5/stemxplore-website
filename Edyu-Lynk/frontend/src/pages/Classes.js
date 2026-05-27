import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/services/api';
import { useCurrency } from '@/context/CurrencyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Calendar, Clock, AlertCircle } from 'lucide-react';

const DAYS_OF_WEEK = [
  { id: 'mon', label: 'Mon' },
  { id: 'tue', label: 'Tue' },
  { id: 'wed', label: 'Wed' },
  { id: 'thu', label: 'Thu' },
  { id: 'fri', label: 'Fri' },
  { id: 'sat', label: 'Sat' },
  { id: 'sun', label: 'Sun' },
];

const Classes = () => {
  const { formatAmount, currencySymbol } = useCurrency();
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [effectiveDateDialog, setEffectiveDateDialog] = useState(false);
  const [pendingFormData, setPendingFormData] = useState(null);
  const [effectiveDate, setEffectiveDate] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    class_type: 'paid',
    teacher_ids: [],
    student_ids: [],
    schedule: '',
    schedule_details: {
      days: [],
      start_time: '09:00',
      end_time: '10:00'
    },
    start_date: '',
    end_date: '',
    duration: '',
    duration_minutes: 60,
    standard_fee: 0
  });

  // Get terminology from settings
  const classLabel = settings?.terminology_class || 'Class';
  const classesLabel = settings?.terminology_classes || 'Classes';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [classesRes, teachersRes, studentsRes, settingsRes] = await Promise.all([
        api.getClasses(),
        api.getTeachers(),
        api.getStudents(),
        api.getSettings()
      ]);
      setClasses(classesRes.data);
      setTeachers(teachersRes.data);
      setStudents(studentsRes.data);
      setSettings(settingsRes.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate duration from start and end time
  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return { minutes: 60, display: '1 hour' };
    
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    let minutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    if (minutes < 0) minutes += 24 * 60; // Handle overnight classes
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    let display = '';
    if (hours > 0) display += `${hours} hour${hours > 1 ? 's' : ''}`;
    if (mins > 0) display += `${hours > 0 ? ' ' : ''}${mins} min`;
    if (!display) display = '0 min';
    
    return { minutes, display };
  };

  // Generate human-readable schedule string
  const generateScheduleString = (scheduleDetails) => {
    if (!scheduleDetails || !scheduleDetails.days || scheduleDetails.days.length === 0) {
      return '';
    }
    
    const dayLabels = scheduleDetails.days.map(d => {
      const day = DAYS_OF_WEEK.find(dw => dw.id === d);
      return day ? day.label : d;
    }).join(', ');
    
    const formatTime = (time) => {
      const [hour, min] = time.split(':');
      const h = parseInt(hour);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}:${min} ${ampm}`;
    };
    
    return `${dayLabels} ${formatTime(scheduleDetails.start_time)} - ${formatTime(scheduleDetails.end_time)}`;
  };

  const handleDayToggle = (dayId) => {
    setFormData(prev => {
      const currentDays = prev.schedule_details.days || [];
      const newDays = currentDays.includes(dayId)
        ? currentDays.filter(d => d !== dayId)
        : [...currentDays, dayId];
      
      const newScheduleDetails = { ...prev.schedule_details, days: newDays };
      const scheduleString = generateScheduleString(newScheduleDetails);
      
      return {
        ...prev,
        schedule_details: newScheduleDetails,
        schedule: scheduleString
      };
    });
  };

  const handleTimeChange = (field, value) => {
    setFormData(prev => {
      const newScheduleDetails = { ...prev.schedule_details, [field]: value };
      const scheduleString = generateScheduleString(newScheduleDetails);
      const duration = calculateDuration(newScheduleDetails.start_time, newScheduleDetails.end_time);
      
      return {
        ...prev,
        schedule_details: newScheduleDetails,
        schedule: scheduleString,
        duration: duration.display,
        duration_minutes: duration.minutes
      };
    });
  };

  const hasScheduleChanged = () => {
    if (!editingClass) return false;
    
    const oldSchedule = editingClass.schedule_details;
    const newSchedule = formData.schedule_details;
    
    // Compare days
    const oldDays = (oldSchedule?.days || []).sort().join(',');
    const newDays = (newSchedule?.days || []).sort().join(',');
    
    return (
      oldDays !== newDays ||
      oldSchedule?.start_time !== newSchedule?.start_time ||
      oldSchedule?.end_time !== newSchedule?.end_time ||
      editingClass.start_date !== formData.start_date ||
      editingClass.end_date !== formData.end_date
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // If editing and schedule changed, show effective date dialog
    if (editingClass && hasScheduleChanged()) {
      setPendingFormData({ ...formData });
      setEffectiveDate(formData.start_date || new Date().toISOString().split('T')[0]);
      setEffectiveDateDialog(true);
      return;
    }
    
    await submitForm(formData);
  };

  const submitForm = async (data, effectiveDateOverride = null) => {
    try {
      const submitData = { ...data };
      if (effectiveDateOverride) {
        submitData.effective_date = effectiveDateOverride;
      }
      
      if (editingClass) {
        await api.updateClass(editingClass.id, submitData);
        toast.success('Class updated successfully. Calendar events have been regenerated.');
      } else {
        await api.createClass(submitData);
        toast.success('Class created successfully. Calendar events have been generated.');
      }
      
      setOpen(false);
      setEditingClass(null);
      setEffectiveDateDialog(false);
      setPendingFormData(null);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleEffectiveDateConfirm = () => {
    if (pendingFormData) {
      submitForm(pendingFormData, effectiveDate);
    }
  };

  const handleEdit = (cls) => {
    setEditingClass(cls);
    setFormData({
      name: cls.name,
      subject: cls.subject,
      class_type: cls.class_type,
      teacher_ids: cls.teacher_ids,
      student_ids: cls.student_ids || [],
      schedule: cls.schedule || '',
      schedule_details: cls.schedule_details || {
        days: [],
        start_time: '09:00',
        end_time: '10:00'
      },
      start_date: cls.start_date || '',
      end_date: cls.end_date || '',
      duration: cls.duration || '',
      duration_minutes: cls.duration_minutes || 60,
      standard_fee: cls.standard_fee || 0
    });
    setOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm(`Are you sure you want to delete this ${classLabel.toLowerCase()}? This will also delete all associated calendar events.`)) {
      try {
        await api.deleteClass(id);
        toast.success(`${classLabel} and associated events deleted successfully`);
        fetchData();
      } catch (error) {
        toast.error(`Failed to delete ${classLabel.toLowerCase()}`);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      subject: '',
      class_type: 'paid',
      teacher_ids: [],
      student_ids: [],
      schedule: '',
      schedule_details: {
        days: [],
        start_time: '09:00',
        end_time: '10:00'
      },
      start_date: '',
      end_date: '',
      duration: '',
      duration_minutes: 60,
      standard_fee: 0
    });
  };

  const getTeacherNames = (teacherIds) => {
    return teacherIds
      .map(id => teachers.find(t => t.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  const formatDateRange = (startDate, endDate) => {
    if (!startDate && !endDate) return '-';
    const start = startDate ? new Date(startDate).toLocaleDateString() : 'N/A';
    const end = endDate ? new Date(endDate).toLocaleDateString() : 'N/A';
    return `${start} - ${end}`;
  };

  return (
    <DashboardLayout>
      <div data-testid="classes-page">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 tracking-tight font-heading">{classesLabel}</h1>
            <p className="text-base leading-relaxed text-slate-600 mt-2">Manage {classesLabel.toLowerCase()} and assign teachers</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                data-testid="add-class-button"
                onClick={() => {
                  setEditingClass(null);
                  resetForm();
                }}
                className="bg-primary hover:bg-primary-hover"
              >
                <Plus size={18} className="mr-2" />
                Add {classLabel}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingClass ? `Edit ${classLabel}` : `Add New ${classLabel}`}</DialogTitle>
                <DialogDescription className="text-sm text-slate-500">
                  {editingClass ? `Update the ${classLabel.toLowerCase()} details and schedule below.` : `Fill in the details to create a new ${classLabel.toLowerCase()}.`}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="name">{classLabel} Name</Label>
                  <Input
                    id="name"
                    data-testid="class-name-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    data-testid="class-subject-input"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="class_type">{classLabel} Type</Label>
                    <Select
                      value={formData.class_type}
                      onValueChange={(value) => setFormData({ ...formData, class_type: value })}
                    >
                      <SelectTrigger className="mt-1" data-testid="class-type-select">
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
                    <Label htmlFor="standard_fee">Standard Fee ({currencySymbol})</Label>
                    <Input
                      id="standard_fee"
                      type="number"
                      step="0.01"
                      data-testid="class-fee-input"
                      value={formData.standard_fee}
                      onChange={(e) => setFormData({ ...formData, standard_fee: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Schedule Section */}
                <div className="border border-slate-200 rounded-lg p-4 space-y-4 bg-slate-50/50">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Calendar size={18} />
                    <Label className="text-sm font-semibold">Schedule</Label>
                  </div>
                  
                  {/* Day Selection */}
                  <div>
                    <Label className="text-xs text-slate-500 mb-2 block">Select Days</Label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map((day) => (
                        <label
                          key={day.id}
                          className={`flex items-center justify-center px-3 py-2 rounded-md border cursor-pointer transition-colors ${
                            formData.schedule_details.days.includes(day.id)
                              ? 'bg-primary text-white border-primary'
                              : 'bg-white border-slate-200 hover:border-primary/50'
                          }`}
                        >
                          <Checkbox
                            checked={formData.schedule_details.days.includes(day.id)}
                            onCheckedChange={() => handleDayToggle(day.id)}
                            className="sr-only"
                            data-testid={`day-checkbox-${day.id}`}
                          />
                          <span className="text-sm font-medium">{day.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  
                  {/* Time Selection */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-slate-500 mb-1 block">Start Time</Label>
                      <div className="relative">
                        <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                          type="time"
                          value={formData.schedule_details.start_time}
                          onChange={(e) => handleTimeChange('start_time', e.target.value)}
                          className="pl-9"
                          data-testid="class-start-time"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500 mb-1 block">End Time</Label>
                      <div className="relative">
                        <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                          type="time"
                          value={formData.schedule_details.end_time}
                          onChange={(e) => handleTimeChange('end_time', e.target.value)}
                          className="pl-9"
                          data-testid="class-end-time"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Duration Display */}
                  {formData.duration && (
                    <div className="text-xs text-slate-500">
                      Duration: <span className="font-medium text-slate-700">{formData.duration}</span>
                    </div>
                  )}
                  
                  {/* Date Range */}
                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                    <div>
                      <Label className="text-xs text-slate-500 mb-1 block">Start Date</Label>
                      <Input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        className="text-sm"
                        data-testid="class-start-date"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500 mb-1 block">End Date</Label>
                      <Input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        className="text-sm"
                        data-testid="class-end-date"
                      />
                    </div>
                  </div>
                  
                  {/* Info Note */}
                  <div className="flex items-start gap-2 text-xs text-slate-500 bg-blue-50 p-2 rounded">
                    <AlertCircle size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                    <span>Calendar events will be automatically created based on this schedule.</span>
                  </div>
                </div>

                <div>
                  <Label>Teachers (Hold Ctrl/Cmd for multiple)</Label>
                  <select
                    multiple
                    data-testid="class-teachers-select"
                    value={formData.teacher_ids}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      setFormData({ ...formData, teacher_ids: selected });
                    }}
                    className="w-full mt-1 px-3 py-2 border rounded-md border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-900/10 transition-colors"
                    style={{ minHeight: '100px' }}
                  >
                    {teachers.map(teacher => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name} - {teacher.subject}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Students (Hold Ctrl/Cmd for multiple)</Label>
                  <select
                    multiple
                    data-testid="class-students-select"
                    value={formData.student_ids}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      setFormData({ ...formData, student_ids: selected });
                    }}
                    className="w-full mt-1 px-3 py-2 border rounded-md border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-900/10 transition-colors"
                    style={{ minHeight: '100px' }}
                  >
                    {students.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="submit" data-testid="class-submit-button" className="w-full bg-primary hover:bg-primary-hover">
                  {editingClass ? `Update ${classLabel}` : `Add ${classLabel}`}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Effective Date Dialog */}
        <Dialog open={effectiveDateDialog} onOpenChange={setEffectiveDateDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar size={20} className="text-primary" />
                Schedule Change Detected
              </DialogTitle>
              <DialogDescription>
                The schedule has been modified. From which date should the new schedule take effect?
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label className="text-sm text-slate-600 mb-2 block">Effective From</Label>
              <Input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full"
                data-testid="effective-date-input"
              />
              <p className="text-xs text-slate-500 mt-2">
                Existing events before this date will be preserved. Events from this date onwards will be regenerated based on the new schedule.
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setEffectiveDateDialog(false);
                  setPendingFormData(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEffectiveDateConfirm}
                className="bg-primary hover:bg-primary-hover"
                data-testid="confirm-effective-date"
              >
                Apply Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : classes.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No {classesLabel.toLowerCase()} found. Add your first {classLabel.toLowerCase()}!</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{classLabel} Name</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Date Range</TableHead>
                    <TableHead>Standard Fee</TableHead>
                    <TableHead>Teachers</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.map((cls) => (
                    <TableRow key={cls.id} data-testid={`class-row-${cls.id}`}>
                      <TableCell className="font-medium">{cls.name}</TableCell>
                      <TableCell>{cls.subject}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          cls.class_type === 'paid' ? 'bg-green-100 text-green-700' :
                          cls.class_type === 'demo' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {cls.class_type.toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {cls.schedule || '-'}
                      </TableCell>
                      <TableCell>{cls.duration || '-'}</TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {formatDateRange(cls.start_date, cls.end_date)}
                      </TableCell>
                      <TableCell>{cls.standard_fee ? formatAmount(cls.standard_fee) : '-'}</TableCell>
                      <TableCell>{getTeacherNames(cls.teacher_ids) || 'No teachers'}</TableCell>
                      <TableCell>
                        <span className="text-sm text-slate-600">
                          {cls.student_ids && cls.student_ids.length > 0 
                            ? `${cls.student_ids.length} students`
                            : 'No students'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            data-testid={`edit-class-${cls.id}`}
                            onClick={() => handleEdit(cls)}>
                            <Pencil size={14} />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            data-testid={`delete-class-${cls.id}`}
                            onClick={() => handleDelete(cls.id)}
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

export default Classes;
