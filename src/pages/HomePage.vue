<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';

const router = useRouter();
const userStore = useUserStore();

const stats = ref([
  { number: '2000万+', label: '注册用户' },
  { number: '500+', label: '合作院校' },
  { number: '10年+', label: '教育科技' },
  { number: '99.99%', label: '服务可用性' }
]);

const products = ref([
  { icon: '📚', name: '课堂派教学平台', desc: '智慧教学 · 全程互动 · 数据赋能' },
  { icon: '☁️', name: '虚拟教研室', desc: '云端协作 · 资产沉淀 · 共同成长' },
  { icon: '🤖', name: 'PAI智能体平台', desc: '人机协同 · 智能助教 · 效率革命' },
  { icon: '🧠', name: '知识图谱平台', desc: '知识融合 · 路径规划 · 认知导航' },
  { icon: '🎯', name: '多模态知识库', desc: '知识梳理 · 多模态聚合 · 精准测评' },
  { icon: '🖥️', name: '课堂派教学服务一体机', desc: '私有交付 · 极致算力 · 极简运维' }
]);

const features = ref([
  { emoji: '📝', title: '作业', desc: '81 种文档格式作业在线展示和批阅，实时查重，精准对比，避免学生抄袭。自动管理成绩，一键下载作业数据。' },
  { emoji: '📊', title: '考试/练习', desc: '单选、多选、填空、简答等10余种题型。支持题库随机抽题组卷。支持限时考试、选项随机等防作弊模式。' },
  { emoji: '📁', title: '课件资料', desc: '课件、资料、话题、公告等教学内容支撑。在线制作方便快捷，提升备课效率。支持课前发布活动，课中互动，课后巩固。' },
  { emoji: '💬', title: '课中互动', desc: '课件在线讲解、标记疑问。支持发言、开启弹幕、抢答、提问、话题讨论、黑板、画笔标注课堂要点，让课堂更精彩。' },
  { emoji: '📍', title: '考勤签到', desc: '二维码、数字口令、GPS等5种考勤形式，精准有效、避免代签。签到数据自动生成，一键导出。' },
  { emoji: '📈', title: '成绩管理', desc: '汇总互动数据、平时成绩、期末成绩。个性化配置成绩权重占比。数据报表一键导出下载，课留存，可追溯。' },
  { emoji: '📈', title: '教学数据分析', desc: '全方位教学数据信息化，可视化实时监测教学质量，把控教学进度，学业预警分析，提升教学效果。' },
  { emoji: '📈', title: '直播-云录屏', desc: '满足线上线下混合式教学场景。动画及课件同屏+语音实现轻量级直播。不限人员数量，手机电脑均可参与。' }
]);

const goToLogin = () => router.push('/login');
const goToRegister = () => router.push('/register');
const mobileMenuOpen = ref(false);
const toggleMobileMenu = () => { mobileMenuOpen.value = !mobileMenuOpen.value; };

onMounted(() => {
  const savedPhone = localStorage.getItem('autoLoginPhone');
  const savedPassword = localStorage.getItem('autoLoginPassword');
  if (userStore.account || (savedPhone && savedPassword)) {
    router.push('/course');
  }
});
</script>

<template>
  <div class="home-page">
    <!-- 导航栏 -->
    <header class="navbar">
      <div class="nav-inner">
        <div class="logo">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#2563eb" />
          </svg>
          Ai课堂派
        </div>
        <nav :class="{ 'mobile-open': mobileMenuOpen }">
          <a href="#">首页</a>
          <a href="#">产品矩阵</a>
          <a href="#">解决方案</a>
          <a href="#">渠道合作</a>
          <a href="#">会员权益</a>
          <a href="#">帮助中心</a>
          <a href="#">Ai工作集</a>
        </nav>
        <div class="actions">
          <button class="mobile-menu-btn" @click="toggleMobileMenu" aria-label="菜单">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
          <button class="login-btn" @click="goToLogin">登录</button>
          <button class="register-btn" @click="goToRegister">注册</button>
        </div>
      </div>
    </header>

    <section class="hero">
      <div class="hero-inner">
        <div class="badge">AI-POWERED EDUCATION</div>
        <h1>智慧教学<br><span>新范式</span></h1>
        <p>课堂派 —— 面向 AI 时代的智慧教学平台<br />以数据智能驱动教学创新，让每一次课堂都精彩纷呈</p>
        <div class="cta-group">
          <button class="btn-primary">立即体验</button>
          <button class="btn-secondary">观看演示</button>
        </div>
      </div>
    </section>

    <section class="stats">
      <div class="stats-inner">
        <div class="stat-item" v-for="s in stats" :key="s.label">
          <div class="number">{{ s.number }}</div>
          <div class="label">{{ s.label }}</div>
        </div>
      </div>
    </section>

    <section class="products">
      <div class="products-inner">
        <div class="section-title">
          <h2>全场景智慧教学产品矩阵</h2>
          <p>围绕"教学 · 教研 · AI · 知识 · 门户"构建可组合的数字化能力栈</p>
        </div>
        <div class="grid">
          <div class="product-card" v-for="p in products" :key="p.name">
            <span class="icon">{{ p.icon }}</span>
            <h3>{{ p.name }}</h3>
            <p>{{ p.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="features">
      <div class="features-inner">
        <div class="section-title">
          <h2>混合教学全过程管理</h2>
          <p>课前、课中、课后，线上线下，教学场景全过程管理</p>
        </div>
        <div class="grid">
          <div class="feature-item" v-for="f in features" :key="f.title">
            <span class="emoji">{{ f.emoji }}</span>
            <h4>{{ f.title }}</h4>
            <p>{{ f.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <footer class="footer">
      <div class="footer-inner">
        <div class="copyright">&copy; 2026 Ai课堂派 · 智慧教学新范式</div>
        <div class="links">
          <a href="#">隐私政策</a>
          <a href="#">服务条款</a>
          <a href="#">帮助中心</a>
        </div>
      </div>
    </footer>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.home-page {
  width: 100%;
  min-height: 100vh;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  background: #f5f8fc;
  color: #1a2332;
}

a {
  text-decoration: none;
  color: inherit;
}

.navbar, .hero, .stats, .products, .features, .footer {
  width: 100%;
  padding: 0 24px;
  margin: 0;
}

.navbar {
  background: #ffffff;
  box-shadow: 0 1px 4px rgba(0, 20, 50, 0.06);
  height: 50px;
  display: flex;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 50;
}
.nav-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}
.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 22px;
  font-weight: 700;
  color: #2563eb;
  flex-shrink: 0;
}
.logo svg {
  width: 32px;
  height: 32px;
}
nav {
  display: flex;
  gap: 32px;
  font-size: 12px;
  color: #334155;
}
nav a:hover {
  color: #2563eb;
}
.actions {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-shrink: 0;
}

.login-btn {
  color: #2563eb;
  font-weight: 500;
  font-size: 10px;
  background: transparent;
  border: 1px solid #2563eb;
  cursor: pointer;
  padding: 6px 16px;
  border-radius: 6px;
}
.login-btn:hover {
  opacity: 0.8;
}

.register-btn {
  color: #ffffff;
  font-weight: 500;
  font-size: 10px;
  background: #2563eb;
  border: none;
  cursor: pointer;
  padding: 6px 20px;
  border-radius: 6px;
}
.register-btn:hover {
  background: #1d4ed8;
}

.btn-primary {
  color: #fff;
  font-weight: 600;
  font-size: 12px;
  background: #2563eb;
  border: none;
  cursor: pointer;
  padding: 12px 40px;
  border-radius: 10px;
}
.btn-primary:hover {
  background: #1d4ed8;
}

.btn-secondary {
  color: #1a2332;
  font-weight: 500;
  font-size: 12px;
  background: #fff;
  border: 1px solid #d1d9e6;
  cursor: pointer;
  padding: 12px 40px;
  border-radius: 10px;
}
.btn-secondary:hover {
  border-color: #2563eb;
  color: #2563eb;
}

/* Hero */
.hero {
  background: linear-gradient(135deg, #eef4ff 0%, #ffffff 70%);
  padding: 80px 24px 60px;
  text-align: center;
}
.hero-inner {
  max-width: 640px;
  margin: 0 auto;
}
.badge {
  display: inline-block;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 13px;
  font-weight: 600;
  padding: 4px 16px;
  border-radius: 40px;
  margin-bottom: 20px;
}
.hero h1 {
  font-size: 48px;
  font-weight: 800;
  color: #0b1a33;
  letter-spacing: -1px;
  margin-bottom: 16px;
  line-height: 1.1;
}
.hero h1 span {
  color: #2563eb;
}
.hero p {
  font-size: 18px;
  color: #475569;
  margin-bottom: 32px;
}
.cta-group {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}

.stats {
  background: #ffffff;
  padding: 40px 24px;
  border-top: 1px solid #edf2f7;
  border-bottom: 1px solid #edf2f7;
}
.stats-inner {
  display: flex;
  justify-content: space-around;
  flex-wrap: wrap;
  gap: 24px;
  text-align: center;
}
.stat-item .number {
  font-size: 32px;
  font-weight: 700;
  color: #0b1a33;
}
.stat-item .label {
  font-size: 14px;
  color: #64748b;
  margin-top: 4px;
}

.section-title {
  text-align: center;
  margin-bottom: 48px;
}
.section-title h2 {
  font-size: 34px;
  font-weight: 700;
  color: #0b1a33;
  letter-spacing: -0.5px;
}
.section-title p {
  color: #64748b;
  font-size: 17px;
  margin-top: 8px;
}

.products {
  background: #ffffff;
  padding: 80px 24px;
}
.products .grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 32px;
}
.product-card {
  background: #f8faff;
  border-radius: 16px;
  padding: 32px 24px;
  border: 1px solid #edf2f7;
  transition: 0.25s;
}
.product-card:hover {
  box-shadow: 0 12px 30px rgba(0, 20, 50, 0.08);
  transform: translateY(-4px);
}
.product-card .icon {
  font-size: 36px;
  display: block;
  margin-bottom: 12px;
}
.product-card h3 {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 8px;
}
.product-card p {
  color: #475569;
  font-size: 15px;
}

.features {
  background: #f8faff;
  padding: 80px 24px;
}
.features .grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 28px;
}
.feature-item {
  background: #ffffff;
  padding: 24px 20px;
  border-radius: 14px;
  border: 1px solid #edf2f7;
  transition: 0.2s;
}
.feature-item:hover {
  box-shadow: 0 8px 24px rgba(0, 20, 50, 0.06);
}
.feature-item .emoji {
  font-size: 28px;
  display: block;
  margin-bottom: 8px;
}
.feature-item h4 {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 4px;
}
.feature-item p {
  font-size: 10px;
  color: #64748b;
}

.footer {
  background: #0b1a33;
  color: #cbd5e1;
  padding: 48px 24px 32px;
}
.footer-inner {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
}
.footer .copyright {
  font-size: 14px;
}
.footer .links {
  display: flex;
  gap: 24px;
  font-size: 14px;
}
.footer .links a:hover {
  color: #ffffff;
}

.mobile-menu-btn {
  display: none;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 6px;
}
.mobile-menu-btn svg {
  width: 24px;
  height: 24px;
  color: #334155;
}

@media (max-width: 768px) {
  .mobile-menu-btn {
    display: block;
  }
  nav {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: #ffffff;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    flex-direction: column;
    padding: 16px;
    gap: 12px;
    z-index: 100;
  }
  nav.mobile-open {
    display: flex;
  }
  .hero h1 {
    font-size: 32px;
  }
  .stat-item .number {
    font-size: 24px;
  }
  .section-title h2 {
    font-size: 26px;
  }
  .products .grid {
    grid-template-columns: 1fr 1fr;
  }
  .features .grid {
    grid-template-columns: 1fr 1fr;
  }
}
@media (max-width: 480px) {
  .products .grid,
  .features .grid {
    grid-template-columns: 1fr;
  }
  .register-btn {
    padding: 6px 14px;
    font-size: 13px;
  }
}
</style>
