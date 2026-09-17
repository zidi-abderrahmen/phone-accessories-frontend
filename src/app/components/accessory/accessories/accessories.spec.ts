import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { activatedRouteProvider } from '../../../testing/activated-route-mock';


import { Accessories } from './accessories';

describe('Accessories', () => {
  let component: Accessories;
  let fixture: ComponentFixture<Accessories>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Accessories],
      providers: [
        provideHttpClientTesting(),
        activatedRouteProvider,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Accessories);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
