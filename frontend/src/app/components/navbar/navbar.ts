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
    <nav class="bg-brand-main text-white shadow-sm sticky top-0 z-50 border-b border-brand-600 transition-all duration-300">
      <div class="app-page relative">
        <div class="flex justify-between h-16 items-center gap-6">
          <!-- Logo -->
          <a routerLink="/" class="flex-shrink-0 flex items-center gap-2.5 text-xl font-black text-white transition-colors group">
            <div class="text-brand-main p-1.5 rounded-lg transition-colors shadow-sm flex items-center justify-center">
              <img src="/images/pottypal_logo.png" alt="PottyPal Logo" class="h-8 w-auto object-contain">
            </div>
            <span class="inline-block">PottyPal</span>
          </a>
          
          <!-- Hamburger Button (Mobile) -->
          <button (click)="toggleMobileMenu()" class="md:hidden p-2 text-white/85 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
            <lucide-angular [img]="MenuIcon" [size]="24"></lucide-angular>
          </button>
          
          <div class="hidden md:flex flex-1 items-center justify-between min-w-0">
            <div class="flex items-center gap-1.5 lg:gap-3">
              <a routerLink="/" class="px-4 py-2 rounded-xl text-sm font-bold text-white/80 hover:text-white hover:bg-white/10 transition-all" routerLinkActive="!text-brand-main !bg-white shadow-sm" [routerLinkActiveOptions]="{exact: true}">Home</a>
              
              @if (auth.isAdmin()) {
                <a routerLink="/flagged-restrooms" class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white/80 hover:text-white hover:bg-red-500/20 transition-all" routerLinkActive="!text-red-600 !bg-white shadow-sm">
                  <lucide-angular [img]="FlagIcon" [size]="16"></lucide-angular> Flagged
                </a>
              }
              
              @if (auth.isLoggedIn()) {
                <a routerLink="/add-restroom" class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white hover:bg-white/10 transition-all" routerLinkActive="!bg-white !text-brand-main shadow-sm">
                  <lucide-angular [img]="PlusIcon" [size]="16" [strokeWidth]="3"></lucide-angular> Add Restroom
                </a>
              }
            </div>
            
            <div class="flex items-center justify-end gap-3 lg:gap-4 min-w-0 pl-6">
              <div class="hidden lg:flex items-center gap-2 text-sm font-medium text-white/75 whitespace-nowrap">
                <lucide-angular [img]="ClockIcon" [size]="14" class="text-white/65"></lucide-angular>
                <span>Local PH Time: {{ phTime() }}</span>
              </div>

              @if (auth.isLoggedIn()) {
                <div class="hidden lg:block h-6 w-px bg-white/20"></div>

                <a routerLink="/profile" class="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white/80 hover:text-white hover:bg-white/10 transition-all whitespace-nowrap" routerLinkActive="!text-brand-main !bg-white shadow-sm">
                  <lucide-angular [img]="UserIcon" [size]="16"></lucide-angular> Profile
                </a>
                
                <button (click)="logout()" class="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold bg-white text-brand-main border border-white hover:bg-brand-50 shadow-sm transition-all transform hover:-translate-y-0.5 whitespace-nowrap" title="Logout">
                  <lucide-angular [img]="LogOutIcon" [size]="16"></lucide-angular>
                  <span class="inline-block">Logout</span>
                </button>
              } @else {
                <a routerLink="/auth" class="flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-bold bg-white text-brand-main hover:bg-brand-50 shadow-sm transition-all transform hover:-translate-y-0.5 whitespace-nowrap">
                  <lucide-angular [img]="LogInIcon" [size]="16"></lucide-angular> Login
                </a>
              }
            </div>
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
        <div class="absolute inset-y-0 right-0 w-64 bg-brand-main text-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-out border-l border-brand-600">
          <div class="p-4 flex justify-end border-b border-white/10">
            <button (click)="toggleMobileMenu()" class="p-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-colors">
              <lucide-angular [img]="XIcon" [size]="20"></lucide-angular>
            </button>
          </div>
          
          <div class="p-4 flex flex-col gap-2 overflow-y-auto">
            <a routerLink="/" (click)="toggleMobileMenu()" class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-white/85 hover:bg-white/10 hover:text-white" routerLinkActive="bg-white text-brand-main" [routerLinkActiveOptions]="{exact: true}">
              <lucide-angular [img]="MapPinIcon" [size]="18"></lucide-angular> Home
            </a>
            
            @if (auth.isAdmin()) {
              <a routerLink="/flagged-restrooms" (click)="toggleMobileMenu()" class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-white/85 hover:bg-red-500/20 hover:text-white" routerLinkActive="bg-white text-red-600">
                <lucide-angular [img]="FlagIcon" [size]="18"></lucide-angular> Flagged
              </a>
            }
            
            @if (auth.isLoggedIn()) {
              <a routerLink="/add-restroom" (click)="toggleMobileMenu()" class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-white/85 hover:bg-white/10 hover:text-white" routerLinkActive="bg-white text-brand-main">
                <lucide-angular [img]="PlusIcon" [size]="18"></lucide-angular> Add Restroom
              </a>
              <a routerLink="/profile" (click)="toggleMobileMenu()" class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-white/85 hover:bg-white/10 hover:text-white" routerLinkActive="bg-white text-brand-main">
                <lucide-angular [img]="UserIcon" [size]="18"></lucide-angular> Profile
              </a>
              
              <div class="my-3 mx-4 border-t border-white/10"></div>
              
              <button (click)="logout(); toggleMobileMenu()" class="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-brand-main bg-white hover:bg-brand-50 border border-white transition-colors w-full text-left">
                <lucide-angular [img]="LogOutIcon" [size]="18"></lucide-angular>
                Logout ({{ auth.currentUser()?.username }})
              </button>
            } @else {
              <a routerLink="/auth" (click)="toggleMobileMenu()" class="flex items-center justify-center gap-2 px-4 py-3 mt-2 rounded-xl text-sm font-bold bg-white text-brand-main shadow-sm">
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
