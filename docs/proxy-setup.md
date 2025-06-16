# SPARQL Proxy Configuration for vis-graph

## 🎯 When and Why a Proxy?

The `vis-graph` component is designed to load and visualize data from SPARQL endpoints. Ideally, these endpoints should be configured to allow requests from different web origins (via CORS). However, many public SPARQL endpoints are not configured this way.

When you try to load data from such an endpoint directly from your browser, you will encounter a **CORS (Cross-Origin Resource Sharing) error**. In your browser console, this often manifests as messages like:

```
Access to fetch at 'https://my-sparql-endpoint.com/sparql' from origin 'http://localhost:xxxx' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

Or, in the `vis-graph` component logs:

```
[vis-graph] Direct endpoint failure: Failed to fetch
[vis-graph] 🎯 CORS error detected - Attempting with local proxy...
```

To work around this problem, `vis-graph` can use a **small local proxy server**. This server, which you run on your machine, receives the request from `vis-graph`, forwards it to the remote SPARQL endpoint (servers are not subject to browser CORS restrictions), retrieves the response, and sends it back to `vis-graph`.

**You need to set up this local proxy if and only if you encounter CORS errors.** If direct requests work, the proxy is not necessary.

## 🚀 Setting Up the Local Proxy Server (`server/proxy.js`)

The recommended solution is to create a simple Node.js server that will act as a proxy. The `vis-graph` component uses the proxy URL passed as a parameter to try using this proxy if a direct request fails due to CORS.

Follow these steps to set it up:

### Step 1: Create the `server/proxy.js` file

Create a `server` folder at the root of your project, then create a file named `proxy.js` in this folder.

The complete content of this file will be provided in the section "[📄 Complete Code for `server/proxy.js`](#complete-code-for-proxyjs)" at the end of this document. Copy and paste the entire code into your `server/proxy.js` file.

### Step 2: Install dependencies

This proxy server needs a few Node.js packages to function: `express`, `node-fetch` (version 2 for better compatibility with different types of Node.js projects), and `cors`.

Open a terminal **at the root of your project** (where your `package.json` is located) and run the following command:

```bash
npm install express node-fetch@2 cors
```

If you use Yarn:

```bash
yarn add express node-fetch@2 cors
```

**Note on `node-fetch` and ES/CommonJS modules:**
*   The `server/proxy.js` code provided uses `import` syntax (ES Modules). For this to work, your `package.json` file at the root of your project must contain the line `"type": "module"`.
*   If your project is not configured for ES Modules (i.e., no `"type": "module"` or `"type": "commonjs"`), you will need to either:
    *   Adapt the `server/proxy.js` code to use CommonJS syntax (`require()` instead of `import`).
    *   Or, simpler, add `"type": "module"` to your `package.json`.
*   `node-fetch@2` is recommended because it works well with `import` syntax in an ES module context, and is also easier to use with `require` if you need to adapt the proxy to CommonJS. Newer versions of `node-fetch` are purely ESM.

### Step 3: Start the proxy server

Once the dependencies are installed, start the proxy server from your terminal (still at the root of your project):

```bash
node server/proxy.js
```

You should see a message indicating that the server has started, typically:

```
SPARQL proxy server started on http://localhost:3001 (or your url)
Provide 'endpoint', 'query' and the proxy URL as parameters.
```

**Keep this terminal open and the proxy server running** while you use your web application with the `vis-graph` component. If you close this terminal, the proxy will stop.

### Step 4: Usage by `vis-graph`

No additional configuration is needed in the `vis-graph` component itself.
If it encounters a CORS error when attempting a direct request, it will automatically try to use the proxy at `http://localhost:3001/sparql-proxy`.

The component will first try the direct request to the endpoint. If this fails due to CORS and a proxy URL is configured, it will automatically use the proxy to work around the problem.

---

## 📊 Data Format Expected by `vis-graph`

The `vis-graph` component expects the **standard SPARQL JSON format**. Your proxy must return exactly this format:

```json
{
  "head": {
    "vars": ["variable1", "variable2", ...]
  },
  "results": {
    "bindings": [
      {
        "variable1": {
          "type": "uri",
          "value": "http://example.org/resource1"
        },
        "variable2": {
          "type": "literal",
          "value": "Label for the resource"
        }
      }
    ]
  }
}
```

**Key points:**
*   `head.vars`: List of variables from your SPARQL query
*   `results.bindings`: Array of results
*   `type`: `"uri"` for nodes, `"literal"` for labels
*   `value`: The value of the variable

---

## 🚨 Local Proxy Troubleshooting

**Common problems:**

*   **Error `Cannot find module 'express'`**: Run `npm install express node-fetch@2 cors`
*   **Port already in use**: Another program is using the port. Close it or change the port in `server/proxy.js` (don't forget to update the URL in your interface)
*   **Proxy receives no requests**: Check that the proxy URL in your interface exactly matches the one from the launched server
*   **Error `import` statement**: Add `"type": "module"` to your `package.json`

**Quick tests:**
*   Proxy launched? → Visit `http://localhost:3001/proxy-status` (or your configured port) which should display `{"status":"Proxy is running"}`
*   Proxy logs: Monitor the terminal where `node server/proxy.js` is running
*   Correct URL? → Check that the URL passed as parameter matches the message displayed at proxy startup

---

## <a name="complete-code-for-proxyjs"></a>📄 Complete Code for `server/proxy.js`

Copy the entire code below and paste it into the `server/proxy.js` file you created at the root of your project.

```javascript
/**
 * SPARQL Proxy to resolve CORS issues
 * This file must be configured according to your environment
 */

import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';

const app = express();
const PORT = process.env.PROXY_PORT || 3001; // The port the proxy will listen on

app.use(cors()); // Allow Cross-Origin requests
app.use(express.json()); // To parse JSON request bodies (if passing endpoint/query in body)

// A simple status endpoint to check if the proxy is running
app.get('/proxy-status', (req, res) => {
  res.status(200).json({ status: 'Proxy is running' });
});

async function executeQuery(endpoint, sparqlQuery, method = 'POST', res) {
  console.log(`[Proxy] Attempting ${method} to: ${endpoint}`);
  try {
    const headers = {
      'Accept': 'application/sparql-results+json, application/json',
      'User-Agent': 'vis-graph-Proxy/1.0'
    };
    let body;
    let targetUrl = endpoint;

    if (method === 'POST') {
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
      const params = new URLSearchParams();
      params.append('query', sparqlQuery);
      body = params;
    } else {
      targetUrl = `${endpoint}?query=${encodeURIComponent(sparqlQuery)}`;
    }

    const response = await fetch(targetUrl, {
      method: method,
      headers: headers,
      body: method === 'POST' ? body : undefined,
      redirect: 'follow'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Proxy] Endpoint error (${method} ${response.status}): ${errorText}`);
      throw new Error(`Endpoint error (${method} ${response.status}): ${response.statusText}. Body: ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    console.log(`[Proxy] Success ${method} for ${endpoint}`);
    res.json(data);
    return true;

  } catch (error) {
    console.error(`[Proxy] ${method} request failed to ${endpoint}:`, error.message);
    throw error;
  }
}

// Main route - tries POST then GET if it fails
app.all('/sparql-proxy', async (req, res) => {
  const { endpoint, query: sparqlQuery } = { ...req.query, ...req.body };

  if (!endpoint || !sparqlQuery) {
    return res.status(400).json({
      error: 'Parameters "endpoint" and "query" are required.',
    });
  }

  console.log(`[Proxy] Received for proxy: Endpoint=${endpoint}`);

  try {
    console.log('[Proxy] Attempting with POST...');
    await executeQuery(endpoint, sparqlQuery, 'POST', res);
  } catch (postError) {
    console.warn('[Proxy] POST failed, attempting with GET...');
    try {
      await executeQuery(endpoint, sparqlQuery, 'GET', res);
    } catch (getError) {
      console.error(`[Proxy] Final failure for ${endpoint}. POST error: ${postError.message}, GET error: ${getError.message}`);
      res.status(500).json({
        error: 'Proxy failed for both POST and GET requests.',
        postError: postError.message,
        getError: getError.message
      });
    }
  }
});

app.listen(PORT, () => {
  console.log(`SPARQL proxy server started on http://localhost:${PORT}`);
  console.log(`Use http://localhost:${PORT}/sparql-proxy providing 'endpoint' and 'query' as parameters.`);
  console.log(`Example: http://localhost:${PORT}/sparql-proxy?endpoint=YOUR_SPARQL_ENDPOINT&query=YOUR_SPARQL_QUERY`);
});

// Prevent the proxy from crashing silently
process.on('uncaughtException', (error) => {
  console.error('[Proxy] Uncaught Exception:', error);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Proxy] Unhandled Rejection at:', promise, 'reason:', reason);
}); 
```

---

**🎉 That's it!** With the `server/proxy.js` server in place and running, your `vis-graph` component should now be able to work around CORS restrictions and load data from a wider variety of SPARQL endpoints. 