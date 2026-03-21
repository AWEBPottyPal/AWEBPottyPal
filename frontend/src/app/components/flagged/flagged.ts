import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { RouterLink, Router, NavigationEnd } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Restroom } from '../../models/restroom.model';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';

@Component({
  selector: 'app-flagged',
  imports: [RouterLink],
  template: `
    <h2>🚩 Flagged Restrooms</h2>
    <p>{{ statusMsg }}</p>
    @for (r of restrooms; track r._id) {
      <div style="border:1px solid #ccc; margin:6px; padding:6px;">
        <strong>{{ r.name }}</strong><br>
        <small>{{ r.description }}</small><br>
        <a [routerLink]="['/restrooms', r._id]">View →</a>
        <button (click)="unflag(r._id)">🚩 Unflag</button>
      </div>
    }
    @if (restrooms.length === 0 && !statusMsg) { <p>No flagged restrooms.</p> }
  `
})
export class FlaggedComponent implements OnInit, OnDestroy {
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
        if (this.router.url === '/flagged') {
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
    console.log('[Flagged] User ID:', id);
    if (!id) { 
      this.statusMsg = '⚠️ Not logged in.';
      console.warn('[Flagged] No user ID found');
      this.cdr.markForCheck();
      return; 
    }
    this.statusMsg = 'Loading...';
    this.cdr.markForCheck();
    this.api.getFlaggedRestrooms(id).subscribe({
      next: (data) => { 
        console.log('[Flagged] Data received:', data);
        this.restrooms = Array.isArray(data) ? data : [];
        this.statusMsg = '';
        this.cdr.markForCheck();
        console.log('[Flagged] Restrooms set:', this.restrooms);
      },
      error: (e) => { 
        console.error('[Flagged] Error:', e);
        this.statusMsg = `❌ ${e.error?.message || e.message || 'Failed to load flagged restrooms'}`;
        this.cdr.markForCheck();
      }
    });
  }

  unflag(restroomId: string) {
    if (!confirm('Unflag this restroom?')) return;
    this.api.flagRestroom(restroomId).subscribe({
      next: () => {
        this.statusMsg = '✅ Restroom unflagged';
        this.fetchData();
      },
      error: (e) => {
        console.error('[Flagged] Unflag error:', e);
        this.statusMsg = `❌ ${e.error?.message || e.message}`;
        this.cdr.markForCheck();
      }
    });
  }
}
