import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { RouterLink, Router, NavigationEnd } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { LucideAngularModule, UserCircle, Mail, ShieldCheck, CalendarDays, Bookmark, Flag, MessageSquare, PlusCircle, ChevronRight } from 'lucide-angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink, LucideAngularModule, CommonModule],
  template: `
    <div class="min-h-screen bg-brand-50 pb-16 pt-8 animate-fade-in">
      <div class="app-page">
        @if (user) {
          <div class="space-y-8">
            <section class="rounded-[2rem] border border-white bg-white/95 p-5 shadow-premium sm:p-6">
              <div class="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                <div class="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div class="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-brand-300 to-brand-main text-4xl font-black text-white shadow-premium">
                    {{ user.username[0].toUpperCase() }}
                  </div>

                  <div class="space-y-2.5">
                    <div>
                      <h3 class="text-3xl font-black tracking-tight text-brand-dark">{{ user.username }}</h3>
                      <div class="mt-2 flex flex-wrap items-center gap-2.5 text-sm font-semibold text-slate-500">
                        <span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-black" [ngClass]="user.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'">
                          {{ user.role === 'admin' ? 'Admin Member' : 'User Member' }}
                        </span>
                        <span>•</span>
                        <span>Member since {{ dateStr(user.createdAt) | date:'longDate' }}</span>
                      </div>
                    </div>

                    <div class="flex items-center gap-3 text-base font-semibold text-slate-600">
                      <div class="rounded-xl bg-brand-50 p-2 text-brand-main">
                        <lucide-angular [img]="MailIcon" [size]="16"></lucide-angular>
                      </div>
                      <span class="break-all">{{ user.email }}</span>
                    </div>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-3 sm:min-w-[250px]">
                  <div class="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4 text-center shadow-sm">
                    <div class="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-100 text-brand-main">
                      <lucide-angular [img]="BookmarkIcon" [size]="20"></lucide-angular>
                    </div>
                    <p class="text-2xl font-black text-brand-dark">{{ countOf('savedRestrooms') }}</p>
                    <p class="mt-1 text-xs font-bold text-slate-500">Saved</p>
                  </div>
                  <div class="rounded-[1.5rem] border border-slate-100 bg-slate-50 p-4 text-center shadow-sm">
                    <div class="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                      <lucide-angular [img]="MessageSquareIcon" [size]="20"></lucide-angular>
                    </div>
                    <p class="text-2xl font-black text-brand-dark">{{ countOf('reviewedRestrooms') }}</p>
                    <p class="mt-1 text-xs font-bold text-slate-500">Reviews</p>
                  </div>
                </div>
              </div>

              <div class="my-6 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>

              <div class="grid grid-cols-2 overflow-hidden rounded-[1.5rem] bg-gradient-to-r from-brand-400 to-brand-main text-white shadow-premium md:grid-cols-4">
                <div class="p-4 text-center">
                  <lucide-angular [img]="BookmarkIcon" [size]="20" class="mx-auto mb-2"></lucide-angular>
                  <p class="text-2xl font-black">{{ countOf('savedRestrooms') }}</p>
                  <p class="mt-1 text-xs font-semibold text-white/85">Saved Restrooms</p>
                </div>
                <div class="border-l border-white/10 p-4 text-center">
                  <lucide-angular [img]="MessageSquareIcon" [size]="20" class="mx-auto mb-2"></lucide-angular>
                  <p class="text-2xl font-black">{{ countOf('reviewedRestrooms') }}</p>
                  <p class="mt-1 text-xs font-semibold text-white/85">Reviews Posted</p>
                </div>
                <div class="border-t border-white/10 p-4 text-center md:border-l md:border-t-0">
                  <lucide-angular [img]="PlusCircleIcon" [size]="20" class="mx-auto mb-2"></lucide-angular>
                  <p class="text-2xl font-black">{{ countOf('addedRestrooms') }}</p>
                  <p class="mt-1 text-xs font-semibold text-white/85">Contributions</p>
                </div>
                <div class="border-l border-t border-white/10 p-4 text-center md:border-t-0">
                  <lucide-angular [img]="FlagIcon" [size]="20" class="mx-auto mb-2"></lucide-angular>
                  <p class="text-2xl font-black">{{ countOf('flaggedRestrooms') }}</p>
                  <p class="mt-1 text-xs font-semibold text-white/85">Reports Made</p>
                </div>
              </div>
            </section>

            <div class="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <section class="rounded-[2rem] border border-white bg-white p-5 shadow-premium sm:p-6">
                <div class="mb-5 flex items-center justify-between gap-4">
                  <h4 class="text-xl font-black text-brand-dark">Profile Information</h4>
                  <div class="rounded-xl border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-black text-brand-main">PottyPal ID</div>
                </div>

                <div class="space-y-3">
                  <div class="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div class="rounded-xl bg-white p-2.5 text-brand-main shadow-sm">
                      <lucide-angular [img]="UserCircleIcon" [size]="20"></lucide-angular>
                    </div>
                    <div>
                      <p class="text-xs font-black uppercase tracking-widest text-slate-400">Username</p>
                      <p class="mt-1 text-lg font-black text-brand-dark">{{ user.username }}</p>
                    </div>
                  </div>

                  <div class="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div class="rounded-xl bg-white p-2.5 text-brand-main shadow-sm">
                      <lucide-angular [img]="MailIcon" [size]="20"></lucide-angular>
                    </div>
                    <div class="min-w-0">
                      <p class="text-xs font-black uppercase tracking-widest text-slate-400">Email Address</p>
                      <p class="mt-1 break-all text-base font-bold text-slate-700">{{ user.email }}</p>
                    </div>
                  </div>

                  <div class="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div class="rounded-xl bg-white p-2.5 text-brand-main shadow-sm">
                      <lucide-angular [img]="ShieldCheckIcon" [size]="20"></lucide-angular>
                    </div>
                    <div>
                      <p class="text-xs font-black uppercase tracking-widest text-slate-400">Account Role</p>
                      <div class="mt-1 inline-flex rounded-full px-3 py-1 text-xs font-black" [ngClass]="user.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'">
                        {{ user.role === 'admin' ? 'Admin' : 'User' }}
                      </div>
                      <p class="mt-2 text-xs font-semibold text-slate-500">{{ user.role === 'admin' ? 'Platform moderation access enabled' : 'Regular community member' }}</p>
                    </div>
                  </div>

                  <div class="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div class="rounded-xl bg-white p-2.5 text-brand-main shadow-sm">
                      <lucide-angular [img]="CalendarDaysIcon" [size]="20"></lucide-angular>
                    </div>
                    <div>
                      <p class="text-xs font-black uppercase tracking-widest text-slate-400">Member Since</p>
                      <p class="mt-1 text-base font-black text-brand-dark">{{ dateStr(user.createdAt) | date:'longDate' }}</p>
                      <p class="mt-1 text-xs font-semibold text-slate-500">{{ memberSinceText(user.createdAt) }}</p>
                    </div>
                  </div>
                </div>
              </section>

              <section class="rounded-[2rem] border border-white bg-white p-5 shadow-premium sm:p-6">
                <h4 class="mb-5 text-xl font-black text-brand-dark">Your Activity</h4>

                <div class="space-y-3">
                  <a routerLink="/saved" class="group flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-all hover:border-brand-200 hover:bg-white hover:shadow-soft">
                    <div class="flex items-center gap-3">
                      <div class="rounded-2xl bg-brand-100 p-2.5 text-brand-main transition-colors group-hover:bg-brand-main group-hover:text-white">
                        <lucide-angular [img]="BookmarkIcon" [size]="20"></lucide-angular>
                      </div>
                      <div>
                        <span class="block text-lg font-black text-brand-dark">Saved Restrooms</span>
                        <span class="text-xs font-bold text-slate-500">{{ countOf('savedRestrooms') }} restroom{{ countOf('savedRestrooms') === 1 ? '' : 's' }} bookmarked</span>
                      </div>
                    </div>
                    <lucide-angular [img]="ChevronRightIcon" [size]="20" class="text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-brand-main"></lucide-angular>
                  </a>

                  <a routerLink="/reviewed" class="group flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-all hover:border-green-200 hover:bg-white hover:shadow-soft">
                    <div class="flex items-center gap-3">
                      <div class="rounded-2xl bg-green-100 p-2.5 text-green-600 transition-colors group-hover:bg-green-500 group-hover:text-white">
                        <lucide-angular [img]="MessageSquareIcon" [size]="20"></lucide-angular>
                      </div>
                      <div>
                        <span class="block text-lg font-black text-brand-dark">Reviews & Ratings</span>
                        <span class="text-xs font-bold text-slate-500">{{ countOf('reviewedRestrooms') }} review{{ countOf('reviewedRestrooms') === 1 ? '' : 's' }} posted</span>
                      </div>
                    </div>
                    <lucide-angular [img]="ChevronRightIcon" [size]="20" class="text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-green-600"></lucide-angular>
                  </a>

                  <a routerLink="/added" class="group flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-all hover:border-amber-200 hover:bg-white hover:shadow-soft">
                    <div class="flex items-center gap-3">
                      <div class="rounded-2xl bg-amber-100 p-2.5 text-amber-600 transition-colors group-hover:bg-amber-500 group-hover:text-white">
                        <lucide-angular [img]="PlusCircleIcon" [size]="20"></lucide-angular>
                      </div>
                      <div>
                        <span class="block text-lg font-black text-brand-dark">Restrooms Added</span>
                        <span class="text-xs font-bold text-slate-500">{{ countOf('addedRestrooms') }} contribution{{ countOf('addedRestrooms') === 1 ? '' : 's' }}</span>
                      </div>
                    </div>
                    <lucide-angular [img]="ChevronRightIcon" [size]="20" class="text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-amber-600"></lucide-angular>
                  </a>

                  <a routerLink="/flagged" class="group flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 p-4 transition-all hover:border-red-200 hover:bg-white hover:shadow-soft">
                    <div class="flex items-center gap-3">
                      <div class="rounded-2xl bg-red-100 p-2.5 text-red-600 transition-colors group-hover:bg-red-500 group-hover:text-white">
                        <lucide-angular [img]="FlagIcon" [size]="20"></lucide-angular>
                      </div>
                      <div>
                        <span class="block text-lg font-black text-brand-dark">Flagged Content</span>
                        <span class="text-xs font-bold text-slate-500">{{ countOf('flaggedRestrooms') }} report{{ countOf('flaggedRestrooms') === 1 ? '' : 's' }} submitted</span>
                      </div>
                    </div>
                    <lucide-angular [img]="ChevronRightIcon" [size]="20" class="text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-red-600"></lucide-angular>
                  </a>
                </div>
              </section>
            </div>

          </div>
          
        } @else {
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

  user: any = null;

  dateStr(d?: string): string {
    return d ? d.slice(0, 10) : '';
  }

  countOf(key: 'savedRestrooms' | 'reviewedRestrooms' | 'addedRestrooms' | 'flaggedRestrooms'): number {
    const value = this.user?.[key];
    return Array.isArray(value) ? value.length : 0;
  }

  memberSinceText(date?: string): string {
    if (!date) return 'Date unavailable';

    const created = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const day = 24 * 60 * 60 * 1000;
    const days = Math.max(0, Math.floor(diffMs / day));

    if (days === 0) return 'Joined today';
    if (days === 1) return '1 day ago';
    if (days < 30) return `${days} days ago`;

    const months = Math.max(1, Math.floor(days / 30));
    if (months === 1) return '1 month ago';
    if (months < 12) return `${months} months ago`;

    const years = Math.max(1, Math.floor(days / 365));
    return years === 1 ? '1 year ago' : `${years} years ago`;
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
