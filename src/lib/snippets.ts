export function proxySnippet(host: string, slug: string) {
  return `server {
  server_name ${host};
  location / {
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Tajer-Tenant ${slug};
    proxy_pass http://127.0.0.1:3000;
  }
}`;
}
