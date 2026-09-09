import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SignOutButton } from '@/components/shell/sign-out-button';
import { CreateMissionForm } from '@/components/missions/create-form';
import { getSession } from '@/lib/coco/security/context';
import { redirect } from 'next/navigation';

export default async function NewMissionPage() {
  const session = await getSession();
  if (!session) redirect('/sign-in');

  return (
    <main className="shell-bg noise min-h-screen">
      <nav className="container flex items-center justify-between py-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-white to-zinc-400 shadow-[0_0_20px_-5px_rgba(255,255,255,0.5)]" />
          <span className="text-lg font-semibold tracking-tight text-gradient">COCO</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-1 inline h-3.5 w-3.5" />
            Dashboard
          </Link>
          <SignOutButton />
        </div>
      </nav>

      <section className="container max-w-2xl py-12">
        <div className="mb-8">
          <p className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Kernel</p>
          <h1 className="text-gradient text-4xl font-semibold tracking-tight">Launch a mission</h1>
        </div>
        <CreateMissionForm />
      </section>
    </main>
  );
}
