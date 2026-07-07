import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useRef, useState } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { ArrowRight, Check, Star } from "lucide-react";
import flaticonImg from "@/assets/vite.png";

/* ─── constants ─── */

const NOISE_SVG = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`;

const STEPS = [
  { num: "01", title: "Create an outing", desc: "Define the trip, add friends by email, set a budget. One tap, done." },
  { num: "02", title: "Log expenses live", desc: "Add costs as they happen — food, stay, tickets. We split automatically." },
  { num: "03", title: "Settle in seconds", desc: "Our algorithm minimises total payments. Everyone sees who owes whom." },
] as const;

const MARQUEE_ITEMS = [
  "IIT Bombay", "WeWork India", "Trek Club", "Nomad Collective",
  "NIT Trichy", "Backpacker.io", "Startup House", "Weekend Getaways",
];

const TESTIMONIALS = [
  {
    quote: "We used TripSplit for a 10-day trip with 8 people — settlement took literally 30 seconds.",
    name: "Karthi",
    role: "Design Lead · Coimbatore",
  },
  {
    quote: "The settle-up algorithm saved us from a spreadsheet nightmare after our Ladakh trip.",
    name: "Sneha",
    role: "Software Engineer · Bangalore",
  },
  {
    quote: "Finally, expense splitting that doesn't look like it was built in 2012.",
    name: "Rahul",
    role: "Product Manager · Mumbai",
  },
];

/* ─── helpers ─── */

function Typewriter({ text, speed = 70 }: { text: string; speed?: number }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const pause = Math.ceil(2500 / speed);
    const cycle = text.length + pause;
    const id = setInterval(() => setIdx((p) => (p + 1) % cycle), speed);
    return () => clearInterval(id);
  }, [text, speed]);
  const len = Math.min(idx, text.length);
  return (
    <>
      <span className="text-[#FAFAFA]">{text.slice(0, len)}</span>
      <span className="inline-block w-[2px] h-4 bg-[#A1A1AA] ml-px align-middle animate-pulse" />
    </>
  );
}

function TickUpNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [cur, setCur] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const run = (now: number) => {
      const t = Math.min((now - start) / 2000, 1);
      setCur(value * (1 - (1 - t) ** 3));
      if (t < 1) requestAnimationFrame(run);
    };
    requestAnimationFrame(run);
  }, [inView, value]);
  return (
    <span ref={ref} style={{ fontVariantNumeric: "tabular-nums" }}>
      ₹{cur.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  );
}

/* ─── main ─── */

export default function Landing() {
  const { user } = useAuth();
  const cta = user ? "/dashboard" : "/signup";

  /* live metric counter */
  const [splits, setSplits] = useState(10_47_382);
  useEffect(() => {
    const id = setInterval(
      () => setSplits((p) => p + Math.floor(Math.random() * 200 + 30)),
      3000,
    );
    return () => clearInterval(id);
  }, []);

  /* scrollytelling */
  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: scrollRef,
    offset: ["start start", "end end"],
  });

  const s1Op = useTransform(scrollYProgress, [0, 0.28, 0.33], [1, 1, 0.4]);
  const s2Op = useTransform(scrollYProgress, [0.28, 0.33, 0.61, 0.66], [0.4, 1, 1, 0.4]);
  const s3Op = useTransform(scrollYProgress, [0.61, 0.66, 1], [0.4, 1, 1]);
  const stepOps = [s1Op, s2Op, s3Op];

  const p1 = useTransform(scrollYProgress, [0, 0.27, 0.36], [1, 1, 0]);
  const p2 = useTransform(scrollYProgress, [0.27, 0.36, 0.60, 0.69], [0, 1, 1, 0]);
  const p3 = useTransform(scrollYProgress, [0.60, 0.69, 1], [0, 1, 1]);

  return (
    <div className="dark min-h-screen bg-[#000] text-[#FAFAFA] font-sans selection:bg-[#2DD4BF]/20 selection:text-[#FAFAFA]">
      {/* ═══════════════════ NAV ═══════════════════ */}
      <header className="fixed top-0 z-50 w-full border-b border-[#333]/60 bg-[#000]/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl h-16 flex items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src={flaticonImg} alt="TripSplit Logo" className="h-10 w-10 object-contain rounded-lg" />
            <span className="font-bold text-lg tracking-tight hidden sm:inline">
              <span style={{ color: "#276ACF" }}>Trip</span><span style={{ color: "#3AA91F" }}>Split</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#A1A1AA]">
            <a href="#features" className="hover:text-[#FAFAFA] transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-[#FAFAFA] transition-colors">How it Works</a>
            <a href="#testimonials" className="hover:text-[#FAFAFA] transition-colors">Testimonials</a>
          </nav>

          <Link
            to={cta}
            className="h-9 px-5 rounded-lg bg-[#2DD4BF] text-black text-sm font-semibold inline-flex items-center hover:bg-[#2DD4BF]/90 transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
          >
            {user ? "Dashboard" : "Sign Up Free"}
          </Link>
        </div>
      </header>

      <main>
        {/* ═══════════════════ HERO ═══════════════════ */}
        <section className="pt-32 pb-20 md:pt-44 md:pb-40 px-6 relative overflow-hidden">
          {/* subtle radial glow, opacity 0.08, no blur */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-[radial-gradient(ellipse_at_center,_rgba(45,212,191,0.08),_transparent_70%)] pointer-events-none" />

          <div className="mx-auto max-w-7xl relative z-10">
            <div className="text-center max-w-4xl mx-auto">
              {/* ─ pulse badge ─ */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0A0A0A] border border-[#333] text-sm text-[#A1A1AA] mb-8">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inset-0 rounded-full bg-[#10B981] animate-ping opacity-75" />
                  <span className="relative rounded-full h-2 w-2 bg-[#10B981]" />
                </span>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  ₹{splits.toLocaleString("en-IN")} split today
                </span>
              </div>

              {/* ─ headline ─ */}
              <h1 className="text-5xl md:text-7xl lg:text-[88px] font-bold tracking-tighter leading-[1.05]">
                Split expenses.
                <br />
                Zero friction.
              </h1>

              <p className="mt-6 text-lg md:text-xl text-[#A1A1AA] max-w-2xl mx-auto">
                Create outings, track costs, and settle fairly with friends in
                seconds.
              </p>

              {/* ─ CTA ─ */}
              <div className="mt-10">
                <Link
                  to={cta}
                  className="inline-flex items-center gap-2 h-12 px-8 rounded-lg bg-[#2DD4BF] text-black text-base font-semibold hover:bg-[#2DD4BF]/90 transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
                >
                  Start for free
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* ─ product mock ─ */}
            <div className="mt-20 sm:mt-28 mx-auto max-w-5xl relative">
              <div className="rounded-2xl border border-[#333] bg-[#0A0A0A] overflow-hidden">
                {/* browser chrome */}
                <div className="h-10 border-b border-[#333] flex items-center px-4 gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#333]" />
                    <div className="w-3 h-3 rounded-full bg-[#333]" />
                    <div className="w-3 h-3 rounded-full bg-[#333]" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="w-40 h-5 rounded-md bg-[#161616] border border-[#333]" />
                  </div>
                </div>

                {/* dashboard content */}
                <div className="p-6 h-[280px] sm:h-[380px]">
                  <div className="grid grid-cols-4 gap-4 h-full">
                    {/* sidebar (hidden mobile) */}
                    <div className="hidden sm:flex flex-col gap-3 border-r border-[#333]/50 pr-4">
                      <div className="h-7 rounded-md bg-[#161616] w-3/4" />
                      <div className="h-7 rounded-md bg-[#161616] w-full" />
                      <div className="h-7 rounded-md bg-[#161616] w-5/6" />
                      <div className="h-7 rounded-md bg-[#161616] w-2/3" />
                    </div>

                    {/* main area */}
                    <div className="col-span-4 sm:col-span-3 flex flex-col gap-4">
                      {/* stat cards */}
                      <div className="grid grid-cols-3 gap-3">
                        {[0.6, 0.5, 0.7].map((w, i) => (
                          <div
                            key={i}
                            className="h-16 sm:h-20 rounded-xl bg-[#161616] border border-[#333] p-3"
                          >
                            <div className="h-2.5 bg-[#333] rounded w-12 mb-2" />
                            <div
                              className="h-4 bg-[#FAFAFA]/15 rounded"
                              style={{ width: `${w * 100}%` }}
                            />
                          </div>
                        ))}
                      </div>

                      {/* transaction rows */}
                      <div className="flex-1 flex flex-col gap-2">
                        {[0.7, 0.5, 0.8, 0.6].map((w, i) => (
                          <div
                            key={i}
                            className="h-10 sm:h-12 rounded-lg bg-[#161616]/60 border border-[#333]/40 flex items-center px-3 sm:px-4 gap-3"
                          >
                            <div className="w-7 h-7 rounded-full bg-[#333] shrink-0" />
                            <div
                              className="h-2.5 bg-[#333] rounded"
                              style={{ width: `${w * 150}px`, maxWidth: "100%" }}
                            />
                            <div className="ml-auto h-2.5 bg-[#FAFAFA]/10 rounded w-14" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* floating toast */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5, duration: 0.3, ease: [0, 0, 0.2, 1] }}
                className="absolute bottom-4 right-4 sm:bottom-8 sm:right-8 bg-[#161616] border border-[#333] rounded-xl px-4 py-3 flex items-center gap-3 shadow-lg"
              >
                <div className="w-8 h-8 rounded-full bg-[#10B981]/15 flex items-center justify-center">
                  <Check className="w-4 h-4 text-[#10B981]" />
                </div>
                <div>
                  <p className="text-[#FAFAFA] text-sm font-medium">
                    Settlement complete
                  </p>
                  <p
                    className="text-[#A1A1AA] text-xs"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    ₹2,450 → Rahul
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ═══════════════════ MARQUEE ═══════════════════ */}
        <section className="py-6 border-y border-[#333]/40 overflow-hidden group">
          <div className="flex animate-marquee group-hover:[animation-play-state:paused]">
            {/* group 1 */}
            <div className="flex shrink-0 items-center gap-12 pr-12">
              {MARQUEE_ITEMS.map((name, i) => (
                <span
                  key={i}
                  className="text-sm font-semibold tracking-widest uppercase text-[#FAFAFA] opacity-40 whitespace-nowrap"
                >
                  {name}
                </span>
              ))}
            </div>
            {/* group 2 (duplicate) */}
            <div
              className="flex shrink-0 items-center gap-12 pr-12"
              aria-hidden="true"
            >
              {MARQUEE_ITEMS.map((name, i) => (
                <span
                  key={`d-${i}`}
                  className="text-sm font-semibold tracking-widest uppercase text-[#FAFAFA] opacity-40 whitespace-nowrap"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════ HOW IT WORKS ═══════════════════ */}
        <section id="how-it-works">
          {/* section heading */}
          <div className="py-20 md:py-40 text-center px-6">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tighter">
              How it works
            </h2>
            <p className="mt-4 text-lg text-[#A1A1AA]">
              Three steps to stress-free group expenses.
            </p>
          </div>

          {/* mobile: simple stack */}
          <div className="lg:hidden px-6 pb-20 max-w-lg mx-auto space-y-16">
            {STEPS.map((step, i) => (
              <div key={i} className="space-y-3">
                <div className="text-[#2DD4BF] font-mono text-sm tracking-widest">
                  {step.num}
                </div>
                <h3 className="text-2xl font-bold tracking-tight">
                  {step.title}
                </h3>
                <p className="text-[#A1A1AA] text-base leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>

          {/* desktop: scrollytelling */}
          <div
            ref={scrollRef}
            className="hidden lg:block relative"
            style={{ height: "250vh" }}
          >
            <div className="sticky top-0 h-screen flex items-center">
              <div className="mx-auto max-w-7xl px-6 w-full grid grid-cols-2 gap-24 items-center">
                {/* left: all steps visible, opacity driven */}
                <div className="space-y-10">
                  {STEPS.map((step, i) => (
                    <motion.div
                      key={i}
                      style={{ opacity: stepOps[i] }}
                      className="space-y-2"
                    >
                      <div className="text-[#2DD4BF] font-mono text-xs tracking-widest uppercase">
                        {step.num}
                      </div>
                      <h3 className="text-xl font-bold tracking-tight">
                        {step.title}
                      </h3>
                      <p className="text-[#A1A1AA] text-sm leading-relaxed max-w-sm">
                        {step.desc}
                      </p>
                    </motion.div>
                  ))}
                </div>

                {/* right: phone mock */}
                <div className="flex justify-center relative">
                  {/* glow behind phone – opacity 0.1, radius < 80px */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-[radial-gradient(circle,_rgba(45,212,191,0.1),_transparent_70%)] pointer-events-none" />

                  <div className="w-[280px] h-[560px] rounded-[36px] bg-[#161616] border border-[#333] p-3 shadow-xl relative">
                    <div className="w-full h-full rounded-[28px] bg-[#0A0A0A] overflow-hidden relative">
                      {/* notch */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100px] h-[24px] bg-[#161616] rounded-b-xl z-10" />

                      {/* screen */}
                      <div className="pt-10 px-4 pb-4 h-full relative">
                        {/* step 1: create */}
                        <motion.div
                          style={{ opacity: p1 }}
                          className="absolute inset-x-4 top-10 bottom-4 flex flex-col gap-4"
                        >
                          <div className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">
                            New Outing
                          </div>
                          <div className="h-10 rounded-lg bg-[#161616] border border-[#333] px-3 flex items-center">
                            <span className="text-sm text-[#A1A1AA]">
                              Outing name…
                            </span>
                          </div>
                          <div className="h-10 rounded-lg bg-[#161616] border border-[#333] px-3 flex items-center">
                            <span className="text-sm text-[#A1A1AA]">
                              Location
                            </span>
                          </div>
                          <div className="h-10 rounded-lg bg-[#161616] border border-[#333] px-3 flex items-center">
                            <span className="text-sm text-[#A1A1AA]">
                              Add friends…
                            </span>
                          </div>
                          <div className="mt-auto h-10 rounded-lg bg-[#2DD4BF] flex items-center justify-center">
                            <span className="text-sm font-semibold text-black">
                              Create Outing
                            </span>
                          </div>
                        </motion.div>

                        {/* step 2: expenses */}
                        <motion.div
                          style={{ opacity: p2 }}
                          className="absolute inset-x-4 top-10 bottom-4 flex flex-col gap-3"
                        >
                          <div className="text-xs font-semibold text-[#A1A1AA] uppercase tracking-wider">
                            Expenses
                          </div>
                          {[
                            { name: "Hotel Stay", amount: "₹4,800", who: "K" },
                            {
                              name: "Train Ticket",
                              amount: "₹1,200",
                              who: "S",
                            },
                            { name: "Dinner", amount: "₹2,100", who: "R" },
                          ].map((e, i) => (
                            <div
                              key={i}
                              className="h-14 rounded-xl bg-[#161616] border border-[#333] px-3 flex items-center gap-3"
                            >
                              <div className="w-8 h-8 rounded-full bg-[#333] flex items-center justify-center text-xs font-bold">
                                {e.who}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {e.name}
                                </p>
                                <p className="text-xs text-[#A1A1AA]">
                                  Paid by {e.who}
                                </p>
                              </div>
                              <span
                                className="text-sm font-semibold shrink-0"
                                style={{ fontVariantNumeric: "tabular-nums" }}
                              >
                                {e.amount}
                              </span>
                            </div>
                          ))}
                        </motion.div>

                        {/* step 3: settled */}
                        <motion.div
                          style={{ opacity: p3 }}
                          className="absolute inset-x-4 top-10 bottom-4 flex flex-col items-center justify-center"
                        >
                          <div className="w-20 h-20 rounded-full border-2 border-[#10B981] flex items-center justify-center mb-4">
                            <Check className="w-8 h-8 text-[#10B981]" />
                          </div>
                          <p className="text-lg font-semibold">All settled!</p>
                          <p className="text-sm text-[#A1A1AA] mt-1">
                            3 payments needed
                          </p>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════ FEATURES ═══════════════════ */}
        <section id="features" className="py-20 md:py-40 px-6">
          <div className="mx-auto max-w-7xl">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-6">
              Built for speed.
            </h2>
            <p className="text-lg text-[#A1A1AA] max-w-xl mb-16 md:mb-20">
              Power-user features, hidden behind an obsessively simple
              interface.
            </p>

            <div className="grid md:grid-cols-3 gap-6">
              {/* card 1: AI receipt */}
              <div className="bg-[#161616] border border-[#333] rounded-2xl p-8 flex flex-col hover:border-[#444] transition-colors">
                <div className="flex-1 mb-8">
                  <pre className="font-mono text-[11px] leading-relaxed overflow-hidden">
                    <span className="text-[#A1A1AA]">{"{"}</span>
                    {"\n  "}
                    <span className="text-[#93C5FD]">&quot;receipt&quot;</span>
                    <span className="text-[#A1A1AA]">: </span>
                    <span className="text-[#86EFAC]">
                      &quot;Cafe Lota&quot;
                    </span>
                    <span className="text-[#A1A1AA]">,</span>
                    {"\n  "}
                    <span className="text-[#93C5FD]">&quot;items&quot;</span>
                    <span className="text-[#A1A1AA]">: [</span>
                    {"\n    "}
                    <span className="text-[#A1A1AA]">{"{ "}</span>
                    <span className="text-[#93C5FD]">&quot;name&quot;</span>
                    <span className="text-[#A1A1AA]">: </span>
                    <span className="text-[#86EFAC]">
                      &quot;Filter Coffee x2&quot;
                    </span>
                    <span className="text-[#A1A1AA]">, </span>
                    <span className="text-[#93C5FD]">&quot;₹&quot;</span>
                    <span className="text-[#A1A1AA]">: </span>
                    <span className="text-[#FDE68A]">300</span>
                    <span className="text-[#A1A1AA]">{" }"}</span>
                    <span className="text-[#A1A1AA]">,</span>
                    {"\n    "}
                    <span className="text-[#A1A1AA]">{"{ "}</span>
                    <span className="text-[#93C5FD]">&quot;name&quot;</span>
                    <span className="text-[#A1A1AA]">: </span>
                    <span className="text-[#86EFAC]">
                      &quot;Masala Dosa&quot;
                    </span>
                    <span className="text-[#A1A1AA]">, </span>
                    <span className="text-[#93C5FD]">&quot;₹&quot;</span>
                    <span className="text-[#A1A1AA]">: </span>
                    <span className="text-[#FDE68A]">180</span>
                    <span className="text-[#A1A1AA]">{" }"}</span>
                    {"\n  "}
                    <span className="text-[#A1A1AA]">],</span>
                    {"\n  "}
                    <span className="text-[#93C5FD]">&quot;split&quot;</span>
                    <span className="text-[#A1A1AA]">: [</span>
                    <span className="text-[#86EFAC]">
                      &quot;Karthi&quot;
                    </span>
                    <span className="text-[#A1A1AA]">, </span>
                    <span className="text-[#86EFAC]">&quot;Rahul&quot;</span>
                    <span className="text-[#A1A1AA]">],</span>
                    {"\n  "}
                    <span className="text-[#93C5FD]">&quot;status&quot;</span>
                    <span className="text-[#A1A1AA]">: </span>
                    <span className="text-[#86EFAC]">
                      &quot;auto-assigned&quot;
                    </span>
                    {"\n"}
                    <span className="text-[#A1A1AA]">{"}"}</span>
                  </pre>
                </div>
                <h3 className="text-lg font-semibold mb-1">
                  AI receipt parsing
                </h3>
                <p className="text-sm text-[#A1A1AA]">
                  Snap a photo. Items extracted and assigned automatically.
                </p>
              </div>

              {/* card 2: command palette */}
              <div className="bg-[#161616] border border-[#333] rounded-2xl p-8 flex flex-col hover:border-[#444] transition-colors">
                <div className="flex-1 mb-8 flex items-center justify-center">
                  <div className="w-full rounded-xl bg-[#0A0A0A] border border-[#333] p-3">
                    <div className="flex items-center gap-3">
                      <svg
                        className="w-4 h-4 text-[#A1A1AA] shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.3-4.3" />
                      </svg>
                      <div className="flex-1 font-mono text-sm min-h-[20px]">
                        <Typewriter text="Split ₹2000 with Rahul for dinner" />
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <kbd className="bg-[#161616] border border-[#333] px-1.5 py-0.5 rounded text-[10px] text-[#A1A1AA] font-sans">
                          ⌘
                        </kbd>
                        <kbd className="bg-[#161616] border border-[#333] px-1.5 py-0.5 rounded text-[10px] text-[#A1A1AA] font-sans">
                          K
                        </kbd>
                      </div>
                    </div>
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-1">Command palette</h3>
                <p className="text-sm text-[#A1A1AA]">
                  ⌘K to log, search, or navigate — zero mouse, zero friction.
                </p>
              </div>

              {/* card 3: currency */}
              <div className="bg-[#161616] border border-[#333] rounded-2xl p-8 flex flex-col hover:border-[#444] transition-colors">
                <div className="flex-1 mb-8 flex items-center justify-center">
                  <div className="w-full rounded-xl bg-[#0A0A0A] border border-[#333] p-5">
                    <div className="flex justify-between items-center text-sm font-mono mb-3">
                      <span className="text-[#A1A1AA]">EUR</span>
                      <span
                        className="text-[#FAFAFA] font-semibold"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        €120.00
                      </span>
                    </div>
                    <div className="h-px bg-[#333] my-3" />
                    <div className="flex justify-between items-center text-sm font-mono">
                      <span className="text-[#2DD4BF] font-semibold">INR</span>
                      <span className="text-[#2DD4BF] font-semibold">
                        <TickUpNumber value={10845.6} />
                      </span>
                    </div>
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-1">
                  Live currency conversion
                </h3>
                <p className="text-sm text-[#A1A1AA]">
                  Split across borders — real-time rates, zero manual math.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════ TESTIMONIALS ═══════════════════ */}
        <section
          id="testimonials"
          className="py-20 md:py-40 px-6 border-t border-[#333]/40"
        >
          <div className="mx-auto max-w-7xl">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-16 md:mb-20 text-center">
              Trusted by real groups.
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              {TESTIMONIALS.map((t, i) => (
                <div
                  key={i}
                  className="bg-[#161616] border border-[#333] rounded-2xl p-8 flex flex-col justify-between hover:border-[#444] transition-colors"
                >
                  <div>
                    <div className="flex gap-0.5 mb-6">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={14}
                          className="fill-[#FAFAFA]/80 text-[#FAFAFA]/80"
                        />
                      ))}
                    </div>
                    <p className="text-[#A1A1AA] text-sm leading-relaxed">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                  </div>
                  <div className="flex items-center gap-3 mt-8">
                    <div className="w-9 h-9 rounded-full bg-[#333] flex items-center justify-center text-xs font-bold">
                      {t.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{t.name}</p>
                      <p className="text-xs text-[#A1A1AA]">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════ FINAL CTA ═══════════════════ */}
        <section className="py-28 md:py-40 px-6 relative overflow-hidden">
          {/* grain texture */}
          <div
            className="absolute inset-0 opacity-40 pointer-events-none"
            style={{
              backgroundImage: NOISE_SVG,
              backgroundRepeat: "repeat",
            }}
          />
          {/* teal glow behind headline — opacity 0.12 */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-[radial-gradient(ellipse_at_center,_rgba(45,212,191,0.12),_transparent_70%)] pointer-events-none" />

          <div className="mx-auto max-w-3xl text-center relative z-10">
            <h2 className="text-5xl md:text-7xl font-bold tracking-tighter">
              Stop fighting.
              <br />
              Start splitting.
            </h2>
            <p className="mt-6 text-xl text-[#A1A1AA]">
              Join the new standard in group expenses.
            </p>
            <div className="mt-12">
              <Link
                to={cta}
                className="inline-flex items-center gap-2 h-14 px-10 rounded-lg bg-[#2DD4BF] text-black text-lg font-semibold hover:bg-[#2DD4BF]/90 transition-colors shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
              >
                Create your first outing
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ═══════════════════ FOOTER ═══════════════════ */}
      <footer className="border-t border-[#333]/40 py-10 px-6">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-[#A1A1AA]">
          <div className="flex items-center gap-2">
            <img src={flaticonImg} alt="TripSplit Logo" className="h-5 w-5 object-contain rounded-md" />
            <span className="font-bold">
              <span style={{ color: "#276ACF" }}>Trip</span><span style={{ color: "#3AA91F" }}>Split</span>
            </span>
          </div>
          <span>© {new Date().getFullYear()} TripSplit. All rights reserved.</span>
          <div className="flex gap-6">
            <a
              href="#"
              className="hover:text-[#FAFAFA] transition-colors"
            >
              Twitter
            </a>
            <a
              href="#"
              className="hover:text-[#FAFAFA] transition-colors"
            >
              GitHub
            </a>
            <a
              href="#"
              className="hover:text-[#FAFAFA] transition-colors"
            >
              Terms
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
