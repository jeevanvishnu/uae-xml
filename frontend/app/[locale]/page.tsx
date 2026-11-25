"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useAuth } from "../context/AuthContext";
import {
  IdentificationCard,
  Stethoscope,
  Pill,
  Receipt,
  Money,
  Buildings,
  CheckCircle,
  ArrowRight,
  EnvelopeSimple,
  Phone,
  MapPin,
  PaperPlaneRight,
  ArrowClockwise,
} from "@phosphor-icons/react";

function ScrollRevealWord({
  word,
  progress,
  range,
}: {
  word: string;
  progress: MotionValue<number>;
  range: [number, number];
}) {
  const opacity = useTransform(progress, range, [0.18, 1]);
  return (
    <motion.span style={{ opacity }} className="inline-block mr-[0.26em]">
      {word}
    </motion.span>
  );
}

function ScrollConnector({
  direction,
  progress,
  range,
}: {
  direction: "right" | "left";
  progress: MotionValue<number>;
  range: [number, number];
}) {
  const mid = range[0] + (range[1] - range[0]) * 0.6;
  const clipPath = useTransform(
    progress,
    [range[0], mid, range[1]],
    direction === "right"
      ? ["inset(0% 100% 85% 0%)", "inset(0% 0% 85% 0%)", "inset(0% 0% 0% 0%)"]
      : ["inset(0% 0% 85% 100%)", "inset(0% 0% 85% 0%)", "inset(0% 0% 0% 0%)"]
  );

  return (
    <motion.div
      aria-hidden="true"
      style={{ clipPath }}
      className={`hidden md:block absolute top-1/2 ${
        direction === "right"
          ? "left-full border-t-2 border-r-2 rounded-tr-2xl"
          : "right-full border-t-2 border-l-2 rounded-tl-2xl"
      } w-[calc(50%+3rem)] lg:w-[calc(50%+5rem)] h-28 border-dashed border-blue-500 pointer-events-none`}
    />
  );
}

const ABOUT_HEADLINE_WORDS =
  "Built for UAE healthcare operations & e-Claims accuracy.".split(" ");

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const aboutRef = useRef<HTMLElement | null>(null);
  const workflowRef = useRef<HTMLElement | null>(null);

  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    phone: "",
    facility: "",
    message: "",
  });
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactError, setContactError] = useState("");

  const handleContactChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setContactForm((prev) => ({ ...prev, [name]: value }));
    if (contactError) setContactError("");
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.name.trim() || !contactForm.email.trim() || !contactForm.message.trim()) {
      setContactError("Please fill in your name, email, and message.");
      return;
    }
    setContactSubmitting(true);
    setContactError("");
    setTimeout(() => {
      setContactSubmitting(false);
      setContactSubmitted(true);
    }, 600);
  };

  const handleContactReset = () => {
    setContactForm({ name: "", email: "", phone: "", facility: "", message: "" });
    setContactSubmitted(false);
    setContactError("");
  };

  const { scrollYProgress } = useScroll({
    target: aboutRef,
    offset: ["start 0.85", "center 0.45"],
  });

  const { scrollYProgress: workflowProgress } = useScroll({
    target: workflowRef,
    offset: ["start 0.85", "end 0.55"],
  });
  const smoothWorkflowProgress = useSpring(workflowProgress, {
    stiffness: 120,
    damping: 24,
    restDelta: 0.001,
  });

  const dashboardHref =
    user?.role === "doctor"
      ? "/doctor"
      : user?.role === "pharmacist"
        ? "/pharmacy"
        : user?.role === "billing"
          ? "/billing"
          : user?.role === "reception"
            ? "/reception"
            : "/dashboard";

  const personas = [
    {
      role: "Reception Desk",
      desc: "Emirates ID reading, smart card check-in, and real-time Riayati PriorRequest insurance eligibility checks.",
      href: "/reception",
      icon: IdentificationCard,
    },
    {
      role: "Doctor Consultation",
      desc: "Clinical documentation, ICD-10 medical coding (1 Principal mandatory), CPT activities, and eRx prescribing.",
      href: "/doctor",
      icon: Stethoscope,
    },
    {
      role: "Pharmacy Hub",
      desc: "Instant eRx lookup, DDC UAE Drug Formulary verification, copay calculations, and medication dispensing.",
      href: "/pharmacy",
      icon: Pill,
    },
    {
      role: "Billing & Claims",
      desc: "Pre-submission XSD validations, <Claim.Submission> XML serialization, and direct transmission to Riayati Post Office.",
      href: "/billing",
      icon: Receipt,
    },
    {
      role: "Remittance Reconciliation",
      desc: "Parse incoming <RemittanceAdvice> XML, investigate denial codes, and resubmit corrected claims.",
      href: "/billing/remittance",
      icon: Money,
    },
    {
      role: "Facility Administration",
      desc: "Manage facility SenderID, MoHAP Riayati / DHA eClaimLink switches, and licensed healthcare clinicians.",
      href: "/admin/facility",
      icon: Buildings,
    },
  ];

  const workflowSteps = [
    {
      step: "01",
      title: "Reception Check-In",
      desc: "Emirates ID scan, smart card check-in, and real-time Riayati PriorRequest insurance eligibility.",
      icon: IdentificationCard,
    },
    {
      step: "02",
      title: "Doctor Consultation",
      desc: "Clinical documentation, principal ICD-10 coding, CPT procedures, and digital eRx prescribing.",
      icon: Stethoscope,
    },
    {
      step: "03",
      title: "Pharmacy Dispensing",
      desc: "Instant eRx lookup, UAE DDC drug formulary verification, and automated patient copay split.",
      icon: Pill,
    },
    {
      step: "04",
      title: "Billing & Remittance",
      desc: "Pre-submission XSD validation, Riayati XML transmission, and RemittanceAdvice reconciliation.",
      icon: Receipt,
    },
  ];

  const pipelinePreview = [
    { stage: "1. Emirates ID Check-In", status: "Verified", detail: "PriorRequest Eligible" },
    { stage: "2. Doctor eRx & Coding", status: "ICD-10 + CPT", detail: "Principal Dx Locked" },
    { stage: "3. Pharmacy Formulary", status: "DDC Matched", detail: "Copay Calculated" },
    { stage: "4. <Claim.Submission>", status: "XSD Validated", detail: "Riayati Hub Ready" },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-950 flex flex-col font-sans selection:bg-blue-700 selection:text-white">
      <main className="flex-1">
        {/* 1 & 2. Full-Width Hero Section with Floating Pill Navbar & Dashboard Preview */}
        <section className="w-full relative overflow-hidden rounded-b-3xl sm:rounded-b-[2rem] bg-gradient-to-b from-blue-50/90 via-blue-100/55 to-blue-300/75 pt-5 sm:pt-7 px-4 sm:px-8">
          {/* Subtle Concentric Decorative Arcs */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-28 -left-28 w-[520px] h-[520px] rounded-full border-[44px] border-white/60"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-28 -right-28 w-[520px] h-[520px] rounded-full border-[44px] border-white/60"
          />

          {/* Floating Pill Navbar (Reference Style) */}
          <motion.header
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-20 max-w-5xl mx-auto rounded-full bg-slate-950 text-white px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4 shadow-lg shadow-slate-950/15"
          >
            <Link
              href="/"
              className="flex items-center gap-2 pl-1 text-base sm:text-lg font-semibold tracking-tight text-white"
            >
              <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[11px] font-bold text-white">
                M
              </span>
              <span>
                Mos<span className="text-blue-400">Ctd</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-7 text-xs sm:text-sm font-medium text-slate-300">
              <a href="#" className="text-white transition-colors">
                Home
              </a>
              <a href="#about" className="hover:text-white transition-colors">
                About
              </a>
              <a href="#workflow" className="hover:text-white transition-colors">
                Workflow
              </a>
              <a href="#workspaces" className="hover:text-white transition-colors">
                Workspaces
              </a>
              <a href="#contact" className="hover:text-white transition-colors">
                Contact
              </a>
            </nav>

            <Link
              href="/login"
              className="px-5 py-2 rounded-full bg-white hover:bg-blue-50 text-slate-950 text-xs font-semibold transition-colors shadow-xs"
            >
              Login
            </Link>
          </motion.header>

          {/* Centered Hero Copy */}
          <div className="relative z-10 text-center max-w-3xl mx-auto pt-12 sm:pt-14 space-y-4">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/95 border border-blue-200/80 text-blue-700 text-[10px] font-semibold tracking-widest uppercase shadow-xs transition-all duration-300 hover:scale-105 hover:border-blue-300 hover:shadow-sm select-none"
            >
              UAE Healthcare e-Claims Platform
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 32, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.85,
                delay: 0.18,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="text-3xl sm:text-4xl lg:text-[44px] font-semibold text-slate-950 tracking-tight leading-[1.15] origin-center will-change-transform"
            >
              Turn clinical encounters into compliant e-Claims
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.7,
                delay: 0.3,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-lg mx-auto font-normal"
            >
              MosCtd unifies reception check-in, ICD-10/CPT coding, DDC pharmacy
              dispensing, and MoHAP Riayati XML submissions in one workspace.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.7,
                delay: 0.38,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="pt-2 flex flex-wrap items-center justify-center gap-3"
            >
              <Link
                href={isAuthenticated ? dashboardHref : "/login"}
                className="group px-6 py-3 rounded-full bg-blue-700 hover:bg-blue-800 text-white text-xs sm:text-sm font-semibold shadow-md shadow-blue-700/20 hover:shadow-lg hover:shadow-blue-700/30 transition-all duration-300 inline-flex items-center gap-2 hover:scale-[1.03] active:scale-[0.98]"
              >
                <span>Get Started</span>
                <ArrowRight size={15} weight="bold" className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </motion.div>
          </div>

          {/* Layered Dashboard Preview Image - Smooth Down-to-Up Entrance (No Hover) */}
          <motion.div
            initial={{ opacity: 0, y: 70, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 1.05,
              delay: 0.45,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="relative z-10 max-w-6xl mx-auto mt-10 sm:mt-12 will-change-transform"
          >
            <div className="p-2.5 sm:p-4 pb-0 sm:pb-0 rounded-t-2xl sm:rounded-t-3xl bg-white/65 backdrop-blur-md border border-b-0 border-white/90 shadow-2xl shadow-blue-950/10">
              <img
                src="/images/hero-dashboard.jpg"
                alt="MosCtd Live Reception Queue and Patient Tracker Dashboard"
                className="w-full h-auto rounded-t-xl sm:rounded-t-2xl border border-b-0 border-slate-200/80 block"
              />
            </div>
          </motion.div>
        </section>

        {/* 2.5 About Section (60% White Canvas, Scroll-to-Reveal Text with Motion) */}
        <section ref={aboutRef} id="about" className="bg-white py-16 sm:py-24 px-6">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="space-y-4">
              <motion.span
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.4 }}
                className="inline-flex items-center px-4 py-1.5 rounded-full border border-slate-300 bg-white text-[11px] font-semibold uppercase tracking-wider text-slate-800"
              >
                About Us
              </motion.span>

              <h2 className="text-2xl sm:text-4xl font-semibold text-slate-950 tracking-tight leading-snug">
                {ABOUT_HEADLINE_WORDS.map((word, idx) => {
                  const start = idx / ABOUT_HEADLINE_WORDS.length;
                  const end = start + 1 / ABOUT_HEADLINE_WORDS.length;
                  return (
                    <ScrollRevealWord
                      key={`${word}-${idx}`}
                      word={word}
                      progress={scrollYProgress}
                      range={[start, end]}
                    />
                  );
                })}
              </h2>
            </div>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto"
            >
              MosCtd connects front-desk receipts, daily cash closing, clinical
              ICD-10/CPT coding, and DDC pharmacy dispensing directly to MoHAP
              Riayati and DHA eClaimLink XML standards—eliminating manual claim
              rejections.
            </motion.p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 text-left">
              {[
                "Real-time cash & copay closing",
                "Principal ICD-10 & CPT coding",
                "DDC UAE drug formulary match",
                "XSD pre-validated XML claims",
                "Riayati PriorRequest checks",
                "RemittanceAdvice reconciliation",
              ].map((item, idx) => (
                <motion.div
                  key={item}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.4, delay: idx * 0.06 }}
                  className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-blue-50/60 border border-blue-100 text-sm font-medium text-slate-800"
                >
                  <CheckCircle
                    size={18}
                    weight="fill"
                    className="text-blue-700 shrink-0"
                  />
                  <span>{item}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. End-to-End Workflow (20% Soft Blue Section, Staggered Zigzag Timeline) */}
        <section
          ref={workflowRef}
          id="workflow"
          className="bg-blue-50 border-y border-blue-100 py-16 sm:py-24 px-6 overflow-hidden"
        >
          <div className="max-w-5xl mx-auto space-y-14">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                How It Works
              </p>
              <h2 className="text-2xl sm:text-3xl font-semibold text-slate-950 tracking-tight">
                From Patient Check-In to Paid Remittance
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10 md:gap-y-4 gap-x-12 lg:gap-x-20 items-start">
              {workflowSteps.map((item, idx) => {
                const Icon = item.icon;
                const isRight = idx % 2 === 1;
                const hasNext = idx < workflowSteps.length - 1;

                return (
                  <motion.div
                    key={item.step}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.45, delay: idx * 0.08 }}
                    className={`relative ${
                      isRight ? "md:col-start-2 md:mt-24" : "md:col-start-1"
                    }`}
                  >
                    {/* Scroll-Drawn Blue L-Connector to Next Step (Desktop) */}
                    {hasNext && (
                      <ScrollConnector
                        direction={isRight ? "left" : "right"}
                        progress={smoothWorkflowProgress}
                        range={[0.05 + idx * 0.3, 0.35 + idx * 0.3]}
                      />
                    )}

                    {/* Step Card */}
                    <div className="relative z-10 bg-white border border-blue-100 rounded-2xl p-7 sm:p-8 shadow-sm shadow-blue-950/5">
                      {/* Floating Circular Icon Badge with Soft Blue Halo */}
                      <div
                        className={`absolute -top-5 ${
                          isRight ? "-right-4 sm:-right-5" : "-left-4 sm:-left-5"
                        } w-12 h-12 rounded-full bg-white border border-blue-100 flex items-center justify-center text-blue-700 shadow-sm ring-8 ring-blue-100/70`}
                      >
                        <Icon size={22} weight="duotone" />
                      </div>

                      <div className="space-y-2 pt-1">
                        <h3 className="text-base sm:text-lg font-semibold text-slate-950">
                          {item.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 4. Role-Based Workspaces Grid (60% White Background, Unified Blue Icons, Black Text) */}
        <section id="workspaces" className="bg-white py-16 px-6">
          <div className="max-w-7xl mx-auto space-y-10">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                Role Workspaces
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
                Purpose-Built for Every Clinical &amp; Billing Team
              </h2>
              <p className="text-sm text-slate-600">
                Select your department workspace to access dedicated UAE e-Claims workflows.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {personas.map((p) => {
                const Icon = p.icon;
                return (
                  <Link
                    key={p.href}
                    href={p.href}
                    className="bg-white border border-slate-200 hover:border-blue-700 rounded-2xl p-6 flex flex-col justify-between transition-all group shadow-xs hover:shadow-md"
                  >
                    <div className="space-y-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 group-hover:bg-blue-700 group-hover:text-white transition-colors">
                        <Icon size={26} weight="duotone" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-950 text-base group-hover:text-blue-700 transition-colors">
                          {p.role}
                        </h3>
                        <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                          {p.desc}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 mt-5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-700">
                      <span>Enter Workspace</span>
                      <ArrowRight
                        size={14}
                        weight="bold"
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Contact Form Section (Above Footer) */}
        <section id="contact" className="bg-blue-50/70 border-t border-blue-100 py-16 sm:py-20 px-6">
          <div className="max-w-6xl mx-auto space-y-10">
            <div className="text-center max-w-2xl mx-auto space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                Contact Us
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
                Request a Demo or Facility Onboarding
              </h2>
              <p className="text-sm text-slate-600">
                Have questions about MoHAP Riayati, DHA eClaimLink, or MOSCTD setup? Reach out to our team.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              {/* Left Info Card */}
              <div className="lg:col-span-5 bg-blue-700 rounded-2xl p-7 sm:p-8 text-white flex flex-col justify-between shadow-lg shadow-blue-950/10">
                <div className="space-y-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/15 text-[11px] font-semibold uppercase tracking-wider text-blue-50">
                    MOSCTD Support
                  </span>
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
                    Talk to our UAE e-Claims specialists
                  </h3>
                  <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
                    Get help with SenderID configuration, XSD claim validation, or multi-department onboarding for your clinic.
                  </p>
                </div>

                <div className="space-y-4 pt-8">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-white text-blue-700 flex items-center justify-center shrink-0">
                      <EnvelopeSimple size={17} weight="bold" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-white">
                      info@mosctd.ae
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-white text-blue-700 flex items-center justify-center shrink-0">
                      <Phone size={17} weight="fill" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-white">
                      +971 6 555 1234
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-white text-blue-700 flex items-center justify-center shrink-0">
                      <MapPin size={17} weight="fill" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-white">
                      King Faisal St, Sharjah, UAE
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Form Card */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm flex flex-col justify-center">
                {contactSubmitted ? (
                  <div className="py-10 text-center space-y-5">
                    <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center">
                      <CheckCircle size={32} weight="fill" />
                    </div>
                    <div className="space-y-1.5 max-w-md mx-auto">
                      <h3 className="text-xl font-bold text-slate-950">
                        Message Sent Successfully
                      </h3>
                      <p className="text-sm text-slate-600">
                        Thank you, <span className="font-semibold text-slate-900">{contactForm.name}</span>. Our onboarding team will get back to you shortly.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleContactReset}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                    >
                      <ArrowClockwise size={15} />
                      <span>Send Another Message</span>
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    {contactError && (
                      <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                        {contactError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label htmlFor="contact-name" className="block text-xs font-semibold text-slate-700">
                          Full Name <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="contact-name"
                          name="name"
                          type="text"
                          required
                          value={contactForm.name}
                          onChange={handleContactChange}
                          placeholder="Enter your full name"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/15 transition-all"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="contact-email" className="block text-xs font-semibold text-slate-700">
                          Work Email <span className="text-rose-500">*</span>
                        </label>
                        <input
                          id="contact-email"
                          name="email"
                          type="email"
                          required
                          value={contactForm.email}
                          onChange={handleContactChange}
                          placeholder="Enter your work email"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/15 transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label htmlFor="contact-phone" className="block text-xs font-semibold text-slate-700">
                          Phone Number
                        </label>
                        <input
                          id="contact-phone"
                          name="phone"
                          type="tel"
                          value={contactForm.phone}
                          onChange={handleContactChange}
                          placeholder="Enter your phone number"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/15 transition-all"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="contact-facility" className="block text-xs font-semibold text-slate-700">
                          Facility / Clinic Name
                        </label>
                        <input
                          id="contact-facility"
                          name="facility"
                          type="text"
                          value={contactForm.facility}
                          onChange={handleContactChange}
                          placeholder="Enter your facility or clinic name"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/15 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="contact-message" className="block text-xs font-semibold text-slate-700">
                        Message <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        id="contact-message"
                        name="message"
                        rows={4}
                        required
                        value={contactForm.message}
                        onChange={handleContactChange}
                        placeholder="Enter your message..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700/15 transition-all resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={contactSubmitting}
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-60 text-white text-sm font-semibold shadow-sm shadow-blue-700/20 transition-colors cursor-pointer"
                    >
                      <PaperPlaneRight size={16} weight="bold" />
                      <span>{contactSubmitting ? "Sending..." : "Send Message"}</span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer (White Surface, Slate Border, Crisp Black/Charcoal Text) */}
      <footer className="border-t border-slate-200 bg-white px-6 py-6 text-center text-xs text-slate-600">
        <span className="font-semibold text-slate-900">MOSCTD</span> &bull;{" "}
        Riayati Post Office Switch (TEST) &bull; Compliant with MoHAP &amp; DHA eClaimLink Standards
      </footer>
    </div>
  );
}
