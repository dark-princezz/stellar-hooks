# QR scanner → payment form

Camera-based scanner that reads a SEP-7 `web+stellar:pay` QR code, parses it with
`parseSep7PayUri`, and pre-fills a payment form. Uses the browser's
`BarcodeDetector` API (Chromium/Android/Safari TP); swap in a library such as
`jsqr` for other browsers.

The component lives in `src/QrPaymentScanner.tsx`. It is a standalone snippet and
has not been wired into a Vite project like the other examples; copy it into one.
