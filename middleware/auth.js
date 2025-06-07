module.exports = {
  ensureAuthenticated: function(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    req.flash('error', 'Please log in to view this resource');
    res.redirect('/auth/login');
  },
  
  ensureAdmin: function(req, res, next) {
    if (req.isAuthenticated() && req.user.role === 'admin') {
      return next();
    }
    req.flash('error', 'Not authorized');
    res.redirect('/');
  },
  
  //мидлвэйр для проверки владельца комментария
  ensureCommentOwner: function(req, res, next) {
    Comment.findById(req.params.id)
      .then(comment => {
        if (comment.author.equals(req.user._id) || req.user.role === 'admin') {
          return next();
        }
        req.flash('error', 'Not authorized');
        res.redirect('back');
      })
      .catch(err => {
        console.error(err);
        req.flash('error', 'Comment not found');
        res.redirect('back');
      });
  }
};