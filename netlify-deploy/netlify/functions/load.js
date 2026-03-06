exports.handler = async (event) => {
  const { id } = event.queryStringParameters || {};

  if (!id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing id' }) };
  }

  try {
    const res = await fetch(`https://jsonblob.com/api/jsonBlob/${id}`, {
      headers: { Accept: 'application/json' }
    });

    if (!res.ok) {
      return { statusCode: res.status, body: JSON.stringify({ error: `JSONBlob returned ${res.status}` }) };
    }

    const data = await res.text();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: data
    };
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: e.message }) };
  }
};
