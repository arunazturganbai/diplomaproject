const express = require('express');
const User = require('../models/User');
const router = express.Router();

// GET /auth/login
router.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  res.render('auth/login');
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email, isActive: true });
    if (!user) {
      req.flash('error', 'Неверный email или пароль');
      return res.redirect('/auth/login');
    }
    
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      req.flash('error', 'Неверный email или пароль');
      return res.redirect('/auth/login');
    }
    
    req.session.user = {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      avatar: user.avatar
    };
    
    req.flash('success', `Добро пожаловать, ${user.username}!`);
    
    // админ/юзер перенаправление
    if (user.role === 'admin') {
      res.redirect('/admin');
    } else {
      res.redirect('/');
    }
  } catch (error) {
    console.error('Login error:', error);
    req.flash('error', 'Произошла ошибка при входе');
    res.redirect('/auth/login');
  }
});

// GET /auth/register
router.get('/register', (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  res.render('auth/register');
});

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;
    

    if (password !== confirmPassword) {
      req.flash('error', 'Пароли не совпадают');
      return res.redirect('/auth/register');
    }
    
    if (password.length < 6) {
      req.flash('error', 'Пароль должен содержать минимум 6 символов');
      return res.redirect('/auth/register');
    }
    
    // проверка на существование пользователя
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      req.flash('error', 'Пользователь с таким email или именем уже существует');
      return res.redirect('/auth/register');
    }
    

    const user = new User({
      username,
      email,
      password
    });
    
    await user.save();
    
    req.flash('success', 'Регистрация успешна! Теперь вы можете войти');
    res.redirect('/auth/login');
  } catch (error) {
    console.error('Registration error:', error);
    req.flash('error', 'Произошла ошибка при регистрации');
    res.redirect('/auth/register');
  }
});

// POST /auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/');
  });
});

module.exports = router;