import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';

import { InputField } from './input-field';

describe('InputField', () => {
  let component: InputField;
  let fixture: ComponentFixture<InputField>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InputField],
    }).compileComponents();

    fixture = TestBed.createComponent(InputField);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('control', new FormControl(''));
    fixture.componentRef.setInput('inputId', 'name');
    fixture.componentRef.setInput('label', 'Name');
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});