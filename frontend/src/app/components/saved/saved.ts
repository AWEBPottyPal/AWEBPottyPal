import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, NavigationEnd } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Restroom } from '../../models/restroom.model';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { LucideAngularModule, Bookmark, MapPin, Star, Trash2, CheckCircle, XCircle, ImageOff, Map, ArrowRight } from 'lucide-angular';

@Component({
  selector: 'app-saved',
  standalone: true,
  imports: [RouterLink, CommonModule, LucideAngularModule],
  template: `
    <div class="min-h-screen bg-brand-50 pb-16 pt-8 animate-fade-in">
      <div class="app-page">
        
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div class="flex items-center gap-4">
            <div class="bg-brand-main text-white p-4 rounded-[1.5rem] shadow-premium transform hover:scale-105 transition-transform">
              <lucide-angular [img]="BookmarkIcon" [size]="36" [strokeWidth]="2.5"></lucide-angular>
            </div>
            <div>
              <h2 class="text-3xl md:text-4xl font-extrabold text-brand-dark tracking-tight leading-tight">Saved Restrooms</h2>
              <p class="text-base font-medium text-slate-500 mt-1">Your personal collection of go-to spots.</p>
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
    
        @if (restrooms.length === 0 && !statusMsg) {
          <div class="py-20 text-center bg-white rounded-[2.5rem] border-2 border-slate-200 border-dashed shadow-sm flex flex-col items-center">
            <div class="bg-brand-50 p-6 rounded-full mb-6">
              <lucide-angular [img]="BookmarkIcon" [size]="64" class="text-brand-300"></lucide-angular>
            </div>
            <p class="font-black text-2xl text-brand-dark mb-2">No saved restrooms yet</p>
            <p class="text-base font-medium text-slate-500 max-w-md mx-auto mb-8">Explore the map and click "Save" on your favorite locations to keep them handy.</p>
            <a routerLink="/" class="inline-flex items-center gap-2 px-8 py-4 bg-brand-main text-white font-black rounded-xl shadow-premium hover:bg-brand-600 hover:-translate-y-1 transition-all">
              <lucide-angular [img]="MapIcon" [size]="20"></lucide-angular> Explore the Map
            </a>
          </div>
        }
    
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          @for (r of restrooms; track r._id) {
            <div class="group flex flex-col bg-white rounded-[2rem] border border-white overflow-hidden shadow-soft hover:shadow-premium transition-all duration-300 hover:-translate-y-1.5 animate-fade-in-up">
              
              <!-- Image Area -->
              <div class="relative h-56 bg-slate-100 overflow-hidden shrink-0">
                @if (r.images && r.images.length > 0) {
                  <img [src]="r.images[0]" alt="Cover" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
                } @else {
                  <div class="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
                    <lucide-angular [img]="ImageOffIcon" [size]="48" class="mb-3 opacity-50"></lucide-angular>
                    <span class="text-xs font-black uppercase tracking-widest text-slate-400">No Image</span>
                  </div>
                }
                
                <div class="absolute top-4 right-4 flex flex-col gap-2">
                   @if (r.averageRating != null) {
                    <span class="bg-white/95 backdrop-blur text-amber-500 text-sm font-black px-3 py-1.5 rounded-xl shadow-floating flex items-center gap-1.5">
                      <lucide-angular [img]="StarIcon" [size]="14" class="fill-amber-500"></lucide-angular>
                      {{ r.averageRating | number:'1.1-1' }}
                    </span>
                   }
                </div>
              </div>
              
              <!-- Content Area -->
              <div class="p-6 flex flex-col flex-1 relative bg-white">
                <h4 class="text-xl font-black text-brand-dark mb-2 truncate" [title]="r.name">{{ r.name }}</h4>
                <div class="flex items-start gap-2 mb-4">
                  <lucide-angular [img]="MapPinIcon" [size]="14" class="text-brand-main mt-1 shrink-0"></lucide-angular>
                  <p class="text-sm font-medium text-slate-500 line-clamp-2 leading-relaxed">{{ r.description || 'No description provided.' }}</p>
                </div>
                
                <div class="mt-auto pt-5 border-t border-slate-100 flex gap-3">
                  <a [routerLink]="['/restrooms', r._id]" class="flex-1 flex items-center justify-center gap-2 rounded-lg bg-brand-main px-4 py-3 text-sm font-black text-white shadow-sm transition-all hover:bg-brand-600 hover:shadow-md">
                    View Restroom
                    <lucide-angular [img]="ArrowRightIcon" [size]="16"></lucide-angular>
                  </a>
                  <button (click)="unsave(r._id)" class="flex items-center justify-center px-4 bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 border-2 border-slate-100 hover:border-red-200 font-bold rounded-xl transition-all shadow-sm" title="Remove from saved">
                    <lucide-angular [img]="BookmarkIcon" [size]="18" class="fill-current"></lucide-angular>
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
export class SavedComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  BookmarkIcon = Bookmark;
  MapPinIcon = MapPin;
  StarIcon = Star;
  Trash2Icon = Trash2;
  CheckCircleIcon = CheckCircle;
  XCircleIcon = XCircle;
  ImageOffIcon = ImageOff;
  MapIcon = Map;
  ArrowRightIcon = ArrowRight;

  restrooms: Restroom[] = [];
  statusMsg = '';

  ngOnInit() {
    setTimeout(() => this.fetchData(), 0);

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        if (this.router.url === '/saved') {
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
    this.statusMsg = 'Loading saved restrooms...';
    this.cdr.markForCheck();
    this.api.getSavedRestrooms(id).subscribe({
      next: (data) => { 
        this.restrooms = Array.isArray(data) ? data : [];
        this.statusMsg = '';
        this.cdr.markForCheck();
      },
      error: (e) => { 
        this.statusMsg = `❌ ${e.error?.message || e.message || 'Failed to load saved restrooms'}`;
        this.cdr.markForCheck();
      }
    });
  }

  unsave(restroomId: string) {
    this.api.saveRestroom(restroomId).subscribe({
      next: () => {
        this.statusMsg = 'Restroom removed from saved';
        this.fetchData();
      },
      error: (e) => {
        this.statusMsg = `❌ ${e.error?.message || e.message}`;
        this.cdr.markForCheck();
      }
    });
  }
}
