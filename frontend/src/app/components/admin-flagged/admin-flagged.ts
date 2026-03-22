import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { LucideAngularModule, ShieldAlert, RefreshCw, Flag, MapPin, User, Calendar, CheckCircle, Trash2, ShieldCheck, SearchX } from 'lucide-angular';

@Component({
  selector: 'app-admin-flagged',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="min-h-screen bg-brand-50 pb-16 pt-8 animate-fade-in">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <!-- Header -->
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div class="flex items-center gap-4">
            <div class="bg-amber-600 text-white p-4 rounded-[1.5rem] shadow-premium transform hover:scale-105 transition-transform">
              <lucide-angular [img]="ShieldAlertIcon" [size]="36" [strokeWidth]="2.5"></lucide-angular>
            </div>
            <div>
              <h2 class="text-3xl md:text-4xl font-extrabold text-brand-dark tracking-tight leading-tight">Moderation Queue</h2>
              <p class="text-base font-medium text-slate-500 mt-1">Review and manage heavily flagged restrooms.</p>
            </div>
          </div>
        </div>

        <!-- Controls -->
        <div class="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="flex flex-wrap items-center gap-4 text-sm font-bold text-slate-600">
            <div class="flex items-center gap-2">
              <label class="uppercase tracking-widest text-xs">Sort By:</label>
              <select [(ngModel)]="sortBy" (change)="sortRestrooms()" class="bg-slate-50 border border-slate-200 text-brand-dark rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-main focus:border-brand-main outline-none transition-all">
                <option value="flags">Most Flagged</option>
                <option value="date">Most Recent</option>
              </select>
            </div>

            <div class="flex items-center gap-2">
              <label class="uppercase tracking-widest text-xs">Order:</label>
              <select [(ngModel)]="sortOrder" (change)="sortRestrooms()" class="bg-slate-50 border border-slate-200 text-brand-dark rounded-xl px-4 py-2 focus:ring-2 focus:ring-brand-main focus:border-brand-main outline-none transition-all">
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>

          <button (click)="refreshList()" class="flex items-center justify-center gap-2 bg-brand-main text-white px-6 py-2.5 rounded-xl font-bold hover:bg-brand-600 transition-colors shadow-sm w-full sm:w-auto">
            <lucide-angular [img]="RefreshCwIcon" [size]="18" [ngClass]="{'animate-spin': isLoading}"></lucide-angular> Refresh List
          </button>
        </div>

        <!-- States -->
        @if (isLoading) {
          <div class="bg-white p-12 rounded-[2.5rem] shadow-premium flex flex-col items-center justify-center border border-white min-h-[400px]">
            <div class="animate-spin rounded-full h-16 w-16 border-4 border-amber-100 border-t-amber-600 mb-6"></div>
            <p class="font-bold text-lg text-slate-700 animate-pulse">Scanning moderation queue...</p>
          </div>
        }

        @if (errorMessage) {
          <div class="bg-red-50 border-2 border-red-200 p-6 rounded-2xl text-center flex flex-col items-center">
            <div class="bg-white p-3 rounded-full shadow-sm text-red-500 mb-4">
              <lucide-angular [img]="ShieldAlertIcon" [size]="32"></lucide-angular>
            </div>
            <p class="text-red-800 font-bold text-lg">{{ errorMessage }}</p>
          </div>
        }

        @if (!isLoading && flaggedRestrooms.length === 0 && !errorMessage) {
          <div class="py-20 text-center bg-white rounded-[2.5rem] border-2 border-slate-200 border-dashed shadow-sm flex flex-col items-center">
            <div class="bg-green-50 p-6 rounded-full mb-6">
              <lucide-angular [img]="ShieldCheckIcon" [size]="64" class="text-green-500"></lucide-angular>
            </div>
            <p class="font-black text-2xl text-brand-dark mb-2">Queue is Empty</p>
            <p class="text-base font-medium text-slate-500 max-w-md mx-auto">There are no flagged restrooms requiring moderation at this time.</p>
          </div>
        }

        <!-- Flagged Restrooms List -->
        @if (!isLoading && flaggedRestrooms.length > 0) {
          <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            @for (restroom of flaggedRestrooms; track restroom._id) {
              <div class="bg-white rounded-[2rem] border-t-8 border-t-red-500 shadow-soft hover:shadow-premium transition-all duration-300 overflow-hidden flex flex-col relative animate-fade-in-up">
                
                <!-- Header -->
                <div class="p-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-start gap-4">
                  <h3 class="text-xl font-black text-brand-dark truncate" [title]="restroom.name">{{ restroom.name }}</h3>
                  <span class="bg-red-100 text-red-700 text-sm font-black px-3 py-1.5 rounded-lg flex items-center gap-1.5 shrink-0 border border-red-200">
                    <lucide-angular [img]="FlagIcon" [size]="14" class="fill-red-700"></lucide-angular> {{ restroom.flagCount }}
                  </span>
                </div>

                <!-- Details -->
                <div class="p-6 flex-1 flex flex-col">
                  <p class="text-slate-600 font-medium mb-6 line-clamp-3 leading-relaxed">{{ restroom.description || 'No description provided.' }}</p>

                  <div class="space-y-4 mb-6 pt-4 border-t border-slate-100">
                    <div class="flex items-center gap-3 text-sm text-slate-600">
                      <div class="bg-slate-100 p-2 rounded-md text-slate-500"><lucide-angular [img]="UserIcon" [size]="16"></lucide-angular></div>
                      <div>
                        <span class="block text-xs font-bold text-slate-400 uppercase tracking-wider">Created By</span>
                        <span class="font-bold text-slate-700">{{ restroom.createdBy?.username || 'Unknown' }}</span>
                      </div>
                    </div>
                    
                    <div class="flex items-center gap-3 text-sm text-slate-600">
                      <div class="bg-slate-100 p-2 rounded-md text-slate-500"><lucide-angular [img]="MapPinIcon" [size]="16"></lucide-angular></div>
                      <div>
                        <span class="block text-xs font-bold text-slate-400 uppercase tracking-wider">Coordinates</span>
                        <span class="font-mono text-slate-700">{{ restroom.location?.coordinates[1] | number: '1.4-4' }}, {{ restroom.location?.coordinates[0] | number: '1.4-4' }}</span>
                      </div>
                    </div>

                    @if (restroom.createdAt) {
                      <div class="flex items-center gap-3 text-sm text-slate-600">
                        <div class="bg-slate-100 p-2 rounded-md text-slate-500"><lucide-angular [img]="CalendarIcon" [size]="16"></lucide-angular></div>
                        <div>
                          <span class="block text-xs font-bold text-slate-400 uppercase tracking-wider">Added On</span>
                          <span class="font-bold text-slate-700">{{ restroom.createdAt | date: 'mediumDate' }}</span>
                        </div>
                      </div>
                    }
                  </div>

                  <!-- Flaggers List -->
                  @if (restroom.flagCount > 0) {
                    <div class="bg-red-50 rounded-xl p-4 border border-red-100 mb-6">
                      <p class="text-xs font-black text-red-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <lucide-angular [img]="FlagIcon" [size]="14"></lucide-angular> Flagged By
                      </p>
                      <ul class="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                        @for (user of restroom.flaggedUsers; track user._id) {
                          <li class="text-sm font-medium text-red-900 bg-white px-3 py-2 rounded-lg shadow-sm border border-red-100 flex items-center gap-2">
                            <lucide-angular [img]="UserIcon" [size]="14" class="text-red-400"></lucide-angular>
                            {{ user.username }} <span class="text-red-400 text-xs ml-auto">{{ user.email }}</span>
                          </li>
                        }
                      </ul>
                    </div>
                  }

                  <!-- Amenities -->
                  @if (restroom.amenities && restroom.amenities.length > 0) {
                    <div class="mb-6">
                      <p class="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Amenities</p>
                      <div class="flex flex-wrap gap-2">
                        @for (amenity of restroom.amenities; track amenity) {
                          <span class="bg-brand-50 text-brand-700 font-bold px-3 py-1 rounded-lg text-xs border border-brand-100">
                            {{ amenity }}
                          </span>
                        }
                      </div>
                    </div>
                  }

                  <!-- Actions -->
                  <div class="mt-auto grid grid-cols-2 gap-3 pt-6 border-t border-slate-100">
                    <button class="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors text-sm shadow-sm" (click)="unfllagRestroom(restroom._id)">
                      <lucide-angular [img]="CheckCircleIcon" [size]="16"></lucide-angular> Clear Flags
                    </button>
                    <button class="flex items-center justify-center gap-2 bg-red-50 hover:bg-red-500 text-red-600 hover:text-white font-bold py-3 rounded-xl border border-red-200 hover:border-red-500 transition-colors text-sm shadow-sm" (click)="deleteRestroom(restroom._id, restroom.name)">
                      <lucide-angular [img]="Trash2Icon" [size]="16"></lucide-angular> Delete
                    </button>
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
export class AdminFlaggedComponent implements OnInit, OnDestroy {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);
  private router = inject(Router);

  ShieldAlertIcon = ShieldAlert;
  RefreshCwIcon = RefreshCw;
  FlagIcon = Flag;
  MapPinIcon = MapPin;
  UserIcon = User;
  CalendarIcon = Calendar;
  CheckCircleIcon = CheckCircle;
  Trash2Icon = Trash2;
  ShieldCheckIcon = ShieldCheck;
  SearchXIcon = SearchX;

  flaggedRestrooms: any[] = [];
  isLoading = true;
  errorMessage = '';
  sortBy: string = 'flags';
  sortOrder: string = 'desc';

  ngOnInit(): void {
    this.checkAdminAccess();
    this.loadFlaggedRestrooms();
  }

  checkAdminAccess(): void {
    const userId = this.authService.getUserId();
    if (!userId) {
      this.router.navigate(['/']);
    }
  }

  loadFlaggedRestrooms(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.getAdminFlaggedRestrooms(this.sortBy, this.sortOrder).subscribe({
      next: (restrooms) => {
        this.flaggedRestrooms = restrooms;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage =
          err.status === 403
            ? 'Access denied: Admin only'
            : 'Failed to load flagged restrooms';
        this.isLoading = false;
      },
    });
  }

  sortRestrooms(): void {
    this.loadFlaggedRestrooms();
  }

  unfllagRestroom(restroomId: string): void {
    const confirmed = confirm(
      'Clear all flags from this restroom? It will no longer appear in the moderation queue.'
    );
    if (!confirmed) return;

    this.apiService.adminUnflagRestroom(restroomId).subscribe({
      next: (response) => {
        this.flaggedRestrooms = this.flaggedRestrooms.filter((r) => r._id !== restroomId);
        alert('Restroom flags cleared successfully!');
      },
      error: (err) => {
        alert('Failed to clear flags. Please try again.');
      },
    });
  }

  deleteRestroom(restroomId: string, name: string): void {
    const confirmed = confirm(
      `Are you sure you want to DELETE "${name}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    this.apiService.adminDeleteRestroom(restroomId).subscribe({
      next: (response) => {
        this.flaggedRestrooms = this.flaggedRestrooms.filter((r) => r._id !== restroomId);
        alert('Restroom deleted successfully!');
      },
      error: (err) => {
        alert('Failed to delete restroom. Please try again.');
      },
    });
  }

  refreshList(): void {
    this.loadFlaggedRestrooms();
  }

  ngOnDestroy(): void {}
}
