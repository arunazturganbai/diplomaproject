const express = require('express');
const router = express.Router();
const Task = require('../models/Task'); // Модель для вопросов

// GET /tasks — отдать 10 случайных вопросов
router.get('/', async (req, res) => {
  try {
    const tasks = await Task.aggregate([{ $sample: { size: 10 } }]);
    res.render('tasks', { tasks });
  } catch (err) {
    res.status(500).send('Ошибка загрузки тестов');
  }
});

// POST /tasks/submit — сохранить и проверить ответы
router.post('/submit', async (req, res) => {
  const { answers } = req.body;
  let score = 0;

  for (const answer of answers) {
    const task = await Task.findById(answer.taskId);
    if (task && task.correctOption === answer.chosenIndex) {
      score++;
    }
  }

  // Здесь можно сохранить результат пользователю в базу
  res.json({ score });
});

module.exports = router;
