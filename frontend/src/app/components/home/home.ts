import { Component, OnDestroy, OnInit, PLATFORM_ID, AfterViewInit, ElementRef, HostListener, NgZone, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { LocationService } from '../../services/location.service';
import { Restroom } from '../../models/restroom.model';
import { Subject } from 'rxjs';
import { catchError, of, timeout } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import type * as L from 'leaflet';

type RestroomReview = {
  _id: string;
  rating: number;
  comment?: string;
  displayName?: string;
  createdAt?: string;
  user?: { _id?: string; username?: string } | string;
};

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    :host {
      display: block;
    }

    .map-shell {
      width: 100%;
      height: calc(100dvh - 4rem);
      min-height: calc(100dvh - 4rem);
      position: relative;
      overflow: hidden;
    }

    .map-canvas {
      width: 100%;
      height: 100%;
    }

    :host ::ng-deep .leaflet-container,
    :host ::ng-deep .leaflet-grab,
    :host ::ng-deep .leaflet-dragging .leaflet-grab,
    :host ::ng-deep .leaflet-container.leaflet-touch-drag,
    :host ::ng-deep .leaflet-container.leaflet-touch-zoom {
      cursor: default !important;
    }

    .controls-overlay {
      position: absolute;
      top: 12px;
      left: 12px;
      right: 12px;
      z-index: 710;
      pointer-events: none;
    }

    .controls-inner {
      max-width: 760px;
      margin: 0 auto;
      pointer-events: auto;
    }

    .search-wrap {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 10px;
      height: 40px;
      border-radius: 999px;
      border: 1px solid rgba(148, 163, 184, 0.55);
      background: rgba(255, 255, 255, 0.95);
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.12);
    }

    .search-icon {
      color: #64748b;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
    }

    .search-input {
      border: 0;
      outline: 0;
      background: transparent;
      color: #334155;
      width: 100%;
      font-size: 15px;
      font-weight: 500;
    }

    .search-input::placeholder {
      color: #94a3b8;
    }

    .search-clear {
      border: 0;
      background: transparent;
      color: #334155;
      width: auto;
      height: auto;
      border-radius: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 18px;
      font-weight: 700;
      line-height: 1;
      padding: 0 2px;
    }

    .filter-row {
      margin-top: 10px;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: flex-start;
      gap: 8px;
    }

    .filter-tab-group {
      position: relative;
      display: inline-flex;
    }

    .filter-tab {
      border: 1px solid rgba(148, 163, 184, 0.7);
      background: rgba(255, 255, 255, 0.95);
      color: #475569;
      border-radius: 10px;
      height: 34px;
      padding: 0 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08);
    }

    .filter-tab.is-active {
      border-color: #60a5fa;
      color: #1d4ed8;
      background: #eff6ff;
    }

    .menu-popover {
      position: absolute;
      top: calc(100% + 8px);
      left: 50%;
      z-index: 720;
      transform: translate(-50%, -6px) scale(0.98);
      width: min(320px, 90vw);
      background: rgba(255, 255, 255, 0.98);
      border: 1px solid rgba(148, 163, 184, 0.6);
      border-radius: 12px;
      padding: 10px;
      box-shadow: 0 10px 20px rgba(15, 23, 42, 0.16);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.18s ease, transform 0.18s ease;
      transform-origin: top center;
    }

    .menu-popover.is-open {
      opacity: 1;
      pointer-events: auto;
      transform: translate(-50%, 0) scale(1);
    }

    .menu-title {
      margin: 0 0 8px;
      color: #334155;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }


    .menu-check {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #334155;
      font-size: 14px;
      line-height: 1.35;
      padding: 6px 4px;
      cursor: pointer;
    }

    .menu-check input[type="checkbox"] {
      accent-color: #2563eb;
    }

    .radius-wrap {
      padding: 4px;
    }

    .radius-value {
      color: #334155;
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .radius-slider {
      width: 100%;
      accent-color: #2563eb;
    }

    .menu-actions {
      margin-top: 8px;
      display: flex;
      justify-content: flex-end;
    }

    .menu-action-btn {
      border: 1px solid rgba(148, 163, 184, 0.7);
      background: #f8fafc;
      color: #334155;
      border-radius: 8px;
      height: 28px;
      padding: 0 10px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }

    .menu-action-btn:hover {
      background: #eef2f7;
    }

    .menu-actions--full {
      margin-top: 10px;
      justify-content: stretch;
    }

    .menu-action-btn--full {
      width: 100%;
      height: 30px;
      border-color: rgba(37, 99, 235, 0.35);
      color: #1d4ed8;
      background: #eff6ff;
      font-weight: 800;
    }

    .menu-action-btn--full:hover {
      background: #dbeafe;
    }

    .amenities-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 2px 6px;
    }

    :host ::ng-deep .pin-hover-popup .leaflet-popup-content-wrapper {
      border-radius: 14px;
      box-shadow: 0 14px 28px rgba(15, 23, 42, 0.24);
      border: 1px solid rgba(148, 163, 184, 0.55);
      padding: 0;
      overflow: hidden;
    }

    :host ::ng-deep .pin-hover-popup .leaflet-popup-content {
      margin: 0;
      width: min(320px, 72vw);
    }

    :host ::ng-deep .pin-popup {
      color: #1f2937;
      background: rgba(255, 255, 255, 0.98);
      font-family: "Segoe UI", Tahoma, sans-serif;
    }

    :host ::ng-deep .pin-popup__image {
      width: 100%;
      height: 130px;
      object-fit: cover;
      display: block;
      background: #e2e8f0;
      border-radius: 0;
    }

    :host ::ng-deep .pin-popup__body {
      padding: 10px;
    }

    :host ::ng-deep .pin-popup__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
    }

    :host ::ng-deep .pin-popup__text {
      min-width: 0;
      flex: 1;
    }

    :host ::ng-deep .pin-popup__name {
      font-size: 15px;
      font-weight: 800;
      line-height: 1.25;
      color: #0f172a;
      letter-spacing: 0.01em;
    }

    :host ::ng-deep .pin-popup__address-row {
      margin-top: 4px;
      display: flex;
      align-items: flex-start;
      gap: 6px;
    }

    :host ::ng-deep .pin-popup__address-icon {
      width: 12px;
      height: 12px;
      color: #64748b;
      flex-shrink: 0;
      margin-top: 1px;
    }

    :host ::ng-deep .pin-popup__address {
      font-size: 12px;
      font-weight: 500;
      color: #475569;
      line-height: 1.35;
    }

    :host ::ng-deep .pin-popup__hours {
      margin-top: 6px;
      font-size: 12px;
      font-weight: 600;
      color: #2563eb;
      line-height: 1.35;
    }

    :host ::ng-deep .pin-popup__status {
      margin-top: 2px;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.35;
    }

    :host ::ng-deep .pin-popup__status--open {
      color: #16a34a;
    }

    :host ::ng-deep .pin-popup__status--closed {
      color: #dc2626;
    }

    :host ::ng-deep .pin-popup__meta,
    :host ::ng-deep .pin-popup__amenities {
      margin-top: 8px;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    :host ::ng-deep .pin-popup__rating {
      font-size: 12px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: 0.01em;
      margin-right: 2px;
    }

    :host ::ng-deep .pin-popup__star {
      color: #facc15;
      font-size: 13px;
      font-weight: 900;
      line-height: 1;
    }

    :host ::ng-deep .pin-popup__rating-count {
      font-size: 11px;
      font-weight: 700;
      color: #475569;
      margin-left: 2px;
    }

    :host ::ng-deep .pin-popup__chip {
      border: 1px solid rgba(148, 163, 184, 0.6);
      border-radius: 999px;
      background: #f8fafc;
      color: #334155;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      white-space: nowrap;
    }

    :host ::ng-deep .pin-popup__chip--open {
      border-color: rgba(34, 197, 94, 0.45);
      color: #166534;
      background: #f0fdf4;
    }

    :host ::ng-deep .pin-popup__chip--closed {
      border-color: rgba(248, 113, 113, 0.45);
      color: #991b1b;
      background: #fef2f2;
    }

    :host ::ng-deep .pin-popup__actions {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-shrink: 0;
    }

    :host ::ng-deep .pin-popup__btn {
      border: 1px solid rgba(148, 163, 184, 0.65);
      border-radius: 999px;
      background: #f8fafc;
      color: #334155;
      height: 30px;
      width: 30px;
      padding: 0;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
    }

    :host ::ng-deep .pin-popup__btn--primary {
      border-color: #2563eb;
      background: #2563eb;
      color: #ffffff;
    }

    :host ::ng-deep .pin-popup__btn--saved {
      border-color: #2563eb;
      color: #2563eb;
      background: #eff6ff;
    }

    :host ::ng-deep .pin-popup__btn--danger {
      border-color: rgba(239, 68, 68, 0.55);
      color: #b91c1c;
      background: #fef2f2;
    }

    @media (max-width: 640px) {
      .controls-overlay {
        left: 8px;
        right: 8px;
      }

      .search-wrap {
        height: 38px;
      }

      .filter-tab {
        height: 32px;
        font-size: 13px;
      }

      .menu-popover {
        width: min(340px, calc(100vw - 16px));
      }

      .amenities-grid {
        grid-template-columns: 1fr;
      }
    }

    .results-recenter {
      position: absolute;
      right: 8px;
      top: -42px;
      z-index: 706;
      border: 1px solid #b9c4bc;
      background: #f2f5f2;
      color: #2f3b33;
      border-radius: 8px;
      width: 34px;
      height: 34px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
      cursor: pointer;
      transition: background-color 0.15s ease, transform 0.15s ease;
    }

    .results-recenter:hover {
      background: #e7ece8;
    }

    .results-recenter:active {
      transform: translateY(1px);
    }

    .osm-custom-tiles {
      filter: saturate(0.9) brightness(1.02) contrast(1.03);
    }

    .results-overlay {
      position: absolute;
      left: 50%;
      bottom: 10px;
      transform: translateX(-50%);
      width: min(980px, calc(100vw - 20px));
      z-index: 705;
      pointer-events: none;
    }

    .results-shell {
      position: relative;
      pointer-events: auto;
      border: 1px solid rgba(148, 163, 184, 0.55);
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.92);
      padding: 8px;
    }

    .route-summary-card {
      pointer-events: auto;
      border: 1px solid rgba(37, 99, 235, 0.35);
      border-radius: 12px;
      background: linear-gradient(160deg, rgba(239, 246, 255, 0.98), rgba(219, 234, 254, 0.94));
      box-shadow: 0 6px 14px rgba(15, 23, 42, 0.14);
      padding: 10px 12px;
      margin-bottom: 8px;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
      overflow: hidden;
      max-height: 0;
      opacity: 0;
      transform: translateY(6px);
      pointer-events: none;
      padding-top: 0;
      padding-bottom: 0;
      margin-bottom: 0;
      border-width: 0;
      transition: max-height 220ms ease, opacity 220ms ease, transform 220ms ease, margin-bottom 220ms ease, padding 220ms ease, border-width 220ms ease;
    }

    .route-summary-card.is-open {
      max-height: 120px;
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
      padding-top: 10px;
      padding-bottom: 10px;
      margin-bottom: 8px;
      border-width: 1px;
    }

    .route-summary__label {
      margin: 0;
      font-size: 11px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #1d4ed8;
      font-weight: 800;
    }

    .route-summary__title {
      margin: 2px 0 0;
      color: #0f172a;
      font-size: 14px;
      font-weight: 800;
      line-height: 1.3;
    }

    .route-summary__meta {
      margin: 4px 0 0;
      color: #2563eb;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.35;
    }

    .route-summary__sub {
      margin: 2px 0 0;
      color: #1e3a8a;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.35;
    }

    .route-summary__close {
      border: 0;
      background: rgba(37, 99, 235, 0.14);
      color: #1d4ed8;
      width: 24px;
      height: 24px;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      font-weight: 700;
      line-height: 1;
      cursor: pointer;
      flex-shrink: 0;
    }

    .route-summary__close:hover {
      background: rgba(37, 99, 235, 0.24);
    }

    .results-shell.has-route-card .results-recenter {
      top: -128px;
      z-index: 711;
    }

    .results-shell__bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .results-shell__bar--interactive {
      cursor: pointer;
    }

    .results-content {
      overflow: hidden;
      max-height: 340px;
      opacity: 1;
      transform: translateY(0);
      transition: max-height 0.26s ease, opacity 0.2s ease, transform 0.26s ease;
    }

    .results-shell.is-collapsed .results-content {
      max-height: 0;
      opacity: 0;
      transform: translateY(6px);
    }

    .results-title {
      margin: 0 0 8px;
      padding: 0 2px;
      color: #0f172a;
      font-size: 12px;
      font-weight: 800;
    }

    .results-scroller {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding-bottom: 2px;
      scrollbar-width: thin;
    }

    .result-card {
      min-width: min(320px, calc(100vw - 48px));
      border: 1px solid rgba(148, 163, 184, 0.55);
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.98);
      padding: 10px;
      cursor: pointer;
    }

    .result-card__top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
    }

    .result-card__name {
      color: #0f172a;
      font-size: 14px;
      font-weight: 800;
    }

    .result-card__address-row {
      margin-top: 4px;
      display: flex;
      align-items: flex-start;
      gap: 6px;
    }

    .result-card__pin {
      color: #64748b;
      width: 12px;
      height: 12px;
      margin-top: 1px;
      flex-shrink: 0;
    }

    .result-card__address {
      color: #475569;
      font-size: 12px;
      font-weight: 500;
      line-height: 1.35;
    }

    .result-card__hours {
      margin-top: 6px;
      color: #2563eb;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.35;
    }

    .result-card__status {
      margin-top: 2px;
      font-size: 12px;
      font-weight: 700;
      line-height: 1.35;
    }

    .result-card__status--open {
      color: #16a34a;
    }

    .result-card__status--closed {
      color: #dc2626;
    }

    .result-card__meta {
      margin-top: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .result-card__actions {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-shrink: 0;
    }

    .result-card__amenities {
      margin-top: 8px;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .results-empty {
      pointer-events: auto;
      border: 1px solid rgba(148, 163, 184, 0.55);
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.9);
      padding: 10px 12px;
      color: #334155;
      font-size: 13px;
      font-weight: 600;
      text-align: center;
    }

    .detail-backdrop {
      position: absolute;
      inset: 0;
      z-index: 900;
      background: rgba(2, 6, 23, 0.55);
      backdrop-filter: blur(2px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 14px;
      animation: detail-backdrop-enter 220ms ease;
    }

    .detail-backdrop.is-closing {
      animation: detail-backdrop-exit 220ms ease forwards;
    }

    .detail-modal {
      width: min(940px, calc(100vw - 28px));
      max-height: calc(100dvh - 84px);
      overflow: auto;
      border-radius: 16px;
      border: 1px solid rgba(148, 163, 184, 0.55);
      background: rgba(255, 255, 255, 0.98);
      box-shadow: 0 20px 40px rgba(15, 23, 42, 0.3);
      padding: 0;
      scrollbar-width: thin;
      scrollbar-color: rgba(100, 116, 139, 0.42) rgba(241, 245, 249, 0.86);
      animation: detail-modal-enter 220ms cubic-bezier(0.22, 1, 0.36, 1);
    }

    .detail-modal.is-closing {
      animation: detail-modal-exit 220ms cubic-bezier(0.4, 0, 1, 1) forwards;
    }

    @keyframes detail-backdrop-enter {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes detail-backdrop-exit {
      from {
        opacity: 1;
      }
      to {
        opacity: 0;
      }
    }

    @keyframes detail-modal-enter {
      from {
        opacity: 0;
        transform: translateY(14px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes detail-modal-exit {
      from {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
      to {
        opacity: 0;
        transform: translateY(10px) scale(0.985);
      }
    }

    .detail-body {
      padding: 20px;
    }

    .detail-body > * + * {
      margin-top: 14px;
    }

    .detail-modal::-webkit-scrollbar {
      width: 10px;
    }

    .detail-modal::-webkit-scrollbar-track {
      background: rgba(241, 245, 249, 0.86);
      border-radius: 999px;
    }

    .detail-modal::-webkit-scrollbar-thumb {
      background: linear-gradient(180deg, rgba(148, 163, 184, 0.9), rgba(100, 116, 139, 0.85));
      border-radius: 999px;
      border: 2px solid rgba(241, 245, 249, 0.9);
    }

    .detail-modal::-webkit-scrollbar-thumb:hover {
      background: linear-gradient(180deg, rgba(100, 116, 139, 0.95), rgba(71, 85, 105, 0.9));
    }

    .detail-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 10px;
    }

    .detail-head-main {
      flex: 1;
      min-width: 0;
    }

    .detail-close {
      border: 0;
      background: transparent;
      color: #ffffff;
      border-radius: 10px;
      width: 34px;
      height: 34px;
      font-size: 20px;
      line-height: 1;
      cursor: pointer;
      flex-shrink: 0;
    }

    .detail-close--overlay {
      position: absolute;
      top: 10px;
      right: 10px;
      z-index: 2;
      background: transparent;
    }

    .detail-close:hover {
      color: #ffffff;
    }

    .detail-gallery-wrap {
      position: relative;
    }

    .detail-gallery-main {
      width: 100%;
      height: min(280px, 34vh);
      object-fit: cover;
      border-radius: 0;
      border: 0;
      background: #e2e8f0;
    }

    .detail-thumbs {
      margin-top: 14px;
      display: flex;
      gap: 6px;
      align-items: center;
      overflow-x: auto;
      padding: 0 20px;
      min-height: 86px;
    }

    .detail-thumb-wrap {
      position: relative;
      width: 96px;
      height: 72px;
      flex: 0 0 auto;
    }

    .detail-thumb {
      width: 96px;
      height: 72px;
      object-fit: cover;
      border-radius: 8px;
      border: 2px solid transparent;
      cursor: pointer;
      background: #e2e8f0;
    }

    .detail-thumb-remove {
      position: absolute;
      top: -6px;
      right: -6px;
      width: 20px;
      height: 20px;
      border: 0;
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.85);
      color: #ffffff;
      font-size: 13px;
      line-height: 1;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }

    .detail-thumb-remove:hover {
      background: rgba(2, 6, 23, 0.95);
    }

    .detail-thumb--add {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 64px;
      height: 50px;
      border: 1px dashed rgba(148, 163, 184, 0.8);
      background: #f8fafc;
      color: #334155;
      font-size: 26px;
      font-weight: 600;
      line-height: 1;
      padding: 0;
    }

    .detail-thumb--add:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }

    .detail-upload-input {
      display: none;
    }

    .detail-upload-msg {
      padding: 0 20px;
      margin-top: 8px;
      font-size: 12px;
      font-weight: 700;
      color: #64748b;
    }

    .confirm-backdrop {
      position: fixed;
      inset: 0;
      z-index: 995;
      background: rgba(2, 6, 23, 0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .confirm-modal {
      width: min(360px, calc(100vw - 32px));
      border: 1px solid rgba(148, 163, 184, 0.5);
      border-radius: 12px;
      background: #ffffff;
      box-shadow: 0 18px 36px rgba(15, 23, 42, 0.3);
      padding: 14px;
    }

    .confirm-title {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }

    .confirm-text {
      margin: 8px 0 0;
      font-size: 13px;
      color: #475569;
      line-height: 1.4;
    }

    .confirm-actions {
      margin-top: 12px;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    .confirm-btn {
      border-radius: 10px;
      border: 1px solid rgba(148, 163, 184, 0.6);
      background: #f8fafc;
      color: #334155;
      font-size: 13px;
      font-weight: 700;
      padding: 7px 10px;
      cursor: pointer;
    }

    .confirm-btn--danger {
      border-color: rgba(239, 68, 68, 0.45);
      background: #fee2e2;
      color: #991b1b;
    }

    .confirm-btn:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }

    .detail-review-form {
      margin-top: 10px;
      padding: 10px;
      border: 1px solid rgba(148, 163, 184, 0.45);
      border-radius: 12px;
      background: #f8fafc;
    }

    .detail-star-input {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .detail-rate-label {
      font-size: 12px;
      font-weight: 800;
      color: #475569;
      margin-right: 4px;
    }

    .detail-star-btn {
      border: 0;
      background: transparent;
      color: #cbd5e1;
      cursor: pointer;
      font-size: 20px;
      line-height: 1;
      padding: 0;
    }

    .detail-star-btn.is-on {
      color: #facc15;
    }

    .detail-review-box {
      width: 100%;
      margin-top: 8px;
      border: 1px solid rgba(148, 163, 184, 0.6);
      border-radius: 10px;
      padding: 9px 10px;
      font-size: 13px;
      resize: vertical;
      min-height: 74px;
    }

    .detail-name-input {
      width: 100%;
      margin-top: 8px;
      border: 1px solid rgba(148, 163, 184, 0.6);
      border-radius: 10px;
      padding: 8px 10px;
      font-size: 13px;
      background: #ffffff;
    }

    .add-restroom-form {
      margin-top: 10px;
      padding: 10px;
      border: 1px solid rgba(148, 163, 184, 0.45);
      border-radius: 12px;
      background: #f8fafc;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .add-restroom-form .detail-name-input,
    .add-restroom-form .detail-review-box {
      margin-top: 2px;
    }

    .add-restroom-form .detail-review-box {
      margin-bottom: 8px;
    }

    .add-restroom-form .add-amenity-tabs {
      margin-top: 6px;
      margin-bottom: 10px;
    }

    .add-restroom-form .add-hours-row {
      margin-top: 8px;
    }

    .add-hours-row {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }

    .add-time-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .add-time-selects {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr);
      gap: 6px;
    }

    .add-time-select {
      margin-top: 0;
      width: 100%;
      height: 36px;
      border: 1px solid rgba(148, 163, 184, 0.6);
      border-radius: 10px;
      padding: 0 8px;
      font-size: 13px;
      background: #ffffff;
      color: #334155;
    }

    .add-time-label {
      font-size: 12px;
      font-weight: 700;
      color: #64748b;
    }

    .add-24h-toggle {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      font-weight: 700;
      color: #334155;
      margin-top: 2px;
    }

    .add-24h-toggle input[type="checkbox"] {
      accent-color: #2563eb;
    }

    .add-amenity-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 2px;
    }

    .add-amenity-tab {
      border: 1px solid rgba(148, 163, 184, 0.6);
      background: #ffffff;
      color: #334155;
      border-radius: 999px;
      height: 30px;
      padding: 0 10px;
      display: inline-flex;
      align-items: center;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
    }

    .add-amenity-tab.is-on {
      border-color: rgba(37, 99, 235, 0.45);
      background: #eff6ff;
      color: #1d4ed8;
    }

    .add-submit-msg {
      font-size: 12px;
      font-weight: 700;
      color: #64748b;
      min-height: 16px;
    }

    .add-submit-msg--error {
      color: #b91c1c;
    }

    .add-field-label {
      font-size: 12px;
      font-weight: 700;
      color: #64748b;
      margin-top: 0;
    }

    .add-field-error {
      margin-top: 2px;
      font-size: 12px;
      font-weight: 700;
      color: #b91c1c;
      min-height: 14px;
    }

    .detail-comments {
      margin-top: 10px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .photo-viewer-backdrop {
      position: fixed;
      inset: 0;
      z-index: 980;
      background: rgba(2, 6, 23, 0.82);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 14px;
    }

    .photo-viewer {
      width: min(1020px, calc(100vw - 28px));
      max-height: calc(100dvh - 28px);
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      justify-items: center;
      gap: 10px;
    }

    .photo-viewer-img {
      max-width: 100%;
      max-height: calc(100dvh - 60px);
      object-fit: contain;
      justify-self: center;
      border-radius: 12px;
      background: #0f172a;
    }

    .photo-viewer-nav {
      border: 0;
      background: transparent;
      color: #ffffff;
      border-radius: 999px;
      width: 44px;
      height: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
      transition: transform 0.16s ease, box-shadow 0.16s ease;
    }

    .photo-viewer-nav:hover {
      transform: none;
      box-shadow: none;
    }

    .photo-viewer-nav-icon {
      width: 20px;
      height: 20px;
    }

    .photo-viewer-close {
      position: fixed;
      top: 12px;
      right: 12px;
      border: 0;
      background: transparent;
      color: #ffffff;
      border-radius: 10px;
      width: 34px;
      height: 34px;
      font-size: 20px;
      line-height: 1;
      cursor: pointer;
    }

    .detail-comment {
      border: 1px solid rgba(148, 163, 184, 0.4);
      border-radius: 10px;
      background: #ffffff;
      padding: 8px 10px;
    }

    .detail-comment-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-size: 12px;
      color: #475569;
      font-weight: 700;
      margin-bottom: 4px;
    }

    .detail-comment-rating {
      display: inline-flex;
      align-items: center;
      gap: 2px;
    }

    .detail-comment-star {
      color: #facc15;
    }

    @media (max-width: 640px) {
      .results-recenter {
        right: 6px;
        top: -40px;
      }

      .results-shell.has-route-card .results-recenter {
        top: -148px;
      }

      .detail-modal {
        width: calc(100vw - 18px);
        max-height: calc(100dvh - 24px);
        padding: 0;
      }

      .detail-body {
        padding: 14px;
      }

      .detail-gallery-main {
        height: min(220px, 30vh);
      }

      .detail-thumbs {
        padding: 0 14px;
      }

      .detail-upload-msg {
        padding: 0 14px;
      }

      .add-restroom-modal {
        width: calc(100vw - 26px);
        /* Keep visible breathing room above and below inside map shell on mobile. */
        max-height: calc(100% - 28px);
        margin: 14px 0;
      }

      .add-restroom-modal .detail-body {
        padding: 16px;
      }

      .add-restroom-modal .add-restroom-form {
        margin-top: 12px;
        padding: 12px;
      }

      .add-hours-row {
        grid-template-columns: 1fr;
      }

      .add-time-selects {
        grid-template-columns: 1fr 1fr 1fr;
      }
    }

  `],
  template: `
    <div class="map-shell">
      <div class="controls-overlay">
        <div class="controls-inner">
          <div class="search-wrap">
            <span class="search-icon" aria-hidden="true">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"></circle>
                <path d="M20 20L16.65 16.65" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>
              </svg>
            </span>
            <input
              class="search-input"
              type="text"
              placeholder="Search restrooms..."
              [value]="searchQuery"
              (input)="onSearchInput($event)"
            />
            <button
              *ngIf="searchQuery"
              class="search-clear"
              type="button"
              aria-label="Clear search"
              (click)="clearSearch()"
            >
              ×
            </button>
          </div>

          <div class="filter-row">
            <div class="filter-tab-group">
              <button type="button" class="filter-tab" [ngClass]="{ 'is-active': isFilterMenuOpen || filterOpenNow || filterTopRated }" (click)="toggleFilterMenu()">Filter</button>
              <div *ngIf="isFilterMenuVisible" class="menu-popover" [class.is-open]="isFilterMenuOpen" role="menu" aria-label="Filter options">
                <p class="menu-title">Filter Options</p>
                <label class="menu-check">
                  <input type="checkbox" [checked]="filterOpenNow" (change)="onFilterOpenNowToggle($event)" />
                  <span>Open now</span>
                </label>
                <label class="menu-check">
                  <input type="checkbox" [checked]="filterTopRated" (change)="onFilterTopRatedToggle($event)" />
                  <span>Top rated</span>
                </label>
                <div class="menu-actions menu-actions--full">
                  <button type="button" class="menu-action-btn menu-action-btn--full" (click)="clearFilterOptions()">Clear Filters</button>
                </div>
              </div>
            </div>

            <div class="filter-tab-group">
              <button type="button" class="filter-tab" [ngClass]="{ 'is-active': sortOrder !== 'latest' }" (click)="toggleSortOrder()">Sort: {{ sortOrder === 'latest' ? 'Latest' : 'Oldest' }}</button>
            </div>

            <div class="filter-tab-group">
              <button type="button" class="filter-tab" [ngClass]="{ 'is-active': isRadiusMenuOpen || isRadiusValueChanged() }" (click)="toggleRadiusMenu()">Radius ({{ radiusKm | number:'1.1-1' }} km)</button>
              <div *ngIf="isRadiusMenuVisible" class="menu-popover" [class.is-open]="isRadiusMenuOpen" role="menu" aria-label="Radius options">
                <p class="menu-title">Search Radius</p>
                <div class="radius-wrap">
                  <div class="radius-value">{{ radiusKm | number:'1.1-1' }} km</div>
                  <input class="radius-slider" type="range" min="0.1" max="20" step="0.1" [value]="radiusKm" (input)="onRadiusChange($event)" />
                </div>
                <div class="menu-actions menu-actions--full">
                  <button type="button" class="menu-action-btn menu-action-btn--full" (click)="resetRadius()">Reset Radius</button>
                </div>
              </div>
            </div>

            <div class="filter-tab-group">
              <button type="button" class="filter-tab" [ngClass]="{ 'is-active': isAmenitiesMenuOpen || selectedAmenities.size > 0 }" (click)="toggleAmenitiesMenu()">Amenities</button>
              <div *ngIf="isAmenitiesMenuVisible" class="menu-popover" [class.is-open]="isAmenitiesMenuOpen" role="menu" aria-label="Amenities options">
                <p class="menu-title">Amenities</p>
                <div class="amenities-grid">
                  <label class="menu-check" *ngFor="let amenity of amenityOptions">
                    <input type="checkbox" [checked]="selectedAmenities.has(amenity.id)" (change)="onAmenityToggle(amenity.id, $event)" />
                    <span>{{ amenity.label }}</span>
                  </label>
                </div>
                <div class="menu-actions menu-actions--full">
                  <button type="button" class="menu-action-btn menu-action-btn--full" (click)="clearAmenities()">Clear Amenities</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="results-overlay">
        <div class="route-summary-card" [class.is-open]="hasActiveRouteCard()">
          <div>
            <p class="route-summary__label">Fastest Route</p>
            <p class="route-summary__title">{{ activeRouteTitle }}</p>
            <p class="route-summary__meta">{{ activeRouteDistanceLabel }} • {{ activeRouteDurationLabel }}</p>
          </div>
          <button type="button" class="route-summary__close" aria-label="Close route" title="Close route" (click)="clearActiveRoute($event)">×</button>
        </div>
        <div class="results-shell" [class.has-route-card]="hasActiveRouteCard()" [class.is-collapsed]="isResultsCollapsed" *ngIf="filteredRestrooms.length > 0; else noNearbyResults">
          <button class="results-recenter" (click)="recenterToCurrentLocation()" aria-label="Return to current location" title="Return to current location">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.7"/>
              <circle cx="12" cy="12" r="7" stroke="currentColor" stroke-width="1.7"/>
              <path d="M12 2.8V6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
              <path d="M12 18V21.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
              <path d="M2.8 12H6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
              <path d="M18 12H21.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
            </svg>
          </button>
          <div class="results-shell__bar results-shell__bar--interactive" (click)="toggleResultsCollapsed($event)">
            <p class="results-title">Nearby Restrooms ({{ filteredRestrooms.length }})</p>
          </div>
          <div class="results-content">
            <div class="results-scroller" (wheel)="onResultsWheel($event)">
            <article class="result-card" *ngFor="let restroom of filteredRestrooms" (click)="openRestroomDetails(restroom)">
              <div class="result-card__top">
                <div>
                  <div class="result-card__name">{{ restroom.name || 'Restroom' }}</div>
                  <div class="result-card__address-row">
                    <span class="result-card__pin" aria-hidden="true">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 21.2C11.7 21.2 11.5 21.1 11.3 20.9C10 19.7 5 15.1 5 10.7C5 6.9 8 3.8 11.8 3.8C15.6 3.8 18.6 6.9 18.6 10.7C18.6 15.1 13.6 19.7 12.3 20.9C12.2 21.1 12 21.2 12 21.2Z" fill="currentColor"/>
                        <circle cx="11.8" cy="10.5" r="2.2" fill="white"/>
                      </svg>
                    </span>
                    <div class="result-card__address">{{ restroom.location?.address || 'No address available' }}</div>
                  </div>
                  <div class="result-card__hours">{{ getOperatingTimeLabel(restroom) }}</div>
                  <div class="result-card__status" [ngClass]="isRestroomOpen(restroom) ? 'result-card__status--open' : 'result-card__status--closed'">
                    {{ isRestroomOpen(restroom) ? 'Open now' : 'Closed now' }}
                  </div>
                </div>
                <div class="result-card__actions">
                  <button type="button" class="pin-popup__btn pin-popup__btn--primary" (click)="$event.stopPropagation(); openDirections(restroom)" aria-label="Get directions" title="Get directions">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M3 11.5L21 3L12.5 21L10.4 13.6L3 11.5Z" fill="currentColor"/>
                    </svg>
                  </button>
                  <button type="button" class="pin-popup__btn" (click)="$event.stopPropagation(); openEditRestroom(restroom)" aria-label="Edit restroom" title="Edit restroom">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M3 17.8V21H6.2L17.4 9.8L14.2 6.6L3 17.8Z" fill="currentColor"/>
                      <path d="M18.7 8.5L15.5 5.3L17.1 3.7C17.5 3.3 18.2 3.3 18.6 3.7L20.3 5.4C20.7 5.8 20.7 6.5 20.3 6.9L18.7 8.5Z" fill="currentColor"/>
                    </svg>
                  </button>
                </div>
              </div>
              <div class="result-card__meta">
                <span class="pin-popup__rating">{{ getRatingLabel(restroom) }}</span>
                <span class="pin-popup__star">★</span>
                <span class="pin-popup__rating-count" *ngIf="getRatingsCount(restroom) > 0">({{ getRatingsCount(restroom) }})</span>
              </div>
              <div class="result-card__amenities">
                <span class="pin-popup__chip" *ngFor="let amenity of getAmenityTabs(restroom)">{{ amenity }}</span>
              </div>
            </article>
            </div>
          </div>
        </div>
      </div>

      <ng-template #noNearbyResults>
        <div class="results-overlay">
          <div class="route-summary-card" [class.is-open]="hasActiveRouteCard()">
            <div>
              <p class="route-summary__label">Fastest Route</p>
              <p class="route-summary__title">{{ activeRouteTitle }}</p>
              <p class="route-summary__meta">{{ activeRouteDistanceLabel }} • {{ activeRouteDurationLabel }}</p>
            </div>
            <button type="button" class="route-summary__close" aria-label="Close route" title="Close route" (click)="clearActiveRoute($event)">×</button>
          </div>
          <div class="results-shell" [class.has-route-card]="hasActiveRouteCard()" [class.is-collapsed]="isResultsCollapsed">
            <button class="results-recenter" (click)="recenterToCurrentLocation()" aria-label="Return to current location" title="Return to current location">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.7"/>
                <circle cx="12" cy="12" r="7" stroke="currentColor" stroke-width="1.7"/>
                <path d="M12 2.8V6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
                <path d="M12 18V21.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
                <path d="M2.8 12H6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
                <path d="M18 12H21.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
              </svg>
            </button>
            <div class="results-shell__bar">
              <p class="results-title">Nearby Restrooms (0)</p>
            </div>
            <div class="results-content">
              <div class="results-empty">No nearby restrooms match your current filters.</div>
            </div>
          </div>
        </div>
      </ng-template>

      <div class="detail-backdrop" *ngIf="detailModalOpen && selectedRestroom" [class.is-closing]="detailClosing" (click)="closeRestroomDetails()">
        <section class="detail-modal" [class.is-closing]="detailClosing" (click)="$event.stopPropagation()">
          <div class="detail-gallery-wrap">
            <img class="detail-gallery-main" [src]="getSelectedModalImage()" alt="Restroom photo" *ngIf="getSelectedModalImage(); else noImage" (click)="openPhotoViewer(modalSelectedImageIndex)" />
            <ng-template #noImage>
              <div class="detail-gallery-main" style="display:flex;align-items:center;justify-content:center;color:#64748b;font-weight:700;">No uploaded images</div>
            </ng-template>
            <button class="detail-close detail-close--overlay" type="button" (click)="closeRestroomDetails()" aria-label="Close details">×</button>
          </div>

          <div class="detail-thumbs">
            <input #modalPhotoInput class="detail-upload-input" type="file" accept="image/*" (change)="onModalPhotoSelected($event)" />
            <button
              type="button"
              class="detail-thumb detail-thumb--add"
              aria-label="Add photo"
              title="Add photo"
              [disabled]="photoUploading || (selectedRestroom.images?.length || 0) >= 5"
              (click)="modalPhotoInput.click()"
            >+</button>
            <div class="detail-thumb-wrap" *ngFor="let img of selectedRestroom.images; let i = index">
              <img
                class="detail-thumb"
                [src]="img"
                alt="Uploaded restroom image"
                (click)="openPhotoViewer(i)"
              />
              <button
                type="button"
                class="detail-thumb-remove"
                aria-label="Remove photo"
                title="Remove photo"
                [disabled]="(selectedRestroom.images?.length || 0) <= 1"
                (click)="removeModalPhoto(i, $event)"
              >×</button>
            </div>
          </div>
          <div class="detail-upload-msg">{{ photoUploadMsg }}</div>

          <div class="detail-body">
            <div class="detail-head" style="margin-top:10px;">
              <div class="detail-head-main">
                <div class="pin-popup__text">
                  <div class="pin-popup__name">{{ selectedRestroom.name || 'Restroom' }}</div>
                  <div class="pin-popup__address-row">
                    <span class="pin-popup__address-icon" aria-hidden="true">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 21.2C11.7 21.2 11.5 21.1 11.3 20.9C10 19.7 5 15.1 5 10.7C5 6.9 8 3.8 11.8 3.8C15.6 3.8 18.6 6.9 18.6 10.7C18.6 15.1 13.6 19.7 12.3 20.9C12.2 21.1 12 21.2 12 21.2Z" fill="currentColor"></path>
                        <circle cx="11.8" cy="10.5" r="2.2" fill="white"></circle>
                      </svg>
                    </span>
                    <div class="pin-popup__address">{{ selectedRestroom.location?.address || 'No address available' }}</div>
                  </div>
                  <div class="pin-popup__hours">{{ getOperatingTimeLabel(selectedRestroom) }}</div>
                  <div class="pin-popup__status" [ngClass]="isRestroomOpen(selectedRestroom) ? 'pin-popup__status--open' : 'pin-popup__status--closed'">
                    {{ isRestroomOpen(selectedRestroom) ? 'Open now' : 'Closed now' }}
                  </div>
                </div>
              </div>

              <div class="pin-popup__actions" style="margin-top:2px;">
                <button type="button" class="pin-popup__btn pin-popup__btn--primary" (click)="openDirections(selectedRestroom, true)" aria-label="Get directions" title="Get directions">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 11.5L21 3L12.5 21L10.4 13.6L3 11.5Z" fill="currentColor"/></svg>
                </button>
                <button type="button" class="pin-popup__btn" (click)="openEditRestroom(selectedRestroom)" aria-label="Edit restroom" title="Edit restroom">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M3 17.8V21H6.2L17.4 9.8L14.2 6.6L3 17.8Z" fill="currentColor"/>
                    <path d="M18.7 8.5L15.5 5.3L17.1 3.7C17.5 3.3 18.2 3.3 18.6 3.7L20.3 5.4C20.7 5.8 20.7 6.5 20.3 6.9L18.7 8.5Z" fill="currentColor"/>
                  </svg>
                </button>
                <button type="button" class="pin-popup__btn pin-popup__btn--danger" (click)="requestDeleteSelectedRestroom()" aria-label="Delete restroom" title="Delete restroom">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M9.5 4.5H14.5L15.2 6H19V7.8H5V6H8.8L9.5 4.5Z" fill="currentColor"/>
                    <path d="M7 8.6H17L16.2 19.2C16.1 20.1 15.4 20.8 14.5 20.8H9.5C8.6 20.8 7.9 20.1 7.8 19.2L7 8.6Z" stroke="currentColor" stroke-width="1.6"/>
                    <path d="M10 11.2V17.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                    <path d="M14 11.2V17.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
                  </svg>
                </button>
              </div>
            </div>

            <div class="pin-popup__meta" style="margin-top:10px;">
              <span class="pin-popup__rating">{{ getModalAverageRating() }}</span>
              <span class="pin-popup__star">★</span>
              <span class="pin-popup__rating-count" *ngIf="selectedRestroomReviews.length > 0">({{ selectedRestroomReviews.length }})</span>
            </div>

            <div class="result-card__amenities" style="margin-top:8px;">
              <span class="pin-popup__chip" *ngFor="let amenity of getAmenityTabs(selectedRestroom)">{{ amenity }}</span>
            </div>

            <div class="detail-review-form">
              <div class="pin-popup__meta" style="margin-top:0;">
                <span class="detail-rate-label">Rate:</span>
                <div class="detail-star-input">
                  <button
                    type="button"
                    class="detail-star-btn"
                    [class.is-on]="star <= reviewRating"
                    *ngFor="let star of stars"
                    (click)="reviewRating = star"
                  >★</button>
                </div>
              </div>
              <input class="detail-name-input" type="text" [(ngModel)]="reviewDisplayName" placeholder="Name (optional)" />
              <textarea class="detail-review-box" [(ngModel)]="reviewComment" placeholder="Share your review..."></textarea>
              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px;">
                <span style="font-size:12px;font-weight:700;color:#64748b;">{{ reviewSubmitMsg }}</span>
                <button type="button" class="menu-action-btn menu-action-btn--full" style="width:auto;padding:0 12px;" (click)="submitModalReview()" [disabled]="reviewSubmitting">
                  {{ reviewSubmitting ? 'Submitting...' : 'Post review' }}
                </button>
              </div>
            </div>

            <div class="detail-comments">
              <div class="detail-comment" *ngFor="let review of selectedRestroomReviews">
                <div class="detail-comment-meta">
                  <span>{{ getReviewAuthor(review) }}</span>
                  <span class="detail-comment-rating"><span>{{ review.rating }}</span><span class="detail-comment-star">★</span></span>
                </div>
                <div style="font-size:13px;color:#334155;line-height:1.4;">{{ review.comment || 'No comment provided.' }}</div>
              </div>
              <div class="detail-comment" *ngIf="!reviewsLoading && selectedRestroomReviews.length === 0">
                <div style="font-size:13px;color:#64748b;font-weight:700;">No reviews yet.</div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div class="detail-backdrop" *ngIf="addRestroomModalOpen" [class.is-closing]="addRestroomClosing" (click)="closeAddRestroomModal()">
        <section class="detail-modal add-restroom-modal" [class.is-closing]="addRestroomClosing" (click)="$event.stopPropagation()">
          <div class="detail-gallery-wrap">
            <img class="detail-gallery-main" [src]="addRestroomImages[0]" alt="New restroom photo" *ngIf="addRestroomImages.length > 0; else noAddImage" />
            <ng-template #noAddImage>
              <div class="detail-gallery-main" style="display:flex;align-items:center;justify-content:center;color:#64748b;font-weight:700;">Add photos for this restroom</div>
            </ng-template>
            <button class="detail-close detail-close--overlay" type="button" (click)="closeAddRestroomModal()" aria-label="Close add restroom">×</button>
          </div>

          <div class="detail-thumbs">
            <input #addRestroomPhotoInput class="detail-upload-input" type="file" accept="image/*" (change)="onAddRestroomPhotoSelected($event)" />
            <button
              type="button"
              class="detail-thumb detail-thumb--add"
              aria-label="Add photo"
              title="Add photo"
              [disabled]="addPhotoUploading || addRestroomImages.length >= 5"
              (click)="addRestroomPhotoInput.click()"
            >+</button>
            <div class="detail-thumb-wrap" *ngFor="let img of addRestroomImages; let i = index">
              <img class="detail-thumb" [src]="img" alt="New restroom image" />
              <button type="button" class="detail-thumb-remove" aria-label="Remove photo" title="Remove photo" [disabled]="addRestroomImages.length <= 1" (click)="removeAddRestroomImage(i, $event)">×</button>
            </div>
          </div>
          <div class="detail-upload-msg">{{ addPhotoUploadMsg || ('Photos: ' + addRestroomImages.length + '/5') }}</div>

          <div class="detail-body">
            <div class="detail-head" style="margin-top:10px;">
              <div class="detail-head-main">
                <div class="pin-popup__text">
                  <div class="pin-popup__name">Add Restroom</div>
                  <div class="pin-popup__address-row">
                    <span class="pin-popup__address-icon" aria-hidden="true">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 21.2C11.7 21.2 11.5 21.1 11.3 20.9C10 19.7 5 15.1 5 10.7C5 6.9 8 3.8 11.8 3.8C15.6 3.8 18.6 6.9 18.6 10.7C18.6 15.1 13.6 19.7 12.3 20.9C12.2 21.1 12 21.2 12 21.2Z" fill="currentColor"></path>
                        <circle cx="11.8" cy="10.5" r="2.2" fill="white"></circle>
                      </svg>
                    </span>
                    <div class="pin-popup__address">Pinned location: {{ addRestroomDraft.location.latitude | number:'1.4-4' }}, {{ addRestroomDraft.location.longitude | number:'1.4-4' }}</div>
                  </div>
                </div>
              </div>
            </div>

            <form class="add-restroom-form" (ngSubmit)="submitAddRestroom()">
              <label class="add-field-label" for="addRestroomName">Restroom name</label>
              <input
                id="addRestroomName"
                class="detail-name-input"
                type="text"
                [(ngModel)]="addRestroomDraft.name"
                name="addRestroomName"
                maxlength="80"
              />
              <div class="add-field-error">{{ addFieldErrors.name }}</div>

              <label class="add-field-label" for="addRestroomAddress">Address</label>
              <input
                id="addRestroomAddress"
                class="detail-name-input"
                type="text"
                [(ngModel)]="addRestroomDraft.location.address"
                name="addRestroomAddress"
                maxlength="140"
              />
              <div class="add-field-error">{{ addFieldErrors.address }}</div>

              <label class="add-field-label" for="addRestroomDescription">Description</label>
              <textarea
                id="addRestroomDescription"
                class="detail-review-box"
                [(ngModel)]="addRestroomDraft.description"
                name="addRestroomDescription"
              ></textarea>

              <div class="menu-title" style="margin:0;">Amenities</div>
              <div class="add-amenity-tabs">
                <button
                  type="button"
                  class="add-amenity-tab"
                  [class.is-on]="isAddAmenitySelected(amenity.value)"
                  *ngFor="let amenity of addAmenityOptions"
                  (click)="toggleAddAmenity(amenity.value)"
                >
                  <span>{{ amenity.label }}</span>
                </button>
              </div>

              <div class="menu-title" style="margin:6px 0 0;">Operating Hours</div>
              <label class="add-24h-toggle">
                <input type="checkbox" [(ngModel)]="addRestroomDraft.operatingHours.is24Hours" name="addRestroom24h" />
                <span>Open 24 hours</span>
              </label>

              <div class="add-hours-row">
                <label class="add-time-field">
                  <span class="add-time-label">Opening time</span>
                  <div class="add-time-selects">
                    <select class="add-time-select" [(ngModel)]="addOpenHour" name="addRestroomOpenHour" [disabled]="addRestroomDraft.operatingHours.is24Hours">
                      <option *ngFor="let hour of addTimeHourOptions" [ngValue]="hour">{{ hour }}</option>
                    </select>
                    <select class="add-time-select" [(ngModel)]="addOpenMinute" name="addRestroomOpenMinute" [disabled]="addRestroomDraft.operatingHours.is24Hours">
                      <option *ngFor="let minute of addTimeMinuteOptions" [ngValue]="minute">{{ minute }}</option>
                    </select>
                    <select class="add-time-select" [(ngModel)]="addOpenMeridiem" name="addRestroomOpenMeridiem" [disabled]="addRestroomDraft.operatingHours.is24Hours">
                      <option *ngFor="let meridiem of addTimeMeridiemOptions" [ngValue]="meridiem">{{ meridiem }}</option>
                    </select>
                  </div>
                  <div class="add-field-error">{{ addFieldErrors.openTime }}</div>
                </label>

                <label class="add-time-field">
                  <span class="add-time-label">Closing time</span>
                  <div class="add-time-selects">
                    <select class="add-time-select" [(ngModel)]="addCloseHour" name="addRestroomCloseHour" [disabled]="addRestroomDraft.operatingHours.is24Hours">
                      <option *ngFor="let hour of addTimeHourOptions" [ngValue]="hour">{{ hour }}</option>
                    </select>
                    <select class="add-time-select" [(ngModel)]="addCloseMinute" name="addRestroomCloseMinute" [disabled]="addRestroomDraft.operatingHours.is24Hours">
                      <option *ngFor="let minute of addTimeMinuteOptions" [ngValue]="minute">{{ minute }}</option>
                    </select>
                    <select class="add-time-select" [(ngModel)]="addCloseMeridiem" name="addRestroomCloseMeridiem" [disabled]="addRestroomDraft.operatingHours.is24Hours">
                      <option *ngFor="let meridiem of addTimeMeridiemOptions" [ngValue]="meridiem">{{ meridiem }}</option>
                    </select>
                  </div>
                  <div class="add-field-error">{{ addFieldErrors.closeTime }}</div>
                </label>
              </div>

              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px;">
                <span class="add-submit-msg" [class.add-submit-msg--error]="addRestroomSubmitMsg === 'Please fix the required fields'">{{ addRestroomSubmitMsg }}</span>
                <button type="submit" class="menu-action-btn menu-action-btn--full" style="width:auto;padding:0 12px;" [disabled]="addRestroomSubmitting">
                  {{ addRestroomSubmitting ? 'Saving...' : 'Add restroom' }}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>

      <div class="detail-backdrop" *ngIf="editRestroomModalOpen" [class.is-closing]="editRestroomClosing" (click)="closeEditRestroomModal()">
        <section class="detail-modal add-restroom-modal" [class.is-closing]="editRestroomClosing" (click)="$event.stopPropagation()">
          <div class="detail-gallery-wrap">
            <img class="detail-gallery-main" [src]="editRestroomImages[0]" alt="Edit restroom photo" *ngIf="editRestroomImages.length > 0; else noEditImage" />
            <ng-template #noEditImage>
              <div class="detail-gallery-main" style="display:flex;align-items:center;justify-content:center;color:#64748b;font-weight:700;">Add photos for this restroom</div>
            </ng-template>
            <button class="detail-close detail-close--overlay" type="button" (click)="closeEditRestroomModal()" aria-label="Close edit restroom">×</button>
          </div>

          <div class="detail-thumbs">
            <input #editRestroomPhotoInput class="detail-upload-input" type="file" accept="image/*" (change)="onEditRestroomPhotoSelected($event)" />
            <button
              type="button"
              class="detail-thumb detail-thumb--add"
              aria-label="Add photo"
              title="Add photo"
              [disabled]="editPhotoUploading || editRestroomImages.length >= 5"
              (click)="editRestroomPhotoInput.click()"
            >+</button>
            <div class="detail-thumb-wrap" *ngFor="let img of editRestroomImages; let i = index">
              <img class="detail-thumb" [src]="img" alt="Edited restroom image" />
              <button type="button" class="detail-thumb-remove" aria-label="Remove photo" title="Remove photo" [disabled]="editRestroomImages.length <= 1" (click)="removeEditRestroomImage(i, $event)">×</button>
            </div>
          </div>
          <div class="detail-upload-msg">{{ editPhotoUploadMsg || ('Photos: ' + editRestroomImages.length + '/5') }}</div>

          <div class="detail-body">
            <div class="detail-head" style="margin-top:10px;">
              <div class="detail-head-main">
                <div class="pin-popup__text">
                  <div class="pin-popup__name">Edit Restroom</div>
                  <div class="pin-popup__address-row">
                    <span class="pin-popup__address-icon" aria-hidden="true">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 21.2C11.7 21.2 11.5 21.1 11.3 20.9C10 19.7 5 15.1 5 10.7C5 6.9 8 3.8 11.8 3.8C15.6 3.8 18.6 6.9 18.6 10.7C18.6 15.1 13.6 19.7 12.3 20.9C12.2 21.1 12 21.2 12 21.2Z" fill="currentColor"></path>
                        <circle cx="11.8" cy="10.5" r="2.2" fill="white"></circle>
                      </svg>
                    </span>
                    <div class="pin-popup__address">Pinned location: {{ editRestroomDraft.location.latitude | number:'1.4-4' }}, {{ editRestroomDraft.location.longitude | number:'1.4-4' }}</div>
                  </div>
                </div>
              </div>
            </div>

            <form class="add-restroom-form" (ngSubmit)="submitEditRestroom()">
              <label class="add-field-label" for="editRestroomName">Restroom name</label>
              <input
                id="editRestroomName"
                class="detail-name-input"
                type="text"
                [(ngModel)]="editRestroomDraft.name"
                name="editRestroomName"
                maxlength="80"
              />
              <div class="add-field-error">{{ editFieldErrors.name }}</div>

              <label class="add-field-label" for="editRestroomAddress">Address</label>
              <input
                id="editRestroomAddress"
                class="detail-name-input"
                type="text"
                [(ngModel)]="editRestroomDraft.location.address"
                name="editRestroomAddress"
                maxlength="140"
              />
              <div class="add-field-error">{{ editFieldErrors.address }}</div>

              <label class="add-field-label" for="editRestroomDescription">Description</label>
              <textarea
                id="editRestroomDescription"
                class="detail-review-box"
                [(ngModel)]="editRestroomDraft.description"
                name="editRestroomDescription"
              ></textarea>

              <div class="menu-title" style="margin:0;">Amenities</div>
              <div class="add-amenity-tabs">
                <button
                  type="button"
                  class="add-amenity-tab"
                  [class.is-on]="isEditAmenitySelected(amenity.value)"
                  *ngFor="let amenity of addAmenityOptions"
                  (click)="toggleEditAmenity(amenity.value)"
                >
                  <span>{{ amenity.label }}</span>
                </button>
              </div>

              <div class="menu-title" style="margin:6px 0 0;">Operating Hours</div>
              <label class="add-24h-toggle">
                <input type="checkbox" [(ngModel)]="editRestroomDraft.operatingHours.is24Hours" name="editRestroom24h" />
                <span>Open 24 hours</span>
              </label>

              <div class="add-hours-row">
                <label class="add-time-field">
                  <span class="add-time-label">Opening time</span>
                  <div class="add-time-selects">
                    <select class="add-time-select" [(ngModel)]="editOpenHour" name="editRestroomOpenHour" [disabled]="editRestroomDraft.operatingHours.is24Hours">
                      <option *ngFor="let hour of addTimeHourOptions" [ngValue]="hour">{{ hour }}</option>
                    </select>
                    <select class="add-time-select" [(ngModel)]="editOpenMinute" name="editRestroomOpenMinute" [disabled]="editRestroomDraft.operatingHours.is24Hours">
                      <option *ngFor="let minute of addTimeMinuteOptions" [ngValue]="minute">{{ minute }}</option>
                    </select>
                    <select class="add-time-select" [(ngModel)]="editOpenMeridiem" name="editRestroomOpenMeridiem" [disabled]="editRestroomDraft.operatingHours.is24Hours">
                      <option *ngFor="let meridiem of addTimeMeridiemOptions" [ngValue]="meridiem">{{ meridiem }}</option>
                    </select>
                  </div>
                  <div class="add-field-error">{{ editFieldErrors.openTime }}</div>
                </label>

                <label class="add-time-field">
                  <span class="add-time-label">Closing time</span>
                  <div class="add-time-selects">
                    <select class="add-time-select" [(ngModel)]="editCloseHour" name="editRestroomCloseHour" [disabled]="editRestroomDraft.operatingHours.is24Hours">
                      <option *ngFor="let hour of addTimeHourOptions" [ngValue]="hour">{{ hour }}</option>
                    </select>
                    <select class="add-time-select" [(ngModel)]="editCloseMinute" name="editRestroomCloseMinute" [disabled]="editRestroomDraft.operatingHours.is24Hours">
                      <option *ngFor="let minute of addTimeMinuteOptions" [ngValue]="minute">{{ minute }}</option>
                    </select>
                    <select class="add-time-select" [(ngModel)]="editCloseMeridiem" name="editRestroomCloseMeridiem" [disabled]="editRestroomDraft.operatingHours.is24Hours">
                      <option *ngFor="let meridiem of addTimeMeridiemOptions" [ngValue]="meridiem">{{ meridiem }}</option>
                    </select>
                  </div>
                  <div class="add-field-error">{{ editFieldErrors.closeTime }}</div>
                </label>
              </div>

              <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px;">
                <span class="add-submit-msg" [class.add-submit-msg--error]="editRestroomSubmitMsg === 'Please fix the required fields'">{{ editRestroomSubmitMsg }}</span>
                <button type="submit" class="menu-action-btn menu-action-btn--full" style="width:auto;padding:0 12px;" [disabled]="editRestroomSubmitting">
                  {{ editRestroomSubmitting ? 'Saving...' : 'Update restroom' }}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>

      <div class="photo-viewer-backdrop" *ngIf="photoViewerOpen && selectedRestroom && selectedRestroom.images?.length" (click)="closePhotoViewer()">
        <button class="photo-viewer-close" type="button" (click)="closePhotoViewer(); $event.stopPropagation();" aria-label="Close photo viewer">×</button>
        <div class="photo-viewer" (click)="$event.stopPropagation()">
          <button class="photo-viewer-nav" type="button" (click)="prevPhoto(); $event.stopPropagation();" aria-label="Previous photo">
            <svg class="photo-viewer-nav-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M14.5 5.5L8 12L14.5 18.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <img class="photo-viewer-img" [src]="getPhotoViewerImage()" alt="Full restroom image" />
          <button class="photo-viewer-nav" type="button" (click)="nextPhoto(); $event.stopPropagation();" aria-label="Next photo">
            <svg class="photo-viewer-nav-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M9.5 5.5L16 12L9.5 18.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="confirm-backdrop" *ngIf="removePhotoConfirmOpen" (click)="cancelRemoveModalPhoto()">
        <section class="confirm-modal" (click)="$event.stopPropagation()">
          <p class="confirm-title">Remove photo?</p>
          <p class="confirm-text">This will permanently remove the selected image from this restroom.</p>
          <div class="confirm-actions">
            <button type="button" class="confirm-btn" (click)="cancelRemoveModalPhoto()" [disabled]="photoUploading">Cancel</button>
            <button type="button" class="confirm-btn confirm-btn--danger" (click)="confirmRemoveModalPhoto()" [disabled]="photoUploading">Remove</button>
          </div>
        </section>
      </div>

      <div class="confirm-backdrop" *ngIf="deleteRestroomConfirmOpen" (click)="cancelDeleteRestroom()">
        <section class="confirm-modal" (click)="$event.stopPropagation()">
          <p class="confirm-title">Delete restroom?</p>
          <p class="confirm-text">This will permanently remove this restroom and its reviews.</p>
          <div class="confirm-actions">
            <button type="button" class="confirm-btn" (click)="cancelDeleteRestroom()" [disabled]="deleteRestroomSubmitting">Cancel</button>
            <button type="button" class="confirm-btn confirm-btn--danger" (click)="confirmDeleteRestroom()" [disabled]="deleteRestroomSubmitting">Delete</button>
          </div>
        </section>
      </div>

      <div id="home-map" class="map-canvas"></div>
    </div>
  `
})
export class HomeComponent implements OnInit, OnDestroy, AfterViewInit {
  private api = inject(ApiService);
  private locationService = inject(LocationService);
  private platformId = inject(PLATFORM_ID);
  private hostEl = inject(ElementRef<HTMLElement>);
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();
  private uiRefreshScheduled = false;

  private leaflet: any;
  private map!: L.Map;
  private userMarker?: L.Marker;
  private radiusCircle?: L.Circle;
  private restroomMarkers: L.Marker[] = [];
  private restroomMarkerById = new Map<string, L.Marker>();
  private directionsRouteLine?: L.Polyline;
  activeRouteTitle = '';
  activeRouteDistanceLabel = '';
  activeRouteDurationLabel = '';
  private hoveredMarker?: L.Marker;
  private popupCloseTimer?: number;
  private isPointerInPopup = false;
  private savedRestroomIds = new Set<string>();
  private userPos: { lat: number; lng: number } | null = null;
  private allRestrooms: Restroom[] = [];
  filteredRestrooms: Restroom[] = [];
  locationEnabled = false;
  searchQuery = '';
  filterOpenNow = false;
  filterTopRated = false;
  sortOrder: 'latest' | 'oldest' = 'latest';
  radiusKm = 0.5;
  isFilterMenuOpen = false;
  isFilterMenuVisible = false;
  isRadiusMenuOpen = false;
  isRadiusMenuVisible = false;
  isAmenitiesMenuOpen = false;
  isAmenitiesMenuVisible = false;
  filterTabHighlighted = false;
  sortTabHighlighted = false;
  radiusTabHighlighted = false;
  amenitiesTabHighlighted = false;
  isResultsCollapsed = false;
  detailModalOpen = false;
  detailClosing = false;
  addRestroomModalOpen = false;
  addRestroomClosing = false;
  editRestroomModalOpen = false;
  editRestroomClosing = false;
  selectedRestroom: Restroom | null = null;
  selectedRestroomReviews: RestroomReview[] = [];
  reviewsLoading = false;
  modalSelectedImageIndex = 0;
  photoViewerOpen = false;
  photoViewerIndex = 0;
  reviewRating = 0;
  reviewDisplayName = '';
  reviewComment = '';
  reviewSubmitMsg = '';
  reviewSubmitting = false;
  photoUploadMsg = '';
  photoUploading = false;
  removePhotoConfirmOpen = false;
  pendingPhotoRemoveIndex: number | null = null;
  deleteRestroomConfirmOpen = false;
  deleteRestroomSubmitting = false;
  private detailCloseTimer?: number;
  private addRestroomCloseTimer?: number;
  private editRestroomCloseTimer?: number;
  private menuAnimationMs = 180;
  private filterCloseTimer?: number;
  private radiusCloseTimer?: number;
  private amenitiesCloseTimer?: number;
  selectedAmenities = new Set<string>();
  amenityOptions = [
    { id: 'soap', label: 'Soap' },
    { id: 'tissue', label: 'Tissue' },
    { id: 'pwd', label: 'PWD' },
    { id: 'spacious', label: 'Spacious' },
    { id: 'bidet', label: 'Bidet' },
    { id: 'clean', label: 'Clean' },
    { id: 'lock', label: 'Lock' },
    { id: 'changing-table', label: 'Changing Table' },
  ];
  addAmenityOptions = [
    { value: 'Soap', label: 'Soap' },
    { value: 'Tissue', label: 'Tissue' },
    { value: 'PWD Friendly', label: 'PWD' },
    { value: 'Spacious', label: 'Spacious' },
    { value: 'Bidet', label: 'Bidet' },
    { value: 'Clean', label: 'Clean' },
    { value: 'Lock', label: 'Lock' },
    { value: 'Changing Table', label: 'Changing Table' },
  ];
  addRestroomDraft = this.createDefaultAddRestroomDraft();
  addRestroomSelectedAmenities = new Set<string>();
  addRestroomImages: string[] = [];
  addPhotoUploading = false;
  addPhotoUploadMsg = '';
  addRestroomSubmitMsg = '';
  addRestroomSubmitting = false;
  addFieldErrors = {
    name: '',
    address: '',
    openTime: '',
    closeTime: '',
  };
  addTimeHourOptions = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'));
  addTimeMinuteOptions = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));
  addTimeMeridiemOptions: Array<'AM' | 'PM'> = ['AM', 'PM'];
  addOpenHour = '09';
  addOpenMinute = '00';
  addOpenMeridiem: 'AM' | 'PM' = 'AM';
  addCloseHour = '05';
  addCloseMinute = '00';
  addCloseMeridiem: 'AM' | 'PM' = 'PM';

  editRestroomId = '';
  editRestroomDraft = this.createDefaultAddRestroomDraft();
  editRestroomSelectedAmenities = new Set<string>();
  editRestroomImages: string[] = [];
  editPhotoUploading = false;
  editPhotoUploadMsg = '';
  editRestroomSubmitMsg = '';
  editRestroomSubmitting = false;
  editFieldErrors = {
    name: '',
    address: '',
    openTime: '',
    closeTime: '',
  };
  editOpenHour = '09';
  editOpenMinute = '00';
  editOpenMeridiem: 'AM' | 'PM' = 'AM';
  editCloseHour = '05';
  editCloseMinute = '00';
  editCloseMeridiem: 'AM' | 'PM' = 'PM';
  private fallbackTimer?: number;

  readonly stars = [1, 2, 3, 4, 5];

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    const clickedInsideFilterControl = Boolean(
      target?.closest('.filter-tab-group') || target?.closest('.menu-popover')
    );

    if (!clickedInsideFilterControl) {
      this.closeAllMenus();
    }
  }

  @HostListener('document:keydown.escape')
  onEscapePressed(): void {
    if (this.detailModalOpen) {
      this.closeRestroomDetails();
      return;
    }

    if (this.deleteRestroomConfirmOpen) {
      this.cancelDeleteRestroom();
      return;
    }

    if (this.addRestroomModalOpen) {
      this.closeAddRestroomModal();
      return;
    }

    if (this.editRestroomModalOpen) {
      this.closeEditRestroomModal();
    }
  }

  private clearFallbackTimer(): void {
    if (this.fallbackTimer !== undefined) {
      window.clearTimeout(this.fallbackTimer);
      this.fallbackTimer = undefined;
    }
  }

  private forceFallbackToHAU(): void {
    this.userPos = {
      lat: this.locationService.HAU_COORDS[0],
      lng: this.locationService.HAU_COORDS[1],
    };

    if (this.map) {
      this.map.setView(this.userPos, 14, { animate: false });
      this.updateUserMarker();
    }
  }

  async ngAfterViewInit() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      this.leaflet = await import('leaflet');
    } catch (error) {
      console.error('[Home] Failed to load Leaflet', error);
      return;
    }

    setTimeout(() => {
      if (document.getElementById('home-map') && !this.map) {
        this.initMap();
        this.fetchRestrooms();
      } else {
        this.forceFallbackToHAU();
      }
    }, 0);

    // Hard fail-safe: never keep loading forever.
    this.fallbackTimer = window.setTimeout(() => {
      if (!this.map) {
        console.warn('[Home] Map setup timeout. Falling back to HAU demo location.');
        this.forceFallbackToHAU();
      }
    }, 7000);
  }

  ngOnInit() {
    this.refreshTabHighlights();

    this.locationService.locationEnabled$
      .pipe(takeUntil(this.destroy$))
      .subscribe((enabled) => {
        this.ngZone.run(() => {
          this.locationEnabled = enabled;
          this.updateUserMarker();
          this.applyFilters();
          this.refreshTabHighlights();
          this.forceUiRefresh();
        });
      });

    this.locationService.userPos$
      .pipe(takeUntil(this.destroy$))
      .subscribe((pos) => {
        this.ngZone.run(() => {
          this.userPos = pos;
          this.updateUserMarker();
          this.applyFilters();
          this.refreshTabHighlights();
          this.forceUiRefresh();
        });
      });
  }

  ngOnDestroy() {
    this.clearFallbackTimer();
    this.clearMenuTimers();
    this.clearPopupCloseTimer();
    this.clearDirectionsRoute();
    this.clearDetailCloseTimer();
    this.clearAddRestroomCloseTimer();
    this.clearEditRestroomCloseTimer();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private clearDetailCloseTimer(): void {
    if (this.detailCloseTimer !== undefined) {
      window.clearTimeout(this.detailCloseTimer);
      this.detailCloseTimer = undefined;
    }
  }

  private clearAddRestroomCloseTimer(): void {
    if (this.addRestroomCloseTimer !== undefined) {
      window.clearTimeout(this.addRestroomCloseTimer);
      this.addRestroomCloseTimer = undefined;
    }
  }

  private clearEditRestroomCloseTimer(): void {
    if (this.editRestroomCloseTimer !== undefined) {
      window.clearTimeout(this.editRestroomCloseTimer);
      this.editRestroomCloseTimer = undefined;
    }
  }

  private initMap(): void {
    const L = this.leaflet;
    this.map = L.map('home-map', { zoomControl: false }).setView(this.locationService.HAU_COORDS, 14);

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
      className: 'osm-custom-tiles'
    }).addTo(this.map);

    this.updateUserMarker();
    this.updateRestroomMarkers();

    this.map.on('click', (event: any) => {
      if (this.hasOpenFilterMenus()) {
        this.ngZone.run(() => {
          this.closeAllMenus();
          this.forceUiRefresh();
        });
        return;
      }

      const lat = event?.latlng?.lat;
      const lng = event?.latlng?.lng;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return;
      }

      this.ngZone.run(() => this.openAddRestroomModalAt(lat, lng));
    });

    this.clearFallbackTimer();
  }

  private createDefaultAddRestroomDraft(lat?: number, lng?: number): {
    name: string;
    description: string;
    location: { latitude: number; longitude: number; address: string };
    operatingHours: { is24Hours: boolean; openTime: string; closeTime: string };
  } {
    return {
      name: '',
      description: '',
      location: {
        latitude: Number.isFinite(lat) ? Number(lat) : this.locationService.HAU_COORDS[0],
        longitude: Number.isFinite(lng) ? Number(lng) : this.locationService.HAU_COORDS[1],
        address: '',
      },
      operatingHours: {
        is24Hours: false,
        openTime: '',
        closeTime: '',
      },
    };
  }

  private openAddRestroomModalAt(lat: number, lng: number): void {
    if (this.detailModalOpen || this.detailClosing || this.removePhotoConfirmOpen || this.photoViewerOpen) {
      return;
    }

    this.resetPopupInteractionState(true);

    this.clearAddRestroomCloseTimer();
    this.addRestroomClosing = false;
    this.addRestroomModalOpen = true;
    this.addRestroomSubmitting = false;
    this.addPhotoUploading = false;
    this.addRestroomSubmitMsg = '';
    this.addPhotoUploadMsg = '';
    this.clearAddFieldErrors();
    this.resetAddTimeSelectors();
    this.addRestroomSelectedAmenities.clear();
    this.addRestroomImages = [];
    this.addRestroomDraft = this.createDefaultAddRestroomDraft(lat, lng);
    this.forceUiRefresh();
  }

  closeAddRestroomModal(): void {
    if (!this.addRestroomModalOpen || this.addRestroomClosing) {
      return;
    }

    this.addRestroomClosing = true;
    this.clearAddRestroomCloseTimer();
    this.addRestroomCloseTimer = window.setTimeout(() => {
      this.addRestroomModalOpen = false;
      this.addRestroomClosing = false;
      this.addRestroomSubmitting = false;
      this.addPhotoUploading = false;
      this.addRestroomSubmitMsg = '';
      this.addPhotoUploadMsg = '';
      this.clearAddFieldErrors();
      this.resetAddTimeSelectors();
      this.addRestroomSelectedAmenities.clear();
      this.addRestroomImages = [];
      this.addRestroomDraft = this.createDefaultAddRestroomDraft();
      this.resetPopupInteractionState(true);
      this.addRestroomCloseTimer = undefined;
      this.forceUiRefresh();
    }, 220);
  }

  onAddRestroomPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    if (this.addRestroomImages.length >= 5) {
      this.addPhotoUploadMsg = 'Maximum 5 photos allowed';
      input.value = '';
      this.refreshAddPhotoUiImmediately();
      return;
    }

    const reader = new FileReader();
    this.ngZone.run(() => {
      this.addPhotoUploading = true;
      this.addPhotoUploadMsg = 'Uploading photo...';
      this.refreshAddPhotoUiImmediately();
    });

    reader.onload = () => {
      this.ngZone.run(() => {
        const dataUrl = typeof reader.result === 'string' ? reader.result : '';
        if (!dataUrl) {
          this.addPhotoUploading = false;
          this.addPhotoUploadMsg = 'Failed to read photo';
          this.refreshAddPhotoUiImmediately();
          return;
        }

        this.addRestroomImages = [...this.addRestroomImages, dataUrl].slice(0, 5);
        this.addPhotoUploading = false;
        this.addPhotoUploadMsg = 'Photo uploaded';
        this.refreshAddPhotoUiImmediately();
      });
    };

    reader.onerror = () => {
      this.ngZone.run(() => {
        this.addPhotoUploading = false;
        this.addPhotoUploadMsg = 'Failed to read photo';
        this.refreshAddPhotoUiImmediately();
      });
    };

    reader.readAsDataURL(file);
    input.value = '';
  }

  removeAddRestroomImage(index: number, event?: Event): void {
    event?.stopPropagation();
    if (index < 0 || index >= this.addRestroomImages.length) {
      return;
    }

    if (this.addRestroomImages.length <= 1) {
      this.addPhotoUploadMsg = 'At least 1 photo is required';
      this.refreshAddPhotoUiImmediately();
      return;
    }

    this.addRestroomImages = this.addRestroomImages.filter((_, i) => i !== index);
    this.addPhotoUploading = false;
    this.addPhotoUploadMsg = '';
    this.refreshAddPhotoUiImmediately();
  }

  private refreshAddPhotoUiImmediately(): void {
    this.addRestroomImages = [...this.addRestroomImages];
    this.cdr.detectChanges();
    window.setTimeout(() => this.forceUiRefresh(), 0);
  }

  isAddAmenitySelected(amenity: string): boolean {
    return this.addRestroomSelectedAmenities.has(amenity);
  }

  toggleAddAmenity(amenity: string): void {
    if (this.addRestroomSelectedAmenities.has(amenity)) {
      this.addRestroomSelectedAmenities.delete(amenity);
    } else {
      this.addRestroomSelectedAmenities.add(amenity);
    }
  }

  submitAddRestroom(): void {
    if (this.addRestroomSubmitting) {
      return;
    }

    this.clearAddFieldErrors();

    const trimmedName = this.addRestroomDraft.name.trim();
    const trimmedAddress = this.addRestroomDraft.location.address.trim();
    let hasValidationError = false;

    if (!trimmedName) {
      this.addFieldErrors.name = 'Restroom name is required';
      hasValidationError = true;
    }

    if (!trimmedAddress) {
      this.addFieldErrors.address = 'Address is required';
      hasValidationError = true;
    }

    const is24Hours = this.addRestroomDraft.operatingHours.is24Hours;
    const openTime = this.to24HourTime(this.addOpenHour, this.addOpenMinute, this.addOpenMeridiem);
    const closeTime = this.to24HourTime(this.addCloseHour, this.addCloseMinute, this.addCloseMeridiem);
    if (!is24Hours && (!openTime || !closeTime)) {
      this.addFieldErrors.openTime = 'Opening time is required';
      this.addFieldErrors.closeTime = 'Closing time is required';
      hasValidationError = true;
    }

    if (this.addRestroomImages.length < 1) {
      this.addPhotoUploadMsg = 'At least 1 photo is required';
      hasValidationError = true;
    }

    if (hasValidationError) {
      this.addRestroomSubmitMsg = 'Please fix the required fields';
      this.forceUiRefresh();
      return;
    }

    this.addRestroomDraft.operatingHours.openTime = is24Hours ? '' : openTime;
    this.addRestroomDraft.operatingHours.closeTime = is24Hours ? '' : closeTime;

    const payload = {
      name: trimmedName,
      description: this.addRestroomDraft.description.trim(),
      location: {
        latitude: this.addRestroomDraft.location.latitude,
        longitude: this.addRestroomDraft.location.longitude,
        address: trimmedAddress,
      },
      amenities: Array.from(this.addRestroomSelectedAmenities),
      operatingHours: {
        is24Hours,
        openTime: is24Hours ? '' : openTime,
        closeTime: is24Hours ? '' : closeTime,
      },
      images: this.addRestroomImages,
    };

    this.addRestroomSubmitting = true;
    this.addRestroomSubmitMsg = 'Adding restroom...';
    this.forceUiRefresh();

    this.api.addRestroom(payload).pipe(
      catchError((err) => {
        this.ngZone.run(() => {
          this.addRestroomSubmitting = false;
          this.addRestroomSubmitMsg = err?.error?.message || 'Failed to add restroom';
          this.forceUiRefresh();
        });
        return of(null);
      })
    ).subscribe((created) => {
      this.ngZone.run(() => {
        this.addRestroomSubmitting = false;
        if (!created) {
          this.forceUiRefresh();
          return;
        }

        const createdRestroom = created as Restroom;
        this.allRestrooms = [createdRestroom, ...this.allRestrooms];
        this.applyFilters();
        this.closeAddRestroomModal();
        this.openRestroomDetails(createdRestroom);
      });
    });
  }

  private clearAddFieldErrors(): void {
    this.addFieldErrors = {
      name: '',
      address: '',
      openTime: '',
      closeTime: '',
    };
  }

  private resetAddTimeSelectors(): void {
    this.addOpenHour = '09';
    this.addOpenMinute = '00';
    this.addOpenMeridiem = 'AM';
    this.addCloseHour = '05';
    this.addCloseMinute = '00';
    this.addCloseMeridiem = 'PM';
  }

  private to24HourTime(hour: string, minute: string, meridiem: 'AM' | 'PM'): string {
    const hourNum = Number(hour);
    const minuteNum = Number(minute);
    if (!Number.isInteger(hourNum) || !Number.isInteger(minuteNum)) {
      return '';
    }

    const normalizedHour = hourNum % 12;
    const hour24 = meridiem === 'PM' ? normalizedHour + 12 : normalizedHour;
    return `${String(hour24).padStart(2, '0')}:${String(minuteNum).padStart(2, '0')}`;
  }

  private parse24HourTime(value?: string): { hour: string; minute: string; meridiem: 'AM' | 'PM' } {
    const match = (value || '').match(/^(\d{1,2}):(\d{2})$/);
    if (!match) {
      return { hour: '09', minute: '00', meridiem: 'AM' };
    }

    const rawHour = Number(match[1]);
    const rawMinute = Number(match[2]);
    if (!Number.isInteger(rawHour) || !Number.isInteger(rawMinute)) {
      return { hour: '09', minute: '00', meridiem: 'AM' };
    }

    const meridiem: 'AM' | 'PM' = rawHour >= 12 ? 'PM' : 'AM';
    const normalizedHour = rawHour % 12 || 12;
    return {
      hour: String(normalizedHour).padStart(2, '0'),
      minute: String(Math.max(0, Math.min(rawMinute, 59))).padStart(2, '0'),
      meridiem,
    };
  }

  private normalizeAmenityForEditSelection(amenity: string): string | null {
    const lower = (amenity || '').toLowerCase();
    if (lower.includes('soap')) return 'Soap';
    if (lower.includes('tissue') || lower.includes('toilet paper')) return 'Tissue';
    if (lower.includes('pwd') || lower.includes('accessib')) return 'PWD Friendly';
    if (lower.includes('spacious')) return 'Spacious';
    if (lower.includes('bidet')) return 'Bidet';
    if (lower.includes('clean')) return 'Clean';
    if (lower.includes('lock')) return 'Lock';
    if (lower.includes('changing table') || lower.includes('baby') || lower.includes('child')) return 'Changing Table';
    return null;
  }

  private createDefaultEditRestroomDraft(restroom?: Restroom): {
    name: string;
    description: string;
    location: { latitude: number; longitude: number; address: string };
    operatingHours: { is24Hours: boolean; openTime: string; closeTime: string };
  } {
    return {
      name: restroom?.name || '',
      description: restroom?.description || '',
      location: {
        latitude: restroom?.location?.latitude ?? this.locationService.HAU_COORDS[0],
        longitude: restroom?.location?.longitude ?? this.locationService.HAU_COORDS[1],
        address: restroom?.location?.address || '',
      },
      operatingHours: {
        is24Hours: Boolean(restroom?.operatingHours?.is24Hours),
        openTime: restroom?.operatingHours?.openTime || '',
        closeTime: restroom?.operatingHours?.closeTime || '',
      },
    };
  }

  openEditRestroom(restroom: Restroom): void {
    if (!restroom?._id) return;

    if (this.addRestroomModalOpen || this.addRestroomClosing || this.deleteRestroomConfirmOpen || this.removePhotoConfirmOpen || this.photoViewerOpen) {
      return;
    }

    const openEditorModal = (): void => {
      this.resetPopupInteractionState(true);
      this.clearEditRestroomCloseTimer();
      this.editRestroomClosing = false;
      this.editRestroomModalOpen = true;
      this.editRestroomId = restroom._id || '';
      this.editRestroomSubmitting = false;
      this.editPhotoUploading = false;
      this.editRestroomSubmitMsg = '';
      this.editPhotoUploadMsg = '';
      this.clearEditFieldErrors();
      this.editRestroomDraft = this.createDefaultEditRestroomDraft(restroom);
      this.editRestroomImages = Array.isArray(restroom.images) ? [...restroom.images] : [];
      this.editRestroomSelectedAmenities = new Set<string>();

      for (const amenity of restroom.amenities || []) {
        const normalized = this.normalizeAmenityForEditSelection(amenity);
        if (normalized) {
          this.editRestroomSelectedAmenities.add(normalized);
        }
      }

      if (this.editRestroomDraft.operatingHours.is24Hours) {
        this.resetEditTimeSelectors();
      } else {
        const open = this.parse24HourTime(this.editRestroomDraft.operatingHours.openTime);
        const close = this.parse24HourTime(this.editRestroomDraft.operatingHours.closeTime);
        this.editOpenHour = open.hour;
        this.editOpenMinute = open.minute;
        this.editOpenMeridiem = open.meridiem;
        this.editCloseHour = close.hour;
        this.editCloseMinute = close.minute;
        this.editCloseMeridiem = close.meridiem;
      }

      this.forceUiRefresh();
    };

    if (this.detailModalOpen || this.detailClosing) {
      this.closeRestroomDetails();
      window.setTimeout(() => {
        this.ngZone.run(() => openEditorModal());
      }, 230);
      return;
    }

    openEditorModal();
  }

  closeEditRestroomModal(): void {
    if (!this.editRestroomModalOpen || this.editRestroomClosing) {
      return;
    }

    this.editRestroomClosing = true;
    this.clearEditRestroomCloseTimer();
    this.editRestroomCloseTimer = window.setTimeout(() => {
      this.editRestroomModalOpen = false;
      this.editRestroomClosing = false;
      this.editRestroomId = '';
      this.editRestroomSubmitting = false;
      this.editPhotoUploading = false;
      this.editRestroomSubmitMsg = '';
      this.editPhotoUploadMsg = '';
      this.clearEditFieldErrors();
      this.resetEditTimeSelectors();
      this.editRestroomSelectedAmenities.clear();
      this.editRestroomImages = [];
      this.editRestroomDraft = this.createDefaultEditRestroomDraft();
      this.resetPopupInteractionState(true);
      this.editRestroomCloseTimer = undefined;
      this.forceUiRefresh();
    }, 220);
  }

  private clearEditFieldErrors(): void {
    this.editFieldErrors = {
      name: '',
      address: '',
      openTime: '',
      closeTime: '',
    };
  }

  private resetEditTimeSelectors(): void {
    this.editOpenHour = '09';
    this.editOpenMinute = '00';
    this.editOpenMeridiem = 'AM';
    this.editCloseHour = '05';
    this.editCloseMinute = '00';
    this.editCloseMeridiem = 'PM';
  }

  isEditAmenitySelected(amenity: string): boolean {
    return this.editRestroomSelectedAmenities.has(amenity);
  }

  toggleEditAmenity(amenity: string): void {
    if (this.editRestroomSelectedAmenities.has(amenity)) {
      this.editRestroomSelectedAmenities.delete(amenity);
    } else {
      this.editRestroomSelectedAmenities.add(amenity);
    }
  }

  onEditRestroomPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    if (this.editRestroomImages.length >= 5) {
      this.editPhotoUploadMsg = 'Maximum 5 photos allowed';
      input.value = '';
      this.refreshEditPhotoUiImmediately();
      return;
    }

    const reader = new FileReader();
    this.ngZone.run(() => {
      this.editPhotoUploading = true;
      this.editPhotoUploadMsg = 'Uploading photo...';
      this.refreshEditPhotoUiImmediately();
    });

    reader.onload = () => {
      this.ngZone.run(() => {
        const dataUrl = typeof reader.result === 'string' ? reader.result : '';
        if (!dataUrl) {
          this.editPhotoUploading = false;
          this.editPhotoUploadMsg = 'Failed to read photo';
          this.refreshEditPhotoUiImmediately();
          return;
        }

        this.editRestroomImages = [...this.editRestroomImages, dataUrl].slice(0, 5);
        this.editPhotoUploading = false;
        this.editPhotoUploadMsg = 'Photo uploaded';
        this.refreshEditPhotoUiImmediately();
      });
    };

    reader.onerror = () => {
      this.ngZone.run(() => {
        this.editPhotoUploading = false;
        this.editPhotoUploadMsg = 'Failed to read photo';
        this.refreshEditPhotoUiImmediately();
      });
    };

    reader.readAsDataURL(file);
    input.value = '';
  }

  removeEditRestroomImage(index: number, event?: Event): void {
    event?.stopPropagation();
    if (index < 0 || index >= this.editRestroomImages.length) {
      return;
    }

    if (this.editRestroomImages.length <= 1) {
      this.editPhotoUploadMsg = 'At least 1 photo is required';
      this.refreshEditPhotoUiImmediately();
      return;
    }

    this.editRestroomImages = this.editRestroomImages.filter((_, i) => i !== index);
    this.editPhotoUploading = false;
    this.editPhotoUploadMsg = '';
    this.refreshEditPhotoUiImmediately();
  }

  private refreshEditPhotoUiImmediately(): void {
    this.editRestroomImages = [...this.editRestroomImages];
    this.cdr.detectChanges();
    window.setTimeout(() => this.forceUiRefresh(), 0);
  }

  submitEditRestroom(): void {
    if (this.editRestroomSubmitting || !this.editRestroomId) {
      return;
    }

    this.clearEditFieldErrors();

    const trimmedName = this.editRestroomDraft.name.trim();
    const trimmedAddress = this.editRestroomDraft.location.address.trim();
    let hasValidationError = false;

    if (!trimmedName) {
      this.editFieldErrors.name = 'Restroom name is required';
      hasValidationError = true;
    }

    if (!trimmedAddress) {
      this.editFieldErrors.address = 'Address is required';
      hasValidationError = true;
    }

    const is24Hours = this.editRestroomDraft.operatingHours.is24Hours;
    const openTime = this.to24HourTime(this.editOpenHour, this.editOpenMinute, this.editOpenMeridiem);
    const closeTime = this.to24HourTime(this.editCloseHour, this.editCloseMinute, this.editCloseMeridiem);

    if (!is24Hours && (!openTime || !closeTime)) {
      this.editFieldErrors.openTime = 'Opening time is required';
      this.editFieldErrors.closeTime = 'Closing time is required';
      hasValidationError = true;
    }

    if (hasValidationError) {
      this.editRestroomSubmitMsg = 'Please fix the required fields';
      this.forceUiRefresh();
      return;
    }

    const payload = {
      name: trimmedName,
      description: this.editRestroomDraft.description.trim(),
      location: {
        latitude: this.editRestroomDraft.location.latitude,
        longitude: this.editRestroomDraft.location.longitude,
        address: trimmedAddress,
      },
      amenities: Array.from(this.editRestroomSelectedAmenities),
      operatingHours: {
        is24Hours,
        openTime: is24Hours ? '' : openTime,
        closeTime: is24Hours ? '' : closeTime,
      },
      images: this.editRestroomImages,
    };

    this.editRestroomSubmitting = true;
    this.editRestroomSubmitMsg = 'Saving changes...';
    this.forceUiRefresh();

    this.api.updateRestroom(this.editRestroomId, payload).pipe(
      catchError((err) => {
        this.ngZone.run(() => {
          this.editRestroomSubmitting = false;
          this.editRestroomSubmitMsg = err?.error?.message || 'Failed to update restroom';
          this.forceUiRefresh();
        });
        return of(null);
      })
    ).subscribe((updated) => {
      this.ngZone.run(() => {
        this.editRestroomSubmitting = false;
        if (!updated) {
          this.forceUiRefresh();
          return;
        }

        const updatedRestroom = updated as Restroom;
        this.allRestrooms = this.allRestrooms.map((item) => item._id === updatedRestroom._id ? { ...item, ...updatedRestroom } : item);
        if (this.selectedRestroom?._id === updatedRestroom._id) {
          this.selectedRestroom = { ...this.selectedRestroom, ...updatedRestroom };
        }

        this.applyFilters();
        this.syncSaveStateToPopup(updatedRestroom);
        this.editRestroomSubmitMsg = 'Restroom updated';
        this.closeEditRestroomModal();
        window.setTimeout(() => {
          this.ngZone.run(() => this.openRestroomDetails(updatedRestroom));
        }, 230);
      });
    });
  }

  private fetchRestrooms() {
    this.api.getAllRestrooms().pipe(
      timeout(8000),
      catchError((err) => {
        console.error('[Home] Restroom request failed/timed out', err);
        return of([] as Restroom[]);
      })
    ).subscribe({
      next: (res) => {
        this.ngZone.run(() => {
          this.allRestrooms = Array.isArray(res) ? res : [];
          this.applyFilters();
          this.forceUiRefresh();
        });
      },
      error: (err) => {
        console.error('[Home] Failed to load restrooms', err);
      }
    });
  }

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value || '';
    this.searchQuery = value;
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.applyFilters();
  }

  toggleFilterMenu(): void {
    if (this.isFilterMenuOpen) {
      this.closeFilterMenu();
      return;
    }

    this.openFilterMenu();
    this.closeRadiusMenu();
    this.closeAmenitiesMenu();
  }

  toggleRadiusMenu(): void {
    if (this.isRadiusMenuOpen) {
      this.closeRadiusMenu();
      return;
    }

    this.openRadiusMenu();
    this.closeFilterMenu();
    this.closeAmenitiesMenu();
  }

  toggleAmenitiesMenu(): void {
    if (this.isAmenitiesMenuOpen) {
      this.closeAmenitiesMenu();
      return;
    }

    this.openAmenitiesMenu();
    this.closeFilterMenu();
    this.closeRadiusMenu();
  }

  toggleSortOrder(): void {
    this.sortOrder = this.sortOrder === 'latest' ? 'oldest' : 'latest';
    this.applyFilters();
    this.refreshTabHighlights();
  }

  onFilterOpenNowToggle(event: Event): void {
    this.filterOpenNow = (event.target as HTMLInputElement).checked;
    this.applyFilters();
    this.refreshTabHighlights();
  }

  onFilterTopRatedToggle(event: Event): void {
    this.filterTopRated = (event.target as HTMLInputElement).checked;
    this.applyFilters();
    this.refreshTabHighlights();
  }

  clearFilterOptions(): void {
    this.filterOpenNow = false;
    this.filterTopRated = false;
    this.applyFilters();
    this.refreshTabHighlights();
  }

  onRadiusChange(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.radiusKm = Number.isFinite(value) ? value : 0.5;
    this.applyFilters();
    this.updateRadiusCircle();
    this.refreshTabHighlights();
  }

  resetRadius(): void {
    this.radiusKm = 0.5;
    this.applyFilters();
    this.updateRadiusCircle();
    this.refreshTabHighlights();
  }

  onAmenityToggle(amenityId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.selectedAmenities.add(amenityId);
    } else {
      this.selectedAmenities.delete(amenityId);
    }
    this.applyFilters();
    this.refreshTabHighlights();
  }

  clearAmenities(): void {
    this.selectedAmenities.clear();
    this.applyFilters();
    this.refreshTabHighlights();
  }

  private refreshTabHighlights(): void {
    this.filterTabHighlighted = this.isFilterMenuOpen || this.filterOpenNow || this.filterTopRated;
    this.sortTabHighlighted = this.sortOrder !== 'latest';
    this.radiusTabHighlighted = this.isRadiusMenuOpen || Math.abs(this.radiusKm - 0.5) > 0.001;
    this.amenitiesTabHighlighted = this.isAmenitiesMenuOpen || this.selectedAmenities.size > 0;
  }

  isRadiusValueChanged(): boolean {
    return Math.abs(this.radiusKm - 0.5) > 0.001;
  }

  private closeAllMenus(): void {
    this.closeFilterMenu();
    this.closeRadiusMenu();
    this.closeAmenitiesMenu();
  }

  private hasOpenFilterMenus(): boolean {
    return this.isFilterMenuOpen || this.isFilterMenuVisible || this.isRadiusMenuOpen || this.isRadiusMenuVisible || this.isAmenitiesMenuOpen || this.isAmenitiesMenuVisible;
  }

  private openFilterMenu(): void {
    if (this.filterCloseTimer !== undefined) {
      window.clearTimeout(this.filterCloseTimer);
      this.filterCloseTimer = undefined;
    }
    this.isFilterMenuVisible = true;
    this.isFilterMenuOpen = true;
    this.refreshTabHighlights();
  }

  private closeFilterMenu(): void {
    if (!this.isFilterMenuVisible) return;
    this.isFilterMenuOpen = false;
    if (this.filterCloseTimer !== undefined) {
      window.clearTimeout(this.filterCloseTimer);
    }
    this.filterCloseTimer = window.setTimeout(() => {
      this.isFilterMenuVisible = false;
      this.filterCloseTimer = undefined;
      this.refreshTabHighlights();
    }, this.menuAnimationMs);
    this.refreshTabHighlights();
  }

  private openRadiusMenu(): void {
    if (this.radiusCloseTimer !== undefined) {
      window.clearTimeout(this.radiusCloseTimer);
      this.radiusCloseTimer = undefined;
    }
    this.isRadiusMenuVisible = true;
    this.isRadiusMenuOpen = true;
    this.refreshTabHighlights();
  }

  private closeRadiusMenu(): void {
    if (!this.isRadiusMenuVisible) return;
    this.isRadiusMenuOpen = false;
    if (this.radiusCloseTimer !== undefined) {
      window.clearTimeout(this.radiusCloseTimer);
    }
    this.radiusCloseTimer = window.setTimeout(() => {
      this.isRadiusMenuVisible = false;
      this.radiusCloseTimer = undefined;
      this.refreshTabHighlights();
    }, this.menuAnimationMs);
    this.refreshTabHighlights();
  }

  private openAmenitiesMenu(): void {
    if (this.amenitiesCloseTimer !== undefined) {
      window.clearTimeout(this.amenitiesCloseTimer);
      this.amenitiesCloseTimer = undefined;
    }
    this.isAmenitiesMenuVisible = true;
    this.isAmenitiesMenuOpen = true;
    this.refreshTabHighlights();
  }

  private closeAmenitiesMenu(): void {
    if (!this.isAmenitiesMenuVisible) return;
    this.isAmenitiesMenuOpen = false;
    if (this.amenitiesCloseTimer !== undefined) {
      window.clearTimeout(this.amenitiesCloseTimer);
    }
    this.amenitiesCloseTimer = window.setTimeout(() => {
      this.isAmenitiesMenuVisible = false;
      this.amenitiesCloseTimer = undefined;
      this.refreshTabHighlights();
    }, this.menuAnimationMs);
    this.refreshTabHighlights();
  }

  private clearMenuTimers(): void {
    if (this.filterCloseTimer !== undefined) {
      window.clearTimeout(this.filterCloseTimer);
      this.filterCloseTimer = undefined;
    }
    if (this.radiusCloseTimer !== undefined) {
      window.clearTimeout(this.radiusCloseTimer);
      this.radiusCloseTimer = undefined;
    }
    if (this.amenitiesCloseTimer !== undefined) {
      window.clearTimeout(this.amenitiesCloseTimer);
      this.amenitiesCloseTimer = undefined;
    }
  }

  private applyFilters(): void {
    const query = this.searchQuery.trim().toLowerCase();
    const center = this.userPos || {
      lat: this.locationService.HAU_COORDS[0],
      lng: this.locationService.HAU_COORDS[1],
    };

    let filtered = this.allRestrooms.filter((restroom) => {
      if (query) {
        const searchable = [
          restroom.name || '',
          restroom.description || '',
          restroom.location?.address || '',
          ...(restroom.amenities || []),
        ].join(' ').toLowerCase();

        if (!searchable.includes(query)) {
          return false;
        }
      }

      if (this.filterOpenNow && !this.locationService.isRestroomOpenNow(restroom)) {
        return false;
      }

      if (this.filterTopRated && (restroom.averageRating ?? 0) < 4) {
        return false;
      }

      if (this.selectedAmenities.size > 0 && !this.matchesSelectedAmenities(restroom)) {
        return false;
      }

      if (restroom.location?.latitude == null || restroom.location?.longitude == null) {
        return false;
      }

      const distanceKm =
        this.locationService.getDistance(
          center.lat,
          center.lng,
          restroom.location.latitude,
          restroom.location.longitude
        ) / 1000;

      return distanceKm <= this.radiusKm;
    });

    filtered = filtered.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return this.sortOrder === 'latest' ? bTime - aTime : aTime - bTime;
    });

    this.filteredRestrooms = [...filtered];
    if (this.filteredRestrooms.length === 0) {
      this.isResultsCollapsed = false;
    }
    this.updateRestroomMarkers();
    // Keep cards and pins in lockstep without waiting for a later interaction.
    this.cdr.detectChanges();
    this.forceUiRefresh();
  }

  private clearRestroomMarkers(): void {
    if (!this.map) return;

    this.resetPopupInteractionState();

    for (const marker of this.restroomMarkers) {
      marker.removeFrom(this.map);
    }
    this.restroomMarkers = [];
    this.restroomMarkerById.clear();
  }

  private updateRestroomMarkers(): void {
    if (!this.map || !this.leaflet) return;

    const L = this.leaflet;
    this.clearRestroomMarkers();

    for (const restroom of this.filteredRestrooms) {
      const lat = restroom.location?.latitude;
      const lng = restroom.location?.longitude;
      if (lat == null || lng == null) continue;

      const rating = restroom.averageRating ?? 0;
      const pinIcon = L.divIcon({
        className: 'restroom-pin-marker',
        html: '<div style="width:28px;height:28px;background:#ef4444;border:2px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 3px 10px rgba(0,0,0,0.35);position:relative;"><div style="position:absolute;top:50%;left:50%;width:10px;height:10px;background:#ffffff;border-radius:999px;transform:translate(-50%,-50%) rotate(45deg);"></div></div>',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });

      const marker = L.marker([lat, lng], { icon: pinIcon }).addTo(this.map);
      marker.bindPopup(this.buildPinPopupHtml(restroom), {
        closeButton: false,
        autoPan: false,
        className: 'pin-hover-popup',
        offset: [0, -12],
      });
      marker.on('mouseover', () => this.openMarkerPopup(marker));
      marker.on('mouseout', () => this.schedulePopupClose(marker));
      marker.on('popupopen', () => this.attachPopupInteractivity(marker, restroom));
      marker.on('popupclose', () => this.resetPopupInteractionState());
      marker.on('click', () => {
        this.ngZone.run(() => this.openRestroomDetails(restroom));
      });
      this.restroomMarkers.push(marker);
      if (restroom._id) {
        this.restroomMarkerById.set(restroom._id, marker);
      }
    }
  }

  private openMarkerPopup(marker: L.Marker): void {
    this.isPointerInPopup = false;
    this.clearPopupCloseTimer();
    if (this.hoveredMarker && this.hoveredMarker !== marker) {
      this.hoveredMarker.closePopup();
    }
    this.hoveredMarker = marker;
    marker.openPopup();
  }

  private schedulePopupClose(marker: L.Marker): void {
    this.clearPopupCloseTimer();
    this.popupCloseTimer = window.setTimeout(() => {
      if (!this.isPointerInPopup) {
        marker.closePopup();
        if (this.hoveredMarker === marker) {
          this.hoveredMarker = undefined;
        }
      }
      this.popupCloseTimer = undefined;
    }, 220);
  }

  private clearPopupCloseTimer(): void {
    if (this.popupCloseTimer !== undefined) {
      window.clearTimeout(this.popupCloseTimer);
      this.popupCloseTimer = undefined;
    }
  }

  private resetPopupInteractionState(closeOpenPopup = false): void {
    this.clearPopupCloseTimer();
    this.isPointerInPopup = false;

    if (closeOpenPopup && this.hoveredMarker) {
      this.hoveredMarker.closePopup();
    }

    this.hoveredMarker = undefined;
  }

  private attachPopupInteractivity(marker: L.Marker, restroom: Restroom): void {
    const popup = marker.getPopup();
    const popupEl = popup?.getElement();
    if (!popupEl) return;

    if (!(popupEl as HTMLElement).dataset['boundHover']) {
      (popupEl as HTMLElement).dataset['boundHover'] = '1';
      popupEl.addEventListener('mouseenter', () => {
        this.isPointerInPopup = true;
        this.clearPopupCloseTimer();
      });
      popupEl.addEventListener('mouseleave', () => {
        this.isPointerInPopup = false;
        this.schedulePopupClose(marker);
      });
    }

    const popupRoot = popupEl.querySelector<HTMLElement>('.pin-popup');
    if (popupRoot && !popupRoot.dataset['boundOpen']) {
      popupRoot.dataset['boundOpen'] = '1';
      popupRoot.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        if (target.closest('a') || target.closest('button')) {
          return;
        }
        this.ngZone.run(() => this.openRestroomDetails(restroom));
      });
    }

    const directionsBtn = popupEl.querySelector<HTMLButtonElement>(`button[data-directions-id="${restroom._id}"]`);
    if (directionsBtn && !directionsBtn.dataset['boundDirections']) {
      directionsBtn.dataset['boundDirections'] = '1';
      directionsBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.ngZone.run(() => this.openDirections(restroom));
      });
    }

    const editBtn = popupEl.querySelector<HTMLButtonElement>(`button[data-edit-id="${restroom._id}"]`);
    if (editBtn && !editBtn.dataset['boundEdit']) {
      editBtn.dataset['boundEdit'] = '1';
      editBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.ngZone.run(() => this.openEditRestroom(restroom));
      });
    }
  }

  isRestroomOpen(restroom: Restroom): boolean {
    return this.locationService.isRestroomOpenNow(restroom);
  }

  getRatingLabel(restroom: Restroom): string {
    const rating = restroom.averageRating;
    if (!rating || rating <= 0) {
      return '0';
    }
    return `${rating.toFixed(1)}`;
  }

  getRatingsCount(restroom: Restroom): number {
    if (this.selectedRestroom?._id && restroom._id === this.selectedRestroom._id && this.selectedRestroomReviews.length > 0) {
      return this.selectedRestroomReviews.length;
    }
    const dynamic = restroom as Restroom & { ratingsCount?: number; reviewCount?: number; reviewsCount?: number };
    return dynamic.ratingsCount ?? dynamic.reviewCount ?? dynamic.reviewsCount ?? 0;
  }

  getOperatingTimeLabel(restroom: Restroom): string {
    const hours = restroom.operatingHours;
    if (!hours) return 'Hours not set';
    if (hours.is24Hours) return 'Open 24 hours';
    if (!hours.openTime || !hours.closeTime) return 'Hours not set';
    return `${hours.openTime} - ${hours.closeTime}`;
  }

  getAmenityTabs(restroom: Restroom): string[] {
    const amenities = restroom.amenities || [];
    if (amenities.length === 0) {
      return ['No amenities'];
    }

    const iconMap: Record<string, string> = {
      soap: 'Soap',
      tissue: 'Tissue',
      pwd: 'PWD',
      accessibility: 'PWD',
      accessible: 'PWD',
      spacious: 'Spacious',
      bidet: 'Bidet',
      clean: 'Clean',
      lock: 'Lock',
      'changing table': 'Changing Table',
      baby: 'Changing Table',
      child: 'Child Friendly',
    };

    return amenities.slice(0, 6).map((amenity) => {
      const lower = amenity.toLowerCase();
      const mapped = Object.keys(iconMap).find((key) => lower.includes(key));
      return mapped ? iconMap[mapped] : amenity;
    });
  }

  private buildPinPopupHtml(restroom: Restroom): string {
    const image = restroom.images && restroom.images.length > 0
      ? `<img class="pin-popup__image" src="${this.escapeHtml(restroom.images[0])}" alt="${this.escapeHtml(restroom.name || 'Restroom image')}" onerror="this.style.display='none'" />`
      : '';

    const amenities = this.getAmenityTabs(restroom)
      .map((amenity) => `<span class="pin-popup__chip">${this.escapeHtml(amenity)}</span>`)
      .join('');

    const isOpen = this.isRestroomOpen(restroom);
    const statusClass = isOpen ? 'pin-popup__status pin-popup__status--open' : 'pin-popup__status pin-popup__status--closed';
    const ratingsCount = this.getRatingsCount(restroom);
    const ratingsCountHtml = ratingsCount > 0 ? `<span class="pin-popup__rating-count">(${ratingsCount})</span>` : '';

    return `
      <div class="pin-popup">
        ${image}
        <div class="pin-popup__body">
          <div class="pin-popup__header">
            <div class="pin-popup__text">
              <div class="pin-popup__name">${this.escapeHtml(restroom.name || 'Restroom')}</div>
              <div class="pin-popup__address-row">
                <span class="pin-popup__address-icon" aria-hidden="true">${this.getAddressPinIconSvg()}</span>
                <div class="pin-popup__address">${this.escapeHtml(restroom.location?.address || 'No address available')}</div>
              </div>
              <div class="pin-popup__hours">${this.escapeHtml(this.getOperatingTimeLabel(restroom))}</div>
              <div class="${statusClass}">${isOpen ? 'Open now' : 'Closed now'}</div>
            </div>
            <div class="pin-popup__actions">
              <button type="button" class="pin-popup__btn pin-popup__btn--primary" data-directions-id="${this.escapeHtml(restroom._id || '')}" title="Get directions" aria-label="Get directions">${this.getDirectionsIconSvg()}</button>
              <button type="button" class="pin-popup__btn" data-edit-id="${this.escapeHtml(restroom._id || '')}" title="Edit restroom" aria-label="Edit restroom">${this.getEditIconSvg()}</button>
            </div>
          </div>
          <div class="pin-popup__meta">
            <span class="pin-popup__rating">${this.escapeHtml(this.getRatingLabel(restroom))}</span>
            <span class="pin-popup__star">★</span>
            ${ratingsCountHtml}
          </div>
          <div class="pin-popup__amenities">
            ${amenities}
          </div>
        </div>
      </div>
    `;
  }

  private getDirectionsIconSvg(): string {
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 11.5L21 3L12.5 21L10.4 13.6L3 11.5Z" fill="currentColor"/></svg>';
  }

  private getAddressPinIconSvg(): string {
    return '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 21.2C11.7 21.2 11.5 21.1 11.3 20.9C10 19.7 5 15.1 5 10.7C5 6.9 8 3.8 11.8 3.8C15.6 3.8 18.6 6.9 18.6 10.7C18.6 15.1 13.6 19.7 12.3 20.9C12.2 21.1 12 21.2 12 21.2Z" fill="currentColor"/><circle cx="11.8" cy="10.5" r="2.2" fill="white"/></svg>';
  }

  private getEditIconSvg(): string {
    return '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M3 17.8V21H6.2L17.4 9.8L14.2 6.6L3 17.8Z" fill="currentColor"/><path d="M18.7 8.5L15.5 5.3L17.1 3.7C17.5 3.3 18.2 3.3 18.6 3.7L20.3 5.4C20.7 5.8 20.7 6.5 20.3 6.9L18.7 8.5Z" fill="currentColor"/></svg>';
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  openDirections(restroom: Restroom, closeDetailsAfter = false): void {
    if (!this.map || !this.leaflet || !restroom.location?.latitude || !restroom.location?.longitude || !isPlatformBrowser(this.platformId)) {
      return;
    }

    if (closeDetailsAfter && this.detailModalOpen && !this.detailClosing) {
      this.closeRestroomDetails();
    }

    const origin = this.userPos || {
      lat: this.locationService.HAU_COORDS[0],
      lng: this.locationService.HAU_COORDS[1],
    };

    this.api.getDirections(
      { latitude: origin.lat, longitude: origin.lng },
      { latitude: restroom.location.latitude, longitude: restroom.location.longitude },
      'foot-walking'
    ).pipe(
      catchError((err) => {
        console.warn('[Home] Failed to fetch directions', err);
        return of(null);
      })
    ).subscribe((payload) => {
      this.ngZone.run(() => {
        const coordinates = this.extractDirectionsCoordinates(payload);
        if (coordinates.length < 2) {
          return;
        }

        const routeSummary = this.extractDirectionsSummary(payload);

        this.clearDirectionsRoute();
        const routeLine = this.leaflet.polyline(coordinates, {
          color: '#2563eb',
          weight: 5,
          opacity: 0.92,
          lineCap: 'round',
          lineJoin: 'round',
        }).addTo(this.map);

        this.directionsRouteLine = routeLine;

        this.map.fitBounds(routeLine.getBounds(), {
          padding: [36, 36],
          maxZoom: 17,
        });

        this.activeRouteTitle = restroom.name || 'Restroom';
        this.activeRouteDistanceLabel = this.formatRouteDistance(routeSummary.distanceMeters);
        this.activeRouteDurationLabel = this.formatRouteDuration(routeSummary.durationSeconds);
        this.cdr.detectChanges();
        this.forceUiRefresh();
      });
    });
  }

  hasActiveRouteCard(): boolean {
    return Boolean(this.directionsRouteLine && this.activeRouteTitle && this.activeRouteDistanceLabel && this.activeRouteDurationLabel);
  }

  clearActiveRoute(event?: Event): void {
    event?.stopPropagation();
    this.clearDirectionsRoute();
    this.cdr.detectChanges();
    this.forceUiRefresh();
  }

  private clearDirectionsRoute(): void {
    if (this.map && this.directionsRouteLine) {
      this.map.removeLayer(this.directionsRouteLine);
    }

    this.directionsRouteLine = undefined;
    this.activeRouteTitle = '';
    this.activeRouteDistanceLabel = '';
    this.activeRouteDurationLabel = '';
  }

  private extractDirectionsCoordinates(payload: unknown): Array<[number, number]> {
    const features = (payload as { features?: Array<{ geometry?: { coordinates?: Array<[number, number]> } }> } | null)?.features;
    const rawCoords = Array.isArray(features) ? features[0]?.geometry?.coordinates : undefined;

    if (!Array.isArray(rawCoords)) {
      return [];
    }

    return rawCoords
      .filter((point) => Array.isArray(point) && point.length >= 2)
      .map((point) => [Number(point[1]), Number(point[0])] as [number, number])
      .filter((point) => Number.isFinite(point[0]) && Number.isFinite(point[1]));
  }

  private extractDirectionsSummary(payload: unknown): { distanceMeters: number; durationSeconds: number } {
    const features = (payload as { features?: Array<{ properties?: { summary?: { distance?: number; duration?: number } } }> } | null)?.features;
    const summary = Array.isArray(features) ? features[0]?.properties?.summary : undefined;

    return {
      distanceMeters: Number(summary?.distance || 0),
      durationSeconds: Number(summary?.duration || 0),
    };
  }

  private formatRouteDistance(distanceMeters: number): string {
    if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) {
      return 'Distance unavailable';
    }

    if (distanceMeters < 1000) {
      return `${Math.round(distanceMeters)} m`;
    }

    return `${(distanceMeters / 1000).toFixed(1)} km`;
  }

  private formatRouteDuration(durationSeconds: number): string {
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      return 'ETA unavailable';
    }

    const totalMinutes = Math.max(1, Math.round(durationSeconds / 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) {
      return `${minutes} min`;
    }

    return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
  }

  saveRestroom(restroom: Restroom): void {
    if (!restroom._id) return;

    if (this.savedRestroomIds.has(restroom._id)) {
      this.savedRestroomIds.delete(restroom._id);
      this.syncSaveStateToPopup(restroom);
      return;
    }

    this.savedRestroomIds.add(restroom._id);
    this.syncSaveStateToPopup(restroom);
    this.api.saveRestroom(restroom._id).pipe(
      catchError((err) => {
        console.warn('[Home] Save restroom request failed; keeping local saved state.', err);
        return of(null);
      })
    ).subscribe();
  }

  private syncSaveStateToPopup(restroom: Restroom): void {
    if (!restroom._id) return;
    const marker = this.restroomMarkerById.get(restroom._id);
    if (!marker) return;

    marker.setPopupContent(this.buildPinPopupHtml(restroom));

    if (marker.isPopupOpen()) {
      this.attachPopupInteractivity(marker, restroom);
    }
  }

  isSaved(restroom: Restroom): boolean {
    return Boolean(restroom._id && this.savedRestroomIds.has(restroom._id));
  }

  private matchesSelectedAmenities(restroom: Restroom): boolean {
    const amenities = (restroom.amenities || []).map((item) => item.toLowerCase());
    for (const selected of this.selectedAmenities) {
      if (!this.amenityMatches(amenities, selected)) {
        return false;
      }
    }
    return true;
  }

  private amenityMatches(amenities: string[], selected: string): boolean {
    const amenityMap: Record<string, string[]> = {
      soap: ['soap'],
      tissue: ['tissue', 'toilet paper'],
      pwd: ['pwd', 'accessibility', 'accessible', 'wheelchair'],
      spacious: ['spacious'],
      bidet: ['bidet'],
      clean: ['clean'],
      lock: ['lock'],
      'changing-table': ['changing table', 'baby', 'child friendly'],
    };

    const needles = amenityMap[selected] || [selected];
    return needles.some((needle) => amenities.some((item) => item.includes(needle)));
  }

  focusRestroom(restroom: Restroom): void {
    if (!this.map || restroom.location?.latitude == null || restroom.location?.longitude == null) {
      return;
    }

    const lat = restroom.location.latitude;
    const lng = restroom.location.longitude;

    this.map.flyTo([lat, lng], Math.max(this.map.getZoom(), 16), {
      animate: true,
      duration: 0.8,
      easeLinearity: 0.25,
    });

    const marker = this.restroomMarkers.find((item) => {
      const markerLatLng = item.getLatLng();
      return Math.abs(markerLatLng.lat - lat) < 0.000001 && Math.abs(markerLatLng.lng - lng) < 0.000001;
    });

    if (marker) {
      this.openMarkerPopup(marker);
    }
  }

  openRestroomDetails(restroom: Restroom): void {
    this.resetPopupInteractionState(true);
    this.clearDetailCloseTimer();
    this.detailClosing = false;
    this.selectedRestroom = restroom;
    this.detailModalOpen = true;
    this.reviewsLoading = true;
    this.selectedRestroomReviews = [];
    this.modalSelectedImageIndex = 0;
    this.photoViewerOpen = false;
    this.photoViewerIndex = 0;
    this.photoUploadMsg = '';
    this.reviewRating = 0;
    this.reviewDisplayName = '';
    this.reviewComment = '';
    this.reviewSubmitMsg = '';
    this.focusRestroom(restroom);
    this.cdr.detectChanges();
    this.loadSelectedRestroomReviews();
  }

  closeRestroomDetails(): void {
    if (!this.detailModalOpen || this.detailClosing) {
      return;
    }

    this.detailClosing = true;
    this.clearDetailCloseTimer();
    this.detailCloseTimer = window.setTimeout(() => {
      this.detailModalOpen = false;
      this.detailClosing = false;
      this.selectedRestroom = null;
      this.selectedRestroomReviews = [];
      this.reviewsLoading = false;
      this.photoViewerOpen = false;
      this.reviewSubmitting = false;
      this.reviewSubmitMsg = '';
      this.photoUploadMsg = '';
      this.deleteRestroomConfirmOpen = false;
      this.deleteRestroomSubmitting = false;
      this.resetPopupInteractionState(true);
      this.detailCloseTimer = undefined;
      this.forceUiRefresh();
    }, 220);
  }

  requestDeleteSelectedRestroom(): void {
    if (!this.selectedRestroom?._id || this.deleteRestroomSubmitting) {
      return;
    }

    this.deleteRestroomConfirmOpen = true;
    this.forceUiRefresh();
  }

  cancelDeleteRestroom(): void {
    this.deleteRestroomConfirmOpen = false;
    this.deleteRestroomSubmitting = false;
    this.forceUiRefresh();
  }

  confirmDeleteRestroom(): void {
    const restroomId = this.selectedRestroom?._id;
    if (!restroomId || this.deleteRestroomSubmitting) {
      return;
    }

    this.deleteRestroomSubmitting = true;
    this.forceUiRefresh();

    this.api.deleteRestroom(restroomId).pipe(
      catchError((err) => {
        this.ngZone.run(() => {
          this.deleteRestroomSubmitting = false;
          this.deleteRestroomConfirmOpen = false;
          this.reviewSubmitMsg = err?.error?.message || 'Failed to delete restroom';
          this.forceUiRefresh();
        });
        return of(null);
      })
    ).subscribe((res) => {
      this.ngZone.run(() => {
        this.deleteRestroomSubmitting = false;
        if (!res) {
          return;
        }

        this.deleteRestroomConfirmOpen = false;
        this.savedRestroomIds.delete(restroomId);
        this.allRestrooms = this.allRestrooms.filter((item) => item._id !== restroomId);
        this.applyFilters();
        this.closeRestroomDetails();
      });
    });
  }

  selectModalImage(index: number): void {
    this.modalSelectedImageIndex = index;
  }

  getSelectedModalImage(): string {
    const images = this.selectedRestroom?.images || [];
    if (images.length === 0) {
      return '';
    }
    if (this.modalSelectedImageIndex < 0 || this.modalSelectedImageIndex >= images.length) {
      this.modalSelectedImageIndex = 0;
    }
    return images[this.modalSelectedImageIndex] || '';
  }

  openPhotoViewer(index = 0): void {
    const images = this.selectedRestroom?.images || [];
    if (images.length === 0) {
      return;
    }
    this.photoViewerIndex = Math.max(0, Math.min(index, images.length - 1));
    this.photoViewerOpen = true;
  }

  closePhotoViewer(): void {
    this.photoViewerOpen = false;
  }

  getPhotoViewerImage(): string {
    const images = this.selectedRestroom?.images || [];
    if (images.length === 0) {
      return '';
    }
    if (this.photoViewerIndex < 0 || this.photoViewerIndex >= images.length) {
      this.photoViewerIndex = 0;
    }
    return images[this.photoViewerIndex] || '';
  }

  prevPhoto(): void {
    const images = this.selectedRestroom?.images || [];
    if (images.length === 0) return;
    this.photoViewerIndex = (this.photoViewerIndex - 1 + images.length) % images.length;
  }

  nextPhoto(): void {
    const images = this.selectedRestroom?.images || [];
    if (images.length === 0) return;
    this.photoViewerIndex = (this.photoViewerIndex + 1) % images.length;
  }

  onModalPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.selectedRestroom?._id) {
      return;
    }

    const currentImageCount = this.selectedRestroom.images?.length || 0;
    if (currentImageCount >= 5) {
      this.photoUploadMsg = 'Maximum 5 photos allowed';
      input.value = '';
      this.forceUiRefresh();
      return;
    }

    const reader = new FileReader();
    this.photoUploading = true;
    this.photoUploadMsg = 'Uploading photo...';
    this.forceUiRefresh();

    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) {
        this.ngZone.run(() => {
          this.photoUploading = false;
          this.photoUploadMsg = 'Failed to read photo';
          this.forceUiRefresh();
        });
        return;
      }

      this.api.addRestroomPhoto(this.selectedRestroom!._id, dataUrl).pipe(
        catchError((err) => {
          this.ngZone.run(() => {
            const msg = err?.error?.message || 'Failed to upload photo';
            this.photoUploading = false;
            this.photoUploadMsg = msg;
            this.forceUiRefresh();
          });
          return of(null);
        })
      ).subscribe((updated) => {
        this.ngZone.run(() => {
          this.photoUploading = false;
          if (!updated) {
            this.forceUiRefresh();
            return;
          }

          const updatedRestroom = updated as Restroom;
          const nextImages = updatedRestroom.images || this.selectedRestroom?.images || [];

          if (this.selectedRestroom) {
            this.selectedRestroom.images = nextImages;
          }

          this.syncRestroomImagesInLists(updatedRestroom._id || this.selectedRestroom?._id, nextImages);
          this.photoUploadMsg = 'Photo uploaded';
          this.syncSaveStateToPopup(updatedRestroom);
          this.forceUiRefresh();
        });
      });
    };

    reader.onerror = () => {
      this.ngZone.run(() => {
        this.photoUploading = false;
        this.photoUploadMsg = 'Failed to read photo';
        this.forceUiRefresh();
      });
    };

    reader.readAsDataURL(file);
    input.value = '';
  }

  removeModalPhoto(index: number, event?: Event): void {
    event?.stopPropagation();

    if (!this.selectedRestroom?._id) {
      return;
    }

    const currentImageCount = this.selectedRestroom.images?.length || 0;
    if (currentImageCount <= 1) {
      this.photoUploadMsg = 'At least 1 photo is required';
      this.forceUiRefresh();
      return;
    }

    this.pendingPhotoRemoveIndex = index;
    this.removePhotoConfirmOpen = true;
    this.forceUiRefresh();
  }

  cancelRemoveModalPhoto(): void {
    this.removePhotoConfirmOpen = false;
    this.pendingPhotoRemoveIndex = null;
    this.forceUiRefresh();
  }

  confirmRemoveModalPhoto(): void {
    const restroomId = this.selectedRestroom?._id;
    const index = this.pendingPhotoRemoveIndex;
    if (!restroomId || index == null) {
      this.cancelRemoveModalPhoto();
      return;
    }

    if ((this.selectedRestroom?.images?.length || 0) <= 1) {
      this.photoUploadMsg = 'At least 1 photo is required';
      this.pendingPhotoRemoveIndex = null;
      this.removePhotoConfirmOpen = false;
      this.forceUiRefresh();
      return;
    }

    this.photoUploading = true;
    this.photoUploadMsg = 'Removing photo...';
    this.removePhotoConfirmOpen = false;
    this.forceUiRefresh();

    this.api.removeRestroomPhoto(restroomId, index).pipe(
      catchError((err) => {
        this.ngZone.run(() => {
          this.photoUploading = false;
          this.photoUploadMsg = err?.error?.message || 'Failed to remove photo';
          this.pendingPhotoRemoveIndex = null;
          this.forceUiRefresh();
        });
        return of(null);
      })
    ).subscribe((updated) => {
      this.ngZone.run(() => {
        this.photoUploading = false;
        if (!updated) {
          this.forceUiRefresh();
          return;
        }

        const updatedRestroom = updated as Restroom;
        const nextImages = updatedRestroom.images || [];

        if (this.selectedRestroom) {
          this.selectedRestroom.images = nextImages;
        }

        if (nextImages.length === 0) {
          this.modalSelectedImageIndex = 0;
        } else if (this.modalSelectedImageIndex >= nextImages.length) {
          this.modalSelectedImageIndex = nextImages.length - 1;
        }

        this.syncRestroomImagesInLists(updatedRestroom._id || restroomId, nextImages);
        this.photoUploadMsg = 'Photo removed';
        this.pendingPhotoRemoveIndex = null;
        this.syncSaveStateToPopup(updatedRestroom);
        this.forceUiRefresh();
      });
    });
  }

  private syncRestroomImagesInLists(restroomId: string | undefined, images: string[]): void {
    if (!restroomId) return;

    const updateList = (list: Restroom[]): void => {
      for (const restroom of list) {
        if (restroom._id === restroomId) {
          restroom.images = images;
        }
      }
    };

    updateList(this.allRestrooms);
    updateList(this.filteredRestrooms);
  }

  private loadSelectedRestroomReviews(): void {
    const restroomId = this.selectedRestroom?._id;
    if (!restroomId) {
      this.selectedRestroomReviews = [];
      this.reviewsLoading = false;
      this.forceUiRefresh();
      return;
    }

    this.reviewsLoading = true;
    this.forceUiRefresh();

    this.api.getReviews(restroomId).pipe(
      catchError((err) => {
        console.warn('[Home] Failed to load restroom reviews', err);
        return of([] as RestroomReview[]);
      })
    ).subscribe((reviewsPayload) => {
      this.ngZone.run(() => {
        const extractedReviews = this.extractReviewsFromPayload(reviewsPayload);
        this.selectedRestroomReviews = extractedReviews;
        this.reviewsLoading = false;
        this.updateSelectedRestroomRatingFromReviews();
        this.forceUiRefresh();
        window.setTimeout(() => this.forceUiRefresh(), 0);
      });
    });
  }

  private extractReviewsFromPayload(payload: unknown): RestroomReview[] {
    if (Array.isArray(payload)) {
      return [...payload] as RestroomReview[];
    }

    if (payload && typeof payload === 'object') {
      const asRecord = payload as Record<string, unknown>;
      const nested = asRecord['reviews'];
      if (Array.isArray(nested)) {
        return [...nested] as RestroomReview[];
      }
    }

    return [];
  }

  private forceUiRefresh(): void {
    if (this.uiRefreshScheduled) {
      return;
    }

    this.uiRefreshScheduled = true;
    queueMicrotask(() => {
      this.uiRefreshScheduled = false;
      this.cdr.detectChanges();
    });
  }

  submitModalReview(): void {
    const restroomId = this.selectedRestroom?._id;
    if (!restroomId || this.reviewSubmitting) {
      return;
    }

    if (this.reviewRating < 1 || this.reviewRating > 5) {
      this.reviewSubmitMsg = 'Please select a rating (1-5)';
      this.forceUiRefresh();
      return;
    }

    this.reviewSubmitting = true;
    this.reviewSubmitMsg = '';

    this.api.addReview(restroomId, this.reviewRating, this.reviewComment.trim(), this.reviewDisplayName.trim()).pipe(
      catchError((err) => {
        const msg = err?.error?.message || 'Failed to post review';
        this.reviewSubmitMsg = msg;
        return of(null);
      })
    ).subscribe((res) => {
      this.ngZone.run(() => {
        this.reviewSubmitting = false;
        if (!res) {
          this.forceUiRefresh();
          return;
        }
        this.reviewComment = '';
        this.reviewDisplayName = '';
        this.reviewRating = 0;
        this.reviewSubmitMsg = 'Review posted';
        this.forceUiRefresh();
        this.loadSelectedRestroomReviews();
      });
    });
  }

  getReviewAuthor(review: RestroomReview): string {
    if (review.displayName && review.displayName.trim()) {
      return review.displayName.trim();
    }
    if (typeof review.user === 'string') {
      return 'Guest';
    }
    return review.user?.username || 'Guest';
  }

  getModalAverageRating(): string {
    if (this.selectedRestroomReviews.length === 0) {
      return this.getRatingLabel(this.selectedRestroom as Restroom);
    }

    const total = this.selectedRestroomReviews.reduce((sum, item) => sum + (item.rating || 0), 0);
    const avg = total / this.selectedRestroomReviews.length;
    return Number.isFinite(avg) ? avg.toFixed(1) : '0';
  }

  private updateSelectedRestroomRatingFromReviews(): void {
    if (!this.selectedRestroom?._id) return;

    const reviewCount = this.selectedRestroomReviews.length;
    const averageRating = reviewCount === 0
      ? 0
      : this.selectedRestroomReviews.reduce((sum, item) => sum + (item.rating || 0), 0) / reviewCount;

    this.syncRestroomReviewSummaryInLists(this.selectedRestroom._id, averageRating, reviewCount);
    this.selectedRestroom.averageRating = averageRating;

    const selectedDynamic = this.selectedRestroom as Restroom & { ratingsCount?: number; reviewCount?: number; reviewsCount?: number };
    selectedDynamic.ratingsCount = reviewCount;
    selectedDynamic.reviewCount = reviewCount;
    selectedDynamic.reviewsCount = reviewCount;

    // Recompute filtered list/markers so results cards reflect latest rating/count immediately.
    this.applyFilters();
    this.syncSaveStateToPopup(this.selectedRestroom);
  }

  private syncRestroomReviewSummaryInLists(restroomId: string, averageRating: number, reviewCount: number): void {
    const apply = (restroom: Restroom): void => {
      restroom.averageRating = averageRating;
      const dynamic = restroom as Restroom & { ratingsCount?: number; reviewCount?: number; reviewsCount?: number };
      dynamic.ratingsCount = reviewCount;
      dynamic.reviewCount = reviewCount;
      dynamic.reviewsCount = reviewCount;
    };

    const updateList = (list: Restroom[]): void => {
      for (const restroom of list) {
        if (restroom._id === restroomId) {
          apply(restroom);
        }
      }
    };

    updateList(this.allRestrooms);
    updateList(this.filteredRestrooms);
    this.refreshResultsCardsImmediately();
  }

  private refreshResultsCardsImmediately(): void {
    // Immediate refresh.
    this.allRestrooms = [...this.allRestrooms];
    this.filteredRestrooms = [...this.filteredRestrooms];
    this.forceUiRefresh();

    // Queued refresh for environments where render lands on the next turn.
    window.setTimeout(() => {
      this.allRestrooms = [...this.allRestrooms];
      this.filteredRestrooms = [...this.filteredRestrooms];
      this.forceUiRefresh();
    }, 0);
  }

  toggleResultsCollapsed(event?: Event): void {
    event?.stopPropagation();
    if (this.filteredRestrooms.length === 0) {
      this.isResultsCollapsed = false;
      return;
    }
    this.isResultsCollapsed = !this.isResultsCollapsed;
  }

  onResultsWheel(event: WheelEvent): void {
    const target = event.currentTarget as HTMLElement | null;
    if (!target) {
      return;
    }

    const dominantDelta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    if (dominantDelta === 0) {
      return;
    }

    event.preventDefault();
    target.scrollBy({ left: dominantDelta, behavior: 'auto' });
  }

  recenterToCurrentLocation(): void {
    if (!this.map) return;

    const center = this.userPos || {
      lat: this.locationService.HAU_COORDS[0],
      lng: this.locationService.HAU_COORDS[1],
    };

    const targetZoom = Math.max(this.map.getZoom(), 14);
    this.map.flyTo([center.lat, center.lng], targetZoom, {
      animate: true,
      duration: 1.2,
      easeLinearity: 0.25,
    });
  }

  private updateUserMarker(): void {
    if (!this.map || !this.leaflet) return;
    const L = this.leaflet;

    const center = this.userPos || {
      lat: this.locationService.HAU_COORDS[0],
      lng: this.locationService.HAU_COORDS[1],
    };

    const isLive = this.locationEnabled;
    const markerColor = '#2563EB';
    const label = isLive ? 'You are here (Live)' : 'You are here (Demo)';

    const userIcon = L.divIcon({
      className: 'user-location-marker',
      html: `<div style="background-color:${markerColor};width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 0 12px rgba(0,0,0,0.35);"></div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    if (this.userMarker) {
      this.userMarker.setLatLng(center);
      this.userMarker.setIcon(userIcon);
      this.userMarker.bindPopup(label);
      this.updateRadiusCircle();
      return;
    }

    this.userMarker = L.marker(center, { icon: userIcon }).addTo(this.map).bindPopup(label);
    this.updateRadiusCircle();
  }

  private updateRadiusCircle(): void {
    if (!this.map || !this.leaflet) return;
    const L = this.leaflet;

    const center = this.userPos || {
      lat: this.locationService.HAU_COORDS[0],
      lng: this.locationService.HAU_COORDS[1],
    };

    const radiusMeters = Math.max(100, this.radiusKm * 1000);

    if (!this.radiusCircle) {
      this.radiusCircle = L.circle([center.lat, center.lng], {
        radius: radiusMeters,
        color: '#2563eb',
        weight: 1,
        opacity: 0.35,
        fillColor: '#2563eb',
        fillOpacity: 0.08,
        interactive: false,
      }).addTo(this.map);
      return;
    }

    this.radiusCircle.setLatLng([center.lat, center.lng]);
    this.radiusCircle.setRadius(radiusMeters);
  }
}
