# HostGraph MA/RI Vendor Integration Readiness Preflight

**Checked:** 2026-08-25 (America/New_York)  
**Repository base:** `b961736341508839e556097143f4677eae03f497`  
**Scope:** Research and configuration preflight only. No vendor API requests, customer-account logins, credential use, vendor communications, invoice retrieval, ordering, payments, or other external mutations occurred.

## Release verdict

```text
REGIONAL_DATA_READY: BLOCKED

Required vendors:                  10/10 regionally verified
Documented machine path:            4/10
HostGraph authorized config proven: 0/10
LIVE_TEST_READY:                    0/10
3x VERIFIED:                        0/10
RECONCILED:                         0/10
```

This is the expected fail-closed result. The 10/10 live-vendor release gate remains unchanged. A portal, public catalog, static export, browser automation, scraped session, or inferred endpoint does not count as a live API or vendor-authorized integration.

## Readiness definitions

- `AUTH_REQUIRED`: credible official or vendor-coordinated machine integration path is identified, but HostGraph has not proven the required authorized account configuration, endpoint contract, credentials, and vendor-specific normalizer.
- `BLOCKED`: no sufficiently documented vendor API or vendor-authorized machine integration path has been established for HostGraph. An authenticated customer portal may exist, but portal access alone does not satisfy the release gate.
- `LIVE_TEST_READY`: requires reviewed `BASE_URL`, `READ_PATH`, account identifier, supported auth kind, authorization basis, secret credential availability, and a source-specific normalizer. None of the ten vendors currently meet this evidentiary standard.

## Baseline cohort

| Vendor | Category | Regional evidence | Machine-integration evidence | Observable account data | Preflight state | Primary blocker |
|---|---|---|---|---|---|---|
| Sysco Boston | FOOD | Sysco lists Sysco Boston in Plympton, MA | **Official API portal** exists, including production/development/sandbox portal surfaces | API product scope and account-scoped commercial fields are not publicly established by the portal landing page | `AUTH_REQUIRED` | Obtain API product entitlement/docs, customer account authorization, credentials, response contract and normalizer |
| US Foods | FOOD | Current Pronto coverage lists Boston and Providence | **Official policy** explicitly supports integrating US Foods' Electronic Ordering System with a customer's owned or third-party ordering system; MarginEdge documents a vendor-coordinated US Foods EDI invoice process | Order guides, order tracking, past purchases and customer reporting are documented; EDI invoice path is supported through an authorized partner process | `AUTH_REQUIRED` | Obtain US Foods/partner authorization, account IDs, EDI/API contract, credentials and normalizer |
| Performance Foodservice Boston | FOOD | Boston operation in Taunton delivers across MA and RI | **Official EDI and system integration** evidence: Recipe-Costing submits orders/receives inventory through EDI; Craftable receives order guides and automated invoices through EDI; CustomerFirst integrates with POS/ERP systems | Product/order data, deliveries, invoice line detail, POD, payment history, exportable invoice data, spend trends | `AUTH_REQUIRED` | Obtain approved integration route for HostGraph, account authorization, machine credentials and exact response schema |
| Baldor Specialty Foods Boston | FOOD | Baldor identifies its Boston warehouse and business-account service | **Vendor-coordinated partner EDI** evidence: MarginEdge lists Baldor digital EDI and requires setup/coordination; Buyers Edge conflict handling is explicitly documented | Account pricing and availability, invoices, payment history, usage reports, credits, order and delivery status are documented | `AUTH_REQUIRED` | Establish a vendor-authorized HostGraph/partner feed, account authorization, machine credentials and source schema |
| Costa Fruit & Produce | FOOD | Boston-based distributor serving New England | No official API/EDI or vendor-authorized machine integration was found in the current public evidence pass | Contract pricing and invoice/local-purchase reporting exist as business concepts, but no machine interface is documented | `BLOCKED` | Obtain written machine-integration path from Costa/Pro*Act or an authorized integration provider before adapter configuration |
| Martignetti Companies | BEVERAGE | Operates in MA and RI; Massachusetts trade platform is current | Martignetti Exchange is a rich proprietary **customer portal**, but no public customer API/EDI contract was identified | Real-time portfolio, account-specific pricing, ordering, invoices, credits, payments and delivery/account management are documented | `BLOCKED` | Obtain a Martignetti-authorized API/EDI/feed contract or verified authorized aggregator connection; portal automation is prohibited |
| Southern Glazer's Beverage Company MA/RI | BEVERAGE | Southern Glazer's added MA and RI through the Horizon acquisition and operates there as Southern Glazer's Beverage Company | Proof is a rich proprietary **customer portal**; no current public customer machine API/EDI contract was identified in the official evidence pass | Orders, personalized lists, product/deal discovery, payments and two years of invoices | `BLOCKED` | Obtain Southern Glazer's authorized machine integration or confirm a specific authorized aggregator feed; Proof browser automation is prohibited |
| M.S. Walker | BEVERAGE | Direct distribution operations in Massachusetts and Rhode Island | Current MA ordering instructions route existing customers to sales reps/phone; no public MA/RI customer API/EDI contract was identified | Customer account/credit and invoice-payment functions exist, but machine-readable commercial data access is not documented | `BLOCKED` | Obtain vendor-authorized machine feed/API/EDI confirmation and account-scoped data contract |
| Mancini Beverage | BEVERAGE | Current operations serve Rhode Island and Connecticut with multiple RI facilities | No official customer API/EDI or vendor-authorized machine integration was found in the current public evidence pass | Customer onboarding, product/catalog relationship and electronic invoice payment exist; invoice-line machine access is not documented | `BLOCKED` | Obtain vendor-authorized machine integration and account data contract; Paymentus invoice payment alone is insufficient |
| Sheehan Family Companies regional network | BEVERAGE | Craft Massachusetts and L. Knife serve Massachusetts territories | Connect is a rich proprietary **customer portal** with account data, but no public API/EDI contract was identified for HostGraph | Deals, inventory, pre-sales, portfolio, invoice/payment history, ordering and reorder history | `BLOCKED` | Obtain Sheehan/Connect/VIP-authorized machine access or a specifically verified aggregator feed; portal automation is prohibited |

## Evidence register

### Sysco Boston

- Official developer portal: https://apic-devportal.sysco.com/
- Official locations surface: https://www.sysco.com/contact/contact/our-locations
- Classification: `OFFICIAL_API_PORTAL`
- Important limit: public discovery confirms an API program, not that HostGraph has access to a customer pricing/invoice endpoint.

### US Foods

- Official Customer Policy: https://www.usfoods.com/legal/policies/customer
- Official regional delivery coverage: https://www.usfoods.com/how-we-deliver/next-day-restaurant-delivery.html
- Authorized-partner EDI procedure: https://help.marginedge.com/hc/en-us/articles/4401855977875-Request-Your-Digital-EDI-Invoices
- Classification: `OFFICIAL_INTEGRATION_POLICY + VENDOR_COORDINATED_EDI_CANDIDATE`
- Important limit: the public policy supports integration, but no HostGraph credentials or endpoint contract are proven.

### Performance Foodservice Boston

- Official CustomerFirst: https://www.performancefoodservice.com/Your-Operation/CustomerFirst
- Official Recipe Costing EDI description: https://www.performancefoodservice.com/Your-Operation/Restaurant-Operations/Recipe-Costing
- Official Restaurant Operations / Craftable EDI description: https://www.performancefoodservice.com/Your-Operation/Restaurant-Operations
- Official Boston location: https://www.performancefoodservice.com/our-locations/boston/
- Classification: `OFFICIAL_EDI_AND_SYSTEM_INTEGRATION`
- Important limit: a supported partner integration does not automatically authorize HostGraph to call an endpoint directly.

### Baldor Specialty Foods Boston

- Official online ordering/account data: https://www.baldorfood.com/services/online-ordering
- Official business profile help: https://help.baldorfood.com/hc/en-us/articles/360038199053-How-to-navigate-my-business-user-profile
- Official credit evidence: https://help.baldorfood.com/hc/en-us/articles/360024349313-How-can-I-request-a-pickup-or-credit
- Vendor-coordinated EDI procedure: https://help.marginedge.com/hc/en-us/articles/4401855977875-Request-Your-Digital-EDI-Invoices
- Classification: `VENDOR_COORDINATED_EDI_CANDIDATE`

### Costa Fruit & Produce

- Official site: https://www.freshideas.com/
- Official contact/customer onboarding: https://www.freshideas.com/contact-us/ and https://www.freshideas.com/become-a-customer/
- Official local reporting description: https://www.freshideas.com/our-products/local/
- Official Pro*Act affiliation/contract pricing: https://www.freshideas.com/our-products/conventional-produce/
- Classification: `NO_AUTHORIZED_MACHINE_PATH_IDENTIFIED`

### Martignetti Companies

- Official Martignetti Exchange/customer surface: https://martignetti.com/
- Official Massachusetts operation/data description: https://martignetti.com/martignetti-massachusetts
- Official Exchange launch: https://martignetti.com/blog/martignetti-companies-launches-martignetti-exchange-an-e-commerce-wholesale-ordering-solution
- Classification: `PORTAL_ONLY_FOR_CURRENT_PREFLIGHT`

### Southern Glazer's Beverage Company MA/RI

- Official Proof description: https://www.southernglazers.com/become-a-customer/about-proof
- Official regional history: https://www.southernglazers.com/who-we-are/our-history
- Official customer onboarding: https://www.southernglazers.com/become-a-customer/sign-up
- Classification: `PORTAL_ONLY_FOR_CURRENT_PREFLIGHT`

### M.S. Walker

- Official Massachusetts operation/order instructions: https://www.mswalker.com/regional-distribution/massachusetts/
- Official MA/RI location evidence: https://www.mswalker.com/contact-us/
- Official customer service/invoice payment: https://www.mswalker.com/resources/customer-services/
- Classification: `NO_AUTHORIZED_MACHINE_PATH_IDENTIFIED`

### Mancini Beverage

- Official company/region surface: https://www.mancinibeverage.com/
- Official RI locations/contact: https://www.mancinibeverage.com/contact/
- Official electronic invoice-payment surface: https://www.mancinibeverage.com/contact/paymyinvoice/
- Classification: `NO_AUTHORIZED_MACHINE_PATH_IDENTIFIED`

### Sheehan Family Companies regional network

- Craft Massachusetts Connect: https://www.craftbrewersguildma.com/craftmarp/
- L. Knife retailer surface: https://www.lknifeandson.com/retailer/
- Classification: `PORTAL_ONLY_FOR_CURRENT_PREFLIGHT`

## Cross-vendor authorized-integration candidates

These are **candidate routes**, not substitutes for vendor-specific authorization.

### MarginEdge digital EDI

MarginEdge currently documents digital EDI invoice support for Sysco, US Foods, Performance Food Service and Baldor, with vendor-specific setup requirements. Its documentation explicitly requires requests/coordination with vendors and describes US Foods and PFG authorization steps.

- https://help.marginedge.com/hc/en-us/articles/360047915114-Digital-Invoices-EDI-in-MarginEdge
- https://help.marginedge.com/hc/en-us/articles/4401855977875-Request-Your-Digital-EDI-Invoices

This is useful evidence that an authorized food-invoice integration path exists for four baseline food vendors. HostGraph still needs an authorized account/feed and a reviewed adapter contract before any of these become `LIVE_TEST_READY`.

### Fintech PaymentSource

Fintech documents electronic distributor/vendor invoice ingestion, standardized line-item invoice data, 15 months of invoice history, and outbound back-office integration using EDI, APIs, CSV and custom formats. It also states that its network includes thousands of connected distributors/vendors/suppliers and is specifically designed for regulated alcohol invoice data.

- https://fintech.com/
- https://fintech.com/paymentsource-retailers
- https://fintech.com/paymentsource-retailers/invoice-data-management

**Critical limit:** the public preflight did not prove that all five named baseline beverage distributors are connected to the user's/pilot customer's Fintech account or that Fintech can expose each one to HostGraph through an authorized machine interface. Therefore Fintech is an unblock strategy, not evidence for passing any named beverage vendor today.

## HostGraph configuration readiness

The protected manual workflow `.github/workflows/vendor-live-gate.yml` already declares environment-backed configuration slots for all ten vendors:

```text
HOSTGRAPH_VENDOR_<PREFIX>_BASE_URL
HOSTGRAPH_VENDOR_<PREFIX>_READ_PATH
HOSTGRAPH_VENDOR_<PREFIX>_ACCOUNT_ID
HOSTGRAPH_VENDOR_<PREFIX>_AUTH_KIND
HOSTGRAPH_VENDOR_<PREFIX>_TOKEN
HOSTGRAPH_VENDOR_<PREFIX>_AUTHORIZATION_BASIS
```

It also uses the protected `hostgraph-regional-live` environment and `HOSTGRAPH_RELEASE_HMAC_KEY`.

The repository can prove that these **secret names are referenced**, but it cannot prove through ordinary repository reads that secret values exist, are current, or correspond to an authorized vendor account. Secret values therefore remain `UNVERIFIED` in this preflight.

No attempt was made to run `vendor-live-gate.yml` because doing so would enter the real external-read tranche.

## Data-contract requirements before `LIVE_TEST_READY`

For each vendor, all of the following must be evidenced before a live test is allowed:

1. Official vendor API or vendor-authorized integration documentation.
2. Account owner authorization for HostGraph or the approved intermediary.
3. Reviewed HTTPS base URL and read path. Guessed endpoints are prohibited.
4. Account identifier and allowed auth method (`BEARER` or `HEADER_TOKEN`).
5. Authorization basis (`VENDOR_API` or `VENDOR_AUTHORIZED_INTEGRATION`).
6. Secret credential present in the protected environment, never in source.
7. Vendor-specific response normalizer producing account-scoped commercial records.
8. At least one stable source record identifier.
9. Sufficient commercial fields for the claimed test scope.
10. Explicit unsupported-field list rather than inferred values.

## Minimum useful commercial scope

The live release gate should attempt to establish these fields when the vendor supports them:

| Capability | Required handling |
|---|---|
| Product/SKU identity | Preserve source ID/SKU and vendor identity |
| Account pricing | Vendor-reported account price only; generic/public pricing does not substitute |
| Order/invoice identity | Preserve source document IDs |
| Invoice line items | Quantity, unit/pack where supplied, amount/price, timestamps |
| Credits | Capture only if source exposes them; otherwise mark unsupported |
| Delivery/order status | Capture only if source exposes it |
| Pack/unit data | Never infer silently; unresolved conversion remains an exception |
| Provenance | Vendor, account, endpoint/operation ID, timestamps, hashes and schema version |

## Beverage unlock strategy

The current bottleneck is not the HostGraph gate framework. It is **authorized machine access to named beverage distributors**.

Highest-value sequence:

1. Check whether the first pilot restaurant already uses Fintech PaymentSource or another authorized beverage AP/invoice intermediary.
2. If yes, verify distributor-by-distributor that the customer's actual top five beverage vendors are present and can be exposed through an authorized machine feed while retaining distributor identity and source record IDs.
3. If the customer has complete five-food/five-beverage trailing-spend evidence, resolve the release cohort to those actual top-spend vendors before live verification.
4. For any remaining named vendor, obtain vendor-written API/EDI/integration onboarding rather than automating the customer portal.
5. Only then populate protected HostGraph configuration and run the three-read series.

## Food unlock strategy

1. Sysco: enroll/obtain API product entitlement and identify the account-scoped commercial read operation.
2. US Foods: initiate the approved integration/EDI route with the account's Territory Manager or authorized integration provider.
3. Performance: select the approved EDI/system integration route and obtain the account-scoped contract.
4. Baldor: complete vendor-coordinated EDI/integration authorization through an approved intermediary or direct program.
5. Costa: obtain written machine-integration options from Costa/Pro*Act; do not invent an endpoint.

## Release progression after preflight

```text
CURRENT
  4/10 machine paths identified
  0/10 LIVE_TEST_READY
  REGIONAL_DATA_READY = BLOCKED

NEXT
  authorized integration documentation + account configuration
      -> LIVE_TEST_READY per vendor
      -> three consecutive authenticated reads per vendor
      -> 10/10 fresh verification receipts
      -> REGIONAL_DATA_READY
      -> real vendor source-to-finding reconciliation
      -> PILOT_READY
```

## Evidence boundary

This document records what could be verified from current official/vendor-operated public surfaces, clearly identified third-party integration documentation, and the current HostGraph repository. It does not assert that any API secret, EDI relationship, customer account, Fintech connection, distributor entitlement or live data feed currently exists for HostGraph. Unknown remains unknown.
