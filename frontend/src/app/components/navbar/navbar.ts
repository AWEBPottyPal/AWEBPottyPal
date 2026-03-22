import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { DatetimeService } from '../../services/datetime.service';
import { LucideAngularModule, MapPin, Flag, Plus, User, LogOut, LogIn, Clock, Bookmark, Menu, X } from 'lucide-angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, LucideAngularModule, CommonModule],
  template: `
    <nav class="bg-white/95 backdrop-blur-md text-slate-800 shadow-sm sticky top-0 z-50 border-b border-slate-200/50 transition-all duration-300">
      
      <!-- Integrated Top Date/Time Bar in same palette -->
      <div class="bg-brand-50 text-brand-800 text-[11px] text-center py-1.5 font-bold tracking-wide flex items-center justify-center gap-2 border-b border-brand-100/50">
        <lucide-angular [img]="ClockIcon" [size]="12"></lucide-angular> Local PH Time: <span class="text-brand-dark">{{ phTime() }}</span>
      </div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div class="flex justify-between h-16 items-center">
          <!-- Logo -->
          <a routerLink="/" class="flex-shrink-0 flex items-center gap-2.5 text-xl font-black text-slate-800 hover:text-brand-main transition-colors group">
            <div class="bg-brand-main text-white p-1.5 rounded-lg group-hover:bg-brand-600 transition-colors shadow-sm">
              <lucide-angular [img]="MapPinIcon" [size]="20" [strokeWidth]="2.5"></lucide-angular>
            </div>
            <span class="inline-block">PottyPal</span>
          </a>
          
          <!-- Hamburger Button (Mobile) -->
          <button (click)="toggleMobileMenu()" class="md:hidden p-2 text-slate-500 hover:text-brand-main hover:bg-brand-50 rounded-xl transition-colors">
            <lucide-angular [img]="MenuIcon" [size]="24"></lucide-angular>
          </button>
          
          <!-- Desktop Nav -->
          <div class="hidden md:flex items-center gap-1.5 lg:gap-3">
            <a routerLink="/" class="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:text-brand-main hover:bg-brand-50 transition-all" routerLinkActive="!text-brand-main !bg-brand-50 shadow-sm" [routerLinkActiveOptions]="{exact: true}">Home</a>
            
            @if (auth.isAdmin()) {
              <a routerLink="/flagged-restrooms" class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:text-red-600 hover:bg-red-50 transition-all" routerLinkActive="!text-red-600 !bg-red-50 shadow-sm">
                <lucide-angular [img]="FlagIcon" [size]="16"></lucide-angular> Flagged
              </a>
            }
            
            @if (auth.isLoggedIn()) {
              <a routerLink="/add-restroom" class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-brand-main hover:bg-brand-50 transition-all" routerLinkActive="!bg-brand-100 shadow-sm">
                <lucide-angular [img]="PlusIcon" [size]="16" [strokeWidth]="3"></lucide-angular> Add Restroom
              </a>
              <a routerLink="/profile" class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:text-brand-main hover:bg-brand-50 transition-all" routerLinkActive="!text-brand-main !bg-brand-50 shadow-sm">
                <lucide-angular [img]="UserIcon" [size]="16"></lucide-angular> Profile
              </a>
              
              <div class="h-6 w-px bg-slate-200 mx-1"></div>
              
              <button (click)="logout()" class="ml-1 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-white text-slate-600 border border-slate-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600 shadow-sm transition-all transform hover:-translate-y-0.5" title="Logout">
                <lucide-angular [img]="LogOutIcon" [size]="16"></lucide-angular>
                <span class="inline-block">Logout <span class="text-xs font-medium text-slate-400 opacity-80 hidden lg:inline-block">({{ auth.currentUser()?.username }})</span></span>
              </button>
            } @else {
              <a routerLink="/auth" class="ml-2 flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-bold bg-brand-main text-white hover:bg-brand-600 shadow-sm transition-all transform hover:-translate-y-0.5">
                <lucide-angular [img]="LogInIcon" [size]="16"></lucide-angular> Login
              </a>
            }
          </div>
        </div>
      </div>
    </nav>

    <!-- Mobile Sidebar Drawer (Right Side) -->
    @if (isMobileMenuOpen) {
      <div class="fixed inset-0 z-[99999] md:hidden">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" (click)="toggleMobileMenu()"></div>
        
        <!-- Drawer -->
        <div class="absolute inset-y-0 right-0 w-64 bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-out border-l border-slate-100">
          <div class="p-4 flex justify-end border-b border-slate-50">
            <button (click)="toggleMobileMenu()" class="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-colors">
              <lucide-angular [img]="XIcon" [size]="20"></lucide-angular>
            </button>
          </div>
          
          <div class="p-4 flex flex-col gap-2 overflow-y-auto">
            <a routerLink="/" (click)="toggleMobileMenu()" class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-700 hover:bg-brand-50 hover:text-brand-main" routerLinkActive="bg-brand-50 text-brand-main" [routerLinkActiveOptions]="{exact: true}">
              <lucide-angular [img]="MapPinIcon" [size]="18"></lucide-angular> Home
            </a>
            
            @if (auth.isAdmin()) {
              <a routerLink="/flagged-restrooms" (click)="toggleMobileMenu()" class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-700 hover:bg-red-50 hover:text-red-600" routerLinkActive="bg-red-50 text-red-600">
                <lucide-angular [img]="FlagIcon" [size]="18"></lucide-angular> Flagged
              </a>
            }
            
            @if (auth.isLoggedIn()) {
              <a routerLink="/add-restroom" (click)="toggleMobileMenu()" class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-700 hover:bg-brand-50 hover:text-brand-main" routerLinkActive="bg-brand-50 text-brand-main">
                <lucide-angular [img]="PlusIcon" [size]="18"></lucide-angular> Add Restroom
              </a>
              <a routerLink="/profile" (click)="toggleMobileMenu()" class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-700 hover:bg-brand-50 hover:text-brand-main" routerLinkActive="bg-brand-50 text-brand-main">
                <lucide-angular [img]="UserIcon" [size]="18"></lucide-angular> Profile
              </a>
              
              <div class="my-3 mx-4 border-t border-slate-100"></div>
              
              <button (click)="logout(); toggleMobileMenu()" class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 bg-red-50/50 border border-red-100 transition-colors w-full text-left">
                <lucide-angular [img]="LogOutIcon" [size]="18"></lucide-angular>
                Logout ({{ auth.currentUser()?.username }})
              </button>
            } @else {
              <a routerLink="/auth" (click)="toggleMobileMenu()" class="flex items-center justify-center gap-2 px-4 py-3 mt-2 rounded-xl text-sm font-bold bg-brand-main text-white shadow-sm">
                <lucide-angular [img]="LogInIcon" [size]="18"></lucide-angular> Login
              </a>
            }
          </div>
        </div>
      </div>
    }
  `
})
export class NavbarComponent {
  auth = inject(AuthService);
  private router = inject(Router);
  timeService = inject(DatetimeService);
  
  phTime = this.timeService.currentPHTime;

  MapPinIcon = MapPin;
  FlagIcon = Flag;
  PlusIcon = Plus;
  UserIcon = User;
  LogOutIcon = LogOut;
  LogInIcon = LogIn;
  ClockIcon = Clock;
  BookmarkIcon = Bookmark;
  MenuIcon = Menu;
  XIcon = X;

  isMobileMenuOpen = false;

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
