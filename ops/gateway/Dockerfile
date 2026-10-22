FROM rdqk1mqe0k8fifs64d7jrzfi:f2dd76c6eb5a7c884e2027c69f4c1edc750a94eb
WORKDIR /app
COPY ops/gateway/fahi.routes.js /app/src/routes/fahi.routes.js
COPY ops/gateway/server.js /app/ops/fahi-preview-server.js
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget -q -O /dev/null http://127.0.0.1:3000/health || exit 1
CMD ["node","ops/fahi-preview-server.js"]
