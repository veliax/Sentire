import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { useApp } from '../context/AppContext';

export function LoginPage() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-card/80 backdrop-blur border-border shadow-xl shadow-primary/5">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary/20 border border-primary/30 p-3 rounded-full mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-foreground text-2xl font-bold">Welcome Back</h1>
          <p className="text-muted-foreground text-center mt-2">Sign in to Sentire System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
            >
              Forgot Password?
            </Link>
          </div>

          <Button type="submit" className="w-full">
            Login
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="text-primary hover:text-primary/80 hover:underline transition-colors"
            >
              Register
            </button>
          </p>
        </form>
      </Card>
    </div>
  );
}
