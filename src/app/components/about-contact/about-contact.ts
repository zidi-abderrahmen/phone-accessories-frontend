import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, type FormGroup } from '@angular/forms';

type SubmitStatus = 'idle' | 'submitting' | 'success' | 'error';

interface HeroStat {
  readonly value: string;
  readonly label: string;
}

interface AboutPillar {
  readonly icon: 'compass' | 'layers' | 'target';
  readonly title: string;
  readonly description: string;
}

interface WhyChooseItem {
  readonly icon: 'shield' | 'truck' | 'lock' | 'headset';
  readonly title: string;
  readonly description: string;
}

interface ContactInfoItem {
  readonly icon: 'mail' | 'phone' | 'clock' | 'pin';
  readonly label: string;
  readonly value: string;
  readonly href?: string;
}

interface SubjectOption {
  readonly value: string;
  readonly label: string;
}

interface FaqPreviewItem {
  readonly question: string;
  readonly answer: string;
}

@Component({
  selector: 'app-about-contact',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './about-contact.html',
  styleUrl: './about-contact.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutContact {
  private readonly formBuilder = inject(FormBuilder);

  readonly submitStatus = signal<SubmitStatus>('idle');
  readonly errorMessage = signal<string>('');

  readonly contactForm: FormGroup = this.formBuilder.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    subject: ['', [Validators.required]],
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
  });

  readonly heroStats: readonly HeroStat[] = [
    { value: '50K+', label: 'Customers served' },
    { value: '1,200+', label: 'Accessories listed' },
    { value: '4.8/5', label: 'Average rating' },
    { value: '<24h', label: 'Support response' },
  ];

  readonly aboutPillars: readonly AboutPillar[] = [
    {
      icon: 'compass',
      title: 'Who we are',
      description:
        'Phone Accessories started as a small Tunisian storefront for people tired of guessing whether a case or charger would actually fit. We now curate accessories for every phone we can get our hands on, and test each one before it goes on the shelf.',
    },
    {
      icon: 'layers',
      title: 'What we offer',
      description:
        'Cases, chargers, cables, screen protectors, and audio gear, organized by device so you find the right fit in seconds. Every listing states compatibility, material, and warranty up front, no fine print required.',
    },
    {
      icon: 'target',
      title: 'Our mission',
      description:
        'Make it simple to protect and get more out of the phone you already own. That means honest product pages, fair prices, and a support team that answers with your order in front of them, not a script.',
    },
  ];

  readonly whyChooseUs: readonly WhyChooseItem[] = [
    {
      icon: 'shield',
      title: 'Quality Products',
      description: 'Every accessory is checked against its listed specs before it ships, and backed by a manufacturer warranty.',
    },
    {
      icon: 'truck',
      title: 'Fast Delivery',
      description: 'Orders are packed within one business day and reach most of Tunisia in two to four days.',
    },
    {
      icon: 'lock',
      title: 'Secure Shopping',
      description: 'Checkout is encrypted end to end, and we never store your full payment details on our servers.',
    },
    {
      icon: 'headset',
      title: 'Customer Support',
      description: 'A real person replies to every message, usually the same day, in Arabic, French, or English.',
    },
  ];

  readonly subjectOptions: readonly SubjectOption[] = [
    { value: 'order', label: 'Order support' },
    { value: 'returns', label: 'Returns & exchanges' },
    { value: 'product', label: 'Product question' },
    { value: 'wholesale', label: 'Wholesale & partnerships' },
    { value: 'other', label: 'Something else' },
  ];

  readonly contactInfo: readonly ContactInfoItem[] = [
    {
      icon: 'mail',
      label: 'Email',
      value: 'support@phoneaccessories.tn',
      href: 'mailto:support@phoneaccessories.tn',
    },
    {
      icon: 'phone',
      label: 'Phone',
      value: '+216 71 234 567',
      href: 'tel:+21671234567',
    },
    {
      icon: 'clock',
      label: 'Business hours',
      value: 'Mon–Fri, 9:00–18:00 · Sat, 9:00–13:00 (GMT+1)',
    },
    {
      icon: 'pin',
      label: 'Based in',
      value: 'Bizerte, Tunisia — ships nationwide',
    },
  ];

  readonly faqPreview: readonly FaqPreviewItem[] = [
    {
      question: 'How long does delivery take?',
      answer: 'Most orders arrive within two to four business days anywhere in Tunisia.',
    },
    {
      question: 'Can I return a product?',
      answer: 'Yes, unused items in original packaging can be returned within 14 days of delivery.',
    },
    {
      question: 'Do accessories come with a warranty?',
      answer: 'Most products include a 6 to 12 month manufacturer warranty against defects.',
    },
  ];

  get name() {
    return this.contactForm.get('name');
  }

  get email() {
    return this.contactForm.get('email');
  }

  get subject() {
    return this.contactForm.get('subject');
  }

  get message() {
    return this.contactForm.get('message');
  }

  onSubmit(): void {
    if (this.submitStatus() === 'submitting') {
      return;
    }

    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    this.submitStatus.set('submitting');
    this.errorMessage.set('');

    // TODO: replace this simulated request with the real endpoint, e.g.
    // this.contactService.sendMessage(this.contactForm.getRawValue()).subscribe({
    //   next: () => this.submitStatus.set('success'),
    //   error: () => this.submitStatus.set('error'),
    // });
    setTimeout(() => {
      this.submitStatus.set('success');
      this.contactForm.reset();
    }, 1100);
  }

  dismissStatus(): void {
    this.submitStatus.set('idle');
  }
}