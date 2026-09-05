import { Routes } from '@angular/router';
import { Register } from './components/register/register';
import { VerifyEmail } from './components/verifyEmail/verify.email';
import { Home } from './components/home/home';
import { ForgotPassword } from './components/forgot.password/forgot.password';
import { ResetPassword } from './components/reset.password/reset.password';
import { Me } from './components/me/me';
import { authGuard } from './guards/auth/auth-guard';
import { guestGuard } from './guards/guest/guest-guard';
import { Login } from './components/login/login';
import { Categories } from './components/categories/categories';
import { CategoryDetails } from './components/category-details/category-details';
import { roleGuard } from './guards/role/role-guard';
import { Accessories } from './components/accessory/accessories/accessories';
import { AccessoriesDetails } from './components/accessory/accessory-details/accessory-details';
import { NotFound } from './components/not-found/not-found';
import { Unauthorized } from './components/unauthorized/unauthorized';
import { AboutContact } from './components/about-contact/about-contact';
import { TermsPrivacy } from './components/terms-privacy/terms-privacy';
import { ChangePassword } from './components/change-password/change-password';
import { UpdateProfile } from './components/update-profile/update-profile';
import { Cart } from './components/cart/cart';
import { AdminLayout } from './components/admin-layout/admin-layout';

export const routes: Routes = [
    { path: 'login', component: Login, canActivate: [guestGuard], title: 'Login' },

    { path: 'register', component: Register, canActivate: [guestGuard], title: 'Register' },
    { path: 'verify-email', component: VerifyEmail, canActivate: [guestGuard], title: 'Verify Email' },

    { path: 'forgot-password', component: ForgotPassword, canActivate: [guestGuard], title: 'Forgot Password' },
    { path: 'reset-password', component: ResetPassword, canActivate: [guestGuard], title: 'Reset Password' },

    { path: 'home', component: Home, title: 'Home' },

    { path: 'categories', component: Categories, title: 'Categories' },
    { path: 'categories/:id', component: CategoryDetails, title: 'Category Details' },

    { path: 'accessories', component: Accessories, title: 'Accessories' },
    { path: 'accessories/:id', component: AccessoriesDetails, title: 'Accessory Details' },

    { path: 'about', component: AboutContact, title: 'About Us' },
    { path: 'terms-privacy', component: TermsPrivacy, title: 'Terms & Privacy' },

    { path: 'me', component: Me, canActivate: [authGuard], title: 'My Profile' },
    { path: 'me/change-password', component: ChangePassword, canActivate: [authGuard], title: 'Change Password' },
    { path: 'me/update-profile', component: UpdateProfile, canActivate: [authGuard], title: 'Update Profile' },

    { path: 'my-cart', component: Cart, canActivate: [authGuard], title: 'My Cart' },

    {
        path: 'checkout',
        canActivate: [authGuard],
        loadComponent: () =>
            import('./components/order/check-out/check-out')
        .then(m => m.CheckOut),
        title: 'Checkout'
    },

    {
        path: 'my-orders',
        canActivate: [authGuard],
        loadComponent: () =>
            import('./components/order/order-list/order-list')
        .then(m => m.OrderList),
        title: 'My Orders'
    },
    
    {
        path: 'my-orders/:id',
        canActivate: [authGuard],
        loadComponent: () =>
            import('./components/order/order-details/order-details')
        .then(m => m.OrderDetails),
        title: 'Order Details'
    },

    {
        path: 'wishlist',
        canActivate: [authGuard],
        loadComponent: () =>
            import('./components/wishlist/wishlist')
        .then(m => m.Wishlist),
        title: 'My Wishlist'
    },

    {
        path: 'admin',
        component: AdminLayout,
        canActivate: [authGuard],
        canActivateChild: [roleGuard(['SUPER_ADMIN', 'ADMIN'])],
        children: [
            {
                path: 'dashboard',
                loadComponent: () => 
                    import('./components/admin-dashboard/admin-dashboard')
                .then(m => m.AdminDashboard),
                title: 'Admin Dashboard'
            },
            {
                path: 'categories/create',
                loadComponent: () =>
                    import('./components/create-category/create-category')
                .then(m => m.CreateCategory),
                title: 'Create Category'
                },
            {
                path: 'categories/edit/:id',
                loadComponent: () =>
                    import('./components/create-category/create-category')
                .then(m => m.CreateCategory),
                title: 'Edit Category'
            },
            {
                path: 'accessories/create',
                loadComponent: () =>
                    import('./components/accessory/create-accessory/create-accessory')
                .then(m => m.CreateAccessory),
                title: 'Create Accessory'
            },
            {
                path: 'accessories/edit/:id',
                loadComponent: () =>
                    import('./components/accessory/create-accessory/create-accessory')
                .then(m => m.CreateAccessory),
                title: 'Edit Accessory'
            },
            {
                path: 'users',
                loadComponent: () =>
                    import('./components/user-management/user-management')
                .then(m => m.UserManagement),
                title: 'User Management'
            },
            {
                path: 'users/roles',
                loadComponent: () =>
                    import('./components/roles/roles')
                .then(m => m.Roles),
                title: 'Roles'
            }
        ]
    },
    
    { path: '', redirectTo: '/home', pathMatch: 'full' },

    { path: '403', component: Unauthorized, title: 'Unauthorized' },

    { path: '404', component: NotFound, title: 'Not Found' },

    { path: '**', redirectTo: '/404' }
];