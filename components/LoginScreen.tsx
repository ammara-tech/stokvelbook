"use client";

import { useEffect, useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { authErrorMessage, errorCode, finishRedirectSignIn, resetPassword, signInDemo, signInEmail, signInGoogle, signUpEmail } from "@/lib/auth";

/*
  The sign-in screen: an open passbook. On the left, its green cover with the gold shweshwe-style
  pattern and a few made-up lines from a stokvel's book; on the right, a cream page with the form.
  On a phone the cover is a band across the top, and the page is under it.
  Someone who opened an invite link sees a note that they'll join after signing in.
*/
export default function LoginScreen() {
  const [mode, setMode] = useState<"signIn" | "create">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; code: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Opened from a "Try the demo" link (…/?demo): the demo box goes to the top
  const [fromDemoLink, setFromDemoLink] = useState(false);
  useEffect(() => {
    setFromDemoLink(new URLSearchParams(window.location.search).has("demo"));
  }, []);

  const demoBox = (
    <div className="rounded-xl border-2 border-dashed border-amber/50 bg-amber-soft p-4">
      <p className="flex items-center gap-2 font-bold">
        <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-full bg-cover text-[11px] font-bold text-gold">Nº</span>
        Just looking?
      </p>
      <p className="mt-1 text-sm text-ink-soft">Try StokvelBook as the chairperson of a made-up stokvel, with eight members, four months of payments, a meeting and a vote. No account needed, and everything is deleted when you end the demo.</p>
      <button type="button" disabled={busy} onClick={() => run(signInDemo)} className="btn mt-3 w-full py-2.5">
        Try the demo
      </button>
    </div>
  );
  const invited = usePathname() === "/join"; // the same on the server and in the browser

  // If Google sign-in went the full-page way and failed, say why when the page comes back.
  useEffect(() => {
    finishRedirectSignIn().catch((e) => {
      setError({ text: authErrorMessage(e), code: errorCode(e) });
      console.error("Sign-in failed:", errorCode(e) || e);
    });
  }, []);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (e) {
      setError({ text: authErrorMessage(e), code: errorCode(e) });
      console.error("Sign-in failed:", errorCode(e) || e); // the code, for whoever is fixing it
    } finally {
      setBusy(false);
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    run(() => (mode === "signIn" ? signInEmail(email, password) : signUpEmail(email, password)));
  }

  async function forgot() {
    if (!email.trim()) {
      setError({ text: "Type your email address first, then press \"Forgot your password?\" again.", code: "" });
      return;
    }
    await run(async () => {
      await resetPassword(email);
      setNotice("If there's an account for that email, a reset link is on its way. Check your inbox.");
    });
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,var(--color-card),var(--color-page)_60%)] lg:flex lg:items-center lg:justify-center lg:p-8">
      <div className="mx-auto w-full overflow-hidden lg:grid lg:max-w-5xl lg:grid-cols-2 lg:rounded-[28px] lg:shadow-[0_50px_100px_-40px_rgba(14,59,40,0.65)] lg:ring-1 lg:ring-black/5">
        <Cover />

        <main className="ruled relative flex flex-col bg-card px-5 py-6 sm:px-10 lg:px-12">
          {/* The book's spine, down the middle on a laptop */}
          <span aria-hidden="true" className="absolute inset-y-0 left-0 hidden w-6 bg-gradient-to-r from-black/10 to-transparent lg:block" />
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber">Member&apos;s page</p>
            <ThemeToggle />
          </div>

          <div className="m-auto w-full max-w-sm py-8">
            {fromDemoLink && <div className="mb-8">{demoBox}</div>}
            {invited && (
              <p className="mb-6 rounded-xl border border-marker/40 bg-marker-soft px-4 py-3 text-sm">
                <strong>You&apos;ve been invited to a stokvel.</strong> Sign in or create an account, and you&apos;ll join it straight after.
              </p>
            )}
            <h1 className="text-4xl">{mode === "signIn" ? "Welcome back" : "Create your account"}</h1>
            <p className="mt-2 text-ink-soft">{mode === "signIn" ? "Sign in to see your stokvel." : "It's free, and takes a minute."}</p>

            <button type="button" disabled={busy} onClick={() => run(signInGoogle)} className="btn-quiet mt-8 w-full py-3">
              <Icon name="google" />
              Continue with Google
            </button>

            <p className="my-6 flex items-center gap-3 text-sm text-ink-soft before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">or</p>

            <form onSubmit={submit} className="space-y-4">
              <label className="block text-sm font-semibold">
                Email
                <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field mt-1 font-normal" />
              </label>
              <div>
                <label htmlFor="password" className="text-sm font-semibold">
                  Password
                </label>
                <div className="relative mt-1">
                  <input
                    id="password"
                    type={show ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete={mode === "signIn" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="field pr-20"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    aria-pressed={show}
                    className="absolute inset-y-0 right-2 my-auto h-9 rounded-lg px-3 text-sm font-semibold text-marker hover:bg-marker-soft"
                  >
                    {show ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              {error && (
                <div role="alert" className="text-sm font-semibold text-alert">
                  <p>{error.text}</p>
                  {error.code && <p className="mt-1 text-xs font-normal opacity-70">Error code: {error.code}</p>}
                </div>
              )}
              {notice && (
                <p role="status" className="text-sm text-marker">
                  {notice}
                </p>
              )}
              <button type="submit" disabled={busy} className="btn w-full py-3">
                {mode === "signIn" ? "Sign in" : "Create account"}
              </button>
            </form>

            {mode === "signIn" && (
              <button type="button" onClick={forgot} className="mt-4 text-sm font-semibold text-marker hover:underline">
                Forgot your password?
              </button>
            )}

            <p className="mt-8 text-ink-soft">
              {mode === "signIn" ? "New to StokvelBook? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "signIn" ? "create" : "signIn");
                  setError(null);
                  setNotice(null);
                }}
                className="font-bold text-marker hover:underline"
              >
                {mode === "signIn" ? "Create an account" : "Sign in"}
              </button>
            </p>
            {!fromDemoLink && <div className="mt-6">{demoBox}</div>}
            <p className="mt-6 text-sm text-ink-soft">Only your group&apos;s members can see its book. StokvelBook keeps records only: it never holds or moves money. Everything is stored in Google&apos;s Firebase database.</p>
          </div>
        </main>
      </div>
    </div>
  );
}

/*
  The passbook's cover: the logo stamped in gold, the book's name, and a few made-up lines from a
  stokvel's book (who paid, a late payment, a payout), so people see what StokvelBook keeps before
  they sign up. A big line of text, not the page's heading: "Welcome back" on the page is the h1.
  On a phone it's a shorter band, without the lines. The lines are decorative: screen readers skip them.
*/
function Cover() {
  const lines: [string, string, string][] = [
    ["Thandi", "Nov contribution", "R 500 ✓"],
    ["Sipho", "Nov contribution", "Late"],
    ["Nomsa", "Nov contribution", "R 500 ✓"],
    ["You", "Payout, turn 3", "R 4 000"],
  ];
  return (
    <aside className="shweshwe-soft relative overflow-hidden px-5 py-6 text-cover-ink sm:px-10 lg:p-10">
      {/* The gold frame stamped on the cover */}
      <div className="relative flex h-full flex-col rounded-2xl border border-gold/60 p-5 outline outline-1 outline-offset-4 outline-gold/30 lg:p-8">
        <p className="flex items-center gap-3">
          <Logo className="h-10 w-10" />
          <span>
            <span className="font-display block text-2xl leading-none text-gold">StokvelBook</span>
            <span className="mt-1 block text-[11px] font-bold uppercase tracking-[0.3em] text-cover-soft">Savings book</span>
          </span>
        </p>

        <p className="font-display mt-6 text-3xl leading-tight lg:mt-12 lg:text-5xl">Your stokvel&apos;s book, on everyone&apos;s phone.</p>
        <p className="mt-3 max-w-md text-cover-soft lg:mt-5 lg:text-lg">
          Every member sees who has paid, whose turn is next, and what was decided. Nothing can be quietly changed, so nobody has to wonder.
        </p>

        <div aria-hidden="true" className="mt-auto hidden pt-10 lg:block">
          <p className="flex justify-between border-b border-gold/50 pb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-gold">
            <span>Member</span>
            <span>Amount</span>
          </p>
          <ul className="text-sm">
            {lines.map(([who, what, amount]) => (
              <li key={who} className="flex items-baseline gap-3 border-b border-dashed border-gold/25 py-2">
                <span className="w-16 font-bold">{who}</span>
                <span className="flex-1 text-cover-soft">{what}</span>
                <span className={`font-bold tabular-nums ${amount === "Late" ? "rounded-full bg-[#fde8e6] px-2 text-xs text-[#b42318]" : "text-gold"}`}>{amount}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}
