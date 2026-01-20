---
title: Retrieval Augmented Generation (RAG) · Cloudflare Reference Architecture docs
description: RAG combines retrieval with generative models for better text. It
  uses external knowledge to create factual, relevant responses, improving
  coherence and accuracy in NLP tasks like chatbots.
lastUpdated: 2025-08-19T18:37:36.000Z
chatbotDeprioritize: false
tags: AI
source_url:
  html: https://developers.cloudflare.com/reference-architecture/diagrams/ai/ai-rag/
  md: https://developers.cloudflare.com/reference-architecture/diagrams/ai/ai-rag/index.md
---

Retrieval-Augmented Generation (RAG) is an innovative approach in natural language processing that integrates retrieval mechanisms with generative models to enhance text generation.

By incorporating external knowledge from pre-existing sources, RAG addresses the challenge of generating contextually relevant and informative text. This integration enables RAG to overcome the limitations of traditional generative models by ensuring that the generated text is grounded in factual information and context. RAG aims to solve the problem of information overload by efficiently retrieving and incorporating only the most relevant information into the generated text, leading to improved coherence and accuracy. Overall, RAG represents a significant advancement in NLP, offering a more robust and contextually aware approach to text generation.

Examples for application of these technique includes for instance customer service chat bots that use a knowledge base to answer support requests.

In the context of Retrieval-Augmented Generation (RAG), knowledge seeding involves incorporating external information from pre-existing sources into the generative process, while querying refers to the mechanism of retrieving relevant knowledge from these sources to inform the generation of coherent and contextually accurate text. Both are shown below.

Looking for a managed option?

[AutoRAG](https://developers.cloudflare.com/autorag) offers a fully managed way to build RAG pipelines on Cloudflare, handling ingestion, indexing, and querying out of the box. [Get started with AutoRAG](https://developers.cloudflare.com/autorag/get-started/).

## Knowledge Seeding

![Figure 1: Knowledge seeding](https://developers.cloudflare.com/_astro/rag-architecture-seeding.BVBY5k5z_2g5MiU.svg)

1. **Client upload**: Send POST request with documents to API endpoint.
2. **Input processing**: Process incoming request using [Workers](https://developers.cloudflare.com/workers/) and send messages to [Queues](https://developers.cloudflare.com/queues/) to add processing backlog.
3. **Batch processing**: Use [Queues](https://developers.cloudflare.com/queues/) to trigger a [consumer](https://developers.cloudflare.com/queues/reference/how-queues-works/#consumers) that process input documents in batches to prevent downstream overload.
4. **Embedding generation**: Generate embedding vectors by calling [Workers AI](https://developers.cloudflare.com/workers-ai/) [text embedding models](https://developers.cloudflare.com/workers-ai/models/) for the documents.
5. **Vector storage**: Insert the embedding vectors to [Vectorize](https://developers.cloudflare.com/vectorize/).
6. **Document storage**: Insert documents to [D1](https://developers.cloudflare.com/d1/) for persistent storage.
7. **Ack/Retry mechanism**: Signal success/error by using the [Queues Runtime API](https://developers.cloudflare.com/queues/configuration/javascript-apis/#message) in the consumer for each document. [Queues](https://developers.cloudflare.com/queues/) will schedule retries, if needed.

## Knowledge Queries

![Figure 2: Knowledge queries](https://developers.cloudflare.com/_astro/rag-architecture-query.CtBKQkxk_2g5MiU.svg)

1. **Client query**: Send GET request with query to API endpoint.
2. **Embedding generation**: Generate embedding vectors by calling [Workers AI](https://developers.cloudflare.com/workers-ai/) [text embedding models](https://developers.cloudflare.com/workers-ai/models/) for the incoming query.
3. **Vector search**: Query [Vectorize](https://developers.cloudflare.com/vectorize/) using the vector representation of the query to retrieve related vectors.
4. **Document lookup**: Retrieve related documents from [D1](https://developers.cloudflare.com/d1/) based on search results from [Vectorize](https://developers.cloudflare.com/vectorize/).
5. **Text generation**: Pass both the original query and the retrieved documents as context to [Workers AI](https://developers.cloudflare.com/workers-ai/) [text generation models](https://developers.cloudflare.com/workers-ai/models/) to generate a response.

## Related resources

* [Tutorial: Build a RAG AI](https://developers.cloudflare.com/workers-ai/guides/tutorials/build-a-retrieval-augmented-generation-ai/)
* [Get started with AutoRAG](https://developers.cloudflare.com/autorag/get-started/)
* [Workers AI: Text embedding models](https://developers.cloudflare.com/workers-ai/models/)
* [Workers AI: Text generation models](https://developers.cloudflare.com/workers-ai/models/)

---
title: Build a Retrieval Augmented Generation (RAG) AI · Cloudflare Workers AI docs
description: Build your first AI app with Cloudflare AI. This guide uses Workers
  AI, Vectorize, D1, and Cloudflare Workers.
lastUpdated: 2025-08-19T18:37:36.000Z
chatbotDeprioritize: false
tags: AI,Hono,JavaScript
source_url:
  html: https://developers.cloudflare.com/workers-ai/guides/tutorials/build-a-retrieval-augmented-generation-ai/
  md: https://developers.cloudflare.com/workers-ai/guides/tutorials/build-a-retrieval-augmented-generation-ai/index.md
---

This guide will instruct you through setting up and deploying your first application with Cloudflare AI. You will build a fully-featured AI-powered application, using tools like Workers AI, Vectorize, D1, and Cloudflare Workers.

Looking for a managed option?

[AutoRAG](https://developers.cloudflare.com/autorag) offers a fully managed way to build RAG pipelines on Cloudflare, handling ingestion, indexing, and querying out of the box. [Get started](https://developers.cloudflare.com/autorag/get-started/).

At the end of this tutorial, you will have built an AI tool that allows you to store information and query it using a Large Language Model. This pattern, known as Retrieval Augmented Generation, or RAG, is a useful project you can build by combining multiple aspects of Cloudflare's AI toolkit. You do not need to have experience working with AI tools to build this application.

1. Sign up for a [Cloudflare account](https://dash.cloudflare.com/sign-up/workers-and-pages).
2. Install [`Node.js`](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).

Node.js version manager

Use a Node version manager like [Volta](https://volta.sh/) or [nvm](https://github.com/nvm-sh/nvm) to avoid permission issues and change Node.js versions. [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/), discussed later in this guide, requires a Node version of `16.17.0` or later.

You will also need access to [Vectorize](https://developers.cloudflare.com/vectorize/platform/pricing/). During this tutorial, we will show how you can optionally integrate with [Anthropic Claude](http://anthropic.com) as well. You will need an [Anthropic API key](https://docs.anthropic.com/en/api/getting-started) to do so.

## 1. Create a new Worker project

C3 (`create-cloudflare-cli`) is a command-line tool designed to help you setup and deploy Workers to Cloudflare as fast as possible.

Open a terminal window and run C3 to create your Worker project:

* npm

  ```sh
  npm create cloudflare@latest -- rag-ai-tutorial
  ```

* yarn

  ```sh
  yarn create cloudflare rag-ai-tutorial
  ```

* pnpm

  ```sh
  pnpm create cloudflare@latest rag-ai-tutorial
  ```

For setup, select the following options:

* For *What would you like to start with?*, choose `Hello World example`.
* For *Which template would you like to use?*, choose `Worker only`.
* For *Which language do you want to use?*, choose `JavaScript`.
* For *Do you want to use git for version control?*, choose `Yes`.
* For *Do you want to deploy your application?*, choose `No` (we will be making some changes before deploying).

In your project directory, C3 has generated several files.

What files did C3 create?

1. `wrangler.jsonc`: Your [Wrangler](https://developers.cloudflare.com/workers/wrangler/configuration/#sample-wrangler-configuration) configuration file.
2. `worker.js` (in `/src`): A minimal `'Hello World!'` Worker written in [ES module](https://developers.cloudflare.com/workers/reference/migrate-to-module-workers/) syntax.
3. `package.json`: A minimal Node dependencies configuration file.
4. `package-lock.json`: Refer to [`npm` documentation on `package-lock.json`](https://docs.npmjs.com/cli/v9/configuring-npm/package-lock-json).
5. `node_modules`: Refer to [`npm` documentation `node_modules`](https://docs.npmjs.com/cli/v7/configuring-npm/folders#node-modules).

Now, move into your newly created directory:

```sh
cd rag-ai-tutorial
```

## 2. Develop with Wrangler CLI

The Workers command-line interface, [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/), allows you to [create](https://developers.cloudflare.com/workers/wrangler/commands/#init), [test](https://developers.cloudflare.com/workers/wrangler/commands/#dev), and [deploy](https://developers.cloudflare.com/workers/wrangler/commands/#deploy) your Workers projects. C3 will install Wrangler in projects by default.

After you have created your first Worker, run the [`wrangler dev`](https://developers.cloudflare.com/workers/wrangler/commands/#dev) command in the project directory to start a local server for developing your Worker. This will allow you to test your Worker locally during development.

```sh
npx wrangler dev --remote
```

Note

If you have not used Wrangler before, it will try to open your web browser to login with your Cloudflare account.

If you have issues with this step or you do not have access to a browser interface, refer to the [`wrangler login`](https://developers.cloudflare.com/workers/wrangler/commands/#login) documentation for more information.

You will now be able to go to <http://localhost:8787> to see your Worker running. Any changes you make to your code will trigger a rebuild, and reloading the page will show you the up-to-date output of your Worker.

## 3. Adding the AI binding

To begin using Cloudflare's AI products, you can add the `ai` block to the [Wrangler configuration file](https://developers.cloudflare.com/workers/wrangler/configuration/). This will set up a binding to Cloudflare's AI models in your code that you can use to interact with the available AI models on the platform.

This example features the [`@cf/meta/llama-3-8b-instruct` model](https://developers.cloudflare.com/workers-ai/models/llama-3-8b-instruct/), which generates text.

* wrangler.jsonc

  ```jsonc
  {
    "ai": {
      "binding": "AI"
    }
  }
  ```

* wrangler.toml

  ```toml
  [ai]
  binding = "AI"
  ```

Now, find the `src/index.js` file. Inside the `fetch` handler, you can query the `AI` binding:

```js
export default {
  async fetch(request, env, ctx) {
    const answer = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
      messages: [{ role: "user", content: `What is the square root of 9?` }],
    });


    return new Response(JSON.stringify(answer));
  },
};
```

By querying the LLM through the `AI` binding, we can interact directly with Cloudflare AI's large language models directly in our code. In this example, we are using the [`@cf/meta/llama-3-8b-instruct` model](https://developers.cloudflare.com/workers-ai/models/llama-3-8b-instruct/), which generates text.

You can deploy your Worker using `wrangler`:

```sh
npx wrangler deploy
```

Making a request to your Worker will now generate a text response from the LLM, and return it as a JSON object.

```sh
curl https://example.username.workers.dev
```

```sh
{"response":"Answer: The square root of 9 is 3."}
```

## 4. Adding embeddings using Cloudflare D1 and Vectorize

Embeddings allow you to add additional capabilities to the language models you can use in your Cloudflare AI projects. This is done via **Vectorize**, Cloudflare's vector database.

To begin using Vectorize, create a new embeddings index using `wrangler`. This index will store vectors with 768 dimensions, and will use cosine similarity to determine which vectors are most similar to each other:

```sh
npx wrangler vectorize create vector-index --dimensions=768 --metric=cosine
```

Then, add the configuration details for your new Vectorize index to the [Wrangler configuration file](https://developers.cloudflare.com/workers/wrangler/configuration/):

* wrangler.jsonc

  ```jsonc
  {
    "vectorize": [
      {
        "binding": "VECTOR_INDEX",
        "index_name": "vector-index"
      }
    ]
  }
  ```

* wrangler.toml

  ```toml
  # ... existing wrangler configuration


  [[vectorize]]
  binding = "VECTOR_INDEX"
  index_name = "vector-index"
  ```

A vector index allows you to store a collection of dimensions, which are floating point numbers used to represent your data. When you want to query the vector database, you can also convert your query into dimensions. **Vectorize** is designed to efficiently determine which stored vectors are most similar to your query.

To implement the searching feature, you must set up a D1 database from Cloudflare. In D1, you can store your app's data. Then, you change this data into a vector format. When someone searches and it matches the vector, you can show them the matching data.

Create a new D1 database using `wrangler`:

```sh
npx wrangler d1 create database
```

Then, paste the configuration details output from the previous command into the [Wrangler configuration file](https://developers.cloudflare.com/workers/wrangler/configuration/):

* wrangler.jsonc

  ```jsonc
  {
    "d1_databases": [
      {
        "binding": "DB",
        "database_name": "database",
        "database_id": "abc-def-geh"
      }
    ]
  }
  ```

* wrangler.toml

  ```toml
  # ... existing wrangler configuration


  [[d1_databases]]
  binding = "DB" # available in your Worker on env.DB
  database_name = "database"
  database_id = "abc-def-geh" # replace this with a real database_id (UUID)
  ```

In this application, we'll create a `notes` table in D1, which will allow us to store notes and later retrieve them in Vectorize. To create this table, run a SQL command using `wrangler d1 execute`:

```sh
npx wrangler d1 execute database --remote --command "CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY, text TEXT NOT NULL)"
```

Now, we can add a new note to our database using `wrangler d1 execute`:

```sh
npx wrangler d1 execute database --remote --command "INSERT INTO notes (text) VALUES ('The best pizza topping is pepperoni')"
```

## 5. Creating a workflow

Before we begin creating notes, we will introduce a [Cloudflare Workflow](https://developers.cloudflare.com/workflows). This will allow us to define a durable workflow that can safely and robustly execute all the steps of the RAG process.

To begin, add a new `[[workflows]]` block to your [Wrangler configuration file](https://developers.cloudflare.com/workers/wrangler/configuration/):

* wrangler.jsonc

  ```jsonc
  {
    "workflows": [
      {
        "name": "rag",
        "binding": "RAG_WORKFLOW",
        "class_name": "RAGWorkflow"
      }
    ]
  }
  ```

* wrangler.toml

  ```toml
  # ... existing wrangler configuration


  [[workflows]]
  name = "rag"
  binding = "RAG_WORKFLOW"
  class_name = "RAGWorkflow"
  ```

In `src/index.js`, add a new class called `RAGWorkflow` that extends `WorkflowEntrypoint`:

```js
import { WorkflowEntrypoint } from "cloudflare:workers";


export class RAGWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    await step.do("example step", async () => {
      console.log("Hello World!");
    });
  }
}
```

This class will define a single workflow step that will log "Hello World!" to the console. You can add as many steps as you need to your workflow.

On its own, this workflow will not do anything. To execute the workflow, we will call the `RAG_WORKFLOW` binding, passing in any parameters that the workflow needs to properly complete. Here is an example of how we can call the workflow:

```js
env.RAG_WORKFLOW.create({ params: { text } });
```

## 6. Creating notes and adding them to Vectorize

To expand on your Workers function in order to handle multiple routes, we will add `hono`, a routing library for Workers. This will allow us to create a new route for adding notes to our database. Install `hono` using `npm`:

* npm

  ```sh
  npm i hono
  ```

* yarn

  ```sh
  yarn add hono
  ```

* pnpm

  ```sh
  pnpm add hono
  ```

Then, import `hono` into your `src/index.js` file. You should also update the `fetch` handler to use `hono`:

```js
import { Hono } from "hono";
const app = new Hono();


app.get("/", async (c) => {
  const answer = await c.env.AI.run("@cf/meta/llama-3-8b-instruct", {
    messages: [{ role: "user", content: `What is the square root of 9?` }],
  });


  return c.json(answer);
});


export default app;
```

This will establish a route at the root path `/` that is functionally equivalent to the previous version of your application.

Now, we can update our workflow to begin adding notes to our database, and generating the related embeddings for them.

This example features the [`@cf/baai/bge-base-en-v1.5` model](https://developers.cloudflare.com/workers-ai/models/bge-base-en-v1.5/), which can be used to create an embedding. Embeddings are stored and retrieved inside [Vectorize](https://developers.cloudflare.com/vectorize/), Cloudflare's vector database. The user query is also turned into an embedding so that it can be used for searching within Vectorize.

```js
import { WorkflowEntrypoint } from "cloudflare:workers";


export class RAGWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const env = this.env;
    const { text } = event.payload;


    const record = await step.do(`create database record`, async () => {
      const query = "INSERT INTO notes (text) VALUES (?) RETURNING *";


      const { results } = await env.DB.prepare(query).bind(text).run();


      const record = results[0];
      if (!record) throw new Error("Failed to create note");
      return record;
    });


    const embedding = await step.do(`generate embedding`, async () => {
      const embeddings = await env.AI.run("@cf/baai/bge-base-en-v1.5", {
        text: text,
      });
      const values = embeddings.data[0];
      if (!values) throw new Error("Failed to generate vector embedding");
      return values;
    });


    await step.do(`insert vector`, async () => {
      return env.VECTOR_INDEX.upsert([
        {
          id: record.id.toString(),
          values: embedding,
        },
      ]);
    });
  }
}
```

The workflow does the following things:

1. Accepts a `text` parameter.
2. Insert a new row into the `notes` table in D1, and retrieve the `id` of the new row.
3. Convert the `text` into a vector using the `embeddings` model of the LLM binding.
4. Upsert the `id` and `vectors` into the `vector-index` index in Vectorize.

By doing this, you will create a new vector representation of the note, which can be used to retrieve the note later.

To complete the code, we will add a route that allows users to submit notes to the database. This route will parse the JSON request body, get the `note` parameter, and create a new instance of the workflow, passing the parameter:

```js
app.post("/notes", async (c) => {
  const { text } = await c.req.json();
  if (!text) return c.text("Missing text", 400);
  await c.env.RAG_WORKFLOW.create({ params: { text } });
  return c.text("Created note", 201);
});
```

## 7. Querying Vectorize to retrieve notes

To complete your code, you can update the root path (`/`) to query Vectorize. You will convert the query into a vector, and then use the `vector-index` index to find the most similar vectors.

The `topK` parameter limits the number of vectors returned by the function. For instance, providing a `topK` of 1 will only return the *most similar* vector based on the query. Setting `topK` to 5 will return the 5 most similar vectors.

Given a list of similar vectors, you can retrieve the notes that match the record IDs stored alongside those vectors. In this case, we are only retrieving a single note - but you may customize this as needed.

You can insert the text of those notes as context into the prompt for the LLM binding. This is the basis of Retrieval-Augmented Generation, or RAG: providing additional context from data outside of the LLM to enhance the text generated by the LLM.

We'll update the prompt to include the context, and to ask the LLM to use the context when responding:

```js
import { Hono } from "hono";
const app = new Hono();


// Existing post route...
// app.post('/notes', async (c) => { ... })


app.get("/", async (c) => {
  const question = c.req.query("text") || "What is the square root of 9?";


  const embeddings = await c.env.AI.run("@cf/baai/bge-base-en-v1.5", {
    text: question,
  });
  const vectors = embeddings.data[0];


  const vectorQuery = await c.env.VECTOR_INDEX.query(vectors, { topK: 1 });
  let vecId;
  if (
    vectorQuery.matches &&
    vectorQuery.matches.length > 0 &&
    vectorQuery.matches[0]
  ) {
    vecId = vectorQuery.matches[0].id;
  } else {
    console.log("No matching vector found or vectorQuery.matches is empty");
  }


  let notes = [];
  if (vecId) {
    const query = `SELECT * FROM notes WHERE id = ?`;
    const { results } = await c.env.DB.prepare(query).bind(vecId).run();
    if (results) notes = results.map((vec) => vec.text);
  }


  const contextMessage = notes.length
    ? `Context:\n${notes.map((note) => `- ${note}`).join("\n")}`
    : "";


  const systemPrompt = `When answering the question or responding, use the context provided, if it is provided and relevant.`;


  const { response: answer } = await c.env.AI.run(
    "@cf/meta/llama-3-8b-instruct",
    {
      messages: [
        ...(notes.length ? [{ role: "system", content: contextMessage }] : []),
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
    },
  );


  return c.text(answer);
});


app.onError((err, c) => {
  return c.text(err);
});


export default app;
```

## 8. Adding Anthropic Claude model (optional)

If you are working with larger documents, you have the option to use Anthropic's [Claude models](https://claude.ai/), which have large context windows and are well-suited to RAG workflows.

To begin, install the `@anthropic-ai/sdk` package:

* npm

  ```sh
  npm i @anthropic-ai/sdk
  ```

* yarn

  ```sh
  yarn add @anthropic-ai/sdk
  ```

* pnpm

  ```sh
  pnpm add @anthropic-ai/sdk
  ```

In `src/index.js`, you can update the `GET /` route to check for the `ANTHROPIC_API_KEY` environment variable. If it's set, we can generate text using the Anthropic SDK. If it isn't set, we'll fall back to the existing Workers AI code:

```js
import Anthropic from '@anthropic-ai/sdk';


app.get('/', async (c) => {
  // ... Existing code
  const systemPrompt = `When answering the question or responding, use the context provided, if it is provided and relevant.`


  let modelUsed: string = ""
  let response = null


  if (c.env.ANTHROPIC_API_KEY) {
    const anthropic = new Anthropic({
      apiKey: c.env.ANTHROPIC_API_KEY
    })


    const model = "claude-3-5-sonnet-latest"
    modelUsed = model


    const message = await anthropic.messages.create({
      max_tokens: 1024,
      model,
      messages: [
        { role: 'user', content: question }
      ],
      system: [systemPrompt, notes ? contextMessage : ''].join(" ")
    })


    response = {
      response: message.content.map(content => content.text).join("\n")
    }
  } else {
    const model = "@cf/meta/llama-3.1-8b-instruct"
    modelUsed = model


    response = await c.env.AI.run(
      model,
      {
        messages: [
          ...(notes.length ? [{ role: 'system', content: contextMessage }] : []),
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ]
      }
    )
  }


  if (response) {
    c.header('x-model-used', modelUsed)
    return c.text(response.response)
  } else {
    return c.text("We were unable to generate output", 500)
  }
})
```

Finally, you'll need to set the `ANTHROPIC_API_KEY` environment variable in your Workers application. You can do this by using `wrangler secret put`:

```sh
$ npx wrangler secret put ANTHROPIC_API_KEY
```

## 9. Deleting notes and vectors

If you no longer need a note, you can delete it from the database. Any time that you delete a note, you will also need to delete the corresponding vector from Vectorize. You can implement this by building a `DELETE /notes/:id` route in your `src/index.js` file:

```js
app.delete("/notes/:id", async (c) => {
  const { id } = c.req.param();


  const query = `DELETE FROM notes WHERE id = ?`;
  await c.env.DB.prepare(query).bind(id).run();


  await c.env.VECTOR_INDEX.deleteByIds([id]);


  return c.status(204);
});
```

## 10. Text splitting (optional)

For large pieces of text, it is recommended to split the text into smaller chunks. This allows LLMs to more effectively gather relevant context, without needing to retrieve large pieces of text.

To implement this, we'll add a new NPM package to our project, \`@langchain/textsplitters':

* npm

  ```sh
  npm i @langchain/textsplitters
  ```

* yarn

  ```sh
  yarn add @langchain/textsplitters
  ```

* pnpm

  ```sh
  pnpm add @langchain/textsplitters
  ```

The `RecursiveCharacterTextSplitter` class provided by this package will split the text into smaller chunks. It can be customized to your liking, but the default config works in most cases:

```js
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";


const text = "Some long piece of text...";


const splitter = new RecursiveCharacterTextSplitter({
  // These can be customized to change the chunking size
  // chunkSize: 1000,
  // chunkOverlap: 200,
});


const output = await splitter.createDocuments([text]);
console.log(output); // [{ pageContent: 'Some long piece of text...' }]
```

To use this splitter, we'll update the workflow to split the text into smaller chunks. We'll then iterate over the chunks and run the rest of the workflow for each chunk of text:

```js
export class RAGWorkflow extends WorkflowEntrypoint {
  async run(event, step) {
    const env = this.env;
    const { text } = event.payload;
    let texts = await step.do("split text", async () => {
      const splitter = new RecursiveCharacterTextSplitter();
      const output = await splitter.createDocuments([text]);
      return output.map((doc) => doc.pageContent);
    });


    console.log(
      "RecursiveCharacterTextSplitter generated ${texts.length} chunks",
    );


    for (const index in texts) {
      const text = texts[index];
      const record = await step.do(
        `create database record: ${index}/${texts.length}`,
        async () => {
          const query = "INSERT INTO notes (text) VALUES (?) RETURNING *";


          const { results } = await env.DB.prepare(query).bind(text).run();


          const record = results[0];
          if (!record) throw new Error("Failed to create note");
          return record;
        },
      );


      const embedding = await step.do(
        `generate embedding: ${index}/${texts.length}`,
        async () => {
          const embeddings = await env.AI.run("@cf/baai/bge-base-en-v1.5", {
            text: text,
          });
          const values = embeddings.data[0];
          if (!values) throw new Error("Failed to generate vector embedding");
          return values;
        },
      );


      await step.do(`insert vector: ${index}/${texts.length}`, async () => {
        return env.VECTOR_INDEX.upsert([
          {
            id: record.id.toString(),
            values: embedding,
          },
        ]);
      });
    }
  }
}
```

Now, when large pieces of text are submitted to the `/notes` endpoint, they will be split into smaller chunks, and each chunk will be processed by the workflow.

## 11. Deploy your project

If you did not deploy your Worker during [step 1](https://developers.cloudflare.com/workers/get-started/guide/#1-create-a-new-worker-project), deploy your Worker via Wrangler, to a `*.workers.dev` subdomain, or a [Custom Domain](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/), if you have one configured. If you have not configured any subdomain or domain, Wrangler will prompt you during the publish process to set one up.

```sh
npx wrangler deploy
```

Preview your Worker at `<YOUR_WORKER>.<YOUR_SUBDOMAIN>.workers.dev`.

Note

When pushing to your `*.workers.dev` subdomain for the first time, you may see [`523` errors](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-5xx-errors/error-523/) while DNS is propagating. These errors should resolve themselves after a minute or so.

## Related resources

A full version of this codebase is available on GitHub. It includes a frontend UI for querying, adding, and deleting notes, as well as a backend API for interacting with the database and vector index. You can find it here: [github.com/kristianfreeman/cloudflare-retrieval-augmented-generation-example](https://github.com/kristianfreeman/cloudflare-retrieval-augmented-generation-example/).

To do more:

* Explore the reference diagram for a [Retrieval Augmented Generation (RAG) Architecture](https://developers.cloudflare.com/reference-architecture/diagrams/ai/ai-rag/).
* Review Cloudflare's [AI documentation](https://developers.cloudflare.com/workers-ai).
* Review [Tutorials](https://developers.cloudflare.com/workers/tutorials/) to build projects on Workers.
* Explore [Examples](https://developers.cloudflare.com/workers/examples/) to experiment with copy and paste Worker code.
* Understand how Workers works in [Reference](https://developers.cloudflare.com/workers/reference/).
* Learn about Workers features and functionality in [Platform](https://developers.cloudflare.com/workers/platform/).
* Set up [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/) to programmatically create, test, and deploy your Worker projects.
