import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { RouterLink, Router, NavigationEnd } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Restroom } from '../../models/restroom.model';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';

@Component({
  selector: 'app-saved',
  imports: [RouterLink],
  template: `
    <h2>💾 Saved Restrooms</h2>
    <p>{{ statusMsg }}</p>
    @for (r of restrooms; track r._id) {
      <div style="border:1px solid #ccc; margin:6px; padding:6px;">
        <strong>{{ r.name }}</strong><br>
        <small>{{ r.description }}</small><br>
        <a [routerLink]="['/restrooms', r._id]">View →</a>
        <button (click)="unsave(r._id)">💾 Unsave</button>
      </div>
    }
    @if (restrooms.length === 0 && !statusMsg) { <p>No saved restrooms.</p> }
  `
})
export class SavedComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  restrooms: Restroom[] = [];
  statusMsg = '';

  ngOnInit() {
    // Defer initial fetch to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => this.fetchData(), 0);

    // Refetch data whenever navigation completes to this page
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
    console.log('[Saved] User ID:', id);
    if (!id) { 
      this.statusMsg = '⚠️ Not logged in.'; 
      console.warn('[Saved] No user ID found');
      this.cdr.markForCheck();
      return; 
    }
    this.statusMsg = 'Loading...';
    this.cdr.markForCheck();
    this.api.getSavedRestrooms(id).subscribe({
      next: (data) => { 
        console.log('[Saved] Data received:', data);
        this.restrooms = Array.isArray(data) ? data : [];
        this.statusMsg = '';
        this.cdr.markForCheck();
        console.log('[Saved] Restrooms set:', this.restrooms);
      },
      error: (e) => { 
        console.error('[Saved] Error:', e);
        this.statusMsg = `❌ ${e.error?.message || e.message || 'Failed to load saved restrooms'}`;
        this.cdr.markForCheck();
      }
    });
  }

  unsave(restroomId: string) {
    if (!confirm('Unsave this restroom?')) return;
    this.api.saveRestroom(restroomId).subscribe({
      next: () => {
        this.statusMsg = '✅ Restroom unsaved';
        this.fetchData();
      },
      error: (e) => {
        console.error('[Saved] Unsave error:', e);
        this.statusMsg = `❌ ${e.error?.message || e.message}`;
        this.cdr.markForCheck();
      }
    });
  }
}
