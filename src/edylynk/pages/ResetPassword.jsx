import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { KeyRound, CheckCircle } from 'lucide-react';
import axios from 'axios';

const API_BASE = `${import.meta.env.VITE_BACKEND_URL}/api`;

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error('Reset token is missing in the URL');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/auth/reset-password`, { token, new_password: password });
      setDone(true);
      toast.success('Password updated successfully');
      setTimeout(() => navigate('/login'), 1500);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-primary font-heading mb-2">StemXplore</h1>
            <p className="text-slate-600">Set a new password</p>
          </div>

          {done ? (
            <div className="text-center space-y-4" data-testid="reset-password-success">
              <CheckCircle className="mx-auto text-green-600" size={48} />
              <p className="text-slate-700">Password updated! Redirecting to login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="reset-password-form">
              {!token && (
                <p className="text-sm text-red-600 mb-2">No reset token found in the URL. Please use the link from the email.</p>
              )}
              <div>
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  data-testid="reset-password-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  data-testid="reset-password-confirm-input"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              <Button
                type="submit"
                data-testid="reset-submit-button"
                disabled={loading || !token}
                className="w-full bg-primary hover:bg-primary-hover"
              >
                <KeyRound size={18} className="mr-2" />
                {loading ? 'Updating...' : 'Update Password'}
              </Button>
              <div className="text-center text-sm">
                <Link to="/login" className="text-primary hover:underline">Back to login</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
