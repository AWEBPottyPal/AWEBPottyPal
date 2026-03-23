import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { LucideAngularModule, Flag, MapPin, SearchX, RefreshCw, Calendar, Eye, Trash2, CheckCircle, XCircle } from 'lucide-angular';

interface FlaggedRestroom {
  _id: string;
  name: string;
  description: string;
  location: any;
  amenities: string[];
  createdBy: { _id: string; username: string; email: string };
  flags: Array<{ _id: string; username: string; email: string }>;
  flagCount: number;
  isFlagged: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-flagged-restrooms',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule],
  template: `
    <div class="min-h-screen bg-brand-50 pb-16 pt-8 animate-fade-in">
      <div class="app-page">
        <!-- Header Area -->
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div class="flex items-center gap-4">
            <div class="bg-red-500 text-white p-4 rounded-[1.5rem] shadow-premium transform hover:scale-105 transition-transform">
              <lucide-angular [img]="FlagIcon" [size]="36" [strokeWidth]="2.5"></lucide-angular>
            </div>
            <div>
              <h1 class="text-3xl md:text-4xl font-extrabold text-brand-dark tracking-tight leading-tight">Admin Control: Flagged</h1>
              <p class="text-base font-medium text-slate-500 mt-1">Review and manage restrooms reported by the community.</p>
            </div>
          </div>
          
          <!-- Controls -->
          <div class="flex flex-wrap items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
            <div class="flex items-center gap-2 px-3">
              <label class="text-xs font-black text-slate-400 uppercase tracking-widest">Sort</label>
              <select [(ngModel)]="sortBy" (change)="sortRestrooms()" class="text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-brand-main focus:border-brand-main outline-none cursor-pointer transition-colors">
                <option value="flags">Most Flagged</option>
                <option value="date">Most Recent</option>
              </select>
            </div>
            
            <div class="w-px h-8 bg-slate-200"></div>
            
            <div class="flex items-center gap-2 px-3">
              <label class="text-xs font-black text-slate-400 uppercase tracking-widest">Order</label>
              <select [(ngModel)]="sortOrder" (change)="sortRestrooms()" class="text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-brand-main focus:border-brand-main outline-none cursor-pointer transition-colors">
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
    
            <button (click)="refreshList()" class="ml-2 flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm shadow-sm">
              <lucide-angular [img]="RefreshCwIcon" [size]="16" [ngClass]="{'animate-spin': isLoading}"></lucide-angular> Refresh
            </button>
          </div>
        </div>
    
        <!-- Status States -->
        @if (isLoading) {
          <div class="bg-white p-12 rounded-[2.5rem] shadow-premium flex flex-col items-center justify-center border border-white min-h-[400px]">
            <div class="animate-spin rounded-full h-16 w-16 border-4 border-slate-100 border-t-red-500 mb-6"></div>
            <p class="font-bold text-lg text-slate-700 animate-pulse">Loading reports...</p>
          </div>
        }
        
        @if (errorMessage) {
          <div class="bg-red-50 border-2 border-red-200 p-6 rounded-2xl text-center flex flex-col items-center mb-8">
            <div class="bg-white p-3 rounded-full shadow-sm text-red-500 mb-4">
              <lucide-angular [img]="XCircleIcon" [size]="32"></lucide-angular>
            </div>
            <p class="text-red-800 font-bold text-lg">{{ errorMessage }}</p>
          </div>
        }
    
        @if (!isLoading && filteredRestrooms.length === 0 && !errorMessage) {
          <div class="py-20 text-center bg-white rounded-[2.5rem] border-2 border-slate-200 border-dashed shadow-sm flex flex-col items-center">
            <div class="bg-green-50 p-6 rounded-full mb-6">
              <lucide-angular [img]="CheckCircleIcon" [size]="64" class="text-green-500"></lucide-angular>
            </div>
            <p class="font-black text-2xl text-brand-dark mb-2">All Clear!</p>
            <p class="text-base font-medium text-slate-500 max-w-md mx-auto">No flagged restrooms currently need attention.</p>
          </div>
        }
    
        <!-- Data Grid / Cards -->
        @if (!isLoading && filteredRestrooms.length > 0) {
          <div class="grid grid-cols-1 gap-8">
            @for (restroom of filteredRestrooms; track restroom._id) {
              <div class="bg-white rounded-[2rem] border border-white shadow-soft hover:shadow-premium transition-all duration-300 overflow-hidden flex flex-col md:flex-row animate-fade-in-up">
                
                <!-- Left Header Strip -->
                <div class="bg-red-50 w-full md:w-56 p-6 flex flex-col justify-center items-center shrink-0 border-b md:border-b-0 md:border-r border-red-100 relative overflow-hidden group">
                  <div class="absolute -left-6 -bottom-6 text-red-100 opacity-50 transform !rotate-12 group-hover:scale-110 transition-transform duration-500">
                    <lucide-angular [img]="FlagIcon" [size]="150"></lucide-angular>
                  </div>
                  <div class="relative z-10 flex flex-col items-center">
                    <div class="bg-white text-red-500 p-3 rounded-full shadow-sm mb-3">
                       <lucide-angular [img]="FlagIcon" [size]="32" class="fill-red-500"></lucide-angular>
                    </div>
                    <div class="text-red-600 font-black text-5xl tracking-tighter">{{ restroom.flagCount }}</div>
                    <div class="text-red-800 text-sm font-black uppercase tracking-widest mt-1 text-center bg-white/50 px-3 py-1 rounded-full shadow-sm backdrop-blur">Flags</div>
                    
                    <div class="mt-6 pt-5 border-t border-red-200/50 w-full text-center flex flex-col items-center gap-1.5">
                      <div class="text-[10px] text-red-500 font-black uppercase tracking-widest flex items-center justify-center gap-1">
                        <lucide-angular [img]="CalendarIcon" [size]="12"></lucide-angular> Added On
                      </div>
                      <p class="text-sm font-bold text-red-900 bg-white/50 px-3 py-1 rounded-lg backdrop-blur">{{ restroom.createdAt | date:'MMM d, yyyy' }}</p>
                    </div>
                  </div>
                </div>
                
                <!-- Main Content -->
                <div class="p-8 flex-1 flex flex-col justify-between">
                  <div class="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                    <div>
                      <h3 class="text-2xl font-black text-brand-dark mb-2">{{ restroom.name }}</h3>
                      <div class="bg-slate-100 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 w-fit border border-slate-200">
                        <span class="text-slate-500 font-medium">Added by</span>
                        <span class="font-black text-slate-700">{{ restroom.createdBy.username || 'Unknown' }}</span>
                      </div>
                    </div>
                    
                    <div class="flex flex-wrap gap-2 shrink-0">
                      <a [routerLink]="['/restrooms', restroom._id]" class="flex flex-1 items-center justify-center gap-2 px-5 py-2.5 bg-brand-50 hover:bg-brand-main text-brand-700 hover:text-white font-black rounded-xl transition-all shadow-sm text-sm border border-brand-200 hover:border-brand-main">
                        <lucide-angular [img]="EyeIcon" [size]="16"></lucide-angular> Detail
                      </a>
                      @if (auth.isAdmin()) {
                        <button (click)="deleteRestroom(restroom._id, restroom.name)" class="flex flex-1 items-center justify-center gap-2 px-5 py-2.5 bg-white hover:bg-red-600 text-red-600 hover:text-white font-black rounded-xl transition-all shadow-sm text-sm border-2 border-red-100 hover:border-red-600">
                          <lucide-angular [img]="Trash2Icon" [size]="16"></lucide-angular> Delete
                        </button>
                      }
                    </div>
                  </div>
                  
                  <p class="text-slate-600 text-[15px] font-medium leading-relaxed mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {{ restroom.description || 'No description provided.' }}
                  </p>
                  
                  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-slate-100 pt-6">
                    <!-- Location & Amenities -->
                    <div class="space-y-5">
                      <div>
                        <h4 class="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <lucide-angular [img]="MapPinIcon" [size]="14"></lucide-angular> Location Details
                        </h4>
                        <div class="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col gap-2">
                          <div class="flex justify-between items-center text-sm">
                            <span class="font-bold text-slate-500">Latitude</span>
                            <span class="font-mono text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">{{ restroom.location?.latitude | number:'1.4-4' }}</span>
                          </div>
                          <div class="flex justify-between items-center text-sm">
                            <span class="font-bold text-slate-500">Longitude</span>
                            <span class="font-mono text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">{{ restroom.location?.longitude | number:'1.4-4' }}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 class="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">Amenities</h4>
                        <div class="flex flex-wrap gap-2">
                          @if (restroom.amenities.length) {
                            @for (amenity of restroom.amenities; track amenity) {
                              <span class="bg-white border-2 border-slate-100 text-slate-600 px-3 py-1 rounded-lg text-xs font-bold shadow-sm">{{ amenity }}</span>
                            }
                          } @else {
                            <span class="text-slate-400 italic text-sm font-medium bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">None listed</span>
                          }
                        </div>
                      </div>
                    </div>
                    
                    <!-- Flaggers Log -->
                    <div>
                      <h4 class="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <lucide-angular [img]="FlagIcon" [size]="14"></lucide-angular> Reported By Log
                      </h4>
                      <div class="bg-red-50 rounded-xl p-4 border border-red-100 h-[160px] flex flex-col">
                        <div class="overflow-y-auto pr-2 custom-scrollbar flex-1">
                          @if (restroom.flagCount > 0) {
                            <ul class="space-y-2">
                              @for (user of restroom.flags; track user._id) {
                                <li class="flex items-center gap-2.5 text-sm font-bold text-red-900 bg-white px-3 py-2 rounded-lg border border-red-100 shadow-sm">
                                  <div class="bg-red-100 text-red-500 p-1.5 rounded-md">
                                    <lucide-angular [img]="FlagIcon" [size]="12" class="fill-red-500"></lucide-angular>
                                  </div>
                                  {{ user.username || 'Unknown User' }}
                                </li>
                              }
                            </ul>
                          } @else {
                            <div class="h-full flex items-center justify-center">
                              <p class="text-sm italic text-red-400 font-medium">No user data available.</p>
                            </div>
                          }
                        </div>
                      </div>
                    </div>
                  </div>
      
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #fca5a5; border-radius: 10px; }
  `]
})
export class FlaggedRestroomsComponent implements OnInit, OnDestroy {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private cd = inject(ChangeDetectorRef);
  private router = inject(Router);

  auth = this.authService;

  FlagIcon = Flag;
  MapPinIcon = MapPin;
  SearchXIcon = SearchX;
  RefreshCwIcon = RefreshCw;
  CalendarIcon = Calendar;
  EyeIcon = Eye;
  Trash2Icon = Trash2;
  CheckCircleIcon = CheckCircle;
  XCircleIcon = XCircle;

  allRestrooms: FlaggedRestroom[] = [];
  flaggedRestrooms: FlaggedRestroom[] = [];
  isLoading = false;
  errorMessage = '';
  sortBy: string = 'flags';
  sortOrder: string = 'desc';

  ngOnInit(): void {
    this.loadFlaggedRestrooms();
  }

  get filteredRestrooms(): FlaggedRestroom[] {
    return this.flaggedRestrooms.filter((r) => r.isFlagged === true && r.flagCount >= 2);
  }

  loadFlaggedRestrooms(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.getAllRestrooms().subscribe({
      next: (restrooms: any[]) => {
        this.allRestrooms = restrooms.map((r) => ({
          ...r,
          flagCount: r.flags?.length || 0,
        }));

        this.applySorting();
        this.isLoading = false;
        this.cd.markForCheck();
      },
      error: (err) => {
        this.errorMessage = 'Failed to load flagged restrooms';
        this.isLoading = false;
        this.cd.markForCheck();
      },
    });
  }

  applySorting(): void {
    const flagged = [...this.allRestrooms].filter((r) => r.isFlagged === true);

    if (this.sortBy === 'flags') {
      flagged.sort((a, b) =>
        this.sortOrder === 'desc' ? b.flagCount - a.flagCount : a.flagCount - b.flagCount
      );
    } else if (this.sortBy === 'date') {
      flagged.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return this.sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      });
    }

    this.flaggedRestrooms = flagged;
  }

  sortRestrooms(): void {
    this.applySorting();
    this.cd.markForCheck();
  }

  refreshList(): void {
    this.loadFlaggedRestrooms();
  }

  deleteRestroom(restroomId: string, name: string): void {
    if (!this.authService.isAdmin()) {
      alert('Only admins can delete restrooms');
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to DELETE "${name}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    this.apiService.adminDeleteRestroom(restroomId).subscribe({
      next: (response) => {
        this.flaggedRestrooms = this.flaggedRestrooms.filter((r) => r._id !== restroomId);
        this.allRestrooms = this.allRestrooms.filter((r) => r._id !== restroomId);
        alert('Restroom deleted successfully!');
        this.cd.markForCheck();
      },
      error: (err) => {
        alert('Failed to delete restroom. Please try again.');
        this.cd.markForCheck();
      },
    });
  }

  ngOnDestroy(): void {}
}
