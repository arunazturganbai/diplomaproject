const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const SignWord = require('../models/Video');
const Category = require('../models/Category');

// API-поиск для AJAX
router.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q;
    const regex = new RegExp(query, 'i');
    const words = await SignWord.find({ title: regex }).populate('category');

    res.json(words); // отправляем JSON
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});


// === ВСЕ слова ===
router.get('/', async (req, res) => {
  try {
    const words = await SignWord.find().populate('category');
    const categories = await Category.find();
    res.render('words/index', { words, categories });
  } catch (err) {
    console.error(err);
    res.redirect('/');
  }
});

// === По категории ===
router.get('/category/:id', async (req, res) => {
  try {
    const words = await SignWord.find({ category: req.params.id }).populate('category');
    const category = await Category.findById(req.params.id);
    const categories = await Category.find();
    res.render('words/by-category', { words, category, categories });
  } catch (err) {
    console.error(err);
    res.redirect('/words');
  }
});

// === Конкретное слово — СТАВИМ В САМОМ КОНЦЕ ===
router.get('/:id', async (req, res) => {
  try {
    const word = await SignWord.findById(req.params.id).populate('category');
    res.render('words/show', { word });
  } catch (err) {
    console.error(err);
    res.redirect('/words');
  }
});

module.exports = router;