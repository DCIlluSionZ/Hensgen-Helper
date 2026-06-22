# public/

Anything in this folder is served at the site root by Vite.

## DCI banner

Save the DCI banner image at `public/dci-banner.png`.

The Home screen renders `<img src="/dci-banner.png" />` and hides it gracefully
if the file isn't there yet (no broken-image icon).

Replace the file any time and re-run `npm run build && npx cap sync` to refresh
the APK.
