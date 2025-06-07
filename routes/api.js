const express = require('express');
const Word = require('../models/Video');
const Category = require('../models/Category');
const router = express.Router();

// GET /api/words/search
router.get('/words/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.json([]);
    }
    
    const words = await Word.find({
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } }
      ],
      isActive: true
    })
    .populate('category', 'name')
    .select('title description category')
    .limit(10);
    
    res.json(words);
  } catch (error) {
    console.error('Search API error:', error);
    res.status(500).json({ error: 'Ошибка поиска' });
  }
});

// GET /api/categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .select('name color icon');
    
    res.json(categories);
  } catch (error) {
    console.error('Categories API error:', error);
    res.status(500).json({ error: 'Ошибка загрузки категорий' });
  }
});


router.get('/words/random', async (req, res) => {
  try {
    const count = parseInt(req.query.count) || 5;
    const words = await Word.aggregate([
      { $match: { isActive: true } },
      { $sample: { size: count } },
      { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'category' } },
      { $unwind: '$category' }
    ]);
    
    res.json(words);
  } catch (error) {
    console.error('Random words API error:', error);
    res.status(500).json({ error: 'Ошибка получения случайных слов' });
  }
});


router.get('/stats', async (req, res) => {
  try {
    const stats = {
      totalWords: await Word.countDocuments({ isActive: true }),
      totalCategories: await Category.countDocuments({ isActive: true }),
      mostViewedWords: await Word.find({ isActive: true })
        .populate('category', 'name')
        .sort({ views: -1 })
        .limit(5)
        .select('title views category'),
      recentWords: await Word.find({ isActive: true })
        .populate('category', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title createdAt category')
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Stats API error:', error);
    res.status(500).json({ error: 'Ошибка получения статистики' });
  }
});

module.exports = router;