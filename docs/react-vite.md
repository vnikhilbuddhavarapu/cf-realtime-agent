---
title: React + Vite · Cloudflare Workers docs
description: Create a React application and deploy it to Cloudflare Workers with
  Workers Assets.
lastUpdated: 2025-09-15T15:32:59.000Z
chatbotDeprioritize: false
tags: SPA
source_url:
  html: https://developers.cloudflare.com/workers/framework-guides/web-apps/react/
  md: https://developers.cloudflare.com/workers/framework-guides/web-apps/react/index.md
---

**Start from CLI** - scaffold a full-stack app with a React SPA, Cloudflare Workers API, and the [Cloudflare Vite plugin](https://developers.cloudflare.com/workers/vite-plugin/) for lightning-fast development.

* npm

  ```sh
  npm create cloudflare@latest -- my-react-app --framework=react
  ```

* yarn

  ```sh
  yarn create cloudflare my-react-app --framework=react
  ```

* pnpm

  ```sh
  pnpm create cloudflare@latest my-react-app --framework=react
  ```

***

**Or just deploy** - create a full-stack app using React, Hono API and Vite, with CI/CD and previews all set up for you.

[![Deploy to Workers](https://deploy.workers.cloudflare.com/button)](https://dash.cloudflare.com/?to=/:account/workers-and-pages/create/deploy-to-workers\&repository=https://github.com/cloudflare/templates/tree/main/vite-react-template)

## What is React?

[React](https://react.dev/) is a framework for building user interfaces. It allows you to create reusable UI components and manage the state of your application efficiently. You can use React to build a single-page application (SPA), and combine it with a backend API running on Cloudflare Workers to create a full-stack application.

## Creating a full-stack app with React

1. **Create a new project with the create-cloudflare CLI (C3)**

   * npm

     ```sh
     npm create cloudflare@latest -- my-react-app --framework=react
     ```

   * yarn

     ```sh
     yarn create cloudflare my-react-app --framework=react
     ```

   * pnpm

     ```sh
     pnpm create cloudflare@latest my-react-app --framework=react
     ```

   How is this project set up?

   Below is a simplified file tree of the project.

   `wrangler.jsonc` is your [Wrangler configuration file](https://developers.cloudflare.com/workers/wrangler/configuration/). In this file:

   * `main` points to `worker/index.ts`. This is your Worker, which is going to act as your backend API.
   * `assets.not_found_handling` is set to `single-page-application`, which means that routes that are handled by your React SPA do not go to the Worker, and are thus free.
   * If you want to add bindings to resources on Cloudflare's developer platform, you configure them here. Read more about [bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/).

   `vite.config.ts` is set up to use the [Cloudflare Vite plugin](https://developers.cloudflare.com/workers/vite-plugin/). This runs your Worker in the Cloudflare Workers runtime, ensuring your local development environment is as close to production as possible.

   `worker/index.ts` is your backend API, which contains a single endpoint, `/api/`, that returns a text response. At `src/App.tsx`, your React app calls this endpoint to get a message back and displays this.

2. **Develop locally with the [Cloudflare Vite plugin](https://developers.cloudflare.com/workers/vite-plugin/)**

   After creating your project, run the following command in your project directory to start a local development server.

   * npm

     ```sh
     npm run dev
     ```

   * yarn

     ```sh
     yarn run dev
     ```

   * pnpm

     ```sh
     pnpm run dev
     ```

   What's happening in local development?

   This project uses Vite for local development and build, and thus comes with all of Vite's features, including hot module replacement (HMR).

   In addition, `vite.config.ts` is set up to use the Cloudflare Vite plugin. This runs your application in the Cloudflare Workers runtime, just like in production, and enables access to local emulations of bindings.

3. **Deploy your project**

   Your project can be deployed to a `*.workers.dev` subdomain or a [Custom Domain](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/), from your own machine or from any CI/CD system, including Cloudflare's own [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/).

   The following command will build and deploy your project. If you are using CI, ensure you update your ["deploy command"](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/#build-settings) configuration appropriately.

   * npm

     ```sh
     npm run deploy
     ```

   * yarn

     ```sh
     yarn run deploy
     ```

   * pnpm

     ```sh
     pnpm run deploy
     ```

***

## Asset Routing

If you're using React as a SPA, you will want to set `not_found_handling = "single-page-application"` in your Wrangler configuration file.

By default, Cloudflare first tries to match a request path against a static asset path, which is based on the file structure of the uploaded asset directory. This is either the directory specified by `assets.directory` in your Wrangler config or, in the case of the [Cloudflare Vite plugin](https://developers.cloudflare.com/workers/vite-plugin/), the output directory of the client build. Failing that, we invoke a Worker if one is present. If there is no Worker, or the Worker then uses the asset binding, Cloudflare will fallback to the behaviour set by [`not_found_handling`](https://developers.cloudflare.com/workers/static-assets/#routing-behavior).

Refer to the [routing documentation](https://developers.cloudflare.com/workers/static-assets/routing/) for more information about how routing works with static assets, and how to customize this behavior.

## Use bindings with React

Your new project also contains a Worker at `./worker/index.ts`, which you can use as a backend API for your React application. While your React application cannot directly access Workers bindings, it can interact with them through this Worker. You can make [`fetch()` requests](https://developers.cloudflare.com/workers/runtime-apis/fetch/) from your React application to the Worker, which can then handle the request and use bindings. Learn how to [configure Workers bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/).

With bindings, your application can be fully integrated with the Cloudflare Developer Platform, giving you access to compute, storage, AI and more.

[Bindings ](https://developers.cloudflare.com/workers/runtime-apis/bindings/)Access to compute, storage, AI and more.


---
title: Static Assets · Cloudflare Workers docs
description: Create full-stack applications deployed to Cloudflare Workers.
lastUpdated: 2026-01-05T21:38:52.000Z
chatbotDeprioritize: false
source_url:
  html: https://developers.cloudflare.com/workers/static-assets/
  md: https://developers.cloudflare.com/workers/static-assets/index.md
---

You can upload static assets (HTML, CSS, images and other files) as part of your Worker, and Cloudflare will handle caching and serving them to web browsers.

**Start from CLI** - Scaffold a React SPA with an API Worker, and use the [Cloudflare Vite plugin](https://developers.cloudflare.com/workers/vite-plugin/).

* npm

  ```sh
  npm create cloudflare@latest -- my-react-app --framework=react
  ```

* yarn

  ```sh
  yarn create cloudflare my-react-app --framework=react
  ```

* pnpm

  ```sh
  pnpm create cloudflare@latest my-react-app --framework=react
  ```

***

**Or just deploy to Cloudflare**

[![Deploy to Workers](https://deploy.workers.cloudflare.com/button)](https://dash.cloudflare.com/?to=/:account/workers-and-pages/create/deploy-to-workers\&repository=https://github.com/cloudflare/templates/tree/main/vite-react-template)

Learn more about supported frameworks on Workers.

[Supported frameworks ](https://developers.cloudflare.com/workers/framework-guides/)Start building on Workers with our framework guides.

### How it works

When you deploy your project, Cloudflare deploys both your Worker code and your static assets in a single operation. This deployment operates as a tightly integrated "unit" running across Cloudflare's network, combining static file hosting, custom logic, and global caching.

The **assets directory** specified in your [Wrangler configuration file](https://developers.cloudflare.com/workers/wrangler/configuration/#assets) is central to this design. During deployment, Wrangler automatically uploads the files from this directory to Cloudflare's infrastructure. Once deployed, requests for these assets are routed efficiently to locations closest to your users.

* wrangler.jsonc

  ```jsonc
  {
    "$schema": "./node_modules/wrangler/config-schema.json",
    "name": "my-spa",
    "main": "src/index.js",
    "compatibility_date": "2025-01-01",
    "assets": {
      "directory": "./dist",
      "binding": "ASSETS"
    }
  }
  ```

* wrangler.toml

  ```toml
    name = "my-spa"
    main = "src/index.js"
    compatibility_date = "2025-01-01"
    [assets]
    directory = "./dist"
    binding = "ASSETS"
  ```

Note

If you are using the [Cloudflare Vite plugin](https://developers.cloudflare.com/workers/vite-plugin/), you do not need to specify `assets.directory`. For more information about using static assets with the Vite plugin, refer to the [plugin documentation](https://developers.cloudflare.com/workers/vite-plugin/reference/static-assets/).

By adding an [**assets binding**](https://developers.cloudflare.com/workers/static-assets/binding/#binding), you can directly fetch and serve assets within your Worker code.

* JavaScript

  ```js
  // index.js


  export default {
    async fetch(request, env) {
      const url = new URL(request.url);


      if (url.pathname.startsWith("/api/")) {
        return new Response(JSON.stringify({ name: "Cloudflare" }), {
          headers: { "Content-Type": "application/json" },
        });
      }


      return env.ASSETS.fetch(request);
    },
  };
  ```

* Python

  ```python
  from workers import WorkerEntrypoint, Response
  from urllib.parse import urlparse


  class Default(WorkerEntrypoint):
    async def fetch(self, request):
      # Example of serving static assets
      url = urlparse(request.url)
      if url.path.startswith("/api/):
        return Response.json({"name": "Cloudflare"})


      return await self.env.ASSETS.fetch(request)
  ```

### Routing behavior

By default, if a requested URL matches a file in the static assets directory, that file will be served — without invoking Worker code. If no matching asset is found and a Worker script is present, the request will be processed by the Worker. The Worker can return a response or choose to defer again to static assets by using the [assets binding](https://developers.cloudflare.com/workers/static-assets/binding/) (e.g. `env.ASSETS.fetch(request)`). If no Worker script is present, a `404 Not Found` response is returned.

The default behavior for requests which don't match a static asset can be changed by setting the [`not_found_handling` option under `assets`](https://developers.cloudflare.com/workers/wrangler/configuration/#assets) in your Wrangler configuration file:

* [`not_found_handling = "single-page-application"`](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/): Sets your application to return a `200 OK` response with `index.html` for requests which don't match a static asset. Use this if you have a Single Page Application. We recommend pairing this with selective routing using `run_worker_first` for [advanced routing control](https://developers.cloudflare.com/workers/static-assets/routing/single-page-application/#advanced-routing-control).
* [`not_found_handling = "404-page"`](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/#custom-404-pages): Sets your application to return a `404 Not Found` response with the nearest `404.html` for requests which don't match a static asset.

- wrangler.jsonc

  ```jsonc
  {
    "$schema": "./node_modules/wrangler/config-schema.json",
    "assets": {
      "directory": "./dist",
      "not_found_handling": "single-page-application"
    }
  }
  ```

- wrangler.toml

  ```toml
    [assets]
    directory = "./dist"
    not_found_handling = "single-page-application"
  ```

If you want the Worker code to execute before serving assets, you can use the `run_worker_first` option. This can be set to `true` to invoke the Worker script for all requests, or configured as an array of route patterns for selective Worker-script-first routing:

**Invoking your Worker script on specific paths:**

* wrangler.jsonc

  ```jsonc
  {
    "name": "my-spa-worker",
    "compatibility_date": "2026-01-16",
    "main": "./src/index.ts",
    "assets": {
      "directory": "./dist/",
      "not_found_handling": "single-page-application",
      "binding": "ASSETS",
      "run_worker_first": ["/api/*", "!/api/docs/*"]
    }
  }
  ```

* wrangler.toml

  ```toml
  name = "my-spa-worker"
  compatibility_date = "2026-01-16"
  main = "./src/index.ts"


  [assets]
  directory = "./dist/"
  not_found_handling = "single-page-application"
  binding = "ASSETS"
  run_worker_first = [ "/api/*", "!/api/docs/*" ]
  ```

[Routing options ](https://developers.cloudflare.com/workers/static-assets/routing/)Learn more about how you can customize routing behavior.

### Caching behavior

Cloudflare provides automatic caching for static assets across its network, ensuring fast delivery to users worldwide. When a static asset is requested, it is automatically cached for future requests.

* **First Request:** When an asset is requested for the first time, it is fetched from storage and cached at the nearest Cloudflare location.

* **Subsequent Requests:** If a request for the same asset reaches a data center that does not have it cached, Cloudflare's [tiered caching system](https://developers.cloudflare.com/cache/how-to/tiered-cache/) allows it to be retrieved from a nearby cache rather than going back to storage. This improves cache hit ratio, reduces latency, and reduces unnecessary origin fetches.

## Try it out

[Vite + React SPA tutorial ](https://developers.cloudflare.com/workers/vite-plugin/tutorial/)Learn how to build and deploy a full-stack Single Page Application with static assets and API routes.

## Learn more

[Supported frameworks ](https://developers.cloudflare.com/workers/framework-guides/)Start building on Workers with our framework guides.

[Billing and limitations ](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)Learn more about how requests are billed, current limitations, and troubleshooting.
