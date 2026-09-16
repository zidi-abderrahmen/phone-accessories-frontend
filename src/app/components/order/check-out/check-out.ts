import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { CartItemResponse } from '../../../core/models/cart/items/cart-item-response';
import { PaymentMethod } from '../../../core/models/checkout/enums/payment-method';
import { ShippingMethod } from '../../../core/models/checkout/enums/shipping-method';
import { OrderRequest } from '../../../core/models/checkout/order-request';
import { OrderResponse } from '../../../core/models/checkout/order-response';
import { RegisterResponse } from '../../../core/models/user/register/register.response';
import { CartService } from '../../../core/services/cart/cart.service';
import { OrderService } from '../../../core/services/checkout/order.service';
import { UserService } from '../../../core/services/user/user.service';

type StepId = 'information' | 'delivery' | 'payment' | 'review';

interface StepDef {
  id: StepId;
  label: string;
  fields: string[];
}

const SHIPPING_FEES: Record<ShippingMethod, number> = {
  [ShippingMethod.STANDARD]: 7,
  [ShippingMethod.EXPRESS]: 15,
};

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './check-out.html',
  styleUrl: './check-out.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckOut implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly orderService = inject(OrderService);
  private readonly userService = inject(UserService);
  private readonly router = inject(Router);
  private readonly cartService = inject(CartService);

  // ---------------------------------------------------------------------
  // Enums exposed to the template
  // ---------------------------------------------------------------------
  readonly PaymentMethod = PaymentMethod;
  readonly ShippingMethod = ShippingMethod;

  // ---------------------------------------------------------------------
  // Steps
  // ---------------------------------------------------------------------
  readonly steps: StepDef[] = [
    {
      id: 'information',
      label: 'Information',
      fields: [
        'customerFullName',
        'customerEmail',
        'customerPhoneNumber',
        'customerStreet',
        'customerCity',
        'customerPostalCode',
        'customerCountry',
      ],
    },
    { id: 'delivery', label: 'Delivery', fields: ['shippingMethod'] },
    { id: 'payment', label: 'Payment', fields: ['paymentMethod'] },
    { id: 'review', label: 'Review', fields: [] },
  ];

  readonly currentStepIndex = signal(0);
  readonly furthestStepReached = signal(0);

  readonly currentStep = computed(() => this.steps[this.currentStepIndex()]);
  readonly isFirstStep = computed(() => this.currentStepIndex() === 0);
  readonly isLastStep = computed(
    () => this.currentStepIndex() === this.steps.length - 1
  );

  // ---------------------------------------------------------------------
  // Async / UI state
  // ---------------------------------------------------------------------
  readonly isLoadingProfile = signal(true);
  readonly isLoadingCart = signal(true);
  readonly isSubmitting = signal(false);
  readonly submitError = signal<string | null>(null);
  readonly cartLoadError = signal<string | null>(null);

  readonly orderPlaced = signal(false);
  readonly placedOrder = signal<OrderResponse | null>(null);

  readonly agreeToTerms = signal(false);
  readonly attemptedNext = signal(false);

  // ---------------------------------------------------------------------
  // Cart
  // ---------------------------------------------------------------------
  readonly cartItems = signal<CartItemResponse[]>([]);

  readonly subtotal = computed(() =>
    this.cartItems().reduce(
      (sum, item) => sum + item.accessoryResponse.price * item.quantity,
      0
    )
  );

  readonly totalItemCount = computed(() =>
    this.cartItems().reduce((count, item) => count + item.quantity, 0)
  );

  shippingFee(): number {
    const method = this.checkoutForm.get('shippingMethod')?.value;
    return method === undefined || method === null
      ? SHIPPING_FEES[ShippingMethod.STANDARD]
      : SHIPPING_FEES[method as ShippingMethod];
  }

  estimatedTotal(): number {
    return this.subtotal() + this.shippingFee();
  }

  // ---------------------------------------------------------------------
  // Form — generated directly from OrderRequest fields
  // ---------------------------------------------------------------------
  readonly checkoutForm = this.fb.nonNullable.group({
    customerFullName: [
      '',
      [Validators.required, Validators.minLength(3), Validators.maxLength(100)],
    ],
    customerEmail: ['', [Validators.email]],
    customerPhoneNumber: [
      '',
      [Validators.required, Validators.pattern(/^[0-9+\s-]{8,20}$/)],
    ],
    customerStreet: [
      '',
      [Validators.required, Validators.minLength(5), Validators.maxLength(200)],
    ],
    customerCity: ['', [Validators.required, Validators.maxLength(80)]],
    customerPostalCode: [
      '',
      [Validators.required, Validators.pattern(/^[0-9]{4,10}$/)],
    ],
    customerCountry: ['', [Validators.required]],
    shippingMethod: [ShippingMethod.STANDARD, [Validators.required]],
    paymentMethod: [PaymentMethod.CASH_ON_DELIVERY, [Validators.required]],
    notes: ['', [Validators.maxLength(1000)]],
  });

  readonly paymentOptions: {
    value: PaymentMethod;
    label: string;
    description: string;
    icon: 'card' | 'paypal' | 'cash';
  }[] = [
    {
      value: PaymentMethod.CREDIT_CARD,
      label: 'Credit / Debit Card',
      description: 'Pay securely with Visa, Mastercard, or any major card.',
      icon: 'card',
    },
    {
      value: PaymentMethod.PAYPAL,
      label: 'PayPal',
      description: "You'll be redirected to confirm payment with PayPal.",
      icon: 'paypal',
    },
    {
      value: PaymentMethod.CASH_ON_DELIVERY,
      label: 'Cash on Delivery',
      description: 'Pay in cash when your order arrives at your door.',
      icon: 'cash',
    },
  ];

  readonly shippingOptions: {
    value: ShippingMethod;
    label: string;
    description: string;
    eta: string;
  }[] = [
    {
      value: ShippingMethod.STANDARD,
      label: 'Standard Delivery',
      description: 'Reliable delivery at the regular rate.',
      eta: '3–5 business days',
    },
    {
      value: ShippingMethod.EXPRESS,
      label: 'Express Delivery',
      description: 'Get your order faster for a higher fee.',
      eta: '1–2 business days',
    },
  ];

  ngOnInit(): void {
    this.prefillFromProfile();
    this.loadCart();
  }

  // ---------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------
  private prefillFromProfile(): void {
    this.isLoadingProfile.set(true);
    this.userService.getCurrentUser().subscribe({
      next: (user) => {
        const anyUser = user as RegisterResponse;
        const fullName = `${anyUser?.firstName}  ${anyUser?.lastName}`;
        this.checkoutForm.patchValue({
          customerFullName: fullName ?? '',
          customerEmail: anyUser?.email ?? '',
          customerPhoneNumber: anyUser?.phoneNumber ?? '',
        });
        this.isLoadingProfile.set(false);
      },
      error: () => {
        // Non-blocking: user can still fill the form manually.
        this.isLoadingProfile.set(false);
      },
    });
  }

  private loadCart(): void {
    this.isLoadingCart.set(true);
    this.cartLoadError.set(null);

    this.cartService.getMyCart().subscribe({
      next: (cart) => {
        this.cartItems.set(cart.cartItems);
        this.isLoadingCart.set(false);
      },
      error: () => {
        this.cartLoadError.set('Could not load your cart.');
        this.isLoadingCart.set(false);
      }
    });
  }

  // ---------------------------------------------------------------------
  // Step navigation
  // ---------------------------------------------------------------------
  isStepValid(index: number): boolean {
    const fields = this.steps[index].fields;
    if (fields.length === 0) return true;
    return fields.every((name) => this.checkoutForm.get(name)?.valid);
  }

  goToStep(index: number): void {
    if (index < 0 || index >= this.steps.length) return;
    if (index > this.furthestStepReached()) return;
    this.currentStepIndex.set(index);
    this.attemptedNext.set(false);
    this.scrollToTop();
  }

  goNext(): void {
    this.attemptedNext.set(true);

    const fields = this.currentStep().fields;
    fields.forEach((name) => this.checkoutForm.get(name)?.markAsTouched());

    if (!this.isStepValid(this.currentStepIndex())) return;

    const next = Math.min(this.currentStepIndex() + 1, this.steps.length - 1);
    this.currentStepIndex.set(next);
    this.furthestStepReached.set(Math.max(this.furthestStepReached(), next));
    this.attemptedNext.set(false);
    this.scrollToTop();
  }

  goBack(): void {
    if (this.isFirstStep()) return;
    this.currentStepIndex.set(this.currentStepIndex() - 1);
    this.attemptedNext.set(false);
    this.scrollToTop();
  }

  private scrollToTop(): void {
    document
      .querySelector('.pa-checkout__main')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------------------------------------------------------------------
  // Field helpers (used in template for error display)
  // ---------------------------------------------------------------------
  isFieldInvalid(name: string): boolean {
    const control = this.checkoutForm.get(name);
    if (!control) return false;
    return control.invalid && (control.touched || this.attemptedNext());
  }

  fieldError(name: string): string | null {
    const control = this.checkoutForm.get(name);
    if (!control || !control.errors) return null;

    if (control.errors['required']) return 'This field is required.';
    if (control.errors['email']) return 'Enter a valid email address.';
    if (control.errors['minlength'])
      return `Must be at least ${control.errors['minlength'].requiredLength} characters.`;
    if (control.errors['maxlength'])
      return `Must be under ${control.errors['maxlength'].requiredLength} characters.`;
    if (control.errors['pattern']) return 'This value doesn’t look right.';
    return 'Invalid value.';
  }

  // ---------------------------------------------------------------------
  // Submission
  // ---------------------------------------------------------------------
  get canPlaceOrder(): boolean {
    return (
      this.checkoutForm.valid &&
      this.agreeToTerms() &&
      this.cartItems().length > 0 &&
      !this.isSubmitting()
    );
  }

  toggleAgreeToTerms(): void {
    this.agreeToTerms.set(!this.agreeToTerms());
  }

  placeOrder(): void {
    if (this.checkoutForm.invalid) {
      Object.keys(this.checkoutForm.controls).forEach((name) =>
        this.checkoutForm.get(name)?.markAsTouched()
      );
      return;
    }
    if (!this.agreeToTerms()) return;

    this.isSubmitting.set(true);
    this.submitError.set(null);

    const payload: OrderRequest = this.checkoutForm.getRawValue();

    this.orderService
      .createOrder(payload)
      .pipe(finalize(() => this.isSubmitting.set(false)))
      .subscribe({
        next: (order) => {
          this.placedOrder.set(order);
          this.orderPlaced.set(true);
          this.scrollToTop();
        },
        error: (err) => {
          this.submitError.set(
            err?.error?.message ??
              'We couldn’t place your order. Please check your details and try again.'
          );
          this.scrollToTop();
        },
      });
  }

  // ---------------------------------------------------------------------
  // Success screen actions
  // ---------------------------------------------------------------------
  continueShopping(): void {
    this.router.navigate(['/accessories']);
  }

  viewOrders(): void {
    this.router.navigate(['/my-orders']);
  }

  // ---------------------------------------------------------------------
  // Display helpers
  // ---------------------------------------------------------------------
  paymentLabel(method: PaymentMethod): string {
    return this.paymentOptions.find((o) => o.value === method)?.label ?? '—';
  }

  shippingLabel(method: ShippingMethod): string {
    return this.shippingOptions.find((o) => o.value === method)?.label ?? '—';
  }

  lineTotal(item: CartItemResponse): number {
    return item.accessoryResponse.price * item.quantity;
  }

  shippingFeeOf(method: ShippingMethod): number {
    return SHIPPING_FEES[method];
  }
}