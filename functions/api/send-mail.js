export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { email, workouts } = await request.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!Array.isArray(workouts) || workouts.length === 0) {
      return new Response(JSON.stringify({ error: "No workouts provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    if (!env.RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Server misconfigured (missing RESEND_API_KEY)" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Build a simple HTML table of the workouts
    let rows = workouts.map(w => `
      <tr>
        <td>${escapeHtml(w.date || "")}</td>
        <td>${escapeHtml(w.time || "")}</td>
        <td>${escapeHtml(w.type || "")}</td>
        <td>${escapeHtml(String(w.distance ?? ""))}</td>
        <td>${escapeHtml(String(w.pace ?? ""))}</td>
        <td>${escapeHtml(w.bp || "")}</td>
        <td>${escapeHtml(w.temp != null ? String(w.temp) : "")}</td>
        <td>${escapeHtml(w.weather || "")}</td>
        <td>${escapeHtml(w.comments || "")}</td>
      </tr>
    `).join("");

    const html = `
      <h2>Your Workout Log</h2>
      <p>Here are all ${workouts.length} recorded workout(s):</p>
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:14px;">
        <thead>
          <tr style="background:#ff69b4;color:white;">
            <th>Date</th>
            <th>Time</th>
            <th>Type</th>
            <th>Distance (mi)</th>
            <th>Pace (min/mi)</th>
            <th>BP</th>
            <th>Temp (°F)</th>
            <th>Weather</th>
            <th>Comments</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <p style="margin-top:1.5em;color:#666;font-size:12px;">Sent from your Workout Tracker at bondslavetesting.org</p>
    `;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Workout Tracker <onboarding@resend.dev>",  // change to your verified Resend domain/address
        to: [email],
        subject: `Your Workout Log (${workouts.length} entries)`,
        html
      })
    });

    const resendData = await resendRes.json().catch(() => ({}));

    if (!resendRes.ok) {
      return new Response(JSON.stringify({ error: resendData.message || "Resend API error" }), {
        status: 502,
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}