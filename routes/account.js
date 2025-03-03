const express = require('express');
const router = express.Router();
const { ensureAuthenticated } = require('../middleware/auth');
const Comment = require('../models/Comment');

router.get('/', ensureAuthenticated, async (req, res) => {
  try {
    const comments = await Comment.find({ author: req.user._id })
      .sort({ createdAt: -1 })
      .populate('thread');
      
    res.render('account', { 
      currentUser: req.user,
      comments 
    });
  } catch (err) {
    console.error(err);
    req.flash('error', 'Error loading account page');
    res.redirect('/');
  }
});

module.exports = router;