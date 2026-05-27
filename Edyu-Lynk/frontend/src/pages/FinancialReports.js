import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { api } from '@/services/api';
import { useCurrency } from '@/context/CurrencyContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { FileText, TrendingUp, Scale, BarChart3, RefreshCw } from 'lucide-react';

const FinancialReports = () => {
  const { currencySymbol } = useCurrency();
  const [trialBalance, setTrialBalance] = useState(null);
  const [incomeStatement, setIncomeStatement] = useState(null);
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [loading, setLoading] = useState({});

  useEffect(() => {
    fetchAllReports();
  }, []);

  const fetchAllReports = () => {
    fetchTrialBalance();
    fetchIncomeStatement();
    fetchBalanceSheet();
  };

  const fetchTrialBalance = async () => {
    setLoading(prev => ({ ...prev, trial: true }));
    try {
      const response = await api.getTrialBalance();
      setTrialBalance(response.data);
    } catch (error) {
      toast.error('Failed to fetch trial balance');
    } finally {
      setLoading(prev => ({ ...prev, trial: false }));
    }
  };

  const fetchIncomeStatement = async () => {
    setLoading(prev => ({ ...prev, income: true }));
    try {
      const response = await api.getIncomeStatement();
      setIncomeStatement(response.data);
    } catch (error) {
      toast.error('Failed to fetch income statement');
    } finally {
      setLoading(prev => ({ ...prev, income: false }));
    }
  };

  const fetchBalanceSheet = async () => {
    setLoading(prev => ({ ...prev, balance: true }));
    try {
      const response = await api.getBalanceSheet();
      setBalanceSheet(response.data);
    } catch (error) {
      toast.error('Failed to fetch balance sheet');
    } finally {
      setLoading(prev => ({ ...prev, balance: false }));
    }
  };

  const initializeAccounts = async () => {
    try {
      const response = await api.initializeAccounts();
      toast.success(response.data.message);
      fetchAllReports();
    } catch (error) {
      toast.error('Failed to initialize accounts');
    }
  };

  return (
    <DashboardLayout>
      <div data-testid="financial-reports-page">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight font-heading">Financial Reports</h1>
            <p className="text-sm sm:text-base leading-relaxed text-slate-600 mt-2">View accounting reports and financial statements</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={initializeAccounts}
              data-testid="initialize-accounts-button"
            >
              Initialize Accounts
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const response = await api.seedTestData();
                  toast.success(`Test data created: ${response.data.summary.students} students, ${response.data.summary.teachers} teachers, ${response.data.summary.classes} classes`);
                } catch (error) {
                  toast.error('Failed to create test data');
                }
              }}
              data-testid="seed-test-data-button"
            >
              Create Test Data
            </Button>
            <Button
              onClick={fetchAllReports}
              data-testid="refresh-reports-button"
              className="bg-primary hover:bg-primary-hover"
            >
              <RefreshCw size={16} className="mr-2" />
              Refresh Reports
            </Button>
          </div>
        </div>

        <Tabs defaultValue="income" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="income" data-testid="tab-income-statement">
              <TrendingUp size={16} className="mr-2" />
              <span className="hidden sm:inline">Income Statement</span>
              <span className="sm:hidden">P&L</span>
            </TabsTrigger>
            <TabsTrigger value="balance" data-testid="tab-balance-sheet">
              <Scale size={16} className="mr-2" />
              <span className="hidden sm:inline">Balance Sheet</span>
              <span className="sm:hidden">Balance</span>
            </TabsTrigger>
            <TabsTrigger value="trial" data-testid="tab-trial-balance">
              <BarChart3 size={16} className="mr-2" />
              <span className="hidden sm:inline">Trial Balance</span>
              <span className="sm:hidden">Trial</span>
            </TabsTrigger>
          </TabsList>

          {/* Income Statement */}
          <TabsContent value="income">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText size={20} className="text-primary" />
                  Income Statement (Profit & Loss)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading.income ? (
                  <div className="p-8 text-center text-slate-500">Loading...</div>
                ) : incomeStatement ? (
                  <div className="space-y-6">
                    {/* Revenue */}
                    <div>
                      <h3 className="font-semibold text-lg mb-3 text-green-700">Revenue</h3>
                      <div className="space-y-2 ml-4">
                        <div className="flex justify-between">
                          <span>Fee Income</span>
                          <span className="font-medium">{currencySymbol}{incomeStatement.revenue.fee_income.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex justify-between font-bold mt-3 pt-3 border-t">
                        <span>Total Revenue</span>
                        <span className="text-green-600">{currencySymbol}{incomeStatement.revenue.total.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Expenses */}
                    <div>
                      <h3 className="font-semibold text-lg mb-3 text-red-700">Expenses</h3>
                      <div className="space-y-2 ml-4">
                        {Object.entries(incomeStatement.expenses).map(([category, amount]) => (
                          <div key={category} className="flex justify-between">
                            <span>{category}</span>
                            <span className="font-medium">{currencySymbol}{amount.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between font-bold mt-3 pt-3 border-t">
                        <span>Total Expenses</span>
                        <span className="text-red-600">{currencySymbol}{incomeStatement.total_expenses.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Net Income */}
                    <div className={`p-4 rounded-lg ${
                      incomeStatement.net_income >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                    }`}>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium text-slate-600">Net Income</p>
                          <p className={`text-2xl font-bold ${
                            incomeStatement.net_income >= 0 ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {currencySymbol}{incomeStatement.net_income.toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-600">Profit Margin</p>
                          <p className="text-xl font-semibold">{incomeStatement.profit_margin.toFixed(2)}%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500">No data available</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Balance Sheet */}
          <TabsContent value="balance">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale size={20} className="text-primary" />
                  Balance Sheet
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading.balance ? (
                  <div className="p-8 text-center text-slate-500">Loading...</div>
                ) : balanceSheet ? (
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Assets */}
                    <div>
                      <h3 className="font-semibold text-lg mb-3 text-blue-700">Assets</h3>
                      <div className="space-y-2">
                        {Object.entries(balanceSheet.assets).map(([name, amount]) => (
                          <div key={name} className="flex justify-between">
                            <span>{name}</span>
                            <span className="font-medium">{currencySymbol}{amount.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between font-bold mt-3 pt-3 border-t border-blue-200">
                        <span>Total Assets</span>
                        <span className="text-blue-600">{currencySymbol}{balanceSheet.total_assets.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Liabilities & Equity */}
                    <div>
                      <h3 className="font-semibold text-lg mb-3 text-purple-700">Liabilities</h3>
                      <div className="space-y-2">
                        {Object.entries(balanceSheet.liabilities).map(([name, amount]) => (
                          <div key={name} className="flex justify-between">
                            <span>{name}</span>
                            <span className="font-medium">{currencySymbol}{amount.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between font-bold mt-3 pt-3 border-t border-purple-200">
                        <span>Total Liabilities</span>
                        <span className="text-purple-600">{currencySymbol}{balanceSheet.total_liabilities.toLocaleString()}</span>
                      </div>

                      <h3 className="font-semibold text-lg mb-3 mt-6 text-green-700">Equity</h3>
                      <div className="space-y-2">
                        {Object.entries(balanceSheet.equity).map(([name, amount]) => (
                          <div key={name} className="flex justify-between">
                            <span>{name}</span>
                            <span className="font-medium">{currencySymbol}{amount.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between font-bold mt-3 pt-3 border-t border-green-200">
                        <span>Total Equity</span>
                        <span className="text-green-600">{currencySymbol}{balanceSheet.total_equity.toLocaleString()}</span>
                      </div>

                      <div className="flex justify-between font-bold mt-6 pt-3 border-t-2 border-slate-300">
                        <span>Total Liabilities + Equity</span>
                        <span>{currencySymbol}{balanceSheet.total_liabilities_and_equity.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Balance Status */}
                    <div className="md:col-span-2">
                      <div className={`p-4 rounded-lg text-center ${
                        balanceSheet.balanced ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                      }`}>
                        <p className={`font-bold ${
                          balanceSheet.balanced ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {balanceSheet.balanced ? '✓ Books are Balanced' : '✗ Books are NOT Balanced'}
                        </p>
                        <p className="text-sm text-slate-600 mt-1">
                          Assets = Liabilities + Equity
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500">No data available</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Trial Balance */}
          <TabsContent value="trial">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 size={20} className="text-primary" />
                  Trial Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading.trial ? (
                  <div className="p-8 text-center text-slate-500">Loading...</div>
                ) : trialBalance ? (
                  <div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="whitespace-nowrap">Account Code</TableHead>
                            <TableHead className="whitespace-nowrap">Account Name</TableHead>
                            <TableHead className="whitespace-nowrap">Type</TableHead>
                            <TableHead className="text-right whitespace-nowrap">Debit</TableHead>
                            <TableHead className="text-right whitespace-nowrap">Credit</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {trialBalance.accounts.map((account) => (
                            <TableRow key={account.account_code}>
                              <TableCell className="font-medium whitespace-nowrap">{account.account_code}</TableCell>
                              <TableCell className="whitespace-nowrap">{account.account_name}</TableCell>
                              <TableCell className="whitespace-nowrap">
                                <span className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700">
                                  {account.account_type.toUpperCase()}
                                </span>
                              </TableCell>
                              <TableCell className="text-right whitespace-nowrap">
                                {account.debit > 0 ? `{currencySymbol}${account.debit.toLocaleString()}` : '-'}
                              </TableCell>
                              <TableCell className="text-right whitespace-nowrap">
                                {account.credit > 0 ? `{currencySymbol}${account.credit.toLocaleString()}` : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-bold bg-slate-50">
                            <TableCell colSpan={3}>Total</TableCell>
                            <TableCell className="text-right">{currencySymbol}{trialBalance.total_debit.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{currencySymbol}{trialBalance.total_credit.toLocaleString()}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>

                    <div className={`mt-6 p-4 rounded-lg text-center ${
                      trialBalance.balanced ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                    }`}>
                      <p className={`font-bold ${
                        trialBalance.balanced ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {trialBalance.balanced ? '✓ Trial Balance is Balanced' : '✗ Trial Balance is NOT Balanced'}
                      </p>
                      <p className="text-sm text-slate-600 mt-1">
                        Total Debits = Total Credits
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500">No data available. Initialize accounts first.</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default FinancialReports;