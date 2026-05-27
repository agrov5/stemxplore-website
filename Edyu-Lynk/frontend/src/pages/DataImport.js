import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, Download, FileSpreadsheet, Users, GraduationCap, Calendar, DollarSign, AlertCircle } from 'lucide-react';

const DataImport = () => {
  const [importing, setImporting] = useState({});
  const [results, setResults] = useState({});

  const importTypes = [
    { 
      key: 'students', 
      title: 'Import Students', 
      icon: Users, 
      description: 'Import student data from TutorBird or CSV/Excel files',
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    { 
      key: 'teachers', 
      title: 'Import Teachers', 
      icon: GraduationCap, 
      description: 'Import teacher information and subjects',
      color: 'text-purple-600',
      bg: 'bg-purple-50'
    },
    { 
      key: 'attendance', 
      title: 'Import Attendance', 
      icon: Calendar, 
      description: 'Import past attendance records',
      color: 'text-green-600',
      bg: 'bg-green-50'
    },
    { 
      key: 'payments', 
      title: 'Import Payments', 
      icon: DollarSign, 
      description: 'Import payment history and fee records',
      color: 'text-orange-600',
      bg: 'bg-orange-50'
    }
  ];

  const handleFileUpload = async (event, type) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.name.match(/\.(csv|xlsx|xls)$/)) {
      toast.error('Please upload a CSV or Excel file');
      return;
    }

    setImporting({ ...importing, [type]: true });
    setResults({ ...results, [type]: null });

    try {
      let response;
      switch(type) {
        case 'students':
          response = await api.importStudents(file);
          break;
        case 'teachers':
          response = await api.importTeachers(file);
          break;
        case 'attendance':
          response = await api.importAttendance(file);
          break;
        case 'payments':
          response = await api.importPayments(file);
          break;
        default:
          throw new Error('Invalid import type');
      }

      setResults({ ...results, [type]: response.data });
      
      if (response.data.imported > 0) {
        toast.success(`Successfully imported ${response.data.imported} records!`);
      } else {
        toast.warning('No new records were imported');
      }
      
      if (response.data.errors && response.data.errors.length > 0) {
        console.warn('Import errors:', response.data.errors);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Import failed');
      setResults({ 
        ...results, 
        [type]: { 
          message: 'Failed', 
          imported: 0, 
          skipped: 0, 
          errors: [error.response?.data?.detail || error.message] 
        } 
      });
    } finally {
      setImporting({ ...importing, [type]: false });
      event.target.value = '';
    }
  };

  const handleDownloadTemplate = (type) => {
    const url = api.downloadImportTemplate(type);
    window.open(url, '_blank');
    toast.success('Template downloaded');
  };

  return (
    <DashboardLayout>
      <div data-testid="data-import-page">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight font-heading">Data Import</h1>
          <p className="text-sm sm:text-base leading-relaxed text-slate-600 mt-2">
            Import your existing data from TutorBird or other coaching management systems
          </p>
        </div>

        {/* Instructions Card */}
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-blue-600 flex-shrink-0 mt-1" size={20} />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-2">Import Instructions</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Download the template to see the required format</li>
                  <li>• Export your data from TutorBird (Excel/CSV format)</li>
                  <li>• Match the columns or use our template format</li>
                  <li>• Upload the file - existing records will be skipped</li>
                  <li>• Supported formats: CSV, Excel (.xlsx, .xls)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Import Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {importTypes.map((importType) => (
            <Card key={importType.key} className="border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className={`${importType.bg} p-3 rounded-md`}>
                    <importType.icon className={importType.color} size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-heading">{importType.title}</h3>
                    <p className="text-sm text-slate-500 font-normal mt-1">{importType.description}</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleDownloadTemplate(importType.key)}
                    className="flex-1"
                    data-testid={`download-template-${importType.key}`}
                  >
                    <Download size={16} className="mr-2" />
                    Download Template
                  </Button>
                  <Button
                    onClick={() => document.getElementById(`file-input-${importType.key}`).click()}
                    disabled={importing[importType.key]}
                    className="flex-1 bg-primary hover:bg-primary-hover"
                    data-testid={`upload-button-${importType.key}`}
                  >
                    {importing[importType.key] ? (
                      'Importing...'
                    ) : (
                      <>
                        <Upload size={16} className="mr-2" />
                        Upload File
                      </>
                    )}
                  </Button>
                  <input
                    id={`file-input-${importType.key}`}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => handleFileUpload(e, importType.key)}
                    className="hidden"
                    data-testid={`file-input-${importType.key}`}
                  />
                </div>

                {/* Results */}
                {results[importType.key] && (
                  <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <h4 className="font-semibold text-sm mb-2">Import Results:</h4>
                    <div className="text-sm space-y-1">
                      <p className="text-green-600">✓ Imported: {results[importType.key].imported}</p>
                      <p className="text-yellow-600">⊘ Skipped: {results[importType.key].skipped}</p>
                      {results[importType.key].errors && results[importType.key].errors.length > 0 && (
                        <div className="mt-2">
                          <p className="text-red-600 font-medium">Errors:</p>
                          <ul className="text-xs text-red-600 ml-4 mt-1 space-y-1">
                            {results[importType.key].errors.map((error, idx) => (
                              <li key={idx}>• {error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Help Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet size={20} className="text-primary" />
              Need Help?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-slate-600">
              <p><strong>Exporting from TutorBird:</strong></p>
              <ol className="list-decimal ml-5 space-y-1">
                <li>Go to TutorBird → Students/Teachers → Export</li>
                <li>Choose Excel or CSV format</li>
                <li>Download the file</li>
                <li>Upload it here (we'll auto-map the columns)</li>
              </ol>
              <p className="mt-4"><strong>Column Mapping:</strong> Our system automatically maps common column names like "Student Name", "Email", "Phone", etc. If your file has different column names, download our template and reformat your data accordingly.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default DataImport;