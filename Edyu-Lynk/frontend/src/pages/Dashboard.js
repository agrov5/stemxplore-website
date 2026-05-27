import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/services/api';
import { useCurrency } from '@/context/CurrencyContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Users, GraduationCap, BookOpen, TrendingUp, DollarSign, Calendar, ArrowRight, Edit, ClipboardCheck, X } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const { formatAmount, currencySymbol } = useCurrency();
  const [stats, setStats] = useState(null);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [pastEvents, setPastEvents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Dialogs
  const [showRevenueDialog, setShowRevenueDialog] = useState(false);
  const [showEventsDialog, setShowEventsDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEventActionsDialog, setShowEventActionsDialog] = useState(false);
  const [eventTabView, setEventTabView] = useState('upcoming'); // 'upcoming' or 'past'

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, eventsRes, classesRes, studentsRes] = await Promise.all([
        api.getDashboardStats(),
        api.getEvents(),
        api.getClasses(),
        api.getStudents()
      ]);
      setStats(statsRes.data);
      
      // Separate past and upcoming events
      const now = new Date();
      const allEvents = eventsRes.data;
      
      // Upcoming events (next events)
      const upcoming = allEvents
        .filter(event => new Date(event.start_date) >= now)
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
        .slice(0, 5);
      setUpcomingEvents(upcoming);
      
      // Past events (last 5)
      const past = allEvents
        .filter(event => new Date(event.start_date) < now)
        .sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
        .slice(0, 5);
      setPastEvents(past);
      
      // Enrich classes with student count and total fees
      const enrichedClasses = classesRes.data.map(cls => {
        const classStudents = studentsRes.data.filter(s => 
          s.class_ids?.includes(cls.id) || cls.student_ids?.includes(s.id)
        );
        const totalFee = classStudents.reduce((sum, s) => sum + (s.fee_amount || 0), 0);
        return {
          ...cls,
          studentCount: classStudents.length,
          totalFee
        };
      });
      setClasses(enrichedClasses);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Students',
      value: stats?.total_students || 0,
      icon: Users,
      color: 'text-primary',
      bg: 'bg-blue-50',
      link: '/students'
    },
    {
      title: 'Total Teachers',
      value: stats?.total_teachers || 0,
      icon: GraduationCap,
      color: 'text-accent',
      bg: 'bg-orange-50',
      link: '/teachers'
    },
    {
      title: 'Total Classes',
      value: stats?.total_classes || 0,
      icon: BookOpen,
      color: 'text-success',
      bg: 'bg-green-50',
      link: '/classes'
    },
    {
      title: 'Attendance Rate',
      value: `${stats?.attendance_rate || 0}%`,
      icon: TrendingUp,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      link: '/attendance'
    },
    {
      title: 'Fee Collected',
      value: formatAmount(stats?.total_fee_collected || 0),
      icon: DollarSign,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      link: '/fees'
    }
  ];

  const getEventTypeColor = (type) => {
    switch (type) {
      case 'exam': return 'bg-red-100 text-red-700';
      case 'holiday': return 'bg-green-100 text-green-700';
      case 'meeting': return 'bg-orange-100 text-orange-700';
      case 'class': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setShowEventActionsDialog(true);
  };

  const handleAttendEvent = () => {
    setShowEventActionsDialog(false);
    // Navigate to attendance with event context
    navigate(`/attendance?event_id=${selectedEvent.id}&date=${selectedEvent.start_date?.split('T')[0]}`);
  };

  const handleEditEvent = () => {
    setShowEventActionsDialog(false);
    navigate(`/calendar?event_id=${selectedEvent.id}`);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-slate-500">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div data-testid="dashboard-page">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight font-heading">Dashboard</h1>
          <p className="text-sm sm:text-base leading-relaxed text-slate-600 mt-2">Welcome back! Here's an overview of your coaching center</p>
        </div>

        {/* Stat Cards - Clickable */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-8">
          {statCards.map((stat, index) => (
            <div key={index} className="col-span-1">
              <Card 
                className="bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-primary/50"
                onClick={() => navigate(stat.link)}
                data-testid={`stat-card-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-[10px] sm:text-xs text-slate-500 font-semibold tracking-wider uppercase mb-1 whitespace-nowrap">{stat.title}</p>
                      <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 font-heading">{stat.value}</p>
                    </div>
                    <div className={`${stat.bg} p-3 sm:p-4 rounded-md flex-shrink-0`}>
                      <stat.icon className={stat.color} size={24} strokeWidth={1.5} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Two Column Layout for Additional Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expected Revenue Card - Clickable */}
          <Card 
            className="bg-white border border-slate-200 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-all"
            onClick={() => setShowRevenueDialog(true)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-heading flex items-center gap-2">
                <DollarSign className="text-emerald-600" size={20} />
                Expected Revenue (This Month)
                <ArrowRight size={16} className="ml-auto text-slate-400" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">
                {formatAmount(stats?.expected_revenue || 0)}
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Based on {stats?.total_students || 0} enrolled students • Click for details
              </p>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Cash Balance</span>
                  <span className="font-medium">{formatAmount(stats?.cash_balance || 0)}</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-slate-600">Bank Balance</span>
                  <span className="font-medium">{formatAmount(stats?.bank_balance || 0)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Events Card - Clickable */}
          <Card 
            className="bg-white border border-slate-200 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-all"
            onClick={() => setShowEventsDialog(true)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-heading flex items-center gap-2">
                  <Calendar className="text-primary" size={20} />
                  Events
                </CardTitle>
                <span className="text-sm text-primary flex items-center gap-1">
                  View All <ArrowRight size={14} />
                </span>
              </div>
              {/* Event Tabs */}
              <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                <button
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    eventTabView === 'upcoming' 
                      ? 'bg-primary text-white' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  onClick={() => setEventTabView('upcoming')}
                >
                  Next 5
                </button>
                <button
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    eventTabView === 'past' 
                      ? 'bg-primary text-white' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  onClick={() => setEventTabView('past')}
                >
                  Past 5
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {eventTabView === 'upcoming' ? (
                upcomingEvents.length === 0 ? (
                  <p className="text-slate-500 text-sm py-4">No upcoming events</p>
                ) : (
                  <div className="space-y-3">
                    {upcomingEvents.slice(0, 5).map((event) => (
                      <div 
                        key={event.id} 
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                        onClick={(e) => { e.stopPropagation(); handleEventClick(event); }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">{event.title}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(event.start_date).toLocaleDateString()} at {new Date(event.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getEventTypeColor(event.event_type)}`}>
                          {event.event_type}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                pastEvents.length === 0 ? (
                  <p className="text-slate-500 text-sm py-4">No past events</p>
                ) : (
                  <div className="space-y-3">
                    {pastEvents.slice(0, 5).map((event) => (
                      <div 
                        key={event.id} 
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                        onClick={(e) => { e.stopPropagation(); handleEventClick(event); }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">{event.title}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(event.start_date).toLocaleDateString()} at {new Date(event.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getEventTypeColor(event.event_type)}`}>
                          {event.event_type}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </div>

        {/* Revenue Details Dialog */}
        <Dialog open={showRevenueDialog} onOpenChange={setShowRevenueDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="text-emerald-600" size={24} />
                Revenue Breakdown by Class
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
                <div className="text-2xl font-bold text-emerald-700">{formatAmount(stats?.expected_revenue || 0)}</div>
                <p className="text-sm text-emerald-600">Total Expected Revenue</p>
              </div>
              
              <div className="space-y-3">
                {classes.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">No classes found</p>
                ) : (
                  classes.map((cls) => (
                    <div 
                      key={cls.id} 
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                      onClick={() => navigate(`/classes`)}
                    >
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{cls.name}</p>
                        <p className="text-sm text-slate-500">{cls.subject} • {cls.schedule}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-emerald-600">{formatAmount(cls.totalFee)}</p>
                        <p className="text-xs text-slate-500">{cls.studentCount} students</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRevenueDialog(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Events List Dialog */}
        <Dialog open={showEventsDialog} onOpenChange={setShowEventsDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="text-primary" size={24} />
                Upcoming Events
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4 space-y-3">
              {upcomingEvents.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No upcoming events</p>
              ) : (
                upcomingEvents.map((event) => (
                  <div 
                    key={event.id} 
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                    onClick={() => {
                      setShowEventsDialog(false);
                      handleEventClick(event);
                    }}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">{event.title}</p>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getEventTypeColor(event.event_type)}`}>
                          {event.event_type}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        {new Date(event.start_date).toLocaleDateString()} at {new Date(event.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {event.description && (
                        <p className="text-sm text-slate-600 mt-1 line-clamp-1">{event.description}</p>
                      )}
                    </div>
                    <ArrowRight size={20} className="text-slate-400 flex-shrink-0" />
                  </div>
                ))
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEventsDialog(false)}>Close</Button>
              <Button onClick={() => { setShowEventsDialog(false); navigate('/calendar'); }}>
                Go to Calendar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Event Actions Dialog */}
        <Dialog open={showEventActionsDialog} onOpenChange={setShowEventActionsDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedEvent?.title}</DialogTitle>
            </DialogHeader>
            {selectedEvent && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getEventTypeColor(selectedEvent.event_type)}`}>
                    {selectedEvent.event_type}
                  </span>
                  <span className="text-sm text-slate-500">
                    {new Date(selectedEvent.start_date).toLocaleDateString()} at {new Date(selectedEvent.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {selectedEvent.description && (
                  <p className="text-sm text-slate-600 mb-4">{selectedEvent.description}</p>
                )}
                <div className="space-y-3">
                  <Button 
                    className="w-full justify-start" 
                    onClick={handleAttendEvent}
                  >
                    <ClipboardCheck size={18} className="mr-2" />
                    Mark Attendance
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={handleEditEvent}
                  >
                    <Edit size={18} className="mr-2" />
                    View/Edit Event
                  </Button>
                </div>
              </div>
            )}
            <DialogFooter className="mt-4">
              <Button variant="ghost" onClick={() => setShowEventActionsDialog(false)}>
                <X size={16} className="mr-2" />
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
