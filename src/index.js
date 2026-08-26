import { Resend } from "resend";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle the email endpoint
    if (url.pathname === "/api/send-mail" && request.method === "POST") {
      try {
        const body = await request.json();

        const to = body.to || body.email || "rogerdtinsley@gmail.com";
        const subject = body.subject || "Workout Tracker Export";
        const html =
          body.html ||
          body.message ||
          `<pre>${JSON.stringify(body, null, 2)}</pre>`;

        const resend = new Resend(env.RESEND_API_KEY);

        const { data, error } = await resend.emails.send({
          from: "Workout Tracker <onboarding@resend.dev>",
          to: [to],
          subject,
          html,
        });

        if (error) {
          return Response.json(
            { success: false, error: error.message || "Resend error" },
            { status: 500 }
          );
        }

        return Response.json({ success: true, id: data?.id });
      } catch (err) {
        return Response.json(
          { success: false, error: err.message || "Unknown error" },
          { status: 500 }
        );
      }
    }

    // Serve static files from the public folder
    return env.ASSETS.fetch(request);
  },
};