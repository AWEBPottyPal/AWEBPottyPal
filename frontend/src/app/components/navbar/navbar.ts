import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatetimeService } from '../../services/datetime.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink],
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
          <div class="flex items-center gap-2 text-sm font-medium text-white/85 whitespace-nowrap">
            <span>{{ getNavbarDate() }}</span>
            <span class="mx-2">{{ getNavbarTime() }}</span>
          </div>
        </div>
      </div>
    </nav>
  `
})
export class NavbarComponent {
  timeService = inject(DatetimeService);

  phTime = this.timeService.currentPHTime;

  getNavbarDate(): string {
    const value = this.phTime() || '';
    const parts = value.trim().split(/\s+/);
    return parts.length >= 1 ? parts[0] : '';
  }

  getNavbarTime(): string {
    const value = this.phTime() || '';
    const parts = value.trim().split(/\s+/);
    if (parts.length >= 3) {
      return `${parts[1]} ${parts[2]}`;
    }
    return parts.length >= 2 ? parts.slice(1).join(' ') : '';
  }
}
