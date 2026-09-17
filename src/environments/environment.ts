export const environment = {
    production: true,
    apiUrl: '/api',
    // The payment gateway is not integrated yet: orders are not really charged.
    // Flip this to false once a real provider replaces the mock checkout.
    demoPayment: true,
};
