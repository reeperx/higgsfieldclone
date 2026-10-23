# Legal and rights risk register

**Review status:** preliminary product-risk inventory, checked 2026-10-23.
This is not legal advice and is not a substitute for South African counsel.
The legal pages in the app remain drafts, not operative policies.

## Launch blockers

| Severity | Risk | Evidence and impact | Required action before launch |
|---|---|---|---|
| High | Higgsfield hosted-API resale restriction | [Higgsfield API Terms](https://open.higgsfield.ai/terms-of-service) §§4.1–4.4 require an app to add material functionality, prohibit making the API available as a substantially similar or competing generation/model-access service without prior written consent, and require end-user flow-down terms. Vendo's product workflows may add functionality, but that does not establish permission to run a customer-facing generation SaaS. | Obtain written authorization explicitly covering Vendo's customer-facing, paid SaaS use, model access, end users, and selected models. Keep `HF_SAAS_APPROVAL_REFERENCE` unset until the authorization is actually received and recorded. The code gate is a safeguard, not evidence of consent. |
| High | Unlicensed scaffold/template code | The public [`higgsfield-ai/app-templates`](https://github.com/higgsfield-ai/app-templates) repository did not report a license in GitHub repository metadata when checked. Public availability and attribution do not grant permission to copy or adapt code. The official [`higgsfield-js`](https://github.com/higgsfield-ai/higgsfield-js) repository also did not report a license; Vendo does not rely on it for its server client. | Obtain a written license/permission covering the adapted template code, or have counsel approve a documented clean-room replacement of the affected code. Preserve provenance and do not assume the SDK's Apache-licensed Python sibling applies to either repository. |
| High | South African operator and consumer disclosures are incomplete | The legal pages do not identify the legal operator, registration details, or physical/business address. Pricing, renewals, cancellation, refunds, digital content, service quality, and statutory consumer remedies need to match the actual service and Bachs configuration. Existing draft claims about cooling-off periods and refunds should not be treated as legal conclusions. | Identify the contracting entity and publish counsel-reviewed terms, disclosures, cancellation/refund process, contact details, and any required tax/VAT information. Confirm the CPA, ECTA, and other applicable requirements for digital services and subscriptions. |
| High | POPIA responsibility, retention, and cross-border processing | The product sends account details and creative inputs to several providers. Actual hosting locations, subprocessors, provider retention, deletion behavior, cross-border safeguards, operator/Responsible Party identity, and request handling are not yet fully documented. | Map data flows and locations; confirm provider contracts and data-processing terms; set retention/deletion schedules for account data, prompts, uploads, outputs, logs, and backups; document POPIA notices, rights handling, incident response, and the Information Regulator contact path. |
| High | Provider/model output rights and commercial-use claims | Output rights and permitted use can vary by upstream provider and model. The API Terms also include model-specific restrictions and may identify Excluded Models. A blanket promise that paid plans grant commercial rights is not supported by the evidence collected. | Keep marketing and plans conditional on the applicable provider/model terms; obtain written rights confirmation for each model and output use case; implement any required customer flow-down provisions; do not enable a model until its restrictions and data handling are understood. |
| High | Community publication and reuse permissions | Publishing can expose generated media, prompts, and settings. The current product does not establish a sufficiently precise license for visitor reuse, downstream copying, or cached copies after unpublishing. | Make publication an explicit opt-in with clear visibility and reuse terms. Define takedown, unpublishing, and cache behavior, and review notices and complaint workflows with counsel. |

## Additional review required

| Severity | Risk | Evidence and impact | Required action |
|---|---|---|---|
| Medium | Age restriction is not enforced | Draft terms require users to be at least 18, but the sign-in flow does not verify age. | Set the permitted age with counsel, implement an appropriate age gate if required, and document moderation/escalation procedures. |
| Medium | Public media provenance and trademark presentation | The project notes that some marketing media were generated using Higgsfield models. Provenance, source inputs, model-specific output terms, and any use of third-party marks or recognizable products need evidence. | Keep source/provenance records and provider receipts; review all public images/video and product marks; avoid implying affiliation or endorsement by Higgsfield or any model provider. |
| Medium | Template, media, and dependency license inventory | A complete scan of source-file origins, generated media, fonts, icons, npm dependencies, and copied assets has not been completed. | Run and retain a license inventory; inspect non-code assets and source notices; resolve incompatible, absent, or unclear licenses before distribution. |
| Medium | Consumer-facing price and tax presentation | Customer prices are ZAR, while internal platform costs are USD. Annual equivalents and annual totals must agree with Bachs product records; VAT and other required price disclosures are not confirmed. | Create Bachs products at the exact amounts in `lib/billing/plans.ts`, verify currency and tax presentation, and test renewals/refunds in sandbox before accepting payment. |
| Low | Cookie and analytics disclosures | The current cookie page contains unverified statements about analytics and third-party cookies. | Inventory cookies and browser storage in the deployed build, verify consent behavior, and publish only statements that match the implementation. |

## Verified provider and repository distinction

Higgsfield has published open-source tooling, but that does **not** make its
hosted REST API open source or override the API Terms:

- [`higgsfield-ai/higgsfield`](https://github.com/higgsfield-ai/higgsfield) is
  an Apache-2.0 GPU-orchestration / machine-learning framework, not the hosted
  generation API.
- [`higgsfield-ai/higgsfield-client`](https://github.com/higgsfield-ai/higgsfield-client)
  is an Apache-2.0 Python SDK for the API. The SDK license covers that client
  repository, not the hosted service or an API-resale right.
- [`higgsfield-ai/higgsfield-js`](https://github.com/higgsfield-ai/higgsfield-js)
  and [`higgsfield-ai/app-templates`](https://github.com/higgsfield-ai/app-templates)
  did not report a repository license in GitHub metadata when checked.
- The hosted service remains subject to the [API Terms](https://open.higgsfield.ai/terms-of-service)
  and the [Terms of Use](https://higgsfield.ai/terms-of-use-agreement).

## Operational safeguards currently in code

- Live calls to the Higgsfield host fail unless `HF_SAAS_APPROVAL_REFERENCE`
  is configured. Do not populate it with a ticket request or an internal note;
  use a reference to actual written authorization.
- Local mock calls remain available without that reference.
- The legal pages display an explicit draft warning and have `noindex` metadata.
- The live gate does not validate the legal sufficiency or scope of a provider
  authorization. Launch approval remains a human/legal review step.

Recheck this register whenever provider terms, model access, billing products,
hosting providers, or data flows change.
