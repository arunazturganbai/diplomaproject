const express = require('express');
const Word = require('../models/Video');
const Category = require('../models/Category');
const router = express.Router();

// GET /
router.get('/', async (req, res) => {
  try {
    const { search, category, difficulty } = req.query;
    let filter = { isActive: true };
    
    if (search) {
      filter.$text = { $search: search };
    }
    
    if (category) {
      filter.category = category;
    }
    
    if (difficulty) {
      filter.difficulty = difficulty;
    }
    
    const words = await Word.find(filter)
      .populate('category')
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 })
      .limit(20);
    
    const categories = await Category.find({ isActive: true });
    const totalWords = await Word.countDocuments({ isActive: true });
    
    res.render('index', {
      words,
      categories,
      totalWords,
      search: search || '',
      selectedCategory: category || '',
      selectedDifficulty: difficulty || ''
    });
  } catch (error) {
    console.error('Home page error:', error);
    req.flash('error', 'Произошла ошибка при загрузке страницы');
    res.render('index', { words: [], categories: [], totalWords: 0, search: '', selectedCategory: '', selectedDifficulty: '' });
  }
});

// GET /word/:id
router.get('/word/:id', async (req, res) => {
  try {
    const word = await Word.findById(req.params.id)
      .populate('category')
      .populate('createdBy', 'username');
    
    if (!word || !word.isActive) {
      req.flash('error', 'Слово не найдено');
      return res.redirect('/');
    }
    
    // Increment views
    word.views += 1;
    await word.save();
    
    // Get related words
    const relatedWords = await Word.find({
      category: word.category._id,
      _id: { $ne: word._id },
      isActive: true
    })
    .populate('category')
    .limit(6);
    
    res.render('word-detail', { word, relatedWords });
  } catch (error) {
    console.error('Word detail error:', error);
    req.flash('error', 'Произошла ошибка при загрузке слова');
    res.redirect('/');
  }
});

// GET /categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true });
    
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const wordCount = await Word.countDocuments({
          category: category._id,
          isActive: true
        });
        return {
          ...category.toObject(),
          wordCount
        };
      })
    );
    
    res.render('categories', { categories: categoriesWithCount });
  } catch (error) {
    console.error('Categories error:', error);
    req.flash('error', 'Произошла ошибка при загрузке категорий');
    res.render('categories', { categories: [] });
  }
});

// GET /category
router.get('/category/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category || !category.isActive) {
      req.flash('error', 'Категория не найдена');
      return res.redirect('/categories');
    }
    
    const words = await Word.find({
      category: req.params.id,
      isActive: true
    })
    .populate('category')
    .populate('createdBy', 'username')
    .sort({ createdAt: -1 });
    
    res.render('category-words', { category, words });
  } catch (error) {
    console.error('Category words error:', error);
    req.flash('error', 'Произошла ошибка при загрузке слов категории');
    res.redirect('/categories');
  }
});

// GET /search
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.redirect('/');
    }
    
    const words = await Word.find({
      $text: { $search: q },
      isActive: true
    })
    .populate('category')
    .populate('createdBy', 'username')
    .sort({ score: { $meta: 'textScore' } });
    
    res.render('search-results', {
      words,
      query: q,
      count: words.length
    });
  } catch (error) {
    console.error('Search error:', error);
    req.flash('error', 'Произошла ошибка при поиске');
    res.redirect('/');
  }
});

module.exports = router;