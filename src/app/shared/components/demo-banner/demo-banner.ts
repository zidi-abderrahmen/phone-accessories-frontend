import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { environment } from '../../../../environments/environment';

/**
 * Warns shoppers that checkout is running against a mock payment gateway.
 * Rendered only while `environment.demoPayment` is true so it disappears
 * automatically once a real provider is wired in.
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
