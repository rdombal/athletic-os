import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req) {
  try {
    const { prompt } = await req.json()
    if (!prompt) return Response.json({ error: 'No prompt' }, { status: 400 })
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = message.content.find(b => b.type === 'text')?.text || ''
    return Response.json({ text })
  } catch (err) {
    return Response.json({ error: err.message || 'Error' }, { status: 500 })
  }
}
