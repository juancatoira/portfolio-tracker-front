import { Pipe, PipeTransform, inject } from '@angular/core';
import { ExchangeRateService } from '../services/exchange-rate';

@Pipe({
  name: 'currencyFormat',
  standalone: true,
  pure: true
})
export class CurrencyFormatPipe implements PipeTransform {
  private exchangeRateService = inject(ExchangeRateService);

  // _activeCurrency drives re-evaluation when the currency signal changes
  transform(value: number, _activeCurrency: string): string {
    return this.exchangeRateService.format(value);
  }
}
