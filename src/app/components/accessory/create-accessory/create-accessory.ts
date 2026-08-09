import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal, HostListener } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AccessoryRequest } from '../../../core/models/accessory/accessory-request';
import { AccessoryResponse } from '../../../core/models/accessory/accessory-response';
import { CategoryResponse } from '../../../core/models/category/category-response';
import { AccessoryService } from '../../../core/services/accessory/accessory.service';
import { CategoryService } from '../../../core/services/category/category.service';
import { InputField } from '../../../shared/components/input-field/input-field';

@Component({
  selector: 'app-accessory-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, InputField],
  templateUrl: './create-accessory.html',
  styleUrl: './create-accessory.scss',
})
export class CreateAccessory implements OnInit {
  private fb = inject(FormBuilder);
  private accessoryService = inject(AccessoryService);
  private categoryService = inject(CategoryService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Reactive form built from AccessoryRequest DTO
  accessoryForm = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', [Validators.required, Validators.maxLength(1000)]],
    productCode: ['', [Validators.required, Validators.maxLength(50)]],
    categoryId: [null as number | null, [Validators.required]],
    price: [0, [Validators.required, Validators.min(0.01)]],
    stock: [0, [Validators.required, Validators.min(0)]],
  });

  // Mode detection
  isEditMode = false;
  accessoryId: number | null = null;

  // Categories data
  categories: CategoryResponse[] = [];
  filteredCategories: CategoryResponse[] = [];
  selectedCategoryName = '';

  // Autocomplete state
  showCategoryDropdown = false;
  highlightedIndex = -1;

  // UI state
  submitted = false;
  loading = signal(false);
  loadingData = signal(false);
  loadingCategories = signal(false);
  successMessage = '';
  errorMessage = '';

  get f() {
    return this.accessoryForm.controls;
  }

  get pageTitle(): string {
    return this.isEditMode ? 'Edit Accessory' : 'Create Accessory';
  }

  get submitButtonText(): string {
    return this.isEditMode ? 'Update Accessory' : 'Save Accessory';
  }

  ngOnInit(): void {
    this.loadCategories();
    this.detectEditMode();
  }

  // ------------------------------------------------------------------
  // Mode Detection
  // ------------------------------------------------------------------

  private detectEditMode(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = Number(idParam);
      if (!isNaN(id) && id > 0) {
        this.isEditMode = true;
        this.accessoryId = id;
        this.loadAccessory(id);
      } else {
        this.errorMessage = 'Invalid accessory ID provided in the URL.';
      }
    }
  }

  // ------------------------------------------------------------------
  // Data Loading
  // ------------------------------------------------------------------

  private loadCategories(): void {
    this.loadingCategories.set(true);
    this.categoryService.getAllCategories(0, 100).subscribe({
      next: (response) => {
        this.categories = response.content;
        this.filteredCategories = [...this.categories];
        this.loadingCategories.set(false);
      },
      error: () => {
        this.loadingCategories.set(false);
        this.errorMessage = 'Failed to load categories. Please refresh and try again.';
      },
    });
  }

  private loadAccessory(id: number): void {
    this.loadingData.set(true);
    this.accessoryService.getAccessoryById(id).subscribe({
      next: (accessory) => {
        this.patchForm(accessory);
        this.loadingData.set(false);
      },
      error: (err) => {
        this.loadingData.set(false);
        this.handleLoadError(err);
      },
    });
  }

  private patchForm(accessory: AccessoryResponse): void {
    this.accessoryForm.patchValue({
      title: accessory.title,
      description: accessory.description,
      productCode: accessory.productCode,
      categoryId: accessory.category.id,
      price: accessory.price,
      stock: accessory.stock,
    });
    this.selectedCategoryName = accessory.category.name;
  }

  // ------------------------------------------------------------------
  // Autocomplete Logic
  // ------------------------------------------------------------------

  openCategoryDropdown(): void {
    this.filterCategories(this.selectedCategoryName);
    this.showCategoryDropdown = true;
    this.highlightedIndex = -1;
  }

  closeCategoryDropdown(): void {
    this.showCategoryDropdown = false;
    this.highlightedIndex = -1;
  }

  onCategorySearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.selectedCategoryName = value;
    this.filterCategories(value);
    this.showCategoryDropdown = true;
    this.highlightedIndex = -1;
  }

  private filterCategories(query: string): void {
    const term = query.trim().toLowerCase();
    if (!term) {
      this.filteredCategories = [...this.categories];
      return;
    }
    this.filteredCategories = this.categories.filter((c) =>
      c.name.toLowerCase().includes(term)
    );
  }

  selectCategory(category: CategoryResponse): void {
    this.f.categoryId.setValue(category.id);
    this.selectedCategoryName = category.name;
    this.closeCategoryDropdown();
  }

  onCategoryKeydown(event: KeyboardEvent): void {
    if (!this.showCategoryDropdown) {
      if (event.key === 'ArrowDown' || event.key === 'Enter') {
        event.preventDefault();
        this.openCategoryDropdown();
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.highlightedIndex =
          this.highlightedIndex < this.filteredCategories.length - 1
            ? this.highlightedIndex + 1
            : 0;
        this.scrollToHighlighted();
        break;

      case 'ArrowUp':
        event.preventDefault();
        this.highlightedIndex =
          this.highlightedIndex > 0
            ? this.highlightedIndex - 1
            : this.filteredCategories.length - 1;
        this.scrollToHighlighted();
        break;

      case 'Enter':
        event.preventDefault();
        if (
          this.highlightedIndex >= 0 &&
          this.highlightedIndex < this.filteredCategories.length
        ) {
          this.selectCategory(this.filteredCategories[this.highlightedIndex]);
        }
        break;

      case 'Escape':
        event.preventDefault();
        this.closeCategoryDropdown();
        break;

      case 'Tab':
        this.closeCategoryDropdown();
        break;
    }
  }

  onCategoryBlur(): void {
    // Delay to allow click events on listbox items to fire first
    setTimeout(() => {
      this.closeCategoryDropdown();
      // If no valid category is selected, clear the input
      const currentId = this.f.categoryId.value;
      const match = this.categories.find((c) => c.id === currentId);
      if (!match) {
        this.selectedCategoryName = '';
        this.f.categoryId.setValue(null);
      } else {
        this.selectedCategoryName = match.name;
      }
    }, 150);
  }

  private scrollToHighlighted(): void {
    const el = document.getElementById(
      'category-option-' + this.highlightedIndex
    );
    if (el) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.autocomplete-wrapper')) {
      this.closeCategoryDropdown();
    }
  }

  // ------------------------------------------------------------------
  // Form Submission
  // ------------------------------------------------------------------

  onSubmit(): void {
    this.submitted = true;
    this.successMessage = '';
    this.errorMessage = '';

    if (this.accessoryForm.invalid) {
      return;
    }

    this.loading.set(true);
    const rawFormValue = this.accessoryForm.getRawValue();
    const request: AccessoryRequest = {
      ...rawFormValue,
      categoryId: rawFormValue.categoryId!
    };

    if (this.isEditMode && this.accessoryId !== null) {
      this.updateAccessory(this.accessoryId, request);
    } else {
      this.createAccessory(request);
    }
  }

  private createAccessory(request: AccessoryRequest): void {
    this.accessoryService.createAccessory(request).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.successMessage = `Accessory "${response.title}" created successfully!`;
        setTimeout(() => {
          this.router.navigate(['/admin/accessories']);
        }, 1500);
      },
      error: (err) => this.handleApiError(err),
    });
  }

  private updateAccessory(id: number, request: AccessoryRequest): void {
    this.accessoryService.updateAccessory(id, request).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.successMessage = `Accessory "${response.title}" updated successfully!`;
        setTimeout(() => {
          this.router.navigate(['/admin/accessories']);
        }, 1500);
      },
      error: (err) => this.handleApiError(err),
    });
  }

  // ------------------------------------------------------------------
  // Error Handlers
  // ------------------------------------------------------------------

  private handleLoadError(err: any): void {
    if (err.status === 404) {
      this.errorMessage = 'Accessory not found.';
    } else if (err.status === 403) {
      this.errorMessage = 'You do not have permission to view this accessory.';
    } else if (err.status === 0) {
      this.errorMessage = 'Unable to connect to the server. Please check your connection.';
    } else {
      this.errorMessage = 'Failed to load accessory data. Please try again later.';
    }
  }

  private handleApiError(err: any): void {
    this.loading.set(false);

    if (err.status === 400) {
      if (err.error?.message) {
        this.errorMessage = err.error.message;
      } else if (Array.isArray(err.error?.errors)) {
        this.errorMessage = err.error.errors
          .map((e: any) => e.defaultMessage || e.message)
          .join(' • ');
      } else {
        this.errorMessage = 'Invalid data submitted. Please check all fields.';
      }
    } else if (err.status === 403) {
      this.errorMessage = 'You do not have permission to perform this action.';
    } else if (err.status === 404) {
      this.errorMessage = 'Accessory not found. It may have been deleted.';
    } else if (err.status === 409) {
      this.errorMessage = 'An accessory with this product code already exists.';
    } else {
      this.errorMessage = 'An error occurred while saving. Please try again later.';
    }
  }
}