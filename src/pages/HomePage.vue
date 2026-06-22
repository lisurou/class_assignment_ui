<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';

const router = useRouter();
const userStore = useUserStore();
const isLoggedIn = ref(false);

onMounted(() => {
  // 检查是否已经登录（Store中有账号信息），或者是否选择了自动登录（有本地凭证）
  const savedPhone = localStorage.getItem('autoLoginPhone');
  const savedPassword = localStorage.getItem('autoLoginPassword');

  if (userStore.account || (savedPhone && savedPassword)) {
    isLoggedIn.value = true;
  }
});

const goToLogin = () => {
  router.push('/login');
};

const goToRegister = () => {
  router.push('/register');
};

const goToCourse = () => {
  router.push('/course');
};
</script>

<template>
  <div class="home-page">
    <!-- 顶部导航栏 -->
    <header class="header">
      <div class="logo">
        <img src="@/assets/logo_blue.png" alt="课堂派logo" />
      </div>
      <div class="nav-right">
        <!-- 如果已登录或有自动登录凭证，显示进入课堂 -->
        <template v-if="isLoggedIn">
          <button class="btn btn-primary" @click="goToCourse">进入课堂</button>
        </template>
        <!-- 否则显示登录和注册按钮 -->
        <template v-else>
          <button class="btn btn-outline" @click="goToLogin">登录</button>
          <button class="btn btn-primary" @click="goToRegister">注册</button>
        </template>
      </div>
    </header>

    <!-- 主体展示区 -->
    <main class="main-content">
      <div class="hero-text">
        <h1>互动课堂，让教学更简单</h1>
        <p>一款极简的课堂互动与管理工具，为老师和学生提供高效的教与学体验。</p>
        <button class="btn btn-large" @click="isLoggedIn ? goToCourse() : goToLogin()">
          免费使用
        </button>
      </div>
      <div class="hero-image">
        <img src="@/assets/课堂派.png" alt="课堂派展示" />
      </div>
    </main>
  </div>
</template>

<style scoped>
.home-page {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f8f9fa;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  overflow: hidden;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 50px;
  height: 80px;
  background-color: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
}

.logo img {
  height: 35px;
}

.nav-right {
  display: flex;
  gap: 15px;
}

.btn {
  padding: 8px 24px;
  font-size: 16px;
  border-radius: 4px;
  cursor: pointer;
  border: none;
  transition: all 0.3s;
}

.btn-outline {
  background-color: transparent;
  color: #4285f4;
  border: 1px solid #4285f4;
}

.btn-outline:hover {
  background-color: #f1f6ff;
}

.btn-primary {
  background-color: #4285f4;
  color: white;
}

.btn-primary:hover {
  background-color: #3367d6;
}

.btn-large {
  padding: 12px 36px;
  font-size: 18px;
  background-color: #4285f4;
  color: white;
  margin-top: 20px;
  border-radius: 6px;
}

.btn-large:hover {
  background-color: #3367d6;
}

.main-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 10% 80px;
  gap: 80px;
}

.hero-text {
  flex: 1;
  max-width: 500px;
}

.hero-text h1 {
  font-size: 48px;
  color: #333;
  margin-bottom: 20px;
  font-weight: bold;
}

.hero-text p {
  font-size: 20px;
  color: #666;
  line-height: 1.6;
  margin-bottom: 30px;
}

.hero-image {
  flex: 1;
  display: flex;
  justify-content: center;
}

.hero-image img {
  max-width: 100%;
  height: auto;
}
</style>
