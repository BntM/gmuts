export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const clientId = env.GITHUB_CLIENT_ID;
  const clientSecret = env.GITHUB_CLIENT_SECRET;

  // Handle the OAuth callback
  if (url.searchParams.has('code')) {
    const code = url.searchParams.get('code');

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.access_token) {
      const html = `<!DOCTYPE html>
<html>
  <head>
    <title>Authorizing...</title>
  </head>
  <body>
    <script>
      (function() {
        const token = "${tokenData.access_token}";
        const provider = "github";

        // Try multiple message formats for compatibility
        const message = "authorization:" + provider + ":success:" + JSON.stringify({ token, provider });

        if (window.opener) {
          window.opener.postMessage(message, "*");
          setTimeout(() => window.close(), 1000);
        } else {
          document.body.innerHTML = "<p>Authorization successful. You can close this window.</p>";
        }
      })();
    </script>
    <p>Authorizing, please wait...</p>
  </body>
</html>`;
      return new Response(html, {
        headers: { 'Content-Type': 'text/html' },
      });
    } else {
      return new Response('OAuth error: ' + JSON.stringify(tokenData), { status: 400 });
    }
  }

  // Handle errors from GitHub
  if (url.searchParams.has('error')) {
    const error = url.searchParams.get('error');
    const errorDescription = url.searchParams.get('error_description');
    return new Response(`OAuth error: ${error} - ${errorDescription}`, { status: 400 });
  }

  // Redirect to GitHub OAuth
  const redirectUri = `${url.origin}/oauth`;
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo,user&redirect_uri=${encodeURIComponent(redirectUri)}`;
  return Response.redirect(authUrl, 302);
}
