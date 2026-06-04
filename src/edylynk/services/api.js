import axios from 'axios';

const API_BASE = `${import.meta.env.VITE_BACKEND_URL}/api`;

const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const api = {
  // Students
  getStudents: () => axios.get(`${API_BASE}/students`, { headers: getAuthHeader() }),
  getStudent: (id) => axios.get(`${API_BASE}/students/${id}`, { headers: getAuthHeader() }),
  createStudent: (data) => axios.post(`${API_BASE}/students`, data, { headers: getAuthHeader() }),
  updateStudent: (id, data) => axios.put(`${API_BASE}/students/${id}`, data, { headers: getAuthHeader() }),
  deleteStudent: (id) => axios.delete(`${API_BASE}/students/${id}`, { headers: getAuthHeader() }),

  // Teachers
  getTeachers: () => axios.get(`${API_BASE}/teachers`, { headers: getAuthHeader() }),
  getTeacher: (id) => axios.get(`${API_BASE}/teachers/${id}`, { headers: getAuthHeader() }),
  createTeacher: (data) => axios.post(`${API_BASE}/teachers`, data, { headers: getAuthHeader() }),
  updateTeacher: (id, data) => axios.put(`${API_BASE}/teachers/${id}`, data, { headers: getAuthHeader() }),
  deleteTeacher: (id) => axios.delete(`${API_BASE}/teachers/${id}`, { headers: getAuthHeader() }),

  // Classes
  getClasses: () => axios.get(`${API_BASE}/classes`, { headers: getAuthHeader() }),
  getClass: (id) => axios.get(`${API_BASE}/classes/${id}`, { headers: getAuthHeader() }),
  createClass: (data) => axios.post(`${API_BASE}/classes`, data, { headers: getAuthHeader() }),
  updateClass: (id, data) => axios.put(`${API_BASE}/classes/${id}`, data, { headers: getAuthHeader() }),
  deleteClass: (id) => axios.delete(`${API_BASE}/classes/${id}`, { headers: getAuthHeader() }),
  regenerateClassEvents: (id, fromDate = null) => 
    axios.post(`${API_BASE}/classes/${id}/regenerate-events`, null, { 
      params: fromDate ? { from_date: fromDate } : {}, 
      headers: getAuthHeader() 
    }),

  // Attendance
  markAttendance: (data) => axios.post(`${API_BASE}/attendance`, data, { headers: getAuthHeader() }),
  getAttendance: (params) => axios.get(`${API_BASE}/attendance`, { params, headers: getAuthHeader() }),
  bulkMarkAttendance: (data) => axios.post(`${API_BASE}/attendance/bulk`, data, { headers: getAuthHeader() }),
  markAllAttendance: (classId, date, status, noChargeReason = null) => 
    axios.post(`${API_BASE}/attendance/mark-all`, null, { 
      params: { class_id: classId, date, status, no_charge_reason: noChargeReason }, 
      headers: getAuthHeader() 
    }),

  // Payments
  createPayment: (data) => axios.post(`${API_BASE}/payments`, data, { headers: getAuthHeader() }),
  getPayments: (params) => axios.get(`${API_BASE}/payments`, { params, headers: getAuthHeader() }),

  // Invoices
  createInvoice: (data) => axios.post(`${API_BASE}/invoices`, data, { headers: getAuthHeader() }),
  getInvoices: (params) => axios.get(`${API_BASE}/invoices`, { params, headers: getAuthHeader() }),
  getInvoice: (id) => axios.get(`${API_BASE}/invoices/${id}`, { headers: getAuthHeader() }),
  updateInvoiceStatus: (id, status) => axios.put(`${API_BASE}/invoices/${id}`, { status }, { headers: getAuthHeader() }),
  updateInvoice: (id, data) => axios.put(`${API_BASE}/invoices/${id}`, data, { headers: getAuthHeader() }),
  deleteInvoice: (id) => axios.delete(`${API_BASE}/invoices/${id}`, { headers: getAuthHeader() }),
  downloadInvoice: (id) => `${API_BASE}/invoices/${id}/download`,
  sendInvoiceToParent: (id, payload) => axios.post(`${API_BASE}/invoices/${id}/send-to-parent`, payload || {}, { headers: getAuthHeader() }),
  getInvoiceEmailDraft: (id) => axios.get(`${API_BASE}/invoices/${id}/email-draft`, { headers: getAuthHeader() }),
  generateAutoInvoices: () => axios.post(`${API_BASE}/invoices/generate-auto`, {}, { headers: getAuthHeader() }),
  generateInvoicePreview: (data) => axios.post(`${API_BASE}/invoices/generate-for-student`, data, { headers: getAuthHeader() }),
  generateFamilyInvoicePreview: (data) => axios.post(`${API_BASE}/invoices/generate-for-family`, data, { headers: getAuthHeader() }),
  createInvoiceFromPreview: (data) => axios.post(`${API_BASE}/invoices/create-from-preview`, data, { headers: getAuthHeader() }),
  createFamilyInvoice: (data) => axios.post(`${API_BASE}/invoices/create-family-invoice`, data, { headers: getAuthHeader() }),

  // Event Management
  cancelEvent: (eventId, createCredits = true) => axios.post(`${API_BASE}/events/${eventId}/cancel`, null, { params: { create_credits: createCredits }, headers: getAuthHeader() }),
  
  // Payments & Receipts
  getPayments: (params) => axios.get(`${API_BASE}/payments`, { params, headers: getAuthHeader() }),
  createPayment: (data) => axios.post(`${API_BASE}/payments`, data, { headers: getAuthHeader() }),
  getPayment: (id) => axios.get(`${API_BASE}/payments/${id}`, { headers: getAuthHeader() }),
  sendReceipt: (paymentId, payload) => axios.post(`${API_BASE}/payments/${paymentId}/send-receipt`, payload || {}, { headers: getAuthHeader() }),
  getReceiptEmailDraft: (paymentId) => axios.get(`${API_BASE}/payments/${paymentId}/receipt-draft`, { headers: getAuthHeader() }),
  markInvoicePaid: (invoiceId, data) => axios.post(`${API_BASE}/invoices/${invoiceId}/mark-paid`, null, { params: data, headers: getAuthHeader() }),
  applyOnAccountToInvoice: (studentId, invoiceId, amount) => axios.post(`${API_BASE}/payments/apply-on-account`, null, { 
    params: { student_id: studentId, invoice_id: invoiceId, amount }, 
    headers: getAuthHeader() 
  }),
  
  // Family Summary
  getFamilySummary: (familyId) => axios.get(`${API_BASE}/families/${familyId}/summary`, { headers: getAuthHeader() }),
  
  // Attendance - No Charge
  markAttendanceNoCharge: (studentId, classId, date, reason) => axios.post(`${API_BASE}/attendance/mark-no-charge`, null, { 
    params: { student_id: studentId, class_id: classId, date, reason }, 
    headers: getAuthHeader() 
  }),

  // Student Credits
  addStudentCredit: (studentId, amount, reason, originalClassDate = null) => 
    axios.post(`${API_BASE}/students/${studentId}/add-credit`, null, { 
      params: { amount, reason, original_class_date: originalClassDate }, 
      headers: getAuthHeader() 
    }),
  getStudentCredits: (studentId) => axios.get(`${API_BASE}/students/${studentId}/credits`, { headers: getAuthHeader() }),
  updateAutoInvoiceSettings: (studentId, settings) => 
    axios.post(`${API_BASE}/students/${studentId}/auto-invoice-settings`, null, { 
      params: settings, 
      headers: getAuthHeader() 
    }),

  // Dashboard
  getDashboardStats: () => axios.get(`${API_BASE}/dashboard/stats`, { headers: getAuthHeader() }),

  // Parents / Families
  getParents: (params) => axios.get(`${API_BASE}/parents`, { params, headers: getAuthHeader() }),
  getParent: (id) => axios.get(`${API_BASE}/parents/${id}`, { headers: getAuthHeader() }),
  createParent: (data) => axios.post(`${API_BASE}/parents`, data, { headers: getAuthHeader() }),
  updateParent: (id, data) => axios.put(`${API_BASE}/parents/${id}`, data, { headers: getAuthHeader() }),
  deleteParent: (id) => axios.delete(`${API_BASE}/parents/${id}`, { headers: getAuthHeader() }),
  getFamiliesSummary: () => axios.get(`${API_BASE}/families/summary`, { headers: getAuthHeader() }),
  addFamilyTransaction: (parentId, amount, description, transactionType) => 
    axios.post(`${API_BASE}/parents/${parentId}/add-transaction`, null, { 
      params: { amount, description, transaction_type: transactionType }, 
      headers: getAuthHeader() 
    }),

  // Events
  getEvents: (params) => axios.get(`${API_BASE}/events`, { params, headers: getAuthHeader() }),
  getEvent: (id) => axios.get(`${API_BASE}/events/${id}`, { headers: getAuthHeader() }),
  createEvent: (data) => axios.post(`${API_BASE}/events`, data, { headers: getAuthHeader() }),
  updateEvent: (id, data) => axios.put(`${API_BASE}/events/${id}`, data, { headers: getAuthHeader() }),
  deleteEvent: (id) => axios.delete(`${API_BASE}/events/${id}`, { headers: getAuthHeader() }),

  // Announcements
  getAnnouncements: () => axios.get(`${API_BASE}/announcements`, { headers: getAuthHeader() }),
  getAnnouncement: (id) => axios.get(`${API_BASE}/announcements/${id}`, { headers: getAuthHeader() }),
  createAnnouncement: (data, createdBy) => axios.post(`${API_BASE}/announcements?created_by=${createdBy}`, data, { headers: getAuthHeader() }),
  deleteAnnouncement: (id) => axios.delete(`${API_BASE}/announcements/${id}`, { headers: getAuthHeader() }),

  // Reminders
  getPendingReminders: () => axios.get(`${API_BASE}/reminders/pending`, { headers: getAuthHeader() }),
  sendDueReminders: () => axios.post(`${API_BASE}/reminders/send-due-reminders`, {}, { headers: getAuthHeader() }),
  configureReminder: (data) => axios.post(`${API_BASE}/reminders/configure`, data, { headers: getAuthHeader() }),

  // Accounting
  getAccounts: (params) => axios.get(`${API_BASE}/accounts`, { params, headers: getAuthHeader() }),
  createAccount: (data) => axios.post(`${API_BASE}/accounts`, data, { headers: getAuthHeader() }),
  deleteAccount: (id) => axios.delete(`${API_BASE}/accounts/${id}`, { headers: getAuthHeader() }),
  initializeAccounts: () => axios.post(`${API_BASE}/accounts/initialize`, {}, { headers: getAuthHeader() }),
  
  getExpenses: (params) => axios.get(`${API_BASE}/expenses`, { params, headers: getAuthHeader() }),
  createExpense: (data, createdBy) => axios.post(`${API_BASE}/expenses?created_by=${createdBy}`, data, { headers: getAuthHeader() }),
  deleteExpense: (id) => axios.delete(`${API_BASE}/expenses/${id}`, { headers: getAuthHeader() }),
  
  getTrialBalance: () => axios.get(`${API_BASE}/reports/trial-balance`, { headers: getAuthHeader() }),
  getIncomeStatement: (params) => axios.get(`${API_BASE}/reports/income-statement`, { params, headers: getAuthHeader() }),
  getBalanceSheet: () => axios.get(`${API_BASE}/reports/balance-sheet`, { headers: getAuthHeader() }),

  // Data Import
  importStudents: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axios.post(`${API_BASE}/import/students`, formData, { 
      headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' } 
    });
  },
  importTeachers: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axios.post(`${API_BASE}/import/teachers`, formData, { 
      headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' } 
    });
  },
  importAttendance: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axios.post(`${API_BASE}/import/attendance`, formData, { 
      headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' } 
    });
  },
  importPayments: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return axios.post(`${API_BASE}/import/payments`, formData, { 
      headers: { ...getAuthHeader(), 'Content-Type': 'multipart/form-data' } 
    });
  },
  downloadImportTemplate: (dataType) => `${API_BASE}/import/template/${dataType}`,

  // Student Groups
  getStudentGroups: () => axios.get(`${API_BASE}/student-groups`, { headers: getAuthHeader() }),
  getStudentGroup: (id) => axios.get(`${API_BASE}/student-groups/${id}`, { headers: getAuthHeader() }),
  createStudentGroup: (data, createdBy) => axios.post(`${API_BASE}/student-groups?created_by=${createdBy}`, data, { headers: getAuthHeader() }),
  updateStudentGroup: (id, data) => axios.put(`${API_BASE}/student-groups/${id}`, data, { headers: getAuthHeader() }),
  deleteStudentGroup: (id) => axios.delete(`${API_BASE}/student-groups/${id}`, { headers: getAuthHeader() }),

  // Settings
  getSettings: () => axios.get(`${API_BASE}/settings`, { headers: getAuthHeader() }),
  updateSettings: (data) => axios.put(`${API_BASE}/settings`, data, { headers: getAuthHeader() }),
  addExpenseCategory: (category) => axios.post(`${API_BASE}/settings/add-expense-category?category=${encodeURIComponent(category)}`, {}, { headers: getAuthHeader() }),
  deleteExpenseCategory: (category) => axios.delete(`${API_BASE}/settings/expense-category/${encodeURIComponent(category)}`, { headers: getAuthHeader() }),

  // Admin User Management
  getPendingUsers: () => axios.get(`${API_BASE}/admin/pending-users`, { headers: getAuthHeader() }),
  getAllUsers: () => axios.get(`${API_BASE}/admin/all-users`, { headers: getAuthHeader() }),
  syncClassEnrolments: () => axios.post(`${API_BASE}/admin/sync-student-class-links`, {}, { headers: getAuthHeader() }),
  approveUser: (userId) => axios.put(`${API_BASE}/admin/users/${userId}/approve`, {}, { headers: getAuthHeader() }),
  rejectUser: (userId) => axios.put(`${API_BASE}/admin/users/${userId}/reject`, {}, { headers: getAuthHeader() }),
  deleteUser: (userId) => axios.delete(`${API_BASE}/admin/users/${userId}`, { headers: getAuthHeader() }),

  // Test Data
  seedTestData: () => axios.post(`${API_BASE}/seed-test-data`, {}, { headers: getAuthHeader() }),

  // Website Manager – Gallery
  getGallery: () => axios.get(`${API_BASE}/website/gallery`),
  addGalleryItem: (data) => axios.post(`${API_BASE}/website/gallery`, data, { headers: getAuthHeader() }),
  deleteGalleryItem: (id) => axios.delete(`${API_BASE}/website/gallery/${id}`, { headers: getAuthHeader() }),

  // Website Manager – Programs / Courses
  getWebsitePrograms: () => axios.get(`${API_BASE}/website/programs`),
  createWebsiteProgram: (data) => axios.post(`${API_BASE}/website/programs`, data, { headers: getAuthHeader() }),
  updateWebsiteProgram: (id, data) => axios.put(`${API_BASE}/website/programs/${id}`, data, { headers: getAuthHeader() }),
  deleteWebsiteProgram: (id) => axios.delete(`${API_BASE}/website/programs/${id}`, { headers: getAuthHeader() }),

  // Website Manager – Stats
  getWebsiteStats: () => axios.get(`${API_BASE}/website/stats`),
  updateWebsiteStats: (stats) => axios.put(`${API_BASE}/website/stats`, stats, { headers: getAuthHeader() }),
};