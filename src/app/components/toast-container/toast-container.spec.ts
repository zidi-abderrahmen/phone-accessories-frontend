import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ToastContainer } from './toast-container';
import { ToastService } from '../../core/services/feedback/toast.service';

describe('ToastContainer', () => {
  let fixture: ComponentFixture<ToastContainer>;
  let toastService: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToastContainer],
    }).compileComponents();

    toastService = TestBed.inject(ToastService);
    fixture = TestBed.createComponent(ToastContainer);
    fixture.detectChanges();
  });

  it('renders queued toasts', () => {
    toastService.error('Something went wrong');
    toastService.success('Saved successfully');
    fixture.detectChanges();

    const messages = fixture.nativeElement.querySelectorAll('.toast__message');
    expect(messages).toHaveLength(2);
    expect(messages[0].textContent).toContain('Something went wrong');
    expect(messages[1].textContent).toContain('Saved successfully');
  });

  it('dismisses a toast when its close button is clicked', () => {
    toastService.info('Heads up');
    fixture.detectChanges();

    const closeButton = fixture.nativeElement.querySelector('.toast__close');
    closeButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('.toast')).toHaveLength(0);
  });
});