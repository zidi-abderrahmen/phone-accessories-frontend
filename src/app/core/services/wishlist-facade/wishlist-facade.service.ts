import { computed, inject, signal, Service } from '@angular/core';
import { Router } from '@angular/router';
import { UserService } from '../user/user.service';
import { WishlistService } from '../wishlist/wishlist.service';
import { AccessoryResponse } from '../../models/accessory/accessory-response';

@Service()
export class WishlistFacadeService {

    private readonly wishlistService = inject(WishlistService);
    private readonly userService = inject(UserService);
    private readonly router = inject(Router);

    private readonly pendingIds = signal<ReadonlySet<number>>(new Set());
    private readonly addedId = signal<number | null>(null);
    private readonly ids = signal<number[]>([]);
    private addedTimeout: ReturnType<typeof setTimeout> | null = null;

    readonly wishlistIds = this.ids.asReadonly();
    readonly wishlistSet = computed(() => new Set(this.ids()));
    readonly addedWishlistId = this.addedId.asReadonly();

    constructor() {
        this.userService.authState$.subscribe((isAuth) => {
            if (isAuth) {
                this.load();
            } else {
                this.ids.set([]);
            }
        });
    }

    isPending(accessoryId: number): boolean {
        return this.pendingIds().has(accessoryId);
    }

    load(): void {
        this.wishlistService.getMyWishlist().subscribe({
            next: (wishlist) => {
                const items = wishlist?.items ?? [];
                this.ids.set(items.map(item => item.accessory.id));
            }
        });
    }

    toggle(event: Event, accessory: AccessoryResponse, returnUrl: string): void {
        event.preventDefault();
        event.stopPropagation();

        if (this.isPending(accessory.id)) return;

        if (!this.userService.isAuthenticatedValue()) {
        this.router.navigate(['/login'], { queryParams: { returnUrl } });
        return;
        }

        this.setPending(accessory.id, true);

        if (this.wishlistSet().has(accessory.id)) {
        this.wishlistService.removeFromWishlist(accessory.id).subscribe({
            next: () => {
            this.setPending(accessory.id, false);
            this.ids.update(ids => ids.filter(id => id !== accessory.id));
            },
            error: () => this.setPending(accessory.id, false)
        });
        } else {
        this.wishlistService.addToWishlist(accessory.id).subscribe({
            next: () => {
            this.setPending(accessory.id, false);
            this.flashAdded(accessory.id);
            this.ids.update(ids => [...ids, accessory.id]);
            },
            error: () => this.setPending(accessory.id, false)
        });
        }
    }

    private setPending(id: number, pending: boolean): void {
        const next = new Set(this.pendingIds());
        if (pending) {
            next.add(id);
        } else {
            next.delete(id);
        }
        this.pendingIds.set(next);
    }

    private flashAdded(id: number): void {
        this.addedId.set(id);
        if (this.addedTimeout) clearTimeout(this.addedTimeout);
        this.addedTimeout = setTimeout(() => this.addedId.set(null), 2000);
    }
}