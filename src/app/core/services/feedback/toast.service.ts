import { Service, signal } from '@angular/core';

export type ToastType = 'error' | 'success' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

@Service()
export class ToastService {
  private static readonly MAX_TOASTS = 5;
  private static readonly DISMISS_AFTER_MS = 5000;

  readonly toasts = signal<Toast[]>([]);

  private nextId = 0;

  error(message: string): void {
    this.show(message, 'error');
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  info(message: string): void {
    this.show(message, 'info');
  }

  show(message: string, type: ToastType): void {
    const id = ++this.nextId;

    this.toasts.update((current) => {
      const next = [...current, { id, type, message }];
      return next.length > ToastService.MAX_TOASTS
        ? next.slice(next.length - ToastService.MAX_TOASTS)
        : next;
    });

    setTimeout(() => this.dismiss(id), ToastService.DISMISS_AFTER_MS);
  }

  dismiss(id: number): void {
    this.toasts.update((current) => current.filter((toast) => toast.id !== id));
  }
}