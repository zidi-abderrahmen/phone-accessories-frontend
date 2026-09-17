import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { activatedRouteProvider } from '../../testing/activated-route-mock';


import { CategoryDetails } from './category-details';

describe('CategoryDetails', () => {
  let component: CategoryDetails;
  let fixture: ComponentFixture<CategoryDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryDetails],
      providers: [
        provideHttpClientTesting(),
        activatedRouteProvider,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
