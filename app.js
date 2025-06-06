require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const ejs = require('ejs');
const path = require('path');
const app = express();
const Task = require('./models/Task');
const multer = require('multer');


// Подключение к MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Модели
const User = require('./models/User');
const Video = require('./models/Video');
const Category = require('./models/Category');
const Comment = require('./models/Comment');
const wordRoutes = require('./routes/words');
const upload = multer({ dest: 'uploads/' });
app.use('/words', wordRoutes);
app.use('/uploads', express.static('uploads'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.error = null;
  res.locals.success = null;
  next();
});

// Настройка EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware для проверки аутентификации
const isAuthenticated = (req, res, next) => {
  if (req.session.userId) {
    return next();
  }
  res.redirect('/login');
};

const isAdmin = (req, res, next) => {
  if (req.session.userId && req.session.isAdmin) {
    return next();
  }
  res.redirect('/login');
};

// Маршруты
app.get('/map', (req, res) => res.render('map')); 

app.get('/tasks', (req, res) => res.render('tasks')); 

app.get('/', async (req, res) => {
  const videos = await Video.find().populate('category');
  res.render('index', { user: req.session.user, videos });
});

app.get('/categories', async (req, res) => {
  const categories = await Category.find().populate('videos');
  res.render('categories', { user: req.session.user, categories });
});

app.get('/forum', async (req, res) => {
  const comments = await Comment.find().populate('user').sort({ createdAt: -1 });
  res.render('forum', { user: req.session.user, comments });
});

app.get('/account', isAuthenticated, async (req, res) => {
  if (req.session.isAdmin) {
    return res.redirect('/admin');
  }
  const user = await User.findById(req.session.userId);
  res.render('account', { user });
});



app.get('/admin', isAdmin, async (req, res) => {
  try {
    const videos = await Video.find().populate('category');
    const categories = await Category.find();
    const comments = await Comment.find().populate('user');

    res.render('admin', { user: req.session.user, videos, categories, comments }); 
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});



// Маршрут для страницы входа
app.get('/login', (req, res) => {
  if (req.session.userId) {
    return req.session.isAdmin ? res.redirect('/admin') : res.redirect('/account');
  }
  res.render('login', { 
    user: req.session.user || null,
    error: null 
  });
});

// Маршрут для обработки входа
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  
  if (user && bcrypt.compareSync(password, user.password)) {
    req.session.userId = user._id;
    req.session.user = user;
    req.session.isAdmin = user.isAdmin;
    
    return user.isAdmin ? res.redirect('/admin') : res.redirect('/account');
  }
  
  // При ошибке передаем сообщение об ошибке
  res.render('login', { 
    user: null,
    error: 'Invalid username or password' 
  });
});

// Маршрут для страницы регистрации
app.get('/register', (req, res) => {
  res.render('register', { 
    user: req.session.user || null,
    error: null // Явно передаем error, даже если null
  });
});

// Маршрут для обработки регистрации
app.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    
    const user = new User({
      username,
      email,
      password: hashedPassword,
      isAdmin: false
    });
    
    await user.save();
    res.redirect('/login');
  } catch (error) {
    // При ошибке передаем сообщение об ошибке
    res.render('register', { 
      user: null,
      error: 'Registration failed. Please try again.' 
    });
  }
});
app.post('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.post('/comment', isAuthenticated, async (req, res) => {
  const { content, parentId } = req.body;

  const comment = new Comment({
    content,
    user: req.session.userId,
    parent: parentId || null
  });

  await comment.save();
  res.redirect('/forum');
});


app.post('/comment/:id/delete', isAuthenticated, async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  
  if (comment.user.toString() === req.session.userId || req.session.isAdmin) {
    await Comment.findByIdAndDelete(req.params.id);
  }
  
  res.redirect('/forum');
});

app.post('/admin/video/add', isAdmin, async (req, res) => {
  const { title, description, videoUrl, thumbnailUrl, category } = req.body;
  
  const video = new Video({
    title,
    description,
    videoUrl,
    thumbnailUrl,
    category
  });
  
  await video.save();
  await Category.findByIdAndUpdate(category, { $push: { videos: video._id } });

  res.redirect('/admin');
});

app.post('/admin/video/:id/delete', isAdmin, async (req, res) => {
  await Video.findByIdAndDelete(req.params.id);
  res.redirect('/admin');
});
// Correct route (singular 'category')

app.get('/category/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).populate('videos');

    if (!category) {
      return res.status(404).send('Category not found');
    }

    res.render('category-videos', {
      category: category,
      videos: category.videos
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});


app.post('/admin/category/add', isAdmin, upload.single('image'), async (req, res) => {
  const { name } = req.body;
  const image = req.file; // Информация о загруженном файле

  // Сохраните путь к изображению в базе данных
  const category = new Category({ name, imagePath: image.path });
  await category.save();

  res.redirect('/admin');
});




const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
