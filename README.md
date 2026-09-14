
# oauth-proxy

OAuth proxy for HMRC VAT MTD service. Proxies OAuth requests to HMRC,
injecting client ID and secret so they are not exposed to end users.

Deployed as a container on Google Cloud Run.

## Container

The container installs the `gnucash-uk-vat` Python package from PyPI and
runs the `vat-oauth-proxy` entry point.

## Environment variables

- `HMRC_CLIENT_ID` - HMRC OAuth client ID (secret)
- `HMRC_CLIENT_SECRET` - HMRC OAuth client secret (secret)
- `VERIFICATION_SECRET` - shared secret for request verification (secret)
- `HMRC_AUTH_URL` - HMRC auth URL (`https://www.tax.service.gov.uk`)
- `HMRC_API_URL` - HMRC API URL (`https://api.service.hmrc.gov.uk`)
- `PORT` - listen port (default 8080)

## Deployment

Deployed via GitHub Actions + Pulumi to Cloud Run:
- Push to `dev` branch deploys to `auth.dev.accountsmachine.io`
- Push to `prod` branch deploys to `auth.prod.accountsmachine.io`

Secrets (`HMRC_CLIENT_ID`, `HMRC_CLIENT_SECRET`, `VERIFICATION_SECRET`)
must be configured as GitHub Actions secrets per environment.
