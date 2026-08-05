import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-input-field',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './input-field.html',
  styleUrl: './input-field.scss',
})
export class InputField {

  @Input({ required: true }) control!: FormControl;
  @Input({ required: true }) inputId!: string;
  @Input({ required: true }) label!: string;
  @Input() type: string = 'text';
  @Input() placeholder: string = '';
  @Input() autocomplete: string = 'off';
  @Input() errorMessages: Record<string, string> = {};

  get activeErrors(): string[] {
    if (!this.control?.errors) return [];
    
    return Object.keys(this.control.errors)
      .filter(key => this.errorMessages[key])
      .map(key => this.errorMessages[key]);
  }
}
