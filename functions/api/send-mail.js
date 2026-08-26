import { Resend } from 'resend';

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();

    // Adjust these field names to match what your frontend actually sends
    const to = body.to || body.email || 'rogerdtinsley@gmail.com';
    const subject = body.subject || 'Workout Tracker Export';
    const html = body.html || body.message || `<pre>${JSON.stringify(body, null, 2)}</pre>`;

    const resend = new Resend(env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: 'Workout Tracker <onboarding@resend.dev>', // change this later to your verified domain
      to: [to],
      subject,
      html,
    });

    if (error) {
      return new Response(
        JSON.stringify({ success: false, error: error.message || 'Unknown Resend error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, id: data?.id }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Unknown error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}