export const runtime = 'edge'

export async function POST(req) {
  try {
    const { prompt } = await req.json()
    if (!prompt) return Response.json({ error: 'No prompt' }, { status: 400 })

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      return Response.json({ error: err?.error?.message || 'API error' }, { status: 500 })
    }

    const data = await response.json()
    const text = data?.content?.find(b => b.type === 'text')?.text || ''
    return Response.json({ text })
  } catch (err) {
    return Response.json({ error: err.message || 'Unknown error' }, { status: 500 })
  }
}
