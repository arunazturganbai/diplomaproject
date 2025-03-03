const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: Date,
  score: Number,
  answers: [
    {
      taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
      chosenIndex: Number,
      isCorrect: Boolean
    }
  ]
});

module.exports = mongoose.model('Result', resultSchema);
