# Activations — backend

This activation game has **no backend of its own**. The single source of truth
is the **Cruffy backend API** (Node/Fastify/Postgres, deployed on Railway). The
static frontend in `../frontend/` talks to it directly.

## Endpoints used (Cruffy API)

Base URL (override in the game with `?api=`): `https://cruffyfoods-production.up.railway.app`

| Method | Path | Used for |
| --- | --- | --- |
| `GET`  | `/api/v1/activations/coupon?outcome=winner\|loser` | After the game, fetch the coupon for the result. `winner` = bigger %, `loser` = smaller %. The coupons are created in **Cruffy Control → Coupons** with "Activation coupon" checked + the Winner/Loser outcome. |
| `POST` | `/api/v1/activations/lead` | Sends the captured lead (name, email, whatsapp, zone, event) and, on the prize step, the outcome + coupon. Becomes a subscriber + `activation_lead` event in the CRM. |

The checkout deep-link the game builds:

```
{STORE}/cart/?add=bundle-12-mix&coupon={CODE}
```

…adds the 12-bag Mix bundle to the cart and pre-applies the coupon (the storefront
shows the discount; the player only fills in their data to pay).

## Configuration (query string)

| Param | Default | Meaning |
| --- | --- | --- |
| `api`    | `https://cruffyfoods-production.up.railway.app` | Cruffy API base URL |
| `store`  | `https://cruffyfoods.onrender.com` | Storefront base URL for the checkout link |
| `bundle` | `bundle-12-mix` | Product added to the cart |
| `evento`, `code`, `partner`, `flavor`, `fecha` | see `frontend/app.js` | per-activation copy/behaviour |

## Important: CORS

The Cruffy API only answers browsers whose origin is in its `FRONTEND_ORIGIN`
allowlist. **Add the activation site's domain there** (Railway env on the Cruffy
backend) or the `coupon`/`lead` calls will be blocked.

## Legacy

`google-apps-script.js` is the previous lead sink (Google Sheet). Leads now go to
the Cruffy CRM; the game still posts to the sheet as a best-effort backup if a
`?sheet=` URL is provided.
