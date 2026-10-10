# Urban Walking Route Explorer

**An accessible, data-informed walking route comparison prototype for Camden, London.**  
*UCL Bartlett Centre for Advanced Spatial Analysis (CASA0028) · Group project · April 2026*

**[Try the live demo](https://hanyun-75.github.io/0028urbansafety/)**

## Overview

Pedestrian navigation often prioritises the shortest or fastest route, although walking decisions can also be shaped by air pollution, traffic noise, comfort and individual priorities.

**Urban Walking Route Explorer** explores how environmental information can support more informed everyday route choices. Designed around short journeys in Camden, particularly for UCL students, the prototype lets users compare alternative walking routes without claiming that one route is universally the **“best” or “safest.”**

The goal is **comparison, not prescription**: to make environmental trade-offs visible while communicating the limits of the available data.

## Key features

- **Alternative walking routes:** Enter a start and destination to request up to three walking-route alternatives using OpenRouteService (subject to the routes actually returned).
- **Environmental comparison:** Compare route-level air-quality and noise indicators alongside distance and estimated walking time.
- **User-selectable priorities:** Explore routes using **Balanced**, **Air quality** or **Noise** sorting modes.
- **Map and route-card interaction:** Route cards show indicators, coverage and explanatory text, with linked highlighting on the map.
- **Returning to routes:** Quick routes, saved routes and guided, route-specific notes support exploration and later use.
- **Accessible, responsive interface:** Designed for keyboard use, multiple screen sizes and interpreting information without relying solely on map colours.

## Data and methodology

| Component | Approach |
| --- | --- |
| Walking routes | OpenRouteService foot-walking endpoint; up to three returned alternatives |
| Air quality | Processed **London Atmospheric Emissions Inventory (LAEI) 2022** Camden data; route sampling and nearby-point matching to estimate route-level NO₂ and PM2.5 indicators |
| Air-quality sorting | Prototype weighting of **60% NO₂ / 40% PM2.5**; a comparison rule, **not** a health-risk model |
| Noise | London noise data represented through approximate dB class midpoints; route-level summaries including average noise and high-noise share |
| Data coverage | Coverage indicators help users interpret incomplete environmental information |
| Study area | Camden, London, with a focus on everyday walking journeys around UCL |

The underlying data are used as **comparative environmental proxies**. They are not real-time personal exposure measurements or estimates of inhaled dose.

## Design rationale

### From urban safety to informed route choice

The project treats walking as more than moving efficiently from A to B. Environmental exposure, sensory comfort and personal preferences can affect how people experience streets. Rather than defining a universal measure of urban safety, the interface allows users to examine several dimensions of a route.

### Making data actionable without false precision

Turning environmental measurements into scores and labels can imply more certainty than the data support. To address this, the prototype:

- Avoids labelling routes as objectively **“Best”** or **“Safest.”**
- States the current sorting priority instead of presenting a single universal ranking.
- Shows data coverage, units, contextual tags and explanatory text alongside the route indicators.
- Uses route-specific notes rather than public ratings of whole neighbourhoods, to avoid generalising individual experiences into area labels.

### Accessibility and responsive design

Accessibility was treated as part of the interface design, rather than a final visual adjustment. The prototype includes labelled controls, keyboard-accessible core flows, focus and ARIA cues, text alongside colour coding, and route-card alternatives to reading the map alone.

The map, sidebar and overlays adjust across desktop, tablet, mobile and narrow/zoomed views. An automated accessibility audit and manual keyboard checks reported **no critical issues** in the tested prototype; this is **not** a claim of full WCAG certification.

## Scope and limitations

This is a **coursework-scale exploratory prototype**, not a production navigation or personal health application.

- LAEI 2022 air-quality data reflect modelled annual-average conditions, not live personal exposure.
- Noise indicators are approximations derived from mapped noise classes.
- Route results depend on the alternatives returned by OpenRouteService and do not represent every possible walking path.
- Weights, thresholds and coverage rules are prototype design choices.
- Wider real-user testing and co-design, plus additional variables such as crossings, kerb access and pavement quality, would be needed for further development.

## Technology

**React · Vite · JavaScript · OpenRouteService API · Geospatial/environmental datasets · GitHub Pages / GitHub Actions**

The repository also lists mapping and geospatial libraries in `package.json`; see the source code for the implementation details.

### Run locally

```bash
npm install
npm run dev
```

Some routing and map functionality may require correctly configured external API credentials. Do not commit personal API keys or `.env` files containing secrets to a public repository.

## Contributions

This was a collaborative UCL CASA group project by **Hanyun Hu, Yifan Zhang and Fangzheng Zhou**.

**Hanyun Hu — concept, frontend integration, accessibility and deployment**

- Proposed the original project direction and shaped its comparison-first approach.
- Co-developed the early web demo, then took primary responsibility for integrating, debugging and refining the React/Vite prototype, including route inputs, cards, saved routes, notes and map/sidebar interactions.
- Led accessibility and responsive-design work across desktop, tablet and mobile, including keyboard navigation, focus states, ARIA cues and non-colour-only communication.
- Led GitHub Pages deployment, GitHub Actions setup, live testing and accessibility checks; coordinated the main design documentation.

**Other group contributions:** Yifan Zhang developed early route-comparison and interaction components, including bookmarking and reverse geocoding; Fangzheng Zhou worked on noise-data preparation and visualisation, route-level noise calculations and related alerts. The final prototype reflects collaborative development and testing.

## Documentation and sources

The accompanying coursework design document provides the full rationale, methodological detail, screenshots, references and critical reflection. A public, privacy-reviewed version can be added here as `docs/design-rationale.pdf`.

Main sources include [LAEI 2022](https://data.london.gov.uk/dataset/london-atmospheric-emissions-inventory-laei-2022-2lg5g/), [Noise Pollution in London](https://data.london.gov.uk/dataset/noise-pollution-in-london-2zwnk/), [OpenRouteService](https://openrouteservice.org/) and [OpenStreetMap](https://www.openstreetmap.org/copyright).
