import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';

type Strength = 'empty' | 'weak' | 'fair' | 'strong';

const STRENGTH: Record<Strength, { label: string; bars: number; barCls: string; txtCls: string }> = {
  empty:  { label: '',       bars: 0, barCls: '',               txtCls: '' },
  weak:   { label: 'Weak',   bars: 1, barCls: 'bg-destructive', txtCls: 'text-destructive' },
  fair:   { label: 'Fair',   bars: 2, barCls: 'bg-yellow-500',  txtCls: 'text-yellow-400' },
  strong: { label: 'Strong', bars: 3, barCls: 'bg-green-500',   txtCls: 'text-green-400' },
};

function getStrength(pw: string): Strength {
  if (!pw) return 'empty';
  let s = 0;
  if (pw.length >= 8)          s++;
  if (/[A-Z]/.test(pw))        s++;
  if (/[0-9]/.test(pw))        s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (s <= 1) return 'weak';
  if (s === 2) return 'fair';
  return 'strong';
}

export function RegisterPage() {
  const navigate = useNavigate();

  const [fullName, setFullName]               = useState('');
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw]                   = useState(false);
  const [showConfirm, setShowConfirm]         = useState(false);
  const [errors, setErrors]                   = useState<Record<string, string>>({});

  const strength = getStrength(password);
  const { label: sLabel, bars: sBars, barCls, txtCls } = STRENGTH[strength];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!fullName.trim())          newErrors.fullName        = 'Full name is required';
    if (!email.trim())             newErrors.email           = 'Email is required';
    if (!password)                 newErrors.password        = 'Password is required';
    else if (strength === 'weak')  newErrors.password        = 'Password is too weak';
    if (!confirmPassword)          newErrors.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword)
                                   newErrors.confirmPassword = 'Passwords do not match';

    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-card/80 backdrop-blur border-border shadow-xl shadow-primary/5">

        {/* — logo — */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary/20 border border-primary/30 p-3 rounded-full mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-foreground text-2xl font-bold">Create Account</h1>
          <p className="text-muted-foreground text-center mt-2 text-sm">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-primary hover:text-primary/80 hover:underline transition-colors"
            >
              Sign in
            </button>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Jane Smith"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className={errors.fullName ? 'border-destructive' : ''}
            />
            {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="jane@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className={`flex items-center h-9 w-full rounded-md border bg-input-background px-3 text-sm transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 ${errors.password ? 'border-destructive' : 'border-input'}`}>
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="flex-1 bg-transparent py-1 text-sm placeholder:text-muted-foreground outline-none"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPw(v => !v)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                className="ml-2 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {/* strength meter */}
            {password && (
              <div className="space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3].map(i => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= sBars ? barCls : 'bg-border'}`}
                    />
                  ))}
                </div>
                <p className={`text-sm ${txtCls}`}>{sLabel} password</p>
              </div>
            )}
            {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className={`flex items-center h-9 w-full rounded-md border bg-input-background px-3 text-sm transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 ${errors.confirmPassword ? 'border-destructive' : 'border-input'}`}>
              <input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="flex-1 bg-transparent py-1 text-sm placeholder:text-muted-foreground outline-none"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowConfirm(v => !v)}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                className="ml-2 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
          </div>

          <Button type="submit" className="w-full">
            Create Account
          </Button>

        </form>
      </Card>
    </div>
  );
}
