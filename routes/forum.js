const express = require('express');
const Comment = require('../models/Comment');
const router = express.Router();

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    req.flash('error', 'Необходимо авторизоваться');
    return res.redirect('/auth/login');
  }
  next();
};

// GET /forum
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    
    const comments = await Comment.find({ 
      parentComment: null,
      isActive: true 
    })
    .populate('author', 'username avatar')
    .populate({
      path: 'replies',
      match: { isActive: true },
      populate: {
        path: 'author',
        select: 'username avatar'
      },
      options: { sort: { createdAt: 1 } }
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
    
    const totalComments = await Comment.countDocuments({ 
      parentComment: null,
      isActive: true 
    });
    const totalPages = Math.ceil(totalComments / limit);
    
    res.render('forum/index', {
      comments,
      currentPage: page,
      totalPages,
      totalComments
    });
  } catch (error) {
    console.error('Forum error:', error);
    req.flash('error', 'Ошибка загрузки форума');
    res.render('forum/index', { 
      comments: [], 
      currentPage: 1, 
      totalPages: 1, 
      totalComments: 0 
    });
  }
});

// POST /forum/comments
router.post('/comments', requireAuth, async (req, res) => {
  try {
    const { content, parentComment } = req.body;
    
    if (!content || content.trim().length === 0) {
      req.flash('error', 'Комментарий не может быть пустым');
      return res.redirect('/forum');
    }
    
    if (content.length > 1000) {
      req.flash('error', 'Комментарий слишком длинный (максимум 1000 символов)');
      return res.redirect('/forum');
    }
    
    const comment = new Comment({
      content: content.trim(),
      author: req.session.user.id,
      parentComment: parentComment || null
    });
    
    await comment.save();
    

    if (parentComment) {
      await Comment.findByIdAndUpdate(parentComment, {
        $push: { replies: comment._id }
      });
    }
    
    req.flash('success', 'Комментарий добавлен');
    res.redirect('/forum');
  } catch (error) {
    console.error('Create comment error:', error);
    req.flash('error', 'Ошибка создания комментария');
    res.redirect('/forum');
  }
});

// PUT /forum/comments/:id
router.put('/comments/:id', requireAuth, async (req, res) => {
  try {
    const { content } = req.body;
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      req.flash('error', 'Комментарий не найден');
      return res.redirect('/forum');
    }
    
   
    if (comment.author.toString() !== req.session.user.id) {
      req.flash('error', 'Вы можете редактировать только свои комментарии');
      return res.redirect('/forum');
    }
    
    if (!content || content.trim().length === 0) {
      req.flash('error', 'Комментарий не может быть пустым');
      return res.redirect('/forum');
    }
    
    if (content.length > 1000) {
      req.flash('error', 'Комментарий слишком длинный (максимум 1000 символов)');
      return res.redirect('/forum');
    }
    
    comment.content = content.trim();
    comment.isEdited = true;
    comment.editedAt = new Date();
    await comment.save();
    
    req.flash('success', 'Комментарий обновлен');
    res.redirect('/forum');
  } catch (error) {
    console.error('Update comment error:', error);
    req.flash('error', 'Ошибка обновления комментария');
    res.redirect('/forum');
  }
});

// DELETE /forum/comments/:id
router.delete('/comments/:id', requireAuth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      req.flash('error', 'Комментарий не найден');
      return res.redirect('/forum');
    }
    
   
    if (comment.author.toString() !== req.session.user.id && req.session.user.role !== 'admin') {
      req.flash('error', 'Вы можете удалять только свои комментарии');
      return res.redirect('/forum');
    }
    

    comment.isActive = false;
    await comment.save();
    
    req.flash('success', 'Комментарий удален');
    res.redirect('/forum');
  } catch (error) {
    console.error('Delete comment error:', error);
    req.flash('error', 'Ошибка удаления комментария');
    res.redirect('/forum');
  }
});


router.post('/comments/:id/like', requireAuth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.json({ success: false, message: 'Комментарий не найден' });
    }
    
    const userId = req.session.user.id;
    const likeIndex = comment.likes.indexOf(userId);
    
    if (likeIndex > -1) {
      
      comment.likes.splice(likeIndex, 1);
    } else {
      
      comment.likes.push(userId);
    }
    
    await comment.save();
    
    res.json({ 
      success: true, 
      liked: likeIndex === -1,
      likesCount: comment.likes.length 
    });
  } catch (error) {
    console.error('Like comment error:', error);
    res.json({ success: false, message: 'Ошибка' });
  }
});

module.exports = router;