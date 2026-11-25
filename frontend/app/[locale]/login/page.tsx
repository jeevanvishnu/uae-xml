"use client";

import React, { useState } from "react";
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
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { api } from "../../lib/axios";

export default function LoginPage() {
  const tAuth = useTranslations("auth");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { signIn, isLoading } = useAuth();

  const [mode, setMode] = useState<"signin" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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

  const handleClose = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg,#0B0F17)] text-slate-200 flex flex-col justify-center items-center px-4 relative overflow-hidden font-sans">
      {/* Top Bar Controls */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-3">
        <LanguageSwitcher compact />
      </div>

      {/* Background Soft Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-sky-500/10 blur-[140px] rounded-full pointer-events-none" />

      {/* Main Login Card - Image 1 MosCTD Style */}
      <div
        data-theme="dark"
        className="dark relative w-full max-w-md bg-[var(--color-surface,#161B26)] border border-[var(--color-border,#243045)] rounded-3xl shadow-2xl overflow-hidden z-10 p-7 sm:p-8 animate-in zoom-in-95 duration-200"
      >
        {/* Interior Accent Flare */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-36 bg-sky-500/15 blur-3xl pointer-events-none rounded-full" />

        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-8 h-8 rounded-full border border-slate-700/60 bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-all duration-200 z-20 cursor-pointer shadow-xs"
        >
          <X size={16} />
        </button>

        <div className="relative z-10">
          {mode === "forgot" ? (
            <div className="mb-6 text-center flex flex-col items-center">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setErrorMessage("");
                }}
                className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:underline font-medium mb-3 group cursor-pointer"
              >
                <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                {tCommon("back")}
              </button>

              <h2 className="font-lexend text-2xl font-bold text-white tracking-tight">
                {tAuth("forgotPassword")}
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm mt-1 leading-relaxed max-w-xs">
                Enter your corporate email address to receive password recovery instructions.
              </p>
            </div>
          ) : (
            <div className="mb-6 text-center flex flex-col items-center">
              <h2 className="font-lexend text-2xl font-bold text-white tracking-tight">
                {tAuth("modalTitle")}
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm mt-1 leading-relaxed max-w-xs">
                {tAuth("modalSubtitle")}
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {mode === "forgot" ? (
            forgotSuccess ? (
              <div className="py-4 text-center flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 shadow-sm">
                  <CheckCircle size={32} weight="fill" />
                </div>
                <h3 className="font-lexend text-lg font-semibold text-white">
                  {tAuth("instructionsSent")}
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Please check your inbox for verification and reset details.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setForgotSuccess(false);
                  }}
                  className="mt-5 w-full rounded-full h-11 text-white bg-sky-500 hover:bg-sky-400 font-semibold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center"
                >
                  {tCommon("back")}
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5 tracking-wide">
                    {tAuth("emailLabel")}
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-sky-400 transition-colors">
                      <EnvelopeSimple size={18} />
                    </div>
                    <input
                      type="email"
                      required
                      placeholder={tAuth("emailPlaceholder")}
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#0D111A]/90 border border-slate-700/80 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-xl text-white placeholder-slate-500 text-sm outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isForgotLoading}
                  className="w-full mt-2 rounded-full h-11 text-white bg-sky-500 hover:bg-sky-400 font-semibold text-sm shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
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
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1.5 tracking-wide">
                  {tAuth("emailLabel")}
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-sky-400 transition-colors">
                    <EnvelopeSimple size={18} />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder={tAuth("emailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0D111A]/90 border border-slate-700/80 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-xl text-white placeholder-slate-500 text-sm outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-200 tracking-wide">
                    {tAuth("passwordLabel")}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot");
                      setErrorMessage("");
                    }}
                    className="text-xs text-sky-400 hover:text-sky-300 hover:underline font-medium transition-colors cursor-pointer"
                  >
                    {tAuth("forgotPassword")}
                  </button>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-sky-400 transition-colors">
                    <LockKey size={18} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder={tAuth("passwordPlaceholder")}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-[#0D111A]/90 border border-slate-700/80 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 rounded-xl text-white placeholder-slate-500 text-sm outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 rounded-full h-11 text-white bg-sky-500 hover:bg-sky-400 font-semibold text-sm shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <CircleNotch size={18} className="animate-spin" />
                    <span>{tAuth("authenticating")}</span>
                  </>
                ) : (
                  <span>{tAuth("submitSignIn")}</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
