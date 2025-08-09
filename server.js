const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(express.static('public'));
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' })); // Cho phép gửi ảnh Base64

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
