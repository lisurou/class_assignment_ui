<script setup>
import { computed, ref, watch } from 'vue';
import axios from 'axios';
import { ElButton, ElDialog, ElMessage } from 'element-plus';
import { useUserStore } from '@/stores/userStore';

const props = defineProps({
  courseId: {
    type: String,
    default: ''
  },
  isTeacherView: {
    type: Boolean,
    default: false
  }
});

const API_BASE = 'http://localhost:8080';
const userStore = useUserStore();
const materialsTab = ref('attachment');
const materialsFilePickerRef = ref(null);
const createFolderDialogVisible = ref(false);
const moveFolderDialogVisible = ref(false);
const addLinkDialogVisible = ref(false);
const newFolderName = ref('');
const newLinkTitle = ref('');
const newLinkUrl = ref('');
const movingFolderId = ref('');
const moveTargetParentId = ref('root');
const folderPath = ref(['root']);
const currentFolderId = ref('root');
const materialsCategory = ref('学习资料');
const materialsLoading = ref(false);
const materialsData = ref({
  folders: [],
  attachments: [],
  links: []
});

const materialCategories = {
  study: '学习资料',
  mooc: '慕课资料',
  record: '录屏录像',
  live: '直播录像'
};

function normalizeParentId(rawParentId) {
  const normalized = rawParentId === null || rawParentId === undefined ? '' : String(rawParentId).trim();
  return normalized === '' || normalized === '0' || normalized === '-1' || normalized.toLowerCase() === 'root'
    || normalized.toLowerCase() === 'null' || normalized.toLowerCase() === 'undefined'
    ? 'root'
    : normalized;
}

function parseListResponse(payload, ...candidateKeys) {
  if (Array.isArray(payload)) return payload;

  const sources = [
    payload,
    payload?.data,
    payload?.result,
    payload?.data?.data,
    payload?.data?.result
  ].filter(Boolean);

  for (const source of sources) {
    if (Array.isArray(source)) return source;
  }

  for (const source of sources) {
    for (const key of candidateKeys) {
      if (Array.isArray(source?.[key])) return source[key];
    }
    if (Array.isArray(source?.list)) return source.list;
    if (Array.isArray(source?.records)) return source.records;
    if (Array.isArray(source?.rows)) return source.rows;
    if (Array.isArray(source?.items)) return source.items;
    if (Array.isArray(source?.content)) return source.content;
  }

  for (const key of candidateKeys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.records)) return payload.records;
  return [];
}

function normalizeFolder(item) {
  return {
    id: String(item?.id ?? item?.folderId ?? item?.materialFolderId ?? ''),
    name: item?.name ?? item?.folderName ?? '未命名文件夹',
    parentId: normalizeParentId(item?.parentId ?? item?.parentFolderId ?? item?.folderParentId),
    updatedAt: item?.updatedAt ?? item?.updateTime ?? item?.gmtModified ?? item?.createTime ?? Date.now(),
    raw: item
  };
}

function normalizeAttachment(item) {
  return {
    id: String(item?.id ?? item?.attachmentId ?? item?.materialId ?? ''),
    name: item?.name
      ?? item?.fileName
      ?? item?.attachmentName
      ?? item?.originalName
      ?? item?.original_name
      ?? item?.storedName
      ?? item?.stored_name
      ?? '未命名资料',
    parentId: normalizeParentId(item?.folderId ?? item?.parentId ?? item?.materialFolderId),
    updatedAt: item?.updatedAt ?? item?.updateTime ?? item?.gmtModified ?? item?.createTime ?? Date.now(),
    downloadCount: Number(item?.downloadCount ?? item?.downloads ?? item?.downloadNum ?? 0),
    raw: item
  };
}

function normalizeLink(item) {
  return {
    id: String(item?.id ?? item?.linkId ?? item?.materialLinkId ?? ''),
    title: item?.title ?? item?.name ?? item?.linkTitle ?? '未命名外链',
    url: item?.url ?? item?.linkUrl ?? item?.href ?? '',
    parentId: normalizeParentId(item?.folderId ?? item?.parentId ?? item?.materialFolderId),
    updatedAt: item?.updatedAt ?? item?.updateTime ?? item?.gmtModified ?? item?.createTime ?? Date.now(),
    raw: item
  };
}

function getMaterialsRequestParams() {
  return {
    accountId: userStore.account?.accountId,
    category: materialsCategory.value
  };
}

async function fetchMaterialFolders() {
  if (!props.courseId) return [];
  const response = await axios.get(`${API_BASE}/courses/${props.courseId}/materials/folders`, {
    params: getMaterialsRequestParams()
  });
  const list = parseListResponse(response.data, 'folders', 'data', 'list');
  return list.map(normalizeFolder).filter((item) => item.id);
}

async function fetchMaterialAttachments() {
  if (!props.courseId) return [];
  const response = await axios.get(`${API_BASE}/courses/${props.courseId}/materials/attachments`, {
    params: getMaterialsRequestParams()
  });
  const list = parseListResponse(response.data, 'attachments', 'data', 'list');
  return list.map(normalizeAttachment).filter((item) => item.id);
}

async function fetchMaterialLinks() {
  if (!props.courseId) return [];
  const response = await axios.get(`${API_BASE}/courses/${props.courseId}/materials/links`, {
    params: getMaterialsRequestParams()
  });
  const list = parseListResponse(response.data, 'links', 'data', 'list');
  return list.map(normalizeLink).filter((item) => item.id);
}

async function refreshMaterials() {
  if (!props.courseId || !userStore.account?.accountId) return;
  materialsLoading.value = true;
  try {
    const [folders, attachments, links] = await Promise.all([
      fetchMaterialFolders(),
      fetchMaterialAttachments(),
      fetchMaterialLinks()
    ]);
    materialsData.value = { folders, attachments, links };
  } catch (error) {
    console.log('资料加载失败：', error);
    ElMessage.error('资料加载失败，请稍后重试');
  } finally {
    materialsLoading.value = false;
  }
}

watch(
  [() => props.courseId, materialsCategory],
  ([courseId]) => {
    if (!courseId) return;
    materialsTab.value = 'attachment';
    folderPath.value = ['root'];
    currentFolderId.value = 'root';
    refreshMaterials();
  },
  { immediate: true }
);

const currentMaterials = computed(() => materialsData.value);

const currentFolderItems = computed(() => {
  const folders = (currentMaterials.value?.folders || []).map((it) => ({ ...it, type: 'folder' }));
  const attachments = (currentMaterials.value?.attachments || []).map((it) => ({ ...it, type: 'file' }));
  const links = (currentMaterials.value?.links || []).map((it) => ({ ...it, type: 'link', name: it.title }));
  return [...folders, ...attachments, ...links].filter((it) => it.parentId === currentFolderId.value);
});

const currentFolderFolders = computed(() => currentFolderItems.value.filter((it) => it.type === 'folder'));
const currentFolderFiles = computed(() => currentFolderItems.value.filter((it) => it.type === 'file'));
const currentFolderLinks = computed(() => currentFolderItems.value.filter((it) => it.type === 'link'));
const materialsActivityCount = computed(() => (currentMaterials.value?.folders || []).length + (currentMaterials.value?.attachments || []).length + (currentMaterials.value?.links || []).length);
const materialsSubTabs = [
  { key: 'study', label: '学习资料' },
  { key: 'mooc', label: '慕课资料' },
  { key: 'record', label: '录屏录像' },
  { key: 'live', label: '直播录像' }
];

const allFolders = computed(() => currentMaterials.value?.folders || []);

function changeMaterialsCategory(tabKey) {
  materialsCategory.value = materialCategories[tabKey];
}

function getFileExt(name) {
  const parts = String(name || '').split('.');
  if (parts.length < 2) return '';
  return parts[parts.length - 1].toUpperCase();
}

function getFileTypeLabel(name) {
  const ext = getFileExt(name);
  if (!ext) return '资料';
  if (['PPT', 'PPTX'].includes(ext)) return '资料';
  if (['JPG', 'JPEG', 'PNG', 'GIF', 'WEBP'].includes(ext)) return '图片';
  if (['PDF'].includes(ext)) return '文档';
  return '资料';
}

function getMaterialsPanelTitle() {
  const currentFolderName = getFolderName(currentFolderId.value);
  return currentFolderId.value === 'root' ? `全部${materialsCategory.value}` : `${materialsCategory.value} / ${currentFolderName}`;
}

function openFolder(folderItem) {
  if (!folderItem || folderItem.type !== 'folder') return;
  currentFolderId.value = folderItem.id;
  folderPath.value = [...folderPath.value, folderItem.id];
}

function goToFolderPathIndex(index) {
  const nextPath = folderPath.value.slice(0, index + 1);
  folderPath.value = nextPath;
  currentFolderId.value = nextPath[nextPath.length - 1] || 'root';
}

function getFolderName(folderId) {
  if (folderId === 'root') return '所有文件';
  const folder = (currentMaterials.value?.folders || []).find((it) => it.id === folderId);
  return folder?.name || '未命名文件夹';
}

function triggerPickFiles() {
  const el = materialsFilePickerRef.value;
  if (!el) return;
  el.value = '';
  el.click();
}

async function addPickedFiles(e) {
  const files = Array.from(e?.target?.files || []);
  if (!files.length) return;
  if (!props.courseId) return;
  try {
    for (const file of files) {
      const formData = new FormData();
      formData.append('accountId', userStore.account?.accountId || '');
      formData.append('category', materialsCategory.value);
      if (currentFolderId.value !== 'root') {
        formData.append('folderId', currentFolderId.value);
      }
      formData.append('file', file);
      await axios.post(`${API_BASE}/courses/${props.courseId}/materials/attachments`, formData);
    }
    await refreshMaterials();
    ElMessage.success('已添加资源');
  } catch (error) {
    console.log('上传资料失败：', error);
    ElMessage.error('上传资料失败，请稍后重试');
  } finally {
    if (e?.target) e.target.value = '';
  }
}

async function confirmCreateFolder() {
  const name = newFolderName.value.trim();
  if (!name) {
    ElMessage.error('请输入文件夹名称');
    return;
  }
  if (!props.courseId) return;
  try {
    await axios.post(`${API_BASE}/courses/${props.courseId}/materials/folders`, {
      accountId: userStore.account?.accountId,
      category: materialsCategory.value,
      name,
      folderName: name,
      parentId: currentFolderId.value === 'root' ? null : currentFolderId.value,
      parentFolderId: currentFolderId.value === 'root' ? null : currentFolderId.value
    });
    newFolderName.value = '';
    createFolderDialogVisible.value = false;
    await refreshMaterials();
    ElMessage.success('已新建文件夹');
  } catch (error) {
    console.log('新建文件夹失败：', error);
    ElMessage.error('新建文件夹失败，请稍后重试');
  }
}

function getDescendantFolderIds(folderId) {
  const items = currentMaterials.value?.folders || [];
  const childrenByParent = new Map();
  for (const it of items) {
    const list = childrenByParent.get(it.parentId) || [];
    list.push(it.id);
    childrenByParent.set(it.parentId, list);
  }
  const result = new Set();
  const stack = [folderId];
  while (stack.length) {
    const cur = stack.pop();
    if (!cur) continue;
    const children = childrenByParent.get(cur) || [];
    for (const child of children) {
      if (result.has(child)) continue;
      result.add(child);
      stack.push(child);
    }
  }
  return result;
}

const moveTargets = computed(() => {
  if (!movingFolderId.value) return [{ id: 'root', name: '所有文件' }];
  const forbidden = getDescendantFolderIds(movingFolderId.value);
  forbidden.add(movingFolderId.value);
  const folders = allFolders.value
    .filter((f) => !forbidden.has(f.id))
    .map((f) => ({ id: f.id, name: f.name }));
  return [{ id: 'root', name: '所有文件' }, ...folders];
});

function openMoveFolderDialog(folderItem) {
  movingFolderId.value = folderItem?.id || '';
  moveTargetParentId.value = 'root';
  moveFolderDialogVisible.value = true;
}

async function confirmMoveFolder() {
  if (!props.courseId || !movingFolderId.value) return;
  try {
    const targetId = moveTargetParentId.value === 'root' ? null : moveTargetParentId.value;
    await axios.put(`${API_BASE}/courses/${props.courseId}/materials/folders/${movingFolderId.value}/move`, {
      accountId: userStore.account?.accountId,
      category: materialsCategory.value,
      targetParentId: targetId,
      targetFolderId: targetId,
      parentId: targetId,
      parentFolderId: targetId,
      newParentId: targetId
    });
    moveFolderDialogVisible.value = false;
    await refreshMaterials();
    ElMessage.success('已移动文件夹');
  } catch (error) {
    console.log('移动文件夹失败：', error);
    ElMessage.error('移动文件夹失败，请稍后重试');
  }
}

async function deleteAttachment(item) {
  if (!item || !props.courseId) return;
  if (!window.confirm(`确认删除“${item.name}”吗？`)) return;
  try {
    if (item.type === 'folder') {
      await axios.delete(`${API_BASE}/courses/${props.courseId}/materials/folders/${item.id}`, {
        params: { accountId: userStore.account?.accountId }
      });
      if (currentFolderId.value === item.id || getDescendantFolderIds(item.id).has(currentFolderId.value)) {
        folderPath.value = ['root'];
        currentFolderId.value = 'root';
      }
    } else {
      await axios.delete(`${API_BASE}/courses/${props.courseId}/materials/attachments/${item.id}`, {
        params: { accountId: userStore.account?.accountId }
      });
    }
    await refreshMaterials();
    ElMessage.success('已删除');
  } catch (error) {
    console.log('删除资料失败：', error);
    ElMessage.error('删除资料失败，请稍后重试');
  }
}

function extractFileNameFromHeaders(headers, fallbackName) {
  const disposition = headers?.['content-disposition'] || headers?.['Content-Disposition'];
  if (!disposition) return fallbackName;
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
  const normalMatch = disposition.match(/filename="?([^"]+)"?/i);
  return normalMatch?.[1] || fallbackName;
}

async function downloadAttachment(fileItem) {
  if (!fileItem || fileItem.type !== 'file' || !props.courseId) return;
  try {
    const response = await axios.get(`${API_BASE}/courses/${props.courseId}/materials/attachments/${fileItem.id}/download`, {
      params: { accountId: userStore.account?.accountId },
      responseType: 'blob'
    });
    const blob = new Blob([response.data]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = extractFileNameFromHeaders(response.headers, fileItem.name || 'material');
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    fileItem.downloadCount = (fileItem.downloadCount || 0) + 1;
  } catch (error) {
    console.log('下载资料失败：', error);
    ElMessage.error('下载资料失败，请稍后重试');
  }
}

function openLinkMaterial(linkItem) {
  if (!linkItem?.url) return;
  window.open(linkItem.url, '_blank', 'noopener,noreferrer');
}

async function confirmAddLink() {
  const title = newLinkTitle.value.trim();
  const url = newLinkUrl.value.trim();
  if (!title || !url) {
    ElMessage.error('请输入外链名称和链接');
    return;
  }
  const ok = /^https?:\/\//i.test(url);
  if (!ok) {
    ElMessage.error('链接需以 http:// 或 https:// 开头');
    return;
  }
  if (!props.courseId) return;
  try {
    await axios.post(`${API_BASE}/courses/${props.courseId}/materials/links`, {
      accountId: userStore.account?.accountId,
      category: materialsCategory.value,
      title,
      name: title,
      url,
      linkUrl: url,
      folderId: currentFolderId.value === 'root' ? null : currentFolderId.value
    });
    newLinkTitle.value = '';
    newLinkUrl.value = '';
    addLinkDialogVisible.value = false;
    await refreshMaterials();
    ElMessage.success('已添加外链');
  } catch (error) {
    console.log('添加外链失败：', error);
    ElMessage.error('添加外链失败，请稍后重试');
  }
}

async function deleteLink(linkItem) {
  if (!linkItem || !props.courseId) return;
  if (!window.confirm(`确认删除外链“${linkItem.title}”吗？`)) return;
  try {
    await axios.delete(`${API_BASE}/courses/${props.courseId}/materials/links/${linkItem.id}`, {
      params: { accountId: userStore.account?.accountId }
    });
    await refreshMaterials();
    ElMessage.success('已删除');
  } catch (error) {
    console.log('删除外链失败：', error);
    ElMessage.error('删除外链失败，请稍后重试');
  }
}
</script>

<template>
  <div class="materials-panel">
    <div class="materials-meta">共{{ materialsActivityCount }}个活动</div>

    <div class="materials-resource-tabs">
      <button
        v-for="tab in materialsSubTabs"
        :key="tab.key"
        class="materials-resource-tab"
        :class="{ active: materialsCategory === tab.label }"
        @click="changeMaterialsCategory(tab.key)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="materials-topbar">
      <div></div>
      <div class="materials-toolbar-actions">
        <template v-if="isTeacherView">
          <button class="materials-action-outline" @click="createFolderDialogVisible = true">＋ 新建文件夹</button>
          <button class="materials-action-solid" @click="triggerPickFiles">＋ 添加资料</button>
          <button class="materials-kebab-btn" @click="addLinkDialogVisible = true">⋮</button>
          <input ref="materialsFilePickerRef" class="materials-file-input" type="file" multiple @change="addPickedFiles" />
        </template>
      </div>
    </div>

    <div class="materials-list-head">
      <div class="materials-list-title">
        <span
          v-for="(fid, idx) in folderPath"
          :key="fid"
          class="materials-breadcrumb-item"
          @click="goToFolderPathIndex(idx)"
        >
          <template v-if="idx === 0">{{ getMaterialsPanelTitle() }}</template>
          <template v-else>{{ getFolderName(fid) }}</template>
          <span v-if="idx < folderPath.length - 1"> / </span>
        </span>
      </div>
    </div>

    <div class="materials-surface">
      <div class="materials-card">
        <div class="materials-empty" v-if="materialsLoading">资料加载中...</div>
        <template v-else-if="isTeacherView">
          <div class="materials-teacher-list" v-if="currentFolderItems.length">
            <div
              v-for="it in currentFolderItems"
              :key="it.id"
              class="materials-teacher-row"
              @click="it.type === 'folder' ? openFolder(it) : (it.type === 'link' ? openLinkMaterial(it) : null)"
            >
              <div class="materials-teacher-left">
                <div v-if="it.type === 'folder'" class="materials-folder-glyph"></div>
                <div v-else-if="it.type === 'link'" class="materials-link-glyph">链</div>
                <div v-else class="materials-file-thumb">
                  <div class="materials-file-badge">{{ getFileExt(it.name) || 'FILE' }}</div>
                  <div class="materials-file-kind">{{ getFileTypeLabel(it.name) }}</div>
                </div>
                <div class="materials-teacher-info">
                  <div class="materials-teacher-name">{{ it.name }}</div>
                  <div v-if="it.type === 'link'" class="materials-teacher-sub">{{ it.url }}</div>
                </div>
              </div>

              <div class="materials-teacher-actions">
                <button
                  v-if="it.type === 'file'"
                  class="materials-text-btn"
                  @click.stop="downloadAttachment(it)"
                >
                  下载
                </button>
                <button
                  v-else-if="it.type === 'folder'"
                  class="materials-text-btn"
                  @click.stop="openMoveFolderDialog(it)"
                >
                  移动
                </button>
                <button
                  v-else
                  class="materials-text-btn"
                  @click.stop="openLinkMaterial(it)"
                >
                  打开
                </button>
                <button
                  class="materials-text-btn danger"
                  @click.stop="it.type === 'link' ? deleteLink(it) : deleteAttachment(it)"
                >
                  删除
                </button>
              </div>
            </div>
          </div>

          <div v-else class="materials-empty">暂无资料</div>
        </template>

        <template v-else>
          <div class="materials-student-list" v-if="currentFolderFolders.length || currentFolderFiles.length || currentFolderLinks.length">
            <div
              v-for="it in [...currentFolderFolders, ...currentFolderFiles, ...currentFolderLinks]"
              :key="it.id"
              class="materials-student-row"
            >
              <div class="materials-student-left">
                <div v-if="it.type === 'folder'" class="materials-folder-glyph small"></div>
                <div v-else-if="it.type === 'link'" class="materials-link-glyph small">链</div>
                <div v-else class="materials-file-thumb small">
                  <div class="materials-file-badge">{{ getFileExt(it.name) || 'FILE' }}</div>
                  <div class="materials-file-kind">{{ getFileTypeLabel(it.name) }}</div>
                </div>
                <div class="materials-student-info">
                  <div class="materials-student-name">{{ it.name }}</div>
                </div>
              </div>
              <button
                class="materials-study-btn"
                @click="it.type === 'folder' ? openFolder(it) : (it.type === 'link' ? openLinkMaterial(it) : downloadAttachment(it))"
              >
                {{ it.type === 'folder' ? '进入文件夹' : (it.type === 'link' ? '访问链接' : '下载') }}
              </button>
            </div>
          </div>
          <div v-else class="materials-empty">暂无资料</div>
        </template>
      </div>
    </div>
  </div>

  <el-dialog v-model="createFolderDialogVisible" draggable :close-on-click-modal="false" :show-close="false">
    <template #header>
      <div class="materials-dialog-header">
        <span class="materials-dialog-title">新建文件夹</span>
        <span class="materials-dialog-close" @click="createFolderDialogVisible = false">×</span>
      </div>
    </template>
    <div class="materials-dialog-body">
      <div class="materials-input-row">
        <div><span>*</span><label>文件夹名称</label></div>
        <input v-model="newFolderName" placeholder="请输入文件夹名称" />
      </div>
    </div>
    <template #footer>
      <span class="materials-dialog-footer">
        <div class="materials-dialog-actions">
          <el-button class="materials-cancel-button" @click="createFolderDialogVisible = false">取消</el-button>
          <el-button class="materials-confirm-button" type="primary" @click="confirmCreateFolder">确认</el-button>
        </div>
      </span>
    </template>
  </el-dialog>

  <el-dialog v-model="moveFolderDialogVisible" draggable :close-on-click-modal="false" :show-close="false">
    <template #header>
      <div class="materials-dialog-header">
        <span class="materials-dialog-title">移动文件夹</span>
        <span class="materials-dialog-close" @click="moveFolderDialogVisible = false">×</span>
      </div>
    </template>
    <div class="materials-dialog-body">
      <div class="materials-input-row">
        <div><span>*</span><label>目标位置</label></div>
        <select v-model="moveTargetParentId" class="materials-select">
          <option v-for="opt in moveTargets" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
        </select>
      </div>
    </div>
    <template #footer>
      <span class="materials-dialog-footer">
        <div class="materials-dialog-actions">
          <el-button class="materials-cancel-button" @click="moveFolderDialogVisible = false">取消</el-button>
          <el-button class="materials-confirm-button" type="primary" @click="confirmMoveFolder">确认</el-button>
        </div>
      </span>
    </template>
  </el-dialog>

  <el-dialog v-model="addLinkDialogVisible" draggable :close-on-click-modal="false" :show-close="false">
    <template #header>
      <div class="materials-dialog-header">
        <span class="materials-dialog-title">添加外链</span>
        <span class="materials-dialog-close" @click="addLinkDialogVisible = false">×</span>
      </div>
    </template>
    <div class="materials-dialog-body">
      <div class="materials-input-row">
        <div><span>*</span><label>外链名称</label></div>
        <input v-model="newLinkTitle" placeholder="请输入外链名称" />
      </div>
      <div class="materials-input-row">
        <div><span>*</span><label>链接地址</label></div>
        <input v-model="newLinkUrl" placeholder="https://..." />
      </div>
    </div>
    <template #footer>
      <span class="materials-dialog-footer">
        <div class="materials-dialog-actions">
          <el-button class="materials-cancel-button" @click="addLinkDialogVisible = false">取消</el-button>
          <el-button class="materials-confirm-button" type="primary" @click="confirmAddLink">确认</el-button>
        </div>
      </span>
    </template>
  </el-dialog>
</template>

<style scoped>
.materials-panel {
  margin-top: 16px;
}

.materials-meta {
  margin-bottom: 18px;
  font-size: 14px;
  color: #202124;
}

.materials-resource-tabs {
  display: flex;
  gap: 36px;
  margin-bottom: 16px;
  border-bottom: 1px solid #e6e8eb;
}

.materials-resource-tab {
  height: 42px;
  padding: 0;
  font-size: 15px;
  color: #202124;
  cursor: pointer;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
}

.materials-resource-tab.active {
  color: #4285f4;
  border-bottom-color: #4285f4;
}

.materials-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}

.materials-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: nowrap;
}

.materials-action-outline,
.materials-action-solid,
.materials-kebab-btn,
.materials-text-btn,
.materials-study-btn {
  cursor: pointer;
}

.materials-action-outline,
.materials-action-solid,
.materials-kebab-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  border-radius: 18px;
  font-size: 14px;
  white-space: nowrap;
  flex-shrink: 0;
}

.materials-action-outline {
  min-width: 136px;
  padding: 0 18px;
  color: #4285f4;
  background: #fff;
  border: 1px solid #a8c7fa;
  box-shadow: inset 0 0 0 1px rgba(168, 199, 250, 0.35);
}

.materials-action-solid {
  min-width: 132px;
  padding: 0 18px;
  color: #fff;
  background: #19c37d;
  border: 1px solid #19c37d;
  box-shadow: 0 2px 8px rgba(25, 195, 125, 0.18);
}

.materials-kebab-btn {
  width: 36px;
  padding: 0;
  font-size: 20px;
  color: #5f6368;
  background: transparent;
  border: none;
}

.materials-file-input {
  display: none;
}

.materials-list-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.materials-list-title {
  font-size: 14px;
  color: #202124;
}

.materials-breadcrumb-item {
  cursor: pointer;
}

.materials-breadcrumb-item:hover {
  color: #4285f4;
}

.materials-surface {
  width: 100%;
}

.materials-card {
  padding: 0 24px;
  background: #fff;
  border: 1px solid #e6e8eb;
  border-radius: 8px;
}

.materials-teacher-list,
.materials-student-list {
  display: flex;
  flex-direction: column;
}

.materials-teacher-row,
.materials-student-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 78px;
  border-bottom: 1px solid #eef0f2;
}

.materials-teacher-row:last-child,
.materials-student-row:last-child {
  border-bottom: none;
}

.materials-teacher-row {
  padding: 12px 0;
  cursor: pointer;
}

.materials-student-row {
  padding: 0;
}

.materials-teacher-left,
.materials-student-left {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.materials-folder-glyph {
  position: relative;
  width: 42px;
  height: 30px;
  background: #f2c94c;
  border-radius: 4px;
  flex: 0 0 auto;
}

.materials-folder-glyph::before {
  content: '';
  position: absolute;
  top: -4px;
  left: 4px;
  width: 18px;
  height: 8px;
  background: #f2c94c;
  border-top-left-radius: 4px;
  border-top-right-radius: 4px;
}

.materials-folder-glyph.small {
  width: 34px;
  height: 24px;
}

.materials-link-glyph {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  font-size: 16px;
  font-weight: 600;
  color: #4285f4;
  background: #eaf2ff;
  border-radius: 10px;
  flex: 0 0 auto;
}

.materials-link-glyph.small {
  width: 34px;
  height: 34px;
  font-size: 14px;
}

.materials-file-thumb {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 54px;
  height: 64px;
  background: #fff;
  border: 1px solid #eef0f2;
  border-radius: 4px;
  flex: 0 0 auto;
}

.materials-file-thumb.small {
  width: 40px;
  height: 52px;
}

.materials-file-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 18px;
  font-size: 10px;
  font-weight: 700;
  color: #e67e22;
  background: #fff3e6;
  border: 1px solid #ffd8b5;
  border-radius: 3px;
}

.materials-file-kind {
  margin-top: 8px;
  font-size: 12px;
  color: #202124;
}

.materials-teacher-info,
.materials-student-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.materials-teacher-name,
.materials-student-name {
  font-size: 15px;
  color: #202124;
  word-break: break-all;
}

.materials-teacher-sub {
  max-width: 360px;
  overflow: hidden;
  font-size: 12px;
  color: #80868b;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.materials-teacher-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 18px;
  min-width: 160px;
  margin-left: 24px;
}

.materials-text-btn {
  padding: 0;
  font-size: 14px;
  color: #4285f4;
  background: transparent;
  border: none;
}

.materials-text-btn.danger {
  color: #d93025;
}

.materials-study-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 90px;
  height: 30px;
  font-size: 12px;
  color: #fff;
  background: #4d90fe;
  border: 1px solid #4d90fe;
  border-radius: 4px;
  flex-shrink: 0;
}

.materials-empty {
  padding: 26px 0;
  font-size: 13px;
  color: #80868b;
  text-align: center;
}

.materials-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.materials-dialog-title {
  font-size: 16px;
  font-weight: 600;
  color: #3c4043;
}

.materials-dialog-close {
  font-size: 28px;
  line-height: 1;
  color: #5f6368;
  cursor: pointer;
}

.materials-dialog-close:hover {
  color: #4285f4;
}

.materials-dialog-body {
  display: flex;
  flex-direction: column;
}

.materials-input-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 0;
}

.materials-input-row > div:first-child {
  display: flex;
  align-items: center;
  min-width: 92px;
  font-size: 14px;
  color: #202124;
}

.materials-input-row span {
  margin-right: 4px;
  color: #d93025;
}

.materials-input-row input,
.materials-select {
  flex: 1;
  height: 36px;
  padding: 0 12px;
  font-size: 14px;
  color: #202124;
  border: 1px solid #d0d7de;
  border-radius: 4px;
  outline: none;
}

.materials-input-row input:focus,
.materials-select:focus {
  border-color: #4285f4;
}

.materials-dialog-footer {
  display: block;
}

.materials-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.materials-cancel-button,
.materials-confirm-button {
  min-width: 72px;
  height: 36px;
  border-radius: 4px;
}

:deep(.el-dialog) {
  width: 784px;
  max-width: calc(100vw - 32px);
  border: 2px solid #4285f4;
  border-radius: 8px;
}

:deep(.el-dialog__header) {
  margin-right: 0;
  padding: 18px 24px;
  border-bottom: 1px solid rgb(218, 220, 224);
}

:deep(.el-dialog__body) {
  padding: 0 24px;
}

:deep(.el-dialog__footer) {
  padding: 10px 24px 18px;
  border-top: 1px solid rgb(218, 220, 224);
}
</style>
