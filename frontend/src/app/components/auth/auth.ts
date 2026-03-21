import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-auth',
  imports: [FormsModule],
  template: `
    <h2>Login</h2>
    <input [(ngModel)]="loginEmail" placeholder="Email" type="email" /><br>
    <input [(ngModel)]="loginPassword" placeholder="Password" type="password" /><br>
    <button (click)="login()">Login</button>
    <p>{{ loginMsg }}</p>

    <hr>

    <h2>Signup</h2>
    <input [(ngModel)]="signupUsername" placeholder="Username" /><br>
    <input [(ngModel)]="signupEmail" placeholder="Email" type="email" /><br>
    <input [(ngModel)]="signupPassword" placeholder="Password" type="password" /><br>
    <button (click)="signup()">Signup</button>
    <p>{{ signupMsg }}</p>
  `
})
export class AuthComponent {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);

  loginEmail = ''; loginPassword = ''; loginMsg = '';
  signupUsername = ''; signupEmail = ''; signupPassword = ''; signupMsg = '';

  login() {
    this.api.login({ email: this.loginEmail, password: this.loginPassword }).subscribe({
      next: (res) => {
        console.log('[Auth] Login success:', res);
        this.auth.login(res);
        this.loginMsg = `✅ Logged in as ${res.username}`;
        this.router.navigate(['/']);
      },
      error: (err) => {
        console.error('[Auth] Login error:', err);
        this.loginMsg = `❌ ${err.error?.message || 'Login failed'}`;
      }
    });
  }

  signup() {
    this.api.signup({ username: this.signupUsername, email: this.signupEmail, password: this.signupPassword }).subscribe({
      next: (res) => {
        console.log('[Auth] Signup success:', res);
        this.auth.login(res);
        this.signupMsg = `✅ Account created for ${res.username}`;
        this.router.navigate(['/']);
      },
      error: (err) => {
        console.error('[Auth] Signup error:', err);
        this.signupMsg = `❌ ${err.error?.message || 'Signup failed'}`;
      }
    });
  }
}
