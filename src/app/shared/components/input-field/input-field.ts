import { Component, computed, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-input-field',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './input-field.html',
  styleUrl: './input-field.scss',
})
export class InputField {
  control = input.required<FormControl>();

  inputId = input.required<string>();

  label = input.required<string>();

  type = input<string>('text');

  placeholder = input<string>('');

  autocomplete = input<string>('off');

  errorMessages = input<Record<string, string>>({});

  helperText = input<string>('');

  required = input<boolean>(false);

  readonly = input<boolean>(false);

  activeErrors = computed<string[]>(() => {
    const errors = this.control().errors;
    if (!errors) return [];

    return Object.keys(errors)
      .filter(key => this.errorMessages()[key])
      .map(key => this.errorMessages()[key]);
  });

  get describedById(): string | null {
    const c = this.control();
    if (c.invalid && c.touched) {
      return `${this.inputId()}-error`;
    }
    if (this.helperText()) {
      return `${this.inputId()}-hint`;
    }
    return null;
  }
}