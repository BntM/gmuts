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
      // Return HTML that sends the token to the parent window
      const html = `
        <!DOCTYPE html>
        <html>
          <head><title>OAuth Complete</title></head>
          <body>
            <script>
              (function() {
                function sendMessage(message) {
                  window.opener.postMessage(
                    'authorization:github:${tokenData.access_token ? 'success' : 'error'}:' + JSON.stringify(message),
                    '*'
                  );
                  window.close();
                }
                sendMessage({ token: '${tokenData.access_token}', provider: 'github' });
              })();
            </script>
          </body>
        </html>
      `;
      return new Response(html, {
        headers: { 'Content-Type': 'text/html' },
      });
    } else {
      return new Response('OAuth error: ' + JSON.stringify(tokenData), { status: 400 });
    }
  }

  // Redirect to GitHub OAuth
  const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo,user`;
  return Response.redirect(authUrl, 302);
}
