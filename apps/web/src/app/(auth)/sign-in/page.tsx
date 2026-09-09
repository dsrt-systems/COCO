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
import { ArrowLeft, Loader2, Mail, Lock, Sparkles } from 'lucide-react';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'magic' | 'password'>('magic');
  const [loading, setLoading] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'magic') {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/callback`,
          },
        });

        if (error) {
          if (error.message.includes('rate limit')) {
            toast.error(
              'Supabase email rate limit hit. Switch to "Password Sign In" or try again in a few minutes.'
            );
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Magic link sent! Check your inbox.');
        }
      } else {
        // Password Sign In
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Signed in successfully!');
          router.push('/dashboard');
        }
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none" />

      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to home
      </Link>

      <Card className="w-full max-w-md p-8 border-zinc-800 bg-zinc-950/80 backdrop-blur-xl shadow-2xl space-y-6 relative z-10">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            Sign in to COCO
          </h1>
          <p className="text-xs text-zinc-400">
            {mode === 'magic'
              ? 'Enter your email to receive an instant magic link.'
              : 'Enter your email and password.'}
          </p>
        </div>

        {/* Auth Mode Toggle */}
        <div className="flex p-1 bg-zinc-900 rounded-lg border border-zinc-800 text-xs">
          <button
            type="button"
            onClick={() => setMode('magic')}
            className={`flex-1 py-1.5 font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${
              mode === 'magic'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Mail className="w-3.5 h-3.5" /> Magic Link
          </button>
          <button
            type="button"
            onClick={() => setMode('password')}
            className={`flex-1 py-1.5 font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 ${
              mode === 'password'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Lock className="w-3.5 h-3.5" /> Password
          </button>
        </div>

        <form onSubmit={handleSignIn} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs text-zinc-300">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="operator@dsrtai.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-zinc-900 border-zinc-800 text-zinc-100 focus:border-indigo-500/50"
            />
          </div>

          {mode === 'password' && (
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs text-zinc-300">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-zinc-900 border-zinc-800 text-zinc-100 focus:border-indigo-500/50"
              />
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {mode === 'magic' ? 'Send Magic Link' : 'Sign In'}
          </Button>
        </form>

        <div className="pt-4 border-t border-zinc-800/80 text-center text-xs text-zinc-500">
          Don&apos;t have an account?{' '}
          <Link href="/sign-up" className="text-indigo-400 hover:underline">
            Sign up
          </Link>
        </div>
      </Card>
    </div>
  );
}
