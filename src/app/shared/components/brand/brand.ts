import { Component, input } from '@angular/core';
import { RouterModule } from '@angular/router';

type BrandSize = 'sm' | 'md' | 'lg';
type BrandLayout = 'vertical' | 'horizontal';

@Component({
  selector: 'app-brand',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './brand.html',
  styleUrl: './brand.scss',
})
export class Brand {
  size = input<BrandSize>('md');

  layout = input<BrandLayout>('vertical');

  showTagline = input(true);

  link = input<string | null>(null);

  ariaLabel = input<string | null>(null);

  title = input('Phone Accessories');

  tagline = input('Premium mobile gear for everyday life');
}