# HostGraph Interface Rebuild Design

## Goal
Rebuild the existing HostGraph command center to match the approved dark procurement-intelligence interface while preserving current routes, API calls, fallback data, and operational behavior.

## Visual contract
- Keep the persistent dark left rail and analytical main canvas.
- Brand header: HOSTGRAPH with PROCUREMENT COMMAND CENTER positioning.
- Navigation language: Overview, Margins, Orders, Vendors, Products, Credits, Alerts, Reports, Settings, Help. Existing implemented routes remain authoritative; labels may map onto existing routes and non-implemented destinations stay visibly disabled rather than pretending functionality exists.
- Overview must foreground three truthful app-derived summaries: Gross Margin / margin exposure, Potential Savings, and Active Alerts. Where the current API does not expose a literal gross-margin percentage, the UI must label the available measure accurately instead of inventing one.
- Main analytical band: margin trend/driver visualization and spend/benchmark category visualization using current HostGraph data.
- Product-impact table must derive rows from existing margin-gap data, not fabricated customer outcomes.

## Architecture
Retain React 19, Vite, React Router, Tailwind, Tremor, existing `api` service, `useFetch`, and data types. Limit the rebuild to presentation components and data projection helpers. No backend schema or endpoint changes.

## Error and data behavior
Existing API fallback behavior remains visible through `PageStateBanner`. No generated visual may imply live production data when the app is using the repository's demo/fallback dataset.

## Testing
Add a structural interface contract test that fails until the approved navigation, KPI, chart, and product-impact surfaces exist. Existing typecheck/build remain required.

## Review boundary
All work stays on `review/interface-rebuild-2026-08`; no merge, production deployment, secret, DNS, or environment changes.