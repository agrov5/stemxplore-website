import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/services/api';
import { useCurrency } from '@/context/CurrencyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Mail, Phone, ChevronRight, Search, SortAsc, Columns, DollarSign, X, RefreshCw, Eye, Users, FileText, Receipt, CreditCard, AlertCircle, CheckCircle } from 'lucide-react';

const FamiliesInvoices = () => {
  const { formatAmount, currencySymbol } = useCurrency();
  const [families, setFamilies] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingFamily, setEditingFamily] = useState(null);
  const [totalOwed, setTotalOwed] = useState(0);
  const [prepaidBalance, setPrepaidBalance] = useState(0);
  const [asOfDate, setAsOfDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTransactionDialog, setShowTransactionDialog] = useState(false);
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [transactionData, setTransactionData] = useState({
    amount: '',
    description: '',
    type: 'payment'
  });
  
  // Family Details View State
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [familySummary, setFamilySummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    relationship: 'family',
    student_ids: [],
    group_tags: [],
    auto_invoice: false,
    auto_invoice_frequency: 'monthly',
    notes: ''
  });

  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [familiesRes, studentsRes] = await Promise.all([
        api.getFamiliesSummary(),
        api.getStudents()
      ]);
      setFamilies(familiesRes.data.families || []);
      setTotalOwed(familiesRes.data.total_owed || 0);
      setPrepaidBalance(familiesRes.data.total_prepaid || 0);
      setAsOfDate(familiesRes.data.as_of_date || '');
      setStudents(studentsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      // Fallback to basic parents endpoint
      try {
        const [parentsRes, studentsRes] = await Promise.all([
          api.getParents(),
          api.getStudents()
        ]);
        setFamilies(parentsRes.data);
        setStudents(studentsRes.data);
      } catch (e) {
        toast.error('Failed to fetch data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingFamily) {
        await api.updateParent(editingFamily.id, formData);
        toast.success('Family updated successfully');
      } else {
        await api.createParent(formData);
        toast.success('Family created successfully');
      }
      setOpen(false);
      setEditingFamily(null);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Operation failed');
    }
  };

  const handleEdit = (family) => {
    setEditingFamily(family);
    setFormData({
      name: family.name,
      email: family.email,
      phone: family.phone,
      relationship: family.relationship || 'family',
      student_ids: family.student_ids || [],
      group_tags: family.group_tags || [],
      auto_invoice: family.auto_invoice || false,
      auto_invoice_frequency: family.auto_invoice_frequency || 'monthly',
      notes: family.notes || ''
    });
    setOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this family?')) {
      try {
        await api.deleteParent(id);
        toast.success('Family deleted successfully');
        fetchData();
      } catch (error) {
        toast.error('Failed to delete family');
      }
    }
  };

  const handleAddTransaction = async () => {
    if (!selectedFamily || !transactionData.amount) return;
    try {
      await api.addFamilyTransaction(
        selectedFamily.id,
        parseFloat(transactionData.amount),
        transactionData.description,
        transactionData.type
      );
      toast.success('Transaction added successfully');
      setShowTransactionDialog(false);
      setTransactionData({ amount: '', description: '', type: 'payment' });
      fetchData();
    } catch (error) {
      toast.error('Failed to add transaction');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      relationship: 'family',
      student_ids: [],
      group_tags: [],
      auto_invoice: false,
      auto_invoice_frequency: 'monthly',
      notes: ''
    });
    setNewTag('');
  };

  const handleViewDetails = async (family) => {
    setLoadingSummary(true);
    setDetailsOpen(true);
    try {
      const response = await api.getFamilySummary(family.id);
      setFamilySummary(response.data);
    } catch (error) {
      toast.error('Failed to load family details');
      setDetailsOpen(false);
    } finally {
      setLoadingSummary(false);
    }
  };

  const getInvoiceStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle size={12} className="mr-1" />Paid</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertCircle size={12} className="mr-1" />Pending</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle size={12} className="mr-1" />Overdue</Badge>;
      case 'cancelled':
        return <Badge className="bg-slate-100 text-slate-800">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const addTag = () => {
    if (newTag && !formData.group_tags.includes(newTag)) {
      setFormData({ ...formData, group_tags: [...formData.group_tags, newTag] });
      setNewTag('');
    }
  };

  const removeTag = (tag) => {
    setFormData({ ...formData, group_tags: formData.group_tags.filter(t => t !== tag) });
  };

  const getStudentNames = (studentIds) => {
    if (!studentIds || studentIds.length === 0) return 'None';
    return studentIds
      .map(id => students.find(s => s.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  const filteredFamilies = families.filter(family =>
    family.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    family.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getBalanceColor = (balance) => {
    if (balance < 0) return 'text-red-600';
    if (balance > 0) return 'text-green-600';
    return 'text-slate-600';
  };

  return (
    <DashboardLayout>
      <div data-testid="families-invoices-page">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-4xl font-bold text-slate-900 tracking-tight font-heading">Families & Invoices</h1>
          <div className="mt-2 flex items-center gap-4 text-sm">
            <span className="text-primary font-semibold">
              You're owed {formatAmount(totalOwed)} as of {asOfDate}
            </span>
          </div>
          <p className="text-slate-500 mt-1">Prepaid Balance: {formatAmount(prepaidBalance)}</p>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
            <DialogTrigger asChild>
              <Button 
                className="bg-teal-600 hover:bg-teal-700"
                onClick={() => setSelectedFamily(null)}
                disabled={!selectedFamily}
                data-testid="add-transaction-button"
              >
                <Plus size={18} className="mr-2" />
                Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Transaction for {selectedFamily?.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Transaction Type</Label>
                  <Select 
                    value={transactionData.type} 
                    onValueChange={(v) => setTransactionData({...transactionData, type: v})}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="payment">Payment (Credit)</SelectItem>
                      <SelectItem value="charge">Charge (Debit)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Amount ({currencySymbol})</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={transactionData.amount}
                    onChange={(e) => setTransactionData({...transactionData, amount: e.target.value})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={transactionData.description}
                    onChange={(e) => setTransactionData({...transactionData, description: e.target.value})}
                    className="mt-1"
                    placeholder="e.g., Monthly fee payment"
                  />
                </div>
                <Button onClick={handleAddTransaction} className="w-full">Add Transaction</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" data-testid="charge-categories-button">
            <Columns size={16} className="mr-2" />
            Charge Categories
          </Button>

          <Button variant="outline" data-testid="auto-invoicing-button">
            <RefreshCw size={16} className="mr-2" />
            Auto-Invoicing
          </Button>

          <div className="flex-1" />

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
              className="pl-9 w-48"
              data-testid="family-search-input"
            />
          </div>
        </div>

        {/* Add Family Button */}
        <div className="mb-4">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                data-testid="add-family-button"
                onClick={() => {
                  setEditingFamily(null);
                  resetForm();
                }}
                className="bg-primary hover:bg-primary-hover"
              >
                <Plus size={18} className="mr-2" />
                Add Family
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingFamily ? 'Edit Family' : 'Add New Family'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="name">Family Name</Label>
                  <Input
                    id="name"
                    data-testid="family-name-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="mt-1"
                    placeholder="e.g., Smith Family"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      data-testid="family-email-input"
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
                      data-testid="family-phone-input"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Group Tags */}
                <div>
                  <Label>Group Tags</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      placeholder="Add tag (e.g., Robotics)"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    />
                    <Button type="button" variant="outline" onClick={addTag}>Add</Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.group_tags.map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <X size={14} className="cursor-pointer" onClick={() => removeTag(tag)} />
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Students */}
                <div>
                  <Label>Students (Hold Ctrl/Cmd for multiple)</Label>
                  <select
                    multiple
                    data-testid="family-students-select"
                    value={formData.student_ids}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      setFormData({ ...formData, student_ids: selected });
                    }}
                    className="w-full mt-1 px-3 py-2 border rounded-md border-slate-200 bg-slate-50 focus:bg-white transition-colors"
                    style={{ minHeight: '100px' }}
                  >
                    {students.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Auto-Invoice Toggle */}
                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <Label>Auto-Invoice</Label>
                    <p className="text-xs text-slate-500">Automatically generate invoices</p>
                  </div>
                  <Checkbox
                    checked={formData.auto_invoice}
                    onCheckedChange={(checked) => setFormData({ ...formData, auto_invoice: checked })}
                    data-testid="auto-invoice-checkbox"
                  />
                </div>

                {formData.auto_invoice && (
                  <div>
                    <Label>Invoice Frequency</Label>
                    <Select
                      value={formData.auto_invoice_frequency}
                      onValueChange={(value) => setFormData({ ...formData, auto_invoice_frequency: value })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button type="submit" data-testid="family-submit-button" className="w-full bg-primary hover:bg-primary-hover">
                  {editingFamily ? 'Update Family' : 'Add Family'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Families Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-slate-500">Loading...</div>
            ) : filteredFamilies.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No families found. Add your first family!</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-10">
                        <Checkbox />
                      </TableHead>
                      <TableHead className="font-semibold">Family</TableHead>
                      <TableHead className="font-semibold">Family Contact</TableHead>
                      <TableHead className="font-semibold">Group Tags</TableHead>
                      <TableHead className="font-semibold text-right">Balance</TableHead>
                      <TableHead className="font-semibold">Auto-Invoice</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFamilies.map((family) => (
                      <TableRow 
                        key={family.id} 
                        data-testid={`family-row-${family.id}`}
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => setSelectedFamily(family)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox 
                            checked={selectedFamily?.id === family.id}
                            onCheckedChange={() => setSelectedFamily(family)}
                          />
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-teal-600 hover:underline cursor-pointer">
                            {family.name}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {family.email && (
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Mail size={14} />
                                {family.email}
                              </div>
                            )}
                            {family.phone && (
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <Phone size={14} />
                                {family.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(family.group_tags || []).map((tag, idx) => (
                              <Badge key={idx} variant="secondary" className="bg-teal-100 text-teal-800">
                                {tag}
                              </Badge>
                            ))}
                            {(!family.group_tags || family.group_tags.length === 0) && (
                              <span className="text-slate-400">-</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className={`text-right font-medium ${getBalanceColor(family.calculated_balance || family.balance || 0)}`}>
                          {formatAmount(family.calculated_balance || family.balance || 0)}
                        </TableCell>
                        <TableCell>
                          {family.auto_invoice ? (
                            <Badge className="bg-green-100 text-green-800">Enabled</Badge>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`view-family-${family.id}`}
                              onClick={() => handleViewDetails(family)}
                              title="View Details"
                            >
                              <Eye size={14} className="text-blue-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`edit-family-${family.id}`}
                              onClick={() => handleEdit(family)}
                              title="Edit"
                            >
                              <Pencil size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`delete-family-${family.id}`}
                              onClick={() => handleDelete(family.id)}
                              title="Delete"
                            >
                              <Trash2 size={14} className="text-red-500" />
                            </Button>
                            <ChevronRight size={16} className="text-slate-400" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Family Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users size={20} />
                {familySummary?.family?.name || 'Family'} Details
              </DialogTitle>
            </DialogHeader>
            
            {loadingSummary ? (
              <div className="py-8 text-center text-slate-500">Loading...</div>
            ) : familySummary && (
              <div className="space-y-6 mt-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="pt-4 text-center">
                      <p className="text-2xl font-bold text-blue-700">{familySummary.summary.total_students}</p>
                      <p className="text-xs text-blue-600">Students</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-orange-50 border-orange-200">
                    <CardContent className="pt-4 text-center">
                      <p className="text-2xl font-bold text-orange-700">{formatAmount(familySummary.summary.total_invoiced)}</p>
                      <p className="text-xs text-orange-600">Total Invoiced</p>
                      {familySummary.summary.cancelled_amount > 0 && (
                        <p className="text-xs text-slate-400 mt-1">
                          (excl. {formatAmount(familySummary.summary.cancelled_amount)} cancelled)
                        </p>
                      )}
                    </CardContent>
                  </Card>
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="pt-4 text-center">
                      <p className="text-2xl font-bold text-green-700">{formatAmount(familySummary.summary.total_paid)}</p>
                      <p className="text-xs text-green-600">Total Paid</p>
                    </CardContent>
                  </Card>
                  <Card className={familySummary.summary.outstanding_balance > 0 ? "bg-red-50 border-red-200" : "bg-slate-50"}>
                    <CardContent className="pt-4 text-center">
                      <p className={`text-2xl font-bold ${familySummary.summary.outstanding_balance > 0 ? 'text-red-700' : 'text-slate-700'}`}>
                        {formatAmount(familySummary.summary.outstanding_balance)}
                      </p>
                      <p className="text-xs text-slate-600">Outstanding</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Credit Balance */}
                {(familySummary.summary.credit_balance > 0 || familySummary.summary.on_account_balance > 0) && (
                  <Card className="bg-purple-50 border-purple-200">
                    <CardContent className="pt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="text-purple-600" />
                        <span className="font-medium">Available Credit</span>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-purple-700">
                          {formatAmount(familySummary.summary.credit_balance + familySummary.summary.on_account_balance)}
                        </p>
                        {familySummary.summary.on_account_balance > 0 && (
                          <p className="text-xs text-purple-600">On-account: {formatAmount(familySummary.summary.on_account_balance)}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Tabs defaultValue="students" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="students" className="flex items-center gap-1">
                      <Users size={14} /> Students ({familySummary.students?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="invoices" className="flex items-center gap-1">
                      <FileText size={14} /> Invoices ({familySummary.invoices?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="payments" className="flex items-center gap-1">
                      <Receipt size={14} /> Payments ({familySummary.payments?.length || 0})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="students" className="mt-4">
                    {familySummary.students?.length > 0 ? (
                      <div className="space-y-2">
                        {familySummary.students.map(student => (
                          <Card key={student.id}>
                            <CardContent className="pt-4 flex items-center justify-between">
                              <div>
                                <p className="font-medium">{student.name}</p>
                                <p className="text-sm text-slate-500">{student.email}</p>
                              </div>
                              <div className="text-right text-sm">
                                <p>Credit: <span className="text-green-600">{formatAmount(student.credit_balance || 0)}</span></p>
                                <p>Classes: {student.class_ids?.length || 0}</p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center py-4 text-slate-500">No students linked to this family</p>
                    )}
                  </TabsContent>

                  <TabsContent value="invoices" className="mt-4">
                    {familySummary.invoices?.length > 0 ? (
                      <div className="max-h-64 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Invoice #</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {familySummary.invoices.map(invoice => (
                              <TableRow key={invoice.id}>
                                <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                                <TableCell>{new Date(invoice.issue_date).toLocaleDateString()}</TableCell>
                                <TableCell>{formatAmount(invoice.amount)}</TableCell>
                                <TableCell>{getInvoiceStatusBadge(invoice.status)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-center py-4 text-slate-500">No invoices for this family</p>
                    )}
                    <div className="mt-3 p-3 bg-slate-50 rounded flex justify-between text-sm">
                      <span>Pending: {familySummary.summary.invoice_summary?.pending || 0}</span>
                      <span className="text-green-600">Paid: {familySummary.summary.invoice_summary?.paid || 0}</span>
                      <span className="text-red-600">Overdue: {familySummary.summary.invoice_summary?.overdue || 0}</span>
                    </div>
                  </TabsContent>

                  <TabsContent value="payments" className="mt-4">
                    {familySummary.payments?.length > 0 ? (
                      <div className="max-h-64 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Receipt #</TableHead>
                              <TableHead>Date</TableHead>
                              <TableHead>Method</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Type</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {familySummary.payments.map(payment => (
                              <TableRow key={payment.id}>
                                <TableCell className="font-medium">{payment.receipt_number}</TableCell>
                                <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                                <TableCell>{payment.payment_method}</TableCell>
                                <TableCell className="text-green-600">{formatAmount(payment.amount)}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">
                                    {payment.payment_type === 'on_account' ? 'On Account' : 'Invoice'}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ) : (
                      <p className="text-center py-4 text-slate-500">No payments recorded</p>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailsOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default FamiliesInvoices;
