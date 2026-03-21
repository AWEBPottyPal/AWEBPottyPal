import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { RouterLink, Router, NavigationEnd } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';

@Component({
  selector: 'app-profile',
  imports: [RouterLink],
  template: `
    <h2>My Profile</h2>
    @if (!auth.isLoggedIn()) {
      <p>Please <a routerLink="/auth">login</a> to view your profile.</p>
    } @else if (user) {
      <p><strong>Username:</strong> {{ user.username }}</p>
      <p><strong>Email:</strong> {{ user.email }}</p>
      <p><strong>Role:</strong> {{ user.role }}</p>
      <p><strong>Member since:</strong> {{ dateStr(user.createdAt) }}</p>
      <br>
      <a routerLink="/saved">Saved Restrooms ({{ user.savedRestrooms?.length || 0 }})</a><br>
      <a routerLink="/flagged">Flagged Restrooms ({{ user.flaggedRestrooms?.length || 0 }})</a><br>
      <a routerLink="/reviewed">Reviewed Restrooms ({{ user.reviewedRestrooms?.length || 0 }})</a><br>
      <a routerLink="/added">My Added Restrooms ({{ user.addedRestrooms?.length || 0 }})</a>
    } @else {
      <p>Loading profile...</p>
    }
  `
})
export class ProfileComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  auth = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  user: any = null;

  dateStr(d?: string): string {
    return d ? d.slice(0, 10) : '';
  }

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
        if (this.router.url === '/profile') {
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
    if (!id) return;
    this.api.getProfile(id).subscribe({
      next: (u) => { 
        console.log('[Profile] User:', u); 
        this.user = u;
        this.cdr.markForCheck();
      },
      error: (e) => console.error('[Profile] Error:', e)
    });
  }
}
