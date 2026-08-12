import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  QueryList,
  ViewChildren,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

interface LegalSubsection {
  readonly id: string;
  readonly title: string;
}

interface LegalSection {
  readonly id: string;
  readonly label: string;
  readonly subsections: readonly LegalSubsection[];
}

@Component({
  selector: 'app-terms-privacy',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './terms-privacy.html',
  styleUrl: './terms-privacy.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TermsPrivacy implements AfterViewInit, OnDestroy {
  private readonly destroyRef = inject(DestroyRef);

  @ViewChildren('trackedSection') private readonly trackedSections!: QueryList<ElementRef<HTMLElement>>;

  private observer?: IntersectionObserver;

  readonly lastUpdated = 'August 1, 2026';

  readonly activeSectionId = signal<string>('overview');

  readonly tableOfContents: readonly LegalSection[] = [
    {
      id: 'terms',
      label: 'Terms of Service',
      subsections: [
        { id: 'overview', title: 'Overview' },
        { id: 'user-responsibilities', title: 'User responsibilities' },
        { id: 'acceptable-use', title: 'Acceptable use' },
        { id: 'account-responsibilities', title: 'Account responsibilities' },
        { id: 'limitation-of-liability', title: 'Limitation of liability' },
      ],
    },
    {
      id: 'privacy',
      label: 'Privacy Policy',
      subsections: [
        { id: 'information-collected', title: 'Information we collect' },
        { id: 'data-usage', title: 'How we use data' },
        { id: 'cookies', title: 'Cookies' },
        { id: 'security', title: 'Security' },
        { id: 'user-rights', title: 'Your rights' },
      ],
    },
  ];

  ngAfterViewInit(): void {
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          this.activeSectionId.set(visible[0].target.id);
        }
      },
      {
        // Anchors "current" detection roughly a third of the way down the
        // viewport, under the sticky header, so a heading is marked active
        // once it has meaningfully entered the reading area.
        rootMargin: '-15% 0px -70% 0px',
        threshold: 0,
      },
    );

    this.trackedSections.forEach((section) => this.observer?.observe(section.nativeElement));

    this.destroyRef.onDestroy(() => this.observer?.disconnect());
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  scrollToSection(id: string, event: Event): void {
    event.preventDefault();
    const target = document.getElementById(id);

    if (!target) {
      return;
    }

    this.activeSectionId.set(id);
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    target.focus({ preventScroll: true });
  }
}