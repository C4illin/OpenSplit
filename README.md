# OpenSplit

A self-hosted web application for splitting bills and expenses with friends. Only supports the swedish payment service Swish for now, but more can be added easily. Only Google oauth is supported for authentication, but only UI is needed for more providers, as PocketBase supports many more providers out of the box.

## Install

```yaml
services:
  opensplit:
    image: ghcr.io/c4illin/opensplit:main
    container_name: opensplit
    restart: always
    ports:
      - 5050:5050
    environment:
      - TZ=Europe/Stockholm
    volumes:
      - ./data/opensplit:/pb/pb_data
```

Then after the service is running, view the logs (e.g. `docker compose logs -f opensplit`) to see the URL for the admin panel and the generated credentials. Log in to pocketbase and configure google auth.

## Development

0. Install git and [Mise](https://mise.jdx.dev/)
1. Clone repo, `mise up` and then `vp i`
2. Start development server with `vp run dev`
