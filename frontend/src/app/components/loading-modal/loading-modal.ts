import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-modal',
  standalone: true,
  imports: [CommonModule],
  styles: [`
    @keyframes bounce-pin {
      0%, 100% { transform: translateY(0) scaleY(1); }
      40% { transform: translateY(-28px) scaleY(1.05); }
      60% { transform: translateY(-20px) scaleY(0.98); }
    }
    @keyframes squish {
      0%, 100% { transform: scaleX(1) scaleY(1); opacity: 0.35; }
      40% { transform: scaleX(0.55) scaleY(0.6); opacity: 0.15; }
    }
    @keyframes dot-pulse {
      0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
      40% { transform: scale(1.15); opacity: 1; }
    }
    @keyframes modal-fade-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes modal-fade-out {
      from { opacity: 1; }
      to   { opacity: 0; }
    }
    .bouncing-pin { animation: bounce-pin 0.9s cubic-bezier(.36,.07,.19,.97) infinite; }
    .pin-shadow   { animation: squish 0.9s cubic-bezier(.36,.07,.19,.97) infinite; }
    .dot-1 { animation: dot-pulse 1.3s ease-in-out infinite 0s; }
    .dot-2 { animation: dot-pulse 1.3s ease-in-out infinite 0.22s; }
    .dot-3 { animation: dot-pulse 1.3s ease-in-out infinite 0.44s; }
    .modal-visible { animation: modal-fade-in 0.25s ease forwards; }
    .modal-hidden  { animation: modal-fade-out 0.35s ease forwards; pointer-events: none; }
  `],
  template: `
    <div
      class="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-brand-50/95 backdrop-blur-sm"
      [class.modal-visible]="visible"
      [class.modal-hidden]="!visible"
    >
      <div class="flex flex-col items-center gap-6 select-none">

        <div class="relative flex flex-col items-center">
          <div class="bouncing-pin">
            <svg width="56" height="72" viewBox="0 0 56 72" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="28" cy="62" rx="14" ry="6" fill="#2563EB" opacity="0.18" class="pin-shadow"/>
              <path d="M28 4C16.954 4 8 12.954 8 24C8 38 28 60 28 60C28 60 48 38 48 24C48 12.954 39.046 4 28 4Z" fill="#2563EB"/>
              <circle cx="28" cy="24" r="9" fill="white" opacity="0.92"/>
              <circle cx="28" cy="24" r="5" fill="#1D4ED8"/>
            </svg>
          </div>
        </div>

        <div class="text-center space-y-1.5">
          <p class="text-brand-dark text-lg font-black tracking-tight">Finding nearby restrooms</p>
          <p class="text-slate-500 text-sm font-semibold">Loading map and location data</p>
        </div>

        <div class="flex items-center gap-2.5">
          <span class="dot-1 inline-block w-2.5 h-2.5 rounded-full bg-brand-main"></span>
          <span class="dot-2 inline-block w-2.5 h-2.5 rounded-full bg-brand-main"></span>
          <span class="dot-3 inline-block w-2.5 h-2.5 rounded-full bg-brand-main"></span>
        </div>

      </div>
    </div>
  `
})
export class LoadingModalComponent {
  @Input() visible = true;
}
