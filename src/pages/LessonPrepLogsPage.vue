<script setup>
import axios from 'axios';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { ElMessage } from 'element-plus';
import logoBlue from '@/assets/logo_blue.png';
import avatarImage from '@/assets/课堂派头像.jpg';

const API_BASE = 'http://localhost:8080';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

const topMenus = [
  { key: 'course', label: '我的课堂' },
  { key: 'prep', label: '备课区' },
  { key: 'lab', label: '虚拟教研室' },
  { key: 'agent', label: 'π 智能体（AI）' },
  { key: 'analysis', label: 'AI学情分析' },
  { key: 'graph', label: '知识图谱' },
  { key: 'knowledge', label: '多模态知识库' }
];

const userMenuOpen = ref(false);
const userMenuRef = ref(null);

const logsLoading = ref(false);
const spaceLoading = ref(false);
const spaceLogs = ref([]);
const currentSpaceDetail = ref(null);
const keyword = ref('');
const logFilters = ['全部', '文件编辑', '文件删除', '成员变动'];
const activeLogFilter = ref('全部');
let logsFetchTimer = null;

const displayName = computed(() => userStore.account?.name || '教师用户');
const spaceTitle = computed(() => currentSpaceDetail.value?.name || '操作记录');
const spaceTag = computed(() => {
  const type = String(
    currentSpaceDetail.value?.spaceType
    ?? currentSpaceDetail.value?.space_type
    ?? currentSpaceDetail.value?.group
    ?? ''
  );
  return type.includes('小组') ? '小组备课' : '个人备课';
});

function getAccountId() {
  return userStore.account?.accountId || '';
}

function toggleUserMenu() {
  userMenuOpen.value = !userMenuOpen.value;
}

function closeUserMenu() {
  userMenuOpen.value = false;
}

function handleDocumentClick(event) {
  if (!userMenuRef.value?.contains(event.target)) {
    closeUserMenu();
  }
}

function handleUserMenuAction(action) {
  closeUserMenu();
  action?.();
}

function goToPersonalSetting() {
  router.push('/personal-setting');
}

function goToLogin() {
  userStore.logout();
  router.push('/login');
}

function handleTopMenuClick(menuKey) {
  if (menuKey === 'course') {
    router.push('/course');
    return;
  }
  if (menuKey === 'prep') {
    router.push('/lesson-prep');
  }
}

function buildSpaceBasePath(spaceId) {
  const id = String(spaceId || '').trim();
  return id ? `/lesson-prep/${encodeURIComponent(id)}` : '/lesson-prep';
}

function navigateBack() {
  const id = typeof route.params?.spaceId === 'string' ? route.params.spaceId : '';
  router.push(buildSpaceBasePath(id));
}

function navigateToMembers() {
  const id = typeof route.params?.spaceId === 'string' ? route.params.spaceId : '';
  if (!id) return;
  router.push(`/lesson-prep/${encodeURIComponent(id)}/members`);
}

function navigateToLogs() {
  const id = typeof route.params?.spaceId === 'string' ? route.params.spaceId : '';
  if (!id) return;
  router.push(`/lesson-prep/${encodeURIComponent(id)}/logs`);
}

function formatTime(value) {
  const raw = value ?? '';
  if (!raw) return '';
  if (typeof raw === 'string') return raw.replace('T', ' ').slice(0, 19);
  return String(raw);
}

function getSpaceId() {
  return typeof route.params?.spaceId === 'string' ? route.params.spaceId : '';
}

function getLogContent(log) {
  return String(log?.detail ?? log?.content ?? log?.message ?? log?.action ?? '');
}

function getLogType(log) {
  const operationType = String(log?.operationType ?? '');
  const target = String(log?.operationTarget ?? '');
  const detail = getLogContent(log);
  const summary = `${operationType} ${target} ${detail}`;
  if (target === '成员' || /成员/.test(summary)) return '成员变动';
  if (/下载/.test(summary)) return '下载记录';
  if (operationType === '删除' && target !== '备课区') return '文件删除';
  if (target !== '备课区') return '文件编辑';
  return '全部';
}

const visibleLogs = computed(() => {
  const list = Array.isArray(spaceLogs.value) ? spaceLogs.value : [];
  const key = keyword.value.trim();
  const filter = activeLogFilter.value;
  return list.filter((l) => {
    const operator = String(l?.operator ?? l?.accountId ?? l?.userName ?? '');
    const content = getLogContent(l);
    const typeMatches = filter === '全部' ? true : getLogType(l) === filter;
    const keywordMatches = !key
      ? true
      : operator.includes(key)
        || content.includes(key)
        || String(l?.operationType ?? '').includes(key)
        || String(l?.operationTarget ?? '').includes(key)
        || String(l?.targetId ?? '').includes(key);
    return typeMatches && keywordMatches;
  });
});

function downloadVisibleLogs() {
  const rows = visibleLogs.value.map((log) => {
    const time = formatTime(log?.time ?? log?.createdAt ?? log?.created_at) || '-';
    const operator = log?.operator ?? log?.accountId ?? log?.userName ?? '-';
    const type = getLogType(log);
    const content = getLogContent(log) || '-';
    return `${time},${operator},${type},${content}`;
  });
  const header = '时间,操作者,类型,内容';
  const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
  const href = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = `${spaceTitle.value || '操作记录'}-${activeLogFilter.value}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(href);
  ElMessage.success('操作记录已开始下载');
}

async function fetchSpaceDetail(spaceId) {
  const accountId = getAccountId();
  if (!spaceId || !accountId) {
    currentSpaceDetail.value = null;
    return;
  }
  spaceLoading.value = true;
  try {
    const response = await axios.get(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}`, {
      params: { accountId }
    });
    const payload = response?.data ?? null;
    const detail = payload?.data ?? payload;
    currentSpaceDetail.value = detail?.prepareSpace ?? detail?.prepare_space ?? detail;
  } catch (e) {
    currentSpaceDetail.value = null;
  } finally {
    spaceLoading.value = false;
  }
}

async function fetchLogs(spaceId) {
  const accountId = getAccountId();
  if (!spaceId || !accountId) {
    spaceLogs.value = [];
    return;
  }
  logsLoading.value = true;
  try {
    const currentFilter = activeLogFilter.value;
    const category = currentFilter === '下载记录' ? '' : currentFilter;
    const response = await axios.get(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/logs`, {
      params: {
        accountId,
        ...(category && category !== '全部' ? { category } : {}),
        ...(keyword.value.trim() ? { keyword: keyword.value.trim() } : {})
      }
    });
    const list = Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response?.data?.data)
        ? response.data.data
        : Array.isArray(response?.data?.logs)
          ? response.data.logs
          : Array.isArray(response?.data?.data?.logs)
            ? response.data.data.logs
            : [];
    spaceLogs.value = list;
  } catch (e) {
    spaceLogs.value = [];
    ElMessage.error(e?.response?.data?.message || '操作记录获取失败，请稍后重试');
  } finally {
    logsLoading.value = false;
  }
}

function scheduleFetchLogs() {
  const spaceId = getSpaceId();
  if (!spaceId) return;
  if (logsFetchTimer) {
    clearTimeout(logsFetchTimer);
  }
  logsFetchTimer = window.setTimeout(async () => {
    await fetchLogs(spaceId);
  }, 250);
}

onMounted(async () => {
  document.addEventListener('click', handleDocumentClick);
  const spaceId = getSpaceId();
  if (spaceId) {
    await fetchSpaceDetail(spaceId);
    await fetchLogs(spaceId);
  }
});

watch(
  () => route.params?.spaceId,
  async (spaceId) => {
    const id = typeof spaceId === 'string' ? spaceId : '';
    if (!id) return;
    await fetchSpaceDetail(id);
    await fetchLogs(id);
  }
);

watch([activeLogFilter, keyword], () => {
  scheduleFetchLogs();
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick);
  if (logsFetchTimer) {
    clearTimeout(logsFetchTimer);
    logsFetchTimer = null;
  }
});
</script>

<template>
  <div class="lesson-prep-logs-page">
    <header class="prep-topbar">
      <div class="prep-topbar__left">
        <img class="prep-topbar__logo" :src="logoBlue" alt="Ai课堂派" />
        <nav class="prep-topbar__nav">
          <button
            v-for="item in topMenus"
            :key="item.key"
            type="button"
            class="prep-topbar__nav-item"
            :class="{ 'is-active': item.key === 'prep' }"
            @click="handleTopMenuClick(item.key)"
          >
            {{ item.label }}
          </button>
        </nav>
      </div>

      <div class="prep-topbar__right">
        <button type="button" class="prep-topbar__more">⋯ 更多</button>
        <button type="button" class="prep-topbar__bell">🔔</button>
        <div ref="userMenuRef" class="dropdown prep-topbar__user-menu">
          <button type="button" class="prep-topbar__user" @click.stop="toggleUserMenu">
            <img :src="avatarImage" alt="用户头像" />
            <span>{{ displayName }}</span>
          </button>
          <div v-show="userMenuOpen" class="prep-user-dropdown">
            <button type="button" @click="handleUserMenuAction(() => router.push('/course'))">我的课堂</button>
            <button type="button" @click="handleUserMenuAction(() => router.push('/lesson-prep'))">备课区</button>
            <button type="button" @click="closeUserMenu">开通VIP</button>
            <button type="button" @click="closeUserMenu">机构用户认证</button>
            <button type="button" @click="handleUserMenuAction(goToPersonalSetting)">个人设置</button>
            <button type="button" @click="handleUserMenuAction(goToLogin)">退出登录</button>
          </div>
        </div>
      </div>
    </header>

    <div class="logs-container">
      <section class="prep-workspace">
        <div class="prep-workspace__header">
          <div class="prep-workspace__title-wrap">
            <h1>{{ spaceTitle }}</h1>
            <span class="prep-workspace__badge">{{ spaceTag }}</span>
          </div>
        </div>

        <div class="prep-workspace__subnav">
          <button type="button" class="prep-back-btn" @click="navigateBack">← 返回</button>
          <span class="prep-subnav-title">操作记录</span>
        </div>

        <div class="prep-workspace__tabs logs-filter-tabs">
          <div class="logs-filter-tabs__left">
            <button
              v-for="filter in logFilters"
              :key="filter"
              type="button"
              class="prep-workspace__tab"
              :class="{ 'is-active': activeLogFilter === filter }"
              @click="activeLogFilter = filter"
            >
              {{ filter }}
            </button>
          </div>
          <button type="button" class="logs-filter-tabs__download" @click="downloadVisibleLogs">下载操作记录</button>
        </div>

        <div class="prep-workspace__toolbar">
          <div class="prep-workspace__search">
            <span class="prep-workspace__search-icon">☰</span>
            <input v-model="keyword" type="text" placeholder="搜索操作记录" />
          </div>
        </div>

        <div class="logs-table">
          <div class="logs-table__head">
            <span>时间</span>
            <span>操作者</span>
            <span>类型</span>
            <span>内容</span>
          </div>

          <div v-if="spaceLoading || logsLoading" class="logs-empty">加载中...</div>
          <div v-else-if="visibleLogs.length === 0" class="logs-empty">暂无记录</div>
          <div v-else class="logs-table__body">
            <div v-for="(l, idx) in visibleLogs" :key="l?.id ?? l?.logId ?? idx" class="logs-row">
              <span>{{ formatTime(l?.time ?? l?.createdAt ?? l?.created_at) || '-' }}</span>
              <span>{{ l?.operator ?? l?.accountId ?? l?.userName ?? '-' }}</span>
              <span class="logs-type">{{ getLogType(l) }}</span>
              <span class="logs-content">{{ getLogContent(l) || '-' }}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.lesson-prep-logs-page {
  min-height: 100vh;
  background: #f5f6f8;
  color: #1f2d45;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

button,
input {
  font: inherit;
}

button {
  cursor: pointer;
}

.prep-topbar {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px 0 12px;
  background: #ffffff;
  border-bottom: 1px solid #e6e9ef;
}

.prep-topbar__left,
.prep-topbar__right,
.prep-topbar__nav,
.prep-workspace__header,
.prep-workspace__title-wrap,
.prep-workspace__top-actions,
.prep-workspace__tabs,
.prep-workspace__toolbar,
.prep-workspace__tool-actions,
.prep-workspace__search {
  display: flex;
  align-items: center;
}

.dropdown {
  position: relative;
  display: inline-block;
}

.prep-topbar__left {
  gap: 22px;
}

.prep-topbar__logo {
  height: 28px;
  display: block;
}

.prep-topbar__nav {
  gap: 6px;
}

.prep-topbar__nav-item,
.prep-topbar__more,
.prep-topbar__bell,
.prep-workspace__top-actions button,
.prep-workspace__tool-actions button {
  border: none;
  background: transparent;
}

.prep-topbar__nav-item {
  height: 38px;
  padding: 0 12px;
  color: #38455c;
  font-size: 14px;
  white-space: nowrap;
}

.prep-topbar__nav-item.is-active {
  color: #2f6bff;
  font-weight: 600;
}

.prep-topbar__right {
  gap: 10px;
}

.prep-topbar__more,
.prep-topbar__bell {
  color: #556175;
  font-size: 13px;
}

.prep-topbar__user-menu {
  position: relative;
  display: flex;
  align-items: center;
}

.prep-topbar__user {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  border: none;
  background: transparent;
  color: #4a556a;
  font-size: 13px;
}

.prep-topbar__user img {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
}

.prep-user-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 12px);
  min-width: 160px;
  padding: 8px 0;
  background: #fff;
  border-radius: 2px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
  z-index: 1200;
}

.prep-user-dropdown button {
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: #000;
  text-align: center;
}

.prep-user-dropdown button:hover {
  background: #f1f1f1;
}

.logs-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 16px;
}

.prep-workspace {
  min-width: 0;
  margin-top: 16px;
  padding: 16px 20px 18px;
  background: #fff;
}

.prep-workspace__header {
  justify-content: space-between;
  gap: 16px;
}

.prep-workspace__title-wrap {
  gap: 10px;
}

.prep-workspace__title-wrap h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  white-space: nowrap;
}

.prep-workspace__badge {
  min-width: 56px;
  height: 22px;
  padding: 0 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #edf3ff;
  color: #2f6bff;
  font-size: 11px;
}

.prep-workspace__top-actions {
  gap: 10px;
}

.prep-workspace__top-actions button,
.prep-workspace__tool-actions button {
  height: 32px;
  padding: 0 14px;
  border: 1px solid #d9dfeb;
  border-radius: 6px;
  background: #fff;
  color: #46526a;
  font-size: 13px;
  white-space: nowrap;
}

.prep-workspace__top-actions .is-primary,
.prep-workspace__tool-actions .is-primary {
  border-color: #2f6bff;
  background: #2f6bff;
  color: #fff;
}

.prep-workspace__subnav {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 0 6px;
}

.prep-back-btn {
  height: 30px;
  padding: 0 10px;
  border: 1px solid #dce3ee;
  border-radius: 8px;
  background: #fff;
  color: #46526a;
  font-size: 13px;
}

.prep-subnav-title {
  color: #3f4a5f;
  font-size: 14px;
  font-weight: 600;
}

.prep-workspace__tabs {
  justify-content: space-between;
  gap: 22px;
  margin-top: 14px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e7ebf2;
}

.logs-filter-tabs__left {
  display: flex;
  align-items: center;
  gap: 22px;
}

.logs-filter-tabs__download {
  border: none;
  background: transparent;
  color: #2f6bff;
  font-size: 14px;
  white-space: nowrap;
}

.prep-workspace__tab {
  border: none;
  background: transparent;
  color: #5a667c;
  font-size: 14px;
  white-space: nowrap;
}

.prep-workspace__tab.is-active {
  color: #2f6bff;
  font-weight: 600;
}

.prep-workspace__toolbar {
  justify-content: flex-end;
  gap: 16px;
  margin-top: 16px;
}

.prep-workspace__tool-actions {
  gap: 10px;
}

.prep-workspace__search {
  gap: 10px;
  justify-content: flex-end;
  flex: 1;
}

.prep-workspace__search-icon {
  color: #2f6bff;
  font-size: 13px;
}

.prep-workspace__search input {
  width: 180px;
  height: 30px;
  padding: 0 12px;
  border: 1px solid #dce3ee;
  border-radius: 999px;
  outline: none;
  color: #4c576b;
  font-size: 13px;
}

.logs-table {
  margin-top: 14px;
  border-top: 1px solid #eceff5;
  overflow: hidden;
}

.logs-table__head,
.logs-row {
  display: grid;
  grid-template-columns: 180px 140px 120px 1fr;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
}

.logs-table__head {
  background: #f6f8fc;
  color: #5b667a;
  font-size: 12px;
}

.logs-row {
  border-top: 1px solid #eef1f6;
  font-size: 13px;
  color: #223146;
}

.logs-type {
  color: #2f6bff;
}

.logs-content {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logs-empty {
  padding: 22px;
  text-align: center;
  color: #6b7a90;
}
</style>
