# kobecloud.be

My personal site: a terminal sitting on a desk in a small 3D room.

On load the camera drifts in from the desk to the monitor while the terminal types out `whoami`, `ls -l ~/projects`, `neofetch` and `cat contact.txt`. Press any key (or tap) to skip. After that the prompt is live: try `help`.

- The terminal is a real DOM element placed on the monitor with three.js `CSS3DRenderer`, so text stays sharp, selectable and typeable. The keyboard on the desk presses the keys you type, and the rack's LEDs blink.
- `view` (or the button) zooms out to the desk, `3d off` gives you just the terminal
- Tab completion, ↑/↓ history, `Ctrl+L` to clear, `theme` for light/dark
- Phones, small windows and browsers without WebGL2 get the flat terminal
- A few commands that aren't in `help`

## Layout

```
public/            the web root (this is all that gets served)
  index.html       page shell + no-JS fallback
  style.css        terminal look, both themes, 3D mode
  main.js          boot animation, commands, prompt
  scene.js         three.js desk scene
  theme.js         applies the saved theme before first paint
  vendor/three/    three.js r170 (MIT), vendored
  fonts/           JetBrains Mono (OFL), self-hosted
deploy/
  nginx.conf       nginx config used by the image
  k8s/             Kubernetes manifests (kustomize)
Dockerfile
docker-compose.yml
```

No build step and no third-party requests: three.js and the font are served from the site itself, so nginx can send a strict `Content-Security-Policy` with everything locked to `'self'`.

Run it locally with any static server:

```bash
python3 -m http.server -d public 8000
```

## Deploy

### Homelab: Kubernetes

CI (`.github/workflows/container.yml`) builds `ghcr.io/kobewijnants/kobecloud.be` for amd64 and arm64 on every push to `main`, tagged `latest` and `sha-<commit>`.

```bash
kubectl apply -k deploy/k8s
```

This creates the `kobecloud` namespace (Pod Security `restricted`), two replicas spread across nodes, a PodDisruptionBudget, a Service and an Ingress for `kobecloud.be` and `www.kobecloud.be`. Before applying:

- set `ingressClassName` in `deploy/k8s/ingress.yaml` if the cluster has no default ingress class
- uncomment the cert-manager annotation there if you use cert-manager for TLS
- make the GHCR package public, or add an `imagePullSecret`
- pin `newTag` in `deploy/k8s/kustomization.yaml` to a `sha-…` tag for reproducible rollouts

To roll out a new `latest`: `kubectl -n kobecloud rollout restart deploy/kobecloud-web`.

### Homelab: plain Docker

```bash
docker compose up -d   # serves on :8080
```

Put your reverse proxy in front of port 8080. The container runs as a non-root user with a read-only filesystem. `/healthz` returns `ok`.

### DNS

Point `kobecloud.be` and `www.kobecloud.be` at the homelab: its public IP, or a tunnel (for example Cloudflare Tunnel) if you'd rather not open ports.

## License

Code: [MIT](LICENSE). three.js: MIT (`public/vendor/three/LICENSE`). JetBrains Mono: SIL OFL 1.1 (`public/fonts/OFL.txt`).
