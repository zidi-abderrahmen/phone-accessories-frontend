import { TestBed } from '@angular/core/testing';

import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  it('queues toasts in order', () => {
    service.error('First');
    service.success('Second');

    expect(service.toasts().map((toast) => toast.message)).toEqual(['First', 'Second']);
  });

  it('caps the queue and keeps the newest toasts', () => {
    for (let i = 1; i <= 7; i++) {
      service.info(`Toast ${i}`);
    }

    expect(service.toasts()).toHaveLength(5);
    expect(service.toasts().map((toast) => toast.message)).toEqual([
      'Toast 3',
      'Toast 4',
      'Toast 5',
      'Toast 6',
      'Toast 7',
    ]);
  });

  it('auto-dismisses after the configured period', () => {
    vi.useFakeTimers();
    try {
      service.error('Boom');

      expect(service.toasts()).toHaveLength(1);

      vi.advanceTimersByTime(5000);
      expect(service.toasts()).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('dismisses a single toast by id', () => {
    service.info('One');
    service.error('Two');

    service.dismiss(service.toasts()[0].id);

    expect(service.toasts().map((toast) => toast.message)).toEqual(['Two']);
  });
});