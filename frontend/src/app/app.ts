import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar';
import { LucideAngularModule, Plus } from 'lucide-angular';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink, NavbarComponent, LucideAngularModule],
  template: `
    <app-navbar />
    <div class="w-full">
      <router-outlet />
    </div>
    @if (showFloatingAddButton()) {
      <a
        routerLink="/add-restroom"
        class="fixed bottom-8 right-8 z-[1100] flex h-14 w-14 items-center justify-center rounded-full bg-brand-main text-white shadow-premium transition-all hover:-translate-y-1 hover:bg-brand-600 hover:shadow-2xl"
        aria-label="Add restroom"
        title="Add Restroom"
      >
        <lucide-angular [img]="PlusIcon" [size]="24" [strokeWidth]="3"></lucide-angular>
      </a>
    }
  `
})
export class App {
  private router = inject(Router);

  PlusIcon = Plus;

  showFloatingAddButton(): boolean {
    return this.router.url === '/' || this.router.url === '/home';
  }
}
