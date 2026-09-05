import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { UserService } from '../../../core/services/user/user.service';
import { 
  FOOTER_AUTHENTICATED_LINKS, 
  FOOTER_GUEST_LINKS, 
  FOOTER_SHOP_LINKS, 
  FOOTER_SUPPORT_LINKS
} from '../../../../config/nav.config';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './footer.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Footer {
  private readonly user = inject(UserService);

  readonly isAuthenticated = toSignal(this.user.authState$, { initialValue: false });

  readonly shopLinks = FOOTER_SHOP_LINKS;
  readonly supportLinks = FOOTER_SUPPORT_LINKS;
  readonly guestLinks = FOOTER_GUEST_LINKS;
  readonly accountLinks = FOOTER_AUTHENTICATED_LINKS;

  readonly currentYear = new Date().getFullYear();
}