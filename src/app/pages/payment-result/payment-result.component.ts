import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-payment-result',
  templateUrl: './payment-result.component.html',
  styleUrls: ['./payment-result.component.scss']
})
export class PaymentResultComponent implements OnInit {
  status = '';
  paymentStatus = '';
  orderId = '';
  gatewayOrderId = '';

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      this.status = (params.get('status') ?? '').toLowerCase();
      this.paymentStatus = params.get('paymentStatus') ?? '';
      this.orderId = params.get('orderId') ?? '';
      this.gatewayOrderId = params.get('gatewayOrderId') ?? '';
    });
  }

  get isSuccess(): boolean {
    return this.status === 'success' || this.paymentStatus === 'SUCCEEDED';
  }

  get title(): string {
    return this.isSuccess ? 'Paiement confirmé' : 'Paiement non confirmé';
  }

  get message(): string {
    if (this.isSuccess) {
      return 'Le paiement a été confirmé. La pharmacie peut maintenant préparer la commande.';
    }
    return 'Le paiement n\'a pas été confirmé. Vous pouvez fermer cette page et reprendre le parcours client.';
  }
}