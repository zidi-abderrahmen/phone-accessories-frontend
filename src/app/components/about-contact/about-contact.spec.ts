import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AboutContact } from './about-contact';

describe('AboutContact', () => {
  let component: AboutContact;
  let fixture: ComponentFixture<AboutContact>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AboutContact],
    }).compileComponents();

    fixture = TestBed.createComponent(AboutContact);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
