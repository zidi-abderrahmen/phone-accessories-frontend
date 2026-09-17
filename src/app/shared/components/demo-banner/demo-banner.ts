import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { environment } from '../../../../environments/environment';

/**
 * Inline warning that a feature is running in demo mode.
 *
 * Defaults to the mock-payment notice (driven by `environment.demoPayment`), but
 * callers can override both `visible` and `message` for any other feature that is
 * not wired up to a real backend yet.
 */
@Component({
  selector: 'app-demo-banner',
  standalone: true,
  templateUrl: './demo-banner.html',
  styleUrl: './demo-banner.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DemoBanner {
  readonly visible = input(environment.demoPayment);

  readonly message = input(
    'no real payment is processed and no card is charged.'
  );
}
