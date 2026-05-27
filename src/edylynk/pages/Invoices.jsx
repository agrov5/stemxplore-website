import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/services/api';
import { useCurrency } from '@/context/CurrencyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Download, Eye, Send, CreditCard, Calendar, FileText, Calculator, CheckCircle, XCircle, Clock, AlertCircle, Users, User, DollarSign, Receipt, Edit, Trash2 } from 'lucide-react';

const Invoices = () => {
  const { currencySymbol, formatAmount } = useCurrency();
  const [invoices, setInvoices] = useState([]);
  const [students, setStudents] = useState([]);
  const [parents, setParents] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  
  // Generate Invoice State
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [invoicePreview, setInvoicePreview] = useState(null);
  const [invoiceType, setInvoiceType] = useState('student'); // 'student' or 'family'
  const [generateForm, setGenerateForm] = useState({
    student_id: '',
    family_id: '',
    selected_student_ids: [],
    start_date: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    include_upcoming: false,
    apply_credits: true
  });
  const [selectedLineItems, setSelectedLineItems] = useState([]);
  const [invoiceNotes, setInvoiceNotes] = useState('');

  // Mark Paid Dialog State
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [markPaidInvoice, setMarkPaidInvoice] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: 0,
    payment_method: 'Cash',
    payment_date: new Date().toISOString().split('T')[0],
    reference_number: '',
    notes: '',
    send_receipt: true
  });
  const [processing, setProcessing] = useState(false);

  // Edit Invoice dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editInvoice, setEditInvoice] = useState(null);
  const [editForm, setEditForm] = useState({ amount: 0, due_date: '', issue_date: '', description: '', comments: '' });

  // Delete confirmation
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [invoicesRes, studentsRes, parentsRes, settingsRes] = await Promise.all([
        api.getInvoices(),
        api.getStudents(),
        api.getParents(),
        api.getSettings()
      ]);
      setInvoices(invoicesRes.data);
      setStudents(studentsRes.data);
      setParents(parentsRes.data);
      setSettings(settingsRes.data || {});
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const getStudentInfo = (studentId) => {
    return students.find(s => s.id === studentId);
  };

  const getParentEmail = (studentId) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return null;
    // 1) student has parent_id
    if (student.parent_id) {
      const parent = parents.find(p => p.id === student.parent_id);
      if (parent?.email) return parent.email;
    }
    // 2) parent has this student in student_ids array
    const parentByArray = parents.find(p => (p.student_ids || []).includes(studentId));
    if (parentByArray?.email) return parentByArray.email;
    // 3) fall back to student's own email
    return student.email || null;
  };

  // Get students belonging to a family
  // Check both: students with parent_id AND parents with student_ids array
  const getFamilyStudents = (familyId) => {
    const parent = parents.find(p => p.id === familyId);
    const studentIdsFromParent = parent?.student_ids || [];
    
    // Get students that either have parent_id matching OR are in parent's student_ids
    return students.filter(s => 
      s.parent_id === familyId || studentIdsFromParent.includes(s.id)
    );
  };

  // Toggle student selection for family invoice
  const toggleStudentSelection = (studentId) => {
    setGenerateForm(prev => {
      const selected = prev.selected_student_ids || [];
      if (selected.includes(studentId)) {
        return { ...prev, selected_student_ids: selected.filter(id => id !== studentId) };
      } else {
        return { ...prev, selected_student_ids: [...selected, studentId] };
      }
    });
  };

  const handleGeneratePreview = async () => {
    if (invoiceType === 'student' && !generateForm.student_id) {
      toast.error('Please select a student');
      return;
    }
    if (invoiceType === 'family' && !generateForm.family_id) {
      toast.error('Please select a family');
      return;
    }
    
    setGenerating(true);
    try {
      let response;
      if (invoiceType === 'student') {
        response = await api.generateInvoicePreview({
          student_id: generateForm.student_id,
          start_date: generateForm.start_date,
          end_date: generateForm.end_date,
          include_upcoming: generateForm.include_upcoming,
          apply_credits: generateForm.apply_credits
        });
      } else {
        response = await api.generateFamilyInvoicePreview({
          family_id: generateForm.family_id,
          student_ids: generateForm.selected_student_ids,
          start_date: generateForm.start_date,
          end_date: generateForm.end_date,
          include_upcoming: generateForm.include_upcoming,
          apply_credits: generateForm.apply_credits
        });
      }
      setInvoicePreview(response.data);
      // Select all charged items by default
      const chargedItems = response.data.line_items
        .filter(item => item.status === 'charged' || item.status === 'upcoming')
        .map((_, idx) => idx);
      setSelectedLineItems(chargedItems);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate preview');
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!invoicePreview) return;
    
    // Filter selected line items
    const selectedItems = invoicePreview.line_items.filter((_, idx) => selectedLineItems.includes(idx));
    
    // Recalculate totals based on selected items
    const subtotal = selectedItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const discountAmount = subtotal * (invoicePreview.summary.discount_percentage / 100);
    const creditApplied = Math.min(
      invoiceType === 'family' ? invoicePreview.summary.total_credit_balance : invoicePreview.summary.credit_balance,
      subtotal - discountAmount
    );
    const totalDue = Math.max(0, subtotal - discountAmount - creditApplied);
    
    try {
      if (invoiceType === 'student') {
        await api.createInvoiceFromPreview({
          student_id: invoicePreview.student.id,
          start_date: invoicePreview.period.start_date,
          end_date: invoicePreview.period.end_date,
          subtotal,
          discount_amount: discountAmount,
          discount_percentage: invoicePreview.summary.discount_percentage,
          credit_applied: creditApplied,
          total_due: totalDue,
          line_items: selectedItems,
          credits: invoicePreview.credits || [],
          comments: invoiceNotes
        });
      } else {
        const studentIds = invoicePreview.students.map(s => s.id).join(',');
        await api.createFamilyInvoice({
          family_id: invoicePreview.family.id,
          student_ids: studentIds,
          start_date: invoicePreview.period.start_date,
          end_date: invoicePreview.period.end_date,
          subtotal,
          discount_amount: discountAmount,
          discount_percentage: invoicePreview.summary.discount_percentage,
          credit_applied: creditApplied,
          total_due: totalDue,
          line_items: selectedItems,
          credits: invoicePreview.credits || [],
          comments: invoiceNotes
        });
      }
      
      toast.success('Invoice created successfully');
      setGenerateOpen(false);
      setInvoicePreview(null);
      setSelectedLineItems([]);
      setInvoiceNotes('');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create invoice');
    }
  };

  // Email draft state
  const [emailDraftOpen, setEmailDraftOpen] = useState(false);
  const [emailDraftLoading, setEmailDraftLoading] = useState(false);
  const [emailDraftSending, setEmailDraftSending] = useState(false);
  const [emailDraftInvoice, setEmailDraftInvoice] = useState(null);
  const [emailDraft, setEmailDraft] = useState({ recipient_email: '', subject: '', html: '' });

  const handleSendToParent = async (invoice) => {
    setEmailDraftInvoice(invoice);
    setEmailDraftOpen(true);
    setEmailDraftLoading(true);
    setEmailDraft({ recipient_email: '', subject: '', html: '' });
    try {
      const res = await api.getInvoiceEmailDraft(invoice.id);
      setEmailDraft({
        recipient_email: res.data.recipient_email || '',
        subject: res.data.subject || '',
        html: res.data.html || ''
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to load email draft');
      setEmailDraftOpen(false);
    } finally {
      setEmailDraftLoading(false);
    }
  };

  const handleSendDraftEmail = async () => {
    if (!emailDraftInvoice) return;
    if (!emailDraft.recipient_email) {
      toast.error('Recipient email is required');
      return;
    }
    setEmailDraftSending(true);
    try {
      if (emailDraftInvoice.__receipt_payment_id) {
        await api.sendReceipt(emailDraftInvoice.__receipt_payment_id, emailDraft);
        toast.success(`Receipt sent to ${emailDraft.recipient_email}`);
      } else {
        await api.sendInvoiceToParent(emailDraftInvoice.id, emailDraft);
        toast.success(`Invoice sent to ${emailDraft.recipient_email}`);
      }
      setEmailDraftOpen(false);
      setEmailDraftInvoice(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send email');
    } finally {
      setEmailDraftSending(false);
    }
  };

  const handleDownloadPDF = (invoice) => {
    const downloadUrl = api.downloadInvoice(invoice.id);
    window.open(downloadUrl, '_blank');
  };

  const handlePreview = (invoice) => {
    setSelectedInvoice(invoice);
    setPreviewOpen(true);
  };

  const handleStatusChange = async (invoiceId, newStatus) => {
    // If marking as paid, open the payment dialog
    if (newStatus === 'paid') {
      const invoice = invoices.find(i => i.id === invoiceId);
      if (invoice) {
        setMarkPaidInvoice(invoice);
        setPaymentForm({
          amount: invoice.amount,
          payment_method: 'Cash',
          payment_date: new Date().toISOString().split('T')[0],
          reference_number: '',
          notes: '',
          send_receipt: true
        });
        setMarkPaidOpen(true);
        return;
      }
    }
    
    try {
      await api.updateInvoiceStatus(invoiceId, newStatus);
      toast.success('Invoice status updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const openEditDialog = (invoice) => {
    setEditInvoice(invoice);
    setEditForm({
      amount: invoice.amount || 0,
      due_date: invoice.due_date ? new Date(invoice.due_date).toISOString().slice(0, 10) : '',
      issue_date: invoice.issue_date ? new Date(invoice.issue_date).toISOString().slice(0, 10) : '',
      description: invoice.description || '',
      comments: invoice.comments || ''
    });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editInvoice) return;
    try {
      await api.updateInvoice(editInvoice.id, editForm);
      toast.success('Invoice updated');
      setEditOpen(false);
      setEditInvoice(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update invoice');
    }
  };

  const openDeleteDialog = (invoice) => {
    setDeleteTarget(invoice);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteInvoice(deleteTarget.id);
      toast.success('Invoice deleted');
      setDeleteOpen(false);
      setDeleteTarget(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete invoice');
    }
  };

  const handleMarkPaid = async () => {
    if (!markPaidInvoice) return;
    
    setProcessing(true);
    try {
      const response = await api.markInvoicePaid(markPaidInvoice.id, {
        amount: paymentForm.amount,
        payment_method: paymentForm.payment_method,
        payment_date: paymentForm.payment_date,
        reference_number: paymentForm.reference_number || undefined,
        notes: paymentForm.notes || undefined,
        send_receipt: false  // We'll handle send via draft dialog
      });
      
      toast.success(`Payment recorded! Receipt #: ${response.data.receipt_number}`);
      const newPaymentId = response.data.payment_id;
      const sendReceipt = paymentForm.send_receipt;
      
      setMarkPaidOpen(false);
      setMarkPaidInvoice(null);
      fetchData();
      
      // If user ticked "Send receipt", open draft dialog for review
      if (sendReceipt && newPaymentId) {
        await openReceiptDraft(newPaymentId);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to record payment');
    } finally {
      setProcessing(false);
    }
  };

  const openReceiptDraft = async (paymentId) => {
    setEmailDraftInvoice({ __receipt_payment_id: paymentId });
    setEmailDraftOpen(true);
    setEmailDraftLoading(true);
    setEmailDraft({ recipient_email: '', subject: '', html: '' });
    try {
      const res = await api.getReceiptEmailDraft(paymentId);
      setEmailDraft({
        recipient_email: res.data.recipient_email || '',
        subject: res.data.subject || '',
        html: res.data.html || ''
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to load receipt draft');
      setEmailDraftOpen(false);
    } finally {
      setEmailDraftLoading(false);
    }
  };

  const toggleLineItem = (idx) => {
    setSelectedLineItems(prev => 
      prev.includes(idx) 
        ? prev.filter(i => i !== idx)
        : [...prev, idx]
    );
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'charged':
        return <Badge className="bg-blue-100 text-blue-800">Charged</Badge>;
      case 'no_charge':
        return <Badge className="bg-yellow-100 text-yellow-800">No Charge</Badge>;
      case 'upcoming':
        return <Badge className="bg-purple-100 text-purple-800">Upcoming</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const selectedStudent = students.find(s => s.id === generateForm.student_id);
  const selectedFamily = parents.find(p => p.id === generateForm.family_id);
  const familyStudents = generateForm.family_id ? getFamilyStudents(generateForm.family_id) : [];

  // Reset form when dialog opens
  const openGenerateDialog = () => {
    setGenerateOpen(true);
    setInvoicePreview(null);
    setInvoiceType('student');
    setGenerateForm({
      student_id: '',
      family_id: '',
      selected_student_ids: [],
      start_date: new Date(new Date().setDate(1)).toISOString().split('T')[0],
      end_date: new Date().toISOString().split('T')[0],
      include_upcoming: false,
      apply_credits: true
    });
  };

  // Get display name for invoice (student or family)
  const getInvoiceBillTo = (invoice) => {
    if (invoice.invoice_type === 'family' && invoice.family_id) {
      const family = parents.find(p => p.id === invoice.family_id);
      return family ? `${family.name} (Family)` : 'Unknown Family';
    }
    const student = getStudentInfo(invoice.student_id);
    return student?.name || 'Unknown';
  };

  return (
    <DashboardLayout>
      <div data-testid="invoices-page">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight font-heading">Invoices</h1>
            <p className="text-sm sm:text-base text-slate-600 mt-2">Create and manage student invoices based on attendance</p>
          </div>
          <Button
            data-testid="generate-invoice-button"
            onClick={openGenerateDialog}
            className="bg-primary hover:bg-primary-hover"
          >
            <Calculator size={18} className="mr-2" />
            Generate Invoice
          </Button>
        </div>

        {/* Invoice List */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-slate-500">Loading...</div>
            ) : invoices.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <FileText className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                <p>No invoices created yet</p>
                <p className="text-sm mt-1">Click "Generate Invoice" to create one based on attendance</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Issue Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => {
                      const student = getStudentInfo(invoice.student_id);
                      return (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                          <TableCell>{getInvoiceBillTo(invoice)}</TableCell>
                          <TableCell className="font-semibold">{formatAmount(invoice.amount)}</TableCell>
                          <TableCell>{new Date(invoice.issue_date).toLocaleDateString()}</TableCell>
                          <TableCell>{new Date(invoice.due_date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Select
                              value={invoice.status}
                              onValueChange={(value) => handleStatusChange(invoice.id, value)}
                            >
                              <SelectTrigger className="w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                                <SelectItem value="overdue">Overdue</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="outline" size="sm" onClick={() => handlePreview(invoice)} title="Preview" data-testid={`preview-invoice-${invoice.id}`}>
                                <Eye size={14} />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleDownloadPDF(invoice)} title="Download" data-testid={`download-invoice-${invoice.id}`}>
                                <Download size={14} />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => openEditDialog(invoice)} title="Edit" data-testid={`edit-invoice-${invoice.id}`}>
                                <Edit size={14} />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleSendToParent(invoice)}
                                title="Send via Email"
                                data-testid={`send-invoice-${invoice.id}`}
                              >
                                <Send size={14} />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openDeleteDialog(invoice)}
                                title="Delete"
                                data-testid={`delete-invoice-${invoice.id}`}
                                className="text-red-600 hover:bg-red-50 hover:text-red-700"
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
          </CardContent>
        </Card>

        {/* Generate Invoice Dialog */}
        <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calculator size={20} />
                Generate Invoice from Attendance
              </DialogTitle>
            </DialogHeader>

            {!invoicePreview ? (
              <div className="space-y-4 mt-4">
                {/* Invoice Type Selection */}
                <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                  <Button
                    type="button"
                    variant={invoiceType === 'student' ? 'default' : 'ghost'}
                    className={`flex-1 ${invoiceType === 'student' ? 'bg-primary' : ''}`}
                    onClick={() => {
                      setInvoiceType('student');
                      setGenerateForm(prev => ({ ...prev, family_id: '', selected_student_ids: [] }));
                    }}
                  >
                    <User size={16} className="mr-2" />
                    Single Student
                  </Button>
                  <Button
                    type="button"
                    variant={invoiceType === 'family' ? 'default' : 'ghost'}
                    className={`flex-1 ${invoiceType === 'family' ? 'bg-primary' : ''}`}
                    onClick={() => {
                      setInvoiceType('family');
                      setGenerateForm(prev => ({ ...prev, student_id: '' }));
                    }}
                  >
                    <Users size={16} className="mr-2" />
                    Family Invoice
                  </Button>
                </div>

                {invoiceType === 'student' ? (
                  <>
                    <div>
                      <Label>Select Student</Label>
                      <Select
                        value={generateForm.student_id}
                        onValueChange={(value) => setGenerateForm({ ...generateForm, student_id: value })}
                      >
                        <SelectTrigger className="mt-1" data-testid="generate-student-select">
                          <SelectValue placeholder="Select a student" />
                        </SelectTrigger>
                        <SelectContent>
                          {students.map(student => (
                            <SelectItem key={student.id} value={student.id}>
                              {student.name} - {student.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedStudent && (
                      <Card className="bg-slate-50">
                        <CardContent className="pt-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-slate-500">Fee Amount:</span>
                              <span className="ml-2 font-medium">{formatAmount(selectedStudent.fee_amount || 0)}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Credit Balance:</span>
                              <span className="ml-2 font-medium text-green-600">{formatAmount(selectedStudent.credit_balance || 0)}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Discount:</span>
                              <span className="ml-2 font-medium">{selectedStudent.discount_percentage || 0}%</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Classes:</span>
                              <span className="ml-2 font-medium">{selectedStudent.class_ids?.length || 0}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : (
                  <>
                    <div>
                      <Label>Select Family</Label>
                      <Select
                        value={generateForm.family_id}
                        onValueChange={(value) => {
                          // Get students from both parent_id and parent's student_ids
                          const parent = parents.find(p => p.id === value);
                          const studentIdsFromParent = parent?.student_ids || [];
                          const familyKids = students.filter(s => 
                            s.parent_id === value || studentIdsFromParent.includes(s.id)
                          );
                          setGenerateForm({ 
                            ...generateForm, 
                            family_id: value,
                            selected_student_ids: familyKids.map(s => s.id) // Select all by default
                          });
                        }}
                      >
                        <SelectTrigger className="mt-1" data-testid="generate-family-select">
                          <SelectValue placeholder="Select a family" />
                        </SelectTrigger>
                        <SelectContent>
                          {parents.map(parent => {
                            // Count students from both parent_id on students AND student_ids on parent
                            const studentIdsFromParent = parent.student_ids || [];
                            const kidCount = students.filter(s => 
                              s.parent_id === parent.id || studentIdsFromParent.includes(s.id)
                            ).length;
                            return (
                              <SelectItem key={parent.id} value={parent.id}>
                                {parent.name} ({kidCount} student{kidCount !== 1 ? 's' : ''})
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedFamily && familyStudents.length > 0 && (
                      <Card className="bg-slate-50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Select Students to Include</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {familyStudents.map(student => (
                              <div key={student.id} className="flex items-center justify-between p-2 bg-white rounded border">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={generateForm.selected_student_ids?.includes(student.id)}
                                    onCheckedChange={() => toggleStudentSelection(student.id)}
                                  />
                                  <div>
                                    <p className="font-medium text-sm">{student.name}</p>
                                    <p className="text-xs text-slate-500">{student.class_ids?.length || 0} classes</p>
                                  </div>
                                </div>
                                <div className="text-right text-xs">
                                  <p>Credit: <span className="text-green-600">{formatAmount(student.credit_balance || 0)}</span></p>
                                  <p>Discount: {student.discount_percentage || 0}%</p>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 pt-3 border-t flex justify-between text-sm">
                            <span>Total Credit Balance:</span>
                            <span className="font-medium text-green-600">
                              {formatAmount(familyStudents.reduce((sum, s) => sum + (s.credit_balance || 0), 0))}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={generateForm.start_date}
                      onChange={(e) => setGenerateForm({ ...generateForm, start_date: e.target.value })}
                      className="mt-1"
                      data-testid="generate-start-date"
                    />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={generateForm.end_date}
                      onChange={(e) => setGenerateForm({ ...generateForm, end_date: e.target.value })}
                      className="mt-1"
                      data-testid="generate-end-date"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="include-upcoming"
                      checked={generateForm.include_upcoming}
                      onCheckedChange={(checked) => setGenerateForm({ ...generateForm, include_upcoming: checked })}
                    />
                    <Label htmlFor="include-upcoming" className="text-sm">Include upcoming scheduled classes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="apply-credits"
                      checked={generateForm.apply_credits}
                      onCheckedChange={(checked) => setGenerateForm({ ...generateForm, apply_credits: checked })}
                    />
                    <Label htmlFor="apply-credits" className="text-sm">Auto-apply credit balance</Label>
                  </div>
                </div>

                <Button 
                  onClick={handleGeneratePreview} 
                  disabled={generating || (invoiceType === 'student' ? !generateForm.student_id : !generateForm.family_id || generateForm.selected_student_ids?.length === 0)}
                  className="w-full"
                >
                  {generating ? 'Generating...' : 'Generate Preview'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4 mt-4">
                {/* Header Info - Student or Family */}
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start">
                      <div>
                        {invoicePreview.family ? (
                          <>
                            <div className="flex items-center gap-2">
                              <Users size={20} className="text-blue-600" />
                              <h3 className="font-semibold text-lg">{invoicePreview.family.name}</h3>
                              <Badge className="bg-blue-100 text-blue-800">Family Invoice</Badge>
                            </div>
                            <p className="text-sm text-slate-600">{invoicePreview.family.email}</p>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {invoicePreview.students?.map(s => (
                                <Badge key={s.id} variant="outline" className="text-xs">
                                  {s.name} ({s.sessions} sessions)
                                </Badge>
                              ))}
                            </div>
                          </>
                        ) : (
                          <>
                            <h3 className="font-semibold text-lg">{invoicePreview.student.name}</h3>
                            <p className="text-sm text-slate-600">{invoicePreview.student.email}</p>
                          </>
                        )}
                      </div>
                      <div className="text-right text-sm">
                        <p><span className="text-slate-500">Period:</span> {invoicePreview.period.start_date} to {invoicePreview.period.end_date}</p>
                        {invoicePreview.period.include_upcoming && (
                          <Badge className="bg-purple-100 text-purple-800 mt-1">Includes Upcoming</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Line Items */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Sessions ({invoicePreview.line_items.length})</CardTitle>
                    <CardDescription>Select items to include in the invoice</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-64 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10"></TableHead>
                            <TableHead>Date</TableHead>
                            {invoicePreview.family && <TableHead>Student</TableHead>}
                            <TableHead>Description</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoicePreview.line_items.map((item, idx) => (
                            <TableRow key={idx} className={item.status === 'no_charge' ? 'bg-yellow-50' : ''}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedLineItems.includes(idx)}
                                  onCheckedChange={() => toggleLineItem(idx)}
                                  disabled={item.status === 'no_charge'}
                                />
                              </TableCell>
                              <TableCell className="text-sm">{item.event_date}</TableCell>
                              {invoicePreview.family && (
                                <TableCell className="text-sm font-medium">{item.student_name}</TableCell>
                              )}
                              <TableCell>
                                <div className="text-sm">
                                  {item.description}
                                  {item.tutor_name && <span className="text-xs text-slate-500 block">Tutor: {item.tutor_name}</span>}
                                  {item.no_charge_reason && <span className="text-xs text-yellow-600 block">{item.no_charge_reason}</span>}
                                </div>
                              </TableCell>
                              <TableCell>{getStatusBadge(item.status)}</TableCell>
                              <TableCell className="text-right font-medium">
                                {item.status === 'no_charge' ? (
                                  <span className="text-yellow-600">{formatAmount(0)}</span>
                                ) : (
                                  formatAmount(item.amount)
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* Credits */}
                {invoicePreview.credits.length > 0 && (
                  <Card className="bg-green-50 border-green-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <CreditCard size={16} className="text-green-600" />
                        Credits to Apply
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {invoicePreview.credits.map((credit, idx) => (
                        <div key={idx} className="flex justify-between text-sm py-1">
                          <span>
                            {credit.description}
                            {credit.original_date && <span className="text-xs text-slate-500"> (from {credit.original_date})</span>}
                          </span>
                          <span className="text-green-600 font-medium">-{formatAmount(credit.amount)}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Summary */}
                <Card>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      {invoicePreview.family && (
                        <div>
                          <p className="text-2xl font-bold text-blue-600">{invoicePreview.summary.total_students}</p>
                          <p className="text-xs text-slate-500">Students</p>
                        </div>
                      )}
                      <div>
                        <p className="text-2xl font-bold text-slate-900">{invoicePreview.summary.total_sessions}</p>
                        <p className="text-xs text-slate-500">Charged Sessions</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-yellow-600">{invoicePreview.summary.no_charge_sessions}</p>
                        <p className="text-xs text-slate-500">No Charge</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-purple-600">{invoicePreview.summary.upcoming_sessions}</p>
                        <p className="text-xs text-slate-500">Upcoming</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">
                          {formatAmount(invoicePreview.family ? invoicePreview.summary.total_credit_balance : invoicePreview.summary.credit_balance)}
                        </p>
                        <p className="text-xs text-slate-500">Credit Available</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Subtotal ({selectedLineItems.length} items):</span>
                        <span>{formatAmount(invoicePreview.line_items.filter((_, idx) => selectedLineItems.includes(idx)).reduce((sum, i) => sum + (i.amount || 0), 0))}</span>
                      </div>
                      {invoicePreview.summary.discount_percentage > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount ({invoicePreview.summary.discount_percentage}%):</span>
                          <span>-{formatAmount(invoicePreview.summary.discount_amount)}</span>
                        </div>
                      )}
                      {invoicePreview.summary.credit_applied > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Credit Applied:</span>
                          <span>-{formatAmount(invoicePreview.summary.credit_applied)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-lg pt-2 border-t">
                        <span>Total Due:</span>
                        <span>{formatAmount(invoicePreview.summary.total_due)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Notes */}
                <div>
                  <Label>Invoice Notes (Optional)</Label>
                  <Textarea
                    value={invoiceNotes}
                    onChange={(e) => setInvoiceNotes(e.target.value)}
                    placeholder="Add any notes for this invoice..."
                    className="mt-1"
                    rows={2}
                  />
                </div>
              </div>
            )}

            <DialogFooter className="mt-4">
              {invoicePreview ? (
                <>
                  <Button variant="outline" onClick={() => setInvoicePreview(null)}>
                    Back
                  </Button>
                  <Button onClick={handleCreateInvoice} disabled={selectedLineItems.length === 0}>
                    <FileText size={16} className="mr-2" />
                    Create Invoice
                  </Button>
                </>
              ) : (
                <Button variant="outline" onClick={() => setGenerateOpen(false)}>
                  Cancel
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Invoice Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Invoice Preview</DialogTitle>
            </DialogHeader>
            {selectedInvoice && (
              <div className="p-6 bg-white border rounded-lg">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    {settings.invoice_logo_url && (
                      <img src={settings.invoice_logo_url} alt="Logo" className="w-16 h-16 object-contain" />
                    )}
                    <div>
                      <h2 className="text-2xl font-bold text-primary font-heading">{settings.invoice_company_name || settings.center_name || 'StemXplore'}</h2>
                      {settings.invoice_address && (
                        <p className="text-xs text-slate-500 whitespace-pre-line mt-1">{settings.invoice_address}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <h3 className="text-xl font-bold">INVOICE</h3>
                    <p className="text-sm text-slate-600">#{selectedInvoice.invoice_number}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="font-bold text-sm mb-2 text-slate-500">Bill To:</h3>
                    {(() => {
                      const isFamily = selectedInvoice.invoice_type === 'family';
                      // For family invoice: use parent. For student invoice: try parent, then student.
                      let parent = null;
                      let student = null;
                      if (isFamily) {
                        parent = parents.find(p => p.id === selectedInvoice.family_id);
                      } else if (selectedInvoice.student_id) {
                        student = getStudentInfo(selectedInvoice.student_id);
                        if (student?.parent_id) {
                          parent = parents.find(p => p.id === student.parent_id);
                        }
                        if (!parent) {
                          parent = parents.find(p => (p.student_ids || []).includes(selectedInvoice.student_id));
                        }
                      }
                      // For family invoices, also list the children
                      const familyChildren = isFamily && selectedInvoice.student_ids
                        ? selectedInvoice.student_ids
                            .map(sid => getStudentInfo(sid))
                            .filter(Boolean)
                        : [];
                      return (
                        <div className="text-sm space-y-1" data-testid="invoice-bill-to">
                          {parent ? (
                            <>
                              <p className="font-medium">{parent.name}</p>
                              {parent.email && <p>{parent.email}</p>}
                              {parent.phone && <p>{parent.phone}</p>}
                              {!isFamily && student && (
                                <p className="text-xs text-slate-500 pt-1">For: {student.name}</p>
                              )}
                              {isFamily && familyChildren.length > 0 && (
                                <p className="text-xs text-slate-500 pt-1">
                                  For: {familyChildren.map(c => c.name).join(', ')}
                                </p>
                              )}
                            </>
                          ) : student ? (
                            <>
                              <p className="font-medium">{student.name}</p>
                              {student.email && <p>{student.email}</p>}
                              {student.phone && <p>{student.phone}</p>}
                            </>
                          ) : (
                            <p className="text-slate-400 italic">Bill-to information unavailable</p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="text-right">
                    <div className="text-sm space-y-1">
                      <p><span className="text-slate-500">Issue Date:</span> {new Date(selectedInvoice.issue_date).toLocaleDateString()}</p>
                      <p><span className="text-slate-500">Due Date:</span> {new Date(selectedInvoice.due_date).toLocaleDateString()}</p>
                      <p className={`font-bold ${
                        selectedInvoice.status === 'paid' ? 'text-green-600' :
                        selectedInvoice.status === 'overdue' ? 'text-red-600' :
                        'text-orange-600'
                      }`}>
                        Status: {selectedInvoice.status.toUpperCase()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Line Items */}
                <table className="w-full mb-4 border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-primary text-white">
                      <th className="p-2 text-left text-sm">Description</th>
                      {(settings.show_session_date !== false) && <th className="p-2 text-center text-sm">Date</th>}
                      <th className="p-2 text-right text-sm">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.line_items?.length > 0 ? (
                      selectedInvoice.line_items
                        .filter(item => (settings.show_no_charge_items !== false) || item.status !== 'no_charge')
                        .map((item, idx) => {
                          const showClass = settings.show_class_details !== false;
                          const showTutor = settings.show_tutor_details !== false;
                          const showDuration = settings.show_duration === true;
                          const showStudentNameOnFamily = settings.show_student_name_on_family !== false;
                          const isFamily = selectedInvoice.invoice_type === 'family';
                          const mainLine = showClass
                            ? (item.description || item.class_name || '')
                            : (item.event_title || (item.description ? item.description.split(' (')[0] : ''));
                          return (
                            <tr key={idx} className="border-b border-slate-200">
                              <td className="p-2 text-sm">
                                <div>{mainLine}</div>
                                {isFamily && showStudentNameOnFamily && item.student_name && (
                                  <span className="text-xs text-slate-500 block">Student: {item.student_name}</span>
                                )}
                                {showTutor && item.tutor_name && (
                                  <span className="text-xs text-slate-500 block">Tutor: {item.tutor_name}</span>
                                )}
                                {showDuration && item.duration && (
                                  <span className="text-xs text-slate-500 block">Duration: {item.duration}</span>
                                )}
                                {item.status === 'no_charge' && (
                                  <span className="text-xs text-purple-600 block">No charge{item.no_charge_reason ? `: ${item.no_charge_reason}` : ''}</span>
                                )}
                              </td>
                              {(settings.show_session_date !== false) && (
                                <td className="p-2 text-center text-sm">{item.event_date || '-'}</td>
                              )}
                              <td className="p-2 text-right text-sm">{formatAmount(item.amount || 0)}</td>
                            </tr>
                          );
                        })
                    ) : (
                      <tr className="border-b border-slate-200">
                        <td className="p-2 text-sm" colSpan={(settings.show_session_date !== false) ? 2 : 1}>{selectedInvoice.description}</td>
                        <td className="p-2 text-right text-sm">{formatAmount(selectedInvoice.amount)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Credits */}
                {selectedInvoice.credits?.length > 0 && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
                    <h4 className="font-semibold text-green-700 mb-2 flex items-center text-sm">
                      <CreditCard size={14} className="mr-2" />
                      Credits Applied
                    </h4>
                    {selectedInvoice.credits.map((credit, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{credit.description || credit.reason}</span>
                        <span className="text-green-600">-{formatAmount(credit.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Totals */}
                <div className="flex justify-end mb-4">
                  <div className="w-64 space-y-1 text-sm">
                    {selectedInvoice.subtotal && selectedInvoice.subtotal !== selectedInvoice.amount && (
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span>{formatAmount(selectedInvoice.subtotal)}</span>
                      </div>
                    )}
                    {selectedInvoice.discount_amount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount ({selectedInvoice.discount_percentage}%):</span>
                        <span>-{formatAmount(selectedInvoice.discount_amount)}</span>
                      </div>
                    )}
                    {selectedInvoice.credit_applied > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Credit Applied:</span>
                        <span>-{formatAmount(selectedInvoice.credit_applied)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total Due:</span>
                      <span>{formatAmount(selectedInvoice.amount)}</span>
                    </div>
                  </div>
                </div>

                {selectedInvoice.comments && (
                  <div className="text-sm border-t pt-3">
                    <h4 className="font-semibold text-slate-700">Notes:</h4>
                    <p className="text-slate-600">{selectedInvoice.comments}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
              <Button onClick={() => handleDownloadPDF(selectedInvoice)}>
                <Download size={16} className="mr-2" />
                Download PDF
              </Button>
              <Button 
                onClick={() => handleSendToParent(selectedInvoice)}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="preview-send-email-btn"
              >
                <Send size={16} className="mr-2" />
                Send via Email
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Mark Paid Dialog */}
        <Dialog open={markPaidOpen} onOpenChange={setMarkPaidOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt size={20} className="text-green-600" />
                Record Payment
              </DialogTitle>
            </DialogHeader>
            {markPaidInvoice && (
              <div className="space-y-4">
                <Card className="bg-slate-50">
                  <CardContent className="pt-4">
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Invoice #:</span>
                        <span className="font-medium">{markPaidInvoice.invoice_number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Amount Due:</span>
                        <span className="font-medium text-lg">{formatAmount(markPaidInvoice.amount)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Payment Amount</Label>
                    <Input
                      type="number"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                      className="mt-1"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <Label>Payment Date</Label>
                    <Input
                      type="date"
                      value={paymentForm.payment_date}
                      onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label>Payment Method</Label>
                  <Select
                    value={paymentForm.payment_method}
                    onValueChange={(value) => setPaymentForm({ ...paymentForm, payment_method: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Card">Card</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="Credit Balance">Credit Balance</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Reference / Transaction ID</Label>
                  <Input
                    value={paymentForm.reference_number}
                    onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
                    className="mt-1"
                    placeholder="e.g., Transaction ID, Cheque number"
                  />
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    className="mt-1"
                    placeholder="Additional notes..."
                    rows={2}
                  />
                </div>

                <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                  <Checkbox
                    id="send-receipt"
                    checked={paymentForm.send_receipt}
                    onCheckedChange={(checked) => setPaymentForm({ ...paymentForm, send_receipt: checked })}
                  />
                  <Label htmlFor="send-receipt" className="text-sm">
                    Email payment receipt to parent
                  </Label>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setMarkPaidOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleMarkPaid} 
                disabled={processing || paymentForm.amount <= 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {processing ? 'Processing...' : (
                  <>
                    <CheckCircle size={16} className="mr-2" />
                    Record Payment
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Invoice Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-md" data-testid="edit-invoice-dialog">
            <DialogHeader>
              <DialogTitle>Edit Invoice {editInvoice?.invoice_number}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label htmlFor="edit-amount">Amount</Label>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  data-testid="edit-amount-input"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="edit-issue">Issue Date</Label>
                  <Input
                    id="edit-issue"
                    type="date"
                    data-testid="edit-issue-date-input"
                    value={editForm.issue_date}
                    onChange={(e) => setEditForm({ ...editForm, issue_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-due">Due Date</Label>
                  <Input
                    id="edit-due"
                    type="date"
                    data-testid="edit-due-date-input"
                    value={editForm.due_date}
                    onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-desc">Description</Label>
                <Input
                  id="edit-desc"
                  data-testid="edit-description-input"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-comments">Comments</Label>
                <Textarea
                  id="edit-comments"
                  rows={2}
                  data-testid="edit-comments-input"
                  value={editForm.comments}
                  onChange={(e) => setEditForm({ ...editForm, comments: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={handleEditSave} data-testid="edit-invoice-save-btn">Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent className="max-w-md" data-testid="delete-invoice-dialog">
            <DialogHeader>
              <DialogTitle>Delete Invoice?</DialogTitle>
            </DialogHeader>
            <div className="py-2 text-sm text-slate-700">
              <p>You're about to permanently delete invoice <span className="font-semibold">{deleteTarget?.invoice_number}</span> for {deleteTarget && getInvoiceBillTo(deleteTarget)}.</p>
              <p className="mt-2 text-slate-500">Any applied credits will be refunded to the student(s) and related payments will be removed. This cannot be undone.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
              <Button onClick={handleDeleteConfirm} data-testid="delete-invoice-confirm-btn" className="bg-red-600 hover:bg-red-700">
                <Trash2 size={14} className="mr-2" />Delete Invoice
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Email Draft Dialog */}
        <Dialog open={emailDraftOpen} onOpenChange={(open) => { if (!open) { setEmailDraftOpen(false); setEmailDraftInvoice(null); } }}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="email-draft-dialog">
            <DialogHeader>
              <DialogTitle>{emailDraftInvoice?.__receipt_payment_id ? 'Review & Send Receipt' : 'Review & Send Invoice Email'}</DialogTitle>
            </DialogHeader>
            {emailDraftLoading ? (
              <div className="py-8 text-center text-slate-500">Loading email draft...</div>
            ) : (
              <div className="space-y-3 py-2">
                <div>
                  <Label htmlFor="email-recipient">To</Label>
                  <Input
                    id="email-recipient"
                    type="email"
                    data-testid="email-draft-recipient-input"
                    value={emailDraft.recipient_email}
                    onChange={(e) => setEmailDraft({ ...emailDraft, recipient_email: e.target.value })}
                    placeholder="recipient@example.com"
                  />
                  {!emailDraft.recipient_email && (
                    <p className="text-xs text-amber-600 mt-1">No email found on student/parent — please enter one manually.</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="email-subject">Subject</Label>
                  <Input
                    id="email-subject"
                    data-testid="email-draft-subject-input"
                    value={emailDraft.subject}
                    onChange={(e) => setEmailDraft({ ...emailDraft, subject: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="email-html">Body (HTML)</Label>
                  <Textarea
                    id="email-html"
                    data-testid="email-draft-html-input"
                    rows={12}
                    className="font-mono text-xs"
                    value={emailDraft.html}
                    onChange={(e) => setEmailDraft({ ...emailDraft, html: e.target.value })}
                  />
                  <p className="text-xs text-slate-500 mt-1">Tip: HTML formatting is supported. Edit any text above; the changes apply only to this email.</p>
                </div>
                <div className="border rounded p-3 bg-slate-50">
                  <p className="text-xs font-semibold text-slate-600 mb-2">Preview:</p>
                  <div className="bg-white p-3 rounded border max-h-48 overflow-y-auto" dangerouslySetInnerHTML={{ __html: emailDraft.html }} />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setEmailDraftOpen(false); setEmailDraftInvoice(null); }}>
                Cancel
              </Button>
              <Button
                onClick={handleSendDraftEmail}
                disabled={emailDraftLoading || emailDraftSending || !emailDraft.recipient_email}
                data-testid="email-draft-send-btn"
                className="bg-primary hover:bg-primary-hover"
              >
                <Send size={14} className="mr-2" />
                {emailDraftSending ? 'Sending...' : 'Send Email'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default Invoices;
