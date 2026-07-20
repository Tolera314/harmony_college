'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { Mail, Lock, Shield, GraduationCap, Users, BookOpen, EyeOff, Eye, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isHoveringBtn, setIsHoveringBtn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Controlled form state — no DOM reads
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      // Role-based redirect
      if (data.role === 'SUPER_ADMIN' || data.role === 'REGISTRAR_OFFICER' ||
          data.role === 'FINANCE_OFFICER' || data.role === 'HR_OFFICER' ||
          data.role === 'DEPARTMENT_HEAD') {
        window.location.href = '/admin';
      } else if (data.role === 'LECTURER') {
        window.location.href = '/lecturer';
      } else {
        window.location.href = '/';
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-[#0F0F10] text-white overflow-hidden font-sans">
      
      {/* LEFT SECTION (50%) */}
      <div className="relative w-full md:w-1/2 h-[35vh] md:h-full shrink-0 overflow-hidden">
        <Image
          src="/signin.png"
          alt="Harmony College Campus"
          fill
          priority
          className="object-cover"
          sizes="50vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0F0F10]/90 via-[#0F0F10]/50 to-[#0F0F10]/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F10] via-transparent to-transparent md:hidden" />
        
        <div className="absolute inset-0 flex flex-col justify-between p-8 md:p-12 z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="max-w-xl mt-auto md:mt-0 md:pt-8"
          >
            <span className="inline-block uppercase tracking-widest text-[#D4AF37] text-xs font-bold mb-3 font-mono border border-[#D4AF37]/30 px-3 py-1 rounded-full bg-[#D4AF37]/10">
              Welcome to Harmony College
            </span>
            <h1 className="text-4xl md:text-5xl font-serif font-semibold leading-tight mb-4 text-white drop-shadow-md">
              Empowering Future Leaders
            </h1>
            <p className="text-gray-300 text-sm md:text-base max-w-md font-sans leading-relaxed drop-shadow-sm hidden md:block">
              Access your academic journey through a secure digital campus designed for students, faculty, and staff.
            </p>
          </motion.div>

          {/* Stats Cards (Desktop Only) */}
          <div className="hidden md:flex gap-4 mt-8 pb-8">
            {[
              { label: 'Students', value: '500+', icon: Users },
              { label: 'Programs', value: '10+', icon: BookOpen },
              { label: 'Graduate Success', value: '90%', icon: GraduationCap },
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 + idx * 0.1 }}
                className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-5 flex-1 shadow-2xl relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                  <stat.icon className="w-10 h-10 text-white" />
                </div>
                <div className="text-2xl font-serif font-bold text-white mb-1">{stat.value}</div>
                <div className="text-[10px] text-gray-300 font-sans tracking-wide uppercase">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT SECTION (50%) */}
      <div className="w-full md:w-1/2 h-full bg-gradient-to-br from-[#0F0F10] via-[#1A1A1D] to-[#252528] flex items-center justify-center p-6 md:p-12 relative">
        
        {/* Glowing background decor */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] bg-[#D4AF37]/5 rounded-full blur-[100px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-lg bg-[#0F0F10]/60 backdrop-blur-2xl rounded-2xl border border-[#D4AF37]/30 p-8 shadow-2xl z-10"
        >
          {/* Header */}
          <div className="flex flex-col items-center mb-8 text-center">
            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mb-4 border border-white/10 shadow-inner">
              <Image
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBkk-GfOeeS5kDbA0-xztv8nzqkDrjaLS9xrLYqbgsKDnF3Mgv96Vc6Y3DD4IWBFmoV8u_skSaXfx90BGbNSsit1rc6tnddGQr95P7j0XYaVMT-mv9BIr-INftW65Au2LacF37YGXy4n5CkW1e3oDOI8CUTg4wHCFFuY5-a-_LwZdZbdsruqrfDTWakKwehMJk_9SkFYy9ssYdDjfMKD_e4REWNqaiaoYA9Ppx_gYawAHQQjXFAAHh_uYQcMyOXdTB31Xj6fpKXxQ" 
                alt="Logo" 
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            <h2 className="text-2xl font-serif font-semibold text-white mb-2">Welcome Back</h2>
            <p className="text-gray-400 text-sm font-sans">Sign in to continue to your academic portal.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSignIn} className="space-y-5">
            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl p-3 text-center">
                {errorMsg}
              </div>
            )}
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-[#D4AF37] transition-colors" />
              <input 
                type="email" 
                id="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all peer placeholder-transparent"
                placeholder="Email Address"
              />
              <label htmlFor="email" className="absolute left-12 -top-2.5 bg-[#0F0F10] px-1 text-xs text-gray-500 peer-focus:text-[#D4AF37] transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-focus:-top-2.5 peer-focus:text-xs">
                Email Address
              </label>
            </div>

            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-[#D4AF37] transition-colors" />
              <input 
                type={showPassword ? "text" : "password"} 
                id="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-12 pr-12 text-white text-sm focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all peer placeholder-transparent"
                placeholder="Password"
              />
              <label htmlFor="password" className="absolute left-12 -top-2.5 bg-[#0F0F10] px-1 text-xs text-gray-500 peer-focus:text-[#D4AF37] transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-focus:-top-2.5 peer-focus:text-xs">
                Password
              </label>
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <div className="flex items-center justify-between pb-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center justify-center w-4 h-4">
                  <input type="checkbox" className="peer appearance-none w-4 h-4 border border-gray-600 rounded-[3px] checked:bg-[#D4AF37] checked:border-[#D4AF37] transition-all cursor-pointer" />
                  <svg className="absolute w-3 h-3 text-[#0F0F10] opacity-0 peer-checked:opacity-100 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <span className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors">Remember Me</span>
              </label>
              <a href="#" className="text-xs text-[#D4AF37] hover:text-[#E9C349] transition-colors font-medium">
                Forgot Password?
              </a>
            </div>

            <motion.button
              onHoverStart={() => setIsHoveringBtn(true)}
              onHoverEnd={() => setIsHoveringBtn(false)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-gradient-to-r from-[#B49020] to-[#D4AF37] text-[#0F0F10] font-bold py-3.5 rounded-xl shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] transition-all flex items-center justify-center gap-2 relative overflow-hidden"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-[#0F0F10]/30 border-t-[#0F0F10] rounded-full animate-spin" />
              ) : (
                <>
                  <span className="text-sm">Sign In</span>
                  <motion.div animate={{ x: isHoveringBtn ? 5 : 0 }}>
                    <ArrowRight className="w-4 h-4" />
                  </motion.div>
                </>
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="h-[1px] flex-1 bg-white/10" />
            <span className="text-[10px] uppercase tracking-widest text-gray-500 font-mono">Or Continue With</span>
            <div className="h-[1px] flex-1 bg-white/10" />
          </div>

          {/* Social Logins */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button className="flex items-center justify-center py-2.5 border border-white/10 rounded-xl hover:bg-white/5 hover:border-white/20 transition-all">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </button>
            <button className="flex items-center justify-center py-2.5 border border-white/10 rounded-xl hover:bg-white/5 hover:border-white/20 transition-all">
              <svg className="w-5 h-5" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 0L0 0L0 10L10 10L10 0Z" fill="#F25022"/>
                <path d="M21 0L11 0L11 10L21 10L21 0Z" fill="#7FBA00"/>
                <path d="M10 11L0 11L0 21L10 21L10 11Z" fill="#00A4EF"/>
                <path d="M21 11L11 11L11 21L21 21L21 11Z" fill="#FFB900"/>
              </svg>
            </button>
          </div>

          <div className="text-center text-sm text-gray-500 pt-3 pb-4 border-b border-white/5">
            Don't have an account? <Link href="/apply" className="text-[#D4AF37] hover:text-[#E9C349] transition-colors font-medium ml-1">Apply for Admission</Link>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-gray-500">
            <Shield className="w-4 h-4" />
            <span className="text-[10px] uppercase tracking-wider font-sans">Protected with enterprise encryption</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
