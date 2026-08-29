import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RoleRequest } from '../../core/models/user/role/role-request';
import { RoleResponse } from '../../core/models/user/role/role-response';
import da from '@angular/common/locales/da';
import { AuthService } from '../../core/services/auth/auth.service';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../core/services/user/user.service';
import { UserManagementService } from '../../core/services/user-management/user-management.service';

type RoleFilter = 'ALL' | 'ACTIVE' | 'DELETED';

interface FilterTab {
  value: RoleFilter;
  label: string;
}

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './roles.html',
  styleUrl: './roles.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Roles {
  private readonly userManagementService = inject(UserManagementService);
  readonly authService = inject(AuthService);
  readonly userService = inject(UserService);

  protected readonly tabs: FilterTab[] = [
    { value: 'ALL', label: 'All' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'DELETED', label: 'Deleted' }
  ];

  // --- List state ---
  protected readonly filter = signal<RoleFilter>('ALL');
  protected readonly searchTerm = signal('');
  protected readonly roles = signal<RoleResponse[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);

  protected readonly filteredRoles = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const roles = this.roles();
    if (!term) return roles;
    return roles.filter((role) => role.name.toLowerCase().includes(term));
  });

  // --- Create / edit modal state ---
  protected readonly isModalOpen = signal(false);
  protected readonly editingRole = signal<RoleResponse | null>(null);
  protected readonly formName = signal('');
  protected readonly formError = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly isEditMode = computed(() => this.editingRole() !== null);

  // --- Hard delete confirmation state ---
  protected readonly deletingRoleId = signal<number | null>(null);
  protected readonly deletingInProgress = signal(false);
  protected readonly deletingRole = computed(() =>
    this.roles().find((role) => role.id === this.deletingRoleId()) ?? null
  );

  // --- Soft delete in-flight tracking (per row) ---
  protected readonly softDeletingId = signal<number | null>(null);
  protected readonly restoringId = signal<number | null>(null);

  constructor() {
    this.loadRoles();
  }

  protected setFilter(filter: RoleFilter): void {
    if (this.filter() === filter) return;
    this.filter.set(filter);
    this.loadRoles();
  }

  protected loadRoles(): void {
    this.loading.set(true);
    this.error.set(null);

    const request$ =
      this.filter() === 'ALL'
        ? this.userManagementService.getAllRoles()
        : this.userManagementService.getAllByDeleted(this.filter() === 'DELETED');

    request$.subscribe({
      next: (roles) => {
        this.roles.set(roles);
        this.loading.set(false);
      },
      error: () => {
        this.roles.set([]);
        this.error.set('Something went wrong while loading roles.');
        this.loading.set(false);
      }
    });
  }

  protected retry(): void {
    this.loadRoles();
  }

  protected onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchTerm.set(value);
  }

  protected clearSearch(): void {
    this.searchTerm.set('');
  }

  // --- Create / edit ---

  protected openCreateModal(): void {
    this.editingRole.set(null);
    this.formName.set('');
    this.formError.set(null);
    this.isModalOpen.set(true);
  }

  protected openEditModal(role: RoleResponse): void {
    this.editingRole.set(role);
    this.formName.set(role.name);
    this.formError.set(null);
    this.isModalOpen.set(true);
  }

  protected closeModal(): void {
    if (this.submitting()) return;
    this.isModalOpen.set(false);
    this.editingRole.set(null);
    this.formName.set('');
    this.formError.set(null);
  }

  protected onFormNameInput(event: Event): void {
    this.formName.set((event.target as HTMLInputElement).value);
  }

  protected submitForm(): void {
    const name = this.formName().trim();
    if (!name) {
      this.formError.set('Role name is required.');
      return;
    }

    this.submitting.set(true);
    this.formError.set(null);

    const editing = this.editingRole();
    const payload: RoleRequest = { name, deleted: editing?.deleted ?? false };

    const request$ = editing
      ? this.userManagementService.updateRole(editing.id, payload)
      : this.userManagementService.createRole(payload);

    request$.subscribe({
      next: () => {
        this.submitting.set(false);
        this.isModalOpen.set(false);
        this.editingRole.set(null);
        this.formName.set('');
        this.loadRoles();
      },
      error: () => {
        this.submitting.set(false);
        this.formError.set('Could not save this role. Please try again.');
      }
    });
  }

  // --- Soft delete (active -> deleted) ---

  protected softDelete(role: RoleResponse): void {
    this.actionError.set(null);
    this.softDeletingId.set(role.id);

    this.userManagementService.softDeleteRole(role.id).subscribe({
      next: () => {
        this.softDeletingId.set(null);
        this.loadRoles();
      },
      error: () => {
        this.softDeletingId.set(null);
        this.actionError.set(`Could not delete "${role.name}". Please try again.`);
      }
    });
  }

  // --- Restore (deleted -> active) ---

  protected restoreRole(role: RoleResponse): void {
    this.actionError.set(null);
    this.restoringId.set(role.id);

    const data: RoleRequest = { name: role.name, deleted: false };
    
    this.userManagementService.updateRole(role.id, data).subscribe({
      next: () => {
        this.restoringId.set(null);
        this.loadRoles();
      },
      error: () => {
        this.restoringId.set(null);
        this.actionError.set(`Could not restore "${role.name}". Please try again.`);
      }
    });
  }

  // --- Hard delete (permanent) ---

  protected confirmHardDelete(role: RoleResponse): void {
    this.actionError.set(null);
    this.deletingRoleId.set(role.id);
  }

  protected cancelHardDelete(): void {
    if (this.deletingInProgress()) return;
    this.deletingRoleId.set(null);
  }

  protected hardDelete(): void {
    const role = this.deletingRole();
    if (!role) return;

    this.deletingInProgress.set(true);

    this.userManagementService.hardDeleteRole(role.id).subscribe({
      next: () => {
        this.deletingInProgress.set(false);
        this.deletingRoleId.set(null);
        this.loadRoles();
      },
      error: () => {
        this.deletingInProgress.set(false);
        this.deletingRoleId.set(null);
        this.actionError.set(`Could not permanently delete "${role.name}". Please try again.`);
      }
    });
  }

  protected trackByRoleId(index: number, role: RoleResponse): number {
    return role.id;
  }

  protected formatDate(value: string | null | undefined): string {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }
}