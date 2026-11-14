import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { GoogleGenAI } from '@google/genai';
import { requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import { getOrCreateUser } from './src/db/users.ts';
import {
  getUserMessagesByThread,
  upsertThreadAndMessages,
  type SyncMessagePayload,
  type SyncThreadPayload,
} from './src/db/messages.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

function createAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/threads', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email || `${uid}@users.meshline.local`;
      const displayName =
        typeof req.user?.name === 'string' ? req.user.name : null;

      if (!uid) {
        res.status(401).json({ error: 'Unauthorized: Missing user identity' });
        return;
      }

      const dbUser = await getOrCreateUser(uid, email, displayName);
      const data = await getUserMessagesByThread(dbUser.id);
      res.json(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to load threads.';
      console.error('[/api/threads] Error:', error);
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/messages/sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email || `${uid}@users.meshline.local`;
      const displayName =
        typeof req.user?.name === 'string' ? req.user.name : null;

      if (!uid) {
        res.status(401).json({ error: 'Unauthorized: Missing user identity' });
        return;
      }

      const body = req.body as {
        thread?: SyncThreadPayload;
        messages?: SyncMessagePayload[];
      };

      if (
        !body?.thread ||
        typeof body.thread.externalId !== 'string' ||
        !Array.isArray(body.messages)
      ) {
        res.status(400).json({ error: 'Valid thread and messages array required.' });
        return;
      }

      const dbUser = await getOrCreateUser(uid, email, displayName);
      const result = await upsertThreadAndMessages(
        dbUser.id,
        body.thread,
        body.messages
      );
      res.json(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to sync messages.';
      console.error('[/api/messages/sync] Error:', error);
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/chat', async (req, res) => {
    try {
      const { message, history } = req.body as {
        message?: string;
        history?: Array<{ role: 'user' | 'model'; text: string }>;
      };

      const trimmed = typeof message === 'string' ? message.trim() : '';
      if (!trimmed) {
        res.status(400).json({ error: 'Message text is required.' });
        return;
      }

      const ai = createAiClient();
      if (!ai) {
        res.status(503).json({
          error:
            'GEMINI_API_KEY is not configured. Add it in Settings > Secrets to enable AI responses.',
        });
        return;
      }

      const safeHistory = Array.isArray(history)
        ? history
            .filter(
              (item) =>
                item &&
                (item.role === 'user' || item.role === 'model') &&
                typeof item.text === 'string' &&
                item.text.trim().length > 0
            )
            .slice(-12)
            .map((item) => ({
              role: item.role,
              parts: [{ text: item.text }],
            }))
        : [];

      const contents = [
        ...safeHistory,
        {
          role: 'user' as const,
          parts: [{ text: trimmed }],
        },
      ];

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction:
            'You are a concise, helpful AI assistant inside an offline-resilient chat app. Keep responses clear, practical, and under 120 words unless the user asks for more detail. Write in clean plain text without Markdown asterisks.',
        },
      });

      const replyText =
        response.text?.trim() ||
        'I received your message, though no text output was returned.';

      res.json({ reply: replyText });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to generate AI response.';
      console.error('[/api/chat] Error:', msg);
      res.status(500).json({ error: msg });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
