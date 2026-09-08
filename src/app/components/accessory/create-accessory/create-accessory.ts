import { Component, inject, OnDestroy, OnInit, signal, HostListener } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { AccessoryRequest } from '../../../core/models/accessory/accessory-request';
import { AccessoryResponse } from '../../../core/models/accessory/accessory-response';
import { CategoryResponse } from '../../../core/models/category/category-response';
import { AccessoryService } from '../../../core/services/accessory/accessory.service';
import { CategoryService } from '../../../core/services/category/category.service';
import { InputField } from '../../../shared/components/input-field/input-field';
import { ImageUploadService } from '../../../core/services/image-upload/image-upload.service';
import { HttpErrorResponse } from '@angular/common/http';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_IMAGE_PIXELS = 25 * 1_000_000; // 25 MP

@Component({
  selector: 'app-accessory-create',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, InputField],
  templateUrl: './create-accessory.html',
  styleUrl: './create-accessory.scss',
})
export class CreateAccessory implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private accessoryService = inject(AccessoryService);
  private categoryService = inject(CategoryService);
  private imageUploadService = inject(ImageUploadService);
  private route = inject(ActivatedRoute);

  accessoryForm = this.fb.nonNullable.group({
    imageUrl: ['', [Validators.maxLength(500)]],
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

  // Image picker state
  selectedFile = signal<File | null>(null);
  previewUrl = signal<string | null>(null);
  imageError = '';

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

  ngOnDestroy(): void {
    this.revokePreviewUrlIfBlob();
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
      imageUrl: accessory.imageUrl,
      title: accessory.title,
      description: accessory.description,
      productCode: accessory.productCode,
      categoryId: accessory.category.id,
      price: accessory.price,
      stock: accessory.stock,
    });
    this.selectedCategoryName = accessory.category.name;
    this.previewUrl.set(accessory.imageUrl || null);
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
    this.filteredCategories = this.categories.filter((c) => c.name.toLowerCase().includes(term));
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
        if (this.highlightedIndex >= 0 && this.highlightedIndex < this.filteredCategories.length) {
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
    const el = document.getElementById('category-option-' + this.highlightedIndex);
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
      this.imageError = 'Image must be 5 MB or smaller.';
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const totalPixels = img.width * img.height;

      URL.revokeObjectURL(objectUrl);

      if (totalPixels > MAX_IMAGE_PIXELS) {
        this.imageError = 'Image must be 25 MP or smaller.';
        return;
      }

      this.revokePreviewUrlIfBlob();
      this.selectedFile.set(file);
      this.previewUrl.set(URL.createObjectURL(file));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      this.imageError = 'Unable to read the image.';
    };

    img.src = objectUrl;
  }

  /** Discards a newly picked file and reverts the preview to the
   *  existing accessory image (edit mode) or clears it (create mode). */
  discardSelectedFile(): void {
    this.revokePreviewUrlIfBlob();
    this.selectedFile.set(null);
    this.imageError = '';
    const existing = this.accessoryForm.get('imageUrl')!.value;
    this.previewUrl.set(existing || null);
  }

  private revokePreviewUrlIfBlob(): void {
    const current = this.previewUrl();
    if (current && current.startsWith('blob:')) {
      URL.revokeObjectURL(current);
    }
  }

  // ------------------------------------------------------------------
  // Form Submission
  // ------------------------------------------------------------------

  onSubmit(): void {
    this.submitted = true;
    this.successMessage = '';
    this.errorMessage = '';
    this.imageError = '';

    const { ...otherControls } = this.f;
    const restInvalid = Object.values(otherControls).some((control) => control.invalid);
    if (restInvalid) {
      return;
    }

    const hasExistingImage = !!this.accessoryForm.get('imageUrl')!.value;
    if (!this.selectedFile() && !(this.isEditMode && hasExistingImage)) {
      this.imageError = 'Please select an image.';
      return;
    }

    this.loading.set(true);

    if (this.selectedFile()) {
      this.uploadImageThenSave();
    } else {
      this.saveAccessory();
    }
  }

  private uploadImageThenSave(): void {
    const file = this.selectedFile();
    if (!file) return;

    this.imageUploadService.uploadImage(file, 'accessories').subscribe({
      next: (response) => {
        this.accessoryForm.patchValue({ imageUrl: response.url });
        this.saveAccessory();
      },
      error: () => {
        this.loading.set(false);
        this.imageError = 'Failed to upload image. Please try again.';
      },
    });
  }

  private saveAccessory(): void {
    const rawFormValue = this.accessoryForm.getRawValue();
    const request: AccessoryRequest = {
      ...rawFormValue,
      categoryId: rawFormValue.categoryId!,
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
        this.accessoryForm.reset();
      },
      error: (err) => this.handleApiError(err),
    });
  }

  private updateAccessory(id: number, request: AccessoryRequest): void {
    this.accessoryService.updateAccessory(id, request).subscribe({
      next: (response) => {
        this.loading.set(false);
        this.successMessage = `Accessory "${response.title}" updated successfully!`;
        this.accessoryForm.reset();
      },
      error: (err) => this.handleApiError(err),
    });
  }

  // ------------------------------------------------------------------
  // Error Handlers
  // ------------------------------------------------------------------

  private handleLoadError(err: HttpErrorResponse): void {
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

  private handleApiError(err: HttpErrorResponse): void {
    this.loading.set(false);

    if (err.status === 400) {
      if (err.error?.message) {
        this.errorMessage = err.error.message;
      } else if (Array.isArray(err.error?.errors)) {
        this.errorMessage = err.error.errors
          .map((e: unknown) => (e as { defaultMessage?: string; message?: string }).defaultMessage || (e as { message?: string }).message)
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
