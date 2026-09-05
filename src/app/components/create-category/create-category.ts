import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CategoryRequest } from '../../core/models/category/category-request';
import { CategoryService } from '../../core/services/category/category.service';
import { InputField } from '../../shared/components/input-field/input-field';
import { ImageUploadService } from '../../core/services/image-upload/image-upload.service';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

@Component({
  selector: 'app-create-category',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, InputField],
  templateUrl: './create-category.html',
  styleUrl: './create-category.scss',
})
export class CreateCategory implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private categoryService = inject(CategoryService);
  private imageUploadService = inject(ImageUploadService);
  private route = inject(ActivatedRoute);

  categoryForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(50)]],
    description: ['', [Validators.required, Validators.maxLength(500)]],
    imageUrl: ['', [Validators.maxLength(500)]],
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

  // Image picker state
  selectedFile = signal<File | null>(null);
  previewUrl = signal<string | null>(null);
  imageError = '';

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

  ngOnDestroy(): void {
    this.revokePreviewUrlIfBlob();
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
        this.previewUrl.set(category.imageUrl || null);
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

  // ------------------------------------------------------------------
  // Image picker
  // ------------------------------------------------------------------

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = ''; // allow re-selecting the same file later

    if (!file) return;

    this.imageError = '';

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      this.imageError = 'Only JPEG, PNG, or WEBP images are allowed.';
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      this.imageError = 'Image must be 5MB or smaller.';
      return;
    }

    this.revokePreviewUrlIfBlob();
    this.selectedFile.set(file);
    this.previewUrl.set(URL.createObjectURL(file));
  }

  /** Discards a newly picked file and reverts the preview to the
   *  existing category image (edit mode) or clears it (create mode). */
  discardSelectedFile(): void {
    this.revokePreviewUrlIfBlob();
    this.selectedFile.set(null);
    this.imageError = '';
    const existing = this.categoryForm.get('imageUrl')!.value;
    this.previewUrl.set(existing || null);
  }

  private revokePreviewUrlIfBlob(): void {
    const current = this.previewUrl();
    if (current && current.startsWith('blob:')) {
      URL.revokeObjectURL(current);
    }
  }

  // ------------------------------------------------------------------
  // Submit
  // ------------------------------------------------------------------

  onSubmit(): void {
    this.submitted = true;
    this.successMessage = '';
    this.errorMessage = '';
    this.imageError = '';

    if (this.f.name.invalid || this.f.description.invalid) {
      return;
    }

    const hasExistingImage = !!this.categoryForm.get('imageUrl')!.value;
    if (!this.selectedFile() && !(this.isEditMode && hasExistingImage)) {
      this.imageError = 'Please select an image.';
      return;
    }

    this.loading.set(true);

    if (this.selectedFile()) {
      this.uploadImageThenSave();
    } else {
      this.saveCategory();
    }
  }

  private uploadImageThenSave(): void {
    const file = this.selectedFile();
    if (!file) return;

    this.imageUploadService.uploadImage(file, 'categories').subscribe({
      next: (response) => {
        this.categoryForm.patchValue({ imageUrl: response.url });
        this.saveCategory();
      },
      error: () => {
        this.loading.set(false);
        this.imageError = 'Failed to upload image. Please try again.';
      },
    });
  }

  private saveCategory(): void {
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
        this.categoryForm.reset();
      },
      error: (err) => this.handleApiError(err),
    });
  }

  private updateCategory(id: number, request: CategoryRequest): void {
    this.categoryService.updateCategory(id, request).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.successMessage = `Category "${response.name}" updated successfully!`;
        this.categoryForm.reset();
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