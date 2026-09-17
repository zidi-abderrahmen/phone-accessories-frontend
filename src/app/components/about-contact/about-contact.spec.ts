import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { activatedRouteProvider } from '../../testing/activated-route-mock';


import { AboutContact } from './about-contact';

describe('AboutContact', () => {
  let component: AboutContact;
  let fixture: ComponentFixture<AboutContact>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AboutContact],
      providers: [
        provideHttpClientTesting(),
        activatedRouteProvider,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AboutContact);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the real contact details', () => {
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('zd.abderrahmen@gmail.com');
    expect(text).toContain('+216 12 345 678');
    expect(text).toContain('Bizerte, Tunisia');
  });

  it('labels the form as a demo instead of pretending to send', () => {
    const text = fixture.nativeElement.textContent as string;

    expect(text).toContain('does not send anything yet');
  });

  it('tells the user nothing was sent after submitting', () => {
    component.contactForm.setValue({
      name: 'Test User',
      email: 'test@example.com',
      subject: 'other',
      message: 'This is a long enough demo message.',
    });

    component.onSubmit();
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(component.submitStatus()).toBe('success');
    expect(text).toContain('Nothing was sent.');
    expect(text).toContain("isn't connected to an inbox yet");
  });
});
