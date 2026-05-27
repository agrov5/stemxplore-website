import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Clock, Gift, Users, CheckSquare, Square, Calendar, ArrowRight, GraduationCap } from 'lucide-react';

const Attendance = () => {
  const [searchParams] = useSearchParams();
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceData, setAttendanceData] = useState({});
  const [teacherAttendanceData, setTeacherAttendanceData] = useState({});
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('class'); // 'class' or 'event'
  const [attendanceTab, setAttendanceTab] = useState('students'); // 'students' or 'teachers'
  
  // Bulk selection state
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [bulkStatus, setBulkStatus] = useState('present');
  const [bulkNoChargeReason, setBulkNoChargeReason] = useState('');
  
  // No charge dialog
  const [showNoChargeDialog, setShowNoChargeDialog] = useState(false);
  const [noChargeStudentId, setNoChargeStudentId] = useState(null);
  const [noChargeReason, setNoChargeReason] = useState('trial');

  const fetchAttendance = useCallback(async () => {
    try {
      const params = {
        date: selectedDate
      };
      if (viewMode === 'class' && selectedClass) {
        params.class_id = selectedClass;
      } else if (viewMode === 'event' && selectedEvent) {
        params.class_id = selectedEvent.class_id || selectedEvent.id;
      }
      
      const response = await api.getAttendance(params);
      const attendanceMap = {};
      const teacherAttendanceMap = {};
      
      response.data.forEach(record => {
        if (record.attendance_type === 'teacher' && record.teacher_id) {
          teacherAttendanceMap[record.teacher_id] = {
            status: record.status,
            no_charge_reason: record.no_charge_reason
          };
        } else if (record.student_id) {
          attendanceMap[record.student_id] = {
            status: record.status,
            no_charge_reason: record.no_charge_reason
          };
        }
      });
      setAttendanceData(attendanceMap);
      setTeacherAttendanceData(teacherAttendanceMap);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  }, [selectedClass, selectedEvent, selectedDate, viewMode]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    // Check URL params for event-based attendance
    const eventId = searchParams.get('event_id');
    const date = searchParams.get('date');
    if (eventId) {
      setViewMode('event');
      if (date) setSelectedDate(date);
    }
  }, [searchParams]);

  useEffect(() => {
    if ((viewMode === 'class' && selectedClass) || (viewMode === 'event' && selectedEvent)) {
      fetchAttendance();
    }
  }, [selectedClass, selectedEvent, selectedDate, fetchAttendance, viewMode]);

  // Compute distinct event-dates for the selected class (sorted desc — most recent first).
  // We convert to LOCAL date (not UTC) so the dropdown matches the date users see on event cards.
  const classEventDates = useMemo(() => {
    if (!selectedClass) return [];
    const dates = new Set();
    events.forEach(ev => {
      if (ev.class_id !== selectedClass || !ev.start_date) return;
      const d = new Date(ev.start_date);
      const y = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const da = String(d.getDate()).padStart(2, '0');
      dates.add(`${y}-${mo}-${da}`);
    });
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  }, [events, selectedClass]);

  const formatLocalDateLabel = (ymd) => {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  // When class changes (or its event list changes), auto-pick the most recent event date
  // that is on/before today. Falls back to most recent overall, then today.
  useEffect(() => {
    if (viewMode !== 'class' || !selectedClass || classEventDates.length === 0) return;
    if (classEventDates.includes(selectedDate)) return; // already valid
    const today = new Date().toISOString().split('T')[0];
    const pastOrToday = classEventDates.find(d => d <= today);
    setSelectedDate(pastOrToday || classEventDates[0]);
  }, [selectedClass, classEventDates, viewMode, selectedDate]);

  const fetchData = async () => {
    try {
      const [studentsRes, teachersRes, classesRes, eventsRes] = await Promise.all([
        api.getStudents(),
        api.getTeachers(),
        api.getClasses(),
        api.getEvents()
      ]);
      setStudents(studentsRes.data);
      setTeachers(teachersRes.data);
      setClasses(classesRes.data);
      
      // Keep all events (past + future) so class-date dropdown can show actual scheduled dates.
      const allEvents = (eventsRes.data || []).sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
      setEvents(allEvents);
      
      // Check URL params
      const eventId = searchParams.get('event_id');
      if (eventId) {
        const event = eventsRes.data.find(e => e.id === eventId);
        if (event) {
          setSelectedEvent(event);
          setViewMode('event');
        }
      } else if (classesRes.data.length > 0) {
        setSelectedClass(classesRes.data[0].id);
      }
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const getStudentsForAttendance = () => {
    if (viewMode === 'event' && selectedEvent) {
      // Union: class students ∪ explicit participants — students are linked to both.
      const ids = new Set();
      if (selectedEvent.class_id) {
        const eventClass = classes.find(c => c.id === selectedEvent.class_id);
        (eventClass?.student_ids || []).forEach(id => ids.add(id));
      }
      (selectedEvent.participants || []).forEach(id => ids.add(id));
      // Filter participants down to actual students (not teachers) — event.participants
      // can contain teacher IDs too.
      const studentIds = new Set(students.map(s => s.id));
      return students.filter(s => ids.has(s.id) && studentIds.has(s.id));
    }
    if (viewMode === 'class' && selectedClass) {
      const classObj = classes.find(c => c.id === selectedClass);
      const sids = classObj?.student_ids || [];
      return students.filter(s => sids.includes(s.id));
    }
    return [];
  };

  const getTeachersForAttendance = () => {
    if (viewMode === 'event' && selectedEvent) {
      // Get teachers from event's class
      if (selectedEvent.class_id) {
        const eventClass = classes.find(c => c.id === selectedEvent.class_id);
        if (eventClass?.teacher_ids?.length > 0) {
          return teachers.filter(t => eventClass.teacher_ids.includes(t.id));
        }
      }
      // Check participants for teachers
      if (selectedEvent.participants?.length > 0) {
        return teachers.filter(t => selectedEvent.participants.includes(t.id));
      }
      return [];
    } else if (viewMode === 'class' && selectedClass) {
      const classObj = classes.find(c => c.id === selectedClass);
      if (classObj?.teacher_ids?.length > 0) {
        return teachers.filter(t => classObj.teacher_ids.includes(t.id));
      }
    }
    return [];
  };

  const handleTeacherStatusSelect = async (teacherId, newStatus) => {
    try {
      const classId = viewMode === 'event' && selectedEvent 
        ? (selectedEvent.class_id || selectedEvent.id) 
        : selectedClass;
        
      await api.markAttendance({
        teacher_id: teacherId,
        class_id: classId,
        date: selectedDate,
        status: newStatus,
        attendance_type: 'teacher'
      });
      setTeacherAttendanceData({ 
        ...teacherAttendanceData, 
        [teacherId]: { status: newStatus }
      });
      toast.success(`Teacher marked as ${newStatus.replace('_', ' ')}`);
    } catch (error) {
      toast.error('Failed to mark teacher attendance');
    }
  };

  const handleStudentStatusSelect = async (studentId, newStatus) => {
    if (newStatus === 'present_no_charge') {
      setNoChargeStudentId(studentId);
      setNoChargeReason('trial');
      setShowNoChargeDialog(true);
      return;
    }
    
    try {
      const classId = viewMode === 'event' && selectedEvent 
        ? (selectedEvent.class_id || selectedEvent.id) 
        : selectedClass;
        
      await api.markAttendance({
        student_id: studentId,
        class_id: classId,
        date: selectedDate,
        status: newStatus,
        no_charge_reason: null,
        attendance_type: 'student'
      });
      setAttendanceData({ 
        ...attendanceData, 
        [studentId]: { status: newStatus, no_charge_reason: null }
      });
      toast.success(`Marked as ${newStatus.replace('_', ' ')}`);
    } catch (error) {
      toast.error('Failed to mark attendance');
    }
  };

  const handleNoChargeConfirm = async () => {
    try {
      const classId = viewMode === 'event' && selectedEvent 
        ? (selectedEvent.class_id || selectedEvent.id) 
        : selectedClass;
        
      await api.markAttendance({
        student_id: noChargeStudentId,
        class_id: classId,
        date: selectedDate,
        status: 'present_no_charge',
        no_charge_reason: noChargeReason
      });
      setAttendanceData({ 
        ...attendanceData, 
        [noChargeStudentId]: { status: 'present_no_charge', no_charge_reason: noChargeReason }
      });
      toast.success('Marked as Present (No Charge)');
      setShowNoChargeDialog(false);
      setNoChargeStudentId(null);
    } catch (error) {
      toast.error('Failed to mark attendance');
    }
  };

  const toggleStudentSelection = (studentId) => {
    const newSelection = new Set(selectedStudents);
    if (newSelection.has(studentId)) {
      newSelection.delete(studentId);
    } else {
      newSelection.add(studentId);
    }
    setSelectedStudents(newSelection);
  };

  const selectAllStudents = () => {
    const allIds = new Set(getStudentsForAttendance().map(s => s.id));
    setSelectedStudents(allIds);
  };

  const deselectAllStudents = () => {
    setSelectedStudents(new Set());
  };

  const handleBulkMarkSubmit = async () => {
    if (selectedStudents.size === 0) {
      toast.error('Please select at least one student');
      return;
    }

    try {
      const classId = viewMode === 'event' && selectedEvent 
        ? (selectedEvent.class_id || selectedEvent.id) 
        : selectedClass;
        
      const records = Array.from(selectedStudents).map(studentId => ({
        student_id: studentId,
        status: bulkStatus,
        no_charge_reason: bulkStatus === 'present_no_charge' ? bulkNoChargeReason : null
      }));

      const result = await api.bulkMarkAttendance({
        class_id: classId,
        date: selectedDate,
        records
      });

      toast.success(`Successfully marked ${result.data.success} students`);
      
      const newAttendanceData = { ...attendanceData };
      selectedStudents.forEach(studentId => {
        newAttendanceData[studentId] = {
          status: bulkStatus,
          no_charge_reason: bulkStatus === 'present_no_charge' ? bulkNoChargeReason : null
        };
      });
      setAttendanceData(newAttendanceData);
      
      setShowBulkDialog(false);
      setBulkMode(false);
      setSelectedStudents(new Set());
    } catch (error) {
      toast.error('Failed to mark bulk attendance');
    }
  };

  const handleMarkAllWithStatus = async (status) => {
    try {
      const classId = viewMode === 'event' && selectedEvent 
        ? (selectedEvent.class_id || selectedEvent.id) 
        : selectedClass;
      const reason = status === 'present_no_charge' ? bulkNoChargeReason : null;
      const result = await api.markAllAttendance(classId, selectedDate, status, reason);
      
      toast.success(`Marked ${result.data.success} students as ${status.replace('_', ' ')}`);
      await fetchAttendance();
      setShowBulkDialog(false);
    } catch (error) {
      toast.error('Failed to mark all attendance');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="text-green-600" size={24} strokeWidth={2} />;
      case 'absent':
        return <XCircle className="text-red-600" size={24} strokeWidth={2} />;
      case 'late':
        return <Clock className="text-yellow-600" size={24} strokeWidth={2} />;
      case 'present_no_charge':
        return <Gift className="text-purple-600" size={24} strokeWidth={2} />;
      default:
        return <div className="w-6 h-6 rounded-full border-2 border-slate-300" />;
    }
  };

  const getStatusStyles = (status) => {
    switch (status) {
      case 'present':
        return 'border-green-500 bg-green-50';
      case 'absent':
        return 'border-red-500 bg-red-50';
      case 'late':
        return 'border-yellow-500 bg-yellow-50';
      case 'present_no_charge':
        return 'border-purple-500 bg-purple-50';
      default:
        return 'border-slate-200 bg-white hover:border-primary';
    }
  };

  const getReasonLabel = (reason) => {
    const labels = {
      'trial': 'Trial Class',
      'makeup': 'Makeup Session',
      'scholarship': 'Scholarship',
      'free_session': 'Free Session',
      'other': 'Other'
    };
    return labels[reason] || reason;
  };

  const getEventTypeColor = (type) => {
    switch (type) {
      case 'exam': return 'bg-red-100 text-red-700';
      case 'holiday': return 'bg-green-100 text-green-700';
      case 'meeting': return 'bg-orange-100 text-orange-700';
      case 'class': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const displayStudents = getStudentsForAttendance();
  const displayTeachers = getTeachersForAttendance();

  return (
    <DashboardLayout>
      <div data-testid="attendance-page">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight font-heading">Attendance</h1>
          <p className="text-sm sm:text-base leading-relaxed text-slate-600 mt-2">Click on a card to choose attendance status. Changes save automatically.</p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex gap-2 mb-4">
          <Button 
            variant={viewMode === 'class' ? 'default' : 'outline'}
            onClick={() => { setViewMode('class'); setSelectedEvent(null); }}
          >
            By Class
          </Button>
          <Button 
            variant={viewMode === 'event' ? 'default' : 'outline'}
            onClick={() => setViewMode('event')}
          >
            By Event
          </Button>
        </div>

        {/* Events List (when in event mode) */}
        {viewMode === 'event' && (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 mb-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Calendar size={18} className="text-primary" />
              Select Event to Mark Attendance
            </h3>
            {events.length === 0 ? (
              <p className="text-slate-500 text-sm">No upcoming events</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {events.slice(0, 6).map((event) => (
                  <Card 
                    key={event.id}
                    className={`cursor-pointer transition-all ${selectedEvent?.id === event.id ? 'ring-2 ring-primary border-primary' : 'hover:border-primary/50'}`}
                    onClick={() => {
                      setSelectedEvent(event);
                      if (event.start_date) {
                        const d = new Date(event.start_date);
                        const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                        setSelectedDate(ymd);
                      }
                    }}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">{event.title}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(event.start_date).toLocaleDateString()} • {new Date(event.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getEventTypeColor(event.event_type)}`}>
                          {event.event_type}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Class/Date Selection */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {viewMode === 'class' && (
              <div>
                <Label htmlFor="class">Select Class</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger id="class" className="mt-1" data-testid="attendance-class-select">
                    <SelectValue placeholder="Choose a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} - {cls.subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {viewMode === 'event' && selectedEvent && (
              <div>
                <Label>Selected Event</Label>
                <div className="mt-1 p-2 bg-primary/5 border border-primary/20 rounded-md">
                  <p className="font-medium">{selectedEvent.title}</p>
                  <p className="text-xs text-slate-500">{selectedEvent.event_type}</p>
                </div>
              </div>
            )}
            <div>
              <Label htmlFor="date">Date</Label>
              {viewMode === 'class' && selectedClass ? (
                classEventDates.length > 0 ? (
                  <Select value={selectedDate} onValueChange={setSelectedDate}>
                    <SelectTrigger id="date" className="mt-1" data-testid="attendance-date-select">
                      <SelectValue placeholder="Choose an event date" />
                    </SelectTrigger>
                    <SelectContent>
                      {classEventDates.map(d => (
                        <SelectItem key={d} value={d}>
                          {formatLocalDateLabel(d)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="mt-1 p-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md" data-testid="no-events-warning">
                    No events scheduled for this class. Create an event in Calendar first.
                  </div>
                )
              ) : (
                <Input
                  id="date"
                  type="date"
                  data-testid="attendance-date-input"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="mt-1"
                />
              )}
            </div>
            <div className="flex items-end gap-2">
              <Button
                variant={bulkMode ? "default" : "outline"}
                onClick={() => {
                  setBulkMode(!bulkMode);
                  if (bulkMode) {
                    setSelectedStudents(new Set());
                  }
                }}
                data-testid="toggle-bulk-mode-btn"
                className="flex-1"
              >
                <Users className="w-4 h-4 mr-2" />
                {bulkMode ? 'Exit Bulk Mode' : 'Bulk Mode'}
              </Button>
            </div>
          </div>
          
          {bulkMode && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-900" data-testid="bulk-mode-hint">
                <span className="font-semibold">Bulk Mode:</span> Click student cards to select them, then click <span className="font-semibold">Mark Selected</span> to apply a status to all. To mark a single student, click <span className="font-semibold">Exit Bulk Mode</span>.
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={selectAllStudents} data-testid="select-all-btn">
                  <CheckSquare className="w-4 h-4 mr-1" /> Select All
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAllStudents} data-testid="deselect-all-btn">
                  <Square className="w-4 h-4 mr-1" /> Deselect All
                </Button>
                <span className="text-sm text-slate-600 mx-2">{selectedStudents.size} selected</span>
                <Button variant="default" size="sm" onClick={() => setShowBulkDialog(true)} disabled={selectedStudents.size === 0} data-testid="bulk-mark-btn">
                  Mark Selected ({selectedStudents.size})
                </Button>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : (viewMode === 'event' && !selectedEvent) ? (
          <div className="p-8 text-center text-slate-500 bg-white rounded-lg border border-slate-200">
            Select an event above to mark attendance
          </div>
        ) : (
          <>
            {/* Attendance Legend */}
            <div className="flex flex-wrap gap-3 sm:gap-4 mb-4 sm:mb-6 p-3 sm:p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="text-green-600" size={18} />
                <span className="text-xs sm:text-sm font-medium text-slate-700">Present</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="text-red-600" size={18} />
                <span className="text-xs sm:text-sm font-medium text-slate-700">Absent</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="text-yellow-600" size={18} />
                <span className="text-xs sm:text-sm font-medium text-slate-700">Late</span>
              </div>
              <div className="flex items-center gap-2">
                <Gift className="text-purple-600" size={18} />
                <span className="text-xs sm:text-sm font-medium text-slate-700">Present (No Charge)</span>
              </div>
            </div>

            {/* Tabs for Students and Teachers */}
            <Tabs value={attendanceTab} onValueChange={setAttendanceTab} className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2 mb-4">
                <TabsTrigger value="students" className="flex items-center gap-2">
                  <Users size={16} />
                  Students ({displayStudents.length})
                </TabsTrigger>
                <TabsTrigger value="teachers" className="flex items-center gap-2">
                  <GraduationCap size={16} />
                  Teachers ({displayTeachers.length})
                </TabsTrigger>
              </TabsList>

              {/* Students Tab */}
              <TabsContent value="students">
                {displayStudents.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 bg-white rounded-lg border border-slate-200">
                    No students assigned to this class/event
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                    {displayStudents.map((student) => {
                      const record = attendanceData[student.id] || {};
                      const status = record.status;
                      const isSelected = selectedStudents.has(student.id);
                      
                      const cardButton = (
                        <button
                          key={student.id}
                          data-testid={`attendance-card-${student.id}`}
                          onClick={bulkMode ? () => toggleStudentSelection(student.id) : undefined}
                          className={`w-full p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md active:scale-95 relative ${
                            getStatusStyles(status)
                          } ${bulkMode && isSelected ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                        >
                          {bulkMode && (
                            <div className="absolute top-2 left-2">
                              <Checkbox checked={isSelected} className="pointer-events-none" />
                            </div>
                          )}
                          <div className="flex items-center justify-between mb-3">
                            <div className={`flex-1 text-left min-w-0 ${bulkMode ? 'pl-6' : ''}`}>
                              <h3 className="font-semibold text-slate-900 font-heading truncate">{student.name}</h3>
                              <p className="text-xs text-slate-500 truncate">{student.email}</p>
                            </div>
                            <div className="flex-shrink-0 ml-2">{getStatusIcon(status)}</div>
                          </div>
                          <div className="text-left">
                            <span className="text-xs font-medium text-slate-600">
                              {status ? status.replace('_', ' ').toUpperCase() : 'NOT MARKED'}
                            </span>
                            {status === 'present_no_charge' && record.no_charge_reason && (
                              <span className="block text-xs text-purple-600 mt-1">
                                ({getReasonLabel(record.no_charge_reason)})
                              </span>
                            )}
                          </div>
                        </button>
                      );

                      if (bulkMode) {
                        return <div key={student.id}>{cardButton}</div>;
                      }

                      return (
                        <Popover key={student.id}>
                          <PopoverTrigger asChild>{cardButton}</PopoverTrigger>
                          <PopoverContent className="w-56 p-2 bg-white border-slate-200 shadow-lg" align="start">
                            <div className="text-xs font-semibold text-slate-500 px-2 py-1">Set status</div>
                            <button
                              type="button"
                              data-testid={`status-present-${student.id}`}
                              onClick={() => handleStudentStatusSelect(student.id, 'present')}
                              className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-green-50 text-left"
                            >
                              <CheckCircle className="text-green-600" size={18} />
                              <span className="text-sm">Present</span>
                            </button>
                            <button
                              type="button"
                              data-testid={`status-absent-${student.id}`}
                              onClick={() => handleStudentStatusSelect(student.id, 'absent')}
                              className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-red-50 text-left"
                            >
                              <XCircle className="text-red-600" size={18} />
                              <span className="text-sm">Absent</span>
                            </button>
                            <button
                              type="button"
                              data-testid={`status-late-${student.id}`}
                              onClick={() => handleStudentStatusSelect(student.id, 'late')}
                              className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-yellow-50 text-left"
                            >
                              <Clock className="text-yellow-600" size={18} />
                              <span className="text-sm">Late</span>
                            </button>
                            <button
                              type="button"
                              data-testid={`status-no-charge-${student.id}`}
                              onClick={() => handleStudentStatusSelect(student.id, 'present_no_charge')}
                              className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-purple-50 text-left"
                            >
                              <Gift className="text-purple-600" size={18} />
                              <span className="text-sm">Present (No Charge)</span>
                            </button>
                          </PopoverContent>
                        </Popover>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* Teachers Tab */}
              <TabsContent value="teachers">
                {displayTeachers.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 bg-white rounded-lg border border-slate-200">
                    No teachers assigned to this class/event
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                    {displayTeachers.map((teacher) => {
                      const record = teacherAttendanceData[teacher.id] || {};
                      const status = record.status;
                      
                      const teacherCardButton = (
                        <button
                          key={teacher.id}
                          data-testid={`teacher-attendance-card-${teacher.id}`}
                          className={`w-full p-4 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md active:scale-95 ${
                            getStatusStyles(status)
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex-1 text-left min-w-0">
                              <h3 className="font-semibold text-slate-900 font-heading truncate">{teacher.name}</h3>
                              <p className="text-xs text-slate-500 truncate">{teacher.subject}</p>
                            </div>
                            <div className="flex-shrink-0 ml-2">{getStatusIcon(status)}</div>
                          </div>
                          <div className="text-left">
                            <span className="text-xs font-medium text-slate-600">
                              {status ? status.replace('_', ' ').toUpperCase() : 'NOT MARKED'}
                            </span>
                          </div>
                        </button>
                      );

                      return (
                        <Popover key={teacher.id}>
                          <PopoverTrigger asChild>{teacherCardButton}</PopoverTrigger>
                          <PopoverContent className="w-56 p-2 bg-white border-slate-200 shadow-lg" align="start">
                            <div className="text-xs font-semibold text-slate-500 px-2 py-1">Set status</div>
                            <button
                              type="button"
                              data-testid={`teacher-status-present-${teacher.id}`}
                              onClick={() => handleTeacherStatusSelect(teacher.id, 'present')}
                              className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-green-50 text-left"
                            >
                              <CheckCircle className="text-green-600" size={18} />
                              <span className="text-sm">Present</span>
                            </button>
                            <button
                              type="button"
                              data-testid={`teacher-status-absent-${teacher.id}`}
                              onClick={() => handleTeacherStatusSelect(teacher.id, 'absent')}
                              className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-red-50 text-left"
                            >
                              <XCircle className="text-red-600" size={18} />
                              <span className="text-sm">Absent</span>
                            </button>
                            <button
                              type="button"
                              data-testid={`teacher-status-late-${teacher.id}`}
                              onClick={() => handleTeacherStatusSelect(teacher.id, 'late')}
                              className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-yellow-50 text-left"
                            >
                              <Clock className="text-yellow-600" size={18} />
                              <span className="text-sm">Late</span>
                            </button>
                          </PopoverContent>
                        </Popover>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* No Charge Reason Dialog */}
        <Dialog open={showNoChargeDialog} onOpenChange={setShowNoChargeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Present - No Charge</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Label>Reason for No Charge</Label>
              <Select value={noChargeReason} onValueChange={setNoChargeReason}>
                <SelectTrigger className="mt-2" data-testid="no-charge-reason-select">
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial/Demo Class</SelectItem>
                  <SelectItem value="makeup">Makeup Session</SelectItem>
                  <SelectItem value="scholarship">Scholarship</SelectItem>
                  <SelectItem value="free_session">Free Session</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNoChargeDialog(false)}>Cancel</Button>
              <Button onClick={handleNoChargeConfirm} data-testid="confirm-no-charge-btn">Confirm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Attendance Dialog */}
        <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Bulk Mark Attendance</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div>
                <Label>Status for Selected Students ({selectedStudents.size})</Label>
                <Select value={bulkStatus} onValueChange={setBulkStatus}>
                  <SelectTrigger className="mt-2" data-testid="bulk-status-select">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="present_no_charge">Present (No Charge)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {bulkStatus === 'present_no_charge' && (
                <div>
                  <Label>Reason for No Charge</Label>
                  <Select value={bulkNoChargeReason} onValueChange={setBulkNoChargeReason}>
                    <SelectTrigger className="mt-2" data-testid="bulk-no-charge-reason-select">
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="trial">Trial/Demo Class</SelectItem>
                      <SelectItem value="makeup">Makeup Session</SelectItem>
                      <SelectItem value="scholarship">Scholarship</SelectItem>
                      <SelectItem value="free_session">Free Session</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="pt-4 border-t">
                <p className="text-sm text-slate-600 mb-3">Quick Actions - Mark All Students:</p>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleMarkAllWithStatus('present')}
                    className="text-green-600 border-green-300 hover:bg-green-50"
                    data-testid="mark-all-present-btn"
                  >
                    <CheckCircle className="w-4 h-4 mr-1" /> All Present
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleMarkAllWithStatus('absent')}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                    data-testid="mark-all-absent-btn"
                  >
                    <XCircle className="w-4 h-4 mr-1" /> All Absent
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBulkDialog(false)}>Cancel</Button>
              <Button onClick={handleBulkMarkSubmit} disabled={selectedStudents.size === 0} data-testid="confirm-bulk-mark-btn">
                Mark {selectedStudents.size} Students
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Attendance;
