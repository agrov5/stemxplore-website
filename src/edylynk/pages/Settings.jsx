import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/services/api';
import { useCurrency } from '@/context/CurrencyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Building2, Mail, DollarSign, Bell, Upload, Wallet, FileText, Settings as SettingsIcon, Shield, Globe, Clock, Pencil } from 'lucide-react';

const Settings = () => {
  const { updateCurrency, currencySymbol } = useCurrency();
  
  // Center Info State
  const [centerInfo, setCenterInfo] = useState({
    name: 'CoachCenter',
    logo_url: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    country: 'Canada - English',
    timezone: '(UTC-05:00) Eastern Time (US & Canada)'
  });

  // General Settings State
  const [generalSettings, setGeneralSettings] = useState({
    check_scheduling_conflicts: true,
    enable_multi_timezone: false,
    tutor_name_format: 'First Last',
    student_name_format: 'Last, First'
  });

  // Accounts & Invoices Settings State
  const [accountsSettings, setAccountsSettings] = useState({
    payment_methods: ['Cash', 'Card', 'Bank Transfer', 'UPI'],
    default_balance_date: 'end_of_month',
    balance_day_of_month: 1,
    late_payment_fee_type: 'none',
    late_payment_fee_amount: 0,
    late_payment_fee_percentage: 0,
    send_sms_invoice_notifications: false,
    send_overdue_invoice_reminder: false,
    email_timeframe_start: '08:00',
    email_timeframe_end: '09:00',
    invoice_logo_url: '',
    invoice_name: 'Invoice'
  });

  // Email & SMS Settings State
  const [emailSettings, setEmailSettings] = useState({
    resend_api_key: '',
    business_email_address: '',
    use_business_name_as_sender: true,
    use_business_name_on_reminders: true,
    use_business_name_on_lesson_notes: false,
    send_birthday_emails: true,
    tutor_email_address: ''
  });

  // Policies Settings State
  const [policiesSettings, setPoliciesSettings] = useState({
    min_advance_booking_hours: 24,
    max_advance_booking_days: 60,
    weekly_slot_hold_days: 7,
    allow_booking_from: 'booking_form_and_portal',
    restrict_portal_to_makeup_credits: false,
    send_booking_notification: true,
    allow_portal_cancellation: true,
    log_cancellation_notification: true,
    cancellation_policy_text: '',
    cancellation_deadline_hours: 24
  });

  // Invoice Settings State
  const [invoiceSettings, setInvoiceSettings] = useState({
    invoice_company_name: 'CoachCenter',
    invoice_address: '',
    invoice_logo_url: '',
    invoice_payment_terms: '',
    invoice_default_comments: '',
    // Invoice Display Options
    show_class_details: true,
    show_tutor_details: true,
    show_session_date: true,
    show_session_time: true,
    show_duration: false,
    show_student_name_on_family: true,
    group_by_student: true,
    show_no_charge_items: true
  });

  // Opening Balances State
  const [openingBalances, setOpeningBalances] = useState({
    cash_balance: 0,
    bank_balance: 0,
    fee_receivable_opening: 0,
    fee_payable_opening: 0
  });

  // Terminology State
  const [terminology, setTerminology] = useState({
    class_label: 'Class',
    classes_label: 'Classes',
    subject_label: 'Subject'
  });

  // Currency State
  const [currency, setCurrency] = useState('INR');

  // Email Templates State
  const [emailTemplates, setEmailTemplates] = useState({
    automatic_payment_failed: { subject: 'Payment Failed', body: '' },
    bank_transfer_failed: { subject: 'Bank Transfer Failed', body: '' },
    birthday_email: { subject: 'Happy Birthday!', body: '' },
    event_cancelled: { subject: 'Event Cancelled', body: '' },
    event_reminder: { subject: 'Event Reminder', body: '' },
    invoice: { subject: 'Invoice', body: '' },
    invoice_reminder: { subject: 'Invoice Reminder', body: '' },
    lesson_notes: { subject: 'Lesson Notes', body: '' },
    new_file_added: { subject: 'New File Added', body: '' },
    payment: { subject: 'Payment Confirmation', body: '' }
  });

  // Notification Settings State
  const [notificationSettings, setNotificationSettings] = useState({
    email_enabled: true,
    invoice_email: true,
    payment_email: true,
    class_reminder_days: 1,
    fee_reminder_days: 7
  });

  const [newPaymentMethod, setNewPaymentMethod] = useState('');

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await api.getSettings();
        if (response.data) {
          const data = response.data;
          
          // General Settings
          setGeneralSettings({
            check_scheduling_conflicts: data.check_scheduling_conflicts ?? true,
            enable_multi_timezone: data.enable_multi_timezone ?? false,
            tutor_name_format: data.tutor_name_format || 'First Last',
            student_name_format: data.student_name_format || 'Last, First'
          });

          // Accounts & Invoices
          setAccountsSettings({
            payment_methods: data.payment_methods || ['Cash', 'Card', 'Bank Transfer', 'UPI'],
            default_balance_date: data.default_balance_date || 'end_of_month',
            balance_day_of_month: data.balance_day_of_month || 1,
            late_payment_fee_type: data.late_payment_fee_type || 'none',
            late_payment_fee_amount: data.late_payment_fee_amount || 0,
            late_payment_fee_percentage: data.late_payment_fee_percentage || 0,
            send_sms_invoice_notifications: data.send_sms_invoice_notifications ?? false,
            send_overdue_invoice_reminder: data.send_overdue_invoice_reminder ?? false,
            email_timeframe_start: data.email_timeframe_start || '08:00',
            email_timeframe_end: data.email_timeframe_end || '09:00',
            invoice_logo_url: data.invoice_logo_url || '',
            invoice_name: data.invoice_name || 'Invoice'
          });

          // Email Settings
          setEmailSettings({
            resend_api_key: data.resend_api_key || '',
            business_email_address: data.business_email_address || '',
            use_business_name_as_sender: data.use_business_name_as_sender ?? true,
            use_business_name_on_reminders: data.use_business_name_on_reminders ?? true,
            use_business_name_on_lesson_notes: data.use_business_name_on_lesson_notes ?? false,
            send_birthday_emails: data.send_birthday_emails ?? true,
            tutor_email_address: data.tutor_email_address || ''
          });

          // Policies
          setPoliciesSettings({
            min_advance_booking_hours: data.min_advance_booking_hours || 24,
            max_advance_booking_days: data.max_advance_booking_days || 60,
            weekly_slot_hold_days: data.weekly_slot_hold_days || 7,
            allow_booking_from: data.allow_booking_from || 'booking_form_and_portal',
            restrict_portal_to_makeup_credits: data.restrict_portal_to_makeup_credits ?? false,
            send_booking_notification: data.send_booking_notification ?? true,
            allow_portal_cancellation: data.allow_portal_cancellation ?? true,
            log_cancellation_notification: data.log_cancellation_notification ?? true,
            cancellation_policy_text: data.cancellation_policy_text || '',
            cancellation_deadline_hours: data.cancellation_deadline_hours || 24
          });

          // Invoice Settings
          setInvoiceSettings({
            invoice_company_name: data.invoice_company_name || 'CoachCenter',
            invoice_address: data.invoice_address || '',
            invoice_logo_url: data.invoice_logo_url || '',
            invoice_payment_terms: data.invoice_payment_terms || '',
            invoice_default_comments: data.invoice_default_comments || '',
            // Invoice Display Options
            show_class_details: data.show_class_details ?? true,
            show_tutor_details: data.show_tutor_details ?? true,
            show_session_date: data.show_session_date ?? true,
            show_session_time: data.show_session_time ?? true,
            show_duration: data.show_duration ?? false,
            show_student_name_on_family: data.show_student_name_on_family ?? true,
            group_by_student: data.group_by_student ?? true,
            show_no_charge_items: data.show_no_charge_items ?? true
          });

          // Opening Balances
          setOpeningBalances({
            cash_balance: data.cash_balance || 0,
            bank_balance: data.bank_balance || 0,
            fee_receivable_opening: data.fee_receivable_opening || 0,
            fee_payable_opening: data.fee_payable_opening || 0
          });

          // Terminology
          if (data.terminology_class) {
            setTerminology({
              class_label: data.terminology_class,
              classes_label: data.terminology_classes || 'Classes',
              subject_label: 'Subject'
            });
          }

          // Center Info
          setCenterInfo(prev => ({
            ...prev,
            name: data.center_name || data.invoice_company_name || prev.name,
            timezone: data.timezone || prev.timezone,
            address: data.business_address || prev.address,
            phone: data.business_phone || prev.phone,
            country: data.business_country || prev.country,
            logo_url: data.business_logo_url || prev.logo_url
          }));

          // Currency — server is source of truth
          if (data.currency) {
            setCurrency(data.currency);
            updateCurrency(data.currency);
            localStorage.setItem('currency', data.currency);
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };

    // Load from localStorage
    const savedCenter = localStorage.getItem('centerInfo');
    const savedCurrency = localStorage.getItem('currency');
    const savedTerminology = localStorage.getItem('terminology');
    const savedTemplates = localStorage.getItem('emailTemplates');
    const savedNotifications = localStorage.getItem('notificationSettings');

    if (savedCenter) setCenterInfo(JSON.parse(savedCenter));
    if (savedCurrency) setCurrency(savedCurrency);
    if (savedTerminology) setTerminology(JSON.parse(savedTerminology));
    if (savedTemplates) setEmailTemplates(JSON.parse(savedTemplates));
    if (savedNotifications) setNotificationSettings(JSON.parse(savedNotifications));

    loadSettings();
  }, []);

  // Save Functions
  const [centerEditOpen, setCenterEditOpen] = useState(false);
  const [syncingEnrolments, setSyncingEnrolments] = useState(false);

  const handleSyncClassEnrolments = async () => {
    setSyncingEnrolments(true);
    try {
      const res = await api.syncClassEnrolments();
      const d = res.data || {};
      toast.success(`Synced: ${d.classes_updated || 0} classes, ${d.students_updated || 0} students, ${d.events_updated || 0} events updated`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to sync class enrolments');
    } finally {
      setSyncingEnrolments(false);
    }
  };

  const handleCenterInfoSave = async () => {
    try {
      await api.updateSettings({
        center_name: centerInfo.name,
        invoice_company_name: centerInfo.name,
        timezone: centerInfo.timezone,
        business_address: centerInfo.address,
        business_phone: centerInfo.phone,
        business_country: centerInfo.country,
      });
      localStorage.setItem('centerInfo', JSON.stringify(centerInfo));
      toast.success('Business information saved successfully');
      setCenterEditOpen(false);
    } catch (error) {
      toast.error('Failed to save business information');
    }
  };

  const handleGeneralSettingsSave = async () => {
    try {
      await api.updateSettings(generalSettings);
      toast.success('General settings saved successfully');
    } catch (error) {
      toast.error('Failed to save general settings');
    }
  };

  const handleAccountsSettingsSave = async () => {
    try {
      await api.updateSettings(accountsSettings);
      toast.success('Accounts & Invoices settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  const handleEmailSettingsSave = async () => {
    try {
      await api.updateSettings(emailSettings);
      toast.success('Email settings saved successfully');
    } catch (error) {
      toast.error('Failed to save email settings');
    }
  };

  const handlePoliciesSettingsSave = async () => {
    try {
      await api.updateSettings(policiesSettings);
      toast.success('Policies saved successfully');
    } catch (error) {
      toast.error('Failed to save policies');
    }
  };

  const handleInvoiceSettingsSave = async () => {
    try {
      await api.updateSettings(invoiceSettings);
      toast.success('Invoice settings saved successfully');
    } catch (error) {
      toast.error('Failed to save invoice settings');
    }
  };

  const handleOpeningBalancesSave = async () => {
    try {
      await api.updateSettings(openingBalances);
      toast.success('Opening balances saved successfully');
    } catch (error) {
      toast.error('Failed to save opening balances');
    }
  };

  const handleTerminologySave = async () => {
    try {
      await api.updateSettings({
        terminology_class: terminology.class_label,
        terminology_classes: terminology.classes_label
      });
      localStorage.setItem('terminology', JSON.stringify(terminology));
      toast.success('Terminology saved successfully');
    } catch (error) {
      toast.error('Failed to save terminology');
    }
  };

  const handleCurrencySave = async () => {
    try {
      await api.updateSettings({ currency });
      localStorage.setItem('currency', currency);
      updateCurrency(currency);
      toast.success('Currency saved. New currency will appear for all users.');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save currency');
    }
  };

  const handleEmailTemplateSave = () => {
    localStorage.setItem('emailTemplates', JSON.stringify(emailTemplates));
    toast.success('Email templates saved successfully');
  };

  const handleNotificationSave = () => {
    localStorage.setItem('notificationSettings', JSON.stringify(notificationSettings));
    toast.success('Notification settings saved successfully');
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be smaller than 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result;
      setCenterInfo({ ...centerInfo, logo_url: dataUrl });
      try {
        await api.updateSettings({ business_logo_url: dataUrl });
        toast.success('Business logo uploaded successfully');
      } catch (err) {
        toast.error('Failed to save business logo');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBusinessLogoRemove = async () => {
    setCenterInfo({ ...centerInfo, logo_url: '' });
    try {
      await api.updateSettings({ business_logo_url: '' });
      toast.success('Business logo removed');
    } catch (err) {
      toast.error('Failed to remove business logo');
    }
  };

  const handleInvoiceLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be smaller than 2MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result;
      setAccountsSettings(prev => ({ ...prev, invoice_logo_url: dataUrl }));
      try {
        await api.updateSettings({ invoice_logo_url: dataUrl });
        toast.success('Invoice logo updated');
      } catch (err) {
        toast.error('Failed to save invoice logo');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleInvoiceLogoRemove = async () => {
    setAccountsSettings(prev => ({ ...prev, invoice_logo_url: '' }));
    try {
      await api.updateSettings({ invoice_logo_url: '' });
      toast.success('Invoice logo removed');
    } catch (err) {
      toast.error('Failed to remove invoice logo');
    }
  };

  const addPaymentMethod = () => {
    if (newPaymentMethod && !accountsSettings.payment_methods.includes(newPaymentMethod)) {
      setAccountsSettings({
        ...accountsSettings,
        payment_methods: [...accountsSettings.payment_methods, newPaymentMethod]
      });
      setNewPaymentMethod('');
    }
  };

  const removePaymentMethod = (method) => {
    setAccountsSettings({
      ...accountsSettings,
      payment_methods: accountsSettings.payment_methods.filter(m => m !== method)
    });
  };

  return (
    <DashboardLayout>
      <div data-testid="settings-page" className="max-w-7xl">
        {/* Header with Business Info Card */}
        <div className="flex gap-6 mb-6">
          {/* Left: Business Card */}
          <Card className="w-64 flex-shrink-0">
            <CardContent className="p-4">
              <div className="flex justify-end mb-2 gap-1">
                {centerInfo.logo_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBusinessLogoRemove}
                    data-testid="remove-business-logo-btn"
                    className="text-red-600 hover:text-red-700 text-xs"
                    title="Remove logo"
                  >
                    Remove
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setCenterEditOpen(true)} data-testid="edit-business-info-btn">
                  <Pencil size={16} />
                </Button>
              </div>
              <input
                id="business-logo-input"
                data-testid="business-logo-file-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
              <button
                type="button"
                onClick={() => document.getElementById('business-logo-input').click()}
                data-testid="business-logo-btn"
                className="block mx-auto mb-4 cursor-pointer group focus:outline-none"
                title={centerInfo.logo_url ? 'Click to change logo' : 'Click to upload logo'}
              >
                {centerInfo.logo_url ? (
                  <div className="relative">
                    <img src={centerInfo.logo_url} alt="Logo" className="w-24 h-24 object-contain" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition rounded flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Upload size={20} className="text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="w-24 h-24 bg-teal-100 rounded flex items-center justify-center group-hover:bg-teal-200 transition">
                    <div className="flex flex-col items-center">
                      <Upload size={20} className="text-teal-700" />
                      <span className="text-[10px] text-teal-700 mt-1">Upload logo</span>
                    </div>
                  </div>
                )}
              </button>
              <h2 className="font-bold text-lg text-center">{centerInfo.name}</h2>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Globe size={14} />
                  {centerInfo.country}
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} />
                  {centerInfo.timezone}
                </div>
                {centerInfo.phone && (
                  <div className="flex items-center gap-2">
                    <span>📞</span>
                    {centerInfo.phone}
                  </div>
                )}
                {centerInfo.address && (
                  <div className="flex items-center gap-2">
                    <span>📍</span>
                    {centerInfo.address}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Right: Main Settings Tabs */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight font-heading mb-4">Business Settings</h1>
            
            <Tabs defaultValue="general" className="space-y-4">
              <div className="overflow-x-auto -mx-1 px-1">
                <TabsList className="inline-flex w-max min-w-full bg-slate-100 p-1 gap-1">
                  <TabsTrigger value="general" data-testid="settings-tab-general" className="text-xs whitespace-nowrap px-3">
                    General
                  </TabsTrigger>
                  <TabsTrigger value="accounts" data-testid="settings-tab-accounts" className="text-xs whitespace-nowrap px-3">
                    Accounts &amp; Invoices
                  </TabsTrigger>
                  <TabsTrigger value="email" data-testid="settings-tab-email" className="text-xs whitespace-nowrap px-3">
                    Email &amp; SMS
                  </TabsTrigger>
                  <TabsTrigger value="policies" data-testid="settings-tab-policies" className="text-xs whitespace-nowrap px-3">
                    Policies
                  </TabsTrigger>
                  <TabsTrigger value="terminology" data-testid="settings-tab-terminology" className="text-xs whitespace-nowrap px-3">
                    Terminology
                  </TabsTrigger>
                  <TabsTrigger value="currency" data-testid="settings-tab-currency" className="text-xs whitespace-nowrap px-3">
                    Currency
                  </TabsTrigger>
                  <TabsTrigger value="notifications" data-testid="settings-tab-notifications" className="text-xs whitespace-nowrap px-3">
                    Alerts
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* General Tab */}
              <TabsContent value="general">
                <Card>
                  <CardContent className="p-6 space-y-6">
                    {/* Event Scheduling Section */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Event Scheduling</h3>
                      
                      <div className="space-y-4">
                        <div className="border-b pb-4">
                          <h4 className="font-medium mb-2">Scheduling Conflicts</h4>
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={generalSettings.check_scheduling_conflicts}
                              onCheckedChange={(checked) => setGeneralSettings({...generalSettings, check_scheduling_conflicts: checked})}
                              data-testid="scheduling-conflicts-checkbox"
                            />
                            <Label>Check for scheduling conflicts when adding/editing calendar events</Label>
                          </div>
                        </div>

                        <div className="border-b pb-4">
                          <h4 className="font-medium mb-2">Enable Multi-Time Zone Selection</h4>
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={generalSettings.enable_multi_timezone}
                              onCheckedChange={(checked) => setGeneralSettings({...generalSettings, enable_multi_timezone: checked})}
                              data-testid="multi-timezone-checkbox"
                            />
                            <div>
                              <Label>Allow tutors and students to select a different time zone than yours</Label>
                              <p className="text-xs text-slate-500">Use if you have remote tutors or students</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Naming Format Section */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Naming Format</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <Label className="font-medium">Tutor Name Format</Label>
                          <div className="flex gap-4 mt-2">
                            {['Last, First', 'First Last', 'Last First'].map((format) => (
                              <label key={format} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="tutor_name_format"
                                  value={format}
                                  checked={generalSettings.tutor_name_format === format}
                                  onChange={(e) => setGeneralSettings({...generalSettings, tutor_name_format: e.target.value})}
                                  className="text-teal-600"
                                />
                                <span>{format}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div>
                          <Label className="font-medium">Student Name Format</Label>
                          <div className="flex gap-4 mt-2">
                            {['Last, First', 'First Last', 'Last First'].map((format) => (
                              <label key={format} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="student_name_format"
                                  value={format}
                                  checked={generalSettings.student_name_format === format}
                                  onChange={(e) => setGeneralSettings({...generalSettings, student_name_format: e.target.value})}
                                  className="text-teal-600"
                                />
                                <span>{format}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button onClick={handleGeneralSettingsSave} className="bg-teal-600 hover:bg-teal-700">
                      Save Changes
                    </Button>

                    {/* Maintenance section */}
                    <div className="border-t border-slate-200 pt-6 mt-6">
                      <h3 className="text-lg font-semibold mb-2">Maintenance</h3>
                      <p className="text-sm text-slate-600 mb-3">
                        Re-link students, classes, and calendar events. Run this if a student's class enrolment is missing from a class or calendar event.
                      </p>
                      <Button
                        variant="outline"
                        data-testid="sync-class-enrolments-btn"
                        disabled={syncingEnrolments}
                        onClick={handleSyncClassEnrolments}
                      >
                        {syncingEnrolments ? 'Syncing...' : 'Sync Class Enrolments'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Accounts & Invoices Tab */}
              <TabsContent value="accounts">
                <Card>
                  <CardContent className="p-6 space-y-6">
                    {/* Family Account Section */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Family Account</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <Label className="font-medium">Payment Methods</Label>
                          <p className="text-xs text-slate-500 mb-2">Use a semicolon or press the Enter key to separate entries</p>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Add payment method"
                              value={newPaymentMethod}
                              onChange={(e) => setNewPaymentMethod(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPaymentMethod())}
                              className="flex-1"
                            />
                            <Button variant="outline" onClick={addPaymentMethod}>Add</Button>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {accountsSettings.payment_methods.map((method, idx) => (
                              <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-full text-sm">
                                {method}
                                <button onClick={() => removePaymentMethod(method)} className="text-slate-400 hover:text-slate-600">×</button>
                              </span>
                            ))}
                          </div>
                        </div>

                        <div>
                          <Label className="font-medium">Default Balance Date</Label>
                          <div className="space-y-2 mt-2">
                            {[
                              { value: 'today', label: 'Today' },
                              { value: 'end_of_month', label: 'End of month' },
                              { value: 'day_of_month', label: 'Day of month' },
                              { value: 'specific_date', label: 'Specific Date' }
                            ].map((option) => (
                              <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="default_balance_date"
                                  value={option.value}
                                  checked={accountsSettings.default_balance_date === option.value}
                                  onChange={(e) => setAccountsSettings({...accountsSettings, default_balance_date: e.target.value})}
                                  className="text-teal-600"
                                />
                                <span>{option.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Invoice Settings Section */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Invoice Settings</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <Label className="font-medium">Automatic Late Payment Fee</Label>
                          <div className="space-y-2 mt-2">
                            {[
                              { value: 'none', label: 'None' },
                              { value: 'fixed', label: 'Fixed amount ($)' },
                              { value: 'percentage', label: 'Percentage (%)' }
                            ].map((option) => (
                              <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name="late_payment_fee_type"
                                  value={option.value}
                                  checked={accountsSettings.late_payment_fee_type === option.value}
                                  onChange={(e) => setAccountsSettings({...accountsSettings, late_payment_fee_type: e.target.value})}
                                  className="text-teal-600"
                                />
                                <span>{option.label}</span>
                              </label>
                            ))}
                          </div>
                          {accountsSettings.late_payment_fee_type === 'fixed' && (
                            <Input
                              type="number"
                              placeholder="Amount"
                              value={accountsSettings.late_payment_fee_amount}
                              onChange={(e) => setAccountsSettings({...accountsSettings, late_payment_fee_amount: parseFloat(e.target.value)})}
                              className="mt-2 w-32"
                            />
                          )}
                          {accountsSettings.late_payment_fee_type === 'percentage' && (
                            <Input
                              type="number"
                              placeholder="Percentage"
                              value={accountsSettings.late_payment_fee_percentage}
                              onChange={(e) => setAccountsSettings({...accountsSettings, late_payment_fee_percentage: parseFloat(e.target.value)})}
                              className="mt-2 w-32"
                            />
                          )}
                        </div>

                        <div>
                          <Label className="font-medium">Notifications & Reminders</Label>
                          <div className="space-y-2 mt-2">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={accountsSettings.send_sms_invoice_notifications}
                                onCheckedChange={(checked) => setAccountsSettings({...accountsSettings, send_sms_invoice_notifications: checked})}
                              />
                              <Label>Send SMS invoice notifications and invoice reminders</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={accountsSettings.send_overdue_invoice_reminder}
                                onCheckedChange={(checked) => setAccountsSettings({...accountsSettings, send_overdue_invoice_reminder: checked})}
                              />
                              <Label>Send an overdue invoice reminder</Label>
                            </div>
                          </div>
                        </div>

                        <div>
                          <Label className="font-medium">Email Timeframe</Label>
                          <p className="text-xs text-slate-500 mb-2">Set what time your auto-invoices & automatic invoice reminder emails will be sent</p>
                          <div className="flex items-center gap-2">
                            <span>Between</span>
                            <Input
                              type="time"
                              value={accountsSettings.email_timeframe_start}
                              onChange={(e) => setAccountsSettings({...accountsSettings, email_timeframe_start: e.target.value})}
                              className="w-32"
                            />
                            <span>and</span>
                            <Input
                              type="time"
                              value={accountsSettings.email_timeframe_end}
                              onChange={(e) => setAccountsSettings({...accountsSettings, email_timeframe_end: e.target.value})}
                              className="w-32"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Invoice Formatting Section */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Invoice Formatting</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <Label>Invoice Logo</Label>
                          <p className="text-xs text-slate-500 mb-2">This logo will appear on all business reports such as invoices.</p>
                          <div className="flex items-center gap-4">
                            {accountsSettings.invoice_logo_url ? (
                              <img src={accountsSettings.invoice_logo_url} alt="Invoice Logo" className="w-20 h-20 object-contain border rounded" />
                            ) : (
                              <div className="w-20 h-20 border rounded flex items-center justify-center text-slate-400">
                                No logo
                              </div>
                            )}
                            <input
                              id="invoice-logo-input"
                              data-testid="invoice-logo-file-input"
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleInvoiceLogoUpload}
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              data-testid="edit-invoice-logo-btn"
                              onClick={() => document.getElementById('invoice-logo-input').click()}
                            >
                              <Pencil size={14} className="mr-2" />
                              {accountsSettings.invoice_logo_url ? 'Change' : 'Upload'}
                            </Button>
                            {accountsSettings.invoice_logo_url && (
                              <Button
                                variant="ghost"
                                size="sm"
                                data-testid="remove-invoice-logo-btn"
                                onClick={handleInvoiceLogoRemove}
                                className="text-red-600 hover:text-red-700"
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                        </div>

                        <div>
                          <Label>Invoice Name</Label>
                          <Input
                            value={accountsSettings.invoice_name}
                            onChange={(e) => setAccountsSettings({...accountsSettings, invoice_name: e.target.value})}
                            className="mt-1"
                            placeholder="Invoice"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Invoice Display Options Section */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Invoice Display Options</h3>
                      <p className="text-sm text-slate-500 mb-4">Control what details appear on generated invoices</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <h4 className="font-medium text-sm text-slate-700">Session Details</h4>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={invoiceSettings.show_class_details}
                              onCheckedChange={(checked) => setInvoiceSettings({...invoiceSettings, show_class_details: checked})}
                            />
                            <Label className="text-sm">Show class/course name</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={invoiceSettings.show_tutor_details}
                              onCheckedChange={(checked) => setInvoiceSettings({...invoiceSettings, show_tutor_details: checked})}
                            />
                            <Label className="text-sm">Show tutor/teacher name</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={invoiceSettings.show_session_date}
                              onCheckedChange={(checked) => setInvoiceSettings({...invoiceSettings, show_session_date: checked})}
                            />
                            <Label className="text-sm">Show session date</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={invoiceSettings.show_session_time}
                              onCheckedChange={(checked) => setInvoiceSettings({...invoiceSettings, show_session_time: checked})}
                            />
                            <Label className="text-sm">Show session time</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={invoiceSettings.show_duration}
                              onCheckedChange={(checked) => setInvoiceSettings({...invoiceSettings, show_duration: checked})}
                            />
                            <Label className="text-sm">Show duration</Label>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="font-medium text-sm text-slate-700">Family Invoice Options</h4>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={invoiceSettings.show_student_name_on_family}
                              onCheckedChange={(checked) => setInvoiceSettings({...invoiceSettings, show_student_name_on_family: checked})}
                            />
                            <Label className="text-sm">Show student name on family invoices</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={invoiceSettings.group_by_student}
                              onCheckedChange={(checked) => setInvoiceSettings({...invoiceSettings, group_by_student: checked})}
                            />
                            <Label className="text-sm">Group line items by student</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={invoiceSettings.show_no_charge_items}
                              onCheckedChange={(checked) => setInvoiceSettings({...invoiceSettings, show_no_charge_items: checked})}
                            />
                            <Label className="text-sm">Show no-charge sessions on invoice</Label>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline">Discard</Button>
                      <Button onClick={handleAccountsSettingsSave} className="bg-teal-600 hover:bg-teal-700">
                        Save Changes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Email & SMS Tab */}
              <TabsContent value="email">
                <Card>
                  <CardContent className="p-6 space-y-6">
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <p className="text-sm text-slate-600">
                        Send emails from CoachCenter using a generic business email address. Your business name will automatically be used as the sender.
                      </p>
                    </div>

                    <div>
                      <Label className="font-medium">Resend API Key</Label>
                      <Input
                        type="password"
                        value={emailSettings.resend_api_key}
                        onChange={(e) => setEmailSettings({...emailSettings, resend_api_key: e.target.value})}
                        className="mt-1 font-mono"
                        placeholder="re_xxxxxxxxxxxx"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Get your API key from <span className="font-medium">resend.com</span> → API Keys. Required to send emails.
                      </p>
                    </div>

                    <div>
                      <Label className="font-medium">Sender Email Address (From)</Label>
                      <Input
                        type="email"
                        value={emailSettings.business_email_address}
                        onChange={(e) => setEmailSettings({...emailSettings, business_email_address: e.target.value})}
                        className="mt-1"
                        placeholder="your@email.com"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Must be a domain verified in your Resend account. Leave blank to use the default Resend sender.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={emailSettings.use_business_name_as_sender}
                          onCheckedChange={(checked) => setEmailSettings({...emailSettings, use_business_name_as_sender: checked})}
                        />
                        <Label>Use business name as default sender</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={emailSettings.use_business_name_on_reminders}
                          onCheckedChange={(checked) => setEmailSettings({...emailSettings, use_business_name_on_reminders: checked})}
                        />
                        <Label>Use business name & email on reminders</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={emailSettings.use_business_name_on_lesson_notes}
                          onCheckedChange={(checked) => setEmailSettings({...emailSettings, use_business_name_on_lesson_notes: checked})}
                        />
                        <Label>Use business name & email on lesson notes</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={emailSettings.send_birthday_emails}
                          onCheckedChange={(checked) => setEmailSettings({...emailSettings, send_birthday_emails: checked})}
                        />
                        <Label>Send birthday emails</Label>
                      </div>
                    </div>

                    {/* System Email Templates */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">System Email Templates</h3>
                      <div className="space-y-2">
                        {Object.entries(emailTemplates).map(([key, template]) => (
                          <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                            <Button variant="ghost" size="sm">
                              <Pencil size={14} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline">Discard</Button>
                      <Button onClick={handleEmailSettingsSave} className="bg-teal-600 hover:bg-teal-700">
                        Save Changes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Policies Tab */}
              <TabsContent value="policies">
                <Card>
                  <CardContent className="p-6 space-y-6">
                    {/* Booking Policy */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Booking Policy</h3>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                          <div>
                            <Label className="font-medium">Minimum advance booking time</Label>
                            <p className="text-xs text-slate-500">Sets the minimum amount of time required before an event or lesson for students to book through the Student Portal or booking form.</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setPoliciesSettings({...policiesSettings, min_advance_booking_hours: Math.max(0, policiesSettings.min_advance_booking_hours - 1)})}>-</Button>
                            <Input
                              type="number"
                              value={policiesSettings.min_advance_booking_hours}
                              onChange={(e) => setPoliciesSettings({...policiesSettings, min_advance_booking_hours: parseInt(e.target.value)})}
                              className="w-20 text-center"
                            />
                            <span>hours</span>
                            <Button variant="outline" size="sm" onClick={() => setPoliciesSettings({...policiesSettings, min_advance_booking_hours: policiesSettings.min_advance_booking_hours + 1})}>+</Button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                          <div>
                            <Label className="font-medium">Maximum advance booking time</Label>
                            <p className="text-xs text-slate-500">Sets the maximum amount of time in advance that students can book an event or lesson through the Student Portal or booking form.</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setPoliciesSettings({...policiesSettings, max_advance_booking_days: Math.max(0, policiesSettings.max_advance_booking_days - 1)})}>-</Button>
                            <Input
                              type="number"
                              value={policiesSettings.max_advance_booking_days}
                              onChange={(e) => setPoliciesSettings({...policiesSettings, max_advance_booking_days: parseInt(e.target.value)})}
                              className="w-20 text-center"
                            />
                            <span>days</span>
                            <Button variant="outline" size="sm" onClick={() => setPoliciesSettings({...policiesSettings, max_advance_booking_days: policiesSettings.max_advance_booking_days + 1})}>+</Button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                          <div>
                            <Label className="font-medium">Weekly time slot hold duration</Label>
                            <p className="text-xs text-slate-500">Specifies how many days a student's weekly time slot will be reserved after their original event has passed.</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => setPoliciesSettings({...policiesSettings, weekly_slot_hold_days: Math.max(0, policiesSettings.weekly_slot_hold_days - 1)})}>-</Button>
                            <Input
                              type="number"
                              value={policiesSettings.weekly_slot_hold_days}
                              onChange={(e) => setPoliciesSettings({...policiesSettings, weekly_slot_hold_days: parseInt(e.target.value)})}
                              className="w-20 text-center"
                            />
                            <span>days</span>
                            <Button variant="outline" size="sm" onClick={() => setPoliciesSettings({...policiesSettings, weekly_slot_hold_days: policiesSettings.weekly_slot_hold_days + 1})}>+</Button>
                          </div>
                        </div>

                        <div>
                          <Label className="font-medium">Allow event booking from:</Label>
                          <div className="space-y-2 mt-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="allow_booking_from"
                                value="booking_form_and_portal"
                                checked={policiesSettings.allow_booking_from === 'booking_form_and_portal'}
                                onChange={(e) => setPoliciesSettings({...policiesSettings, allow_booking_from: e.target.value})}
                                className="text-teal-600"
                              />
                              <span>Booking Form & Student Portal</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="allow_booking_from"
                                value="booking_form_only"
                                checked={policiesSettings.allow_booking_from === 'booking_form_only'}
                                onChange={(e) => setPoliciesSettings({...policiesSettings, allow_booking_from: e.target.value})}
                                className="text-teal-600"
                              />
                              <span>Booking Form only</span>
                            </label>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={policiesSettings.restrict_portal_to_makeup_credits}
                            onCheckedChange={(checked) => setPoliciesSettings({...policiesSettings, restrict_portal_to_makeup_credits: checked})}
                          />
                          <Label>Restrict Student Portal bookings to make-up credits only</Label>
                        </div>

                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={policiesSettings.send_booking_notification}
                            onCheckedChange={(checked) => setPoliciesSettings({...policiesSettings, send_booking_notification: checked})}
                          />
                          <Label>Send an in-app notification when a lesson is booked via Student Portal</Label>
                        </div>
                      </div>
                    </div>

                    {/* Cancellation Policy */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Cancellation Policy</h3>
                      <p className="text-sm text-slate-500 mb-4">Define what happens when a student cancels through the Student Portal. As the tutor, you can overwrite the student's attendance at your discretion.</p>
                      
                      <div className="space-y-4">
                        <div>
                          <Label className="font-medium">Preferences</Label>
                          <div className="space-y-2 mt-2">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={policiesSettings.allow_portal_cancellation}
                                onCheckedChange={(checked) => setPoliciesSettings({...policiesSettings, allow_portal_cancellation: checked})}
                              />
                              <Label>Allow event cancellation in the Student Portal</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={policiesSettings.log_cancellation_notification}
                                onCheckedChange={(checked) => setPoliciesSettings({...policiesSettings, log_cancellation_notification: checked})}
                              />
                              <Label>Log in-app notification when a cancellation occurs</Label>
                            </div>
                          </div>
                        </div>

                        <div>
                          <Label className="font-medium">Policy Text</Label>
                          <p className="text-xs text-slate-500 mb-2">Use this space to write a formal cancellation policy that will be visible to your student if they cancel attendance through the Student Portal</p>
                          <Textarea
                            value={policiesSettings.cancellation_policy_text}
                            onChange={(e) => setPoliciesSettings({...policiesSettings, cancellation_policy_text: e.target.value})}
                            className="mt-1"
                            rows={4}
                            placeholder="Enter your cancellation policy..."
                          />
                        </div>

                        <div className="p-4 bg-slate-50 rounded-lg">
                          <h4 className="font-medium mb-2">Cancellation Before Deadline</h4>
                          <p className="text-xs text-slate-500 mb-3">Choose what happens to a student's attendance and to the event slot when an event is cancelled before the deadline.</p>
                          
                          <div className="flex items-center gap-2">
                            <Clock size={16} className="text-slate-400" />
                            <span>Deadline:</span>
                            <Input
                              type="number"
                              value={policiesSettings.cancellation_deadline_hours}
                              onChange={(e) => setPoliciesSettings({...policiesSettings, cancellation_deadline_hours: parseInt(e.target.value)})}
                              className="w-20"
                            />
                            <span>hours before event</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button onClick={handlePoliciesSettingsSave} className="bg-teal-600 hover:bg-teal-700">
                      Save Policies
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Terminology Tab */}
              <TabsContent value="terminology">
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                      <p className="text-sm text-blue-800">
                        Customize how you refer to academic terms in your coaching center. 
                        Choose between "Classes", "Courses", or "Subjects" based on your preference.
                      </p>
                    </div>

                    <div>
                      <Label>What do you call a single class/course?</Label>
                      <Select
                        value={terminology.class_label}
                        onValueChange={(value) => setTerminology({ ...terminology, class_label: value, classes_label: value + 'es' })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Class">Class</SelectItem>
                          <SelectItem value="Course">Course</SelectItem>
                          <SelectItem value="Subject">Subject</SelectItem>
                          <SelectItem value="Program">Program</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-lg">
                      <p className="text-sm font-medium mb-2">Preview:</p>
                      <p className="text-sm text-slate-600">• "Add {terminology.class_label}"</p>
                      <p className="text-sm text-slate-600">• "{terminology.classes_label} Page"</p>
                    </div>

                    <Button onClick={handleTerminologySave} className="bg-teal-600 hover:bg-teal-700">
                      Save Terminology Settings
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Currency Tab */}
              <TabsContent value="currency">
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div>
                      <Label>Default Currency</Label>
                      <Select value={currency} onValueChange={setCurrency}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INR">₹ Indian Rupee (INR)</SelectItem>
                          <SelectItem value="USD">$ US Dollar (USD)</SelectItem>
                          <SelectItem value="EUR">€ Euro (EUR)</SelectItem>
                          <SelectItem value="GBP">£ British Pound (GBP)</SelectItem>
                          <SelectItem value="AUD">A$ Australian Dollar (AUD)</SelectItem>
                          <SelectItem value="CAD">C$ Canadian Dollar (CAD)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-500 mt-2">
                        This currency will be used for all invoices, payments, and fee displays.
                      </p>
                    </div>

                    <Button onClick={handleCurrencySave} className="bg-teal-600 hover:bg-teal-700">
                      Save Currency Settings
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications">
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                          <Label>Send Invoice Emails</Label>
                          <p className="text-xs text-slate-500">Automatically email invoices when created</p>
                        </div>
                        <Checkbox
                          checked={notificationSettings.invoice_email}
                          onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, invoice_email: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                          <Label>Send Payment Confirmations</Label>
                          <p className="text-xs text-slate-500">Email confirmation when payment is received</p>
                        </div>
                        <Checkbox
                          checked={notificationSettings.payment_email}
                          onCheckedChange={(checked) => setNotificationSettings({ ...notificationSettings, payment_email: checked })}
                        />
                      </div>

                      <div>
                        <Label>Class Reminder (days before)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="30"
                          value={notificationSettings.class_reminder_days}
                          onChange={(e) => setNotificationSettings({ ...notificationSettings, class_reminder_days: parseInt(e.target.value) })}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label>Fee Due Reminder (days before)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="30"
                          value={notificationSettings.fee_reminder_days}
                          onChange={(e) => setNotificationSettings({ ...notificationSettings, fee_reminder_days: parseInt(e.target.value) })}
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <Button onClick={handleNotificationSave} className="bg-teal-600 hover:bg-teal-700">
                      Save Notification Settings
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Edit Business Info Dialog */}
        <Dialog open={centerEditOpen} onOpenChange={setCenterEditOpen}>
          <DialogContent className="max-w-md" data-testid="edit-business-dialog">
            <DialogHeader>
              <DialogTitle>Edit Business Information</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="biz-name">Business Name</Label>
                <Input
                  id="biz-name"
                  data-testid="biz-name-input"
                  value={centerInfo.name}
                  onChange={(e) => setCenterInfo({ ...centerInfo, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="biz-phone">Phone</Label>
                <Input
                  id="biz-phone"
                  data-testid="biz-phone-input"
                  value={centerInfo.phone}
                  onChange={(e) => setCenterInfo({ ...centerInfo, phone: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="biz-address">Address</Label>
                <Textarea
                  id="biz-address"
                  data-testid="biz-address-input"
                  rows={3}
                  value={centerInfo.address}
                  onChange={(e) => setCenterInfo({ ...centerInfo, address: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="biz-country">Country</Label>
                <Input
                  id="biz-country"
                  data-testid="biz-country-input"
                  value={centerInfo.country}
                  onChange={(e) => setCenterInfo({ ...centerInfo, country: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="biz-tz">Timezone</Label>
                <Input
                  id="biz-tz"
                  data-testid="biz-timezone-input"
                  value={centerInfo.timezone}
                  onChange={(e) => setCenterInfo({ ...centerInfo, timezone: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCenterEditOpen(false)}>Cancel</Button>
              <Button onClick={handleCenterInfoSave} data-testid="save-business-info-btn">Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
