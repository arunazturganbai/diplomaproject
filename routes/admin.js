const express = require('express');
const Word = require('../models/Video');
const Category = require('../models/Category');
const User = require('../models/User');
const router = express.Router();
const { ensureAdmin } = require('../middleware/auth');
const Task = require('../models/Task');

// Admin authentication middleware
const requireAdmin = (req, res, next) => {
  if (!req.session.user || req.session.user.role !== 'admin') {
    req.flash('error', 'Доступ запрещен');
    return res.redirect('/auth/login');
  }
  next();
};

// Apply admin middleware to all routes
router.use(requireAdmin);

// GET /admin - Dashboard
router.get('/', requireAdmin, async (req, res) => {
  try {
    const [videos, categories, comments, tasks, stats, recentWords, recentUsers] = await Promise.all([
      Word.find().populate('category').populate('createdBy'),
      Category.find(),
      Comment.find().populate('user'),
      Task.find(),
      Word.countDocuments(),
      Word.find().sort({ createdAt: -1 }).limit(5),
      User.find().select('username email role createdAt').sort({ createdAt: -1 }).limit(5)
    ]);

    res.render('admin', {
      videos,
      categories,
      comments,
      tasks,
      stats,
      recentWords,
      recentUsers
    });
  } catch (error) {
    console.error('Admin page error:', error);
    req.flash('error', 'Ошибка загрузки данных');
    res.render('admin', { videos: [], categories: [], comments: [], tasks: [] });
  }
});


// GET /admin/words
router.get('/words', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    
    const words = await Word.find()
      .populate('category')
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const totalWords = await Word.countDocuments();
    const totalPages = Math.ceil(totalWords / limit);
    
    res.render('admin/words', {
      words,
      currentPage: page,
      totalPages,
      totalWords
    });
  } catch (error) {
    console.error('Admin words error:', error);
    req.flash('error', 'Ошибка загрузки слов');
    res.render('admin/words', { words: [], currentPage: 1, totalPages: 1, totalWords: 0 });
  }
});

// GET /admin/words/new
router.get('/words/new', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true });
    res.render('admin/word-form', { word: null, categories });
  } catch (error) {
    console.error('New word form error:', error);
    req.flash('error', 'Ошибка загрузки формы');
    res.redirect('/admin/words');
  }
});

// POST /admin/words
router.post('/words', async (req, res) => {
  try {
    const { title, description, videoUrl, category, tags, difficulty } = req.body;
    
    const word = new Word({
      title,
      description,
      videoUrl,
      category,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      difficulty,
      createdBy: req.session.user.id
    });
    
    await word.save();
    req.flash('success', 'Слово успешно добавлено');
    res.redirect('/admin/words');
  } catch (error) {
    console.error('Create word error:', error);
    req.flash('error', 'Ошибка создания слова');
    res.redirect('/admin/words/new');
  }
});

// GET /admin/words/:id/edit
router.get('/words/:id/edit', async (req, res) => {
  try {
    const word = await Word.findById(req.params.id);
    const categories = await Category.find({ isActive: true });
    
    if (!word) {
      req.flash('error', 'Слово не найдено');
      return res.redirect('/admin/words');
    }
    
    res.render('admin/word-form', { word, categories });
  } catch (error) {
    console.error('Edit word form error:', error);
    req.flash('error', 'Ошибка загрузки формы');
    res.redirect('/admin/words');
  }
});

// PUT /admin/words/:id
router.put('/words/:id', async (req, res) => {
  try {
    const { title, description, videoUrl, category, tags, difficulty, isActive } = req.body;
    
    await Word.findByIdAndUpdate(req.params.id, {
      title,
      description,
      videoUrl,
      category,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      difficulty,
      isActive: isActive === 'on'
    });
    
    req.flash('success', 'Слово успешно обновлено');
    res.redirect('/admin/words');
  } catch (error) {
    console.error('Update word error:', error);
    req.flash('error', 'Ошибка обновления слова');
    res.redirect('/admin/words');
  }
});

// DELETE /admin/words/:id
router.delete('/words/:id', async (req, res) => {
  try {
    await Word.findByIdAndDelete(req.params.id);
    req.flash('success', 'Слово успешно удалено');
    res.redirect('/admin/words');
  } catch (error) {
    console.error('Delete word error:', error);
    req.flash('error', 'Ошибка удаления слова');
    res.redirect('/admin/words');
  }
});

// GET /admin/categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.render('admin/categories', { categories });
  } catch (error) {
    console.error('Admin categories error:', error);
    req.flash('error', 'Ошибка загрузки категорий');
    res.render('admin/categories', { categories: [] });
  }
});

// GET /admin/categories/new
router.get('/categories/new', (req, res) => {
  res.render('admin/category-form', { category: null });
});


// POST /admin/categories
router.post('/categories', async (req, res) => {
  try {
    const { name, description, color, icon } = req.body;
    
    const category = new Category({
      name,
      description,
      color,
      icon
    });
    
    await category.save();
    req.flash('success', 'Категория успешно создана');
    res.redirect('/admin/categories');
  } catch (error) {
    console.error('Create category error:', error);
    req.flash('error', 'Ошибка создания категории');
    res.redirect('/admin/categories/new');
  }
});

// GET /admin/categories/:id/edit
router.get('/categories/:id/edit', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      req.flash('error', 'Категория не найдена');
      return res.redirect('/admin/categories');
    }
    res.render('admin/category-form', { category });
  } catch (error) {
    console.error('Edit category form error:', error);
    req.flash('error', 'Ошибка загрузки формы');
    res.redirect('/admin/categories');
  }
});

// PUT /admin/categories/:id
router.put('/categories/:id', async (req, res) => {
  try {
    const { name, description, color, icon, isActive } = req.body;
    
    await Category.findByIdAndUpdate(req.params.id, {
      name,
      description,
      color,
      icon,
      isActive: isActive === 'on'
    });
    
    req.flash('success', 'Категория успешно обновлена');
    res.redirect('/admin/categories');
  } catch (error) {
    console.error('Update category error:', error);
    req.flash('error', 'Ошибка обновления категории');
    res.redirect('/admin/categories');
  }
});

// DELETE /admin/categories/:id
router.delete('/categories/:id', async (req, res) => {
  try {
    // Check if category has words
    const wordsCount = await Word.countDocuments({ category: req.params.id });
    if (wordsCount > 0) {
      req.flash('error', 'Нельзя удалить категорию, содержащую слова');
      return res.redirect('/admin/categories');
    }
    
    await Category.findByIdAndDelete(req.params.id);
    req.flash('success', 'Категория успешно удалена');
    res.redirect('/admin/categories');
  } catch (error) {
    console.error('Delete category error:', error);
    req.flash('error', 'Ошибка удаления категории');
    res.redirect('/admin/categories');
  }
});

// GET /admin/users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.render('admin/users', { users });
  } catch (error) {
    console.error('Admin users error:', error);
    req.flash('error', 'Ошибка загрузки пользователей');
    res.render('admin/users', { users: [] });
  }
});
// Update word
router.put('/edit-word/:id', ensureAdmin, async (req, res) => {
  try {
    const { title, description, videoUrl, category } = req.body;
    
    await SignWord.findByIdAndUpdate(req.params.id, {
      title,
      description,
      videoUrl,
      category
    });
    
    req.flash('success', 'Word updated successfully');
    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to update word');
    res.redirect(`/admin/edit-word/${req.params.id}`);
  }
});

// Delete word
router.delete('/delete-word/:id', ensureAdmin, async (req, res) => {
  try {
    await SignWord.findByIdAndDelete(req.params.id);
    req.flash('success', 'Word deleted successfully');
    res.redirect('/admin');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to delete word');
    res.redirect('/admin');
  }
});







