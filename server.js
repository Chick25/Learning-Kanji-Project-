const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { register } = require('module');
const { error } = require('console');

app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' })); // Cho phép gửi ảnh Base64
app.use(bodyParser.urlencoded({extended: true}));



// =======  KẾT NỐI MONGODB =======
mongoose.connect(
  'mongodb+srv://project2:Matkhaupj2@cluster0.pqb9ybw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
  { useNewUrlParser: true, useUnifiedTopology: true }
)
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error(err));

// mongoose.Schema

const userSchema = new mongoose.Schema({
  username: {type: String, unique: true},
  email: {type: String, unique: true},
  password: String
});
const User = mongoose.model('User',userSchema);

// register

app.post('/register', async(req, res)=>{
  const {username, email, password, confirmPassword} = req.body;

  if(!username || !email || !password || !confirmPassword){
    return res.status(400).json({error: 'Please fill in all fields'});
  }

  if(password != confirmPassword){
    return res.status(400).json({error: 'Passwords do not match'});
  }

  const hashed = await bcrypt.hash(password, 10);

  try{
    const newUser = new User({username, email, password: hashed});
    await newUser.save();
    res.json({message: 'Registration successful'});
  }catch (err){
    if(err.code === 11000){
      if(err.keyPattern.username){
        return res.status(400).json({error: 'Username already exists'});
      }
      if(err.keyPattern.email){
        return res.status(400).json({error: 'Email already used'})
      }
    }
    res.status(500).json({error: 'Server error'});
  }
});

// login

app.post('/login', async(req, res)=>{
  const {username, password} = req.body;
  const user = await User.findOne({username});

  if(!user){
    return res.status(400).json({error: 'Incorrect username or password'});
  }
  const match = await bcrypt.compare(password, user.password);
  if(!match){
    return res.status(400).json({error:'Wrong password'});
  }

  const token = jwt.sign({username: user.username}, 'SECRET_KEY', {expiresIn: '1h'});
  res.json({message:'Login successful', token});

});

app.get('/', (req, res)=>{
  res.sendFile(path.join(__dirname, 'public','html','index.html'));
})

app.get('/register', (req, res)=>{
  res.sendFile(path.join(__dirname, 'public/html/signup.html'));
})

app.get('/login', (req, res)=>{
  res.sendFile(path.join(__dirname, 'public/html/login.html'));
});

app.get('/profile', (req, res)=>{
  res.sendFile(path.join(__dirname, 'public/html/profile.html'));
});

// API nhận dữ liệu vẽ từ frontend
app.post('/check-kanji', (req, res) => {
  const { kanji, accuracy, imageData } = req.body;

  console.log("Nhận dữ liệu từ client:", { kanji, accuracy });
  
  // Ví dụ: chấm điểm đơn giản
  let feedback = accuracy > 50 ? "Tốt lắm!" : "Cần luyện thêm";
  
  res.json({
    message: "Đã nhận dữ liệu thành công",
    feedback: feedback
  });
});

app.listen(3000, () => {
  console.log('Server chạy ở http://localhost:3000');
});
