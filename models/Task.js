const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [
    {
      videoUrl: { type: String, required: true }
    }
  ],
  correctOption: { type: Number, required: true }
});

module.exports = mongoose.model('Task', taskSchema);
