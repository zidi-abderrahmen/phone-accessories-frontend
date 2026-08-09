import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AccessoryResponse } from '../../../core/models/accessory/accessory-response';
import { Page } from '../../../core/models/page';
import { AccessoryService } from '../../../core/services/accessory/accessory.service';
import { AuthService } from '../../../core/services/auth/auth.service';

@Component({
  selector: 'app-accessories',
  standalone: true,
  imports: [RouterModule, CurrencyPipe, CommonModule],
  templateUrl: './accessories.html',
  styleUrl: './accessories.scss',
})
export class Accessories implements OnInit {
  private accessoryService = inject(AccessoryService);
  private router = inject(Router);
  authService = inject(AuthService);

  // Data state
  accessories = signal<AccessoryResponse[]>([]);
  filteredAccessories: AccessoryResponse[] = [];
  page: Page<AccessoryResponse> | null = null;

  // Pagination state
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;

  // Search state
  searchQuery = signal('');

  // UI state
  loading = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  // Delete modal state
  showDeleteModal = false;
  accessoryToDelete: AccessoryResponse | null = null;
  deleting = signal(false);

  ngOnInit(): void {
    this.loadAccessories();
  }

  loadAccessories(page: number = 0, size: number = 10): void {
    this.loading.set(true);
    this.clearMessages();

    this.accessoryService.getAllAccessories(page, size).subscribe({
      next: (response) => {
        this.page = response;
        this.accessories.set(response.content);
        this.applySearch();
        this.currentPage = response.pageNumber;
        this.pageSize = response.size;
        this.totalElements = response.totalElements;
        this.totalPages = response.totalPages;
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.errorMessage.set('Failed to load accessories. Please try again later.');
      },
    });
  }

  // Search filtering (client-side on current page)
  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.searchQuery.set(value);
    this.applySearch();
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.applySearch();
  }

  private applySearch(): void {
    const query = this.searchQuery();
    const all = this.accessories();

    if (!query) {
      this.filteredAccessories = [...all];
      return;
    }

    this.filteredAccessories = all.filter((a) =>
      a.title.toLowerCase().includes(query) ||
      a.description.toLowerCase().includes(query) ||
      a.productCode.toLowerCase().includes(query) ||
      a.category?.name?.toLowerCase().includes(query)
    );
  }

  // Navigate to accessory details
  viewAccessory(accessory: AccessoryResponse): void {
    this.router.navigate(['/accessories', accessory.id]);
  }

  editAccessory(event: Event, accessory: AccessoryResponse): void {
    event.stopPropagation();
    this.router.navigate(['/admin/accessories/edit', accessory.id]);
  }

  // Open delete confirmation modal
  confirmDelete(event: Event, accessory: AccessoryResponse): void {
    event.stopPropagation();
    this.accessoryToDelete = accessory;
    this.showDeleteModal = true;
    this.clearMessages();
  }

  // Close modal without deleting
  cancelDelete(): void {
    this.showDeleteModal = false;
    this.accessoryToDelete = null;
  }

  // Execute deletion
  deleteAccessory(): void {
    if (!this.accessoryToDelete) {
      return;
    }

    this.deleting.set(true);
    this.clearMessages();

    this.accessoryService.deleteAccessory(this.accessoryToDelete.id).subscribe({
      next: () => {
        const id = this.accessoryToDelete!.id;
        this.accessories.set(this.accessories().filter((a) => a.id !== id));
        this.applySearch();

        this.successMessage.set(
          `Accessory "${this.accessoryToDelete!.title}" deleted successfully.`
        );
        this.closeDeleteModal();

        if (this.filteredAccessories.length === 0 && this.currentPage > 0) {
          this.loadAccessories(this.currentPage - 1, this.pageSize);
        } else if (
          this.filteredAccessories.length === 0 &&
          this.totalElements > 1
        ) {
          this.loadAccessories(this.currentPage, this.pageSize);
        }
      },
      error: (err) => {
        this.deleting.set(false);
        if (err.status === 403) {
          this.errorMessage.set(
            'You do not have permission to delete this accessory.'
          );
        } else if (err.status === 404) {
          this.errorMessage.set(
            'Accessory not found. It may have already been deleted.'
          );
          const id = this.accessoryToDelete!.id;
          this.accessories.set(this.accessories().filter((a) => a.id !== id));
          this.applySearch();
          this.closeDeleteModal();
        } else {
          this.errorMessage.set(
            'Failed to delete accessory. Please try again later.'
          );
        }
      },
    });
  }

  // Pagination controls
  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages && page !== this.currentPage) {
      this.loadAccessories(page, this.pageSize);
    }
  }

  // Stock label helper
  getStockLabel(stock: number): { text: string; variant: 'in' | 'low' | 'out' } {
    if (stock <= 0) return { text: 'Out of stock', variant: 'out' };
    if (stock <= 5) return { text: 'Low stock', variant: 'low' };
    return { text: 'In stock', variant: 'in' };
  }

  private closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.accessoryToDelete = null;
    this.deleting.set(false);
  }

  private clearMessages(): void {
    this.successMessage.set('');
    this.errorMessage.set('');
  }
}