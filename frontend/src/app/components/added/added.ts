import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, NavigationEnd } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Restroom } from '../../models/restroom.model';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { LucideAngularModule, PlusCircle, MapPin, Star, Trash2, Eye, CheckCircle, XCircle, ImageOff, Flag } from 'lucide-angular';

@Component({
  selector: 'app-added',
  standalone: true,
  imports: [RouterLink, CommonModule, LucideAngularModule],
  template: `
    <div class="min-h-screen bg-brand-50 pb-16 pt-8 animate-fade-in">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div class="flex items-center gap-4">
            <div class="bg-amber-500 text-white p-4 rounded-[1.5rem] shadow-premium transform hover:scale-105 transition-transform">
              <lucide-angular [img]="PlusCircleIcon" [size]="36" [strokeWidth]="2.5"></lucide-angular>
            </div>
            <div>
              <h2 class="text-3xl md:text-4xl font-extrabold text-brand-dark tracking-tight leading-tight">My Additions</h2>
              <p class="text-base font-medium text-slate-500 mt-1">Locations you've contributed to the community map.</p>
            </div>
          </div>
          
          <div class="flex items-center gap-3">
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
            <a routerLink="/add-restroom" class="flex items-center gap-2 px-6 py-2.5 bg-brand-main text-white font-black rounded-xl shadow-sm hover:bg-brand-600 transition-colors">
              <lucide-angular [img]="PlusCircleIcon" [size]="18"></lucide-angular> Add New
            </a>
          </div>
        </div>
    
        @if (restrooms.length === 0 && !statusMsg) {
          <div class="py-20 text-center bg-white rounded-[2.5rem] border-2 border-slate-200 border-dashed shadow-sm flex flex-col items-center">
            <div class="bg-amber-50 p-6 rounded-full mb-6">
              <lucide-angular [img]="PlusCircleIcon" [size]="64" class="text-amber-400"></lucide-angular>
            </div>
            <p class="font-black text-2xl text-brand-dark mb-2">No contributions yet</p>
            <p class="text-base font-medium text-slate-500 max-w-md mx-auto mb-8">Help the community grow by adding missing restrooms you discover.</p>
            <a routerLink="/add-restroom" class="inline-flex items-center gap-2 px-8 py-4 bg-brand-main text-white font-black rounded-xl shadow-premium hover:bg-brand-600 hover:-translate-y-1 transition-all">
              <lucide-angular [img]="PlusCircleIcon" [size]="20"></lucide-angular> Add a Restroom
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
                
                <div class="absolute top-4 left-4 flex flex-col gap-2">
                   @if (r.isFlagged) {
                    <span class="bg-red-500/95 backdrop-blur text-white text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-xl shadow-floating flex items-center gap-1.5">
                      <lucide-angular [img]="FlagIcon" [size]="14"></lucide-angular> Flagged
                    </span>
                   }
                </div>
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
                  <a [routerLink]="['/restrooms', r._id]" class="flex-1 flex items-center justify-center gap-2 bg-brand-50 hover:bg-brand-main text-brand-700 hover:text-white font-black py-3 rounded-xl transition-all shadow-sm">
                    <lucide-angular [img]="EyeIcon" [size]="16"></lucide-angular> View
                  </a>
                  <button (click)="deleteRestroom(r._id!)" class="flex items-center justify-center px-4 bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 border-2 border-slate-100 hover:border-red-200 font-bold rounded-xl transition-all shadow-sm" title="Delete Contribution">
                    <lucide-angular [img]="Trash2Icon" [size]="18"></lucide-angular>
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
export class AddedComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  PlusCircleIcon = PlusCircle;
  MapPinIcon = MapPin;
  StarIcon = Star;
  Trash2Icon = Trash2;
  EyeIcon = Eye;
  CheckCircleIcon = CheckCircle;
  XCircleIcon = XCircle;
  ImageOffIcon = ImageOff;
  FlagIcon = Flag;

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
        if (this.router.url === '/added') {
          this.fetchData();
        }
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private fetchData() {
    this.statusMsg = 'Loading...';
    this.cdr.markForCheck();
    const userId = this.auth.getUserId();
    if (!userId) {
      this.statusMsg = '⚠️ Not logged in.';
      this.cdr.markForCheck();
      return;
    }

    this.api.getRestroomsByUser(userId).subscribe({
      next: (data: Restroom[]) => {
        this.restrooms = Array.isArray(data) ? data : [];
        this.statusMsg = '';
        this.cdr.markForCheck();
      },
      error: (e) => {
        this.statusMsg = `❌ ${e.error?.message || e.message}`;
        this.cdr.markForCheck();
      }
    });
  }

  deleteRestroom(id: string) {
    if (!confirm('Permanently delete this restroom from the map?')) return;
    this.api.deleteRestroom(id).subscribe({
      next: () => {
        this.statusMsg = '✓ Restroom deleted';
        this.fetchData();
      },
      error: (e) => {
        this.statusMsg = `❌ ${e.error?.message || e.message}`;
        this.cdr.markForCheck();
      }
    });
  }
}
