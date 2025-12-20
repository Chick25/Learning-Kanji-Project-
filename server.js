const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

const cheerio = require("cheerio");
const axios = require("axios");
const fs = require("fs");


const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { register } = require('module');
const { error } = require('console');

app.use(express.static(path.join(__dirname, 'public')));

// app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' })); // Cho phép gửi ảnh Base64
app.use(bodyParser.urlencoded({extended: true}));

// app.use(express.static(path.join(__dirname, 'public')));

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
  password: String,
  progress:{
    "grade-1": { type: [String], default: [] },
    "grade-2": { type: [String], default: [] },
    "grade-3": { type: [String], default: [] },
    "grade-4": { type: [String], default: [] },
    "grade-5": { type: [String], default: [] },
    // "grade-6": { type: [String], default: [] },
  }

});
const User = mongoose.model('User',userSchema);

// THÊM VÀO ĐÂY – SAU mongoose.connect()
const kanjiResultSchema = new mongoose.Schema({
  kanji: String,
  accuracy: Number,
  imageData: String,
  timestamp: { type: Date, default: Date.now }
});



const KanjiResult = mongoose.model('KanjiResult', kanjiResultSchema);

//kanjivg
// app.use("/kanji", express.static(path.join(__dirname, "kanjivg")));

// app.use(express.static("public"));

// app.use(express.static(path.join(__dirname, 'public')));
// register

app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, path) => {
    console.log('Serving static file:', path);
  }
}));

// app.use(express.static(path.join(__dirname, 'public')));


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

  res.json({
    message: 'Login successful',
    username: user.username  // TRẢ VỀ USERNAME
  });

});

// app.use(express.static(path.join(__dirname, 'public')));

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

// app.get('/word_connect_game', (req, res)=>{
//   res.sendFile(path.join(__dirname, 'public', 'tsk', 'noi_chu', 'word_connect_game.html'));
// });

app.get('/gamenoichu', (req, res)=>{
  res.sendFile(path.join(__dirname, 'public', 'tsk', 'matchingame', 'gamenoichu.html'));
});

app.get('/word_connect_game', (req, res)=>{
  res.sendFile(path.join(__dirname, 'public', 'tsk', 'noi_chu', 'word_connect_game.html'));
});

app.get('/write_game', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'tsk', 'writegame', 'write_game.html'));
});

// app.get('/botgame_kanjiLearned', (req, res) => {
//   res.sendFile(path.join(__dirname, 'public', 'tsk', 'botgame', 'botgame_kanjiLearned.html'));
// });

app.get('/botgame', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'tsk', 'botgame', 'botgame.html'));
});

app.get('/game2', (req, res)=>{
  res.sendFile(path.join(__dirname, 'public', 'tsk', 'game2', 'game2.html'));
});

app.post('/check-kanji', async (req, res) => {
  try {
    const { kanji } = req.body;

    // Lấy username từ session hoặc localStorage (frontend gửi kèm)
    const username = req.body.username || req.headers['x-username'];
    if (!username) {
      return res.status(400).json({ error: "Thiếu username" });
    }

    // Tìm user và thêm chữ vào progress (theo cấp độ hiện tại)
    const level = req.body.level || "grade-1"; // bạn có thể gửi level từ frontend

    const updatedUser = await User.findOneAndUpdate(
      { username },
      { $addToSet: { [`progress.${level}`]: kanji } }, // tránh trùng
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "Không tìm thấy user" });
    }

    console.log(`Đã thêm ${kanji} vào progress của ${username} (${level})`);

    res.json({ 
      success: true, 
      message: "Đã lưu vào tiến độ học!",
      progress: updatedUser.progress 
    });

  } catch (err) {
    console.error("Lỗi lưu progress:", err);
    res.status(500).json({ error: "Lỗi server" });
  }
});


app.post('/learn', async(req, res)=>{

  try{ 
    const {username, level, kanji} = req.body;

    if(!username || !level || !kanji){
      return res.status(400).json({error:'Missing Kanji'});
    }  

    const updatedUser = await User.findOneAndUpdate(
      { username },
      { $addToSet: {[`progress.${level}`]: kanji} },
      { new: true }
    );

    if(!updatedUser){
      return res.status(400).json({error: 'Not found user'});
    }

    console.log("Update progress:", username, level, kanji);

    res.json({
      message: 'Update complete',
      progress: updatedUser.progress
    });

    // console.log("Update progress:", username, level, kanji);

  }catch(err){
    console.log(err);
    res.status(500).json({error: 'Server is wrong'});
  }
});

app.get('/learn', async(req, res)=>{
  try{
    const {username, level} = req.query;

    const user = await User.findOne({username});
    if(!user){
      return res.status(404).json({err: 'Not found user'});
    }

    const learnedCount = user.progress[level]?.length || 0;

    res.json({
      progress: learnedCount
    });

  }catch(err){
    res.status(500).json({err: 'Server is wrong'});
  }
});


// API lấy tiến độ học (gộp tất cả grade cho game)
app.get('/api/progress', async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) {
      return res.status(400). json({ error: 'Thiếu username' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy user' });
    }

    // Gộp tất cả chữ từ progress (grade-1, grade-2, ...)
    const allLearnedKanji = [];
    Object.values(user.progress || {}).forEach(gradeArray => {
      allLearnedKanji.push(...(gradeArray || []));
    });

    res.json({
      success: true,
      learnedKanji: allLearnedKanji,  // Mảng chữ đã học
      total: allLearnedKanji.length,
      progress: user.progress  // Toàn bộ object progress nếu cần
    });

  } catch (err) {
    console.error('Lỗi lấy progress:', err);
    res.status(500).json({ error: 'Lỗi server' });
  }
});

const mnemonics = {};
async function fetchKanjiList(kanji) {
  try{
    const res = await axios.get(`https://kanjiapi.dev/v1/kanji/${encodeURIComponent(kanji)}`);
    return{
      meanings: res.data.meanings || [],
      on_readings: res.data.on_readings || [],
      kun_readings: res.data.kun_readings || []
    };

  }catch (err) {
    console.log(`❌ Kanji API lỗi: ${kanji}`);
    return { meanings: [], on_readings: [], kun_readings: [] };
  }
}

async function scarpeMnemonic(kanji) {
  try{
    const url = `https://www.rtega.be/chmn/index.php?c=${encodeURIComponent(kanji)}`;
    const {data: html} = await axios.get(url);
    const $ = cheerio.load(html);
    const mnemonic = $("td").eq(3).text().trim() || "Not found mnemonic";
    return mnemonic;
  }catch(err){
    console.log(`❌ Scrape CHMN lỗi: ${kanji}`);
    return "Not found mnemonic";
  }
}


app.get("/mnemonic", async(req, res)=>{
  const kanji = req.query.kanji;
  if(!kanji){
    return res.status(400).json({error: 'Missing Kanji'});
  }

  try{
    const apiData = await fetchKanjiList(kanji);
    const mnemonic = await scarpeMnemonic(kanji);
    // const url = `https://www.rtega.be/chmn/index.php?c=${encodeURIComponent(kanji)}`;
    // const response = await fetch(url);
    // const html = await response.text();
    // const $ = cheerio.load(html);

    // const mnemonic = $("td").eq(3).text().trim();

    // $("td").each((i, el)=>{
    //   console.log(i, $(el).text().trim());
    //   const cellText = $(el).text().trim().toLocaleLowerCase();
    //   if(cellText.includes("mnemonic")){
    //     mnemonic = $(el).next("td").text().trim();
    //   }
    // });
    res.json({kanji, mnemonic: mnemonic || 'Not found mnemonic'});

  }catch(err){
    res.status(500).json({error: "Lỗi khi lấy dữ liệu", details: err.message });
  }

});


app.listen(3000, () => {
  console.log('Server chạy ở http://localhost:3000');
});
