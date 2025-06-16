# Simple Guide: SparqlDataFetcher

## 🎯 What is it?

`SparqlDataFetcher` is a JavaScript tool that retrieves data from SPARQL databases. It automatically resolves connection problems (CORS) by using a proxy if necessary.

**In short:** It fetches your data from wherever it is, even if your browser normally prevents it.

---

## 🚀 How to use it

### 1. Get the file
First, you need to have the `SparqlDataFetcher.js` file in your project:
- **Download** the file from the repository: [SparqlDataFetcher.js](https://github.com/Ye4hL0w/test-visualisator/blob/main/components/SparqlDataFetcher.js)
- **Or copy** the code and create the file `components/SparqlDataFetcher.js`

### 2. Import the module
```javascript
import { SparqlDataFetcher } from './components/SparqlDataFetcher.js';
```

### 3. Create an instance
```javascript
const fetcher = new SparqlDataFetcher();
```

---

## 📋 The main methods

### `fetchSparqlData()` - The main method

**What it does:** This method is used **internally by the `<vis-graph>` component** to retrieve data from a SPARQL endpoint with several fallback options.

**When it's called:** Automatically by the component when you use `loadFromSparqlEndpoint()`.

**What it retrieves for the component:**
```javascript
// The component does this internally:
const result = await fetcher.fetchSparqlData(
  'https://dbpedia.org/sparql',                    // The endpoint you provide
  'SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10',  // The query you provide
  null,                                            // JSON data (if provided)
  'http://localhost:3001/sparql-proxy'            // Fallback proxy (if provided)
);

// Then the component uses result.data to create the graph
```

### `executeSparqlQueryWithFallback()` - Query with automatic fallback

**What it does:** Method used **internally** by `fetchSparqlData()`. It first tries the direct endpoint, then automatically uses the proxy if it doesn't work (CORS problem).

**Its role in the component:** It's the core of the robust retrieval logic that allows the component to work even with endpoints that block CORS.

### `executeSparqlQuery()` - Simple direct query

**What it does:** Basic method used **internally** to send a query directly to the endpoint, without proxy.

**Its role in the component:** It's the first attempt the component makes before trying the proxy.

---

## 📊 What you get back

All methods return an object like this:

```javascript
{
  status: 'success',           // 'success' if it works, 'error' otherwise
  method: 'endpoint-or-proxy', // How the data was retrieved
  message: 'Data loaded',      // Description of what happened
  data: { /* your data */ },   // The transformed data
  rawData: { /* ... */ }       // The original raw data
}
```

---

## 🚨 Error handling

### Common errors and solutions

**1. "Failed to fetch" or "CORS" error**
- **Problem:** Your browser blocks the connection
- **Solution:** Use a proxy as the 4th parameter
- **📖 Complete guide:** [Proxy configuration](https://github.com/Ye4hL0w/test-visualisator/blob/main/docs/proxy-setup.md)

**2. "404" or "HTTP error" error**
- **Problem:** The endpoint address is incorrect
- **Solution:** Check the URL

**3. "Bad Request" error**
- **Problem:** Your SPARQL query has a syntax error
- **Solution:** Check your SPARQL query

### Example with error handling
```javascript
const result = await fetcher.fetchSparqlData(
  'https://dbpedia.org/sparql',
  'SELECT ?s ?p ?o WHERE { ?s ?p ?o } LIMIT 10',
  null,
  'http://localhost:3001/sparql-proxy',
  () => console.log('⚠️ Proxy problem'), // If proxy doesn't work
  (message, type) => console.log(`${type}: ${message}`) // For notifications
);
```

---

## 💡 Complete example

```javascript
// 1. Import
import { SparqlDataFetcher } from './components/SparqlDataFetcher.js';

// 2. Create an instance
const fetcher = new SparqlDataFetcher();

// 3. Retrieve data
async function retrieveData() {
  try {
    const result = await fetcher.fetchSparqlData(
      'https://query.wikidata.org/sparql',
      `SELECT ?country ?countryLabel WHERE {
        ?country wdt:P31 wd:Q6256 .
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en" }
      } LIMIT 10`,
      null, // No JSON data
      'http://localhost:3001/sparql-proxy' // Proxy just in case
    );

    if (result.status === 'success') {
      console.log('🎉 Data retrieved!');
      console.log('Number of results:', result.data.results.bindings.length);
      
      // Display countries
      result.data.results.bindings.forEach(country => {
        console.log('Country:', country.countryLabel.value);
      });
    } else {
      console.log('❌ Error:', result.message);
    }
  } catch (error) {
    console.log('💥 Problem:', error.message);
  }
}

// 4. Launch retrieval
retrieveData();
```

---

## 📖 Method summary

| Method | What it's for | Essential parameters |
|---------|----------------|----------------------|
| `fetchSparqlData()` | Retrieve data with all fallbacks | endpoint, query |
| `executeSparqlQueryWithFallback()` | Query with automatic fallback | endpoint, query, proxy, callback for proxy problem, callback for notifications |
| `executeSparqlQuery()` | Simple direct query | endpoint, query |

---

**🎯 Summary:**

The `SparqlDataFetcher` works **in the background** for the component. You don't need to use it directly! 

**To use the component:**
1. Create your `<vis-graph>` element 
2. Call `loadFromSparqlEndpoint()` with your endpoint and query
3. The component takes care of everything else with the `SparqlDataFetcher`!

```javascript
// What YOU do:
const graph = document.getElementById('myGraph');
graph.loadFromSparqlEndpoint(endpoint, query, jsonData, proxyUrl);

// What the COMPONENT does internally with SparqlDataFetcher:
// - Calls fetchSparqlData()
// - Handles CORS errors
// - Transforms data
// - Creates the graph
``` 