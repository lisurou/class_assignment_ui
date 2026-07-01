<script setup>
import axios from 'axios';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { ElMessage, ElMessageBox } from 'element-plus';
import defaultAvatarImage from '@/assets/课堂派头像.jpg';
import AppTopbar from '@/components/AppTopbar.vue';

const API_BASE = 'http://localhost:8080';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const userAvatarSrc = computed(() => userStore.account?.avatarUrl || defaultAvatarImage);

const topMenus = [
  { key: 'course', label: '我的课堂' },
  { key: 'prep', label: '备课区' },
  { key: 'lab', label: '虚拟教研室' },
  { key: 'agent', label: 'π 智能体（AI）' },
  { key: 'analysis', label: 'AI学情分析' },
  { key: 'graph', label: '知识图谱' },
  { key: 'knowledge', label: '多模态知识库' }
];

const notifications = ref([]);
const notificationsLoading = ref(false);

const membersLoading = ref(false);
const spaceLoading = ref(false);
const spaceMembers = ref([]);
const currentSpaceDetail = ref(null);
const keyword = ref('');
const selectedMemberIds = ref([]);
const addDialogVisible = ref(false);
const addSubmitting = ref(false);
const addForm = ref({
  memberAccountId: '',
  role: 'editor'
});
const transferDialogVisible = ref(false);
const transferSubmitting = ref(false);
const transferForm = ref({
  memberId: null,
  memberName: '',
  previousOwnerRole: 'admin'
});
const roleDialogVisible = ref(false);
const roleSubmitting = ref(false);
const roleForm = ref({
  memberId: null,
  memberName: '',
  role: 'editor'
});
const roleOptions = [
  { label: '管理员', value: 'admin' },
  { label: '成员', value: 'editor' },
  { label: '只读', value: 'viewer' }
];

const displayName = computed(() => userStore.account?.name || '教师用户');
const unreadNotificationCount = computed(() => notifications.value.filter(item => !item?.readStatus).length);
const spaceTitle = computed(() => currentSpaceDetail.value?.name || '成员管理');
const spaceTag = computed(() => {
  const type = String(
    currentSpaceDetail.value?.spaceType
    ?? currentSpaceDetail.value?.space_type
    ?? currentSpaceDetail.value?.group
    ?? ''
  );
  return type.includes('小组') ? '小组备课' : '个人备课';
});
const currentOwnerAccountId = computed(() => String(currentSpaceDetail.value?.ownerId ?? currentSpaceDetail.value?.owner_id ?? ''));
const canTransferOwner = computed(() => {
  const accountId = getAccountId();
  return Boolean(accountId) && accountId === currentOwnerAccountId.value;
});

function getAccountId() {
  return userStore.account?.accountId || '';
}

function goToPersonalSetting() {
  router.push('/personal-setting');
}

function goToLogin() {
  userStore.logout();
  router.push('/login');
}

const loadNotifications = async () => {
  if (!userStore.account?.accountId) {
    notifications.value = [];
    return;
  }
  notificationsLoading.value = true;
  try {
    const response = await axios.get(`${API_BASE}/notifications`, {
      params: {
        accountId: userStore.account.accountId
      }
    });
    const data = response.data;
    if (data.success) {
      notifications.value = (data.notifications || []).filter(Boolean);
      return;
    }
    ElMessage.error(data.message || '通知加载失败');
  } catch (error) {
    console.log('通知加载失败：', error);
    ElMessage.error('通知加载失败，请稍后重试');
  } finally {
    notificationsLoading.value = false;
  }
};

const markNotificationAsRead = async (notification, silent = false) => {
  if (!notification?.id || notification?.readStatus) {
    return true;
  }
  try {
    const response = await axios.post(`${API_BASE}/notifications/read-one`, {
      notificationId: notification.id,
      accountId: userStore.account?.accountId
    });
    const data = response.data;
    if (!data.success) {
      if (!silent) {
        ElMessage.error(data.message || '通知已读失败');
      }
      return false;
    }
    notifications.value = notifications.value.map(item => (
      item?.id === notification.id ? { ...item, readStatus: true } : item
    ));
    return true;
  } catch (error) {
    console.log('通知已读失败：', error);
    if (!silent) {
      ElMessage.error('通知已读失败，请稍后重试');
    }
    return false;
  }
};

const markAllNotificationsAsRead = async () => {
  try {
    const response = await axios.post(`${API_BASE}/notifications/read-all`, {
      accountId: userStore.account?.accountId
    });
    const data = response.data;
    if (!data.success) {
      ElMessage.error(data.message || '全部已读失败');
      return;
    }
    notifications.value = notifications.value.map(item => ({ ...item, readStatus: true }));
    ElMessage.success(data.message || '全部标记为已读');
  } catch (error) {
    console.log('全部通知已读失败：', error);
    ElMessage.error('全部已读失败，请稍后重试');
  }
};

const handleNotificationClick = async (notification) => {
  if (!notification) return;
  await markNotificationAsRead(notification, true);
  if (notification.courseId) {
    router.push('/course');
  }
};

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

function normalizeId(value) {
  if (value === undefined || value === null || value === '' || value === 'null' || value === 'undefined') {
    return 'root';
  }
  return String(value);
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

function getMemberId(member) {
  const rawId = member?.memberId ?? member?.id;
  const value = Number(rawId);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function isOwnerMember(member) {
  return String(member?.role ?? '').toLowerCase() === 'owner';
}

function mapRoleLabel(role) {
  const normalized = String(role ?? '').trim().toLowerCase();
  if (normalized === 'owner') return '组长';
  if (normalized === 'admin') return '管理员';
  if (normalized === 'editor') return '成员';
  if (normalized === 'viewer') return '只读';
  return role || '-';
}

function getRoleLabel(member) {
  return mapRoleLabel(member?.role ?? member?.memberRole) || member?.identity || '-';
}

const visibleMembers = computed(() => {
  const list = Array.isArray(spaceMembers.value) ? spaceMembers.value : [];
  const key = keyword.value.trim();
  if (!key) return list;
  return list.filter((m) => {
    const name = String(m?.name ?? m?.userName ?? m?.teacherName ?? '');
    const account = String(m?.accountId ?? m?.account ?? m?.userId ?? '');
    return name.includes(key) || account.includes(key);
  });
});

const selectableMemberIds = computed(() => visibleMembers.value
  .map((member) => (isOwnerMember(member) ? null : getMemberId(member)))
  .filter((id) => id !== null));

const allMembersChecked = computed(() => (
  selectableMemberIds.value.length > 0
  && selectableMemberIds.value.every((id) => selectedMemberIds.value.includes(id))
));

function syncSelectedMemberIds() {
  const validIds = new Set(
    (Array.isArray(spaceMembers.value) ? spaceMembers.value : [])
      .map((member) => getMemberId(member))
      .filter((id) => id !== null)
  );
  selectedMemberIds.value = selectedMemberIds.value.filter((id) => validIds.has(id));
}

function applyMembersList(list) {
  const normalizedList = Array.isArray(list) ? list : [];
  spaceMembers.value = normalizedList.filter((member) => {
    const identity = member?.identity ?? member?.role ?? '';
    return identity === '老师' || identity === 'owner' || identity === 'admin' || identity === 'editor' || identity === 'viewer';
  });
  syncSelectedMemberIds();
}

function extractMembersList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.members)) return payload.members;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.members)) return payload.data.members;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
}

function resetAddForm() {
  addForm.value = {
    memberAccountId: '',
    role: 'editor'
  };
}

function resetTransferForm() {
  transferForm.value = {
    memberId: null,
    memberName: '',
    previousOwnerRole: 'admin'
  };
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

async function fetchMembers(spaceId) {
  const accountId = getAccountId();
  if (!spaceId || !accountId) {
    spaceMembers.value = [];
    return;
  }
  membersLoading.value = true;
  try {
    const response = await axios.get(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/members`, {
      params: {
        accountId,
        ...(keyword.value.trim() ? { keyword: keyword.value.trim() } : {})
      }
    });
    applyMembersList(extractMembersList(response?.data));
  } catch (e) {
    spaceMembers.value = [];
  } finally {
    membersLoading.value = false;
  }
}

function handleSelectAllMembers(event) {
  const checked = Boolean(event?.target?.checked);
  selectedMemberIds.value = checked ? [...selectableMemberIds.value] : [];
}

function openAddMemberDialog() {
  resetAddForm();
  addDialogVisible.value = true;
}

async function submitAddMember() {
  const spaceId = getSpaceId();
  const accountId = getAccountId();
  const memberAccountId = addForm.value.memberAccountId.trim();
  if (!spaceId || !accountId) {
    ElMessage.error('缺少必要参数，无法添加成员');
    return;
  }
  if (!memberAccountId) {
    ElMessage.warning('请输入成员账号');
    return;
  }
  if (memberAccountId === accountId) {
    ElMessage.warning('不能将自己重复添加为成员');
    return;
  }
  if (spaceMembers.value.some((member) => String(member?.accountId ?? '').trim() === memberAccountId)) {
    ElMessage.warning('该成员已在备课区中');
    return;
  }
  addSubmitting.value = true;
  try {
    const response = await axios.post(
      `${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/members`,
      {
        accountId,
        memberAccountId,
        role: addForm.value.role
      }
    );
    const data = response?.data ?? {};
    if (data?.success) {
      applyMembersList(extractMembersList(data));
      addDialogVisible.value = false;
      resetAddForm();
      ElMessage.success(data?.message || '添加成员成功');
      return;
    }
    ElMessage.error(data?.message || '添加成员失败');
  } catch (error) {
    console.error('添加成员失败:', error);
    ElMessage.error(error?.response?.data?.message || '服务器连接失败，请稍后重试');
  } finally {
    addSubmitting.value = false;
  }
}

function openTransferOwnerDialog(member) {
  if (!member) return;
  if (!canTransferOwner.value) {
    ElMessage.warning('仅当前组长可转让权限');
    return;
  }
  if (isOwnerMember(member)) {
    ElMessage.warning('当前成员已经是组长');
    return;
  }
  const memberId = getMemberId(member);
  if (!memberId) {
    ElMessage.error('成员ID无效，无法转让权限');
    return;
  }
  transferForm.value = {
    memberId,
    memberName: member?.name ?? member?.userName ?? member?.teacherName ?? member?.accountId ?? '',
    previousOwnerRole: 'admin'
  };
  transferDialogVisible.value = true;
}

async function submitTransferOwner() {
  const spaceId = getSpaceId();
  const accountId = getAccountId();
  if (!spaceId || !accountId || !transferForm.value.memberId) {
    ElMessage.error('缺少必要参数，无法转让权限');
    return;
  }
  transferSubmitting.value = true;
  try {
    const response = await axios.put(
      `${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/members/transfer-owner`,
      {
        accountId,
        targetMemberId: transferForm.value.memberId,
        previousOwnerRole: transferForm.value.previousOwnerRole
      }
    );
    const data = response?.data ?? {};
    if (data?.success) {
      applyMembersList(extractMembersList(data));
      if (data?.prepareSpace) {
        currentSpaceDetail.value = data.prepareSpace;
      } else {
        await fetchSpaceDetail(spaceId);
      }
      transferDialogVisible.value = false;
      resetTransferForm();
      ElMessage.success(data?.message || '权限转让成功');
      return;
    }
    ElMessage.error(data?.message || '权限转让失败');
  } catch (error) {
    console.error('权限转让失败:', error);
    ElMessage.error(error?.response?.data?.message || '服务器连接失败，请稍后重试');
  } finally {
    transferSubmitting.value = false;
  }
}

function handleToolbarTransferOwner() {
  if (!canTransferOwner.value) {
    ElMessage.warning('仅当前组长可转让权限');
    return;
  }
  if (!selectedMemberIds.value.length) {
    ElMessage.warning('请先勾选 1 位要转让权限的成员');
    return;
  }
  if (selectedMemberIds.value.length > 1) {
    ElMessage.warning('权限转让一次只能选择 1 位成员');
    return;
  }
  const targetMember = visibleMembers.value.find((member) => getMemberId(member) === selectedMemberIds.value[0])
    ?? spaceMembers.value.find((member) => getMemberId(member) === selectedMemberIds.value[0]);
  if (!targetMember) {
    ElMessage.error('未找到目标成员，请刷新后重试');
    return;
  }
  openTransferOwnerDialog(targetMember);
}

function handleToggleMemberSelection(member, event) {
  const memberId = getMemberId(member);
  if (!memberId || isOwnerMember(member)) return;
  const checked = Boolean(event?.target?.checked);
  if (checked) {
    if (!selectedMemberIds.value.includes(memberId)) {
      selectedMemberIds.value = [...selectedMemberIds.value, memberId];
    }
    return;
  }
  selectedMemberIds.value = selectedMemberIds.value.filter((id) => id !== memberId);
}

function handleChangeRole(member) {
  if (!member) return;
  if (isOwnerMember(member)) {
    ElMessage.warning('创建者角色不允许修改');
    return;
  }
  const memberId = getMemberId(member);
  if (!memberId) {
    ElMessage.error('成员ID无效，无法变更身份');
    return;
  }
  roleForm.value = {
    memberId,
    memberName: member?.name ?? member?.userName ?? member?.teacherName ?? member?.accountId ?? '',
    role: String(member?.role ?? '').trim().toLowerCase() || 'editor'
  };
  roleDialogVisible.value = true;
}

async function submitChangeRole() {
  const spaceId = getSpaceId();
  const accountId = getAccountId();
  if (!spaceId || !accountId || !roleForm.value.memberId) {
    ElMessage.error('缺少必要参数，无法变更身份');
    return;
  }
  roleSubmitting.value = true;
  try {
    const response = await axios.put(
      `${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/members/${roleForm.value.memberId}`,
      {
        accountId,
        role: roleForm.value.role
      }
    );
    const data = response?.data ?? {};
    if (data?.success) {
      applyMembersList(extractMembersList(data));
      roleDialogVisible.value = false;
      ElMessage.success(data?.message || '变更身份成功');
      return;
    }
    ElMessage.error(data?.message || '变更身份失败');
  } catch (error) {
    console.error('变更成员身份失败:', error);
    ElMessage.error(error?.response?.data?.message || '服务器连接失败，请稍后重试');
  } finally {
    roleSubmitting.value = false;
  }
}

async function handleRemoveMember(member) {
  const memberId = getMemberId(member);
  const accountId = getAccountId();
  const spaceId = getSpaceId();
  if (!memberId || !accountId || !spaceId) {
    ElMessage.error('缺少必要参数，无法删除成员');
    return;
  }
  if (isOwnerMember(member)) {
    ElMessage.warning('不能移除创建者');
    return;
  }
  try {
    await ElMessageBox.confirm('确定删除该成员吗？删除后将失去该备课区访问权限。', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    });
    const response = await axios.delete(
      `${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/members/${memberId}`,
      { params: { accountId } }
    );
    const data = response?.data ?? {};
    if (data?.success) {
      applyMembersList(extractMembersList(data));
      ElMessage.success(data?.message || '删除成员成功');
      return;
    }
    ElMessage.error(data?.message || '删除成员失败');
  } catch (error) {
    if (error === 'cancel' || error === 'close') return;
    console.error('删除成员失败:', error);
    ElMessage.error(error?.response?.data?.message || '服务器连接失败，请稍后重试');
  }
}

async function handleBatchRemoveMembers() {
  const spaceId = getSpaceId();
  const accountId = getAccountId();
  if (!spaceId || !accountId) {
    ElMessage.error('缺少必要参数，无法批量删除');
    return;
  }
  if (!selectedMemberIds.value.length) {
    ElMessage.warning('请先选择要删除的成员');
    return;
  }
  try {
    await ElMessageBox.confirm(`确定批量删除已选中的 ${selectedMemberIds.value.length} 位成员吗？`, '确认批量删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    });
    const response = await axios.post(
      `${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/members/batch-remove`,
      {
        accountId,
        memberIds: selectedMemberIds.value
      }
    );
    const data = response?.data ?? {};
    if (data?.success) {
      applyMembersList(extractMembersList(data));
      selectedMemberIds.value = [];
      ElMessage.success(data?.message || '批量删除成功');
      return;
    }
    ElMessage.error(data?.message || '批量删除失败');
  } catch (error) {
    if (error === 'cancel' || error === 'close') return;
    console.error('批量删除成员失败:', error);
    ElMessage.error(error?.response?.data?.message || '服务器连接失败，请稍后重试');
  }
}

onMounted(async () => {
  const spaceId = getSpaceId();
  if (spaceId) {
    await fetchSpaceDetail(spaceId);
    await fetchMembers(spaceId);
  }
});

watch(
  () => route.params?.spaceId,
  async (spaceId) => {
    const id = typeof spaceId === 'string' ? spaceId : '';
    if (!id) return;
    await fetchSpaceDetail(id);
    await fetchMembers(id);
  }
);

watch(keyword, async () => {
  const spaceId = getSpaceId();
  if (!spaceId) return;
  await fetchMembers(spaceId);
});
</script>

<template>
  <div class="lesson-prep-members-page">
    <AppTopbar
      :menus="topMenus"
      active-menu-key="prep"
      :display-name="displayName"
      :user-avatar-src="userAvatarSrc"
      :notifications="notifications"
      :notifications-loading="notificationsLoading"
      :unread-notification-count="unreadNotificationCount"
      :show-prep-entry="true"
      @menu-click="handleTopMenuClick"
      @notification-open="loadNotifications"
      @notification-click="handleNotificationClick"
      @mark-all-notifications-as-read="markAllNotificationsAsRead"
      @go-course="() => router.push('/course')"
      @go-prep="() => router.push('/lesson-prep')"
      @go-personal-setting="goToPersonalSetting"
      @logout="goToLogin"
    />

    <div class="members-container">
      <section class="prep-workspace">
        <div class="prep-workspace__header">
          <div class="prep-workspace__title-wrap">
            <h1>{{ spaceTitle }}</h1>
            <span class="prep-workspace__badge">{{ spaceTag }}</span>
          </div>
        </div>

        <div class="prep-workspace__subnav">
          <button type="button" class="prep-back-btn" @click="navigateBack">← 返回</button>
          <span class="prep-subnav-title">成员管理</span>
        </div>

        <div class="prep-workspace__toolbar">
          <div class="prep-workspace__tool-actions">
            <button type="button" class="is-primary" @click="openAddMemberDialog">添加成员协同备课</button>
            <button type="button" @click="handleBatchRemoveMembers">
              批量删除<span v-if="selectedMemberIds.length">（{{ selectedMemberIds.length }}）</span>
            </button>
            <button type="button" @click="handleToolbarTransferOwner">
              权限转让<span v-if="selectedMemberIds.length">（{{ selectedMemberIds.length }}）</span>
            </button>
          </div>
          <div class="prep-workspace__search">
            <span class="prep-workspace__search-icon">☰</span>
            <input v-model="keyword" type="text" placeholder="搜索成员" />
          </div>
        </div>

        <div class="members-table">
          <div class="members-table__head">
            <span class="col-check">
              <input type="checkbox" :checked="allMembersChecked" @change="handleSelectAllMembers" />
            </span>
            <span class="col-name">全部成员</span>
            <span class="col-account">账号</span>
            <span class="col-role">身份</span>
            <span class="col-time">加入时间</span>
            <span class="col-change">变更</span>
            <span class="col-op">操作</span>
          </div>

          <div v-if="spaceLoading || membersLoading" class="members-empty">加载中...</div>
          <div v-else-if="visibleMembers.length === 0" class="members-empty">暂无成员</div>
          <div v-else class="members-table__body">
            <div v-for="(m, idx) in visibleMembers" :key="m?.memberId ?? m?.id ?? m?.accountId ?? idx" class="members-row">
              <span class="col-check">
                <input
                  type="checkbox"
                  :checked="selectedMemberIds.includes(getMemberId(m))"
                  :disabled="isOwnerMember(m)"
                  @change="handleToggleMemberSelection(m, $event)"
                />
              </span>
              <span class="col-name">
                <span class="member-avatar"></span>
                <span class="member-name">{{ m?.name ?? m?.userName ?? m?.teacherName ?? '-' }}</span>
              </span>
              <span class="col-account">{{ m?.accountId ?? m?.account ?? m?.userId ?? '-' }}</span>
              <span class="col-role">{{ getRoleLabel(m) }}</span>
              <span class="col-time">{{ formatTime(m?.joinTime ?? m?.joinedAt ?? m?.createdAt ?? m?.created_at) || '-' }}</span>
              <span class="col-change">
                <button type="button" class="members-link" :disabled="isOwnerMember(m)" @click="handleChangeRole(m)">变更身份</button>
              </span>
              <span class="col-op">
                <button type="button" class="members-link danger" :disabled="isOwnerMember(m)" @click="handleRemoveMember(m)">删除</button>
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>

    <el-dialog v-model="addDialogVisible" title="添加成员协同备课" width="440px" destroy-on-close>
      <div class="member-role-dialog">
        <div class="member-role-dialog__row member-role-dialog__row--column">
          <span class="member-role-dialog__label">成员账号</span>
          <input
            v-model="addForm.memberAccountId"
            class="dialog-text-input"
            type="text"
            placeholder="请输入要添加的教师账号"
          />
        </div>
        <div class="member-role-dialog__row member-role-dialog__row--column">
          <span class="member-role-dialog__label">成员角色</span>
          <el-select v-model="addForm.role" placeholder="请选择身份">
            <el-option v-for="item in roleOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </div>
      </div>
      <template #footer>
        <div class="member-role-dialog__footer">
          <button type="button" class="dialog-action" @click="addDialogVisible = false">取消</button>
          <button type="button" class="dialog-action dialog-action--primary" :disabled="addSubmitting" @click="submitAddMember">
            {{ addSubmitting ? '提交中...' : '确定' }}
          </button>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="transferDialogVisible" title="权限转让" width="440px" destroy-on-close>
      <div class="member-role-dialog">
        <div class="member-role-dialog__row">
          <span class="member-role-dialog__label">目标成员</span>
          <span class="member-role-dialog__value">{{ transferForm.memberName || '-' }}</span>
        </div>
        <div class="member-role-dialog__row member-role-dialog__row--column">
          <span class="member-role-dialog__label">原组长转让后角色</span>
          <el-select v-model="transferForm.previousOwnerRole" placeholder="请选择角色">
            <el-option v-for="item in roleOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </div>
      </div>
      <template #footer>
        <div class="member-role-dialog__footer">
          <button type="button" class="dialog-action" @click="transferDialogVisible = false">取消</button>
          <button type="button" class="dialog-action dialog-action--primary" :disabled="transferSubmitting" @click="submitTransferOwner">
            {{ transferSubmitting ? '提交中...' : '确定' }}
          </button>
        </div>
      </template>
    </el-dialog>

    <el-dialog v-model="roleDialogVisible" title="变更身份" width="420px" destroy-on-close>
      <div class="member-role-dialog">
        <div class="member-role-dialog__row">
          <span class="member-role-dialog__label">成员</span>
          <span class="member-role-dialog__value">{{ roleForm.memberName || '-' }}</span>
        </div>
        <div class="member-role-dialog__row member-role-dialog__row--column">
          <span class="member-role-dialog__label">新身份</span>
          <el-select v-model="roleForm.role" placeholder="请选择身份">
            <el-option v-for="item in roleOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </div>
      </div>
      <template #footer>
        <div class="member-role-dialog__footer">
          <button type="button" class="dialog-action" @click="roleDialogVisible = false">取消</button>
          <button type="button" class="dialog-action dialog-action--primary" :disabled="roleSubmitting" @click="submitChangeRole">
            {{ roleSubmitting ? '提交中...' : '确定' }}
          </button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.lesson-prep-members-page {
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
  font-size: 12px;
  color: #409eff;
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

.members-container {
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

.prep-workspace__tool-actions button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
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

.prep-workspace__toolbar {
  justify-content: space-between;
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
  width: 160px;
  height: 30px;
  padding: 0 12px;
  border: 1px solid #dce3ee;
  border-radius: 999px;
  outline: none;
  color: #4c576b;
  font-size: 13px;
}

.members-table {
  margin-top: 14px;
  border-top: 1px solid #eceff5;
  overflow: hidden;
}

.members-table__head,
.members-row {
  display: grid;
  grid-template-columns: 40px 1.3fr 1.1fr 1fr 1.2fr 0.8fr 0.8fr;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
}

.members-table__head {
  background: #f6f8fc;
  color: #5b667a;
  font-size: 12px;
}

.members-row {
  border-top: 1px solid #eef1f6;
  font-size: 13px;
  color: #223146;
}

.members-empty {
  padding: 22px;
  text-align: center;
  color: #6b7a90;
}

.member-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #eef3ff;
  display: inline-block;
  margin-right: 8px;
  vertical-align: middle;
}

.member-name {
  vertical-align: middle;
}

.members-link {
  border: none;
  background: transparent;
  color: #2b6df3;
  padding: 0;
}

.members-link:disabled {
  color: #94a0b8;
  cursor: not-allowed;
}

.members-link.danger {
  color: #e24a4a;
}

.members-link.danger:disabled {
  color: #c9d1de;
}

.col-op {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.member-role-dialog {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.member-role-dialog :deep(.el-select) {
  width: 100%;
}

.member-role-dialog__row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.member-role-dialog__row--column {
  align-items: stretch;
  flex-direction: column;
  gap: 8px;
}

.member-role-dialog__label {
  width: 64px;
  color: #66758d;
  font-size: 13px;
}

.member-role-dialog__value {
  color: #223146;
  font-size: 14px;
  font-weight: 600;
}

.dialog-text-input {
  width: 100%;
  height: 38px;
  padding: 0 12px;
  border: 1px solid #dce3ee;
  border-radius: 8px;
  outline: none;
  color: #223146;
  font-size: 14px;
  box-sizing: border-box;
}

.member-role-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.dialog-action {
  min-width: 88px;
  height: 34px;
  padding: 0 16px;
  border: 1px solid #d9dfeb;
  border-radius: 6px;
  background: #fff;
  color: #46526a;
}

.dialog-action--primary {
  border-color: #2f6bff;
  background: #2f6bff;
  color: #fff;
}

.dialog-action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
