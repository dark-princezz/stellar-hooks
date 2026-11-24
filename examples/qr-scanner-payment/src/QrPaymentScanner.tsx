import { useEffect, useRef, useState } from "react";
import { usePayment, parseSep7PayUri, type Sep7PayParams } from "stellar-hooks";

declare const BarcodeDetector: any;

export function QrPaymentScanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [form, setForm] = useState<Sep7PayParams | null>(null);
  const [error, setError] = useState<string | null>(null);
  const payment = usePayment({
    destination: form?.destination ?? "",
    amount: form?.amount ?? "0",
    asset: form?.assetCode && form.assetIssuer
      ? { type: "credit", code: form.assetCode, issuer: form.assetIssuer }
      : { type: "native" },
    memo: form?.memo,
  } as any);

  useEffect(() => {
    if (form) return;
    let stream: MediaStream | undefined;
    let stopped = false;
    (async () => {
      try {
        if (typeof BarcodeDetector === "undefined") throw new Error("BarcodeDetector is not supported in this browser.");
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        const detector = new BarcodeDetector({ formats: ["qr_code"] });
        while (!stopped) {
          const codes = await detector.detect(video);
          for (const code of codes) {
            const parsed = parseSep7PayUri(code.rawValue);
            if (parsed) {
              setForm(parsed);
              return;
            }
            setError("That QR code is not a valid Stellar payment request.");
          }
          await new Promise((r) => setTimeout(r, 250));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      stopped = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [form]);

  if (!form) {
    return (
      <div>
        <video ref={videoRef} muted playsInline style={{ width: "100%", maxWidth: 360 }} />
        {error && <p role="alert">{error}</p>}
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void payment.submit();
      }}
    >
      <input value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })} />
      <input value={form.amount ?? ""} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
      <input value={form.memo ?? ""} onChange={(e) => setForm({ ...form, memo: e.target.value })} />
      <button type="submit">Pay</button>
      <button type="button" onClick={() => setForm(null)}>Scan again</button>
    </form>
  );
}
