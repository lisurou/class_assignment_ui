<script setup>
import axios from 'axios';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { ElMessage, ElMessageBox } from 'element-plus';
import defaultAvatarImage from '@/assets/课堂派头像.jpg';
import AppTopbar from '@/components/AppTopbar.vue';

const API_BASE = 'http://localhost:8080';
const DEBUG_IMPORT_CONFLICT_URL = 'http://127.0.0.1:7777/event';
const DEBUG_IMPORT_CONFLICT_SESSION = 'import-course-conflict';

function reportImportConflictDebug(hypothesisId, location, msg, data = {}, runId = 'pre') {
  fetch(DEBUG_IMPORT_CONFLICT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: DEBUG_IMPORT_CONFLICT_SESSION,
      runId,
      hypothesisId,
      location,
      msg: `[DEBUG] ${msg}`,
      data,
      ts: Date.now()
    })
  }).catch(() => {});
}

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

const prepGroups = ['全部', '个人', '小组'];
const contentTabs = ['互动课件', '资料', '作业', '话题'];

const prepSpaces = ref([]);
const selectedGroup = ref('全部');
const selectedSpaceId = ref('');
const activeTab = ref('互动课件');
const MATERIALS_CATEGORY_ALL = '全部资料';
const MATERIALS_FIXED_CATEGORIES = ['学习资料', '慕课资料', '录屏录像', '直播录像'];
const materialsCategory = ref('学习资料');
const materialsCategories = [
  MATERIALS_CATEGORY_ALL,
  '学习资料',
  '慕课资料',
  '录屏录像',
  '直播录像'
];
const leftKeyword = ref('');
const tableKeyword = ref('');
const coursewareFileInputRef = ref(null);
const materialsFileInputRef = ref(null);
const createPrepSpaceFormVisible = ref(false);
const createPrepSpaceSubmitting = ref(false);
const createFolderDialogVisible = ref(false);
const createFolderSubmitting = ref(false);
const createContentDialogVisible = ref(false);
const createContentSubmitting = ref(false);
const importMaterialsDialogVisible = ref(false);
const importMaterialsSubmitting = ref(false);
const importContentDialogVisible = ref(false);
const importContentSubmitting = ref(false);
const topicDetailDialogVisible = ref(false);
const topicDetailLoading = ref(false);
const createPrepSpaceForm = ref({
  name: '',
  spaceType: '个人',
  courseId: '',
  description: ''
});
const createFolderForm = ref({
  name: '',
  description: ''
});
const createContentForm = ref({
  title: '',
  content: ''
});
const createContentContext = ref({
  tab: '',
  folderId: 'root',
  folderName: ''
});
const importMaterialsForm = ref({
  courseId: '',
  selectedIds: [],
  itemType: 'attachment'
});
const importMaterialsContext = ref({
  category: '学习资料',
  folderId: 'root',
  folderName: ''
});
const importMaterialsLoading = ref(false);
const importMaterialsOptions = ref({
  attachment: [],
  folder: [],
  link: []
});
const importContentForm = ref({
  courseId: '',
  selectedIds: []
});
const importContentContext = ref({
  tab: '',
  folderId: 'root',
  folderName: ''
});
const topicDetailData = ref({
  id: '',
  title: '',
  content: '',
  authorName: '',
  createTime: '',
  replies: []
});
const importContentLoading = ref(false);
const importContentOptions = ref([]);
const importCourseKeyword = ref('');

const notifications = ref([]);
const notificationsLoading = ref(false);
const spaceActionMenuId = ref('');
const deletingSpaceId = ref('');

const membersLoading = ref(false);
const logsLoading = ref(false);
const spaceLoading = ref(false);
const coursewareLoading = ref(false);
const materialsLoading = ref(false);
const topicsLoading = ref(false);
const assignmentsLoading = ref(false);
const tabErrorMessage = ref('');

const currentSpaceDetail = ref(null);
const spaceMembers = ref([]);
const spaceLogs = ref([]);
const coursewareData = ref({
  folders: [],
  items: []
});

function getCoursewareStorageKey(spaceId) {
  return `lesson_prep_courseware_${encodeURIComponent(String(spaceId || ''))}`;
}

function loadCoursewareFromStorage(spaceId) {
  try {
    const raw = localStorage.getItem(getCoursewareStorageKey(spaceId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      folders: Array.isArray(parsed?.folders) ? parsed.folders : [],
      items: Array.isArray(parsed?.items) ? parsed.items : []
    };
  } catch {
    return null;
  }
}

function saveCoursewareToStorage(spaceId, data) {
  try {
    localStorage.setItem(
      getCoursewareStorageKey(spaceId),
      JSON.stringify({
        folders: Array.isArray(data?.folders) ? data.folders : [],
        items: Array.isArray(data?.items) ? data.items : []
      })
    );
  } catch {
    return;
  }
}

const materialsCacheByCategory = ref({});
const materialsData = ref({
  folders: [],
  attachments: [],
  links: []
});
const topicsData = ref({
  folders: [],
  items: []
});
const assignmentsData = ref({
  folders: [],
  items: []
});
const mirroredAssignmentsBySpace = ref({});
const mirroredTopicsBySpace = ref({});
const currentFolderMap = ref({
  '互动课件': 'root',
  '资料': 'root',
  '作业': 'root',
  '话题': 'root'
});

const moduleConfigMap = {
  '互动课件': {
    primaryLabel: '+ 新建课件/互动',
    importLabel: '',
    emptyText: '暂无互动课件'
  },
  '资料': {
    primaryLabel: '+ 新增资料',
    importLabel: '导入资料',
    emptyText: '暂无资料'
  },
  '作业': {
    primaryLabel: '+ 新增作业',
    importLabel: '导入作业',
    emptyText: '暂无作业'
  },
  '话题': {
    primaryLabel: '+ 新增话题',
    importLabel: '导入话题',
    emptyText: '暂无话题'
  }
};

function getMirrorStoreByTab(tabKey) {
  return tabKey === '作业' ? mirroredAssignmentsBySpace : mirroredTopicsBySpace;
}

function getMirroredItems(tabKey, spaceId) {
  const store = getMirrorStoreByTab(tabKey);
  return Array.isArray(store.value[String(spaceId || '')]) ? store.value[String(spaceId || '')] : [];
}

function mergeUniqueItemsById(primaryItems = [], extraItems = []) {
  const map = new Map();
  [...primaryItems, ...extraItems].forEach((item) => {
    const id = String(item?.id || '');
    if (!id || map.has(id)) return;
    map.set(id, item);
  });
  return Array.from(map.values());
}

function upsertMirroredItems(tabKey, spaceId, items = []) {
  const key = String(spaceId || '');
  const store = getMirrorStoreByTab(tabKey);
  const previous = getMirroredItems(tabKey, key);
  store.value = {
    ...store.value,
    [key]: mergeUniqueItemsById(previous, items)
  };
}

function removeMirroredItem(tabKey, spaceId, itemId) {
  const key = String(spaceId || '');
  const store = getMirrorStoreByTab(tabKey);
  const previous = getMirroredItems(tabKey, key);
  store.value = {
    ...store.value,
    [key]: previous.filter((item) => String(item?.id) !== String(itemId))
  };
}

async function fetchCourseAssignments(courseId, accountId) {
  if (!courseId) return [];
  const response = await axios.post(`${API_BASE}/assignment-details`, {
    id: courseId,
    accountId
  });
  const list = parseListResponse(response.data).length > 0
    ? parseListResponse(response.data)
    : Array.isArray(response?.data?.assignments) ? response.data.assignments : [];
  return list.map(normalizeAssignmentItem).filter((it) => it.id);
}

async function fetchCourseTopics(courseId) {
  if (!courseId) return [];
  const response = await axios.post(`${API_BASE}/topic/list`, { courseId });
  const list = parseListResponse(response.data).length > 0
    ? parseListResponse(response.data)
    : Array.isArray(response?.data?.topics) ? response.data.topics : [];
  return list.map(normalizeTopicItem).filter((it) => it.id);
}

function findLatestMatchingItem(items, matcher = {}) {
  const list = Array.isArray(items) ? [...items] : [];
  const normalizedName = String(matcher?.name || '').trim();
  const normalizedContent = String(matcher?.content || '').trim();
  const normalizedScore = String(matcher?.score ?? '').trim();
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const item = list[i];
    if (normalizedName && String(item?.name || '').trim() !== normalizedName) continue;
    if (normalizedContent && String(item?.content || '').trim() !== normalizedContent) continue;
    if (normalizedScore && String(item?.score ?? '').trim() !== normalizedScore) continue;
    return item;
  }
  return list[list.length - 1] || null;
}

async function syncMirroredAssignmentFromCourse(spaceId, courseId, accountId, matcher = {}) {
  const courseItems = await fetchCourseAssignments(courseId, accountId);
  const matchedItem = findLatestMatchingItem(courseItems, matcher);
  if (matchedItem) {
    upsertMirroredItems('作业', spaceId, [matchedItem]);
  }
  return matchedItem;
}

async function syncMirroredTopicFromCourse(spaceId, courseId, matcher = {}) {
  const courseItems = await fetchCourseTopics(courseId);
  const matchedItem = findLatestMatchingItem(courseItems, matcher);
  if (matchedItem) {
    upsertMirroredItems('话题', spaceId, [matchedItem]);
  }
  return matchedItem;
}

async function cloneAssignmentToBoundCourse(spaceId, accountId, boundCourseId, sourceItem) {
  if (!boundCourseId) {
    throw new Error('当前备课区未绑定课程，无法跨课程导入作业');
  }
  const assignment = {
    title: sourceItem?.name || '未命名作业',
    deadline: '',
    assignmentType: '个人作业',
    content: sourceItem?.content || '',
    totalScore: Number(sourceItem?.score || 100) || 100,
    aiEnabled: false,
    tag: '',
    knowledgeAgreement: false,
    environment: '',
    chapter: '',
    allowFormat: '',
    lateForbidden: false,
    duplicateCheck: false,
    duplicateThreshold: 0,
    autoReturn: false,
    publishTime: ''
  };
  const response = await axios.post(`${API_BASE}/release-assignment`, {
    accountId,
    id: boundCourseId,
    assignment
  });
  const data = response?.data ?? {};
  if (data?.success === false) {
    throw new Error(data?.message || '跨课程导入作业失败');
  }
  await syncMirroredAssignmentFromCourse(spaceId, boundCourseId, accountId, {
    name: assignment.title,
    content: assignment.content,
    score: String(assignment.totalScore)
  });
}

async function cloneTopicToBoundCourse(spaceId, accountId, boundCourseId, sourceItem) {
  if (!boundCourseId) {
    throw new Error('当前备课区未绑定课程，无法跨课程导入话题');
  }
  const response = await axios.post(`${API_BASE}/topic/create`, {
    courseId: boundCourseId,
    authorId: accountId,
    authorName: userStore.account?.name,
    title: sourceItem?.name || '未命名话题',
    content: sourceItem?.content || '',
    isAnonymous: false
  });
  const data = response?.data ?? {};
  if (data?.success === false) {
    throw new Error(data?.message || '跨课程导入话题失败');
  }
  await syncMirroredTopicFromCourse(spaceId, boundCourseId, {
    name: sourceItem?.name || '未命名话题',
    content: sourceItem?.content || ''
  });
}

async function copyAttachmentToPrepSpace(spaceId, accountId, sourceCourseId, sourceItem, categoryKey, targetFolderId) {
  const response = await axios.get(`${API_BASE}/courses/${encodeURIComponent(sourceCourseId)}/materials/attachments/${encodeURIComponent(sourceItem.id)}/download`, {
    params: { accountId },
    responseType: 'blob'
  });
  const blob = response?.data instanceof Blob ? response.data : new Blob([response?.data]);
  const fileName = sourceItem?.name || `attachment-${sourceItem?.id || Date.now()}`;
  const file = new File([blob], fileName, { type: blob.type || 'application/octet-stream' });
  const formData = new FormData();
  formData.append('accountId', accountId);
  if (targetFolderId) {
    formData.append('folderId', targetFolderId);
  }
  formData.append('category', categoryKey);
  formData.append('file', file);
  await requestFirstAvailable([
    () => axios.post(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/materials/attachments`, formData),
    () => axios.post(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/materials/upload`, formData)
  ]);
}

async function copyLinkToPrepSpace(spaceId, accountId, sourceItem, categoryKey, targetFolderId) {
  const payload = {
    accountId,
    category: categoryKey,
    title: sourceItem?.title || sourceItem?.name || '未命名外链',
    name: sourceItem?.title || sourceItem?.name || '未命名外链',
    url: sourceItem?.url || '',
    linkUrl: sourceItem?.url || '',
    folderId: targetFolderId || null
  };
  await requestFirstAvailable([
    () => axios.post(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/materials/links`, payload),
    () => axios.post(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/materials/link`, payload)
  ]);
}

function parseListResponse(payload) {
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
    if (Array.isArray(source?.prepareSpaces)) return source.prepareSpaces;
    if (Array.isArray(source?.folders)) return source.folders;
    if (Array.isArray(source?.attachments)) return source.attachments;
    if (Array.isArray(source?.links)) return source.links;
    if (Array.isArray(source?.topics)) return source.topics;
    if (Array.isArray(source?.assignments)) return source.assignments;
    if (Array.isArray(source?.list)) return source.list;
    if (Array.isArray(source?.records)) return source.records;
    if (Array.isArray(source?.rows)) return source.rows;
    if (Array.isArray(source?.items)) return source.items;
    if (Array.isArray(source?.content)) return source.content;
  }
  return [];
}

function normalizeSpace(item) {
  const id = String(
    item?.id
    ?? item?.spaceId
    ?? item?.spaceID
    ?? item?.space_id
    ?? item?.prepareSpaceId
    ?? item?.prepareSpaceID
    ?? item?.prepare_space_id
    ?? item?.prepareId
    ?? ''
  );
  const name = item?.name ?? item?.title ?? item?.spaceName ?? item?.space_name ?? item?.prepareSpaceName ?? '未命名备课区';
  const rawGroup = item?.groupName ?? item?.group ?? item?.scope ?? item?.group_name ?? item?.spaceType ?? item?.space_type ?? '';
  const normalizedGroup = String(rawGroup).includes('小组')
    ? '小组'
    : String(rawGroup).includes('个人')
      ? '个人'
      : rawGroup;
  const isGroup = Boolean(item?.isGroup ?? item?.group ?? item?.team ?? item?.is_team ?? normalizedGroup === '小组');
  const group = normalizedGroup || (isGroup ? '小组' : '个人');
  const tag = group === '小组' ? '小组' : group === '个人' ? '个人' : '全部';
  const ownerId = String(item?.ownerId ?? item?.owner_id ?? item?.creatorId ?? item?.creator_id ?? item?.createdBy ?? item?.created_by ?? '');
  return { id, name, group, tag, ownerId, raw: item };
}

function normalizeId(value) {
  if (value === undefined || value === null || value === '' || value === 'null' || value === 'undefined') {
    return 'root';
  }
  return String(value);
}

function normalizeGenericFolder(item) {
  return {
    id: String(item?.id ?? item?.folderId ?? ''),
    name: item?.name ?? item?.folderName ?? '未命名文件夹',
    parentId: normalizeId(item?.parentId ?? item?.parent_id),
    updatedAt: item?.updatedAt ?? item?.updateTime ?? item?.createdAt ?? item?.createTime ?? '',
    editor: item?.editor
      ?? item?.editorName
      ?? item?.createdByName
      ?? item?.created_by_name
      ?? item?.creatorName
      ?? item?.creator_name
      ?? item?.teacherName
      ?? item?.teacher_name
      ?? item?.userName
      ?? item?.user_name
      ?? item?.nameOfCreator
      ?? item?.createdBy
      ?? item?.created_by
      ?? '',
    raw: item
  };
}

function normalizeCoursewareItem(item) {
  return {
    id: String(item?.id ?? item?.coursewareId ?? item?.interactiveId ?? ''),
    name: item?.title ?? item?.name ?? '未命名课件',
    type: item?.type ?? item?.coursewareType ?? item?.resourceType ?? '互动课件',
    visibility: item?.visibility ?? item?.visibleRange ?? 'ALL_MEMBERS',
    folderId: normalizeId(item?.folderId ?? item?.folder_id),
    size: item?.size ?? item?.fileSize ?? '',
    updatedAt: item?.updatedAt ?? item?.updateTime ?? item?.createdAt ?? item?.createTime ?? '',
    editor: item?.editor ?? item?.createdBy ?? item?.created_by ?? '',
    url: item?.url ?? item?.linkUrl ?? '',
    raw: item
  };
}

function getFileExtension(fileName) {
  const name = String(fileName || '');
  const parts = name.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

function formatFileSize(size) {
  const value = Number(size || 0);
  if (!Number.isFinite(value) || value <= 0) return '';
  if (value < 1024) return `${value}B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(2)}KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(2)}MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)}GB`;
}

function formatNow() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}/${pad(now.getMonth() + 1)}/${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

function appendOptimisticUploadedFiles(moduleKey, files, options = {}) {
  const editor = userStore.account?.name || userStore.account?.accountId || '当前用户';
  const folderId = getCurrentFolderId(moduleKey);
  const nowText = formatNow();

  if (moduleKey === '互动课件') {
    const nextItems = files.map((file, index) => ({
      id: `temp-courseware-${Date.now()}-${index}`,
      name: file.name,
      type: getFileExtension(file.name) || '课件',
      visibility: 'ALL_MEMBERS',
      folderId,
      size: formatFileSize(file.size),
      updatedAt: nowText,
      editor,
      raw: { optimistic: true }
    }));
    coursewareData.value = {
      ...coursewareData.value,
      items: [...nextItems, ...coursewareData.value.items]
    };
    if (selectedSpaceId.value) {
      saveCoursewareToStorage(selectedSpaceId.value, coursewareData.value);
    }
    return nextItems.map((item) => String(item.id));
  }

  if (moduleKey === '资料') {
    const nextItems = files.map((file, index) => ({
      id: `temp-material-${Date.now()}-${index}`,
      name: file.name,
      size: formatFileSize(file.size),
      folderId,
      updatedAt: nowText,
      editor,
      raw: { optimistic: true }
    }));
    const bucket = getMaterialsBucket(options?.category ?? materialsCategory.value);
    bucket.attachments = [...nextItems, ...(Array.isArray(bucket.attachments) ? bucket.attachments : [])];
    if ((options?.category ?? materialsCategory.value) === materialsCategory.value) {
      materialsData.value = bucket;
    }
    return nextItems.map((item) => String(item.id));
  }

  return [];
}

function buildFolderRecord(moduleKey, payload = {}) {
  const rawPayload = payload?.raw ?? payload;
  const base = {
    id: String(payload?.id ?? payload?.folderId ?? `temp-folder-${Date.now()}`),
    name: payload?.name ?? payload?.folderName ?? '未命名文件夹',
    parentId: normalizeId(payload?.parentId ?? payload?.parent_id ?? getCurrentFolderId(moduleKey)),
    updatedAt: payload?.updatedAt ?? payload?.updateTime ?? payload?.createdAt ?? payload?.createTime ?? formatNow(),
    editor: payload?.editor
      ?? payload?.editorName
      ?? payload?.createdByName
      ?? payload?.created_by_name
      ?? payload?.creatorName
      ?? payload?.creator_name
      ?? payload?.teacherName
      ?? payload?.teacher_name
      ?? payload?.userName
      ?? payload?.user_name
      ?? userStore.account?.name
      ?? payload?.createdBy
      ?? payload?.created_by
      ?? userStore.account?.accountId
      ?? '当前用户',
    raw: rawPayload && typeof rawPayload === 'object'
      ? { ...rawPayload, localCreated: true }
      : { localCreated: true }
  };
  return base;
}

function insertCreatedFolder(moduleKey, payload = {}, options = {}) {
  const folder = buildFolderRecord(moduleKey, payload);
  if (moduleKey === '互动课件') {
    coursewareData.value = {
      ...coursewareData.value,
      folders: [folder, ...coursewareData.value.folders.filter((item) => String(item.id) !== String(folder.id))]
    };
    if (selectedSpaceId.value) {
      saveCoursewareToStorage(selectedSpaceId.value, coursewareData.value);
    }
    return;
  }
  if (moduleKey === '资料') {
    const category = options?.category ?? materialsCategory.value;
    const bucket = getMaterialsBucket(category);
    const list = Array.isArray(bucket.folders) ? bucket.folders : [];
    bucket.folders = [folder, ...list.filter((item) => String(item.id) !== String(folder.id))];
    if (category === materialsCategory.value) {
      materialsData.value = bucket;
    }
    return;
  }
  if (moduleKey === '作业') {
    assignmentsData.value = {
      ...assignmentsData.value,
      folders: [folder, ...assignmentsData.value.folders.filter((item) => String(item.id) !== String(folder.id))]
    };
    return;
  }
  if (moduleKey === '话题') {
    topicsData.value = {
      ...topicsData.value,
      folders: [folder, ...topicsData.value.folders.filter((item) => String(item.id) !== String(folder.id))]
    };
  }
}

function resetCreateFolderForm() {
  createFolderForm.value = {
    name: '',
    description: ''
  };
}

function openCreateFolderDialog() {
  resetCreateFolderForm();
  createFolderDialogVisible.value = true;
}

function closeCreateFolderDialog() {
  if (createFolderSubmitting.value) return;
  createFolderDialogVisible.value = false;
}

function resetImportMaterialsForm() {
  importMaterialsForm.value = {
    courseId: '',
    selectedIds: [],
    itemType: 'attachment'
  };
  importMaterialsOptions.value = {
    attachment: [],
    folder: [],
    link: []
  };
}

function getImportOptionLabel(item) {
  const name = item?.name || item?.title || '未命名';
  const id = item?.id || '';
  return `${name}（ID: ${id}）`;
}

function normalizeImportCourse(item, source = '') {
  return {
    id: String(item?.id ?? item?.courseId ?? item?.course_id ?? ''),
    name: item?.name ?? item?.courseName ?? item?.title ?? '未命名课程',
    time: item?.time ?? item?.semester ?? item?.term ?? '',
    classes: item?.classes ?? item?.className ?? item?.class_name ?? '',
    teacher: item?.teacher ?? item?.teacherName ?? item?.teacher_name ?? '',
    source,
    raw: item
  };
}

const importableCourses = computed(() => {
  const courseMap = new Map();
  const appendCourses = (list, source) => {
    (Array.isArray(list) ? list : []).forEach((item) => {
      const course = normalizeImportCourse(item, source);
      if (!course.id) return;
      if (!courseMap.has(course.id)) {
        courseMap.set(course.id, course);
      }
    });
  };
  appendCourses(userStore.taught, '我教的');
  appendCourses(userStore.learned, '我学的');
  const boundCourseId = getBoundCourseId();
  if (boundCourseId && !courseMap.has(boundCourseId)) {
    courseMap.set(boundCourseId, {
      id: boundCourseId,
      name: currentSpaceDetail.value?.courseName ?? currentSpaceDetail.value?.prepareSpace?.courseName ?? `课程 ${boundCourseId}`,
      time: '',
      classes: '',
      teacher: '',
      source: '当前绑定课程',
      raw: null
    });
  }
  return Array.from(courseMap.values());
});

const filteredImportCourses = computed(() => {
  const keyword = String(importCourseKeyword.value || '').trim().toLowerCase();
  if (!keyword) return importableCourses.value;
  return importableCourses.value.filter((course) => {
    const text = [
      course?.id,
      course?.name,
      course?.time,
      course?.classes,
      course?.teacher,
      course?.source
    ].join(' ').toLowerCase();
    return text.includes(keyword);
  });
});

const selectedImportMaterialsOptions = computed(() => (
  importMaterialsOptions.value[importMaterialsForm.value.itemType] || []
));

const selectedImportMaterialsCourse = computed(() => (
  importableCourses.value.find((course) => String(course.id) === String(importMaterialsForm.value.courseId || '')) || null
));

const selectedImportContentCourse = computed(() => (
  importableCourses.value.find((course) => String(course.id) === String(importContentForm.value.courseId || '')) || null
));

function getImportCourseMeta(course) {
  return [course?.time, course?.classes || `课程ID：${course?.id || ''}`].filter(Boolean).join(' ');
}

function getImportCourseExtra(course) {
  return [course?.source, course?.teacher ? `负责人：${course.teacher}` : ''].filter(Boolean).join(' · ');
}

function getImportItemName(item) {
  return item?.name || item?.title || '未命名';
}

function getImportItemMeta(item) {
  return [item?.updatedAt || '暂无时间', item?.editor || ''].filter(Boolean).join(' · ');
}

function resolveInitialImportCourseId() {
  const boundCourseId = getBoundCourseId();
  if (boundCourseId && importableCourses.value.some((course) => String(course.id) === String(boundCourseId))) {
    return String(boundCourseId);
  }
  return String(importableCourses.value[0]?.id || '');
}

async function loadImportMaterialsOptions(courseId = importMaterialsForm.value.courseId) {
  const accountId = getAccountId();
  const categoryKey = importMaterialsContext.value.category;
  // #region debug-point A:load-material-options
  reportImportConflictDebug('A', 'LessonPrepPage.vue:loadImportMaterialsOptions:start', 'load materials import options', { courseId, accountId, categoryKey, selectedItemType: importMaterialsForm.value.itemType });
  // #endregion
  if (!courseId || !accountId) {
    importMaterialsOptions.value = { attachment: [], folder: [], link: [] };
    throw new Error('请选择课程后再导入资料');
  }
  importMaterialsLoading.value = true;
  try {
    const [foldersResp, attachmentsResp, linksResp] = await Promise.all([
      axios.get(`${API_BASE}/courses/${encodeURIComponent(courseId)}/materials/folders`, {
        params: { accountId, category: categoryKey }
      }),
      axios.get(`${API_BASE}/courses/${encodeURIComponent(courseId)}/materials/attachments`, {
        params: { accountId, category: categoryKey }
      }),
      axios.get(`${API_BASE}/courses/${encodeURIComponent(courseId)}/materials/links`, {
        params: { accountId, category: categoryKey }
      })
    ]);
    importMaterialsOptions.value = {
      folder: parseListResponse(foldersResp.data).map(normalizeMaterialsFolder).filter((it) => it.id),
      attachment: parseListResponse(attachmentsResp.data).map(normalizeMaterialsAttachment).filter((it) => it.id),
      link: parseListResponse(linksResp.data).map(normalizeMaterialsLink).filter((it) => it.id)
    };
    // #region debug-point A:load-material-options-result
    reportImportConflictDebug('A', 'LessonPrepPage.vue:loadImportMaterialsOptions:success', 'loaded materials import options', {
      courseId,
      categoryKey,
      folderCount: importMaterialsOptions.value.folder.length,
      attachmentCount: importMaterialsOptions.value.attachment.length,
      linkCount: importMaterialsOptions.value.link.length,
      firstAttachmentId: importMaterialsOptions.value.attachment[0]?.id || '',
      firstFolderId: importMaterialsOptions.value.folder[0]?.id || '',
      firstLinkId: importMaterialsOptions.value.link[0]?.id || ''
    });
    // #endregion
  } finally {
    importMaterialsLoading.value = false;
  }
}

async function openImportMaterialsDialog() {
  if (materialsCategory.value === MATERIALS_CATEGORY_ALL) {
    ElMessage.warning('请先选择具体资料分类，再导入资料');
    return;
  }
  if (importableCourses.value.length === 0) {
    ElMessage.warning('暂无可选课程，请先进入课程页加载课程列表');
    return;
  }
  resetImportMaterialsForm();
  importCourseKeyword.value = '';
  importMaterialsContext.value = {
    category: materialsCategory.value,
    folderId: getCurrentFolderId('资料'),
    folderName: getCurrentFolderName() || ''
  };
  importMaterialsDialogVisible.value = true;
  try {
    const initialCourseId = resolveInitialImportCourseId();
    importMaterialsForm.value.courseId = initialCourseId;
    await loadImportMaterialsOptions(initialCourseId);
  } catch (e) {
    ElMessage.error(e?.message || '导入资料列表加载失败');
    importMaterialsDialogVisible.value = false;
    return;
  }
}

function closeImportMaterialsDialog() {
  if (importMaterialsSubmitting.value) return;
  importMaterialsDialogVisible.value = false;
}

async function selectImportMaterialsCourse(courseId) {
  const nextCourseId = String(courseId || '');
  if (!nextCourseId || nextCourseId === String(importMaterialsForm.value.courseId || '')) return;
  const previousCourseId = String(importMaterialsForm.value.courseId || '');
  importMaterialsForm.value.courseId = nextCourseId;
  importMaterialsForm.value.selectedIds = [];
  try {
    await loadImportMaterialsOptions(nextCourseId);
  } catch (e) {
    importMaterialsForm.value.courseId = previousCourseId;
    ElMessage.error(e?.message || '课程资料加载失败');
  }
}

async function submitImportMaterials() {
  const spaceId = selectedSpaceId.value;
  const accountId = getAccountId();
  if (!spaceId || !accountId) return;

  const sourceIds = Array.from(new Set(
    (Array.isArray(importMaterialsForm.value.selectedIds) ? importMaterialsForm.value.selectedIds : [])
      .map((item) => String(item || '').trim())
      .filter(Boolean)
  ));
  if (sourceIds.length === 0) {
    ElMessage.warning('请先选择要导入的资料');
    return;
  }

  const categoryKey = importMaterialsContext.value.category;
  const folderId = importMaterialsContext.value.folderId;
  const itemType = importMaterialsForm.value.itemType || 'attachment';
  const selectedCourseId = String(importMaterialsForm.value.courseId || '').trim();
  const boundCourseId = getBoundCourseId();
  if (!selectedCourseId) {
    ElMessage.warning('请先选择来源课程');
    return;
  }

  try {
    importMaterialsSubmitting.value = true;
    let successCount = 0;
    let failedCount = 0;
    let firstErrorMessage = '';
    for (const sourceId of sourceIds) {
      try {
        const selectedItem = selectedImportMaterialsOptions.value.find((item) => String(item?.id) === sourceId) || null;
        const normalizedTargetFolderId = normalizeId(folderId) === 'root' ? null : folderId;
        if (selectedCourseId && boundCourseId && selectedCourseId !== boundCourseId) {
          if (itemType === 'attachment') {
            await copyAttachmentToPrepSpace(spaceId, accountId, selectedCourseId, selectedItem || { id: sourceId }, categoryKey, normalizedTargetFolderId);
          } else if (itemType === 'link') {
            await copyLinkToPrepSpace(spaceId, accountId, selectedItem || { id: sourceId }, categoryKey, normalizedTargetFolderId);
          } else {
            throw new Error('跨课程导入文件夹暂不支持，请先导入具体资料或外链');
          }
          successCount += 1;
          continue;
        }
        // #region debug-point A:submit-material-import
        reportImportConflictDebug('A', 'LessonPrepPage.vue:submitImportMaterials:request', 'submit materials import request', {
          spaceId,
          accountId,
          selectedCourseId,
          sourceId,
          itemType,
          categoryKey,
          folderId: normalizedTargetFolderId
        });
        // #endregion
        const response = await axios.post(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/materials/import/from-course`, {
          accountId,
          courseId: selectedCourseId,
          sourceCourseId: selectedCourseId,
          itemId: sourceId,
          itemType,
          mode: 'import',
          category: categoryKey,
          targetFolderId: normalizedTargetFolderId
        });
        const data = response?.data ?? {};
        if (data?.success === false) {
          throw new Error(data?.message || '导入资料失败');
        }
        // #region debug-point A:submit-material-import-success
        reportImportConflictDebug('A', 'LessonPrepPage.vue:submitImportMaterials:success', 'materials import request succeeded', { selectedCourseId, sourceId, responseData: data });
        // #endregion
        successCount += 1;
      } catch (error) {
        // #region debug-point A:submit-material-import-error
        reportImportConflictDebug('A', 'LessonPrepPage.vue:submitImportMaterials:error', 'materials import request failed', {
          selectedCourseId,
          sourceId,
          itemType,
          categoryKey,
          status: error?.response?.status,
          message: error?.response?.data?.message || error?.message || ''
        });
        // #endregion
        failedCount += 1;
        if (!firstErrorMessage) {
          firstErrorMessage = error?.response?.data?.message || error?.message || '导入资料失败';
        }
      }
    }
    if (successCount === 0) {
      throw new Error(firstErrorMessage || '导入资料失败');
    }
    importMaterialsDialogVisible.value = false;
    resetImportMaterialsForm();
    await fetchMaterialsBySpace(spaceId, categoryKey);
    if (failedCount > 0) {
      ElMessage.warning(`已导入 ${successCount} 项，${failedCount} 项失败：${firstErrorMessage}`);
      return;
    }
    ElMessage.success(sourceIds.length > 1 ? `成功导入 ${successCount} 项资料` : '资料导入成功');
  } catch (e) {
    console.error('导入资料失败：', e);
    const message = e?.response?.data?.message || e?.message || '导入资料失败';
    const status = e?.response?.status;
    if (status === 404 || status === 405) {
      ElMessage.error(`${message}（后端导入接口不存在/方法不匹配，请确认导入接口路径与方法）`);
      return;
    }
    if (String(message).includes('课程附件不存在')) {
      ElMessage.error(`${message}（请确认输入的附件ID属于当前分类「${categoryKey}」，需要先切到对应分类再导入）`);
      return;
    }
    ElMessage.error(message);
  } finally {
    importMaterialsSubmitting.value = false;
  }
}

function resetImportContentForm() {
  importContentForm.value = {
    courseId: '',
    selectedIds: []
  };
  importContentOptions.value = [];
}

async function loadImportContentOptions(tabKey, courseId = importContentForm.value.courseId) {
  const accountId = getAccountId();
  // #region debug-point E:load-content-options
  reportImportConflictDebug('E', 'LessonPrepPage.vue:loadImportContentOptions:start', 'load content import options', { tabKey, courseId, accountId });
  // #endregion
  if (!courseId) {
    importContentOptions.value = [];
    throw new Error('请选择课程后再导入内容');
  }
  importContentLoading.value = true;
  try {
    if (tabKey === '作业') {
      const response = await axios.post(`${API_BASE}/assignment-details`, {
        id: courseId,
        accountId
      });
      const list = parseListResponse(response.data).length > 0
        ? parseListResponse(response.data)
        : Array.isArray(response?.data?.assignments) ? response.data.assignments : [];
      importContentOptions.value = list.map(normalizeAssignmentItem).filter((it) => it.id);
      // #region debug-point E:load-content-options-result
      reportImportConflictDebug('E', 'LessonPrepPage.vue:loadImportContentOptions:assignment-success', 'loaded assignment import options', {
        tabKey,
        courseId,
        itemCount: importContentOptions.value.length,
        firstItemId: importContentOptions.value[0]?.id || ''
      });
      // #endregion
      return;
    }
    const response = await axios.post(`${API_BASE}/topic/list`, { courseId });
    const list = parseListResponse(response.data).length > 0
      ? parseListResponse(response.data)
      : Array.isArray(response?.data?.topics) ? response.data.topics : [];
    importContentOptions.value = list.map(normalizeTopicItem).filter((it) => it.id);
    // #region debug-point E:load-content-options-result
    reportImportConflictDebug('E', 'LessonPrepPage.vue:loadImportContentOptions:topic-success', 'loaded topic import options', {
      tabKey,
      courseId,
      itemCount: importContentOptions.value.length,
      firstItemId: importContentOptions.value[0]?.id || ''
    });
    // #endregion
  } finally {
    importContentLoading.value = false;
  }
}

async function openImportContentDialog() {
  const tabKey = activeTab.value;
  if (tabKey !== '作业' && tabKey !== '话题') return;
  if (importableCourses.value.length === 0) {
    ElMessage.warning('暂无可选课程，请先进入课程页加载课程列表');
    return;
  }
  resetImportContentForm();
  importCourseKeyword.value = '';
  importContentContext.value = {
    tab: tabKey,
    folderId: getCurrentFolderId(tabKey),
    folderName: getCurrentFolderName() || ''
  };
  importContentDialogVisible.value = true;
  try {
    const initialCourseId = resolveInitialImportCourseId();
    importContentForm.value.courseId = initialCourseId;
    await loadImportContentOptions(tabKey, initialCourseId);
  } catch (e) {
    ElMessage.error(e?.message || '导入列表加载失败');
    importContentDialogVisible.value = false;
    return;
  }
}

function closeImportContentDialog() {
  if (importContentSubmitting.value) return;
  importContentDialogVisible.value = false;
}

async function selectImportContentCourse(courseId) {
  const nextCourseId = String(courseId || '');
  if (!nextCourseId || nextCourseId === String(importContentForm.value.courseId || '')) return;
  const previousCourseId = String(importContentForm.value.courseId || '');
  importContentForm.value.courseId = nextCourseId;
  importContentForm.value.selectedIds = [];
  try {
    await loadImportContentOptions(importContentContext.value.tab, nextCourseId);
  } catch (e) {
    importContentForm.value.courseId = previousCourseId;
    ElMessage.error(e?.message || '课程内容加载失败');
  }
}

async function submitImportContent() {
  const spaceId = selectedSpaceId.value;
  const accountId = getAccountId();
  if (!spaceId || !accountId) return;

  const tabKey = importContentContext.value.tab;
  if (tabKey !== '作业' && tabKey !== '话题') return;

  const sourceIds = Array.from(new Set(
    (Array.isArray(importContentForm.value.selectedIds) ? importContentForm.value.selectedIds : [])
      .map((item) => String(item || '').trim())
      .filter(Boolean)
  ));
  if (sourceIds.length === 0) {
    ElMessage.warning(tabKey === '作业' ? '请先选择要导入的作业' : '请先选择要导入的话题');
    return;
  }

  const folderId = importContentContext.value.folderId;
  const selectedCourseId = String(importContentForm.value.courseId || '').trim();
  const boundCourseId = getBoundCourseId();
  if (!selectedCourseId) {
    ElMessage.warning('请先选择来源课程');
    return;
  }
  try {
    importContentSubmitting.value = true;
    if (tabKey === '作业') {
      let successCount = 0;
      let failedCount = 0;
      let firstErrorMessage = '';
      for (const sourceId of sourceIds) {
        try {
          if (selectedCourseId && boundCourseId && selectedCourseId !== boundCourseId) {
            const sourceItem = importContentOptions.value.find((item) => String(item?.id) === sourceId);
            await cloneAssignmentToBoundCourse(spaceId, accountId, boundCourseId, sourceItem || { id: sourceId, name: '未命名作业', content: '' });
            successCount += 1;
            continue;
          }
          const payload = {
            accountId,
            courseId: selectedCourseId,
            sourceCourseId: selectedCourseId,
            assignmentId: sourceId,
            mode: 'import',
            targetFolderId: normalizeId(folderId) === 'root' ? null : folderId
          };
          // #region debug-point E:submit-assignment-import
          reportImportConflictDebug('E', 'LessonPrepPage.vue:submitImportContent:assignment-request', 'submit assignment import request', { spaceId, selectedCourseId, sourceId, payload });
          // #endregion
          const response = await requestFirstAvailable([
            () => axios.post(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/assignments/import`, payload),
            () => axios.put(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/assignments/import`, payload),
            () => axios.post(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/assignment/import`, payload),
            () => axios.put(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/assignment/import`, payload),
            () => axios.post(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/assignments/import/from-course`, payload),
            () => axios.post(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/assignment/import/from-course`, payload)
          ]);
          const data = response?.data ?? {};
          if (data?.success === false) {
            throw new Error(data?.message || '作业导入失败');
          }
          // #region debug-point E:submit-assignment-import-success
          reportImportConflictDebug('E', 'LessonPrepPage.vue:submitImportContent:assignment-success', 'assignment import request succeeded', { selectedCourseId, sourceId, responseData: data });
          // #endregion
          successCount += 1;
        } catch (error) {
          // #region debug-point E:submit-assignment-import-error
          reportImportConflictDebug('E', 'LessonPrepPage.vue:submitImportContent:assignment-error', 'assignment import request failed', {
            selectedCourseId,
            sourceId,
            status: error?.response?.status,
            message: error?.response?.data?.message || error?.message || ''
          });
          // #endregion
          failedCount += 1;
          if (!firstErrorMessage) {
            firstErrorMessage = error?.response?.data?.message || error?.message || '作业导入失败';
          }
        }
      }
      if (successCount === 0) {
        throw new Error(firstErrorMessage || '作业导入失败');
      }
      importContentDialogVisible.value = false;
      resetImportContentForm();
      await refreshSpaceAfterMutation(failedCount > 0 ? `已导入 ${successCount} 项作业` : (sourceIds.length > 1 ? `成功导入 ${successCount} 项作业` : '作业导入成功'));
      if (failedCount > 0) {
        ElMessage.warning(`已导入 ${successCount} 项，${failedCount} 项失败：${firstErrorMessage}`);
      }
      return;
    }
    let successCount = 0;
    let failedCount = 0;
    let firstErrorMessage = '';
    for (const sourceId of sourceIds) {
      try {
        if (selectedCourseId && boundCourseId && selectedCourseId !== boundCourseId) {
          const sourceItem = importContentOptions.value.find((item) => String(item?.id) === sourceId);
          await cloneTopicToBoundCourse(spaceId, accountId, boundCourseId, sourceItem || { id: sourceId, name: '未命名话题', content: '' });
          successCount += 1;
          continue;
        }
        const payload = {
          accountId,
          courseId: selectedCourseId,
          sourceCourseId: selectedCourseId,
          topicId: sourceId,
          mode: 'import',
          targetFolderId: normalizeId(folderId) === 'root' ? null : folderId
        };
        // #region debug-point E:submit-topic-import
        reportImportConflictDebug('E', 'LessonPrepPage.vue:submitImportContent:topic-request', 'submit topic import request', { spaceId, selectedCourseId, sourceId, payload });
        // #endregion
        const response = await requestFirstAvailable([
          () => axios.post(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/topics/import`, payload),
          () => axios.put(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/topics/import`, payload),
          () => axios.post(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/topic/import`, payload),
          () => axios.put(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/topic/import`, payload),
          () => axios.post(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/topics/import/from-course`, payload),
          () => axios.post(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/topic/import/from-course`, payload)
        ]);
        const data = response?.data ?? {};
        if (data?.success === false) {
          throw new Error(data?.message || '话题导入失败');
        }
        // #region debug-point E:submit-topic-import-success
        reportImportConflictDebug('E', 'LessonPrepPage.vue:submitImportContent:topic-success', 'topic import request succeeded', { selectedCourseId, sourceId, responseData: data });
        // #endregion
        successCount += 1;
      } catch (error) {
        // #region debug-point E:submit-topic-import-error
        reportImportConflictDebug('E', 'LessonPrepPage.vue:submitImportContent:topic-error', 'topic import request failed', {
          selectedCourseId,
          sourceId,
          status: error?.response?.status,
          message: error?.response?.data?.message || error?.message || ''
        });
        // #endregion
        failedCount += 1;
        if (!firstErrorMessage) {
          firstErrorMessage = error?.response?.data?.message || error?.message || '话题导入失败';
        }
      }
    }
    if (successCount === 0) {
      throw new Error(firstErrorMessage || '话题导入失败');
    }
    importContentDialogVisible.value = false;
    resetImportContentForm();
    await refreshSpaceAfterMutation(failedCount > 0 ? `已导入 ${successCount} 项话题` : (sourceIds.length > 1 ? `成功导入 ${successCount} 项话题` : '话题导入成功'));
    if (failedCount > 0) {
      ElMessage.warning(`已导入 ${successCount} 项，${failedCount} 项失败：${firstErrorMessage}`);
    }
  } catch (e) {
    console.error('导入失败：', e);
    const message = e?.response?.data?.message || e?.message || '导入失败';
    const status = e?.response?.status;
    if (status === 404 || status === 405) {
      ElMessage.error(`${message}（后端导入接口不存在/方法不匹配，请确认导入接口路径与方法）`);
      return;
    }
    ElMessage.error(message);
  } finally {
    importContentSubmitting.value = false;
  }
}

function removeOptimisticUploadedFiles(moduleKey, tempIds, options = {}) {
  if (!Array.isArray(tempIds) || tempIds.length === 0) return;
  if (moduleKey === '互动课件') {
    coursewareData.value = {
      ...coursewareData.value,
      items: coursewareData.value.items.filter((item) => !tempIds.includes(String(item.id)))
    };
    if (selectedSpaceId.value) {
      saveCoursewareToStorage(selectedSpaceId.value, coursewareData.value);
    }
    return;
  }
  if (moduleKey === '资料') {
    const category = options?.category ?? materialsCategory.value;
    const bucket = getMaterialsBucket(category);
    const list = Array.isArray(bucket.attachments) ? bucket.attachments : [];
    bucket.attachments = list.filter((item) => !tempIds.includes(String(item.id)));
    if (category === materialsCategory.value) {
      materialsData.value = bucket;
    }
  }
}

function getMaterialsBucket(category) {
  const key = String(category || '');
  if (!materialsCacheByCategory.value[key]) {
    materialsCacheByCategory.value = {
      ...materialsCacheByCategory.value,
      [key]: { folders: [], attachments: [], links: [] }
    };
  }
  return materialsCacheByCategory.value[key];
}

function mergeOptimisticFolders(existingFolders, fetchedFolders) {
  const fetched = Array.isArray(fetchedFolders) ? fetchedFolders : [];
  const fetchedIdSet = new Set(fetched.map((item) => String(item?.id || '')));
  const fetchedKeySet = new Set(fetched.map((item) => `${item?.name || ''}__${normalizeId(item?.parentId)}`));
  const existing = Array.isArray(existingFolders) ? existingFolders : [];
  const keep = existing.filter((item) => {
    const id = String(item?.id || '');
    const isLocal = id.startsWith('temp-folder-') || Boolean(item?.raw?.localCreated);
    if (!isLocal) return false;
    if (id && fetchedIdSet.has(id)) return false;
    const key = `${item?.name || ''}__${normalizeId(item?.parentId)}`;
    return !fetchedKeySet.has(key);
  });
  return [...keep, ...fetched];
}

function mergeOptimisticMaterials(existingAttachments, fetchedAttachments) {
  const serverKeys = new Set(
    fetchedAttachments.map((item) => `${item.name || ''}__${normalizeId(item.folderId)}__${item.size || ''}`)
  );
  const optimisticItems = (existingAttachments || []).filter((item) => {
    if (!item?.raw?.optimistic) return false;
    const key = `${item.name || ''}__${normalizeId(item.folderId)}__${item.size || ''}`;
    return !serverKeys.has(key);
  });
  return [...optimisticItems, ...fetchedAttachments];
}

function mergeOptimisticCoursewareItems(existingItems, fetchedItems) {
  const fetched = Array.isArray(fetchedItems) ? fetchedItems : [];
  const serverKeys = new Set(
    fetched.map((item) => `${item.name || ''}__${normalizeId(item.folderId)}__${item.size || ''}`)
  );
  const existing = Array.isArray(existingItems) ? existingItems : [];
  const keep = existing.filter((item) => {
    if (!item?.raw?.optimistic && !String(item?.id || '').startsWith('temp-courseware-')) return false;
    const key = `${item.name || ''}__${normalizeId(item.folderId)}__${item.size || ''}`;
    return !serverKeys.has(key);
  });
  return [...keep, ...fetched];
}

const visibleSpaces = computed(() => {
  const list = Array.isArray(prepSpaces.value) ? prepSpaces.value : [];
  const filteredByGroup = selectedGroup.value === '全部'
    ? list
    : list.filter((item) => item.group === selectedGroup.value);

  if (!leftKeyword.value.trim()) return filteredByGroup;
  return filteredByGroup.filter((item) => item.name.includes(leftKeyword.value.trim()));
});

const currentSpace = computed(() => {
  const id = String(selectedSpaceId.value || '');
  if (!id) return null;
  return prepSpaces.value.find((it) => String(it.id) === id) || null;
});

const displayName = computed(() => userStore.account?.name || '教师用户');
const activeModuleConfig = computed(() => moduleConfigMap[activeTab.value] || moduleConfigMap['互动课件']);
const unreadNotificationCount = computed(() => notifications.value.filter(item => !item?.readStatus).length);

function filterByKeyword(list, getter) {
  const keyword = tableKeyword.value.trim();
  if (!keyword) return list;
  return list.filter((item) => getter(item).includes(keyword));
}

function getCurrentFolderId(tab = activeTab.value) {
  return currentFolderMap.value[tab] || 'root';
}

function setCurrentFolder(tab, folderId) {
  currentFolderMap.value = {
    ...currentFolderMap.value,
    [tab]: normalizeId(folderId)
  };
}

function getCurrentFolderInfo(tab, folders) {
  const folderId = getCurrentFolderId(tab);
  if (folderId === 'root') return null;
  return folders.find((item) => item.id === folderId) || null;
}

function getParentFolderId(tab, folders) {
  const currentFolder = getCurrentFolderInfo(tab, folders);
  return currentFolder?.parentId || 'root';
}

function filterFoldersForDisplay(folders, tab) {
  const currentFolderId = getCurrentFolderId(tab);
  return filterByKeyword(
    folders.filter((item) => normalizeId(item.parentId) === currentFolderId),
    (item) => item.name || ''
  );
}

function filterItemsForDisplay(items, tab, getter) {
  const currentFolderId = getCurrentFolderId(tab);
  return filterByKeyword(
    items.filter((item) => normalizeId(item.folderId) === currentFolderId),
    getter
  );
}

const visibleCoursewareFolders = computed(() => filterFoldersForDisplay(coursewareData.value.folders, '互动课件'));
const visibleCoursewareItems = computed(() => filterItemsForDisplay(coursewareData.value.items, '互动课件', (item) => item.name || ''));
const visibleMaterialFolders = computed(() => filterFoldersForDisplay(materialsData.value.folders, '资料'));
const visibleMaterialAttachments = computed(() => filterItemsForDisplay(materialsData.value.attachments, '资料', (item) => item.name || ''));
const visibleMaterialLinks = computed(() => filterItemsForDisplay(materialsData.value.links, '资料', (item) => item.title || ''));
const visibleTopicFolders = computed(() => filterFoldersForDisplay(topicsData.value.folders, '话题'));
const visibleTopicItems = computed(() => filterItemsForDisplay(topicsData.value.items, '话题', (item) => item.name || ''));
const visibleAssignmentFolders = computed(() => filterFoldersForDisplay(assignmentsData.value.folders, '作业'));
const visibleAssignmentItems = computed(() => filterItemsForDisplay(assignmentsData.value.items, '作业', (item) => item.name || ''));

const currentMode = computed(() => {
  const path = route.path || '';
  if (path.endsWith('/members')) return 'members';
  if (path.endsWith('/logs')) return 'logs';
  return 'main';
});

function handleTopMenuClick(menuKey) {
  if (menuKey === 'course') {
    router.push('/course');
    return;
  }

  if (menuKey === 'prep') {
    router.push('/lesson-prep');
  }
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

function closeSpaceActionMenu() {
  spaceActionMenuId.value = '';
}

function toggleSpaceActionMenu(spaceId) {
  const id = String(spaceId || '');
  spaceActionMenuId.value = spaceActionMenuId.value === id ? '' : id;
}

function resolveSpaceOwnerId(item) {
  if (!item) return '';
  return String(
    item.ownerId
    || item.raw?.ownerId
    || item.raw?.owner_id
    || currentSpaceDetail.value?.ownerId
    || currentSpaceDetail.value?.owner_id
    || ''
  );
}

function isSpaceOwner(item) {
  const accountId = getAccountId();
  const ownerId = resolveSpaceOwnerId(item);
  return Boolean(accountId) && Boolean(ownerId) && accountId === ownerId;
}

function handleDocumentClick(event) {
  const target = event?.target;
  const inMoreWrap = target && typeof target.closest === 'function'
    ? target.closest('.prep-sidebar__more-wrap')
    : null;
  if (!inMoreWrap) {
    closeSpaceActionMenu();
  }
}

function buildSpaceBasePath(spaceId) {
  const id = String(spaceId || '').trim();
  return id ? `/lesson-prep/${encodeURIComponent(id)}` : '/lesson-prep';
}

function navigateToSpace(spaceId) {
  const base = buildSpaceBasePath(spaceId);
  router.push({ path: base, query: { ...route.query } });
}

function navigateToMembers() {
  const id = selectedSpaceId.value || currentSpace.value?.id || '';
  if (!id) return;
  router.push({ path: `${buildSpaceBasePath(id)}/members`, query: { ...route.query } });
}

function navigateToLogs() {
  const id = selectedSpaceId.value || currentSpace.value?.id || '';
  if (!id) return;
  router.push({ path: `${buildSpaceBasePath(id)}/logs`, query: { ...route.query } });
}

function navigateBackToSpace() {
  const id = selectedSpaceId.value || currentSpace.value?.id || '';
  router.push({ path: buildSpaceBasePath(id), query: { ...route.query } });
}

function setActiveTab(tabLabel) {
  activeTab.value = tabLabel;
  setCurrentFolder(tabLabel, 'root');
  router.replace({ query: { ...route.query, tab: tabLabel } });
}

function getAccountId() {
  return userStore.account?.accountId || '';
}

function getBoundCourseId() {
  const detail = currentSpaceDetail.value;
  const rawCourseId = detail?.courseId
    ?? detail?.course_id
    ?? detail?.prepareSpace?.courseId
    ?? detail?.prepareSpace?.course_id
    ?? detail?.data?.courseId
    ?? detail?.data?.course_id
    ?? detail?.data?.prepareSpace?.courseId
    ?? detail?.data?.prepareSpace?.course_id
    ?? currentSpace.value?.raw?.courseId
    ?? currentSpace.value?.raw?.course_id
    ?? '';
  return String(rawCourseId || '').trim();
}

function resetCreatePrepSpaceForm() {
  createPrepSpaceForm.value = {
    name: '',
    spaceType: '个人',
    courseId: currentSpaceDetail.value?.courseId || '',
    description: ''
  };
}

function toggleCreatePrepSpaceForm() {
  createPrepSpaceFormVisible.value = !createPrepSpaceFormVisible.value;
  if (createPrepSpaceFormVisible.value) {
    resetCreatePrepSpaceForm();
  }
}

function cancelCreatePrepSpace() {
  createPrepSpaceFormVisible.value = false;
  resetCreatePrepSpaceForm();
}

async function createPrepSpace() {
  const ownerId = getAccountId();
  if (!ownerId) {
    ElMessage.error('未获取到当前账号');
    return;
  }
  const name = createPrepSpaceForm.value.name?.trim();
  const spaceType = createPrepSpaceForm.value.spaceType || '个人';
  const courseId = createPrepSpaceForm.value.courseId?.trim() || '';
  const description = createPrepSpaceForm.value.description?.trim() || '';
  if (!name) {
    ElMessage.warning('请输入备课区名称');
    return;
  }

  try {
    createPrepSpaceSubmitting.value = true;
    const payload = {
      ownerId,
      accountId: ownerId,
      name,
      spaceType,
      description
    };
    if (courseId) {
      payload.courseId = courseId;
    }

    const response = await axios.post(`${API_BASE}/prepare-spaces`, payload);
    const data = response?.data ?? {};
    if (data?.success === false) {
      throw new Error(data?.message || '新建备课区失败');
    }

    ElMessage.success(data?.message || '新建备课区成功');
    await fetchPrepSpaces();

    const createdSpace = data?.prepareSpace ? normalizeSpace(data.prepareSpace) : null;
    if (createdSpace?.id) {
      const exists = prepSpaces.value.some((item) => String(item.id) === String(createdSpace.id));
      if (!exists) {
        prepSpaces.value = [...prepSpaces.value, createdSpace];
      }
    }

    const target =
      (createdSpace?.id ? prepSpaces.value.find((item) => String(item.id) === String(createdSpace.id)) : null)
      || [...prepSpaces.value].reverse().find((item) => item.name === name.trim())
      || prepSpaces.value[0];

    if (target?.id) {
      selectedSpaceId.value = target.id;
      await router.replace({ path: buildSpaceBasePath(target.id), query: { ...route.query } });
      await fetchSpaceDetail(target.id);
      await refreshActiveTabData();
      cancelCreatePrepSpace();
      return;
    }

    ElMessage.warning('后端未返回新备课区，请检查接口返回或刷新列表');
  } catch (e) {
    console.error('新建备课区失败：', e);
    const rawMessage = e?.response?.data?.message || e?.message || '新建备课区失败';
    const friendlyMessage = String(rawMessage).includes('课程')
      ? `${rawMessage}，个人备课可将课程ID留空，或填写真实存在的课程ID`
      : rawMessage;
    ElMessage.error(friendlyMessage);
  } finally {
    createPrepSpaceSubmitting.value = false;
  }
}

async function deletePrepSpace(item) {
  const spaceId = String(item?.id || '');
  const accountId = getAccountId();
  if (!spaceId || !accountId) {
    ElMessage.error('未获取到当前备课区或账号信息');
    return;
  }
  if (!isSpaceOwner(item)) {
    ElMessage.warning('仅创建者可删除备课区');
    return;
  }
  closeSpaceActionMenu();
  let confirmed = false;
  try {
    await ElMessageBox.confirm(
      `删除“${item?.name || '当前备课区'}”后，关联成员、资料、作业、话题和文件都会一起清理，确定继续吗？`,
      '删除备课区',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        distinguishCancelAndClose: true
      }
    );
    confirmed = true;
  } catch (action) {
    if (action === 'cancel' || action === 'close') {
      return;
    }
    ElMessage.error('删除确认弹窗打开失败');
    return;
  }

  if (!confirmed) {
    return;
  }

  try {
    deletingSpaceId.value = spaceId;
    closeSpaceActionMenu();
    const response = await axios.delete(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}`, {
      params: { accountId }
    });
    const data = response?.data ?? {};
    if (data?.success === false) {
      throw new Error(data?.message || '删除备课区失败');
    }

    const deletingCurrent = String(selectedSpaceId.value || '') === spaceId || String(route.params?.spaceId || '') === spaceId;
    const nextSpaces = (Array.isArray(prepSpaces.value) ? prepSpaces.value : []).filter((space) => String(space?.id) !== spaceId);
    prepSpaces.value = nextSpaces;
    ElMessage.success(data?.message || '删除备课区成功');

    if (!deletingCurrent) {
      try {
        await fetchPrepSpaces();
        prepSpaces.value = (Array.isArray(prepSpaces.value) ? prepSpaces.value : []).filter((space) => String(space?.id) !== spaceId);
        if ((Array.isArray(prepSpaces.value) ? prepSpaces.value : []).some((space) => String(space?.id) === spaceId)) {
          window.location.reload();
        }
      } catch {
        return;
      }
      return;
    }

    const nextSpace = nextSpaces[0] || null;
    if (!nextSpace?.id) {
      selectedSpaceId.value = '';
      currentSpaceDetail.value = null;
      spaceMembers.value = [];
      spaceLogs.value = [];
      resetTabData();
      await router.replace({ path: '/lesson-prep', query: { ...route.query } });
      return;
    }

    selectedSpaceId.value = nextSpace.id;
    await router.replace({ path: buildSpaceBasePath(nextSpace.id), query: { ...route.query } });
    try {
      await fetchPrepSpaces();
      prepSpaces.value = (Array.isArray(prepSpaces.value) ? prepSpaces.value : []).filter((space) => String(space?.id) !== spaceId);
      if ((Array.isArray(prepSpaces.value) ? prepSpaces.value : []).some((space) => String(space?.id) === spaceId)) {
        window.location.replace(buildSpaceBasePath(nextSpace.id));
      }
    } catch {
      return;
    }
  } catch (e) {
    console.error('删除备课区失败：', e);
    ElMessage.error(e?.response?.data?.message || e?.message || '删除备课区失败');
  } finally {
    deletingSpaceId.value = '';
  }
}

function resetTabData() {
  coursewareData.value = { folders: [], items: [] };
  materialsData.value = { folders: [], attachments: [], links: [] };
  topicsData.value = { folders: [], items: [] };
  assignmentsData.value = { folders: [], items: [] };
  tabErrorMessage.value = '';
}

function normalizeMaterialCategory(value, fallback = '') {
  const raw = value ?? fallback ?? '';
  return String(raw || '').trim();
}

function normalizeMaterialsFolder(item) {
  const category = normalizeMaterialCategory(
    item?.category ?? item?.materialCategory ?? item?.material_category ?? item?.folderCategory ?? item?.folder_category,
    item?.raw?.category ?? item?.raw?.materialCategory
  );
  return {
    id: String(item?.id ?? item?.folderId ?? item?.folder_id ?? ''),
    name: item?.name ?? item?.folderName ?? '未命名文件夹',
    parentId: normalizeId(item?.parentId ?? item?.parent_id),
    updatedAt: item?.updatedAt ?? item?.updateTime ?? item?.createdAt ?? item?.createTime ?? '',
    category,
    editor: item?.editor
      ?? item?.editorName
      ?? item?.createdByName
      ?? item?.created_by_name
      ?? item?.creatorName
      ?? item?.creator_name
      ?? item?.teacherName
      ?? item?.teacher_name
      ?? item?.userName
      ?? item?.user_name
      ?? item?.nameOfCreator
      ?? item?.createdBy
      ?? item?.created_by
      ?? '',
    raw: item
  };
}

function normalizeMaterialsAttachment(item) {
  const category = normalizeMaterialCategory(
    item?.category ?? item?.materialCategory ?? item?.material_category ?? item?.attachmentCategory ?? item?.attachment_category,
    item?.raw?.category ?? item?.raw?.materialCategory
  );
  const rawSize = item?.size ?? item?.fileSize ?? item?.file_size ?? '';
  return {
    id: String(item?.id ?? item?.attachmentId ?? item?.attachment_id ?? item?.materialId ?? item?.material_id ?? ''),
    name: item?.name
      ?? item?.fileName
      ?? item?.attachmentName
      ?? item?.originalName
      ?? item?.original_name
      ?? item?.storedName
      ?? item?.stored_name
      ?? '未命名资料',
    size: formatFileSize(rawSize) || String(rawSize || ''),
    folderId: normalizeId(item?.folderId ?? item?.folder_id),
    updatedAt: item?.updatedAt ?? item?.updateTime ?? item?.gmtModified ?? item?.createdAt ?? item?.createTime ?? item?.gmtCreate ?? '',
    category,
    editor: item?.editor
      ?? item?.editorName
      ?? item?.createdByName
      ?? item?.created_by_name
      ?? item?.creatorName
      ?? item?.creator_name
      ?? item?.teacherName
      ?? item?.teacher_name
      ?? item?.userName
      ?? item?.user_name
      ?? item?.createdBy
      ?? item?.created_by
      ?? '',
    raw: item
  };
}

function normalizeMaterialsLink(item) {
  const category = normalizeMaterialCategory(
    item?.category ?? item?.materialCategory ?? item?.material_category ?? item?.linkCategory ?? item?.link_category,
    item?.raw?.category ?? item?.raw?.materialCategory
  );
  return {
    id: String(item?.id ?? item?.linkId ?? item?.link_id ?? ''),
    title: item?.title ?? item?.name ?? item?.linkTitle ?? '未命名外链',
    url: item?.url ?? item?.linkUrl ?? item?.href ?? '',
    folderId: normalizeId(item?.folderId ?? item?.folder_id),
    updatedAt: item?.updatedAt ?? item?.updateTime ?? item?.createdAt ?? item?.createTime ?? '',
    category,
    editor: item?.editor ?? item?.createdBy ?? item?.created_by ?? '',
    raw: item
  };
}

function normalizeTopicItem(item) {
  return {
    id: String(item?.id ?? item?.topicId ?? ''),
    name: item?.title ?? item?.name ?? '未命名话题',
    folderId: normalizeId(item?.folderId ?? item?.folder_id),
    updatedAt: item?.time ?? item?.updatedAt ?? item?.updateTime ?? item?.createdAt ?? item?.createTime ?? '',
    editor: item?.publisher ?? item?.author ?? item?.userName ?? item?.createdBy ?? item?.created_by ?? '',
    content: item?.content ?? '',
    raw: item
  };
}

function normalizeAssignmentItem(item) {
  return {
    id: String(item?.assignmentId ?? item?.id ?? ''),
    name: item?.title ?? item?.name ?? '未命名作业',
    folderId: normalizeId(item?.folderId ?? item?.folder_id),
    score: item?.totalScore ?? item?.score ?? '',
    updatedAt: item?.publishTime ?? item?.updatedAt ?? item?.updateTime ?? item?.createdAt ?? item?.createTime ?? '',
    editor: item?.teacherName ?? item?.publisher ?? item?.creator ?? item?.createdBy ?? item?.created_by ?? '',
    content: item?.content ?? '',
    raw: item
  };
}

async function requestFirstAvailable(requests) {
  let fallbackError = null;
  for (const requestFactory of requests) {
    try {
      return await requestFactory();
    } catch (error) {
      const status = error?.response?.status;
      if (status === 404 || status === 405) {
        fallbackError = error;
        continue;
      }
      throw error;
    }
  }
  if (fallbackError) throw fallbackError;
  throw new Error('未找到可用接口');
}

async function fetchCoursewaresBySpace(spaceId) {
  const accountId = getAccountId();
  if (!spaceId || !accountId) return;
  coursewareLoading.value = true;
  tabErrorMessage.value = '';
  try {
    const cached = loadCoursewareFromStorage(spaceId);
    if (cached) {
      coursewareData.value = cached;
    }

    const existingFolders = cached?.folders ?? (Array.isArray(coursewareData.value.folders) ? coursewareData.value.folders : []);
    const existingItems = cached?.items ?? (Array.isArray(coursewareData.value.items) ? coursewareData.value.items : []);
    let folders = existingFolders;
    let items = existingItems;
    let fetchedAny = false;

    try {
      const foldersResp = await requestFirstAvailable([
        () => axios.get(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/courseware/folders`, { params: { accountId } }),
        () => axios.get(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/courseware-folders`, { params: { accountId } })
      ]);
      folders = parseListResponse(foldersResp.data).map(normalizeGenericFolder).filter((it) => it.id);
      fetchedAny = true;
    } catch (e) {
      const status = e?.response?.status;
      if (status !== 404 && status !== 405) throw e;
    }

    try {
      const itemsResp = await requestFirstAvailable([
        () => axios.get(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/courseware/items`, { params: { accountId } }),
        () => axios.get(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/courseware-items`, { params: { accountId } }),
        () => axios.get(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/courseware`, { params: { accountId } })
      ]);
      items = parseListResponse(itemsResp.data).map(normalizeCoursewareItem).filter((it) => it.id);
      fetchedAny = true;
    } catch (e) {
      const status = e?.response?.status;
      if (status !== 404 && status !== 405) throw e;
    }

    if (fetchedAny) {
      coursewareData.value = {
        folders: mergeOptimisticFolders(existingFolders, folders),
        items: mergeOptimisticCoursewareItems(existingItems, items)
      };
      saveCoursewareToStorage(spaceId, coursewareData.value);
    } else if (cached) {
      coursewareData.value = cached;
    }
  } catch (e) {
    console.error('备课区互动课件加载失败：', e);
    const status = e?.response?.status;
    if (status !== 404 && status !== 405) {
      tabErrorMessage.value = `互动课件请求失败：${e?.response?.data?.message || e?.message || '未知错误'}`;
    }
  } finally {
    coursewareLoading.value = false;
  }
}

async function fetchMaterialsBySpace(spaceId, category = materialsCategory.value) {
  const accountId = getAccountId();
  if (!spaceId || !accountId) return;
  if (String(category || '') === MATERIALS_CATEGORY_ALL) {
    await fetchMaterialsAllBySpace(spaceId);
    return;
  }
  materialsLoading.value = true;
  tabErrorMessage.value = '';
  const categoryKey = String(category || '');
  const bucket = getMaterialsBucket(categoryKey);
  const existingAttachments = Array.isArray(bucket.attachments) ? bucket.attachments : [];
  const existingFolders = Array.isArray(bucket.folders) ? bucket.folders : [];
  try {
    const [foldersResp, attachmentsResp, linksResp] = await Promise.all([
      axios.get(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/materials/folders`, {
        params: { accountId, category: categoryKey }
      }),
      axios.get(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/materials/attachments`, {
        params: { accountId, category: categoryKey }
      }),
      axios.get(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/materials/links`, {
        params: { accountId, category: categoryKey }
      })
    ]);

    const rawFolders = parseListResponse(foldersResp.data).map(normalizeMaterialsFolder).filter((it) => it.id);
    const rawAttachments = parseListResponse(attachmentsResp.data).map(normalizeMaterialsAttachment).filter((it) => it.id);
    const rawLinks = parseListResponse(linksResp.data).map(normalizeMaterialsLink).filter((it) => it.id);
    const folders = rawFolders.filter((it) => !it.category || it.category === categoryKey);
    const attachments = rawAttachments.filter((it) => !it.category || it.category === categoryKey);
    const links = rawLinks.filter((it) => !it.category || it.category === categoryKey);
    bucket.folders = mergeOptimisticFolders(existingFolders, folders);
    bucket.attachments = mergeOptimisticMaterials(existingAttachments, attachments);
    bucket.links = links;
    if (materialsCategory.value === categoryKey) {
      materialsData.value = bucket;
    }
  } catch (e) {
    console.error('备课区资料加载失败：', e);
    tabErrorMessage.value = `资料请求失败：${e?.response?.data?.message || e?.message || '未知错误'}`;
    bucket.folders = existingFolders;
    bucket.attachments = existingAttachments;
    if (materialsCategory.value === categoryKey) {
      materialsData.value = bucket;
    }
  } finally {
    materialsLoading.value = false;
  }
}

async function fetchMaterialsAllBySpace(spaceId) {
  const accountId = getAccountId();
  if (!spaceId || !accountId) return;
  materialsLoading.value = true;
  tabErrorMessage.value = '';

  const allKey = MATERIALS_CATEGORY_ALL;
  const bucket = getMaterialsBucket(allKey);
  const existingFolders = Array.isArray(bucket.folders) ? bucket.folders : [];
  const existingAttachments = Array.isArray(bucket.attachments) ? bucket.attachments : [];

  try {
    const results = await Promise.all(
      MATERIALS_FIXED_CATEGORIES.map(async (cat) => {
        const [foldersResp, attachmentsResp, linksResp] = await Promise.all([
          axios.get(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/materials/folders`, {
            params: { accountId, category: cat }
          }),
          axios.get(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/materials/attachments`, {
            params: { accountId, category: cat }
          }),
          axios.get(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/materials/links`, {
            params: { accountId, category: cat }
          })
        ]);
        return { cat, foldersResp, attachmentsResp, linksResp };
      })
    );

    const optimisticFolders = MATERIALS_FIXED_CATEGORIES.flatMap((cat) => {
      const b = getMaterialsBucket(cat);
      const list = Array.isArray(b.folders) ? b.folders : [];
      return list.filter((it) => String(it?.id || '').startsWith('temp-folder-') || Boolean(it?.raw?.localCreated));
    });

    const optimisticAttachments = MATERIALS_FIXED_CATEGORIES.flatMap((cat) => {
      const b = getMaterialsBucket(cat);
      const list = Array.isArray(b.attachments) ? b.attachments : [];
      return list.filter((it) => Boolean(it?.raw?.optimistic));
    });

    const folderMap = new Map();
    const attachmentMap = new Map();
    const linkMap = new Map();

    results.forEach(({ cat, foldersResp, attachmentsResp, linksResp }) => {
      parseListResponse(foldersResp.data)
        .map((raw) => {
          const normalized = normalizeMaterialsFolder(raw);
          return normalized.category ? normalized : { ...normalized, category: cat };
        })
        .filter((it) => it.id)
        .forEach((it) => folderMap.set(String(it.id), it));

      parseListResponse(attachmentsResp.data)
        .map((raw) => {
          const normalized = normalizeMaterialsAttachment(raw);
          return normalized.category ? normalized : { ...normalized, category: cat };
        })
        .filter((it) => it.id)
        .forEach((it) => attachmentMap.set(String(it.id), it));

      parseListResponse(linksResp.data)
        .map((raw) => {
          const normalized = normalizeMaterialsLink(raw);
          return normalized.category ? normalized : { ...normalized, category: cat };
        })
        .filter((it) => it.id)
        .forEach((it) => linkMap.set(String(it.id), it));
    });

    const folders = [...folderMap.values()];
    const attachments = [...attachmentMap.values()];
    const links = [...linkMap.values()];

    bucket.folders = mergeOptimisticFolders([...optimisticFolders, ...existingFolders], folders);
    bucket.attachments = mergeOptimisticMaterials([...optimisticAttachments, ...existingAttachments], attachments);
    bucket.links = links;
    if (materialsCategory.value === allKey) {
      materialsData.value = bucket;
    }
  } catch (e) {
    console.error('备课区资料加载失败：', e);
    tabErrorMessage.value = `资料请求失败：${e?.response?.data?.message || e?.message || '未知错误'}`;
    if (materialsCategory.value === allKey) {
      materialsData.value = bucket;
    }
  } finally {
    materialsLoading.value = false;
  }
}

async function fetchTopicsBySpace(spaceId) {
  const accountId = getAccountId();
  if (!spaceId || !accountId) return;
  topicsLoading.value = true;
  tabErrorMessage.value = '';
  const mirroredItems = getMirroredItems('话题', spaceId);
  try {
    const [foldersResp, topicsResp] = await Promise.all([
      requestFirstAvailable([
        () => axios.get(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/topics/folders`, { params: { accountId } }),
        () => axios.get(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/topic-folders`, { params: { accountId } })
      ]),
      axios.get(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/topics`, {
        params: { accountId }
      })
    ]);
    const folders = parseListResponse(foldersResp.data).map(normalizeGenericFolder).filter((it) => it.id);
    const items = parseListResponse(topicsResp.data).map(normalizeTopicItem).filter((it) => it.id);
    const courseId = getBoundCourseId();
    // #region debug-point C:fetch-topics-space
    reportImportConflictDebug('C', 'LessonPrepPage.vue:fetchTopicsBySpace:space-result', 'fetched topics from prepare space', { spaceId, courseId, folderCount: folders.length, itemCount: items.length });
    // #endregion
    if (courseId && items.length === 0) {
      try {
        const response = await axios.post(`${API_BASE}/topic/list`, { courseId });
        const courseItems = parseListResponse(response.data).map(normalizeTopicItem).filter((it) => it.id);
        // #region debug-point C:fetch-topics-fallback
        reportImportConflictDebug('C', 'LessonPrepPage.vue:fetchTopicsBySpace:fallback-course', 'fallback to course topic list', { spaceId, courseId, courseItemCount: courseItems.length });
        // #endregion
        topicsData.value = { folders, items: mergeUniqueItemsById(courseItems, mirroredItems) };
        return;
      } catch (fallbackError) {
        console.error('备课区话题加载失败：', fallbackError);
      }
    }
    topicsData.value = { folders, items: mergeUniqueItemsById(items, mirroredItems) };
  } catch (e) {
    const courseId = getBoundCourseId();
    if ((e?.response?.status === 404 || e?.response?.status === 405) && courseId) {
      try {
        const response = await axios.post(`${API_BASE}/topic/list`, { courseId });
        topicsData.value = {
          folders: [],
          items: mergeUniqueItemsById(parseListResponse(response.data).map(normalizeTopicItem).filter((it) => it.id), mirroredItems)
        };
        return;
      } catch (fallbackError) {
        console.error('备课区话题加载失败：', fallbackError);
      }
    }
    console.error('备课区话题加载失败：', e);
    tabErrorMessage.value = `话题请求失败：${e?.response?.data?.message || e?.message || '未知错误'}`;
    topicsData.value = { folders: [], items: mirroredItems };
  } finally {
    topicsLoading.value = false;
  }
}

async function fetchAssignmentsBySpace(spaceId) {
  const accountId = getAccountId();
  if (!spaceId || !accountId) return;
  assignmentsLoading.value = true;
  tabErrorMessage.value = '';
  const mirroredItems = getMirroredItems('作业', spaceId);
  try {
    const [foldersResp, assignmentsResp] = await Promise.all([
      requestFirstAvailable([
        () => axios.get(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/assignments/folders`, { params: { accountId } }),
        () => axios.get(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/assignment-folders`, { params: { accountId } })
      ]),
      axios.get(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/assignments`, {
        params: { accountId }
      })
    ]);
    const folders = parseListResponse(foldersResp.data).map(normalizeGenericFolder).filter((it) => it.id);
    const items = parseListResponse(assignmentsResp.data).map(normalizeAssignmentItem).filter((it) => it.id);
    const courseId = getBoundCourseId();
    // #region debug-point B:fetch-assignments-space
    reportImportConflictDebug('B', 'LessonPrepPage.vue:fetchAssignmentsBySpace:space-result', 'fetched assignments from prepare space', { spaceId, courseId, folderCount: folders.length, itemCount: items.length, currentFolderId: getCurrentFolderId('作业') });
    // #endregion
    if (courseId && items.length === 0) {
      try {
        const response = await axios.post(`${API_BASE}/assignment-details`, {
          id: courseId,
          accountId
        });
        const courseItems = parseListResponse(response.data).map(normalizeAssignmentItem).filter((it) => it.id);
        // #region debug-point B:fetch-assignments-fallback
        reportImportConflictDebug('B', 'LessonPrepPage.vue:fetchAssignmentsBySpace:fallback-course', 'fallback to course assignment list', { spaceId, courseId, courseItemCount: courseItems.length });
        // #endregion
        assignmentsData.value = { folders, items: mergeUniqueItemsById(courseItems, mirroredItems) };
        return;
      } catch (fallbackError) {
        console.error('备课区作业加载失败：', fallbackError);
      }
    }
    assignmentsData.value = { folders, items: mergeUniqueItemsById(items, mirroredItems) };
  } catch (e) {
    const courseId = getBoundCourseId();
    if ((e?.response?.status === 404 || e?.response?.status === 405) && courseId) {
      try {
        const response = await axios.post(`${API_BASE}/assignment-details`, {
          id: courseId,
          accountId
        });
        assignmentsData.value = {
          folders: [],
          items: mergeUniqueItemsById(parseListResponse(response.data).map(normalizeAssignmentItem).filter((it) => it.id), mirroredItems)
        };
        return;
      } catch (fallbackError) {
        console.error('备课区作业加载失败：', fallbackError);
      }
    }
    console.error('备课区作业加载失败：', e);
    tabErrorMessage.value = `作业请求失败：${e?.response?.data?.message || e?.message || '未知错误'}`;
    assignmentsData.value = { folders: [], items: mirroredItems };
  } finally {
    assignmentsLoading.value = false;
  }
}

async function refreshActiveTabData() {
  const spaceId = selectedSpaceId.value;
  if (!spaceId) return;
  if (currentMode.value !== 'main') return;

  if (activeTab.value === '互动课件') {
    await fetchCoursewaresBySpace(spaceId);
    return;
  }
  if (activeTab.value === '资料') {
    await fetchMaterialsBySpace(spaceId, materialsCategory.value);
    return;
  }
  if (activeTab.value === '话题') {
    await fetchTopicsBySpace(spaceId);
    return;
  }
  if (activeTab.value === '作业') {
    await fetchAssignmentsBySpace(spaceId);
  }
}

function openFolder(folderId) {
  setCurrentFolder(activeTab.value, folderId);
}

function goFolderBack() {
  if (activeTab.value === '互动课件') {
    setCurrentFolder('互动课件', getParentFolderId('互动课件', coursewareData.value.folders));
    return;
  }
  if (activeTab.value === '资料') {
    setCurrentFolder('资料', getParentFolderId('资料', materialsData.value.folders));
    return;
  }
  if (activeTab.value === '作业') {
    setCurrentFolder('作业', getParentFolderId('作业', assignmentsData.value.folders));
    return;
  }
  if (activeTab.value === '话题') {
    setCurrentFolder('话题', getParentFolderId('话题', topicsData.value.folders));
  }
}

function getCurrentFolderName() {
  if (activeTab.value === '互动课件') return getCurrentFolderInfo('互动课件', coursewareData.value.folders)?.name || '';
  if (activeTab.value === '资料') return getCurrentFolderInfo('资料', materialsData.value.folders)?.name || '';
  if (activeTab.value === '作业') return getCurrentFolderInfo('作业', assignmentsData.value.folders)?.name || '';
  if (activeTab.value === '话题') return getCurrentFolderInfo('话题', topicsData.value.folders)?.name || '';
  return '';
}

async function refreshSpaceAfterMutation(successMessage) {
  if (successMessage) ElMessage.success(successMessage);
  await fetchPrepSpaces();
  await fetchSpaceDetail(selectedSpaceId.value);
  await refreshActiveTabData();
}

async function createFolderForActiveTab() {
  if (activeTab.value === '资料' && materialsCategory.value === MATERIALS_CATEGORY_ALL) {
    ElMessage.warning('请先选择具体资料分类，再新建文件夹');
    return;
  }
  openCreateFolderDialog();
}

async function submitCreateFolder() {
  const spaceId = selectedSpaceId.value;
  const accountId = getAccountId();
  if (!spaceId || !accountId) return;
  const tabKey = activeTab.value;
  const categoryKey = materialsCategory.value;
  const folderName = createFolderForm.value.name.trim();
  if (!folderName) {
    ElMessage.warning('请输入文件夹名称');
    return;
  }
  const body = {
    accountId,
    name: folderName,
    description: createFolderForm.value.description.trim(),
    parentId: getCurrentFolderId(tabKey) === 'root' ? null : getCurrentFolderId(tabKey)
  };
  try {
    createFolderSubmitting.value = true;
    let response = null;
    if (tabKey === '互动课件') {
      response = await requestFirstAvailable([
        () => axios.post(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/courseware/folders`, body),
        () => axios.post(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/courseware-folders`, body)
      ]);
    } else if (tabKey === '资料') {
      response = await axios.post(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/materials/folders`, {
        ...body,
        category: categoryKey
      });
    } else if (tabKey === '作业') {
      response = await requestFirstAvailable([
        () => axios.post(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/assignments/folders`, body),
        () => axios.post(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/assignment-folders`, body)
      ]);
    } else if (tabKey === '话题') {
      response = await requestFirstAvailable([
        () => axios.post(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/topics/folders`, body),
        () => axios.post(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/topic-folders`, body)
      ]);
    }
    const responseData = response?.data ?? {};
    if (responseData?.success === false) {
      throw new Error(responseData?.message || '新建文件夹失败');
    }
    const folderPayload = responseData?.folder
      ?? responseData?.data?.folder
      ?? responseData?.data
      ?? responseData?.result
      ?? {
        name: folderName,
        parentId: body.parentId,
        createdBy: userStore.account?.name || userStore.account?.accountId || ''
      };
    insertCreatedFolder(tabKey, folderPayload, tabKey === '资料' ? { category: categoryKey } : {});
    createFolderSubmitting.value = false;
    createFolderDialogVisible.value = false;
    resetCreateFolderForm();
    ElMessage.success('新建文件夹成功');
  } catch (e) {
    console.error('新建文件夹失败：', e);
    ElMessage.error(e?.response?.data?.message || e?.message || '新建文件夹失败');
  } finally {
    createFolderSubmitting.value = false;
  }
}

function resetCreateContentForm() {
  createContentForm.value = {
    title: '',
    content: ''
  };
}

function openCreateContentDialog() {
  const tabKey = activeTab.value;
  if (tabKey !== '作业' && tabKey !== '话题') return;
  resetCreateContentForm();
  createContentContext.value = {
    tab: tabKey,
    folderId: getCurrentFolderId(tabKey),
    folderName: getCurrentFolderName() || ''
  };
  createContentDialogVisible.value = true;
}

function closeCreateContentDialog() {
  if (createContentSubmitting.value) return;
  createContentDialogVisible.value = false;
}

async function submitCreateContent() {
  const spaceId = selectedSpaceId.value;
  const accountId = getAccountId();
  if (!spaceId || !accountId) return;

  const tabKey = createContentContext.value.tab;
  if (tabKey !== '作业' && tabKey !== '话题') return;
  const title = createContentForm.value.title?.trim();
  if (!title) {
    ElMessage.warning(tabKey === '作业' ? '请输入作业标题' : '请输入话题标题');
    return;
  }
  const content = createContentForm.value.content || '';
  const folderId = createContentContext.value.folderId;
  const courseId = getBoundCourseId();
  // #region debug-point B:create-content-start
  reportImportConflictDebug('B', 'LessonPrepPage.vue:submitCreateContent:start', 'submit create content', { tabKey, spaceId, accountId, title, folderId, courseId, currentAssignmentCount: assignmentsData.value.items?.length || 0, currentTopicCount: topicsData.value.items?.length || 0 });
  // #endregion

  try {
    createContentSubmitting.value = true;
    if (tabKey === '作业') {
      const normalizedFolderId = normalizeId(folderId) === 'root' ? null : folderId;
      const requests = [
        () => axios.post(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/assignments`, {
          accountId,
          title,
          content,
          folderId: normalizedFolderId
        })
      ];
      if (courseId) {
        requests.push(() => axios.post(`${API_BASE}/release-assignment`, {
          accountId,
          id: courseId,
          assignment: {
            title,
            deadline: '',
            assignmentType: '个人作业',
            content,
            totalScore: 100,
            aiEnabled: false,
            tag: '',
            knowledgeAgreement: false,
            environment: '',
            chapter: '',
            allowFormat: '',
            lateForbidden: false,
            duplicateCheck: false,
            duplicateThreshold: 0,
            autoReturn: false,
            publishTime: ''
          }
        }));
      }
      const response = await requestFirstAvailable(requests);
      const data = response?.data ?? {};
      if (data?.success === false) {
        throw new Error(data?.message || '新增作业失败');
      }
      if (String(response?.config?.url || '').includes('/release-assignment') && courseId) {
        await syncMirroredAssignmentFromCourse(spaceId, courseId, accountId, {
          name: title,
          content,
          score: '100'
        });
      }
      // #region debug-point B:create-assignment-success
      reportImportConflictDebug('B', 'LessonPrepPage.vue:submitCreateContent:assignment-success', 'create assignment success before refresh', { responseData: data, currentAssignmentCount: assignmentsData.value.items?.length || 0 });
      // #endregion
      createContentSubmitting.value = false;
      createContentDialogVisible.value = false;
      resetCreateContentForm();
      await refreshSpaceAfterMutation('新增作业成功');
      return;
    }
    const normalizedFolderId = normalizeId(folderId) === 'root' ? null : folderId;
    const requests = [
      () => axios.post(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/topics`, {
        accountId,
        title,
        content,
        folderId: normalizedFolderId
      })
    ];
    if (courseId) {
      requests.push(() => axios.post(`${API_BASE}/topic/create`, {
        courseId,
        authorId: accountId,
        authorName: userStore.account?.name,
        title,
        content,
        isAnonymous: false
      }));
    }
    const response = await requestFirstAvailable(requests);
    const data = response?.data ?? {};
    if (data?.success === false) {
      throw new Error(data?.message || '新增话题失败');
    }
    if (String(response?.config?.url || '').includes('/topic/create') && courseId) {
      await syncMirroredTopicFromCourse(spaceId, courseId, {
        name: title,
        content
      });
    }
    // #region debug-point C:create-topic-success
    reportImportConflictDebug('C', 'LessonPrepPage.vue:submitCreateContent:topic-success', 'create topic success before refresh', { responseData: data, currentTopicCount: topicsData.value.items?.length || 0 });
    // #endregion
    createContentSubmitting.value = false;
    createContentDialogVisible.value = false;
    resetCreateContentForm();
    await refreshSpaceAfterMutation('新增话题成功');
  } catch (e) {
    console.error('新建内容失败：', e);
    ElMessage.error(e?.response?.data?.message || e?.message || '新建内容失败');
  } finally {
    createContentSubmitting.value = false;
  }
}

function triggerPrimaryAction() {
  if (activeTab.value === '互动课件') {
    coursewareFileInputRef.value?.click();
    return;
  }
  if (activeTab.value === '资料') {
    if (materialsCategory.value === MATERIALS_CATEGORY_ALL) {
      ElMessage.warning('请先选择具体资料分类，再新增资料');
      return;
    }
    materialsFileInputRef.value?.click();
    return;
  }
  openCreateContentDialog();
}

async function handleFileUpload(moduleKey, event) {
  const files = Array.from(event?.target?.files || []);
  event.target.value = '';
  const spaceId = selectedSpaceId.value;
  const accountId = getAccountId();
  if (!spaceId || !accountId || files.length === 0) return;
  const categoryKey = moduleKey === '资料' ? materialsCategory.value : '';
  const optimisticIds = appendOptimisticUploadedFiles(
    moduleKey,
    files,
    moduleKey === '资料' ? { category: categoryKey } : {}
  );
  try {
    if (moduleKey === '资料') {
      const formData = new FormData();
      formData.append('accountId', accountId);
      if (getCurrentFolderId(moduleKey) !== 'root') {
        formData.append('folderId', getCurrentFolderId(moduleKey));
      }
      files.forEach((file) => formData.append('file', file));
      formData.append('category', categoryKey);
      await requestFirstAvailable([
        () => axios.post(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/materials/attachments`, formData),
        () => axios.post(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/materials/upload`, formData)
      ]);
      ElMessage.success('资料上传成功');
      setTimeout(() => {
        void fetchMaterialsBySpace(spaceId, categoryKey);
      }, 250);
      return;
    }
    if (moduleKey === '互动课件') {
      await Promise.all(files.map((file) => {
        const body = {
          accountId,
          title: file.name,
          itemType: getFileExtension(file.name) || '课件',
          visibility: 'ALL_MEMBERS'
        };
        if (getCurrentFolderId(moduleKey) !== 'root') {
          body.folderId = getCurrentFolderId(moduleKey);
        }
        return axios.post(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/courseware`, body);
      }));
      ElMessage.success('互动课件添加成功');
      setTimeout(() => {
        void fetchCoursewaresBySpace(spaceId);
      }, 250);
    }
  } catch (e) {
    console.error('上传失败：', e);
    removeOptimisticUploadedFiles(moduleKey, optimisticIds, moduleKey === '资料' ? { category: categoryKey } : {});
    if (moduleKey === '互动课件' && e?.response?.status === 404) {
      ElMessage.error('互动课件上传失败：当前请求地址 /prepare-spaces/{spaceId}/courseware 不存在，请确认后端真实接口');
      return;
    }
    ElMessage.error(e?.response?.data?.message || e?.message || '上传失败');
    void refreshActiveTabData();
  }
}

async function triggerImportAction() {
  const spaceId = selectedSpaceId.value;
  const accountId = getAccountId();
  if (!spaceId || !accountId) return;
  if (activeTab.value === '资料') {
    openImportMaterialsDialog();
    return;
  }
  if (activeTab.value === '作业' || activeTab.value === '话题') {
    openImportContentDialog();
  }
}

async function deleteItemForActiveTab(item, kind = 'item') {
  const spaceId = selectedSpaceId.value;
  const accountId = getAccountId();
  if (!spaceId || !accountId || !item?.id) return;
  if (!window.confirm(`确定删除“${item.name || item.title || '当前内容'}”吗？`)) return;
  // #region debug-point D:delete-entry
  reportImportConflictDebug('D', 'LessonPrepPage.vue:deleteItemForActiveTab:start', 'delete entry', {
    activeTab: activeTab.value,
    kind,
    itemId: item?.id,
    rawAssignmentId: item?.raw?.assignmentId,
    rawTopicId: item?.raw?.topicId,
    hasRaw: Boolean(item?.raw),
    currentAssignmentCount: assignmentsData.value.items?.length || 0,
    currentTopicCount: topicsData.value.items?.length || 0
  });
  // #endregion
  try {
    if (kind === 'folder') {
      if (activeTab.value === '互动课件') {
        const folderId = String(item?.id || '');
        if (folderId.startsWith('temp-folder-') || Boolean(item?.raw?.localCreated)) {
          coursewareData.value = {
            ...coursewareData.value,
            folders: (Array.isArray(coursewareData.value.folders) ? coursewareData.value.folders : []).filter((it) => String(it?.id) !== folderId)
          };
          if (selectedSpaceId.value) {
            saveCoursewareToStorage(selectedSpaceId.value, coursewareData.value);
          }
          ElMessage.success('删除成功');
          return;
        }
        const prevFolders = Array.isArray(coursewareData.value.folders) ? coursewareData.value.folders : [];
        coursewareData.value = {
          ...coursewareData.value,
          folders: prevFolders.filter((it) => String(it?.id) !== folderId)
        };
        try {
          const requests = [
            () => axios.delete(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/courseware/folders/${folderId}`, { params: { accountId } }),
            () => axios.delete(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/courseware/folders/${folderId}`, { data: { accountId } }),
            () => axios.delete(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/courseware-folders/${folderId}`, { params: { accountId } }),
            () => axios.delete(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/courseware-folders/${folderId}`, { data: { accountId } })
          ];
          let lastError = null;
          for (let i = 0; i < requests.length; i += 1) {
            try {
              const response = await requests[i]();
              const data = response?.data;
              if (data?.success === false) {
                lastError = new Error(data?.message || '删除失败');
                continue;
              }
              lastError = null;
              break;
            } catch (error) {
              lastError = error;
              continue;
            }
          }
          if (lastError) throw lastError;
          if (selectedSpaceId.value) {
            saveCoursewareToStorage(selectedSpaceId.value, coursewareData.value);
          }
        } catch (innerError) {
          coursewareData.value = { ...coursewareData.value, folders: prevFolders };
          throw innerError;
        }
      } else if (activeTab.value === '资料') {
        const response = await axios.delete(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/materials/folders/${item.id}`, {
          params: { accountId }
        });
        if (response?.data?.success === false) throw new Error(response?.data?.message || '删除失败');
      } else if (activeTab.value === '作业') {
        const response = await requestFirstAvailable([
          () => axios.delete(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/assignments/folders/${item.id}`, { params: { accountId } }),
          () => axios.delete(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/assignment-folders/${item.id}`, { params: { accountId } })
        ]);
        if (response?.data?.success === false) throw new Error(response?.data?.message || '删除失败');
      } else if (activeTab.value === '话题') {
        const response = await requestFirstAvailable([
          () => axios.delete(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/topics/folders/${item.id}`, { params: { accountId } }),
          () => axios.delete(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/topic-folders/${item.id}`, { params: { accountId } })
        ]);
        if (response?.data?.success === false) throw new Error(response?.data?.message || '删除失败');
      }
    } else if (activeTab.value === '互动课件') {
      const itemId = String(item?.id || '');
      if (itemId.startsWith('temp-courseware-') || Boolean(item?.raw?.optimistic)) {
        coursewareData.value = {
          ...coursewareData.value,
          items: (Array.isArray(coursewareData.value.items) ? coursewareData.value.items : []).filter((it) => String(it?.id) !== itemId)
        };
        if (selectedSpaceId.value) {
          saveCoursewareToStorage(selectedSpaceId.value, coursewareData.value);
        }
        ElMessage.success('删除成功');
        return;
      }
      const prevItems = Array.isArray(coursewareData.value.items) ? coursewareData.value.items : [];
      coursewareData.value = {
        ...coursewareData.value,
        items: prevItems.filter((it) => String(it?.id) !== itemId)
      };
      try {
        const requests = [
          () => axios.delete(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/courseware/${itemId}`, { params: { accountId } }),
          () => axios.delete(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/courseware/${itemId}`, { data: { accountId } }),
          () => axios.delete(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/courseware-items/${itemId}`, { params: { accountId } }),
          () => axios.delete(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/courseware-items/${itemId}`, { data: { accountId } })
        ];
        let lastError = null;
        for (let i = 0; i < requests.length; i += 1) {
          try {
            const response = await requests[i]();
            const data = response?.data;
            if (data?.success === false) {
              lastError = new Error(data?.message || '删除失败');
              continue;
            }
            lastError = null;
            break;
          } catch (error) {
            lastError = error;
            continue;
          }
        }
        if (lastError) throw lastError;
        if (selectedSpaceId.value) {
          saveCoursewareToStorage(selectedSpaceId.value, coursewareData.value);
        }
      } catch (innerError) {
        coursewareData.value = { ...coursewareData.value, items: prevItems };
        throw innerError;
      }
    } else if (activeTab.value === '资料') {
      const itemId = String(item?.id || '');
      const categoryKey = materialsCategory.value;
      const bucket = getMaterialsBucket(categoryKey);
      if (itemId.startsWith('temp-material-') || Boolean(item?.raw?.optimistic)) {
        const list = Array.isArray(bucket.attachments) ? bucket.attachments : [];
        bucket.attachments = list.filter((it) => String(it?.id) !== itemId);
        if (categoryKey === materialsCategory.value) {
          materialsData.value = bucket;
        }
        ElMessage.success('删除成功');
        return;
      }
      const materialPath = item.url ? 'links' : 'attachments';
      const previousAttachments = Array.isArray(bucket.attachments) ? bucket.attachments : [];
      const previousLinks = Array.isArray(bucket.links) ? bucket.links : [];
      if (materialPath === 'attachments') {
        bucket.attachments = previousAttachments.filter((it) => String(it?.id) !== itemId);
      } else {
        bucket.links = previousLinks.filter((it) => String(it?.id) !== itemId);
      }
      if (categoryKey === materialsCategory.value) {
        materialsData.value = bucket;
      }
      try {
        const response = await axios.delete(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/materials/${materialPath}/${itemId}`, {
          params: { accountId }
        });
        if (response?.data?.success === false) throw new Error(response?.data?.message || '删除失败');
      } catch (innerError) {
        if (materialPath === 'attachments') {
          bucket.attachments = previousAttachments;
        } else {
          bucket.links = previousLinks;
        }
        if (categoryKey === materialsCategory.value) {
          materialsData.value = bucket;
        }
        throw innerError;
      }
    } else if (activeTab.value === '作业') {
      const courseId = getBoundCourseId();
      const previousItems = Array.isArray(assignmentsData.value.items) ? assignmentsData.value.items : [];
      const previousMirroredItems = getMirroredItems('作业', spaceId);
      assignmentsData.value = {
        ...assignmentsData.value,
        items: previousItems.filter((it) => String(it?.id) !== String(item.id))
      };
      removeMirroredItem('作业', spaceId, item.id);
      try {
        const assignmentId = item?.raw?.assignmentId ?? item.id;
        const requests = [
          () => axios.delete(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/assignments/${item.id}`, { params: { accountId } })
        ];
        if (courseId) {
          requests.push(() => axios.post(`${API_BASE}/delete-course-assignment`, {
            id: courseId,
            assignmentId,
            accountId
          }));
        }
        let lastError = null;
        for (let i = 0; i < requests.length; i += 1) {
          try {
            const response = await requests[i]();
            const data = response?.data;
            if (data?.success === false) {
              lastError = new Error(data?.message || '删除作业失败');
              continue;
            }
            lastError = null;
            break;
          } catch (error) {
            lastError = error;
            continue;
          }
        }
        if (lastError) throw lastError;
      } catch (innerError) {
        assignmentsData.value = { ...assignmentsData.value, items: previousItems };
        mirroredAssignmentsBySpace.value = {
          ...mirroredAssignmentsBySpace.value,
          [String(spaceId)]: previousMirroredItems
        };
        throw innerError;
      }
    } else if (activeTab.value === '话题') {
      const courseId = getBoundCourseId();
      const previousItems = Array.isArray(topicsData.value.items) ? topicsData.value.items : [];
      const previousMirroredItems = getMirroredItems('话题', spaceId);
      topicsData.value = {
        ...topicsData.value,
        items: previousItems.filter((it) => String(it?.id) !== String(item.id))
      };
      removeMirroredItem('话题', spaceId, item.id);
      try {
        const topicId = item?.raw?.topicId ?? item?.raw?.id ?? item.id;
        const identity = userStore.account?.identity || '老师';
        let lastError = null;

        try {
          const prepResponse = await axios.post(
            `${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/topics/delete`,
            {
              topicId: item.id,
              authorId: accountId
            }
          );
          const prepData = prepResponse?.data;
          if (prepData?.success !== false) {
            lastError = null;
          } else if (String(prepData?.message || '').includes('话题不存在')) {
            lastError = new Error(prepData?.message || '话题不存在');
          } else {
            throw new Error(prepData?.message || '删除失败');
          }
        } catch (prepError) {
          const status = prepError?.response?.status;
          const message = prepError?.response?.data?.message || prepError?.message || '';
          if (status === 404 || status === 405 || String(message).includes('话题不存在')) {
            lastError = prepError;
          } else {
            throw prepError;
          }
        }

        if (lastError) {
          const topicResponse = await axios.post(`${API_BASE}/topic/delete`, {
            topicId,
            authorId: accountId,
            identity
          });
          const topicData = topicResponse?.data;
          if (topicData?.success === false) throw new Error(topicData?.message || '删除失败');
        }
      } catch (innerError) {
        topicsData.value = { ...topicsData.value, items: previousItems };
        mirroredTopicsBySpace.value = {
          ...mirroredTopicsBySpace.value,
          [String(spaceId)]: previousMirroredItems
        };
        throw innerError;
      }
    }
    await refreshSpaceAfterMutation('删除成功');
  } catch (e) {
    console.error('删除失败：', e);
    ElMessage.error(e?.response?.data?.message || e?.message || '删除失败');
  }
}

async function openOrDownloadItem(item) {
  const spaceId = selectedSpaceId.value;
  const accountId = getAccountId();
  if (!spaceId || !accountId || !item?.id) return;
  try {
    if (activeTab.value === '话题') {
      await openTopicDetailDialog(item);
      return;
    }
    if (item.url) {
      window.open(item.url, '_blank', 'noopener,noreferrer');
      return;
    }
    const basePath = activeTab.value === '互动课件'
      ? 'courseware'
      : activeTab.value === '资料'
        ? 'materials/attachments'
        : activeTab.value === '作业'
          ? 'assignments'
          : 'topics';
    const response = await requestFirstAvailable([
      () => axios.get(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/${basePath}/${item.id}/download`, {
        params: { accountId },
        responseType: 'blob'
      }),
      () => axios.get(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/${basePath}/${item.id}`, {
        params: { accountId },
        responseType: 'blob'
      })
    ]);
    const blobUrl = URL.createObjectURL(new Blob([response.data]));
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = item.name || 'download';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(blobUrl);
  } catch (e) {
    console.error('打开/下载失败：', e);
    ElMessage.error(e?.response?.data?.message || e?.message || '打开失败');
  }
}

function closeTopicDetailDialog() {
  topicDetailDialogVisible.value = false;
}

async function openTopicDetailDialog(item) {
  const spaceId = selectedSpaceId.value;
  const accountId = getAccountId();
  const topicId = String(item?.raw?.topicId ?? item?.id ?? '');
  if (!spaceId || !accountId || !topicId) return;

  topicDetailLoading.value = true;
  try {
    const response = await axios.post(
      `${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/topics/detail`,
      { topicId },
      { params: { accountId } }
    );
    const payload = response?.data ?? {};
    const data = payload?.data ?? payload;
    const topic = data?.topic ?? payload?.topic;
    const replies = data?.replies ?? payload?.replies ?? [];
    if (payload?.success === false || data?.success === false || !topic) {
      throw new Error(payload?.message || data?.message || '话题不存在');
    }
    topicDetailData.value = {
      id: String(topic?.topicId ?? topicId),
      title: topic?.title ?? item?.name ?? '未命名话题',
      content: topic?.content ?? '',
      authorName: topic?.authorName ?? topic?.author ?? item?.editor ?? '-',
      createTime: topic?.createTime ?? topic?.updateTime ?? item?.updatedAt ?? '',
      replies: Array.isArray(replies) ? replies : []
    };
    topicDetailDialogVisible.value = true;
  } catch (e) {
    console.error('获取话题详情失败：', e);
    ElMessage.error(e?.response?.data?.message || e?.message || '获取话题详情失败');
  } finally {
    topicDetailLoading.value = false;
  }
}

async function fetchPrepSpaces() {
  try {
    const response = await axios.get(`${API_BASE}/prepare-spaces`, {
      params: {
        accountId: userStore.account?.accountId,
        _t: Date.now()
      }
    });
    const list = parseListResponse(response.data);
    const normalized = list.map(normalizeSpace).filter((it) => it.id);
    prepSpaces.value = normalized;
  } catch (e) {
    prepSpaces.value = [];
  }
}

async function fetchSpaceDetail(spaceId) {
  if (!spaceId) {
    currentSpaceDetail.value = null;
    return;
  }
  spaceLoading.value = true;
  try {
    const response = await axios.get(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}`, {
      params: {
        accountId: userStore.account?.accountId,
        _t: Date.now()
      }
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
  if (!spaceId) {
    spaceMembers.value = [];
    return;
  }
  membersLoading.value = true;
  try {
    const response = await axios.get(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/members`, {
      params: {
        accountId: userStore.account?.accountId
      }
    });
    spaceMembers.value = parseListResponse(response.data).filter((member) => {
      const identity = member?.identity ?? member?.role ?? '';
      return identity === '老师' || identity === 'owner' || identity === 'admin' || identity === 'editor' || identity === 'viewer';
    });
  } catch (e) {
    spaceMembers.value = [];
  } finally {
    membersLoading.value = false;
  }
}

async function fetchLogs(spaceId) {
  if (!spaceId) {
    spaceLogs.value = [];
    return;
  }
  logsLoading.value = true;
  try {
    const response = await axios.get(`${API_BASE}/prepare-spaces/${encodeURIComponent(spaceId)}/logs`, {
      params: {
        accountId: userStore.account?.accountId
      }
    });
    spaceLogs.value = parseListResponse(response.data);
  } catch (e) {
    spaceLogs.value = [];
  } finally {
    logsLoading.value = false;
  }
}

watch(
  () => route.query?.tab,
  (tab) => {
    const decoded = typeof tab === 'string' ? tab : '';
    if (decoded && contentTabs.includes(decoded)) {
      activeTab.value = decoded;
      setCurrentFolder(decoded, 'root');
    }
  },
  { immediate: true }
);

watch(
  () => route.params?.spaceId,
  async (spaceId) => {
    const id = typeof spaceId === 'string' ? spaceId : '';
    if (id) {
      selectedSpaceId.value = id;
    } else if (!selectedSpaceId.value && prepSpaces.value.length > 0) {
      selectedSpaceId.value = prepSpaces.value[0].id;
    }
    await fetchSpaceDetail(selectedSpaceId.value);
    if (currentMode.value === 'members') await fetchMembers(selectedSpaceId.value);
    if (currentMode.value === 'logs') await fetchLogs(selectedSpaceId.value);
    resetTabData();
    await refreshActiveTabData();
  },
  { immediate: true }
);

watch(
  () => currentMode.value,
  async (mode) => {
    const id = selectedSpaceId.value;
    if (!id) return;
    if (mode === 'members') await fetchMembers(id);
    if (mode === 'logs') await fetchLogs(id);
    if (mode === 'main') await refreshActiveTabData();
  }
);

watch(
  () => materialsCategory.value,
  (category) => {
    setCurrentFolder('资料', 'root');
    materialsData.value = getMaterialsBucket(category);
  },
  { immediate: true }
);

watch(
  [() => activeTab.value, () => selectedSpaceId.value, () => materialsCategory.value],
  async () => {
    await refreshActiveTabData();
  }
);

watch(
  () => prepSpaces.value,
  async (list) => {
    if (selectedSpaceId.value || !Array.isArray(list) || list.length === 0) return;
    const fallbackId = list[0]?.id || '';
    if (!fallbackId) return;
    selectedSpaceId.value = fallbackId;
    if (!route.params?.spaceId) {
      await router.replace({ path: buildSpaceBasePath(fallbackId), query: { ...route.query } });
      return;
    }
    await fetchSpaceDetail(fallbackId);
    await refreshActiveTabData();
  },
  { deep: true }
);

onMounted(async () => {
  document.addEventListener('click', handleDocumentClick);
  await fetchPrepSpaces();
  const routeSpaceId = typeof route.params?.spaceId === 'string' ? route.params.spaceId : '';
  const fallbackId = prepSpaces.value[0]?.id || '';
  selectedSpaceId.value = routeSpaceId || selectedSpaceId.value || fallbackId;
  if (!routeSpaceId && selectedSpaceId.value) {
    await router.replace({ path: buildSpaceBasePath(selectedSpaceId.value), query: { ...route.query } });
  }
  if (selectedSpaceId.value) {
    await fetchSpaceDetail(selectedSpaceId.value);
    await refreshActiveTabData();
  }
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick);
});
</script>

<template>
  <div class="lesson-prep-page">
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

    <main class="prep-layout">
      <aside class="prep-sidebar">
        <div class="prep-sidebar__header">
          <h2>全部备课区</h2>
        </div>

        <button type="button" class="prep-sidebar__create" @click="toggleCreatePrepSpaceForm">+ 新建备课区</button>

        <div class="prep-sidebar__groups">
          <button
            v-for="group in prepGroups"
            :key="group"
            type="button"
            class="prep-sidebar__group"
            :class="{ 'is-active': selectedGroup === group }"
            @click="selectedGroup = group"
          >
            {{ group }}
          </button>
        </div>

        <div class="prep-sidebar__filter">
          <input v-model="leftKeyword" type="text" placeholder="搜索备课区" />
        </div>

        <div class="prep-sidebar__list">
          <div
            v-for="item in visibleSpaces"
            :key="item.id"
            class="prep-sidebar__item-wrap"
          >
            <button
              type="button"
              class="prep-sidebar__item"
              :class="{ 'is-active': String(selectedSpaceId) === String(item.id) }"
              @click="navigateToSpace(item.id)"
            >
              <span class="prep-sidebar__tag">{{ item.tag }}</span>
              <span class="prep-sidebar__name">{{ item.name }}</span>
            </button>
            <div class="prep-sidebar__more-wrap" @click.stop>
              <button
                type="button"
                class="prep-sidebar__more-btn"
                :disabled="deletingSpaceId === String(item.id)"
                @mousedown.stop.prevent="toggleSpaceActionMenu(item.id)"
              >
                ⋮
              </button>
              <div
                v-show="spaceActionMenuId === String(item.id)"
                class="prep-sidebar__menu"
              >
                <button
                  v-if="isSpaceOwner(item)"
                  type="button"
                  class="danger"
                  :disabled="deletingSpaceId === String(item.id)"
                  @mousedown.stop.prevent="deletePrepSpace(item)"
                >
                  {{ deletingSpaceId === String(item.id) ? '删除中...' : '删除备课区' }}
                </button>
                <div v-else class="prep-sidebar__menu-tip">仅创建者可删除</div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <section class="prep-workspace">
        <div class="prep-workspace__header">
          <div class="prep-workspace__title-wrap">
            <h1>{{ currentSpace?.name || '我的备课区' }}</h1>
            <span class="prep-workspace__badge">{{ currentSpace?.tag || '小组备课' }}</span>
          </div>

          <div class="prep-workspace__top-actions">
            <button type="button" class="is-primary">添加成员协同备课</button>
            <button type="button" @click="navigateToMembers">成员管理</button>
            <button type="button" @click="navigateToLogs">操作记录</button>
          </div>
        </div>

        <div class="prep-workspace__tabs">
          <button
            v-for="tab in contentTabs"
            :key="tab"
            type="button"
            class="prep-workspace__tab"
            :class="{ 'is-active': activeTab === tab }"
            @click="setActiveTab(tab)"
          >
            {{ tab }}
          </button>
        </div>

        <div v-if="currentMode !== 'main'" class="prep-workspace__subnav">
          <button type="button" class="prep-back-btn" @click="navigateBackToSpace">← 返回</button>
          <span class="prep-subnav-title">
            {{ currentMode === 'members' ? '成员管理' : '操作记录' }}
          </span>
        </div>

        <div v-if="currentMode === 'main'" class="prep-workspace__toolbar">
          <div class="prep-workspace__tool-actions">
            <button type="button" class="is-primary" @click="triggerPrimaryAction">{{ activeModuleConfig.primaryLabel }}</button>
            <button
              v-if="activeModuleConfig.importLabel"
              type="button"
              class="is-import"
              @click="triggerImportAction"
            >
              {{ activeModuleConfig.importLabel }}
            </button>
            <button type="button" @click="createFolderForActiveTab">+ 新建文件夹</button>
          </div>

          <div class="prep-workspace__search">
            <button
              v-if="getCurrentFolderId() !== 'root'"
              type="button"
              class="prep-folder-back"
              @click="goFolderBack"
            >
              ← 返回 {{ getCurrentFolderName() }}
            </button>
            <span class="prep-workspace__search-icon">☰</span>
            <input v-model="tableKeyword" :placeholder="`搜索${activeTab}`" />
          </div>
        </div>

        <div v-if="currentMode === 'main'" class="prep-workspace__table">
          <input
            ref="coursewareFileInputRef"
            type="file"
            class="prep-hidden-file"
            @change="handleFileUpload('互动课件', $event)"
          />
          <input
            ref="materialsFileInputRef"
            type="file"
            class="prep-hidden-file"
            multiple
            @change="handleFileUpload('资料', $event)"
          />
          <div class="prep-workspace__table-head">
            <span class="is-checkbox"></span>
            <span>文件名</span>
            <span>类型</span>
            <span>大小</span>
            <span>时间</span>
            <span>编辑人</span>
            <span>操作</span>
          </div>

          <div v-if="activeTab === '资料'" class="prep-table-filter">
            <div class="prep-table-filter__label">分类</div>
            <div class="prep-table-filter__options">
              <button
                v-for="c in materialsCategories"
                :key="c"
                type="button"
                class="prep-table-filter__btn"
                :class="{ active: materialsCategory === c }"
                @click="materialsCategory = c"
              >
                {{ c }}
              </button>
            </div>
          </div>

          <div v-if="tabErrorMessage" class="prep-workspace__error">
            {{ tabErrorMessage }}
          </div>

          <div v-if="activeTab === '互动课件'">
            <div v-if="coursewareLoading" class="prep-workspace__empty">加载中...</div>
            <div v-else-if="visibleCoursewareFolders.length === 0 && visibleCoursewareItems.length === 0" class="prep-workspace__empty">
              {{ activeModuleConfig.emptyText }}
            </div>
            <div v-else class="prep-table-body">
              <div
                v-for="folder in visibleCoursewareFolders"
                :key="`course-folder-${folder.id}`"
                class="prep-table-row is-folder"
              >
                <span class="is-checkbox"></span>
                <button type="button" class="prep-row-link" @click="openFolder(folder.id)">{{ folder.name }}</button>
                <span>文件夹</span>
                <span>-</span>
                <span>{{ folder.updatedAt || '-' }}</span>
                <span>{{ folder.editor || '-' }}</span>
                <span class="op">
                  <button type="button" class="prep-inline-btn" @click="deleteItemForActiveTab(folder, 'folder')">删除</button>
                </span>
              </div>
              <div
                v-for="item in visibleCoursewareItems"
                :key="`course-item-${item.id}`"
                class="prep-table-row"
              >
                <span class="is-checkbox"></span>
                <span class="name">{{ item.name }}</span>
                <span>{{ item.type }}</span>
                <span>{{ item.size || '-' }}</span>
                <span>{{ item.updatedAt || '-' }}</span>
                <span>{{ item.editor || '-' }}</span>
                <span class="op">
                  <button type="button" class="prep-inline-btn" @click="openOrDownloadItem(item)">打开</button>
                  <button type="button" class="prep-inline-btn danger" @click="deleteItemForActiveTab(item)">删除</button>
                </span>
              </div>
            </div>
          </div>

          <div v-else-if="activeTab === '资料'">
            <div
              v-if="materialsLoading"
              class="prep-workspace__empty"
            >
              加载中...
            </div>
            <div
              v-else-if="visibleMaterialFolders.length===0 && visibleMaterialAttachments.length===0 && visibleMaterialLinks.length===0"
              class="prep-workspace__empty"
            >
              {{ activeModuleConfig.emptyText }}
            </div>
            <div v-else class="prep-table-body">
              <div
                v-for="folder in visibleMaterialFolders"
                :key="`folder-${folder.id}`"
                class="prep-table-row is-folder"
              >
                <span class="is-checkbox"></span>
                <button type="button" class="prep-row-link" @click="openFolder(folder.id)">{{ folder.name }}</button>
                <span>文件夹</span>
                <span>-</span>
                <span>{{ folder.updatedAt || '-' }}</span>
                <span>{{ folder.editor || '-' }}</span>
                <span class="op">
                  <button type="button" class="prep-inline-btn" @click="deleteItemForActiveTab(folder, 'folder')">删除</button>
                </span>
              </div>
              <div
                v-for="file in visibleMaterialAttachments"
                :key="`file-${file.id}`"
                class="prep-table-row"
              >
                <span class="is-checkbox"></span>
                <span class="name">{{ file.name }}</span>
                <span>附件</span>
                <span>{{ file.size || '-' }}</span>
                <span>{{ file.updatedAt || '-' }}</span>
                <span>{{ file.editor || '-' }}</span>
                <span class="op">
                  <button type="button" class="prep-inline-btn" @click="openOrDownloadItem(file)">下载</button>
                  <button type="button" class="prep-inline-btn danger" @click="deleteItemForActiveTab(file)">删除</button>
                </span>
              </div>
              <div
                v-for="link in visibleMaterialLinks"
                :key="`link-${link.id}`"
                class="prep-table-row"
              >
                <span class="is-checkbox"></span>
                <span class="name">{{ link.title }}</span>
                <span>外链</span>
                <span>-</span>
                <span>{{ link.updatedAt || '-' }}</span>
                <span>{{ link.editor || '-' }}</span>
                <span class="op">
                  <button type="button" class="prep-inline-btn" @click="openOrDownloadItem(link)">打开</button>
                  <button type="button" class="prep-inline-btn danger" @click="deleteItemForActiveTab(link)">删除</button>
                </span>
              </div>
            </div>
          </div>

          <div v-else-if="activeTab === '话题'">
            <div v-if="topicsLoading" class="prep-workspace__empty">加载中...</div>
            <div v-else-if="visibleTopicFolders.length === 0 && visibleTopicItems.length === 0" class="prep-workspace__empty">{{ activeModuleConfig.emptyText }}</div>
            <div v-else class="prep-table-body">
              <div
                v-for="folder in visibleTopicFolders"
                :key="`topic-folder-${folder.id}`"
                class="prep-table-row is-folder"
              >
                <span class="is-checkbox"></span>
                <button type="button" class="prep-row-link" @click="openFolder(folder.id)">{{ folder.name }}</button>
                <span>文件夹</span>
                <span>-</span>
                <span>{{ folder.updatedAt || '-' }}</span>
                <span>{{ folder.editor || '-' }}</span>
                <span class="op">
                  <button type="button" class="prep-inline-btn" @click="deleteItemForActiveTab(folder, 'folder')">删除</button>
                </span>
              </div>
              <div
                v-for="(topic, idx) in visibleTopicItems"
                :key="topic?.id ?? idx"
                class="prep-table-row"
              >
                <span class="is-checkbox"></span>
                <span class="name">{{ topic.name }}</span>
                <span>话题</span>
                <span>-</span>
                <span>{{ topic.updatedAt || '-' }}</span>
                <span>{{ topic.editor || '-' }}</span>
                <span class="op">
                  <button type="button" class="prep-inline-btn" @click="openOrDownloadItem(topic)">查看</button>
                  <button type="button" class="prep-inline-btn danger" @click="deleteItemForActiveTab(topic)">删除</button>
                </span>
              </div>
            </div>
          </div>

          <div v-else-if="activeTab === '作业'">
            <div v-if="assignmentsLoading" class="prep-workspace__empty">加载中...</div>
            <div v-else-if="visibleAssignmentFolders.length === 0 && visibleAssignmentItems.length === 0" class="prep-workspace__empty">{{ activeModuleConfig.emptyText }}</div>
            <div v-else class="prep-table-body">
              <div
                v-for="folder in visibleAssignmentFolders"
                :key="`assignment-folder-${folder.id}`"
                class="prep-table-row is-folder"
              >
                <span class="is-checkbox"></span>
                <button type="button" class="prep-row-link" @click="openFolder(folder.id)">{{ folder.name }}</button>
                <span>文件夹</span>
                <span>-</span>
                <span>{{ folder.updatedAt || '-' }}</span>
                <span>{{ folder.editor || '-' }}</span>
                <span class="op">
                  <button type="button" class="prep-inline-btn" @click="deleteItemForActiveTab(folder, 'folder')">删除</button>
                </span>
              </div>
              <div
                v-for="(a, idx) in visibleAssignmentItems"
                :key="a?.id ?? idx"
                class="prep-table-row"
              >
                <span class="is-checkbox"></span>
                <span class="name">{{ a.name }}</span>
                <span>作业</span>
                <span>{{ a.score || '-' }}</span>
                <span>{{ a.updatedAt || '-' }}</span>
                <span>{{ a.editor || '-' }}</span>
                <span class="op">
                  <button type="button" class="prep-inline-btn" @click="openOrDownloadItem(a)">查看</button>
                  <button type="button" class="prep-inline-btn danger" @click="deleteItemForActiveTab(a)">删除</button>
                </span>
              </div>
            </div>
          </div>

          <div v-else class="prep-workspace__empty">
            暂无数据
          </div>
        </div>

        <div v-if="currentMode === 'members'" class="prep-panel">
          <div class="prep-panel__head">
            <span>成员列表</span>
          </div>
          <div class="prep-panel__body">
            <div class="prep-grid-head">
              <span>账号</span>
              <span>姓名</span>
              <span>角色</span>
            </div>
            <div v-if="membersLoading" class="prep-panel__empty">加载中...</div>
            <div v-else-if="spaceMembers.length === 0" class="prep-panel__empty">暂无成员</div>
            <div v-else class="prep-grid-body">
              <div v-for="(m, idx) in spaceMembers" :key="m?.id ?? m?.accountId ?? idx" class="prep-grid-row">
                <span>{{ m?.accountId ?? m?.account ?? m?.userId ?? '-' }}</span>
                <span>{{ m?.name ?? m?.userName ?? '-' }}</span>
                <span>{{ m?.role ?? m?.identity ?? '-' }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="currentMode === 'logs'" class="prep-panel">
          <div class="prep-panel__head">
            <span>操作记录</span>
          </div>
          <div class="prep-panel__body">
            <div class="prep-grid-head logs">
              <span>时间</span>
              <span>操作者</span>
              <span>内容</span>
            </div>
            <div v-if="logsLoading" class="prep-panel__empty">加载中...</div>
            <div v-else-if="spaceLogs.length === 0" class="prep-panel__empty">暂无记录</div>
            <div v-else class="prep-grid-body">
              <div v-for="(l, idx) in spaceLogs" :key="l?.id ?? l?.logId ?? idx" class="prep-grid-row logs">
                <span>{{ l?.time ?? l?.createdAt ?? l?.created_at ?? '-' }}</span>
                <span>{{ l?.operator ?? l?.accountId ?? l?.userName ?? '-' }}</span>
                <span class="logs-content">{{ l?.content ?? l?.message ?? l?.action ?? '-' }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <div
      v-if="createPrepSpaceFormVisible"
      class="prep-create-dialog"
      @click.self="cancelCreatePrepSpace"
    >
      <div class="prep-create-dialog__panel">
        <div class="prep-create-dialog__header">
          <h3>新建备课区</h3>
          <button type="button" @click="cancelCreatePrepSpace">×</button>
        </div>

        <div class="prep-create-form">
          <div class="prep-create-form__row">
            <label>名称</label>
            <input v-model="createPrepSpaceForm.name" type="text" placeholder="请输入备课区名称" />
          </div>
          <div class="prep-create-form__row">
            <label>类型</label>
            <select v-model="createPrepSpaceForm.spaceType">
              <option value="个人">个人</option>
              <option value="小组">小组</option>
            </select>
          </div>
          <div class="prep-create-form__row">
            <label>课程ID</label>
            <input v-model="createPrepSpaceForm.courseId" type="text" placeholder="可选" />
          </div>
          <div class="prep-create-form__row is-textarea">
            <label>描述</label>
            <textarea v-model="createPrepSpaceForm.description" placeholder="请输入备课区描述"></textarea>
          </div>
          <div class="prep-create-form__actions">
            <button
              type="button"
              class="is-primary"
              :disabled="createPrepSpaceSubmitting"
              @click="createPrepSpace"
            >
              {{ createPrepSpaceSubmitting ? '提交中...' : '确认新建' }}
            </button>
            <button type="button" :disabled="createPrepSpaceSubmitting" @click="cancelCreatePrepSpace">取消</button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="createFolderDialogVisible"
      class="prep-create-dialog"
      @click.self="closeCreateFolderDialog"
    >
      <div class="prep-create-dialog__panel is-folder-dialog">
        <div class="prep-create-dialog__header">
          <h3>新建文件夹</h3>
          <button type="button" @click="closeCreateFolderDialog">×</button>
        </div>

        <div class="prep-create-form">
          <div class="prep-create-form__meta">
            <span>当前模块：{{ activeTab }}</span>
            <span>所在位置：{{ getCurrentFolderName() || '根目录' }}</span>
          </div>
          <div class="prep-create-form__row">
            <label>文件夹名称</label>
            <input v-model="createFolderForm.name" type="text" placeholder="请输入新文件夹名称" />
          </div>
          <div class="prep-create-form__row is-textarea">
            <label>备注</label>
            <textarea v-model="createFolderForm.description" placeholder="可选，填写文件夹说明"></textarea>
          </div>
          <div class="prep-create-form__actions">
            <button
              type="button"
              class="is-primary"
              :disabled="createFolderSubmitting"
              @click="submitCreateFolder"
            >
              {{ createFolderSubmitting ? '提交中...' : '确认新建' }}
            </button>
            <button type="button" :disabled="createFolderSubmitting" @click="closeCreateFolderDialog">取消</button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="createContentDialogVisible"
      class="prep-create-dialog"
      @click.self="closeCreateContentDialog"
    >
      <div class="prep-create-dialog__panel">
        <div class="prep-create-dialog__header">
          <h3>{{ createContentContext.tab === '作业' ? '新增作业' : '新增话题' }}</h3>
          <button type="button" @click="closeCreateContentDialog">×</button>
        </div>

        <div class="prep-create-form">
          <div class="prep-create-form__meta">
            <span>当前模块：{{ createContentContext.tab }}</span>
            <span>所在位置：{{ createContentContext.folderName || '根目录' }}</span>
          </div>
          <div class="prep-create-form__row">
            <label>标题</label>
            <input v-model="createContentForm.title" type="text" :placeholder="createContentContext.tab === '作业' ? '请输入作业标题' : '请输入话题标题'" />
          </div>
          <div class="prep-create-form__row is-textarea">
            <label>内容</label>
            <textarea v-model="createContentForm.content" :placeholder="createContentContext.tab === '作业' ? '请输入作业内容' : '请输入话题内容（可选）'"></textarea>
          </div>
          <div class="prep-create-form__actions">
            <button
              type="button"
              class="is-primary"
              :disabled="createContentSubmitting"
              @click="submitCreateContent"
            >
              {{ createContentSubmitting ? '提交中...' : '确认新增' }}
            </button>
            <button type="button" :disabled="createContentSubmitting" @click="closeCreateContentDialog">取消</button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="importContentDialogVisible"
      class="prep-create-dialog"
      @click.self="closeImportContentDialog"
    >
      <div class="prep-create-dialog__panel is-import-browser-dialog">
        <div class="prep-create-dialog__header">
          <h3>{{ importContentContext.tab === '作业' ? '导入作业' : '导入话题' }}</h3>
          <button type="button" @click="closeImportContentDialog">×</button>
        </div>

        <div class="prep-create-form">
          <div class="prep-create-form__meta">
            <span>当前模块：{{ importContentContext.tab }}</span>
            <span>导入到：{{ importContentContext.folderName || '根目录' }}</span>
          </div>
          <div class="prep-import-browser">
            <div class="prep-import-browser__sidebar">
              <div class="prep-import-browser__search">
                <input v-model="importCourseKeyword" type="text" placeholder="搜索课程" />
              </div>
              <div class="prep-import-browser__course-list">
                <button
                  v-for="course in filteredImportCourses"
                  :key="`content-course-${course.id}`"
                  type="button"
                  class="prep-import-browser__course-item"
                  :class="{ 'is-active': String(importContentForm.courseId) === String(course.id) }"
                  @click="selectImportContentCourse(course.id)"
                >
                  <span class="prep-import-browser__course-name">{{ course.name }}</span>
                  <span class="prep-import-browser__course-meta">{{ getImportCourseMeta(course) }}</span>
                  <span class="prep-import-browser__course-extra">{{ getImportCourseExtra(course) }}</span>
                </button>
                <div v-if="filteredImportCourses.length === 0" class="prep-import-browser__empty is-sidebar-empty">未找到匹配课程</div>
              </div>
            </div>
            <div class="prep-import-browser__content">
              <div class="prep-import-browser__toolbar">
                <div class="prep-import-browser__title">
                  {{ selectedImportContentCourse?.name || '请选择课程' }}
                </div>
                <div class="prep-import-browser__count">
                  共 {{ importContentOptions.length }} 项
                </div>
              </div>
              <div v-if="importContentLoading" class="prep-import-browser__empty">内容加载中...</div>
              <div v-else-if="importContentOptions.length === 0" class="prep-import-browser__empty">当前课程暂无可导入内容</div>
              <label
                v-for="item in importContentOptions"
                v-else
                :key="`${importContentContext.tab}-${item.id}`"
                class="prep-import-browser__option"
                :class="{ 'is-selected': importContentForm.selectedIds.includes(String(item.id)) }"
              >
                <input v-model="importContentForm.selectedIds" type="checkbox" :value="String(item.id)" />
                <div class="prep-import-browser__option-main">
                  <span class="prep-import-browser__option-name">{{ getImportItemName(item) }}</span>
                  <span class="prep-import-browser__option-meta">{{ getImportItemMeta(item) }}</span>
                </div>
                <span class="prep-import-browser__option-id">ID: {{ item.id }}</span>
              </label>
            </div>
          </div>
          <div class="prep-create-form__actions">
            <button
              type="button"
              class="is-primary"
              :disabled="importContentSubmitting"
              @click="submitImportContent"
            >
              {{ importContentSubmitting ? '提交中...' : '确认导入' }}
            </button>
            <button type="button" :disabled="importContentSubmitting" @click="closeImportContentDialog">取消</button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="importMaterialsDialogVisible"
      class="prep-create-dialog"
      @click.self="closeImportMaterialsDialog"
    >
      <div class="prep-create-dialog__panel is-import-browser-dialog">
        <div class="prep-create-dialog__header">
          <h3>导入资料</h3>
          <button type="button" @click="closeImportMaterialsDialog">×</button>
        </div>

        <div class="prep-create-form">
          <div class="prep-create-form__meta">
            <span>当前分类：{{ importMaterialsContext.category }}</span>
            <span>导入到：{{ importMaterialsContext.folderName || '根目录' }}</span>
          </div>
          <div class="prep-import-browser">
            <div class="prep-import-browser__sidebar">
              <div class="prep-import-browser__search">
                <input v-model="importCourseKeyword" type="text" placeholder="搜索课程" />
              </div>
              <div class="prep-import-browser__course-list">
                <button
                  v-for="course in filteredImportCourses"
                  :key="`materials-course-${course.id}`"
                  type="button"
                  class="prep-import-browser__course-item"
                  :class="{ 'is-active': String(importMaterialsForm.courseId) === String(course.id) }"
                  @click="selectImportMaterialsCourse(course.id)"
                >
                  <span class="prep-import-browser__course-name">{{ course.name }}</span>
                  <span class="prep-import-browser__course-meta">{{ getImportCourseMeta(course) }}</span>
                  <span class="prep-import-browser__course-extra">{{ getImportCourseExtra(course) }}</span>
                </button>
                <div v-if="filteredImportCourses.length === 0" class="prep-import-browser__empty is-sidebar-empty">未找到匹配课程</div>
              </div>
            </div>
            <div class="prep-import-browser__content">
              <div class="prep-import-browser__toolbar">
                <div class="prep-import-browser__title">
                  {{ selectedImportMaterialsCourse?.name || '请选择课程' }}
                </div>
                <select v-model="importMaterialsForm.itemType" @change="importMaterialsForm.selectedIds = []">
                  <option value="attachment">资料</option>
                  <option value="folder">文件夹</option>
                  <option value="link">外链</option>
                </select>
              </div>
              <div class="prep-import-browser__count">
                共 {{ selectedImportMaterialsOptions.length }} 项
              </div>
              <div v-if="importMaterialsLoading" class="prep-import-browser__empty">资料加载中...</div>
              <div v-else-if="selectedImportMaterialsOptions.length === 0" class="prep-import-browser__empty">当前课程该分类暂无可导入资料</div>
              <label
                v-for="item in selectedImportMaterialsOptions"
                v-else
                :key="`${importMaterialsForm.itemType}-${item.id}`"
                class="prep-import-browser__option"
                :class="{ 'is-selected': importMaterialsForm.selectedIds.includes(String(item.id)) }"
              >
                <input v-model="importMaterialsForm.selectedIds" type="checkbox" :value="String(item.id)" />
                <div class="prep-import-browser__option-main">
                  <span class="prep-import-browser__option-name">{{ getImportItemName(item) }}</span>
                  <span class="prep-import-browser__option-meta">{{ getImportItemMeta(item) }}</span>
                </div>
                <span class="prep-import-browser__option-id">ID: {{ item.id }}</span>
              </label>
            </div>
          </div>
          <div class="prep-create-form__actions">
            <button
              type="button"
              class="is-primary"
              :disabled="importMaterialsSubmitting"
              @click="submitImportMaterials"
            >
              {{ importMaterialsSubmitting ? '提交中...' : '确认导入' }}
            </button>
            <button type="button" :disabled="importMaterialsSubmitting" @click="closeImportMaterialsDialog">取消</button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="topicDetailDialogVisible"
      class="prep-create-dialog"
      @click.self="closeTopicDetailDialog"
    >
      <div class="prep-create-dialog__panel">
        <div class="prep-create-dialog__header">
          <h3>话题详情</h3>
          <button type="button" @click="closeTopicDetailDialog">×</button>
        </div>

        <div class="prep-create-form">
          <div class="prep-create-form__meta">
            <span>发布人：{{ topicDetailData.authorName || '-' }}</span>
            <span>发布时间：{{ topicDetailData.createTime || '-' }}</span>
          </div>
          <div v-if="topicDetailLoading" class="prep-import-browser__empty">话题详情加载中...</div>
          <div v-else class="prep-topic-detail">
            <div class="prep-topic-detail__title">{{ topicDetailData.title || '未命名话题' }}</div>
            <div class="prep-topic-detail__content">{{ topicDetailData.content || '暂无话题内容' }}</div>
            <div class="prep-topic-detail__section-title">回复 {{ topicDetailData.replies.length }} 条</div>
            <div v-if="topicDetailData.replies.length === 0" class="prep-import-browser__empty">暂无回复</div>
            <div v-else class="prep-topic-detail__reply-list">
              <div
                v-for="reply in topicDetailData.replies"
                :key="reply.replyId || `${reply.authorId}-${reply.createTime}`"
                class="prep-topic-detail__reply-item"
              >
                <div class="prep-topic-detail__reply-meta">
                  <span>{{ reply.authorName || '匿名用户' }}</span>
                  <span>{{ reply.createTime || '-' }}</span>
                </div>
                <div class="prep-topic-detail__reply-content">{{ reply.content || '' }}</div>
              </div>
            </div>
          </div>
          <div class="prep-create-form__actions">
            <button type="button" class="is-primary" @click="closeTopicDetailDialog">关闭</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
:global(body) {
  margin: 0 !important;
  display: block !important;
  place-items: initial !important;
  background: #f5f6f8;
}

:global(#app) {
  width: 100% !important;
  max-width: none !important;
  margin: 0 !important;
  padding: 0 !important;
  display: block !important;
}

.lesson-prep-page {
  min-width: 1280px;
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
.prep-layout,
.prep-sidebar__header,
.prep-sidebar__groups,
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
  width: auto;
  height: 28px;
  display: block;
}

.prep-topbar__nav {
  gap: 6px;
}

.prep-topbar__nav-item,
.prep-topbar__more,
.prep-topbar__bell,
.prep-sidebar__header button,
.prep-sidebar__create,
.prep-sidebar__group,
.prep-sidebar__item,
.prep-workspace__top-actions button,
.prep-workspace__tab,
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
  top: calc(100% + 12px);
  right: 0;
  min-width: 160px;
  padding: 8px 0;
  background: #ffffff;
  border-radius: 2px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
  z-index: 1200;
}

.prep-user-dropdown button {
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: #000000;
  text-align: center;
}

.prep-user-dropdown button:hover {
  background: #f1f1f1;
}

.prep-layout {
  min-height: calc(100vh - 60px);
  align-items: stretch;
}

.prep-sidebar {
  width: 240px;
  flex: 0 0 240px;
  padding: 16px 12px;
  background: #fafbfc;
  border-right: 1px solid #e6e9ef;
}

.prep-sidebar__header {
  justify-content: space-between;
  margin-bottom: 14px;
}

.prep-sidebar__header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
}

.prep-sidebar__header button {
  width: auto;
  height: auto;
  padding: 0;
  border: none;
  background: transparent;
  color: #546175;
}

.prep-sidebar__create {
  width: 100%;
  height: 34px;
  border: 1px solid #dbe2ed;
  border-radius: 6px;
  background: #fff;
  color: #455166;
  font-size: 13px;
  white-space: nowrap;
}

.prep-create-dialog {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(17, 24, 39, 0.36);
  z-index: 1400;
}

.prep-create-dialog__panel {
  width: min(560px, 100%);
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.22);
  overflow: hidden;
}

.prep-create-dialog__panel.is-folder-dialog {
  width: min(520px, 100%);
}

.prep-create-dialog__panel.is-import-browser-dialog {
  width: min(920px, 100%);
}

.prep-create-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  border-bottom: 1px solid #e8edf5;
}

.prep-create-dialog__header h3 {
  margin: 0;
  color: #1f2937;
  font-size: 18px;
  font-weight: 700;
}

.prep-create-dialog__header button {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 50%;
  background: #f3f6fb;
  color: #5b667a;
  font-size: 20px;
  line-height: 1;
}

.prep-create-form {
  padding: 20px 22px 22px;
  background: #ffffff;
}

.prep-create-form__meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f5f8ff;
  color: #5e6b82;
  font-size: 12px;
}

.prep-create-form__row {
  display: grid;
  grid-template-columns: 52px 1fr;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.prep-create-form__row.is-textarea {
  align-items: start;
}

.prep-create-form__row label {
  color: #556175;
  font-size: 12px;
}

.prep-create-form__row input,
.prep-create-form__row select,
.prep-create-form__row textarea {
  width: 100%;
  border: 1px solid #dce3ee;
  border-radius: 6px;
  background: #fff;
  color: #364055;
  font-size: 12px;
  outline: none;
}

.prep-create-form__row input,
.prep-create-form__row select {
  height: 30px;
  padding: 0 10px;
}

.prep-create-form__row textarea {
  min-height: 72px;
  padding: 8px 10px;
  resize: vertical;
}

.prep-create-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.prep-create-form__actions button {
  min-width: 96px;
  height: 34px;
  border: 1px solid #dce3ee;
  border-radius: 6px;
  background: #fff;
  color: #46526a;
  font-size: 12px;
}

.prep-create-form__actions .is-primary {
  border-color: #2f6bff;
  background: #2f6bff;
  color: #fff;
}

.prep-import-browser {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: 18px;
}

.prep-import-browser__sidebar {
  min-height: 360px;
  border-right: 1px solid #e8edf5;
  padding-right: 18px;
}

.prep-import-browser__search {
  margin-bottom: 12px;
}

.prep-import-browser__search input {
  width: 100%;
  height: 34px;
  padding: 0 12px;
  border: 1px solid #dce3ee;
  border-radius: 8px;
  outline: none;
  color: #364055;
  font-size: 13px;
}

.prep-import-browser__course-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 380px;
  overflow-y: auto;
}

.prep-import-browser__course-item {
  width: 100%;
  padding: 12px 12px 10px;
  border: 1px solid #e4e9f2;
  border-radius: 10px;
  background: #fff;
  text-align: left;
}

.prep-import-browser__course-item.is-active {
  border-color: #2f6bff;
  background: #edf3ff;
}

.prep-import-browser__course-name,
.prep-import-browser__course-meta,
.prep-import-browser__course-extra,
.prep-import-browser__option-name,
.prep-import-browser__option-meta,
.prep-import-browser__option-id {
  display: block;
}

.prep-import-browser__course-name {
  color: #1f2937;
  font-size: 14px;
  font-weight: 600;
}

.prep-import-browser__course-meta,
.prep-import-browser__course-extra,
.prep-import-browser__option-meta,
.prep-import-browser__option-id,
.prep-import-browser__count {
  margin-top: 4px;
  color: #6b7280;
  font-size: 12px;
}

.prep-import-browser__content {
  min-height: 360px;
}

.prep-import-browser__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.prep-import-browser__title {
  color: #1f2937;
  font-size: 16px;
  font-weight: 600;
}

.prep-import-browser__toolbar select {
  min-width: 110px;
  height: 32px;
  padding: 0 10px;
  border: 1px solid #dce3ee;
  border-radius: 8px;
  background: #fff;
  color: #364055;
  font-size: 12px;
}

.prep-import-browser__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  border: 1px dashed #dce3ee;
  border-radius: 12px;
  color: #7b8798;
  font-size: 13px;
  background: #fafcff;
}

.prep-import-browser__empty.is-sidebar-empty {
  min-height: 120px;
}

.prep-topic-detail {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.prep-topic-detail__title {
  color: #1f2937;
  font-size: 18px;
  font-weight: 600;
}

.prep-topic-detail__content {
  padding: 14px 16px;
  border-radius: 10px;
  background: #f8fbff;
  color: #3b4658;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.prep-topic-detail__section-title {
  color: #1f2937;
  font-size: 14px;
  font-weight: 600;
}

.prep-topic-detail__reply-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 320px;
  overflow-y: auto;
}

.prep-topic-detail__reply-item {
  padding: 12px 14px;
  border: 1px solid #e8edf5;
  border-radius: 10px;
  background: #fff;
}

.prep-topic-detail__reply-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
  color: #6b7280;
  font-size: 12px;
}

.prep-topic-detail__reply-content {
  color: #364055;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.prep-import-browser__option {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  padding: 14px 16px;
  border: 1px solid #e4e9f2;
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
}

.prep-import-browser__option.is-selected {
  border-color: #2f6bff;
  background: #f5f8ff;
}

.prep-import-browser__option input {
  width: 16px;
  height: 16px;
  margin: 0;
}

.prep-import-browser__option-main {
  min-width: 0;
}

.prep-import-browser__option-name {
  color: #1f2937;
  font-size: 14px;
  font-weight: 600;
  word-break: break-all;
}

.prep-sidebar__groups {
  gap: 10px;
  margin: 14px 0 12px;
}

.prep-sidebar__group {
  color: #5a657a;
  font-size: 13px;
  white-space: nowrap;
}

.prep-sidebar__group.is-active {
  color: #2f6bff;
  font-weight: 600;
}

.prep-sidebar__filter input {
  width: 100%;
  height: 32px;
  padding: 0 10px;
  border: 1px solid #dce3ee;
  border-radius: 8px;
  outline: none;
  font-size: 13px;
  color: #4c576b;
  background: #fff;
}

.prep-sidebar__list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
}

.prep-sidebar__item-wrap {
  position: relative;
}

.prep-sidebar__item {
  width: 100%;
  min-height: 38px;
  padding: 0 38px 0 10px;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 8px;
  border: 1px solid transparent;
  border-radius: 8px;
  color: #364055;
  text-align: left;
}

.prep-sidebar__item.is-active {
  background: #edf2ff;
  border-color: #d8e4ff;
}

.prep-sidebar__tag {
  min-width: 28px;
  height: 18px;
  padding: 0 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #edf3ff;
  color: #2f6bff;
  font-size: 11px;
}

.prep-sidebar__name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 13px;
}

.prep-sidebar__more-wrap {
  position: absolute;
  top: 50%;
  right: 8px;
  transform: translateY(-50%);
}

.prep-sidebar__more-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #7d879b;
  font-size: 18px;
  line-height: 1;
}

.prep-sidebar__more-btn:hover:not(:disabled) {
  background: #eef3ff;
  color: #2f6bff;
}

.prep-sidebar__more-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.prep-sidebar__menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 120px;
  padding: 6px;
  border: 1px solid #dbe3f1;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(20, 32, 61, 0.12);
  z-index: 20;
}

.prep-sidebar__menu button {
  width: 100%;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #46526a;
  font-size: 13px;
  text-align: left;
}

.prep-sidebar__menu button:hover:not(:disabled) {
  background: #f4f7fb;
}

.prep-sidebar__menu button.danger {
  color: #d14343;
}

.prep-sidebar__menu button.danger:hover:not(:disabled) {
  background: #fff1f1;
}

.prep-sidebar__menu-tip {
  padding: 8px 10px;
  color: #7d879b;
  font-size: 12px;
}

.prep-workspace {
  flex: 1;
  min-width: 0;
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

.prep-workspace__tabs {
  gap: 22px;
  margin-top: 14px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e7ebf2;
}

.prep-workspace__tab {
  color: #5a667c;
  font-size: 14px;
  white-space: nowrap;
}

.prep-workspace__tab.is-active {
  color: #2f6bff;
  font-weight: 600;
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

.prep-folder-back {
  height: 30px;
  padding: 0 10px;
  border: 1px solid #dce3ee;
  border-radius: 999px;
  background: #fff;
  color: #4c576b;
  font-size: 12px;
  white-space: nowrap;
}

.prep-workspace__search input {
  width: 128px;
  height: 30px;
  padding: 0 12px;
  border: 1px solid #dce3ee;
  border-radius: 999px;
  outline: none;
  color: #4c576b;
  font-size: 13px;
}

.prep-hidden-file {
  display: none;
}

.prep-workspace__table {
  margin-top: 14px;
  border-top: 1px solid #eceff5;
}

.prep-workspace__table-head {
  min-height: 36px;
  display: grid;
  grid-template-columns: 28px 1.7fr 0.8fr 0.7fr 0.9fr 0.8fr 0.8fr;
  align-items: center;
  padding: 0 8px;
  background: #f7f8fa;
  color: #556175;
  font-size: 13px;
  border-bottom: 1px solid #eceff5;
}

.prep-workspace__table-head .is-checkbox {
  width: 12px;
  height: 12px;
  border: 1px solid #d3dbe8;
  border-radius: 2px;
  background: #fff;
}

.prep-workspace__empty {
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9aa4b6;
  font-size: 14px;
}

.prep-workspace__error {
  padding: 10px 12px;
  color: #b42318;
  background: #fffbfa;
  border: 1px solid #fda29b;
  margin-top: 10px;
  border-radius: 8px;
  font-size: 13px;
}

.prep-table-filter {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 8px;
  border-bottom: 1px solid #eceff5;
}

.prep-table-filter__label {
  color: #556175;
  font-size: 13px;
  white-space: nowrap;
}

.prep-table-filter__options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.prep-table-filter__btn {
  height: 28px;
  padding: 0 10px;
  border: 1px solid #dce3ee;
  border-radius: 999px;
  background: #fff;
  color: #46526a;
  font-size: 13px;
}

.prep-table-filter__btn.active {
  border-color: #2f6bff;
  color: #2f6bff;
  background: #edf3ff;
}

.prep-table-body {
  display: flex;
  flex-direction: column;
}

.prep-table-row.is-folder {
  background: #fafbff;
}

.prep-table-row {
  display: grid;
  grid-template-columns: 28px 1.7fr 0.8fr 0.7fr 0.9fr 0.8fr 0.8fr;
  align-items: center;
  padding: 0 8px;
  min-height: 44px;
  border-bottom: 1px solid #f0f2f6;
  color: #3f4a5f;
  font-size: 13px;
}

.prep-table-row .name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prep-row-link,
.prep-inline-btn {
  border: none;
  background: transparent;
  color: #2f6bff;
  padding: 0;
  font-size: 13px;
}

.prep-row-link {
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prep-inline-btn.danger {
  color: #d92d20;
}

.prep-table-row .op a {
  color: #2f6bff;
  text-decoration: none;
}

.prep-table-row .op a:hover,
.prep-inline-btn:hover,
.prep-row-link:hover {
  text-decoration: underline;
}

.prep-table-row .op {
  display: flex;
  align-items: center;
  gap: 10px;
}

.prep-panel {
  margin-top: 14px;
  border: 1px solid #eceff5;
}

.prep-panel__head {
  padding: 10px 12px;
  background: #f7f8fa;
  border-bottom: 1px solid #eceff5;
  color: #3f4a5f;
  font-size: 13px;
  font-weight: 600;
}

.prep-panel__body {
  padding: 0 12px 12px;
}

.prep-panel__empty {
  min-height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9aa4b6;
  font-size: 14px;
}

.prep-grid-head {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  align-items: center;
  min-height: 36px;
  color: #556175;
  font-size: 13px;
  border-bottom: 1px solid #eceff5;
}

.prep-grid-head.logs {
  grid-template-columns: 0.9fr 0.7fr 2.4fr;
}

.prep-grid-body {
  display: flex;
  flex-direction: column;
}

.prep-grid-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  align-items: center;
  min-height: 42px;
  border-bottom: 1px solid #f0f2f6;
  color: #3f4a5f;
  font-size: 13px;
}

.prep-grid-row.logs {
  grid-template-columns: 0.9fr 0.7fr 2.4fr;
}

.logs-content {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
