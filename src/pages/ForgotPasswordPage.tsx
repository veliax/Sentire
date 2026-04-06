import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail]     = useState('');
  const [error, setError]     = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address.');
      return;
    }
    setSubmitted(true);
  };

  // ── success state ─────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 bg-card/80 backdrop-blur border-border shadow-xl shadow-primary/5">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-primary/20 border border-primary/30 p-3 rounded-full mb-4">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-foreground text-2xl font-bold">Check your email</h1>
            <p className="text-muted-foreground text-center mt-2 text-sm">
              We sent a password reset link to
            </p>
            <p className="text-primary text-sm font-medium mt-1">{email}</p>
          </div>

          <div className="space-y-3">
            <p className="text-center text-xs text-muted-foreground">
              Didn't receive it? Check your spam folder or{' '}
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="text-primary hover:text-primary/80 hover:underline transition-colors"
              >
                try again
              </button>
              .
            </p>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => navigate('/login')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sign In
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // ── form state ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-card/80 backdrop-blur border-border shadow-xl shadow-primary/5">

        {/* header */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary/20 border border-primary/30 p-3 rounded-full mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-foreground text-2xl font-bold">Forgot Password?</h1>
          <p className="text-muted-foreground text-center mt-2 text-sm">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        {/* form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className={`flex items-center h-9 w-full rounded-md border bg-input-background px-3 text-sm transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 ${error ? 'border-destructive' : 'border-input'}`}>
              <input
                id="email"
                type="email"
                placeholder="jane@example.com"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); }}
                className="flex-1 bg-transparent py-1 text-sm placeholder:text-muted-foreground outline-none"
              />
              <Mail className="shrink-0 ml-2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <Button type="submit" className="w-full">
            Send Reset Link
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Remember your password?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-primary hover:text-primary/80 hover:underline transition-colors"
            >
              Sign in
            </button>
          </p>
        </form>
      </Card>
    </div>
  );
}
