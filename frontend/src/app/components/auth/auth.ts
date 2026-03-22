import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { LucideAngularModule, UserCircle, Mail, Lock, LogIn, UserPlus, MapPin, CheckCircle, XCircle } from 'lucide-angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-auth',
  imports: [FormsModule, LucideAngularModule, CommonModule],
  template: `
    <div class="min-h-screen bg-brand-50 flex col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden animate-fade-in">
      
      <!-- Decorative Background Elements -->
      <div class="absolute top-10 left-10 text-brand-main opacity-5 pointer-events-none transform -rotate-12">
        <lucide-angular [img]="MapPinIcon" [size]="400"></lucide-angular>
      </div>
      <div class="absolute -bottom-20 -right-20 text-brand-main opacity-5 pointer-events-none transform rotate-12">
        <lucide-angular [img]="MapPinIcon" [size]="500"></lucide-angular>
      </div>

      <div class="w-full max-w-md relative z-10 animate-fade-in-up">
        
        <!-- Header -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center p-4 bg-brand-main text-white rounded-[1.5rem] shadow-premium mb-6 transform hover:scale-105 transition-transform">
            <lucide-angular [img]="MapPinIcon" [size]="48" [strokeWidth]="2.5"></lucide-angular>
          </div>
          <h2 class="text-3xl font-extrabold text-brand-dark tracking-tight">
            {{ isLoginMode ? 'Welcome back' : 'Create an Account' }}
          </h2>
          <p class="mt-3 text-base font-medium text-slate-500">
            {{ isLoginMode ? "Don't have an account?" : "Already have an account?" }}
            <button (click)="toggleMode()" class="font-bold text-brand-main hover:text-brand-700 focus:outline-none transition-colors ml-1 border-b-2 border-transparent hover:border-brand-main">
              {{ isLoginMode ? 'Sign up for free' : 'Log in here' }}
            </button>
          </p>
        </div>
    
        <!-- Form Card -->
        <div class="bg-white p-8 sm:p-10 shadow-premium rounded-[2rem] border border-white">
          <div class="space-y-6">
            
            <!-- Username (Signup Only) -->
            @if (!isLoginMode) {
              <div class="animate-fade-in">
                <label class="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Username</label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-brand-400">
                    <lucide-angular [img]="UserCircleIcon" [size]="20"></lucide-angular>
                  </div>
                  <input [(ngModel)]="signupUsername" placeholder="e.g. pottyfinder99" type="text" class="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-main focus:ring-4 focus:ring-brand-100 focus:bg-white transition-all">
                </div>
              </div>
            }
    
            <!-- Email -->
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Email address</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-brand-400">
                  <lucide-angular [img]="MailIcon" [size]="20"></lucide-angular>
                </div>
                @if (isLoginMode) {
                  <input [(ngModel)]="loginEmail" placeholder="you@example.com" type="email" class="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-main focus:ring-4 focus:ring-brand-100 focus:bg-white transition-all">
                } @else {
                  <input [(ngModel)]="signupEmail" placeholder="you@example.com" type="email" class="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-main focus:ring-4 focus:ring-brand-100 focus:bg-white transition-all">
                }
              </div>
            </div>
    
            <!-- Password -->
            <div>
              <label class="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Password</label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-brand-400">
                  <lucide-angular [img]="LockIcon" [size]="20"></lucide-angular>
                </div>
                @if (isLoginMode) {
                  <input [(ngModel)]="loginPassword" placeholder="••••••••" type="password" class="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-main focus:ring-4 focus:ring-brand-100 focus:bg-white transition-all">
                } @else {
                  <input [(ngModel)]="signupPassword" placeholder="••••••••" type="password" class="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-main focus:ring-4 focus:ring-brand-100 focus:bg-white transition-all">
                }
              </div>
            </div>
    
            <!-- Actions -->
            <div class="pt-4 mt-2">
              <button (click)="isLoginMode ? login() : signup()" class="w-full flex items-center justify-center gap-2 py-4 px-4 bg-brand-main text-white rounded-xl shadow-premium font-black text-lg hover:bg-brand-600 hover:-translate-y-0.5 transition-all focus:outline-none focus:ring-4 focus:ring-brand-200">
                <lucide-angular [img]="isLoginMode ? LogInIcon : UserPlusIcon" [size]="20"></lucide-angular>
                {{ isLoginMode ? 'Sign In' : 'Create Account' }}
              </button>
            </div>
          </div>
    
          <!-- Status Messages -->
          @if (loginMsg && isLoginMode) {
            <div class="mt-6 p-4 rounded-xl flex items-center gap-3 font-bold border-2" [ngClass]="loginMsg.includes('❌') ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'">
              <lucide-angular [img]="loginMsg.includes('❌') ? XCircleIcon : CheckCircleIcon" [size]="20"></lucide-angular>
              {{ loginMsg }}
            </div>
          }
          @if (signupMsg && !isLoginMode) {
            <div class="mt-6 p-4 rounded-xl flex items-center gap-3 font-bold border-2" [ngClass]="signupMsg.includes('❌') ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'">
              <lucide-angular [img]="signupMsg.includes('❌') ? XCircleIcon : CheckCircleIcon" [size]="20"></lucide-angular>
              {{ signupMsg }}
            </div>
          }
    
        </div>
      </div>
    </div>
  `
})
export class AuthComponent {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);

  UserCircleIcon = UserCircle;
  MailIcon = Mail;
  LockIcon = Lock;
  LogInIcon = LogIn;
  UserPlusIcon = UserPlus;
  MapPinIcon = MapPin;
  CheckCircleIcon = CheckCircle;
  XCircleIcon = XCircle;

  loginEmail = ''; loginPassword = ''; loginMsg = '';
  signupUsername = ''; signupEmail = ''; signupPassword = ''; signupMsg = '';

  isLoginMode = true;

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    this.loginMsg = '';
    this.signupMsg = '';
  }

  login() {
    this.api.login({ email: this.loginEmail, password: this.loginPassword }).subscribe({
      next: (res) => {
        console.log('[Auth] Login success:', res);
        this.auth.login(res);
        this.loginMsg = `Welcome, ${res.username}`;
        this.router.navigate(['/']);
      },
      error: (err) => {
        console.error('[Auth] Login error:', err);
        this.loginMsg = `❌ ${err.error?.message || 'Login failed'}`;
      }
    });
  }

  signup() {
    this.api.signup({ username: this.signupUsername, email: this.signupEmail, password: this.signupPassword }).subscribe({
      next: (res) => {
        console.log('[Auth] Signup success:', res);
        this.auth.login(res);
        this.signupMsg = `Account created for ${res.username}`;
        this.router.navigate(['/']);
      },
      error: (err) => {
        console.error('[Auth] Signup error:', err);
        this.signupMsg = `❌ ${err.error?.message || 'Signup failed'}`;
      }
    });
  }
}
