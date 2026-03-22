import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { DatetimeService } from '../../services/datetime.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink],
  template: `
    <nav style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <strong>🚻 PottyPal</strong> |
        <a routerLink="/">Home</a> |
        @if (auth.isAdmin()) {
          <a routerLink="/flagged-restrooms">🚩 Community Flagged</a> |
        }
        @if (auth.isLoggedIn()) {
          <a routerLink="/add-restroom">Add Restroom</a> |
          <a routerLink="/profile">Profile</a> |
          <a routerLink="/saved">Saved</a> |
          <a routerLink="/flagged">Flagged</a> |
          <a routerLink="/reviewed">Reviewed</a> |
          <a routerLink="/added">My Restrooms</a> |
          <button (click)="logout()">Logout ({{ auth.currentUser()?.username }})</button>
        } @else {
          <a routerLink="/auth">Login / Signup</a>
        }
      </div>
      <div style="font-size: 0.9em; color: #555; text-align: right; background: #f0f0f0; padding: 4px 10px; border-radius: 4px; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);">
        <strong>{{ timeService.currentPHTime() }}</strong>
      </div>
    </nav>
    <hr>
  `
})
export class NavbarComponent {
  auth = inject(AuthService);
  private router = inject(Router);
  timeService = inject(DatetimeService);

  logout() {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
