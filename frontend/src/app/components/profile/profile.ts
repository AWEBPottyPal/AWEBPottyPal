import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { RouterLink, Router, NavigationEnd } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { LucideAngularModule, UserCircle, Mail, ShieldCheck, CalendarDays, Bookmark, Flag, MessageSquare, PlusCircle, ChevronRight, LogOut } from 'lucide-angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink, LucideAngularModule, CommonModule],
  template: `
    <div class="min-h-screen bg-brand-50 pb-16 pt-8 animate-fade-in">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <!-- Header -->
        <div class="text-center mb-10">
          <div class="inline-flex items-center justify-center p-4 bg-brand-main text-white rounded-[1.5rem] shadow-premium mb-6 transform hover:scale-105 transition-transform">
            <lucide-angular [img]="UserCircleIcon" [size]="48" [strokeWidth]="2"></lucide-angular>
          </div>
          <h2 class="text-4xl md:text-5xl font-extrabold text-brand-dark tracking-tight leading-tight">My Profile</h2>
          <p class="text-base font-medium text-slate-500 mt-3 max-w-xl mx-auto">Manage your account, reviews, and contributed restrooms.</p>
        </div>

        @if (!auth.isLoggedIn()) {
          <div class="bg-white p-10 rounded-[2.5rem] shadow-premium text-center border border-white">
            <p class="text-xl font-bold text-slate-700 mb-6">Please sign in to view your profile.</p>
            <a routerLink="/auth" class="inline-block bg-brand-main text-white font-bold py-3.5 px-8 rounded-xl shadow-premium hover:bg-brand-600 transition-all hover:-translate-y-1">Login / Sign Up</a>
          </div>
        } @else if (user) {
          
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            <!-- User Info Card -->
            <div class="lg:col-span-5 relative z-10">
              <div class="bg-white rounded-[2.5rem] shadow-premium border border-white p-8 overflow-hidden relative">
                <div class="absolute -right-10 -bottom-10 text-brand-50 opacity-50 pointer-events-none transform -rotate-12 z-0">
                  <lucide-angular [img]="UserCircleIcon" [size]="250"></lucide-angular>
                </div>
                
                <div class="relative z-10">
                  <div class="w-24 h-24 rounded-full bg-gradient-to-br from-brand-300 to-brand-main flex items-center justify-center text-white text-4xl font-black shadow-premium border-4 border-white mb-6">
                    {{ user.username[0].toUpperCase() }}
                  </div>
                  
                  <div class="space-y-6">
                    <div>
                      <span class="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">Username</span>
                      <p class="text-2xl font-black text-brand-dark">{{ user.username }}</p>
                    </div>
                    
                    <div class="flex items-center gap-3">
                      <div class="bg-brand-50 p-2 rounded-lg text-brand-main">
                        <lucide-angular [img]="MailIcon" [size]="20"></lucide-angular>
                      </div>
                      <div>
                        <span class="text-xs font-black text-slate-400 uppercase tracking-widest block mb-0.5">Email Address</span>
                        <p class="text-base font-bold text-slate-700">{{ user.email }}</p>
                      </div>
                    </div>
                    
                    <div class="flex items-center gap-3">
                      <div class="bg-brand-50 p-2 rounded-lg text-brand-main">
                        <lucide-angular [img]="ShieldCheckIcon" [size]="20"></lucide-angular>
                      </div>
                      <div>
                        <span class="text-xs font-black text-slate-400 uppercase tracking-widest block mb-0.5">Account Role</span>
                        <p class="text-base font-bold text-slate-700 capitalize">
                          <span class="inline-block px-3 py-0.5 rounded-full text-sm shadow-sm" [ngClass]="user.role === 'admin' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-green-100 text-green-800 border-green-200'">{{ user.role }}</span>
                        </p>
                      </div>
                    </div>
                    
                    <div class="flex items-center gap-3">
                      <div class="bg-brand-50 p-2 rounded-lg text-brand-main">
                        <lucide-angular [img]="CalendarDaysIcon" [size]="20"></lucide-angular>
                      </div>
                      <div>
                        <span class="text-xs font-black text-slate-400 uppercase tracking-widest block mb-0.5">Member Since</span>
                        <p class="text-base font-bold text-slate-700">{{ dateStr(user.createdAt) | date:'mediumDate' }}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Activity Navigation -->
            <div class="lg:col-span-7">
              <div class="bg-white rounded-[2.5rem] shadow-premium border border-white p-6 sm:p-8">
                <h3 class="text-xl font-black text-brand-dark uppercase tracking-widest mb-6 px-2">Your Activity</h3>
                
                <div class="space-y-4">
                  <!-- Navigation Links -->
                  <a routerLink="/saved" class="flex items-center justify-between p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-brand-200 hover:shadow-soft transition-all group">
                    <div class="flex items-center gap-4">
                      <div class="bg-brand-100 text-brand-main p-3 rounded-xl group-hover:bg-brand-main group-hover:text-white transition-colors duration-300">
                        <lucide-angular [img]="BookmarkIcon" [size]="24"></lucide-angular>
                      </div>
                      <div>
                        <span class="block text-lg font-black text-brand-dark group-hover:text-brand-main transition-colors">Saved Restrooms</span>
                        <span class="text-sm font-bold text-slate-500">{{ user.savedRestrooms?.length || 0 }} Items</span>
                      </div>
                    </div>
                    <lucide-angular [img]="ChevronRightIcon" [size]="24" class="text-slate-300 group-hover:text-brand-main group-hover:translate-x-1 transition-all"></lucide-angular>
                  </a>
                  
                  <a routerLink="/reviewed" class="flex items-center justify-between p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-brand-200 hover:shadow-soft transition-all group">
                    <div class="flex items-center gap-4">
                      <div class="bg-green-100 text-green-600 p-3 rounded-xl group-hover:bg-green-500 group-hover:text-white transition-colors duration-300">
                        <lucide-angular [img]="MessageSquareIcon" [size]="24"></lucide-angular>
                      </div>
                      <div>
                        <span class="block text-lg font-black text-brand-dark group-hover:text-green-600 transition-colors">Your Reviews</span>
                        <span class="text-sm font-bold text-slate-500">{{ user.reviewedRestrooms?.length || 0 }} Reviews Posted</span>
                      </div>
                    </div>
                    <lucide-angular [img]="ChevronRightIcon" [size]="24" class="text-slate-300 group-hover:text-green-600 group-hover:translate-x-1 transition-all"></lucide-angular>
                  </a>
                  
                  <a routerLink="/added" class="flex items-center justify-between p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-brand-200 hover:shadow-soft transition-all group">
                    <div class="flex items-center gap-4">
                      <div class="bg-amber-100 text-amber-600 p-3 rounded-xl group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300">
                        <lucide-angular [img]="PlusCircleIcon" [size]="24"></lucide-angular>
                      </div>
                      <div>
                        <span class="block text-lg font-black text-brand-dark group-hover:text-amber-600 transition-colors">Restrooms Added</span>
                        <span class="text-sm font-bold text-slate-500">{{ user.addedRestrooms?.length || 0 }} Contributions</span>
                      </div>
                    </div>
                    <lucide-angular [img]="ChevronRightIcon" [size]="24" class="text-slate-300 group-hover:text-amber-600 group-hover:translate-x-1 transition-all"></lucide-angular>
                  </a>
                  
                  <a routerLink="/flagged" class="flex items-center justify-between p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:border-brand-200 hover:shadow-soft transition-all group">
                    <div class="flex items-center gap-4">
                      <div class="bg-red-100 text-red-600 p-3 rounded-xl group-hover:bg-red-500 group-hover:text-white transition-colors duration-300">
                        <lucide-angular [img]="FlagIcon" [size]="24"></lucide-angular>
                      </div>
                      <div>
                        <span class="block text-lg font-black text-brand-dark group-hover:text-red-600 transition-colors">Flagged by You</span>
                        <span class="text-sm font-bold text-slate-500">{{ user.flaggedRestrooms?.length || 0 }} Reports</span>
                      </div>
                    </div>
                    <lucide-angular [img]="ChevronRightIcon" [size]="24" class="text-slate-300 group-hover:text-red-600 group-hover:translate-x-1 transition-all"></lucide-angular>
                  </a>
                </div>



                <div class="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                    <button (click)="logout()" class="flex items-center gap-2 text-slate-500 hover:text-red-500 font-bold bg-slate-50 hover:bg-red-50 px-5 py-3 rounded-xl transition-colors">
                      <lucide-angular [img]="LogOutIcon" [size]="20"></lucide-angular> Sign Out
                    </button>
                </div>
              </div>
            </div>
            
          </div>
          
        } @else {
          <!-- Loading state -->
          <div class="bg-white p-12 rounded-[2.5rem] shadow-premium flex flex-col items-center justify-center border border-white min-h-[400px]">
            <div class="animate-spin rounded-full h-16 w-16 border-4 border-brand-100 border-t-brand-main mb-6"></div>
            <p class="font-bold text-lg text-brand-dark animate-pulse">Loading amazing profile...</p>
          </div>
        }
      </div>
    </div>
  `
})
export class ProfileComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  auth = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  UserCircleIcon = UserCircle;
  MailIcon = Mail;
  ShieldCheckIcon = ShieldCheck;
  CalendarDaysIcon = CalendarDays;
  BookmarkIcon = Bookmark;
  FlagIcon = Flag;
  MessageSquareIcon = MessageSquare;
  PlusCircleIcon = PlusCircle;
  ChevronRightIcon = ChevronRight;
  LogOutIcon = LogOut;

  user: any = null;

  dateStr(d?: string): string {
    return d ? d.slice(0, 10) : '';
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/']);
  }

  ngOnInit() {
    setTimeout(() => this.fetchData(), 0);

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        if (this.router.url === '/profile') {
          this.fetchData();
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private fetchData() {
    const id = this.auth.getUserId();
    if (!id) return;
    this.api.getProfile(id).subscribe({
      next: (u) => { 
        this.user = u;
        this.cdr.markForCheck();
      },
      error: (e) => console.error('[Profile] Error:', e)
    });
  }
}
