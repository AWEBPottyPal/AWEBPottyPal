import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, NavigationEnd } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { LucideAngularModule, MessageSquare, Star, Trash2, MapPin, ExternalLink, CheckCircle, XCircle, FileText } from 'lucide-angular';

@Component({
  selector: 'app-reviewed',
  standalone: true,
  imports: [RouterLink, CommonModule, LucideAngularModule],
  template: `
    <div class="min-h-screen bg-brand-50 pb-16 pt-8 animate-fade-in">
      <div class="app-page">
        
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div class="flex items-center gap-4">
            <div class="bg-green-500 text-white p-4 rounded-[1.5rem] shadow-premium transform hover:scale-105 transition-transform">
              <lucide-angular [img]="MessageSquareIcon" [size]="36" [strokeWidth]="2.5"></lucide-angular>
            </div>
            <div>
              <h2 class="text-3xl md:text-4xl font-extrabold text-brand-dark tracking-tight leading-tight">Your Reviews</h2>
              <p class="text-base font-medium text-slate-500 mt-1">Places you've rated and shared your thoughts on.</p>
            </div>
          </div>
          
          @if (statusMsg && !statusMsg.includes('Loading')) {
            <div class="flex items-center gap-2 px-4 py-2 rounded-xl font-bold shadow-sm"
                 [ngClass]="statusMsg.includes('❌') ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'">
              <lucide-angular [img]="statusMsg.includes('❌') ? XCircleIcon : CheckCircleIcon" [size]="18"></lucide-angular>
              {{ statusMsg }}
            </div>
          } @else if (statusMsg) {
             <div class="flex items-center gap-2 px-4 py-2 rounded-xl font-bold shadow-sm bg-brand-50 text-brand-main border border-brand-200">
              <div class="animate-spin rounded-full h-4 w-4 border-2 border-brand-200 border-t-brand-main"></div>
              {{ statusMsg }}
            </div>
          }
        </div>
    
        @if (reviews.length === 0 && !statusMsg) {
          <div class="py-20 text-center bg-white rounded-[2.5rem] border-2 border-slate-200 border-dashed shadow-sm flex flex-col items-center">
            <div class="bg-slate-50 p-6 rounded-full mb-6 text-slate-300">
              <lucide-angular [img]="MessageSquareIcon" [size]="64"></lucide-angular>
            </div>
            <p class="font-black text-2xl text-brand-dark mb-2">No reviews yet</p>
            <p class="text-base font-medium text-slate-500 max-w-md mx-auto mb-8">Your feedback helps the community find the best facilities! Rate your next restroom visit.</p>
            <a routerLink="/" class="inline-flex items-center gap-2 px-8 py-4 bg-green-500 text-white font-black rounded-xl shadow-premium hover:bg-green-600 hover:-translate-y-1 transition-all">
              Find Restrooms to Review
            </a>
          </div>
        }
    
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          @for (r of reviews; track r._id) {
            <div class="group bg-white rounded-[2rem] border border-white overflow-hidden shadow-soft hover:shadow-premium transition-all duration-300 flex flex-col relative animate-fade-in-up">
              
              <!-- Context Header -->
              <div class="p-6 pb-4 border-b border-slate-100 flex flex-col gap-3">
                <div class="flex justify-between items-start gap-4">
                  <h4 class="text-lg font-black text-brand-dark truncate flex-1" [title]="r.restroom?.name">
                    {{ r.restroom?.name || 'Unknown Restroom' }}
                  </h4>
                  
                  <div class="bg-amber-50 text-amber-600 text-sm font-black px-3 py-1.5 rounded-xl border-2 border-amber-100 flex items-center gap-1.5 shrink-0 shadow-sm">
                    <lucide-angular [img]="StarIcon" [size]="14" class="fill-amber-500"></lucide-angular>
                    {{ r.rating }}.0
                  </div>
                </div>
              </div>
              
              <!-- Comment Body -->
              <div class="p-6 flex-1 flex flex-col bg-slate-50/50">
                <div class="bg-white p-5 rounded-2xl text-slate-600 text-[15px] font-medium leading-relaxed border-2 border-slate-100 mb-6 flex-1 shadow-inner relative">
                  <div class="absolute -top-3 left-4 bg-white px-2 text-slate-300">
                    <lucide-angular [img]="MessageSquareIcon" [size]="16" class="fill-current"></lucide-angular>
                  </div>
                  "{{ r.comment || 'No written comment provided.' }}"
                </div>
                
                <div class="mt-auto flex items-center gap-3 pt-4">
                  @if (r.restroom?._id) {
                    <a [routerLink]="['/restrooms', r.restroom._id]" class="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-black text-white font-black py-3.5 rounded-xl transition-all shadow-sm">
                      <lucide-angular [img]="ExternalLinkIcon" [size]="16"></lucide-angular> View Restroom
                    </a>
                  }
                  <button (click)="deleteReview(r._id)" class="flex items-center justify-center px-5 bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 border-2 border-slate-100 hover:border-red-200 font-bold rounded-xl transition-all shadow-sm py-3.5" title="Delete Review">
                    <lucide-angular [img]="Trash2Icon" [size]="20"></lucide-angular>
                  </button>
                </div>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class ReviewedComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  MessageSquareIcon = MessageSquare;
  StarIcon = Star;
  Trash2Icon = Trash2;
  MapPinIcon = MapPin;
  ExternalLinkIcon = ExternalLink;
  CheckCircleIcon = CheckCircle;
  XCircleIcon = XCircle;
  FileTextIcon = FileText;

  reviews: any[] = [];
  statusMsg = '';

  ngOnInit() {
    setTimeout(() => this.fetchData(), 0);

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        if (this.router.url === '/reviewed') {
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
    if (!id) { 
      this.statusMsg = '⚠️ Not logged in.';
      this.cdr.markForCheck();
      return; 
    }
    this.statusMsg = 'Loading reviews...';
    this.cdr.markForCheck();
    this.api.getReviewedRestrooms(id).subscribe({
      next: (data) => { 
        this.reviews = Array.isArray(data) ? data : [];
        this.statusMsg = '';
        this.cdr.markForCheck();
      },
      error: (e) => { 
        this.statusMsg = `❌ ${e.error?.message || e.message || 'Failed to load reviewed restrooms'}`;
        this.cdr.markForCheck();
      }
    });
  }

  deleteReview(reviewId: string) {
    if (!confirm('Permanently delete your review?')) return;
    
    this.api.deleteReview(reviewId).subscribe({
      next: () => {
        this.statusMsg = 'Review deleted successfully';
        this.fetchData();
      },
      error: (e) => {
        this.statusMsg = `❌ ${e.error?.message || e.message}`;
        this.cdr.markForCheck();
      }
    });
  }
}
