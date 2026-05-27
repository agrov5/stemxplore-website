import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Mail, ArrowLeft } from 'lucide-react';
import axios from 'axios';

const API_BASE = `${import.meta.env.VITE_BACKEND_URL}/api`;

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/auth/forgot-password`, { email });
      toast.success(res.data.message);
      setSubmitted(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send reset email');
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
            <p className="text-slate-600">Reset your password</p>
          </div>

          {submitted ? (
            <div className="text-center space-y-4" data-testid="forgot-password-submitted">
              <div className="text-green-600">
                <Mail className="mx-auto" size={48} />
              </div>
              <p className="text-slate-700">
                If an account exists for <span className="font-medium">{email}</span>, a password reset link has been sent.
              </p>
              <p className="text-xs text-slate-500">The link will expire in 1 hour. Check your spam folder if you don't see it.</p>
              <Link to="/login" className="text-primary hover:underline text-sm inline-flex items-center gap-1">
                <ArrowLeft size={14} /> Back to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="forgot-password-form">
              <p className="text-sm text-slate-600 mb-4">
                Enter your email address and we'll send you a link to reset your password.
              </p>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  data-testid="forgot-email-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="mt-1"
                />
              </div>
              <Button
                type="submit"
                data-testid="forgot-submit-button"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-hover"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
              <div className="text-center">
                <Link to="/login" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                  <ArrowLeft size={14} /> Back to login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
