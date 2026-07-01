<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import logoBlue from '@/assets/logo_blue.png';

const props = defineProps({
  headerClass: { type: [String, Array, Object], default: '' },
  menus: { type: Array, default: () => [] },
  activeMenuKey: { type: String, default: '' },
  showLogo: { type: Boolean, default: true },
  logoSrc: { type: String, default: logoBlue },
  logoAlt: { type: String, default: 'Ai课堂派' },
  showMoreButton: { type: Boolean, default: true },
  displayName: { type: String, default: '' },
  userAvatarSrc: { type: String, default: '' },
  notifications: { type: Array, default: () => [] },
  notificationsLoading: { type: Boolean, default: false },
  unreadNotificationCount: { type: Number, default: -1 },
  showPrepEntry: { type: Boolean, default: false }
});

const emit = defineEmits([
  'menu-click',
  'notification-open',
  'notification-click',
  'mark-all-notifications-as-read',
  'go-course',
  'go-prep',
  'go-personal-setting',
  'logout'
]);

const userMenuOpen = ref(false);
const notificationPanelVisible = ref(false);
const userMenuRef = ref(null);
const notificationPanelRef = ref(null);

const visibleMenus = computed(() => (props.menus || []).filter(item => item?.visible !== false));
const resolvedUnreadCount = computed(() => (
  props.unreadNotificationCount >= 0
    ? props.unreadNotificationCount
    : (props.notifications || []).filter(item => !item?.readStatus).length
));

function closeUserMenu() {
  userMenuOpen.value = false;
}

function toggleUserMenu() {
  userMenuOpen.value = !userMenuOpen.value;
}

function handleDocumentClick(event) {
  if (!userMenuRef.value?.contains(event.target)) {
    closeUserMenu();
  }
  if (!notificationPanelRef.value?.contains(event.target)) {
    notificationPanelVisible.value = false;
  }
}

function handleMenuClick(key) {
  emit('menu-click', key);
}

function toggleNotificationPanel() {
  notificationPanelVisible.value = !notificationPanelVisible.value;
  if (notificationPanelVisible.value) {
    emit('notification-open');
  }
}

function handleNotificationClick(notification) {
  notificationPanelVisible.value = false;
  emit('notification-click', notification);
}

function handleUserMenuAction(action) {
  closeUserMenu();
  action?.();
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick);
});
</script>

<template>
  <header class="prep-topbar shared-topbar" :class="headerClass">
    <div class="prep-topbar__left">
      <slot name="left">
        <img
          v-if="showLogo"
          class="prep-topbar__logo"
          :src="logoSrc"
          :alt="logoAlt"
        />
        <nav v-if="visibleMenus.length" class="prep-topbar__nav">
          <button
            v-for="item in visibleMenus"
            :key="item.key"
            type="button"
            class="prep-topbar__nav-item"
            :class="{ 'is-active': item.key === activeMenuKey }"
            @click="handleMenuClick(item.key)"
          >
            {{ item.label }}
          </button>
        </nav>
      </slot>
    </div>

    <div class="prep-topbar__right">
      <button v-if="showMoreButton" type="button" class="prep-topbar__more">⋯ 更多</button>

      <div ref="notificationPanelRef" class="prep-topbar__notification">
        <button type="button" class="prep-topbar__bell" @click.stop="toggleNotificationPanel">
          🔔
          <span v-if="resolvedUnreadCount" class="prep-topbar__bell-badge">
            {{ resolvedUnreadCount > 99 ? '99+' : resolvedUnreadCount }}
          </span>
        </button>
        <div v-if="notificationPanelVisible" class="notification-panel" @click.stop>
          <div class="notification-panel__header">
            <span>通知</span>
            <button
              type="button"
              class="notification-panel__action"
              @click="$emit('mark-all-notifications-as-read')"
            >
              全部已读
            </button>
          </div>
          <div v-if="notificationsLoading" class="notification-panel__empty">加载中...</div>
          <div v-else-if="!notifications.length" class="notification-panel__empty">暂无通知</div>
          <div v-else class="notification-panel__list">
            <button
              v-for="notification in notifications"
              :key="notification.id"
              type="button"
              class="notification-panel__item"
              :class="{ unread: !notification.readStatus }"
              @click="handleNotificationClick(notification)"
            >
              <div class="notification-panel__item-top">
                <span class="notification-panel__title">{{ notification.title || '系统通知' }}</span>
                <span class="notification-panel__time">{{ notification.createdAt || '' }}</span>
              </div>
              <div class="notification-panel__content">{{ notification.content || '暂无内容' }}</div>
            </button>
          </div>
        </div>
      </div>

      <div ref="userMenuRef" class="prep-topbar__user-menu">
        <button type="button" class="prep-topbar__user" @click.stop="toggleUserMenu">
          <img :src="userAvatarSrc" alt="用户头像" />
          <span>{{ displayName }}</span>
        </button>
        <div v-show="userMenuOpen" class="prep-user-dropdown">
          <button type="button" @click="handleUserMenuAction(() => $emit('go-course'))">我的课堂</button>
          <button
            v-if="showPrepEntry"
            type="button"
            @click="handleUserMenuAction(() => $emit('go-prep'))"
          >
            备课区
          </button>
          <button type="button" @click="handleUserMenuAction()">开通VIP</button>
          <button type="button" @click="handleUserMenuAction()">机构用户认证</button>
          <button
            type="button"
            @click="handleUserMenuAction(() => $emit('go-personal-setting'))"
          >
            个人设置
          </button>
          <button type="button" @click="handleUserMenuAction(() => $emit('logout'))">退出登录</button>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.prep-topbar__left,
.prep-topbar__right,
.prep-topbar__nav,
.prep-topbar__user {
  display: flex;
  align-items: center;
  gap: 0;
}

.prep-topbar__left {
  gap: 22px;
}

.prep-topbar__logo {
  width: auto;
  height: 28px;
  display: block;
}

.prep-topbar__nav {
  gap: 6px;
}

.prep-topbar__nav-item,
.prep-topbar__more,
.prep-topbar__bell {
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

.prep-topbar__user {
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

.prep-topbar__user-menu {
  position: relative;
  display: flex;
  align-items: center;
}

.prep-topbar__notification {
  position: relative;
  display: flex;
  align-items: center;
}

.prep-topbar__bell-badge {
  position: absolute;
  top: -6px;
  right: -10px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: #f56c6c;
  color: #fff;
  font-size: 11px;
  line-height: 18px;
  text-align: center;
}

.notification-panel {
  position: absolute;
  top: 42px;
  right: -18px;
  width: 360px;
  max-height: 460px;
  padding: 12px 0;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.15);
  z-index: 1200;
  overflow: hidden;
}

.notification-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px 10px;
  border-bottom: 1px solid #edf2f7;
  font-size: 15px;
  color: #1f2937;
  font-weight: 600;
}

.notification-panel__action {
  padding: 0;
  border: none;
  background: transparent;
  font-size: 12px;
  color: #409eff;
  cursor: pointer;
}

.notification-panel__action:hover {
  color: #66b1ff;
}

.notification-panel__list {
  max-height: 396px;
  overflow: auto;
}

.notification-panel__item {
  width: 100%;
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid #f3f4f6;
  background: #fff;
}

.notification-panel__item:last-child {
  border-bottom: none;
}

.notification-panel__item.unread {
  background: #f7fbff;
}

.notification-panel__item-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
}

.notification-panel__title {
  font-size: 14px;
  color: #1f2937;
  font-weight: 600;
}

.notification-panel__time {
  font-size: 11px;
  color: #9ca3af;
  white-space: nowrap;
}

.notification-panel__content {
  font-size: 12px;
  line-height: 1.7;
  color: #4b5563;
}

.notification-panel__empty {
  padding: 28px 16px;
  text-align: center;
  color: #9ca3af;
  font-size: 13px;
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
</style>
