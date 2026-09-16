import { Routes } from '@angular/router';
import { authGuard } from './guards/auth/auth-guard';
import { guestGuard } from './guards/guest/guest-guard';
import { roleGuard } from './guards/role/role-guard';

export const routes: Routes = [
    { 
        path: 'login',
        loadComponent: () => import('./components/login/login')
        .then(m => m.Login),
        canActivate: [guestGuard],
        title: 'Login'
    },
    {
        path: 'register',
        loadComponent: () => import('./components/register/register')
        .then(m => m.Register),
        canActivate: [guestGuard],
        title: 'Register'
    },
    { 
        path: 'verify-email',
        loadComponent: () => import('./components/verify-email/verify-email')
        .then(m => m.VerifyEmail), 
        canActivate: [guestGuard], 
        title: 'Verify Email'
    },

    { 
        path: 'forgot-password', 
        loadComponent: () => import('./components/forgot-password/forgot-password')
        .then(m => m.ForgotPassword), 
        canActivate: [guestGuard], 
        title: 'Forgot Password' 
    },
    { 
        path: 'reset-password', 
        loadComponent: () => import('./components/reset-password/reset-password')
        .then(m => m.ResetPassword), 
        canActivate: [guestGuard], 
        title: 'Reset Password' 
    },

    { 
        path: 'home', 
        loadComponent: () => import('./components/home/home')
        .then(m => m.Home), 
        title: 'Home' 
    },

    { 
        path: 'categories', 
        loadComponent: () => import('./components/categories/categories')
        .then(m => m.Categories), 
        title: 'Categories' },
    { 
        path: 'categories/:id', 
        loadComponent: () => import('./components/category-details/category-details')
        .then(m => m.CategoryDetails), 
        title: 'Category Details' },

    { 
        path: 'accessories', 
        loadComponent: () => import('./components/accessory/accessories/accessories')
        .then(m => m.Accessories), 
        title: 'Accessories' },
    { 
        path: 'accessories/:id', 
        loadComponent: () => import('./components/accessory/accessory-details/accessory-details')
        .then(m => m.AccessoriesDetails),
        title: 'Accessory Details' },

    { 
        path: 'about', 
        loadComponent: () => import('./components/about-contact/about-contact')
        .then(m => m.AboutContact), 
        title: 'About Us' },
    { 
        path: 'terms-privacy', 
        loadComponent: () => import('./components/terms-privacy/terms-privacy')
        .then(m => m.TermsPrivacy), 
        title: 'Terms & Privacy' },

    { 
        path: 'me', 
        loadComponent: () => import('./components/me/me')
        .then(m => m.Me), 
        canActivate: [authGuard], 
        title: 'My Profile' },
    { 
        path: 'me/change-password', 
        loadComponent: () => import('./components/change-password/change-password')
        .then(m => m.ChangePassword), 
        canActivate: [authGuard], 
        title: 'Change Password' },
    { 
        path: 'me/update-profile', 
        loadComponent: () => import('./components/update-profile/update-profile')
        .then(m => m.UpdateProfile), 
        canActivate: [authGuard], 
        title: 'Update Profile' },

    { 
        path: 'my-cart', 
        loadComponent: () => import('./components/cart/cart')
        .then(m => m.Cart), 
        canActivate: [authGuard], 
        title: 'My Cart' },

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
        loadComponent: () => import('./components/admin-layout/admin-layout')
        .then(m => m.AdminLayout),
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

    { 
        path: '403', 
        loadComponent: () => import('./components/unauthorized/unauthorized')
        .then(m => m.Unauthorized), 
        title: 'Unauthorized' 
    },

    { 
        path: '404', 
        loadComponent: () => import('./components/not-found/not-found')
        .then(m => m.NotFound), 
        title: 'Not Found' 
    },

    { path: '**', redirectTo: '/404' }
];