import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CategoryRequest } from '../../core/models/category/category-request';
import { CategoryService } from '../../core/services/category/category.service';
import { InputField } from '../../shared/components/input-field/input-field';

@Component({
  selector: 'app-create-category',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, InputField],
  templateUrl: './create-category.html',
  styleUrl: './create-category.scss',
})
export class CreateCategory implements OnInit {
  private fb = inject(FormBuilder);
  private categoryService = inject(CategoryService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Reactive form with non-nullable controls for strict typing
  categoryForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(50)]],
    description: ['', [Validators.required, Validators.maxLength(500)]],
    imageUrl: ['', [Validators.required, Validators.maxLength(500)]],
  });

  // Mode detection
  isEditMode = false;
  categoryId: number | null = null;

  // UI state flags
  submitted = false;
  loading = signal(false);
  pageLoading = signal(false); // Used only when fetching existing data in edit mode
  successMessage = '';
  errorMessage = '';

  // Convenience getter for form controls
  get f() {
    return this.categoryForm.controls;
  }

  // Dynamic page title based on mode
  get pageTitle(): string {
    return this.isEditMode ? 'Edit Category' : 'Create Category';
  }

  // Dynamic button text based on mode and loading state
  get submitButtonText(): string {
    if (this.loading()) {
      return this.isEditMode ? 'Updating...' : 'Creating...';
    }
    return this.isEditMode ? 'Update Category' : 'Create Category';
  }

  ngOnInit(): void {
    // Detect edit mode by checking for :id route parameter
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      const id = Number(idParam);
      if (!isNaN(id) && id > 0) {
        this.isEditMode = true;
        this.categoryId = id;
        this.loadCategory(id);
      } else {
        this.errorMessage = 'Invalid category ID provided in the URL.';
      }
    }
  }

  // Fetch existing category data and prefill the form
  private loadCategory(id: number): void {
    this.pageLoading.set(true);
    this.categoryService.getCategoryById(id).subscribe({
      next: (category) => {
        this.categoryForm.patchValue({
          name: category.name,
          description: category.description,
          imageUrl: category.imageUrl,
        });
        this.pageLoading.set(false);
      },
      error: (err) => {
        this.pageLoading.set(false);
        if (err.status === 404) {
          this.errorMessage = 'Category not found.';
        } else if (err.status === 403) {
          this.errorMessage = 'You do not have permission to view this category.';
        } else {
          this.errorMessage = 'Failed to load category data. Please try again later.';
        }
      },
    });
  }

  onSubmit(): void {
    this.submitted = true;
    this.successMessage = '';
    this.errorMessage = '';

    if (this.categoryForm.invalid) {
      return;
    }

    this.loading.set(true);
    const request: CategoryRequest = this.categoryForm.getRawValue();

    if (this.isEditMode && this.categoryId !== null) {
      this.updateCategory(this.categoryId, request);
    } else {
      this.createCategory(request);
    }
  }

  private createCategory(request: CategoryRequest): void {
    this.categoryService.createCategory(request).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.successMessage = `Category "${response.name}" created successfully!`;
        setTimeout(() => {
          this.router.navigate(['/admin/categories']);
        }, 1500);
      },
      error: (err) => this.handleApiError(err),
    });
  }

  private updateCategory(id: number, request: CategoryRequest): void {
    this.categoryService.updateCategory(id, request).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.successMessage = `Category "${response.name}" updated successfully!`;
        setTimeout(() => {
          this.router.navigate(['/admin/categories']);
        }, 1500);
      },
      error: (err) => this.handleApiError(err),
    });
  }

  // Centralized error handler for both create and update operations
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
    } else if (err.status === 404 && this.isEditMode) {
      this.errorMessage = 'Category not found. It may have been deleted.';
    } else {
      this.errorMessage = 'An error occurred. Please try again later.';
    }
  }
}
