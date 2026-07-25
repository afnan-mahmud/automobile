# Database Schema (MongoDB / Mongoose)

Companion to [`architecture.md`](./architecture.md). All `id` fields are MongoDB `ObjectId` (`_id`) unless noted. Timestamps (`createdAt`/`updatedAt`) are added via Mongoose `{ timestamps: true }` on every collection and omitted below for brevity unless a doc needs a custom date field.

## users

| Field | Type | Notes |
|---|---|---|
| name | String | required |
| email | String | unique, sparse (phone-only users allowed) |
| phone | String | unique, sparse |
| passwordHash | String | required, bcrypt |
| role | String enum | `admin` \| `manager` \| `technician` |
| employeeId | ObjectId ref `employees` | optional — links technician/manager login to their employee profile |
| active | Boolean | default `true` |

Index: unique on `email`, unique on `phone`.

## customers

| Field | Type | Notes |
|---|---|---|
| name | String | required |
| phone | String | required, unique |
| email | String | optional |
| address | String | optional |

Index: unique on `phone`.

## vehicles

| Field | Type | Notes |
|---|---|---|
| customerId | ObjectId ref `customers` | required |
| registrationNumber | String | required, unique |
| make | String | e.g. Toyota |
| model | String | |
| year | Number | optional |
| color | String | optional |

Index: unique on `registrationNumber`.

## jobCards

| Field | Type | Notes |
|---|---|---|
| jobCardNumber | String | required, unique, auto-generated sequence |
| vehicleId | ObjectId ref `vehicles` | required |
| customerId | ObjectId ref `customers` | required (denormalized for quick lookup) |
| status | String enum | `open` \| `in_progress` \| `completed` \| `delivered` |
| tasks | Array\<Task\> | embedded, see below |
| partsUsed | Array\<{ productId: ObjectId ref `products`, quantity: Number }\> | drives stock deduction |
| photos | Array\<{ url: String, type: `before`\|`after`, caption: String }\> | local file path |
| createdBy | ObjectId ref `users` | |

**Task subdocument:**

| Field | Type | Notes |
|---|---|---|
| description | String | required |
| assignedTo | ObjectId ref `employees` | required |
| status | String enum | `pending` \| `in_progress` \| `completed` \| `carried_forward` |
| assignedDate | Date | date task is scheduled for |
| completedDate | Date | optional |

Index: unique on `jobCardNumber`, index on `vehicleId`, index on `customerId`.

## invoices

| Field | Type | Notes |
|---|---|---|
| invoiceNumber | String | required, unique, auto-generated |
| jobCardId | ObjectId ref `jobCards` | required |
| customerId | ObjectId ref `customers` | required |
| lineItems | Array\<{ description, quantity, unitPrice, total }\> | current version |
| discountPercent | Number | default 0, populated if a `discountCards` entry applies |
| subtotal / discountAmount / total | Number | computed |
| status | String enum | `draft` \| `sent` \| `paid` \| `partially_paid` |
| revisions | Array\<{ version: Number, lineItems: Array, total: Number, changedAt: Date, changedBy: ObjectId ref `users` }\> | snapshot before each edit |

Index: unique on `invoiceNumber`, index on `jobCardId`.

## employees

| Field | Type | Notes |
|---|---|---|
| userId | ObjectId ref `users` | optional (not every employee needs login, e.g. helper staff) |
| name | String | required |
| phone | String | required |
| designation | String | e.g. Mechanic, Helper |
| hourlyRate | Number | required, used in salary calc |
| requiredHoursPerDay | Number | default 8 |
| joinDate | Date | |
| active | Boolean | default `true` |

## attendanceRecords

| Field | Type | Notes |
|---|---|---|
| employeeId | ObjectId ref `employees` | required |
| date | Date | required (day granularity) |
| checkIn | Date | |
| checkOut | Date | |
| hoursWorked | Number | computed from checkIn/checkOut |
| status | String enum | `present` \| `absent` \| `half_day` \| `leave` |

Index: compound unique on `(employeeId, date)`.

## salaryRecords

| Field | Type | Notes |
|---|---|---|
| employeeId | ObjectId ref `employees` | required |
| month | Number | 1-12 |
| year | Number | |
| totalHoursWorked | Number | sum from `attendanceRecords` |
| requiredHours | Number | expected hours for the month |
| deduction | Number | shortfall × hourlyRate |
| overtimeAmount | Number | excess × hourlyRate (or overtime multiplier) |
| netSalary | Number | final payable |
| generatedAt | Date | |

Index: compound unique on `(employeeId, month, year)`.

## products

| Field | Type | Notes |
|---|---|---|
| name | String | required |
| sku | String | unique |
| category | String enum | `retail` \| `part` |
| unitPrice | Number | selling price |
| costPrice | Number | optional, for profit calc |
| quantityInStock | Number | required, decremented atomically |
| reorderLevel | Number | optional, for low-stock alerts |

Index: unique on `sku`.

## stockTransactions

| Field | Type | Notes |
|---|---|---|
| productId | ObjectId ref `products` | required |
| type | String enum | `retail_sale` \| `job_card_usage` \| `purchase_in` \| `adjustment` |
| quantity | Number | positive = stock in, negative = stock out |
| relatedJobCardId | ObjectId ref `jobCards` | optional |
| relatedInvoiceId | ObjectId ref `invoices` | optional |
| createdBy | ObjectId ref `users` | |

Index on `productId`, index on `relatedJobCardId`.

## accountTransactions

| Field | Type | Notes |
|---|---|---|
| type | String enum | `income` \| `expense` |
| category | String enum | `service_sale` \| `product_purchase` \| `salary` \| `operational_cost` \| `other` |
| amount | Number | required |
| paymentMethod | String enum | `cash` \| `bank` \| `mobile_banking` |
| relatedInvoiceId | ObjectId ref `invoices` | optional |
| description | String | optional |
| date | Date | required |
| createdBy | ObjectId ref `users` | |

Index on `date`, index on `type`.

## warrantyCards

| Field | Type | Notes |
|---|---|---|
| jobCardId | ObjectId ref `jobCards` | required |
| customerId | ObjectId ref `customers` | required |
| cardNumber | String | unique, auto-generated |
| coveredItems | Array\<String\> | parts/services covered |
| startDate | Date | required |
| endDate | Date | required |
| terms | String | optional free text |

Index: unique on `cardNumber`.

## discountCards

| Field | Type | Notes |
|---|---|---|
| customerId | ObjectId ref `customers` | required |
| discountPercent | Number | required |
| termsAndConditions | String | |
| validFrom | Date | |
| validTo | Date | optional (null = indefinite) |
| active | Boolean | default `true` |

## messageLogs

| Field | Type | Notes |
|---|---|---|
| customerId | ObjectId ref `customers` | required |
| channel | String enum | `sms` (extensible later) |
| message | String | required |
| status | String enum | `sent` \| `failed` \| `pending` |
| relatedJobCardId | ObjectId ref `jobCards` | optional |
| sentBy | ObjectId ref `users` | |
| sentAt | Date | |

## trackingLinks

| Field | Type | Notes |
|---|---|---|
| jobCardId | ObjectId ref `jobCards` | required |
| token | String | required, unique, random (e.g. nanoid) |
| expiresAt | Date | optional |

Index: unique on `token`.
