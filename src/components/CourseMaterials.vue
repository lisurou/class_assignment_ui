<script setup>
import { computed, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';

const props = defineProps({
  courseId: {
    type: [String, Number],
    default: ''
  },
  iTeach: {
    type: Boolean,
    default: false
  }
});

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
const materialsByCourseId = ref({});

function createId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function createDefaultMaterials() {
  const now = Date.now();
  return {
    attachments: [
      {
        id: 'file_seed_1',
        type: 'file',
        name: 'web开发技术.pptx',
        parentId: 'root',
        updatedAt: now,
        downloadCount: 0
      }
    ],
    links: [
      {
        id: 'link_seed_1',
        title: 'ddd',
        url: 'https://zhidao.baidu.com/question/127583583.html',
        updatedAt: now
      }
    ]
  };
}

const currentCourseKey = computed(() => String(props.courseId || ''));

watch(
  currentCourseKey,
  (key) => {
    if (!key) return;
    if (!materialsByCourseId.value[key]) {
      materialsByCourseId.value[key] = createDefaultMaterials();
    }
    materialsTab.value = 'attachment';
    folderPath.value = ['root'];
    currentFolderId.value = 'root';
  },
  { immediate: true }
);

const currentMaterials = computed(() => {
  const key = currentCourseKey.value;
  return key ? materialsByCourseId.value[key] : null;
});

const currentFolderItems = computed(() => {
  const items = currentMaterials.value?.attachments || [];
  return items.filter((it) => it.parentId === currentFolderId.value);
});

const allFolders = computed(() => {
  const items = currentMaterials.value?.attachments || [];
  return items.filter((it) => it.type === 'folder');
});

function getFileExt(name) {
  const parts = String(name || '').split('.');
  if (parts.length < 2) return '';
  return parts[parts.length - 1].toUpperCase();
}

function formatEditTime(ts) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yy}/${mm}/${dd} ${hh}:${mi}`;
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
  const folder = (currentMaterials.value?.attachments || []).find((it) => it.id === folderId);
  return folder?.name || '未命名文件夹';
}

function triggerPickFiles() {
  const el = materialsFilePickerRef.value;
  if (!el) return;
  el.value = '';
  el.click();
}

function addPickedFiles(e) {
  const files = Array.from(e?.target?.files || []);
  if (!files.length) return;
  const key = currentCourseKey.value;
  if (!key) return;
  const materials = materialsByCourseId.value[key];
  const now = Date.now();
  for (const f of files) {
    materials.attachments.unshift({
      id: createId('file'),
      type: 'file',
      name: f.name,
      parentId: currentFolderId.value,
      updatedAt: now,
      downloadCount: 0
    });
  }
  ElMessage.success('已添加资源');
}

function confirmCreateFolder() {
  const name = newFolderName.value.trim();
  if (!name) {
    ElMessage.error('请输入文件夹名称');
    return;
  }
  const key = currentCourseKey.value;
  if (!key) return;
  materialsByCourseId.value[key].attachments.unshift({
    id: createId('folder'),
    type: 'folder',
    name,
    parentId: currentFolderId.value,
    updatedAt: Date.now()
  });
  newFolderName.value = '';
  createFolderDialogVisible.value = false;
  ElMessage.success('已新建文件夹');
}

function getDescendantFolderIds(folderId) {
  const items = currentMaterials.value?.attachments || [];
  const childrenByParent = new Map();
  for (const it of items) {
    if (it.type !== 'folder') continue;
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

function confirmMoveFolder() {
  const key = currentCourseKey.value;
  if (!key || !movingFolderId.value) return;
  const materials = materialsByCourseId.value[key];
  const folder = materials.attachments.find((it) => it.id === movingFolderId.value && it.type === 'folder');
  if (!folder) return;
  folder.parentId = moveTargetParentId.value;
  folder.updatedAt = Date.now();
  moveFolderDialogVisible.value = false;
  ElMessage.success('已移动文件夹');
}

function deleteAttachment(item) {
  if (!item) return;
  if (!window.confirm(`确认删除“${item.name}”吗？`)) return;
  const key = currentCourseKey.value;
  if (!key) return;
  const materials = materialsByCourseId.value[key];
  if (item.type === 'folder') {
    const descendants = getDescendantFolderIds(item.id);
    const folderScope = new Set([item.id, ...descendants]);
    materials.attachments = materials.attachments.filter((it) => !folderScope.has(it.id) && !folderScope.has(it.parentId));
    if (currentFolderId.value === item.id || descendants.has(currentFolderId.value)) {
      folderPath.value = ['root'];
      currentFolderId.value = 'root';
    }
  } else {
    materials.attachments = materials.attachments.filter((it) => it.id !== item.id);
  }
  ElMessage.success('已删除');
}

function downloadAttachment(fileItem) {
  if (!fileItem || fileItem.type !== 'file') return;
  const blob = new Blob([`课程资料：${fileItem.name}\n下载时间：${new Date().toLocaleString()}`], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileItem.name || 'material.txt';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  fileItem.downloadCount = (fileItem.downloadCount || 0) + 1;
}

function confirmAddLink() {
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
  const key = currentCourseKey.value;
  if (!key) return;
  materialsByCourseId.value[key].links.unshift({
    id: createId('link'),
    title,
    url,
    updatedAt: Date.now()
  });
  newLinkTitle.value = '';
  newLinkUrl.value = '';
  addLinkDialogVisible.value = false;
  ElMessage.success('已添加外链');
}

function deleteLink(linkItem) {
  if (!linkItem) return;
  if (!window.confirm(`确认删除外链“${linkItem.title}”吗？`)) return;
  const key = currentCourseKey.value;
  if (!key) return;
  materialsByCourseId.value[key].links = (materialsByCourseId.value[key].links || []).filter((l) => l.id !== linkItem.id);
  ElMessage.success('已删除');
}
</script>

<template>
  <div class="course-learning-body">
    <div class="materials-layout">
      <div class="materials-side">
        <button
          class="materials-side-item"
          :class="{ active: materialsTab === 'attachment' }"
          @click="materialsTab = 'attachment'"
        >
          附件资源
        </button>
        <button
          class="materials-side-item"
          :class="{ active: materialsTab === 'link' }"
          @click="materialsTab = 'link'"
        >
          外链资源
        </button>
      </div>
      <div class="materials-main">
        <div class="materials-main-header">
          <div class="materials-main-title">
            {{ materialsTab === 'attachment' ? '附件资源' : '外链资源' }}
          </div>
        </div>
        <div class="materials-divider"></div>

        <div v-if="materialsTab === 'attachment'">
          <div class="materials-section-title">
            <span
              v-for="(fid, idx) in folderPath"
              :key="fid"
              class="materials-breadcrumb-item"
              @click="goToFolderPathIndex(idx)"
            >
              {{ getFolderName(fid) }}<span v-if="idx < folderPath.length - 1"> / </span>
            </span>
          </div>

          <div class="materials-card">
            <div class="materials-actions" v-if="iTeach">
              <button class="materials-action-btn primary" @click="triggerPickFiles">＋ 添加资源</button>
              <button class="materials-action-btn" @click="createFolderDialogVisible = true">新建文件夹</button>
              <input ref="materialsFilePickerRef" class="materials-file-input" type="file" multiple @change="addPickedFiles" />
            </div>

            <div class="materials-grid" v-if="currentFolderItems.length">
              <div
                class="materials-item"
                v-for="it in currentFolderItems"
                :key="it.id"
                @click="it.type === 'folder' ? openFolder(it) : null"
              >
                <div class="materials-item-icon">
                  <div class="materials-file-icon" v-if="it.type === 'file'">{{ getFileExt(it.name) || 'FILE' }}</div>
                  <div class="materials-folder-icon" v-else>📁</div>
                </div>
                <div class="materials-item-name" :title="it.name">{{ it.name }}</div>
                <div class="materials-item-meta">
                  <span v-if="it.type === 'file'">{{ it.downloadCount || 0 }}次下载</span>
                  <span v-else>文件夹</span>
                </div>
                <div class="materials-item-ops">
                  <button v-if="it.type === 'file'" class="materials-op-btn" @click.stop="downloadAttachment(it)">
                    下载
                  </button>
                  <button v-if="iTeach && it.type === 'folder'" class="materials-op-btn" @click.stop="openMoveFolderDialog(it)">
                    移动
                  </button>
                  <button v-if="iTeach" class="materials-op-btn danger" @click.stop="deleteAttachment(it)">
                    删除
                  </button>
                </div>
              </div>
            </div>

            <div class="materials-empty" v-else>暂无资料</div>
          </div>
        </div>

        <div v-else>
          <div class="materials-section-title">外链资源</div>
          <div class="materials-card">
            <div class="materials-actions" v-if="iTeach">
              <button class="materials-action-btn primary" @click="addLinkDialogVisible = true">＋ 添加外链</button>
            </div>

            <div v-if="(currentMaterials?.links || []).length" class="materials-link-list">
              <div class="materials-link-item" v-for="lk in currentMaterials.links" :key="lk.id">
                <div class="materials-link-title">{{ lk.title }}</div>
                <a class="materials-link-url" :href="lk.url" target="_blank" rel="noreferrer">{{ lk.url }}</a>
                <div class="materials-link-meta">{{ formatEditTime(lk.updatedAt) }}编辑</div>
                <div class="materials-link-ops" v-if="iTeach">
                  <button class="materials-op-btn danger" @click="deleteLink(lk)">删除</button>
                </div>
              </div>
            </div>
            <div class="materials-empty" v-else>暂无外链资源</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <el-dialog v-model="createFolderDialogVisible" draggable :close-on-click-modal="false" :show-close="false">
    <template #header>
      <div class="dialog-header">
        <span class="join-course-span">新建文件夹</span>
        <span class="cancel-span" @click="createFolderDialogVisible = false">×</span>
      </div>
    </template>
    <div class="dialog-body">
      <div class="input-div">
        <div><span>*</span><label>文件夹名称</label></div>
        <input v-model="newFolderName" placeholder="请输入文件夹名称" />
      </div>
    </div>
    <template #footer>
      <span class="dialog-footer">
        <div class="cancel-confirm">
          <el-button class="cancel-button" @click="createFolderDialogVisible = false">取消</el-button>
          <el-button class="confirm-button" type="primary" @click="confirmCreateFolder">确认</el-button>
        </div>
      </span>
    </template>
  </el-dialog>

  <el-dialog v-model="moveFolderDialogVisible" draggable :close-on-click-modal="false" :show-close="false">
    <template #header>
      <div class="dialog-header">
        <span class="join-course-span">移动文件夹</span>
        <span class="cancel-span" @click="moveFolderDialogVisible = false">×</span>
      </div>
    </template>
    <div class="dialog-body">
      <div class="input-div">
        <div><span>*</span><label>目标位置</label></div>
        <select v-model="moveTargetParentId" class="materials-select">
          <option v-for="opt in moveTargets" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
        </select>
      </div>
    </div>
    <template #footer>
      <span class="dialog-footer">
        <div class="cancel-confirm">
          <el-button class="cancel-button" @click="moveFolderDialogVisible = false">取消</el-button>
          <el-button class="confirm-button" type="primary" @click="confirmMoveFolder">确认</el-button>
        </div>
      </span>
    </template>
  </el-dialog>

  <el-dialog v-model="addLinkDialogVisible" draggable :close-on-click-modal="false" :show-close="false">
    <template #header>
      <div class="dialog-header">
        <span class="join-course-span">添加外链</span>
        <span class="cancel-span" @click="addLinkDialogVisible = false">×</span>
      </div>
    </template>
    <div class="dialog-body">
      <div class="input-div">
        <div><span>*</span><label>外链名称</label></div>
        <input v-model="newLinkTitle" placeholder="请输入外链名称" />
      </div>
      <div class="input-div">
        <div><span>*</span><label>链接地址</label></div>
        <input v-model="newLinkUrl" placeholder="https://..." />
      </div>
    </div>
    <template #footer>
      <span class="dialog-footer">
        <div class="cancel-confirm">
          <el-button class="cancel-button" @click="addLinkDialogVisible = false">取消</el-button>
          <el-button class="confirm-button" type="primary" @click="confirmAddLink">确认</el-button>
        </div>
      </span>
    </template>
  </el-dialog>
</template>

<style scoped>
.breadcrumb {
  cursor: pointer;
  color: #333;
  font-size: 16px;
}
.breadcrumb:hover {
  color: #4285f4;
}
.breadcrumb-separator {
  margin: 0 8px;
  color: #c0c4cc;
  display: flex;
  align-items: center;
  font-size: 14px;
}
.breadcrumb-current {
  color: #333;
  font-size: 16px;
}
.release-assignment-mask{
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 1200;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 20px 0;
  overflow-y: auto;
}
.release-assignment{
  width: 700px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.12);
  padding: 0 0 18px;
}
.release-header{
  height: 44px;
  padding: 0 16px;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  color: #303133;
}
.release-close{
  font-size: 22px;
  color: #909399;
}
.release-tabs{
  padding: 12px 16px 0;
}
.release-tab{
  color: #409eff;
  font-size: 13px;
  padding-bottom: 8px;
  border-bottom: 2px solid #409eff;
}
.release-section{
  margin: 12px 16px 0;
  padding: 14px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fff;
}
.release-section-title{
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #303133;
  margin-bottom: 14px;
}
.release-step{
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #40a9ff;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}
.release-form-row{
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.release-required::before{
  content: '*';
  color: #f56c6c;
  margin-right: 4px;
}
.release-input,
.release-select,
.release-textarea{
  width: 100%;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 13px;
  color: #303133;
  box-sizing: border-box;
  background: #fff;
}
.release-input,
.release-select{
  height: 36px;
  padding: 0 12px;
}
.release-input.full{
  width: 100%;
}
.release-textarea{
  min-height: 110px;
  resize: vertical;
  padding: 10px 12px;
  line-height: 1.6;
}
.release-text-count{
  text-align: right;
  font-size: 12px;
  color: #909399;
  margin-top: 6px;
}
.release-tag-row{
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 12px;
}
.release-type-chip{
  height: 30px;
  padding: 0 14px;
  border: 1px solid #dcdfe6;
  border-radius: 15px;
  font-size: 12px;
  color: #606266;
  background: #fff;
}
.release-type-chip.active{
  color: #409eff;
  border-color: #a0cfff;
  background: #ecf5ff;
}
.release-collapse{
  margin: 12px 16px 0;
  height: 42px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  background: #fafafa;
  display: flex;
  align-items: center;
  padding: 0 14px;
  font-size: 13px;
  color: #606266;
}
.release-grid{
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 16px;
}
.release-grid.compact{
  grid-template-columns: 1fr 1fr;
  align-items: center;
  margin-top: 12px;
}
.release-grid-item{
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  color: #606266;
}
.release-switch-row{
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 18px;
}
.release-switch{
  position: relative;
  display: inline-flex;
  width: 40px;
  height: 22px;
}
.release-switch input{
  opacity: 0;
  width: 0;
  height: 0;
}
.release-switch-slider{
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: #dcdfe6;
  transition: all 0.2s ease;
}
.release-switch-slider::before{
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  left: 3px;
  top: 3px;
  border-radius: 50%;
  background: #fff;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}
.release-switch input:checked + .release-switch-slider{
  background: #409eff;
}
.release-switch input:checked + .release-switch-slider::before{
  transform: translateX(18px);
}
.release-switch-label{
  font-size: 13px;
  color: #f56c6c;
}
.release-input-readonly{
  background:#f5f7fa;
  color:#909399;
  border-color:#e4e7ed;
  cursor:not-allowed;
}
.release-publish-settings{
  margin-top: 14px;
}
.release-format-group{
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.release-format-title{
  font-size: 13px;
  color: #606266;
}
.release-radio{
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #606266;
}
.release-inline-switch{
  flex-direction: row;
  align-items: center;
  gap: 10px;
}
.release-input.threshold{
  width: 70px;
}
.release-footer{
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 16px 0;
}
.release-footer-btn{
  min-width: 56px;
  height: 32px;
  border-radius: 4px;
  font-size: 13px;
  padding: 0 16px;
}
.release-footer-btn.cancel{
  border: 1px solid #dcdfe6;
  color: #606266;
  background: #fff;
}
.release-footer-btn.confirm{
  background: #409eff;
  color: #fff;
}
.assignment-info{
  display:flex;
  flex:1;
  min-width:0;
  flex-direction:column;
  font-size:14px;
}
.course-details-header-title{
  display:flex;
  flex-direction: column;
  color:white;
}
.homework-logo{
  width:52px;
  margin:0 18px 0 0;
  display:flex;
  flex-direction:column;
  justify-content:center;
  align-items:center;
  flex-shrink: 0;
}
.homework-logo img{
  margin:0 0 8px;
  width:28px;
  display:flex;
}
.homework-logo span{
  display:flex;
  font-size:12px;
  color:#8c8c8c;
}
.activity-number{
  font-size:13px;
  color:#606266;
}
.homework-toolbar{
  display:flex;
  align-items:center;
  justify-content:space-between;
  margin:8px 0 10px;
}
.teacher-homework-toolbar{
  display:flex;
  align-items:center;
  gap:12px;
}
.teacher-filter-group{
  display:flex;
  gap:8px;
}
.teacher-filter-button{
  height:28px;
  padding:0 12px;
  border:1px solid #dcdfe6;
  border-radius:4px;
  background:#fff;
  color:#606266;
  font-size:12px;
}
.teacher-filter-button.active{
  color:#409eff;
  border-color:#a0cfff;
  background:#ecf5ff;
}
.homework-box{
  border-radius:8px;
  border:1px solid #ebeef5;
  background:#fff;
  display:flex;
  flex-direction:column;
  margin:0 0 10px;
  width:100%;
  overflow:visible;
}
.homework-item{
  width: 100%;
  min-height:95px;
  padding:14px 18px;
  display:flex;
  align-items:center;
  border-bottom:1px solid #f0f2f5;
}
.homework-item:last-child{
  border-bottom:none;
}
.teacher-homework-item{
  min-height:104px;
}
.teacher-assignment-info{
  flex:1;
  padding-right:18px;
}
.teacher-assignment-meta{
  margin-top:8px;
}
.teacher-deadline-meta{
  display:inline-flex;
  align-items:center;
  gap:4px;
}
.teacher-deadline-label{
  color:#8c8c8c;
  font-size:12px;
  line-height:1.6;
}
.teacher-deadline-value{
  color:#8c8c8c;
  font-size:12px;
  font-weight:400;
  line-height:1.6;
}
.teacher-assignment-stats{
  min-width:132px;
  display:flex;
  justify-content:space-between;
  gap:18px;
  margin-right:18px;
}
.teacher-assignment-actions{
  position:relative;
  display:flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  width:auto;
  flex-shrink:0;
  padding-left:18px;
  border-left:1px solid #ebeef5;
}
.teacher-publish-button{
  min-width:52px;
  height:auto;
  padding:0 6px;
  border:none;
  background:transparent;
  color:#409eff;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:2px;
  line-height:1.1;
}
.teacher-publish-button:hover{
  color:#66b1ff;
}
.teacher-more-button{
  min-width:44px;
  height:auto;
  padding:0 8px;
  border:none;
  border-radius:4px;
  background:transparent;
  color:#606266;
  display:flex;
  flex-direction:column;
  align-items:center;
  justify-content:center;
  gap:2px;
  line-height:1;
}
.teacher-more-button:hover{
  color:#409eff;
  background:#f5f7fa;
}
.teacher-action-icon{
  font-size:18px;
  line-height:1;
}
.teacher-action-text{
  font-size:12px;
  line-height:1;
}
.teacher-more-menu{
  position:absolute;
  top:36px;
  right:0;
  z-index:20;
  width:108px;
  padding:6px 0;
  border:1px solid #ebeef5;
  border-radius:6px;
  background:#fff;
  box-shadow:0 6px 18px rgba(0, 0, 0, 0.08);
}
.teacher-more-item{
  width:100%;
  height:34px;
  padding:0 14px;
  text-align:left;
  color:#303133;
  font-size:13px;
  background:#fff;
}
.teacher-more-item:hover{
  background:#f5f7fa;
}
.teacher-more-item.danger{
  color:#f56c6c;
}
.teacher-stat-item{
  display:flex;
  flex-direction:column;
  align-items:center;
  gap:4px;
}
.teacher-stat-number{
  font-size:18px;
  color:#409eff;
  line-height:1;
}
.teacher-stat-label{
  font-size:12px;
  color:#909399;
}
.assignment-title{
  font-size:16px;
  color:#303133;
  line-height:1.4;
  margin-bottom:6px;
}
.assignment-meta{
  display:flex;
  flex-wrap:wrap;
  gap:12px;
  font-size:12px;
  color:#909399;
  line-height:1.6;
}
.assignment-status-row{
  display:flex;
  flex-wrap:wrap;
  gap:12px;
  margin-top:6px;
  font-size:12px;
  color:#606266;
}
.status-done{
  color:#67c23a;
}
.status-pending{
  color:#e6a23c;
}
.submit-button{
  width:76px;
  height:30px;
  margin-left:18px;
  border:1px solid #409eff;
  border-radius:4px;
  background:#409eff;
  color:#fff;
  font-size:12px;
  flex-shrink:0;
}
.submit-button:hover{
  background:#66b1ff;
  border-color:#66b1ff;
}
.submit-button.is-submitted{
  border-color:#d9ecff;
  background:#f4faff;
  color:#409eff;
}
.submit-button.is-submitted:hover{
  background:#ecf5ff;
  border-color:#bcd3ff;
}
.homework-empty{
  display:flex;
  justify-content:center;
  align-items:center;
  min-height:140px;
  color:#909399;
  font-size:14px;
}
.assignment-title-button{
  padding:0;
  text-align:left;
}
.assignment-title-button:hover .assignment-title{
  color:#409eff;
}
.assignment-page{
  position:absolute;
  display:flex;
  flex-direction:column;
  width:1000px;
  top:80px;
  left:50%;
  transform:translateX(-50%);
  padding-bottom:32px;
}
.assignment-page-tabs{
  display:flex;
  gap:24px;
  border-bottom:1px solid #ebeef5;
  margin-bottom:16px;
}
.assignment-page-tab{
  padding:10px 0;
  font-size:14px;
  color:#606266;
  border-bottom:2px solid transparent;
}
.assignment-page-tab.active{
  color:#409eff;
  border-bottom-color:#409eff;
}
.teacher-assignment-summary,
.teacher-ai-setting-card,
.student-assignment-hero,
.student-detail-card,
.student-comment-card,
.student-submit-card,
.teacher-review-panel{
  background:#fff;
  border:1px solid #ebeef5;
  border-radius:6px;
}
.teacher-assignment-summary{
  padding:18px 20px;
  margin-bottom:16px;
}
.teacher-assignment-summary-title{
  font-size:28px;
  color:#303133;
  margin-bottom:10px;
}
.teacher-assignment-summary-meta{
  display:flex;
  flex-wrap:wrap;
  gap:10px;
  margin-bottom:12px;
  font-size:12px;
  color:#909399;
}
.teacher-assignment-summary-desc{
  font-size:14px;
  color:#606266;
  line-height:1.7;
}
.teacher-detail-comment-card{
  margin-bottom:16px;
}
.teacher-comment-section-title{
  display:flex;
  align-items:baseline;
  gap:8px;
  margin:8px 0 12px;
  font-size:16px;
  color:#303133;
}
.teacher-comment-section-title span{
  font-size:12px;
  color:#909399;
}
.teacher-comment-empty{
  margin-top:0;
}
.teacher-ai-setting-card{
  padding:20px 24px 24px;
  display:flex;
  flex-direction:column;
  gap:18px;
}
.teacher-ai-setting-title{
  font-size:16px;
  color:#303133;
  line-height:1.5;
  margin:0;
}
.teacher-ai-setting-row{
  display:flex;
  align-items:center;
  gap:14px;
  min-height:32px;
  padding-left:2px;
}
.teacher-ai-setting-row .release-switch{
  flex-shrink:0;
}
.teacher-ai-setting-label{
  font-size:14px;
  color:#606266;
  line-height:20px;
  display:inline-flex;
  align-items:center;
  white-space:nowrap;
}
.teacher-review-panel{
  padding:16px;
}
.teacher-review-chip-row{
  display:flex;
  align-items:center;
  gap:10px;
  flex-wrap:wrap;
  margin-bottom:16px;
}
.teacher-review-chip{
  height:30px;
  padding:0 14px;
  border-radius:15px;
  border:1px solid #dcdfe6;
  background:#fff;
  color:#606266;
  font-size:12px;
}
.teacher-review-chip.active{
  color:#409eff;
  border-color:#a0cfff;
  background:#ecf5ff;
}
.teacher-review-search{
  margin-left:auto;
  width:220px;
  height:32px;
  border:1px solid #dcdfe6;
  border-radius:4px;
  padding:0 10px;
  box-sizing:border-box;
}
.teacher-review-actions{
  display:flex;
  gap:10px;
  margin-bottom:14px;
}
.teacher-review-action{
  height:30px;
  padding:0 12px;
  border:1px solid #dcdfe6;
  border-radius:4px;
  background:#fff;
  color:#606266;
  font-size:12px;
}
.teacher-review-action.primary{
  background:#409eff;
  border-color:#409eff;
  color:#fff;
}
.teacher-review-table{
  border:1px solid #ebeef5;
  border-radius:6px;
  overflow:hidden;
}
.teacher-review-header,
.teacher-review-row{
  display:grid;
  grid-template-columns:40px 1.4fr 0.8fr 0.7fr 0.7fr 0.7fr 1fr 0.9fr;
  align-items:center;
}
.teacher-review-header{
  min-height:42px;
  background:#f5f7fa;
  font-size:12px;
  color:#606266;
  padding:0 14px;
}
.teacher-review-row{
  min-height:58px;
  padding:0 14px;
  border-top:1px solid #f0f2f5;
  font-size:13px;
  color:#303133;
}
.teacher-student-cell{
  display:flex;
  flex-direction:column;
  gap:4px;
}
.teacher-student-cell small{
  color:#909399;
}
.teacher-score-cell{
  display:flex;
  align-items:center;
  gap:6px;
}
.teacher-score-input{
  width:52px;
  height:28px;
  border:none;
  border-bottom:1px solid #c0c4cc;
  outline:none;
  text-align:center;
}
.teacher-score-input.saving{
  color:#409eff;
  border-bottom-color:#409eff;
}
.teacher-review-ops{
  display:flex;
  align-items:center;
}
.teacher-file-cell{
  display:flex;
  align-items:center;
  gap:6px;
}
.teacher-file-empty{
  color:#909399;
}
.teacher-op-link{
  color:#409eff;
  font-size:12px;
}
.teacher-op-link.danger{
  color:#f56c6c;
}
.teacher-review-empty{
  min-height:120px;
  display:flex;
  align-items:center;
  justify-content:center;
  color:#909399;
  font-size:14px;
}
.student-assignment-hero{
  display:flex;
  align-items:center;
  gap:16px;
  padding:18px 20px;
  margin-bottom:14px;
}
.student-assignment-hero-icon img{
  width:38px;
  height:38px;
}
.student-assignment-hero-info{
  flex:1;
}
.student-assignment-hero-title{
  font-size:22px;
  color:#303133;
  margin-bottom:8px;
}
.student-assignment-hero-meta{
  display:flex;
  flex-wrap:wrap;
  gap:10px;
  font-size:12px;
  color:#909399;
}
.student-detail-card,
.student-comment-card,
.student-submit-card{
  padding:20px 24px 18px;
  margin-bottom:16px;
}
.student-assignment-submit-page{
  margin-top:16px;
}
.student-submit-heading{
  display:flex;
  flex-direction:column;
  gap:6px;
}
.student-submit-title{
  font-size:20px;
  color:#303133;
  line-height:1;
}
.student-submit-tip{
  font-size:13px;
  color:#909399;
}
.student-detail-title{
  font-size:18px;
  color:#303133;
  margin-bottom:12px;
}
.student-detail-text{
  min-height:120px;
  line-height:1.8;
  font-size:14px;
  color:#606266;
}
.student-comment-input{
  width:100%;
  min-height:78px;
  padding:12px;
  border:1px solid #dcdfe6;
  border-radius:4px;
  box-sizing:border-box;
  resize:vertical;
}
.student-comment-actions{
  display:flex;
  justify-content:flex-end;
  align-items:center;
  gap:14px;
  margin-top:12px;
  font-size:12px;
  color:#606266;
}
.student-comment-publish,
.student-submit-confirm{
  height:32px;
  padding:0 16px;
  border-radius:4px;
  background:#409eff;
  color:#fff;
  font-size:12px;
}
.student-comment-empty{
  display:flex;
  flex-direction:column;
  align-items:center;
  color:#909399;
  margin-top:60px;
}
.student-comment-empty img{
  width:180px;
  opacity:0.85;
}
.student-submit-header{
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:16px;
  margin-bottom:20px;
}
.student-submit-section{
  padding:18px 0;
  border-top:1px solid #f0f2f5;
}
.student-submit-section:first-of-type{
  border-top:none;
  padding-top:0;
}
.student-submit-section-title{
  font-size:15px;
  color:#303133;
  margin-bottom:14px;
}
.student-submit-section-title span{
  margin-left:6px;
  color:#909399;
  font-size:12px;
}
.student-upload-box{
  min-height:156px;
  border:1px dashed #c9d7ee;
  border-radius:8px;
  background:#fafcff;
  display:flex;
  flex-direction:column;
  justify-content:center;
  align-items:center;
  gap:8px;
  color:#409eff;
  margin-bottom:14px;
  cursor:pointer;
}
.student-upload-box small{
  color:#909399;
}
.student-hidden-file-input{
  display:none;
}
.student-upload-icon{
  font-size:34px;
  line-height:1;
}
.student-submit-textarea{
  width:100%;
  min-height:140px;
  padding:14px 16px;
  border:1px solid #dcdfe6;
  border-radius:8px;
  box-sizing:border-box;
  resize:vertical;
}
.student-submitted-preview{
  font-size:13px;
  color:#606266;
  line-height:1.7;
  padding:14px 16px;
  background:#fafafa;
  border:1px solid #ebeef5;
  border-radius:8px;
}
.student-submit-status-row{
  display:flex;
  flex-wrap:wrap;
  gap:12px;
  margin-top:20px;
  padding-top:16px;
  border-top:1px solid #f0f2f5;
  font-size:12px;
  color:#606266;
}
.student-submit-header-actions{
  display:flex;
  gap:10px;
  align-items:center;
}
.student-submit-action-bar{
  display:flex;
  justify-content:flex-end;
  align-items:center;
  gap:12px;
  margin-top:4px;
  padding-top:18px;
  border-top:1px solid #f0f2f5;
  background:#fff;
}
.student-submit-confirm-lg{
  min-width:108px;
  height:36px;
  padding:0 22px;
  font-size:14px;
}
.student-submit-text-action{
  color:#409eff;
  font-size:12px;
}
.student-submit-secondary{
  height:32px;
  padding:0 14px;
  border-radius:4px;
  border:1px solid #bcd3ff;
  background:#fff;
  color:#409eff;
  font-size:12px;
}
.student-submitted-banner{
  height:88px;
  border-radius:8px;
  background:#f5f9ff;
  color:#409eff;
  border:1px solid #d9ecff;
  font-size:18px;
  display:flex;
  align-items:center;
  justify-content:center;
}
.student-submitted-file-card{
  border:1px solid #ebeef5;
  border-radius:8px;
  padding:14px 16px;
  display:flex;
  align-items:center;
  gap:12px;
}
.student-file-icon{
  width:34px;
  height:40px;
  border-radius:4px;
  background:#ecf5ff;
  color:#409eff;
  display:flex;
  align-items:center;
  justify-content:center;
  font-weight:700;
}
.student-file-meta{
  flex:1;
}
.student-file-name{
  font-size:14px;
  color:#303133;
  margin-bottom:4px;
}
.student-file-size{
  font-size:12px;
  color:#909399;
}
.student-file-download{
  color:#409eff;
  font-size:12px;
}
.student-submitted-empty-file{
  font-size:13px;
  color:#909399;
}
.student-selected-file-tip{
  margin:12px 0 0;
  color:#606266;
  font-size:13px;
}
.status-danger{
  color:#f56c6c;
}
.course-learning-header{
  display: flex;
  height:45px;
  align-items: center;
}
.course-learning-header button{
  margin-right:25px;
  padding-bottom:10px;
  padding-top:10px;
  font-size:14px;
}
.course-learning-header button.active{
  font-size:14px;
  color: #4285f4;
  border-bottom: 2px solid #4285f4;
}
.course-details-header-content button.active{
  background: #e8f0ff;
  color: #4285f4;
  border-radius: 10px;
}
.course-details-header-content{
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top:10px;
}
.course-details-header-content button{
  font-size: 18px;
  color: #3c4043;
  cursor: pointer;
  margin-left: 10px;
  margin-right: 10px;
}

.course-details-blank{
  width: 100%;
  display: flex;
  margin-top:50px;
  flex-direction: column;
  justify-content: center;
  align-items: center;

}
.course-details-blank img{
  margin: auto;
  width:430px;
}
.course-details {
  position: absolute;
  display: flex;
  flex-direction: column;
  width: 1000px;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
}
.course-details-header{
  width:100%;
  height:220px;
  border-radius:8px;
  box-shadow: 0 2px 4px 0 rgba(0, 0, 0, .1);
}
.course-details-header-title{
  display:flex;
  height:170px;
  background-color:red;
  background-image: url('@/assets/课堂派课程详情图片.png');
  border-top-left-radius:8px;
  border-top-right-radius:8px;
}
.course-details-header-content{
  display:flex;
  border-bottom-left-radius:8px;
  border-bottom-right-radius:8px;
}

.new-row {
  clear: both; /* 每行开始时清除浮动 */
}
.input-div span{
  color:red;
}
:deep(.el-dialog){
  width:784px;
  border:2px solid #4285F4;
  background-color:white;
  border-radius:8px;
  display:flex;
  flex-direction:column;
  justify-content:center;
}

.materials-layout{
  display:flex;
  margin-top:20px;
}
.materials-side{
  width:140px;
  display:flex;
  flex-direction:column;
  margin-right:24px;
}
.materials-side-item{
  text-align:left;
  padding:12px 10px;
  font-size:14px;
  color:#3c4043;
  cursor:pointer;
  border-left:2px solid transparent;
}
.materials-side-item.active{
  color:#4285f4;
  border-left-color:#4285f4;
  background:#f5f9ff;
}
.materials-main{
  flex:1;
}
.materials-main-title{
  font-size:26px;
  color:#202124;
  margin-bottom:10px;
}
.materials-divider{
  height:1px;
  background:#e6e8eb;
  width:100%;
  margin-bottom:18px;
}
.materials-section-title{
  font-size:14px;
  color:#202124;
  padding:12px 16px;
  background:#f5f7fa;
  border:1px solid #e6e8eb;
  border-bottom:none;
  border-top-left-radius:8px;
  border-top-right-radius:8px;
}
.materials-breadcrumb-item{
  cursor:pointer;
}
.materials-breadcrumb-item:hover{
  color:#4285f4;
}
.materials-card{
  border:1px solid #e6e8eb;
  border-bottom-left-radius:8px;
  border-bottom-right-radius:8px;
  background:#fff;
  padding:16px;
}
.materials-actions{
  display:flex;
  gap:12px;
  margin-bottom:16px;
}
.materials-action-btn{
  height:36px;
  padding:0 14px;
  border:1px solid #d0d7de;
  border-radius:4px;
  cursor:pointer;
  background:#fff;
  color:#202124;
  font-size:14px;
}
.materials-action-btn.primary{
  border-color:#4285f4;
  color:#4285f4;
}
.materials-file-input{
  display:none;
}
.materials-grid{
  display:flex;
  flex-wrap:wrap;
  gap:16px;
}
.materials-item{
  width:160px;
  border:1px solid #eef0f2;
  border-radius:6px;
  padding:12px;
  cursor:pointer;
  background:#fff;
}
.materials-item:hover{
  border-color:#d7dde3;
  box-shadow:0 2px 8px rgba(0,0,0,0.06);
}
.materials-item-icon{
  height:92px;
  display:flex;
  align-items:center;
  justify-content:center;
  margin-bottom:10px;
  background:#f7f9fb;
  border-radius:6px;
}
.materials-file-icon{
  width:54px;
  height:54px;
  border-radius:8px;
  display:flex;
  align-items:center;
  justify-content:center;
  font-weight:700;
  color:#d56b00;
  background:#fff3e6;
  border:1px solid #ffd8b5;
}
.materials-folder-icon{
  font-size:34px;
}
.materials-item-name{
  font-size:13px;
  color:#202124;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
  margin-bottom:6px;
}
.materials-item-meta{
  font-size:12px;
  color:#80868b;
  margin-bottom:10px;
}
.materials-item-ops{
  display:flex;
  gap:8px;
  flex-wrap:wrap;
}
.materials-op-btn{
  border:none;
  background:transparent;
  cursor:pointer;
  padding:0;
  color:#4285f4;
  font-size:12px;
}
.materials-op-btn.danger{
  color:#d93025;
}
.materials-empty{
  padding:26px 0;
  text-align:center;
  color:#80868b;
  font-size:13px;
}
.materials-link-list{
  display:flex;
  flex-direction:column;
}
.materials-link-item{
  padding:16px 0;
  border-bottom:1px solid #eef0f2;
}
.materials-link-item:last-child{
  border-bottom:none;
}
.materials-link-title{
  font-size:16px;
  color:#202124;
  margin-bottom:6px;
}
.materials-link-url{
  color:#4285f4;
  font-size:13px;
  text-decoration:none;
  word-break:break-all;
}
.materials-link-meta{
  color:#80868b;
  font-size:12px;
  margin-top:6px;
}
.materials-link-ops{
  margin-top:8px;
}
.materials-select{
  width:100%;
  height:36px;
  border:1px solid #d0d7de;
  border-radius:4px;
  padding:0 10px;
  font-size:14px;
}

</style>

<style scoped>
.dialog-footer {
  padding:10px 20px;
  display:flex;
  justify-content:flex-end;
  border-top:1px solid rgb(218, 220, 224);
}
.cancel-confirm{
  display:flex;
  align-items:center;
}
.cancel-button,.confirm-button{
  width:70px;
  height:36px;
  padding:10px 20px;
  margin-left:12px;
  border:8px;
}
.cancel-button{
  color:black;
  border:1px solid rgb(218, 220, 224);
}
.cancel-button:hover{
  background-color:rgb(236, 243, 254);
  color:#4285F4;

}
.confirm-button{
  color:white;
  background-color:#4285F4;
  border:none;
}
.confirm-button:hover{
  background-color:rgb(104, 157, 246);
  border:none;
}
.confirm-button,.cancel-button{
  width: 70px;
  height: 36px;
  margin-left:10px;
  font-size:12px;
  border-radius: 2px;
  padding: 3px 15px;
  margin-right: 8px;
}
.dialog-header div {
  display:flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  width:100%;
}
.dialog-body input{
  padding:0 15px;
  width:660px;
  height:36px;
  outline:none;
  margin-left:10px;
  border:1px solid rgb(218, 220, 224);
  justify-content: center;
  align-items: center;
}
.dialog-body .input-div{
  height:88px;
  padding:20px 15px 15px;
  display:flex;
  flex-direction:row;
  justify-content:center;
  align-items: center;
  width:100%;
}
.dialog-body{
  display:flex;
  flex-direction:column;
}
.dialog-header{
  padding:18px 24px;
  display:flex;
  justify-content:space-between;
  height:50px;
  align-items: center;
  border-bottom: 1px solid rgb(218, 220, 224);
  width:100%;
}
.dialog-header .cancel-span{
  font-size:36px;
  cursor:pointer;
}
.dialog-header .cancel-span:hover{
  color:rgb(66, 133, 244);
}
.dialog-header .join-course-span{
  font-size:16px;
  color:#3C4043;
  font-weight:bold;
}

.course-dropdown{
  position:relative;
  display:inline-block;
  float:right;
}
.course-dropdown-content{
  display:none;
  position:absolute;
  background-color:white;
  width:90px;
  box-shadow:0 8px 16px 0 rgba(0,0,0,0.2);
}
.course-dropdown-content button{
  color:black;
  padding:0 17px;
  display:block;
  width:90px;
  height:30px;
  cursor: pointer;
}
.course-dropdown-content button:hover{
  background-color:rgb(236, 243, 254);
  color:rgb(66, 133, 244);
}
.course-dropdown:hover .course-dropdown-content{
  display:block;
}
.teach-div,.learn-div{
  font-size:12px;
}
.teach-div{
  display:flex;
  width:100%;
  justify-content: space-between;
}
.learn-div{
  display:flex;
  width:100%;
  justify-content: space-between;
}
.learn-span{
  color:rgb(66, 133, 244);
  background-color:white;
  border:1px solid rgb(66, 133, 244);
  border-radius:2px;
  padding: 2px 3px;
  margin-right:7px;
}
.teach-span{
  color:white;
  background-color:rgb(66, 133, 244);
  border-radius:2px;
  padding: 2px 3px;
  margin-right:7px;
}
.course-information-footer{
  margin-top:40px;
  display:flex;
  padding:0 10px 15px 10px;
  justify-content: space-between;
  color:rgb(60, 64, 67);
  font-size:12px;
}
.cancel-top-placement{
  border:none;
  font-size:12px;
}
.course-information-header{
  color:white;
  display:flex;
  align-items: flex-start;
  flex-direction: column;
  gap:10px;
}
.course-time{
  opacity:0.6;
}
.course-time,.course-classes{
  font-size:12px;
}
.course-name{
  font-size:18px;
}
.course-code{
  font-size:14px;
}
.course-information-header{
  height:152px;
  padding:15px 20px;
  background-color:rgb(160, 62, 59);
  background-image: url('@/assets/课堂派课程详情图片.png');
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
}
.course-container{
  margin-top: 20px; /* 仅保留顶部间距 */
  box-sizing: border-box; /* 确保边框不增加宽度 */
  width:224px;
  height:230px;
  border-radius:8px;
  border:1px solid rgb(226, 230, 237);
}

.bottom-course-container-body,.top-course-container-body{
  display:flex;
  flex-direction:row;
  flex-wrap: wrap; /* 核心：超出一行自动换行 */
  gap: 20px; /* 用gap统一控制课程间距（替代margin-right） */
  padding: 10px;
  box-sizing: border-box;
}
.bottom-course-container button{
  font-size:14px;
  color:rgb(66, 133, 244);
}
.bottom-course-container span{
  font-size:16px;
}
.bottom-course-container-header{
  display:flex;
  justify-content: space-between;
}
.bottom-course-container{
  width:100%;
  margin:0 0 24px;
  padding:10px;
  align-items: center;
}
.search input{
  border:none;
  color:rgb(218, 220, 224);
  outline:none;
}
.nav .search-focused {
  border: 1px solid rgb(66, 133, 244);
}
.search button{
  color:rgb(218, 220, 224);
}
::placeholder{
  color:rgb(218, 220, 224);
}
.nav{
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.search{
  width:205px;
  height:36px;
  display:flex;
  justify-content: space-between;
  padding:10px;
  border:1px solid rgb(218, 220, 224);
  align-items:center;
  border-radius:18px;
}
.teach-button{
  padding-right:20px;
}
.teach-learn{
  display:flex;
  align-items: center;
}
.learn-button{
  padding-left:20px;
}
.teach-learn button{
  border-bottom:2px solid rgb(232, 240, 255);
  background-color: transparent;
  color:#303133;
  font-size:16px;
  padding-bottom:10px;
  padding-top:10px;
}
.teach-learn button:focus{
  border-bottom:2px solid rgb(66, 133, 244);
  color:rgb(66, 133, 244);
}
.top-course-container-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

}
.create-join-course{
  border:none;
  height: 36px;
  font-size:14px;
  color:white;
  background-color:rgb(66, 133, 244);
  cursor:pointer;
  border-radius:4px;
}
.create-join-course:hover{
  background-color:rgb(104, 157, 246);
}
.top-course-container h2{
  font-size:20px;
  color:#575A5B;
  font-weight:500;
}
.nav{
  padding:12px 0;
  height:80px;
  width:100%;
}
.top-course-container{
  padding:10px;
}
.top-course-container,.bottom-course-container {
  width:100%;
  border-radius:8px;
  border:1px solid rgb(218, 220, 224);
}
.bottom-course-container {
  background-color:rgb(248, 249, 250);
}
body, html {
  margin: 0;
  padding: 0;
  display: flex;
  justify-content: center;
  position: relative;
}

.body-container {
  position: absolute;
  display: flex;
  flex-direction: column;
  width: 1000px;
  height: 1000px;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
}

.dropdown {
  position: relative;
  display: inline-block;

}

.dropdown-content {
  display: none;
  position: absolute;
  background-color: white;
  min-width: 160px;
  box-shadow: 0 8px 16px 0 rgba(0, 0, 0, 0.2);
  right: 2px;
}

.dropdown-content button {
  color: #000000;
  padding: 12px 16px;
  text-decoration: none;
  display: block;
  width: 100%;
}

.dropdown-content button:hover {
  background-color: #f1f1f1
}

.dropdown:hover .dropdown-content {
  display: block;
}

.header span {
  font-size: 16px;
}

.head-left span {
  color: #4285F4;
  border-bottom: 3px solid #4285f4;
  padding: 19px 5px;
}

.head-left img {
  width: auto;
  height: 28px;
  margin-right: 15px;
}

.header {
  width: 100%;
  height: 65px;
  padding: 0 24px;
  display: flex;
  flex-direction: row;
  box-shadow: 0 1px 0 0 #dfdfdf;
  background-color: #fff;
  z-index: 999;
  top: 0;
  left: 0;
  position: fixed;
  justify-content: space-between;
}

.head-left {
  display: flex;
  align-items: center;
}

.head-right {
  display: flex;
  align-items: center;
}

.head-right img {
  width: 70px;
  padding: 16px;
}

.head-right {
  gap: 10px;
}

button {
  border: none;
  background-color: transparent;
  cursor: pointer;
}

.personal-setting img {
  width: 114px;
  padding: 16px;
}

</style>
