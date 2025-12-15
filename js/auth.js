// // public/js/auth.js
// // BẢO VỆ ĐĂNG NHẬP CHO TẤT CẢ CÁC TRANG

// function() {
//   const username = localStorage.getItem('username');
  
//   // Danh sách các trang KHÔNG cần đăng nhập
//   const publicPages = ['/login', '/register', '/'];
  
//   // Nếu không có username VÀ không phải trang công khai → đá về login
//   if (!username && !publicPages.includes(window.location.pathname)) {
//     alert("Bạn cần đăng nhập để tiếp tục!");
//     window.location.href = '/login';
//   }

//   // Tự động cập nhật tên user + link profile ở mọi trang
//   const usernameDisplay = document.getElementById('username');
//   const userIcon = document.getElementById('userIcon');
  
//   if (username) {
//     if (usernameDisplay) usernameDisplay.textContent = username;
//     if (userIcon) userIcon.href = '/profile';
//   } else {
//     if (userIcon) userIcon.href = '/login';
//   }
// };