"use client";

import { useEffect, useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { authErrorMessage, errorCode, finishRedirectSignIn, resetPassword, signInDemo, signInEmail, signInGoogle, signUpEmail } from "@/lib/auth";

/*
  The sign-in screen. On a laptop the green side shows three small example cards (this month's
  contributions, the payout order and the history), so people see what StokvelBook does before
  they sign up.
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
    <div className="rounded-xl border border-dashed border-marker/40 bg-marker-soft p-4">
      <p className="font-bold">Just looking?</p>
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
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-[#123f2b] p-12 text-white lg:flex lg:flex-col">
        <p className="flex items-center gap-2 text-2xl font-extrabold">
          <Logo className="h-9 w-9" />
          StokvelBook
        </p>
        <DemoBoard />
        {/* A big line of text, not the page's heading: on phones this side is hidden, so "Welcome back" is the h1 */}
        <p className="relative mt-auto max-w-md text-5xl font-extrabold leading-[1.05] tracking-tight">Your stokvel&apos;s book, on everyone&apos;s phone.</p>
        <p className="relative mt-5 max-w-md text-lg text-white/85">
          Every member sees who has paid, whose turn is next, and what was decided. Nothing can be quietly changed, so nobody has to wonder.
        </p>
      </aside>

      <main className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-xl font-extrabold lg:invisible">
            <Logo />
            StokvelBook
          </p>
          <ThemeToggle />
        </div>

        <div className="m-auto w-full max-w-sm py-10">
          {fromDemoLink && <div className="mb-8">{demoBox}</div>}
          {invited && (
            <p className="mb-6 rounded-xl border border-marker/40 bg-marker-soft px-4 py-3 text-sm">
              <strong>You&apos;ve been invited to a stokvel.</strong> Sign in or create an account, and you&apos;ll join it straight after.
            </p>
          )}
          <h1 className="text-3xl font-extrabold tracking-tight">{mode === "signIn" ? "Welcome back" : "Create your account"}</h1>
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
  );
}

/*
  Three made-up cards from a stokvel's book, as a preview on the sign-in screen:
    this month's contributions, with one member late
    the payout order, with this month's turn
    the history: a payment and a correction anyone can see
  They sit in a grid, so none hides another (on narrower laptops the payout card is left out).
  Decorative only: screen readers skip it.
*/
function DemoBoard() {
  const card = "rounded-2xl bg-white p-4 text-[#1c2a23] shadow-xl";
  const rows: [string, string, string, string][] = [
    ["Thandi", "#17603f", "Paid", "bg-[#e1f0e6] text-[#17603f]"],
    ["Sipho", "#b8473f", "Late", "bg-[#fde8e6] text-[#b42318]"],
    ["Lerato", "#3d6fa8", "Part paid", "bg-[#fbefd6] text-[#8a5300]"],
    ["Nomsa", "#7a5aa6", "Paid", "bg-[#e1f0e6] text-[#17603f]"],
  ];
  return (
    <div aria-hidden="true" className="relative mt-10 grid gap-6 xl:grid-cols-2">
      <div className={`${card} w-full max-w-[300px] rotate-[-3deg] justify-self-center xl:justify-self-start`}>
        <p className="text-xs font-bold uppercase tracking-wider text-[#4f5d55]">November · R 500 each</p>
        <ul className="mt-3 space-y-2 text-sm">
          {rows.map(([who, colour, status, style]) => (
            <li key={who} className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full" style={{ background: colour }} />
              <span className="flex-1 font-semibold">{who}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${style}`}>{status}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 rounded-full bg-[#1c2a23] px-3 py-1.5 text-center text-[11px] font-semibold text-white">Remind Sipho on WhatsApp</p>
      </div>

      <div className={`${card} mt-6 hidden w-full max-w-[240px] rotate-[3deg] self-start justify-self-end xl:block`}>
        <p className="text-xs font-bold uppercase tracking-wider text-[#4f5d55]">Payout order</p>
        <ol className="mt-3 space-y-2 text-sm">
          <li className="flex justify-between">
            <span>1. Thandi</span>
            <span className="font-bold text-[#17603f]">Paid ✓</span>
          </li>
          <li className="flex justify-between">
            <span>2. Sipho</span>
            <span className="font-bold text-[#17603f]">Paid ✓</span>
          </li>
          <li className="flex justify-between rounded-lg bg-[#fbefd6] px-2 py-1 font-bold">
            <span>3. You</span>
            <span className="text-[#8a5300]">R 4 000</span>
          </li>
          <li className="flex justify-between text-[#4f5d55]">
            <span>4. Lerato</span>
            <span>Dec</span>
          </li>
        </ol>
      </div>

      <div className={`${card} w-full max-w-[280px] rotate-[-1.5deg] justify-self-center xl:col-span-2`}>
        <p className="text-xs font-bold uppercase tracking-wider text-[#4f5d55]">History · nobody can edit it</p>
        <p className="mt-2 text-sm font-semibold">R 500 from Nomsa for November</p>
        <p className="mt-1 text-sm font-semibold text-[#4f5d55] line-through">R 500 from Nomsa for November</p>
        <p className="text-xs font-semibold text-[#b42318]">Cancelled by the treasurer: recorded twice</p>
      </div>
    </div>
  );
}
