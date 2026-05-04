require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getLLMAdvice } = require('./llm');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/webhook', async (req, res) => {
  const { messageName, payload } = req.body;

  if (messageName === 'MESSAGE_TO_SKILL') {
    let responseAction = null;
    let pronounceText = null;

    // Если фронт отвечает на GET_ADVICE_REQUESTED и присылает рассчитанный день
    const actionId = payload?.message?.action?.action_id;
    const parameters = payload?.message?.action?.parameters;

    if (actionId === 'NO_CYCLE_STARTED') {
      pronounceText = 'Сначала отметьте начало цикла';
      responseAction = { type: 'ERROR' };
    } else if (actionId === 'FETCH_LLM_ADVICE') {
      const day = parameters?.day;
      if (day) {
        const advice = await getLLMAdvice(day);
        pronounceText = advice;
        responseAction = {
          type: 'SHOW_ADVICE',
          parameters: { advice }
        };
      }
    } else if (payload?.message?.original_text) {
      // Иначе (сообщения от самого пользователя / NLP платформы Сбера)
      const text = payload.message.original_text.toLowerCase();

      if (text.includes('начались') || text.includes('день первый') || text.includes('начало цикла')) {
        pronounceText = 'Отметила начало цикла.';
        responseAction = { type: 'START_CYCLE' };
      } else if (text.includes('закончились') || text.includes('конец') || text.includes('конец цикла')) {
        pronounceText = 'Отметила конец цикла.';
        responseAction = { type: 'END_CYCLE' };
      } else if (text.includes('совет') || text.includes('дай совет') || text.includes('что посоветуешь')) {
        // Запрашиваем у фронта вычисление дня
        responseAction = { type: 'GET_ADVICE_REQUESTED' };
      }
    }

    // Собираем ответ
    const reply = {
      messageName: 'ANSWER_TO_USER',
      payload: {
        device: payload?.device,
        app_info: payload?.app_info,
        generate_interactions: {
          actions: []
        },
        items: []
      }
    };

    if (pronounceText) {
      reply.payload.generate_interactions.actions.push({
        action: {
          type: 'pronounce',
          text: pronounceText
        }
      });
    }

    if (responseAction) {
      reply.payload.items.push({
        command: {
          type: 'smart_app_data',
          smart_app_data: responseAction
        }
      });
    }

    return res.json(reply);
  }

  // Если другой тип сообщения
  res.status(200).json({});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Webhook backend is running on port ${PORT}`);
});
