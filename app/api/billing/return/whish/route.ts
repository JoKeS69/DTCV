import { NextResponse } from "next/server";

/**
 * Browser return URL after Whish checkout.
 * Shows a verifying page that polls /api/billing/status — never grants access alone.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const ref = url.searchParams.get("ref") || "";
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Verifying payment · DETECTIVE</title>
  <style>
    body { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background:#050607; color:#e8eef5; display:flex; min-height:100vh; align-items:center; justify-content:center; margin:0; }
    .box { max-width:28rem; padding:1.5rem; border:1px solid #2a3340; background:#0c1016; }
    h1 { font-size:1rem; letter-spacing:.12em; text-transform:uppercase; margin:0 0 .75rem; }
    p { font-size:.75rem; color:#9aa8b8; line-height:1.5; }
    a { color:#c9d4e0; }
  </style>
</head>
<body>
  <div class="box">
    <h1>Verifying payment</h1>
    <p id="msg">Confirming Whish Money payment with the server. Access is granted only after server-to-server verification — this page alone never unlocks Fictional cases.</p>
    <p style="margin-top:1rem"><a href="/billing">Account billing</a> · <a href="/fictional">Fictional cases</a></p>
  </div>
  <script>
    const ref = ${JSON.stringify(ref)};
    let tries = 0;
    async function poll() {
      tries += 1;
      try {
        const res = await fetch('/api/billing/status', { credentials: 'same-origin' });
        if (res.ok) {
          const data = await res.json();
          if (data.allowed) {
            document.getElementById('msg').textContent = 'Payment verified. Redirecting to Fictional cases…';
            location.href = '/fictional';
            return;
          }
        }
      } catch (e) {}
      if (tries < 40) setTimeout(poll, 1500);
      else document.getElementById('msg').textContent = 'Still verifying. If you paid with Whish, wait a moment then refresh Billing. Do not close if the wallet debit succeeded — we never grant access from this URL alone.';
    }
    poll();
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
