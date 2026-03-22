import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, PLATFORM_ID, AfterViewInit } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { LocationService } from '../../services/location.service';
import { Restroom } from '../../models/restroom.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import type * as L from 'leaflet';
import { LucideAngularModule, Flag, Star, Trash2, Edit3, Bookmark, CheckCircle, Navigation, MapPin, User, LocateFixed, Maximize, Minimize, CheckSquare, XCircle, Info, MessageSquare } from 'lucide-angular';

@Component({
  selector: 'app-restroom-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, LucideAngularModule],
  styles: [`
    .fullscreen-map {
      position: fixed !important;
      top: 0; left: 0; right: 0; bottom: 0;
      width: 100vw !important;
      height: 100vh !important;
      z-index: 9999;
      margin: 0 !important;
      border-radius: 0 !important;
    }
    .osm-custom-tiles {
      filter: saturate(0.8) brightness(1.02) contrast(1.05) hue-rotate(-10deg);
    }
  `],
  template: `
    <div class="bg-brand-50 w-full min-h-screen pb-16 pt-8 animate-fade-in">
      <div class="px-4 w-full max-w-7xl mx-auto">
      
        <!-- Loading State -->
        @if (!restroom) {
          <div class="flex flex-col items-center justify-center py-32 text-slate-400 bg-white rounded-[2rem] shadow-soft mt-8 cursor-wait">
            <div class="animate-spin rounded-full h-16 w-16 border-4 border-brand-100 border-t-brand-main mb-6"></div>
            <p class="font-bold text-lg animate-pulse text-brand-dark">Loading beautiful details...</p>
          </div>
        } @else {
          
          <!-- Header & Action Ribbon -->
          <div class="bg-white rounded-[2rem] p-6 sm:p-10 shadow-soft mb-8 border border-white relative overflow-hidden">
            <div class="absolute -right-10 -top-10 text-brand-50 opacity-50 z-0 pointer-events-none transform rotate-12">
              <lucide-angular [img]="MapPinIcon" [size]="200"></lucide-angular>
            </div>
            
            <div class="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
              <div>
                <div class="flex flex-wrap items-center gap-3 mb-3">
                  <h2 class="text-4xl md:text-5xl font-extrabold text-brand-dark tracking-tight leading-tight">{{ restroom.name }}</h2>
                  @if (restroom.isFlagged) {
                    <span class="bg-red-50 text-red-600 border border-red-200 font-bold px-3 py-1 rounded-xl text-sm flex items-center gap-1.5 shadow-sm">
                      <lucide-angular [img]="FlagIcon" [size]="14"></lucide-angular> Flagged
                    </span>
                  }
                </div>
                <div class="flex flex-wrap items-center gap-4 text-slate-600 font-bold bg-slate-50 inline-flex px-4 py-2 rounded-xl border border-slate-100">
                  <span class="flex items-center gap-1.5 text-amber-500 text-lg bg-white px-3 py-1 rounded-lg shadow-sm">
                    <lucide-angular [img]="StarIcon" [size]="18" class="fill-amber-500"></lucide-angular>
                    {{ restroom.averageRating ? (restroom.averageRating | number:'1.1-1') : 'New' }}
                  </span>
                  <span class="flex items-center gap-1.5">
                    <lucide-angular [img]="MessageSquareIcon" [size]="16" class="text-brand-main"></lucide-angular>
                    {{ reviews.length }} Review(s)
                  </span>
                </div>
              </div>
      
              <!-- Action Buttons -->
              <div class="flex flex-wrap items-center gap-3">
                @if (auth.isLoggedIn()) {
                  <button (click)="isSaved ? unsave() : save()" 
                    class="flex items-center justify-center gap-2 px-6 py-3 font-extrabold rounded-xl transition-all shadow-sm group"
                    [ngClass]="isSaved ? 'bg-brand-main text-white hover:bg-brand-600 shadow-premium' : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-brand-300 hover:text-brand-main'">
                    <lucide-angular [img]="BookmarkIcon" [size]="18" [class.fill-white]="isSaved" class="group-hover:scale-110 transition-transform"></lucide-angular>
                    {{ isSaved ? 'Saved' : 'Save' }}
                  </button>
                  
                  <button (click)="isFlagged ? unflag() : flag()"
                    class="flex items-center justify-center gap-2 px-6 py-3 font-extrabold rounded-xl transition-all shadow-sm group"
                    [ngClass]="isFlagged ? 'bg-red-50 text-red-600 border-2 border-red-200 hover:bg-red-100' : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-red-300 hover:text-red-500'">
                    <lucide-angular [img]="FlagIcon" [size]="18" [class.fill-red-600]="isFlagged" class="group-hover:scale-110 transition-transform"></lucide-angular>
                    {{ isFlagged ? 'Flagged' : 'Report' }}
                  </button>
      
                  @if (canDeleteRestroom()) {
                    <div class="h-8 w-px bg-slate-200 hidden md:block mx-1"></div>
                    <button (click)="editRestroom()" class="flex items-center justify-center gap-2 px-5 py-3 bg-amber-50 hover:bg-amber-100 text-amber-700 border-2 border-amber-200 font-extrabold rounded-xl shadow-sm transition-colors">
                      <lucide-angular [img]="Edit3Icon" [size]="18"></lucide-angular> Edit
                    </button>
                    <button (click)="deleteRestroom()" class="flex items-center justify-center gap-2 px-5 py-3 bg-red-50 hover:bg-red-100 text-red-700 border-2 border-red-200 font-extrabold rounded-xl shadow-sm transition-colors">
                      <lucide-angular [img]="Trash2Icon" [size]="18"></lucide-angular> Delete
                    </button>
                  }
                }
              </div>
            </div>
          </div>
          
          @if (actionMsg) {
            <div class="mb-8 p-4 rounded-xl font-bold flex items-center gap-3 shadow-sm animate-fade-in-up" 
                 [ngClass]="actionMsg.includes('❌') ? 'bg-red-50 text-red-700 border-2 border-red-200' : 'bg-green-50 text-green-700 border-2 border-green-200'">
              <lucide-angular [img]="actionMsg.includes('❌') ? XCircleIcon : CheckCircleIcon" [size]="20"></lucide-angular>
              {{ actionMsg }}
            </div>
          }
    
          <!-- Photo Gallery -->
          @if (restroom.images && restroom.images.length > 0) {
            <div class="mb-8 flex gap-5 overflow-x-auto pb-6 snap-x invisible-scrollbar">
              @for (img of restroom.images; track $index) {
                <div class="snap-center shrink-0 w-[85vw] sm:w-[500px] h-[300px] sm:h-[400px] group overflow-hidden rounded-[2rem] shadow-premium relative bg-slate-200">
                  <img [src]="img" alt="Restroom photo" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div class="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent pointer-events-none"></div>
                </div>
              }
            </div>
          }
    
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
            
            <!-- Left Column: Info & Directions -->
            <div class="lg:col-span-4 space-y-8">
              
              <!-- Description Card -->
              <div class="bg-white p-8 rounded-[2rem] shadow-soft border border-white hover:shadow-premium transition-shadow">
                <div class="flex items-center gap-2 mb-4">
                  <lucide-angular [img]="InfoIcon" [size]="20" class="text-brand-main"></lucide-angular>
                  <h4 class="text-sm font-black text-brand-dark uppercase tracking-widest">About</h4>
                </div>
                <p class="text-slate-600 leading-relaxed font-medium text-[15px]">{{ restroom.description || 'No description available for this location.' }}</p>
                
                <div class="mt-8">
                  <div class="flex items-center gap-2 mb-4">
                    <lucide-angular [img]="CheckSquareIcon" [size]="20" class="text-brand-main"></lucide-angular>
                    <h4 class="text-sm font-black text-brand-dark uppercase tracking-widest">Amenities</h4>
                  </div>
                  <div class="flex flex-wrap gap-2.5">
                    @if (restroom.amenities?.length) {
                      @for (a of restroom.amenities; track a) {
                        <span class="bg-brand-50 text-brand-800 px-4 py-2 rounded-xl text-sm font-bold shadow-sm">{{ a }}</span>
                      }
                    } @else {
                      <span class="text-slate-400 italic font-medium px-2">None listed</span>
                    }
                  </div>
                </div>
              </div>
              
              <!-- Directions Widget -->
              <div class="bg-white p-8 rounded-[2rem] shadow-soft border border-white relative overflow-hidden">
                <div class="absolute -right-8 -bottom-8 opacity-5 text-brand-main pointer-events-none">
                  <lucide-angular [img]="NavigationIcon" [size]="150"></lucide-angular>
                </div>
                
                <h4 class="text-2xl font-black text-brand-dark mb-6 relative z-10">Get Directions</h4>
                
                <div class="flex gap-3 mb-6 bg-slate-50 p-2 rounded-2xl border border-slate-100 relative z-10">
                  <label class="flex-1 text-center cursor-pointer">
                    <input type="radio" name="profile" value="driving-car" [(ngModel)]="transportProfile" class="peer hidden">
                    <div class="py-3 px-4 rounded-xl text-sm font-bold transition-all"
                      [ngClass]="transportProfile === 'driving-car' ? 'bg-white shadow-soft text-brand-main ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800'">
                      Drive
                    </div>
                  </label>
                  <label class="flex-1 text-center cursor-pointer">
                    <input type="radio" name="profile" value="foot-walking" [(ngModel)]="transportProfile" class="peer hidden">
                    <div class="py-3 px-4 rounded-xl text-sm font-bold transition-all"
                      [ngClass]="transportProfile === 'foot-walking' ? 'bg-white shadow-soft text-green-600 ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800'">
                      Walk
                    </div>
                  </label>
                </div>
                
                <button (click)="getDirections()" class="w-full flex justify-center items-center gap-2 py-4 bg-brand-main hover:bg-brand-600 text-white font-black rounded-xl shadow-premium hover:-translate-y-1 transition-all mb-4 relative z-10">
                  <lucide-angular [img]="NavigationIcon" [size]="18"></lucide-angular>
                  Calculate Route
                </button>
                
                @if (routeInfo) {
                  <div class="text-sm rounded-xl p-4 text-center font-bold shadow-sm relative z-10 animate-fade-in"
                     [ngClass]="routeInfo.includes('❌') ? 'bg-red-50 text-red-600 ring-1 ring-red-200' : 'bg-green-50 text-green-700 ring-1 ring-green-200'">
                    {{ routeInfo }}
                  </div>
                }
              </div>
              
            </div>
    
            <!-- Right Column: Interactive Map -->
            <div class="lg:col-span-8">
              <div id="detail-map-container" class="bg-white p-3 rounded-[2.5rem] shadow-premium border-4 border-white relative group overflow-hidden h-full min-h-[500px]">
                <!-- Map Toolbar -->
                <div class="absolute top-6 right-6 z-[400] flex gap-3">
                  <button (click)="recenterMap()" class="bg-white/95 backdrop-blur text-brand-dark hover:text-brand-main px-4 py-2.5 rounded-xl shadow-floating border border-slate-100 text-sm font-black transition-all flex items-center gap-2 hover:scale-105 pointer-events-auto">
                    <lucide-angular [img]="LocateFixedIcon" [size]="16"></lucide-angular> Recenter
                  </button>
                  @if (!isFullscreen) {
                    <button (click)="toggleFullscreen()" class="bg-slate-800/95 backdrop-blur text-white hover:bg-black px-4 py-2.5 rounded-xl shadow-floating border border-slate-700 text-sm font-black transition-all flex items-center gap-2 hover:scale-105 pointer-events-auto">
                      <lucide-angular [img]="MaximizeIcon" [size]="16"></lucide-angular> Expand
                    </button>
                  }
                </div>
                
                <div id="detail-map" class="h-full w-full rounded-[2rem] z-0 transition-all duration-300 bg-slate-100"></div>
                
                @if (isFullscreen) {
                  <div class="absolute bottom-8 left-1/2 -translate-x-1/2 z-[10000]">
                    <button (click)="toggleFullscreen()" class="flex items-center gap-2 px-8 py-3.5 text-base font-black bg-slate-900 text-white rounded-full shadow-2xl hover:bg-slate-800 transition-all border-2 border-slate-700/50 hover:scale-105 pointer-events-auto animate-fade-in-up">
                      <lucide-angular [img]="MinimizeIcon" [size]="20"></lucide-angular> Exit Full Screen
                    </button>
                  </div>
                }
              </div>
            </div>
    
          </div>
    
          <!-- Reviews Section -->
          <div class="bg-white rounded-[2.5rem] p-6 sm:p-12 shadow-soft border border-white">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-4 border-b border-slate-100 pb-8">
              <h3 class="text-3xl font-black text-brand-dark flex items-center gap-3">
                <lucide-angular [img]="MessageSquareIcon" [size]="28" class="text-brand-main"></lucide-angular>
                Community Reviews
              </h3>
              <span class="bg-brand-50 text-brand-main px-4 py-1.5 rounded-full text-base font-black shadow-sm">{{ reviews.length }} Review(s)</span>
            </div>
    
            @if (!auth.isLoggedIn()) {
              <div class="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] p-12 text-center text-slate-600 mb-10 flex flex-col items-center">
                <div class="bg-white p-4 rounded-full shadow-sm mb-4">
                  <lucide-angular [img]="UserIcon" [size]="32" class="text-slate-400"></lucide-angular>
                </div>
                <p class="text-lg font-bold max-w-md mx-auto mb-6">Sign in to share your experience, save restrooms, and alert the community.</p>
                <a routerLink="/auth" class="bg-brand-main text-white px-8 py-3.5 rounded-xl font-black shadow-premium hover:-translate-y-1 transition-all">Login / Signup</a>
              </div>
            }
    
            <!-- Add Review Form -->
            @if (auth.isLoggedIn() && !hasReviewed) {
              <div class="bg-brand-50 rounded-[2rem] border-2 border-brand-100 p-8 sm:p-10 mb-12 shadow-inner">
                <h4 class="text-2xl font-black text-brand-dark mb-6 flex items-center gap-2">Rate your visit</h4>
                
                <div class="grid grid-cols-1 md:grid-cols-12 gap-8">
                  <!-- Rating Select -->
                  <div class="md:col-span-4 lg:col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-brand-100 flex flex-col justify-center">
                    <label class="block text-sm font-black text-slate-500 uppercase tracking-widest mb-4">Select Rating</label>
                    <div class="flex items-center gap-4">
                      <input type="range" min="1" max="5" step="1" [(ngModel)]="rating" class="w-full accent-amber-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer">
                      <div class="bg-amber-50 text-amber-600 font-black text-2xl w-14 h-14 flex items-center justify-center rounded-xl shadow-sm border-2 border-amber-200 shrink-0">
                        {{ rating }}
                      </div>
                    </div>
                  </div>
                  
                  <!-- Comment Input -->
                  <div class="md:col-span-8 lg:col-span-9 bg-white p-6 rounded-2xl shadow-sm border border-brand-100">
                    <label class="block text-sm font-black text-slate-500 uppercase tracking-widest mb-4">Write a Review <span class="text-slate-400 font-medium normal-case">(Optional)</span></label>
                    <textarea [(ngModel)]="comment" rows="3" placeholder="Was it clean? Was there soap? Share your experience with the community." class="w-full rounded-xl border-slate-200 bg-slate-50 shadow-inner focus:border-brand-main focus:ring-2 focus:ring-brand-main focus:bg-white text-base p-4 transition-all resize-none"></textarea>
                  </div>
                </div>
                
                <div class="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-brand-200 border-dashed">
                  <p class="font-bold flex items-center gap-2" [ngClass]="reviewMsg.includes('❌') ? 'text-red-500' : 'text-green-600'">
                    @if(reviewMsg) { <lucide-angular [img]="reviewMsg.includes('❌') ? XCircleIcon : CheckCircleIcon" [size]="20"></lucide-angular> }
                    {{ reviewMsg }}
                  </p>
                  <button (click)="submitReview()" class="w-full sm:w-auto px-10 py-4 bg-brand-main hover:bg-brand-600 text-white font-black rounded-xl shadow-premium hover:-translate-y-1 transition-all text-lg flex items-center justify-center gap-2">
                    Post Review
                  </button>
                </div>
              </div>
            } @else if (auth.isLoggedIn() && hasReviewed) {
               <div class="bg-green-50 p-6 rounded-[2rem] border-2 border-green-200 text-green-800 font-bold flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 shadow-sm text-center">
                 <div class="bg-white p-2 rounded-full shadow-sm text-green-500 shrink-0">
                   <lucide-angular [img]="CheckCircleIcon" [size]="24"></lucide-angular>
                 </div>
                 <span class="text-lg">You have already reviewed this restroom. Your review is displayed below.</span>
               </div>
            }
    
            <!-- Review List -->
            <div class="space-y-6">
              @for (r of reviews; track $index) {
                <div class="bg-slate-50 p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm transition-all hover:shadow-soft hover:bg-white overflow-hidden relative">
                  <!-- Decorative Quote Mark -->
                  <div class="absolute -top-4 -right-4 text-[100px] leading-none text-slate-100 font-serif font-black opacity-50 pointer-events-none">"</div>
                  
                  <div class="flex justify-between items-start mb-6 relative z-10">
                    <div class="flex items-center gap-4">
                      <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-400 to-brand-main flex items-center justify-center text-white font-black text-2xl shadow-sm border-2 border-white">
                        {{ (r.user?.username || 'U')[0].toUpperCase() }}
                      </div>
                      <div>
                        <div class="flex items-center gap-3">
                          <strong class="text-brand-dark font-black text-lg">{{ r.user?.username || 'Unknown User' }}</strong>
                          @if (auth.getUserId() && (r.user?._id === auth.getUserId() || r.user === auth.getUserId())) {
                            <span class="bg-brand-100 text-brand-700 text-xs font-black px-2.5 py-1 rounded-lg uppercase tracking-wider relative top-px">Your Review</span>
                          }
                        </div>
                        <div class="flex items-center gap-1 mt-1">
                          @for (star of [1,2,3,4,5]; track star) {
                            <lucide-angular [img]="StarIcon" [size]="14" [class]="star <= r.rating ? 'text-amber-500 fill-amber-500' : 'text-slate-300'"></lucide-angular>
                          }
                        </div>
                      </div>
                    </div>
                  </div>
    
                  @if (editingReviewId === r._id) {
                    <div class="mt-6 p-6 bg-white border-2 border-brand-100 rounded-2xl shadow-sm relative z-10 animate-fade-in">
                      <div class="flex items-center justify-between mb-4">
                        <label class="text-sm font-black text-slate-600 uppercase tracking-widest">Edit Rating</label>
                        <div class="flex items-center gap-3">
                          <input type="range" min="1" max="5" step="1" [(ngModel)]="editRating" class="w-32 accent-amber-500">
                          <span class="bg-amber-50 text-amber-600 font-black text-lg w-10 h-10 flex items-center justify-center rounded-lg border-2 border-amber-200">
                            {{ editRating }}
                          </span>
                        </div>
                      </div>
                      <textarea [(ngModel)]="editComment" rows="3" class="w-full rounded-xl border-slate-200 bg-slate-50 p-4 text-base shadow-inner mb-4 resize-none focus:ring-2 focus:ring-brand-main focus:bg-white transition-colors"></textarea>
                      
                      <div class="flex justify-end gap-3">
                        <button (click)="cancelEditReview()" class="bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 font-bold py-2.5 px-6 rounded-xl transition-all">Cancel</button>
                        <button (click)="saveEditReview(r._id)" class="bg-brand-main hover:bg-brand-600 text-white font-bold py-2.5 px-6 rounded-xl shadow-premium hover:-translate-y-0.5 transition-all">Save Update</button>
                      </div>
                    </div>
                  } @else {
                    <p class="text-slate-700 leading-relaxed text-base md:text-lg relative z-10 pl-1">{{ r.comment || 'No written comment provided.' }}</p>
                  }
    
                  <!-- Edit/Delete controls -->
                  @if (auth.getUserId() && (r.user?._id === auth.getUserId() || r.user === auth.getUserId() || auth.isAdmin())) {
                    <div class="flex gap-3 mt-6 pt-5 border-t border-slate-200/60 relative z-10">
                      @if (auth.getUserId() && (r.user?._id === auth.getUserId() || r.user === auth.getUserId()) && editingReviewId !== r._id) {
                        <button (click)="startEditReview(r)" class="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-amber-600 hover:bg-amber-50 px-3 py-1.5 rounded-lg transition-colors">
                          <lucide-angular [img]="Edit3Icon" [size]="14"></lucide-angular> Edit
                        </button>
                      }
                      <button (click)="deleteReview(r._id)" class="flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
                        <lucide-angular [img]="Trash2Icon" [size]="14"></lucide-angular> Delete
                      </button>
                    </div>
                  }
                </div>
              }
              
              @if (reviews.length === 0) {
                <div class="py-16 bg-slate-50 border-2 border-slate-200 border-dashed rounded-[2rem] text-center flex flex-col items-center">
                  <div class="bg-white p-4 rounded-full mb-4 shadow-sm">
                    <lucide-angular [img]="MessageSquareIcon" [size]="32" class="text-slate-300"></lucide-angular>
                  </div>
                  <p class="text-slate-500 font-bold text-lg">No community reviews yet.</p>
                  <p class="text-slate-400 mt-1">Be the first to share your thoughts!</p>
                </div>
              }
            </div>
    
          </div>
        }
      </div>
    </div>
  `
})
export class RestroomDetailComponent implements OnInit, OnDestroy, AfterViewInit {
  private api = inject(ApiService);
  auth = inject(AuthService);
  private locationService = inject(LocationService);
  private cd = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private destroy$ = new Subject<void>();

  FlagIcon = Flag;
  StarIcon = Star;
  Trash2Icon = Trash2;
  Edit3Icon = Edit3;
  BookmarkIcon = Bookmark;
  CheckCircleIcon = CheckCircle;
  NavigationIcon = Navigation;
  MapPinIcon = MapPin;
  UserIcon = User;
  LocateFixedIcon = LocateFixed;
  MaximizeIcon = Maximize;
  MinimizeIcon = Minimize;
  CheckSquareIcon = CheckSquare;
  XCircleIcon = XCircle;
  InfoIcon = Info;
  MessageSquareIcon = MessageSquare;

  private leaflet: any;
  private map!: L.Map;
  private restroomMarker?: L.Marker;
  private userMarker?: L.Marker;
  private routeLayer?: L.GeoJSON;

  restroom: Restroom | null = null;
  reviews: any[] = [];
  actionMsg = '';
  reviewMsg = '';
  rating = 5;
  comment = '';
  isSaved = false;
  isFlagged = false;
  
  hasReviewed = false;
  editingReviewId: string | null = null;
  editRating = 5;
  editComment = '';
  
  userPos: {lat: number; lng: number} | null = null;
  locationEnabled = false;
  transportProfile: 'driving-car' | 'foot-walking' = 'driving-car';
  routeInfo = '';
  isFullscreen = false;

  async ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.leaflet = await import('leaflet');
      setTimeout(() => {
        if (this.restroom && document.getElementById('detail-map') && !this.map) {
          this.initMap();
        }
      }, 100);
    }
  }

  canDeleteRestroom(): boolean {
    if (!this.auth.isLoggedIn() || !this.restroom) return false;
    const userId = this.auth.getUserId();
    let createdById: string | undefined;
    if (typeof this.restroom.createdBy === 'string') {
      createdById = this.restroom.createdBy;
    } else if (this.restroom.createdBy && typeof this.restroom.createdBy === 'object') {
      createdById = (this.restroom.createdBy as any)._id;
    }
    const isOwner = createdById === userId;
    const isAdmin = this.auth.isAdmin();
    return isOwner || isAdmin;
  }

  ngOnInit() {
    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        const id = params.get('id');
        if (id) {
          this.fetchData(id);
        }
      });

    this.locationService.locationEnabled$.pipe(takeUntil(this.destroy$)).subscribe(enabled => {
      this.locationEnabled = enabled;
      this.updateUserMarker();
    });

    this.locationService.userPos$.pipe(takeUntil(this.destroy$)).subscribe(pos => {
      this.userPos = pos;
      this.updateUserMarker();
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleFullscreen() {
    this.isFullscreen = !this.isFullscreen;
    const mapElement = document.getElementById('detail-map-container');
    if (mapElement) {
      if (this.isFullscreen) {
        mapElement.classList.add('fullscreen-map');
      } else {
        mapElement.classList.remove('fullscreen-map');
      }
      setTimeout(() => {
        if (this.map) this.map.invalidateSize();
      }, 300);
    }
  }

  recenterMap() {
    if (!this.map || !this.leaflet || !this.restroom?.location) return;
    const lat = this.restroom.location.latitude;
    const lng = this.restroom.location.longitude;

    if (this.locationEnabled && this.userPos) {
      const bounds = this.leaflet.latLngBounds([
        [this.userPos.lat, this.userPos.lng],
        [lat, lng]
      ]);
      this.map.fitBounds(bounds, { padding: [50, 50], animate: true });
    } else {
      this.map.setView([lat, lng], 16, { animate: true });
    }
  }

  private initMap(): void {
    if (!this.leaflet || !this.restroom || !this.restroom.location || this.map) return;
    const L = this.leaflet;
    
    const lat = this.restroom.location.latitude;
    const lng = this.restroom.location.longitude;

    this.map = L.map('detail-map', { zoomControl: false });
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);
    
    if (this.locationEnabled && this.userPos) {
      const bounds = L.latLngBounds([
        [this.userPos.lat, this.userPos.lng],
        [lat, lng]
      ]);
      this.map.fitBounds(bounds, { padding: [50, 50] });
    } else {
      this.map.setView([lat, lng], 16);
    }
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
      className: 'osm-custom-tiles'
    }).addTo(this.map);

    const customPinIcon = L.divIcon({
      className: 'custom-restroom-pin',
      html: `<div style="background-color: #2563EB; width: 36px; height: 36px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; position: relative;"><div style="width: 10px; height: 10px; background-color: white; border-radius: 50%;"></div></div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -20]
    });

    this.restroomMarker = L.marker([lat, lng], { icon: customPinIcon })
      .addTo(this.map)
      .bindPopup(`<div style="font-family: inherit; font-weight: 800; font-size: 1.2em; color: #0f172a; padding: 4px;">${this.restroom.name}</div>`);
      
    this.updateUserMarker();
  }

  private updateUserMarker(): void {
    if (!this.map || !this.leaflet) return;
    const L = this.leaflet;
    const center = this.userPos || { lat: this.locationService.HAU_COORDS[0], lng: this.locationService.HAU_COORDS[1] };
    const popupText = this.userPos && this.locationEnabled ? 'You are here' : 'Default Location';

    const userIcon = L.divIcon({
      className: 'user-location-marker',
      html: `<div style="background-color: #10b981; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 12px rgba(16, 185, 129, 0.6); animation: pulse 2s infinite;"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    if (this.userMarker) {
      this.userMarker.setLatLng(center).bindPopup(popupText);
    } else {
      this.userMarker = L.marker(center, { icon: userIcon }).addTo(this.map).bindPopup(popupText);
    }
  }

  getDirections() {
    if (!this.map || !this.leaflet || !this.restroom?.location) return;
    const L = this.leaflet;
    
    const center = this.userPos || { lat: this.locationService.HAU_COORDS[0], lng: this.locationService.HAU_COORDS[1] };
    const start = { latitude: center.lat, longitude: center.lng };
    const end = { latitude: this.restroom.location.latitude, longitude: this.restroom.location.longitude };

    this.routeInfo = `Calculating ${this.transportProfile === 'foot-walking' ? 'walking' : 'driving'} directions...`;
    
    this.api.getDirections(start, end, this.transportProfile).subscribe({
      next: (res: any) => {
        if (this.routeLayer) {
          this.map.removeLayer(this.routeLayer);
        }

        this.routeLayer = L.geoJSON(res, {
          style: {
            color: this.transportProfile === 'foot-walking' ? '#10b981' : '#2563EB',
            weight: 6,
            opacity: 0.8
          }
        }).addTo(this.map);

        const bounds = this.routeLayer?.getBounds();
        if (bounds) {
          this.map.fitBounds(bounds, { padding: [50, 50] });
        }

        const props = res.features?.[0]?.properties;
        if (props && props.summary) {
          const distKm = (props.summary.distance / 1000).toFixed(2);
          const timeMins = Math.round(props.summary.duration / 60);
          this.routeInfo = `Route found: ${distKm} km, ~${timeMins} min`;
        } else {
          this.routeInfo = 'Route found';
        }
        this.cd.markForCheck();
      },
      error: (err: any) => {
        console.error('Directions error:', err);
        this.routeInfo = '❌ Failed to get directions.';
        this.cd.markForCheck();
      }
    });
  }

  private fetchData(id: string) {
    this.api.getRestroom(id).subscribe({
      next: (r) => { 
        this.restroom = r;
        this.cd.markForCheck();
        if (this.leaflet && !this.map) {
          setTimeout(() => {
            if (document.getElementById('detail-map')) {
              this.initMap();
            }
          }, 50);
        }
      },
      error: (e) => console.error('[Detail] Error:', e)
    });
    this.api.getReviews(id).subscribe({
      next: (r) => { 
        this.reviews = r;
        
        const currentUserId = this.auth.getUserId();
        if (currentUserId) {
          this.hasReviewed = this.reviews.some((rev: any) => rev.user && (rev.user._id === currentUserId || rev.user === currentUserId));
          
          this.reviews.sort((a: any, b: any) => {
            const aIsCurrent = a.user && (a.user._id === currentUserId || a.user === currentUserId);
            const bIsCurrent = b.user && (b.user._id === currentUserId || b.user === currentUserId);
            if (aIsCurrent && !bIsCurrent) return -1;
            if (!aIsCurrent && bIsCurrent) return 1;
            return 0;
          });
        }
        
        this.cd.markForCheck();
      },
      error: (e) => console.error('[Detail] Reviews error:', e)
    });

    const userId = this.auth.getUserId();
    if (userId) {
      this.api.getSavedRestrooms(userId).subscribe({
        next: (saved) => {
          this.isSaved = Array.isArray(saved) && saved.some((s: any) => s._id === id);
          this.cd.markForCheck();
        }
      });
      this.api.getFlaggedRestrooms(userId).subscribe({
        next: (flagged) => {
          this.isFlagged = Array.isArray(flagged) && flagged.some((f: any) => f._id === id);
          this.cd.markForCheck();
        }
      });
    }
  }

  save() {
    this.api.saveRestroom(this.restroom!._id).subscribe({
      next: (r) => {
        this.actionMsg = `Reserved successfully`;
        this.isSaved = true;
        this.cd.markForCheck();
      },
      error: (e) => { this.actionMsg = `❌ ${e.error?.message}`; this.cd.markForCheck(); }
    });
  }

  unsave() {
    this.api.saveRestroom(this.restroom!._id).subscribe({
      next: (r) => {
        this.actionMsg = `Removed from saved`;
        this.isSaved = false;
        this.cd.markForCheck();
      },
      error: (e) => { this.actionMsg = `❌ ${e.error?.message}`; this.cd.markForCheck(); }
    });
  }

  flag() {
    this.api.flagRestroom(this.restroom!._id).subscribe({
      next: (r) => {
        this.actionMsg = `Restroom flagged`;
        this.isFlagged = r.flagged === true;
        this.restroom!.isFlagged = true;
        this.cd.markForCheck();
      },
      error: (e) => {
        this.actionMsg = `❌ ${e.error?.message || e.message}`; 
        this.cd.markForCheck();
      }
    });
  }

  unflag() {
    this.api.flagRestroom(this.restroom!._id).subscribe({
      next: (r) => {
        this.actionMsg = `Flag removed`;
        this.isFlagged = r.flagged === true;
        if (r.flagged === false) {
          this.restroom!.isFlagged = false;
        }
        this.cd.markForCheck();
      },
      error: (e) => {
        this.actionMsg = `❌ ${e.error?.message || e.message}`; 
        this.cd.markForCheck();
      }
    });
  }

  submitReview() {
    this.api.addReview(this.restroom!._id, this.rating, this.comment).subscribe({
      next: (r) => {
        this.reviewMsg = 'Successfully posted review';
        this.hasReviewed = true;
        this.reviews.unshift({ ...r, user: { _id: this.auth.getUserId(), username: this.auth.currentUser()?.username } });
        this.cd.markForCheck();
      },
      error: (e) => { this.reviewMsg = `❌ ${e.error?.message}`; this.cd.markForCheck(); }
    });
  }

  deleteReview(reviewId: string) {
    if (!confirm('Are you sure you want to delete this review?')) return;
    this.api.deleteReview(reviewId).subscribe({
      next: () => {
        this.reviews = this.reviews.filter(r => r._id !== reviewId);
        const currentUserId = this.auth.getUserId();
        this.hasReviewed = this.reviews.some((rev: any) => rev.user && (rev.user._id === currentUserId || rev.user === currentUserId));
        this.reviewMsg = 'Review deleted gracefully';
        this.cd.markForCheck();
      },
      error: (e) => {
        this.reviewMsg = `❌ ${e.error?.message || e.message}`;
        this.cd.markForCheck();
      }
    });
  }

  startEditReview(rev: any) {
    this.editingReviewId = rev._id;
    this.editRating = rev.rating;
    this.editComment = rev.comment;
  }

  cancelEditReview() {
    this.editingReviewId = null;
  }

  saveEditReview(reviewId: string) {
    this.api.editReview(reviewId, this.editRating, this.editComment).subscribe({
      next: (r: any) => {
        const idx = this.reviews.findIndex(rev => rev._id === reviewId);
        if (idx !== -1) {
          this.reviews[idx].rating = r.rating;
          this.reviews[idx].comment = r.comment;
        }
        this.editingReviewId = null;
        this.reviewMsg = 'Review updated perfectly';
        this.cd.markForCheck();
      },
      error: (e: any) => {
        this.reviewMsg = `❌ ${e.error?.message || e.message}`;
        this.cd.markForCheck();
      }
    });
  }

  editRestroom() {
    if (this.restroom) {
      this.router.navigate(['/edit-restroom', this.restroom._id]);
    }
  }

  deleteRestroom() {
    if (!this.restroom) return;
    if (!confirm(`Are you absolutely sure you want to delete "${this.restroom.name}"? This cannot be reversed.`)) return;

    const deleteCall = this.auth.isAdmin() 
      ? this.api.adminDeleteRestroom(this.restroom._id)
      : this.api.deleteRestroom(this.restroom._id);

    deleteCall.subscribe({
      next: (response) => {
        this.actionMsg = 'Restroom permanently deleted';
        setTimeout(() => this.router.navigate(['/flagged-restrooms']), 2000);
        this.cd.markForCheck();
      },
      error: (e) => {
        this.actionMsg = `❌ ${e.error?.message || 'Failed to delete restroom'}`;
        this.cd.markForCheck();
      }
    });
  }
}
