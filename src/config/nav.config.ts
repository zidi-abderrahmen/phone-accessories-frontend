export interface NavLink {
  label: string;
  path: string;
  /** Match `routerLinkActive` with `exact: true` (used for '/home'). */
  exact?: boolean;
  queryParams?: Record<string, string>;
}

/** Top-level links shown to every visitor, authenticated or not. */
export const MAIN_NAV_LINKS: NavLink[] = [
  { label: 'Home', path: '/home', exact: true },
  { label: 'Categories', path: '/categories' },
  { label: 'Accessories', path: '/accessories' },
  { label: 'About Us', path: '/about' },
];

/** Links inside the authenticated account dropdown / drawer account section. */
export const ACCOUNT_MENU_LINKS: NavLink[] = [
  { label: 'My Profile', path: '/me' },
  { label: 'Change Password', path: '/me/change-password' },
  { label: 'Update Profile', path: '/me/update-profile' },
  { label: 'My Orders', path: '/my-orders' },
];

/** Roles allowed to see the Admin entry point and admin sidebar. */
export const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'] as const;

export const ADMIN_SIDEBAR_LINKS: NavLink[] = [
  { label: 'Dashboard', path: '/admin/dashboard' },
  { label: 'Categories', path: '/categories' },
  { label: 'Create Category', path: '/admin/categories/create' },
  { label: 'Accessories', path: '/accessories' },
  { label: 'Create Accessory', path: '/admin/accessories/create' },
  { label: 'Users', path: '/admin/users' },
  { label: 'Roles', path: '/admin/users/roles' },
  { label: 'Home', path: '/home' },
];

export const FOOTER_SHOP_LINKS: NavLink[] = [
  { label: 'Categories', path: '/categories' },
  { label: 'Products', path: '/accessories' },
  { label: 'New Arrivals', path: '/accessories', queryParams: { sort: 'new' } },
];

export const FOOTER_SUPPORT_LINKS: NavLink[] = [
  { label: 'About & Contact', path: '/about' },
  { label: 'Terms & Privacy', path: '/terms-privacy' },
];
 
/** Footer "Account" column — guests. */
export const FOOTER_GUEST_LINKS: NavLink[] = [
  { label: 'Login', path: '/login' },
  { label: 'Register', path: '/register' },
];
 
/** Footer "Account" column — authenticated users. */
export const FOOTER_AUTHENTICATED_LINKS: NavLink[] = [
  { label: 'My Account', path: '/me' },
  { label: 'Wishlist', path: '/wishlist' },
  { label: 'My Orders', path: '/my-orders' },
];