# Surgent Pay SDK for TypeScript

The Surgent Pay SDK provides a simple and type-safe way to interact with the Surgent Pay API.

## Installation

```bash
bun add @surgent/pay
# or
npm install @surgent/pay
```

## Quick Start

```typescript
import { Surpay } from '@surgent/pay'

const pay = new Surpay({
  apiKey: 'xKmZqWpNrTsYvBcDfGhJkLmNpQrStUvWxYzAbCdEfGhJkLmNpQrStUvWxYzAbCd',
})

async function example() {
  const { data: projects, error } = await pay.projects.list()

  if (error) {
    console.error('Error:', error.message)
    return
  }

  console.log('Projects:', projects)
}
```

## Configuration

The SDK can be configured via the constructor or environment variables.

```typescript
import { Surpay } from '@surgent/pay'

const pay = new Surpay({
  apiKey: process.env.SURPAY_API_KEY, // Fallback: SURPAY_API_KEY env var
  baseUrl: 'https://pay.surgent.dev', // Optional
})
```

## Result Pattern & Error Handling

All SDK methods return a `Promise<Result<T, SurpayError>>`.

```typescript
const result = await pay.projects.list()

if (result.error) {
  // Handle error
  console.error(result.error.message)
  console.error(result.error.code)
  console.error(result.statusCode)
} else {
  // Use data
  console.log(result.data)
}
```

### Error Helper

Use `isSurpayError` to check if an error object is a `SurpayError`.

```typescript
import { isSurpayError } from '@surgent/pay'

try {
  // ...
} catch (err) {
  if (isSurpayError(err)) {
    console.error(err.code)
  }
}
```

## API Reference

### Projects

Note: Projects are created via the Surgent dashboard. The SDK provides read-only access to list your projects.

```typescript
// List projects
const { data: projects, error } = await pay.projects.list()
```

### Products

Manage products within a project.

```typescript
// Create a product
const { data: product, error } = await pay.products.create({
  productGroup: 'group_456',
  name: 'Pro Plan',
  slug: 'pro-plan',
})

// Update a product
const { data: updated, error: updateError } = await pay.products.update('prod_123', {
  name: 'Pro Plan v2',
})

// List products with their prices
const { data: products, error: listError } = await pay.products.listWithPrices()
```

### Prices

Manage pricing for your products.

```typescript
// Create a price
const { data: price, error } = await pay.prices.create({
  productGroup: 'group_456',
  name: 'Monthly',
  price: 999, // $9.99
  priceCurrency: 'usd',
  recurringInterval: 'month',
})
```

### Checkout

Create hosted checkout sessions.

```typescript
// Create a checkout session
const { data: checkout, error } = await pay.checkout.create({
  productId: 'prod_123',
  priceId: 'price_456',
  customerId: 'cust_123',
  successUrl: 'https://example.com/success',
})

if (checkout) {
  console.log(checkout.purchaseUrl)
}
```

### Check

Verify if a customer has access to a specific product.

```typescript
const { data, error } = await pay.check({
  customerId: 'cust_123',
  productId: 'prod_123',
})

if (data?.allowed) {
  console.log('Customer has access')
}
```

### Customers

Retrieve customer information.

```typescript
// List customers
const { data: customers, error } = await pay.customers.list()

// Get customer with details (subscriptions & transactions)
const { data: customer, error: getError } = await pay.customers.get('cust_123')
```

### Subscriptions

Monitor active subscriptions.

```typescript
// List subscriptions
const { data: subscriptions, error } = await pay.subscriptions.list()
```

### Transactions

Track payments and revenue.

```typescript
// List transactions
const { data: transactions, error } = await pay.transactions.list()
```

### Accounts

Manage connected payment processor accounts.

```typescript
// Connect a new account (Whop)
const { data: account, error } = await pay.accounts.connect({
  companyName: 'My Company',
  title: 'Main Store',
  email: 'billing@example.com',
})

// Get account details
const { data: accountDetails, error: getError } = await pay.accounts.get('acc_123')

// List connected accounts
const { data: accounts, error: listError } = await pay.accounts.list()

// Delete/Disconnect an account
const { error: deleteError } = await pay.accounts.delete('acc_123')
```
