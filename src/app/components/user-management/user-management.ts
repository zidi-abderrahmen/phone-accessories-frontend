import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Page } from '../../core/models/page/page';
import { RegisterRequest } from '../../core/models/user/register/register.request';
import { RegisterResponse } from '../../core/models/user/register/register.response';
import { UserManagementService } from '../../core/services/user-management/user-management.service';
import { UserService } from '../../core/services/user/user.service';

type ActionType = 'block' | 'unblock' | 'delete' | 'restore';

interface PendingAction {
  type: ActionType;
  user: RegisterResponse;
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-management.html',
  styleUrl: './user-management.scss',
})
export class UserManagement implements OnInit, OnDestroy {
  private readonly userManagementService = inject(UserManagementService);
  protected readonly userService = inject(UserService);

  // ---------------------------------------------------------------------
  // Data / pagination state
  // ---------------------------------------------------------------------
  users = signal<RegisterResponse[]>([]);
  loading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');
  private successTimeout: ReturnType<typeof setTimeout> | null = null;
  private errorTimeout: ReturnType<typeof setTimeout> | null = null;

  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;

  // ---------------------------------------------------------------------
  // Filters
  // ---------------------------------------------------------------------
  searchQuery = signal('');
  blockedFilter = signal(false);
  deletedFilter = signal(false);

  hasActiveFilters = computed(() => this.blockedFilter() || this.deletedFilter());

  // Client-side filtering over the currently loaded page, by
  // firstName / lastName / email — per the task, this never hits the
  // backend, it only narrows what's already loaded.
  filteredUsers = computed(() => {
    const term = this.searchQuery().trim().toLowerCase();
    if (!term) return this.users();

    return this.users().filter((user) => {
      const first = (user.firstName ?? '').toLowerCase();
      const last = (user.lastName ?? '').toLowerCase();
      const email = (user.email ?? '').toLowerCase();
      return first.includes(term) || last.includes(term) || email.includes(term);
    });
  });

  // ---------------------------------------------------------------------
  // Row action state
  // ---------------------------------------------------------------------
  processingUserId = signal<string | null>(null);
  pendingAction = signal<PendingAction | null>(null);
  confirmingAction = signal(false);
  actionError = signal('');

  // ---------------------------------------------------------------------
  // Create admin modal
  // ---------------------------------------------------------------------
  showCreateModal = signal(false);
  creatingAdmin = signal(false);
  createError = signal('');
  createForm: RegisterRequest = { firstName: '', lastName: '', email: '', password: '' };

  ngOnInit(): void {
    // Initial load: no blocked/deleted filters passed.
    this.loadUsers(0);
  }

  ngOnDestroy(): void {
    if (this.successTimeout) clearTimeout(this.successTimeout);
    if (this.errorTimeout) clearTimeout(this.errorTimeout);
  }

  // ---------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------
  loadUsers(page: number): void {
    this.loading.set(true);
    this.clearMessages();

    const blocked = this.blockedFilter() ? true : undefined;
    const deleted = this.deletedFilter() ? true : undefined;

    this.userManagementService
      .getAllUsers(blocked, deleted, page, this.pageSize)
      .subscribe({
        next: (response) => {
          // See the class-level NOTES: the DTO says this is a single
          // RegisterResponse, but it's actually paginated.
          const pageResponse = response as Page<RegisterResponse> | RegisterResponse[];
          const content: RegisterResponse[] = Array.isArray(pageResponse)
            ? pageResponse
            : pageResponse.content ?? [];

          this.users.set(content);

          if (!Array.isArray(pageResponse)) {
            this.currentPage = pageResponse.number ?? page;
            this.pageSize = pageResponse.size ?? this.pageSize;
            this.totalElements = pageResponse.totalElements ?? content.length;
            this.totalPages = pageResponse.totalPages ?? 1;
          } else {
            this.currentPage = page;
            this.totalElements = content.length;
            this.totalPages = 1;
          }

          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.showError('Failed to load users. Please try again.');
        },
      });
  }

  onSearchClick(): void {
    this.loadUsers(0);
  }

  onSearchInput(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  onBlockedFilterChange(checked: boolean): void {
    this.blockedFilter.set(checked);
  }

  onDeletedFilterChange(checked: boolean): void {
    this.deletedFilter.set(checked);
  }

  clearAllFilters(): void {
    this.searchQuery.set('');
    this.blockedFilter.set(false);
    this.deletedFilter.set(false);
    this.loadUsers(0);
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages && page !== this.currentPage) {
      this.loadUsers(page);
    }
  }

  retry(): void {
    this.loadUsers(this.currentPage);
  }

  private clearMessages(): void {
    this.successMessage.set('');
    this.errorMessage.set('');
  }

  private showSuccess(message: string): void {
    this.successMessage.set(message);
    if (this.successTimeout) clearTimeout(this.successTimeout);
    this.successTimeout = setTimeout(() => this.successMessage.set(''), 2500);
  }

  private showError(message: string): void {
    this.errorMessage.set(message);
    if (this.errorTimeout) clearTimeout(this.errorTimeout);
    this.errorTimeout = setTimeout(() => this.errorMessage.set(''), 2500);
  }

  // ---------------------------------------------------------------------
  // Row actions — block / unblock / delete / restore
  // ---------------------------------------------------------------------
  requestAction(type: ActionType, user: RegisterResponse): void {
    this.actionError.set('');
    this.pendingAction.set({ type, user });
  }

  cancelAction(): void {
    if (this.confirmingAction()) return;
    this.pendingAction.set(null);
    this.actionError.set('');
  }

  confirmAction(): void {
    const pending = this.pendingAction();
    if (!pending || this.confirmingAction()) return;

    this.confirmingAction.set(true);
    this.actionError.set('');
    this.processingUserId.set(pending.user.id);

    const request$ =
      pending.type === 'block'
        ? this.userManagementService.updateUserBlockedStatus(pending.user.id, true)
        : pending.type === 'unblock'
        ? this.userManagementService.updateUserBlockedStatus(pending.user.id, false)
        : pending.type === 'delete'
        ? this.userManagementService.updateUserDeletedStatus(pending.user.id, true)
        : this.userManagementService.updateUserDeletedStatus(pending.user.id, false);

    request$.subscribe({
      next: () => {
        this.users.update((list) =>
          list.map((u) => {
            if (u.id !== pending.user.id) return u;
            if (pending.type === 'block') return { ...u, blocked: true };
            if (pending.type === 'unblock') return { ...u, blocked: false };
            if (pending.type === 'delete') return { ...u, deleted: true };
            return { ...u, deleted: false };
          })
        );
        this.confirmingAction.set(false);
        this.processingUserId.set(null);
        this.pendingAction.set(null);
        this.showSuccess(this.actionSuccessMessage(pending.type, pending.user));
      },
      error: () => {
        this.confirmingAction.set(false);
        this.processingUserId.set(null);
        this.actionError.set('This action couldn’t be completed. Please try again.');
      },
    });
  }

  private actionSuccessMessage(type: ActionType, user: RegisterResponse): string {
    const name = this.fullName(user);
    switch (type) {
      case 'block':
        return `${name} has been blocked.`;
      case 'unblock':
        return `${name} has been unblocked.`;
      case 'delete':
        return `${name} has been deleted.`;
      case 'restore':
        return `${name} has been restored.`;
    }
  }

  // ---------------------------------------------------------------------
  // Create admin
  // ---------------------------------------------------------------------
  openCreateModal(): void {
    this.createForm = { firstName: '', lastName: '', email: '', password: '' };
    this.createError.set('');
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    if (this.creatingAdmin()) return;
    this.showCreateModal.set(false);
    this.createError.set('');
  }

  submitCreateAdmin(): void {
    if (this.creatingAdmin()) return;

    const { firstName, lastName, email, password } = this.createForm;
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      this.createError.set('Please fill in all fields.');
      return;
    }

    this.creatingAdmin.set(true);
    this.createError.set('');

    this.userManagementService.createAdmin(this.createForm).subscribe({
      next: () => {
        this.creatingAdmin.set(false);
        this.showCreateModal.set(false);
        this.showSuccess(`Administrator "${firstName} ${lastName}" created successfully.`);
        this.loadUsers(0);
      },
      error: (err) => {
        this.creatingAdmin.set(false);
        this.createError.set(
          err?.error?.message ?? 'Failed to create administrator. Please try again.'
        );
      },
    });
  }

  // ---------------------------------------------------------------------
  // Display helpers
  // ---------------------------------------------------------------------
  fullName(user: RegisterResponse): string {
    return `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || '—';
  }

  initials(user: RegisterResponse): string {
    const name = this.fullName(user);
    return name === '—' ? '?' : name.charAt(0).toUpperCase();
  }

  roleLabels(user: RegisterResponse): string[] {
    return Array.isArray(user.roles) ? user.roles : [];
  }

  trackByUserId(_index: number, user: RegisterResponse): string {
    return user.id;
  }
}