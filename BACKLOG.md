# ROMZ Backend Backlog

Return to these items when credentials or product decisions are ready.

## Paymob Live Testing

Status: credentials added and sandbox intention creation verified; live end-to-end sandbox card payment still pending.

What is already implemented:
- Paymob payment intent endpoint.
- Paymob unified checkout URL creation.
- Paymob legacy iframe URL creation when iframe credentials exist.
- HMAC webhook verification.
- Successful webhook marks order as paid and confirmed.
- Successful webhook decrements stock once.
- Failed webhook marks order as failed and cancelled.
- Paymob account payment method id `5769200` was discovered and saved in local `.env`.

What still needs a live sandbox check:
- Run one sandbox card payment from order creation through webhook.
- Confirm Paymob webhook payload field names match production account settings.
- Confirm whether integration/payment method id `5769200` should remain the default card method for launch.

## Courier API Automation

Status: manual tracking first.

What is already implemented:
- Admin can assign courier provider, tracking number, and tracking URL.
- Admin can mark order as shipped.

What to add later:
- Bosta shipment creation API.
- Mylerz shipment creation API.
- Courier webhook status sync.
