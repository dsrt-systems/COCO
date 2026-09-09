'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2, UserPlus } from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      // 1. Create user via Server Admin API (Zero emails requested = Zero rate limit errors)
      const res = await fetch('/api/auth/sign-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || 'Sign up failed');
        return;
      }

      // 2. Sign in immediately
      const { error: loginErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginErr) {
        toast.success('Account created! Please sign in.');
        router.push('/sign-in');
      } else {
        toast.success('Account created & signed in!');
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Sign up failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none" />

      <Link href="/" className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-6 z-10">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to home
      </Link>

      <Card className="w-full max-w-md p-8 border-zinc-800 bg-zinc-950/80 backdrop-blur-xl shadow-2xl space-y-6 relative z-10">
        <div className="space-y-2 text-center">
          <div className="w-12 h-12 mx-auto bg-purple-500/10 border border-purple-500/20 rounded-full flex items-center justify-center mb-4">
            <UserPlus className="w-6 h-6 text-purple-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Create Account</h1>
          <p className="text-xs text-zinc-400">Sign up instantly with your email and password.</p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs text-zinc-300">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="operator@dsrtai.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-zinc-900 border-zinc-800 text-zinc-100 focus:border-purple-500/50"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs text-zinc-300">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="bg-zinc-900 border-zinc-800 text-zinc-100 focus:border-purple-500/50"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-semibold py-2.5">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Create Account
          </Button>
        </form>

        <div className="pt-4 border-t border-zinc-800/80 text-center text-xs text-zinc-500">
          Already have an account?{' '}
          <Link href="/sign-in" className="text-purple-400 hover:underline">Sign in</Link>
        </div>
      </Card>
    </div>
  );
}
