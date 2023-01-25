# Index UI

frontend ui for https://svc.ccts.dev

## build

build static assets.

```shell
pnpm build
```

## deployment

1. set required environment variables in pages settings.
2. publish

```shell
wrangler pages publish ./build
```
