import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { activatedRouteProvider } from '../../../testing/activated-route-mock';


import { CreateAccessory } from './create-accessory';

describe('CreateAccessory', () => {
  let component: CreateAccessory;
  let fixture: ComponentFixture<CreateAccessory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateAccessory],
      providers: [
        provideHttpClientTesting(),
        activatedRouteProvider,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateAccessory);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
