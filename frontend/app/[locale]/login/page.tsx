"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "@/i18n/routing";
import { useAuth } from "../../context/AuthContext";
import { LanguageSwitcher } from "../../components/LanguageSwitcher";
import {
  X,
  EnvelopeSimple,
  LockKey,
  Eye,
  EyeSlash,
  ArrowLeft,
  CheckCircle,
  CircleNotch,
  Stethoscope,
  IdentificationCard,
  Pill,
  Receipt,
  Sparkle,
  ArrowRight,
  ShieldCheck,
} from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { api } from "../../lib/axios";

// Demo accounts for fast testing in UAE e-Claims environment
const DEMO_PRESETS = [
  {
    role: "Doctor",
    label: "Doctor",
    email: "doctor@mosctd.ae",
    password: "Password@123",
    icon: Stethoscope,
  },
  {
    role: "Reception",
    label: "Reception",
    email: "reception@mosctd.ae",
    password: "Password@123",
    icon: IdentificationCard,
  },
  {
    role: "Pharmacy",
    label: "Pharmacy",
    email: "pharmacy@mosctd.ae",
    password: "Password@123",
    icon: Pill,
  },
  {
    role: "Billing",
    label: "Billing",
    email: "billing@mosctd.ae",
    password: "Password@123",
    icon: Receipt,
  },
];

/**
 * Animated SVG Background Component
 * Preserves the blue & white palette, ECG heartbeat pulse wave,
 * floating medical crosses, concentric radar rings, and precision grid.
 */
function HealthcareSvgBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
      {/* 1. Subtle Radial Gradient Glows (Blue & White palette) */}
      <div className="absolute -top-40 -left-40 w-[650px] h-[650px] rounded-full bg-blue-200/40 blur-[130px]" />
      <div className="absolute top-1/2 -right-40 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-sky-100/60 blur-[140px]" />
      <div className="absolute -bottom-40 left-1/3 w-[600px] h-[600px] rounded-full bg-blue-100/50 blur-[120px]" />

      {/* 2. SVG Vector Canvas for Drawing & Path Animations */}
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
      >
        <defs>
          {/* Precision Dot Grid Pattern */}
          <pattern
            id="medical-grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="20" cy="20" r="1.2" fill="#2563EB" fillOpacity="0.08" />
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="#2563EB"
              strokeWidth="0.5"
              strokeOpacity="0.04"
            />
          </pattern>

          {/* ECG Pulse Gradient */}
          <linearGradient id="ecgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2563EB" stopOpacity="0" />
            <stop offset="25%" stopColor="#3B82F6" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#1D4ED8" stopOpacity="0.85" />
            <stop offset="75%" stopColor="#60A5FA" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
          </linearGradient>

          {/* Wave Path Gradient */}
          <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.25" />
            <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#BFDBFE" stopOpacity="0.05" />
          </linearGradient>

          {/* Soft Filter Glow for Heartbeat */}
          <filter id="blueGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* High-Tech Architectural Grid */}
        <rect width="100%" height="100%" fill="url(#medical-grid)" />

        {/* Smooth Gentle Curved Waves */}
        <path
          d="M 0,220 C 350,140 700,320 1200,200 C 1500,120 1800,260 2200,180 L 2200,0 L 0,0 Z"
          fill="url(#waveGrad)"
        />

        {/* Animated ECG Pulse Wave 1 (Upper Horizontal Heartbeat Line) */}
        <g transform="translate(0, 160)">
          <line
            x1="0"
            y1="50"
            x2="2400"
            y2="50"
            stroke="#93C5FD"
            strokeWidth="1"
            strokeDasharray="4 8"
            strokeOpacity="0.25"
          />

          <motion.path
            d="M 0,50 L 180,50 L 205,50 L 218,36 L 228,64 L 240,10 L 254,95 L 268,38 L 278,62 L 288,50 L 520,50 L 545,50 L 558,36 L 568,64 L 580,10 L 594,95 L 608,38 L 618,62 L 628,50 L 960,50 L 985,50 L 998,36 L 1008,64 L 1020,10 L 1034,95 L 1048,38 L 1058,62 L 1068,50 L 1400,50 L 1425,50 L 1438,36 L 1448,64 L 1460,10 L 1474,95 L 1488,38 L 1498,62 L 1508,50 L 1840,50 L 1865,50 L 1878,36 L 1888,64 L 1900,10 L 1914,95 L 1928,38 L 1938,62 L 1948,50 L 2400,50"
            fill="none"
            stroke="url(#ecgGrad)"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#blueGlow)"
            initial={{ pathLength: 0, opacity: 0.2 }}
            animate={{
              pathLength: [0, 1, 1],
              pathOffset: [0, 0, 1],
              opacity: [0.3, 0.9, 0.3],
            }}
            transition={{
              duration: 5.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </g>

        {/* Animated ECG Pulse Wave 2 (Lower Inverted Accent) */}
        <g transform="translate(0, 680)">
          <motion.path
            d="M 0,50 L 300,50 L 320,50 L 332,40 L 342,60 L 352,18 L 364,88 L 376,40 L 385,58 L 395,50 L 750,50 L 770,50 L 782,40 L 792,60 L 802,18 L 814,88 L 826,40 L 835,58 L 845,50 L 1200,50 L 1220,50 L 1232,40 L 1242,60 L 1252,18 L 1264,88 L 1276,40 L 1285,58 L 1295,50 L 1700,50 L 1720,50 L 1732,40 L 1742,60 L 1752,18 L 1764,88 L 1776,40 L 1785,58 L 1795,50 L 2400,50"
            fill="none"
            stroke="#3B82F6"
            strokeWidth="1.8"
            strokeOpacity="0.35"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{
              pathLength: [0, 1],
              pathOffset: [0, 1],
            }}
            transition={{
              duration: 6.5,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        </g>

        {/* Connecting Claims Stream Lines */}
        <motion.path
          d="M -50,100 C 300,200 450,450 800,520 C 1150,590 1450,380 2000,650"
          fill="none"
          stroke="#2563EB"
          strokeWidth="1.5"
          strokeDasharray="6 10"
          strokeOpacity="0.25"
          initial={{ strokeDashoffset: 0 }}
          animate={{ strokeDashoffset: -160 }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        />
        <motion.path
          d="M 100,50 C 450,150 600,400 950,470 C 1300,540 1600,330 2150,600"
          fill="none"
          stroke="#60A5FA"
          strokeWidth="1"
          strokeDasharray="4 8"
          strokeOpacity="0.2"
          initial={{ strokeDashoffset: 0 }}
          animate={{ strokeDashoffset: 120 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        />
      </svg>

      {/* 3. Rotating Concentric Rings */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        className="absolute -top-32 -left-32 w-[460px] h-[460px] rounded-full border border-dashed border-blue-300/40 pointer-events-none flex items-center justify-center"
      >
        <div className="w-[340px] h-[340px] rounded-full border border-blue-200/50" />
        <div className="w-[220px] h-[220px] rounded-full border border-dashed border-blue-400/30" />
      </motion.div>

      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 75, repeat: Infinity, ease: "linear" }}
        className="absolute -bottom-48 -right-48 w-[580px] h-[580px] rounded-full border border-dashed border-blue-300/35 pointer-events-none flex items-center justify-center"
      >
        <div className="w-[440px] h-[440px] rounded-full border border-blue-200/40" />
        <div className="w-[280px] h-[280px] rounded-full border border-dashed border-blue-400/25" />
      </motion.div>

      {/* 4. Floating Animated Medical Crosses */}
      {[
        { top: "15%", left: "12%", size: 28, delay: 0, duration: 6 },
        { top: "28%", left: "85%", size: 36, delay: 1.5, duration: 7 },
        { top: "72%", left: "8%", size: 32, delay: 0.8, duration: 6.5 },
        { top: "82%", left: "80%", size: 24, delay: 2.2, duration: 5.5 },
        { top: "50%", left: "46%", size: 22, delay: 1, duration: 8 },
      ].map((pos, idx) => (
        <motion.div
          key={idx}
          style={{ top: pos.top, left: pos.left }}
          initial={{ y: 0, opacity: 0.35, rotate: 0 }}
          animate={{
            y: [-14, 14, -14],
            rotate: [0, 90, 180, 270, 360],
            opacity: [0.25, 0.55, 0.25],
          }}
          transition={{
            duration: pos.duration,
            repeat: Infinity,
            delay: pos.delay,
            ease: "easeInOut",
          }}
          className="absolute pointer-events-none"
        >
          <svg
            width={pos.size}
            height={pos.size}
            viewBox="0 0 40 40"
            fill="none"
            className="text-blue-500/30"
          >
            <path
              d="M16 4 C16 2.89 16.89 2 18 2 L22 2 C23.11 2 24 2.89 24 4 L24 16 L36 16 C37.11 16 38 16.89 38 18 L38 22 C38 23.11 37.11 24 36 24 L24 24 L24 36 C24 37.11 23.11 38 22 38 L18 38 C16.89 38 16 37.11 16 36 L16 24 L4 24 C2.89 24 2 23.11 2 22 L2 18 C2 16.89 2.89 16 4 16 L16 16 Z"
              fill="currentColor"
              stroke="#2563EB"
              strokeWidth="1.5"
              strokeOpacity="0.4"
            />
          </svg>
        </motion.div>
      ))}
    </div>
  );
}

export default function LoginPage() {
  const tAuth = useTranslations("auth");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { signIn, isLoading } = useAuth();

  const [mode, setMode] = useState<"signin" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email || !password) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }

    try {
      const success = await signIn(email.trim(), password);
      if (success) {
        router.push("/dashboard");
      } else {
        setErrorMessage("Invalid credentials. Please verify your email and password.");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Authentication failed.";
      setErrorMessage(msg);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!forgotEmail) {
      setErrorMessage("Please enter your registered email address.");
      return;
    }

    setIsForgotLoading(true);
    try {
      const response = await api.post("/auth/forgot-password", { email: forgotEmail.trim() });
      if (response.data?.success) {
        setForgotSuccess(true);
        toast.success(response.data?.message || "Password reset instructions sent.");
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || "Failed to process request.";
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsForgotLoading(false);
    }
  };

  const handleQuickPreset = (presetEmail: string, presetPass: string) => {
    setEmail(presetEmail);
    setPassword(presetPass);
    setErrorMessage("");
    toast.info(`Filled credentials for ${presetEmail}`);
  };

  const handleClose = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/90 via-white to-blue-100/60 text-slate-900 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden font-sans selection:bg-blue-600 selection:text-white">
      {/* Dynamic Animated Healthcare SVG Background (Preserved) */}
      <HealthcareSvgBackground />

      {/* Top Right Controls (Language Switcher) */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 flex items-center gap-2.5">
        <div className="bg-white/90 backdrop-blur-md border border-blue-100 rounded-full shadow-xs p-0.5">
          <LanguageSwitcher compact />
        </div>
      </div>

      {/* Centered Modal / Card (Clerk Model Style) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-[500px] bg-white/95 backdrop-blur-xl border border-blue-100/90 rounded-3xl shadow-2xl shadow-blue-900/10 overflow-hidden p-8 sm:p-10"
      >
        {/* Close Button (Top Right of Form Card) */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Back to home"
          className="absolute top-4 right-4 sm:top-5 sm:right-5 z-20 w-9 h-9 rounded-full bg-white/90 backdrop-blur-md border border-blue-200/80 hover:border-blue-400 hover:bg-blue-50 text-slate-600 hover:text-slate-950 flex items-center justify-center shadow-xs transition-colors cursor-pointer"
        >
          <X size={17} weight="bold" />
        </button>

        {/* Decorative Subtle Radial Flare */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-32 bg-blue-100/60 blur-2xl pointer-events-none rounded-full" />

        <div className="relative z-10">
          {mode === "forgot" ? (
            <div className="mb-6 text-center flex flex-col items-center">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setErrorMessage("");
                }}
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-semibold mb-3 group cursor-pointer transition-colors"
              >
                <ArrowLeft size={14} weight="bold" className="group-hover:-translate-x-0.5 transition-transform" />
                {tCommon("back")}
              </button>

              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 mb-2 shadow-xs">
                <LockKey size={24} weight="duotone" />
              </div>

              <h2 className="text-2xl font-bold text-slate-950 tracking-tight">
                {tAuth("forgotPassword")}
              </h2>
              <p className="text-slate-500 text-xs sm:text-sm mt-1 leading-relaxed max-w-xs">
                Enter your verified facility email to receive password recovery instructions.
              </p>
            </div>
          ) : (
            <div className="mb-6 text-center flex flex-col items-center">
              {/* Centered Brand Icon & Name (Clerk style) */}
              <div className="flex items-center justify-center gap-2.5 mb-3">
                <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-600/25">
                  M
                </div>
                <span className="text-xl font-bold tracking-tight text-slate-950">
                  Mos<span className="text-blue-600">Ctd</span>
                </span>
              </div>

              <h2 className="text-2xl font-bold text-slate-950 tracking-tight">
                {tAuth("loginTitle") || "Sign in to MosCtd"}
              </h2>
              <p className="text-slate-500 text-xs sm:text-sm mt-1 leading-relaxed max-w-xs">
                Welcome back! Please sign in to continue
              </p>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2"
            >
              <span className="text-sm">⚠️</span>
              <span>{errorMessage}</span>
            </motion.div>
          )}

          {/* Forms Section */}
          {mode === "forgot" ? (
            forgotSuccess ? (
              <div className="py-4 text-center flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-3 shadow-xs">
                  <CheckCircle size={32} weight="fill" />
                </div>
                <h3 className="text-lg font-bold text-slate-950">
                  {tAuth("instructionsSent")}
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                  Please check your inbox for verification and reset instructions.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setForgotSuccess(false);
                  }}
                  className="mt-5 w-full rounded-xl h-11 text-white bg-blue-700 hover:bg-blue-800 font-semibold text-sm shadow-md shadow-blue-700/20 transition-all cursor-pointer flex items-center justify-center"
                >
                  {tCommon("back")}
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {tAuth("emailLabel")}
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                      <EnvelopeSimple size={18} />
                    </div>
                    <input
                      type="email"
                      required
                      placeholder={tAuth("emailPlaceholder") || "name@facility.ae"}
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 rounded-xl text-slate-900 placeholder-slate-400 text-sm outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isForgotLoading}
                  className="w-full mt-2 rounded-xl h-11 text-white bg-blue-700 hover:bg-blue-800 font-semibold text-sm shadow-md shadow-blue-700/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isForgotLoading ? (
                    <>
                      <CircleNotch size={18} className="animate-spin" />
                      <span>{tCommon("loading")}</span>
                    </>
                  ) : (
                    <span>{tAuth("forgotPassword")}</span>
                  )}
                </button>
              </form>
            )
          ) : (
            <form onSubmit={handleSignInSubmit} className="space-y-4">
              {/* Work Email Field */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {tAuth("emailLabel")}
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                    <EnvelopeSimple size={18} />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder={tAuth("emailPlaceholder") || "doctor@mosctd.ae"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 rounded-xl text-slate-900 placeholder-slate-400 text-sm outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    {tAuth("passwordLabel")}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot");
                      setErrorMessage("");
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-semibold transition-colors cursor-pointer"
                  >
                    {tAuth("forgotPassword")}
                  </button>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                    <LockKey size={18} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder={tAuth("passwordPlaceholder") || "••••••••••••"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50/70 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/15 rounded-xl text-slate-900 placeholder-slate-400 text-sm outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Remember Device Checkbox */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                  />
                  <span className="text-xs text-slate-600 font-medium">
                    {tAuth("rememberMe") || "Remember this device"}
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="group w-full mt-2 rounded-xl h-11 text-white bg-blue-700 hover:bg-blue-800 active:scale-[0.99] font-semibold text-sm shadow-md shadow-blue-700/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <CircleNotch size={18} className="animate-spin" />
                    <span>{tAuth("authenticating")}</span>
                  </>
                ) : (
                  <>
                    <span>{tAuth("submitSignIn")}</span>
                    <ArrowRight size={15} weight="bold" className="transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Quick Demo Role Presets (Compact Row) */}
          <div className="mt-6 pt-5 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
              <span className="flex items-center gap-1 text-slate-600">
                <Sparkle size={13} weight="fill" className="text-blue-600" />
                Quick Role Autofill
              </span>
              <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
                Demo
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_PRESETS.map((preset) => {
                const Icon = preset.icon;
                const isSelected = email === preset.email;
                return (
                  <button
                    key={preset.role}
                    type="button"
                    onClick={() => handleQuickPreset(preset.email, preset.password)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                        : "bg-slate-50/80 hover:bg-blue-50/70 border-slate-200/80 hover:border-blue-300 text-slate-700 hover:text-blue-900"
                    }`}
                  >
                    <Icon size={14} weight={isSelected ? "bold" : "duotone"} className={isSelected ? "text-white" : "text-blue-600"} />
                    <span className="text-[11px] font-medium truncate">{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-5 pt-4 border-t border-slate-100 text-center space-y-1">
            <p className="text-[11px] text-slate-500">
              {tAuth("needHelp") || "Need technical assistance?"}{" "}
              <Link href="/#contact" className="text-blue-600 font-semibold hover:underline">
                {tAuth("contactSupport") || "Contact Support"}
              </Link>
            </p>
            <div className="pt-2 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
              <ShieldCheck size={13} weight="fill" className="text-blue-600/70" />
              <span>Secured by MosCtd &bull; UAE Riayati &amp; DHA Compliant</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
