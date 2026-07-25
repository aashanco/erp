# Aashan ERP v5.6.2 – Mobile Preview & Subtotal Fix

## Corrected
- Public invoice/quote preview no longer compresses six columns into an unreadable mobile width.
- Transaction table uses a touch-friendly horizontal scroll area on small screens.
- Description column receives sufficient width and wraps normally.
- Totals panel labels and values are aligned with proper spacing on mobile.
- Subtotal is calculated as gross line value before discounts.
- Discount is shown separately and the stored document total remains the final total.

Example: Unit price $285.00 less discount $65.00 now displays:
- Subtotal: $285.00
- Discount: -$65.00
- Total: $220.00

## Database
No SQL migration is required.
