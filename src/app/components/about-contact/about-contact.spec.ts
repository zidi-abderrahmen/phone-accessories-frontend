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
});
