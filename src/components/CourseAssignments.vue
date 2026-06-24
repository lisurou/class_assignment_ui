<script setup>
import { computed, ref, watch } from 'vue';
import axios from 'axios';
import { ElMessage, ElMessageBox } from 'element-plus';
import { useUserStore } from '@/stores/userStore';

const props = defineProps({
  courseId: {
    type: [String, Number],
    default: ''
  },
  course: {
    type: Object,
    default: () => ({})
  },
  iTeach: {
    type: Boolean,
    default: false
  },
  iLearn: {
    type: Boolean,
    default: false
  },
  showTeacherAssignment: {
    type: Boolean,
    default: false
  },
  showLearnAssignment: {
    type: Boolean,
    default: false
  },
  displayReleaseAssignment: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits([
  'update:showTeacherAssignment',
  'update:showLearnAssignment',
  'update:displayReleaseAssignment'
]);

const userStore = useUserStore();

const showTeacherAssignmentModel = computed({
  get: () => props.showTeacherAssignment,
  set: (value) => emit('update:showTeacherAssignment', value)
});

const showLearnAssignmentModel = computed({
  get: () => props.showLearnAssignment,
  set: (value) => emit('update:showLearnAssignment', value)
});

const displayReleaseAssignmentModel = computed({
  get: () => props.displayReleaseAssignment,
  set: (value) => emit('update:displayReleaseAssignment', value)
});

const errorMessage = ref('');
const successMessage = ref('');
const currentAssignmentDetail = ref(null);

const assignmentDetails = computed(() => userStore.assignmentDetails || []);
const validAssignmentDetails = computed(() => assignmentDetails.value.filter(item => item));

let LearnAssignmentDetail = ref({});
const learnAssignmentTab = ref('detail');
const studentSubmitEditing = ref(false);
const studentSubmitHasSubmitted = ref(false);
const selectedSubmissionFile = ref(null);
const teacherAssignmentTab = ref('detail');
const teacherReviewFilter = ref('all');
const teacherReviewKeyword = ref('');
const scoreDrafts = ref({});
const scoreSavingMap = ref({});
const activeTeacherAssignmentMenu = ref('');
const teacherAssignmentStatsMap = ref({});
const teacherAiReviewEnabledMap = ref({});
const teacherCommentDraft = ref('');
const teacherCommentRealName = ref(true);
const teacherCommentAttachmentOnly = ref(false);
const releaseEditMode = ref(false);
const editingAssignmentId = ref('');
const releaseLockPublishSettings = ref(false);
const releaseSubmitAction = ref('create');

const formatFileSize = (size) => {
  if (!size && size !== 0) return '';
  if (size < 1024) return `${size}B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)}KB`;
  return `${(size / (1024 * 1024)).toFixed(1)}MB`;
};

const buildSubmissionFileMeta = (assignmentDetail) => {
  if (!assignmentDetail?.fileName) return null;
  return {
    name: assignmentDetail.fileName,
    size: assignmentDetail.fileSize,
    sizeText: formatFileSize(assignmentDetail.fileSize),
    downloadUrl: assignmentDetail.fileDownloadUrl || '',
    rawFile: null
  };
};

const currentCourseId = computed(() => String(props.courseId || props.course?.id || ''));

const getTeacherCourseStudentIds = () => String(props.course?.students || '')
  .split(',')
  .map(item => item.trim())
  .filter(Boolean);

const getTeacherStudentAssignments = (assignments = []) => {
  const studentIds = getTeacherCourseStudentIds();
  if (!studentIds.length) {
    return assignments.filter(item => item?.accountId && item.accountId !== userStore.account?.accountId);
  }
  const studentIdSet = new Set(studentIds);
  return assignments.filter(item => studentIdSet.has(String(item?.accountId || '')));
};

const getTeacherSubmittedCount = (assignments = []) => (
  new Set(
    assignments
      .filter(item => item?.submit === '已提交')
      .map(item => String(item?.accountId || ''))
      .filter(Boolean)
  ).size
);

const getTeacherStudentTotal = () => {
  const studentIds = getTeacherCourseStudentIds();
  if (studentIds.length) {
    return studentIds.length;
  }
  return Number(props.course?.number || 0);
};

const calculateTeacherAssignmentStats = (assignments = []) => {
  const studentAssignments = getTeacherStudentAssignments(assignments);
  const totalStudents = getTeacherStudentTotal();
  const submittedCount = getTeacherSubmittedCount(studentAssignments);
  return {
    corrected: studentAssignments.filter(item => item?.submit === '已提交' && item?.correct === '已批改').length,
    pending: studentAssignments.filter(item => item?.submit === '已提交' && item?.correct !== '已批改').length,
    missing: Math.max((totalStudents || studentAssignments.length) - submittedCount, 0)
  };
};

const getTeacherAssignmentStatsKey = (assignmentDetail) => `${assignmentDetail?.id || ''}_${assignmentDetail?.assignmentId || ''}`;

const loadTeacherAssignmentStats = async (assignments = [], courseId = currentCourseId.value) => {
  if (!props.iTeach) {
    teacherAssignmentStatsMap.value = {};
    return;
  }
  const assignmentList = assignments.filter(item => item?.assignmentId);
  const statsEntries = await Promise.all(assignmentList.map(async (assignmentDetail) => {
    try {
      const response = await axios.post('http://localhost:8080/check-assignment-submit', {
        accountId: userStore.account?.accountId,
        id: assignmentDetail.id || courseId,
        assignmentId: assignmentDetail.assignmentId
      });
      const stats = response.data?.success
        ? calculateTeacherAssignmentStats(response.data.assignments || [])
        : { corrected: 0, pending: 0, missing: 0 };
      return [getTeacherAssignmentStatsKey(assignmentDetail), stats];
    } catch (error) {
      console.log('加载教师作业统计失败：', error);
      return [getTeacherAssignmentStatsKey(assignmentDetail), { corrected: 0, pending: 0, missing: 0 }];
    }
  }));
  teacherAssignmentStatsMap.value = Object.fromEntries(statsEntries);
};

const getTeacherAssignmentStats = (assignmentDetail) => {
  return teacherAssignmentStatsMap.value[getTeacherAssignmentStatsKey(assignmentDetail)] || {
    corrected: 0,
    pending: 0,
    missing: 0
  };
};

const teacherSubmissionStats = computed(() => {
  const list = getTeacherStudentAssignments(validAssignmentDetails.value);
  const totalStudents = getTeacherStudentTotal();
  const submittedCount = getTeacherSubmittedCount(list);
  return {
    all: totalStudents || list.length,
    unreviewed: list.filter(item => item.submit === '已提交' && item.correct !== '已批改').length,
    reviewed: list.filter(item => item.correct === '已批改').length,
    unsubmitted: Math.max((totalStudents || list.length) - submittedCount, 0)
  };
});

const getTeacherAiReviewKey = (assignmentDetail = currentAssignmentDetail.value) => assignmentDetail?.assignmentId || '';

const getTeacherAiReviewEnabled = (assignmentDetail = currentAssignmentDetail.value) => {
  const key = getTeacherAiReviewKey(assignmentDetail);
  return key ? !!teacherAiReviewEnabledMap.value[key] : false;
};

const handleTeacherAiReviewToggle = (assignmentDetail, enabled) => {
  const key = getTeacherAiReviewKey(assignmentDetail);
  if (!key) return;
  teacherAiReviewEnabledMap.value = {
    ...teacherAiReviewEnabledMap.value,
    [key]: enabled
  };
};

const filteredTeacherSubmissionDetails = computed(() => {
  const keyword = teacherReviewKeyword.value.trim();
  return validAssignmentDetails.value.filter((item) => {
    if (teacherReviewFilter.value === 'unreviewed' && !(item.submit === '已提交' && item.correct !== '已批改')) {
      return false;
    }
    if (teacherReviewFilter.value === 'reviewed' && item.correct !== '已批改') {
      return false;
    }
    if (teacherReviewFilter.value === 'unsubmitted' && item.submit === '已提交') {
      return false;
    }
    if (!keyword) return true;
    return String(item.accountId || '').includes(keyword) || String(item.title || '').includes(keyword);
  });
});

const getDraftScore = (assignmentDetail) => {
  const key = `${assignmentDetail.assignmentId}_${assignmentDetail.accountId || ''}`;
  if (scoreDrafts.value[key] == null) {
    scoreDrafts.value[key] = assignmentDetail.score || '';
  }
  return key;
};

const isScoreSaving = (assignmentDetail) => {
  const scoreKey = `${assignmentDetail.assignmentId}_${assignmentDetail.accountId || ''}`;
  return !!scoreSavingMap.value[scoreKey];
};

const handleScoreBlur = async (assignmentDetail) => {
  if (assignmentDetail?.submit !== '已提交') {
    return;
  }
  const scoreKey = getDraftScore(assignmentDetail);
  const rawValue = String(scoreDrafts.value[scoreKey] ?? '').trim();
  if (!rawValue) {
    errorMessage.value = '请输入成绩';
    ElMessage.error(errorMessage.value);
    scoreDrafts.value[scoreKey] = assignmentDetail.score ?? '';
    return;
  }
  const nextScore = Number(rawValue);
  const maxScore = Number(currentAssignmentDetail.value?.totalScore || 100);
  if (!Number.isFinite(nextScore) || nextScore < 0 || nextScore > maxScore) {
    errorMessage.value = `成绩需在0到${maxScore}之间`;
    ElMessage.error(errorMessage.value);
    scoreDrafts.value[scoreKey] = assignmentDetail.score ?? '';
    return;
  }
  if (String(assignmentDetail.score ?? '') === String(nextScore) && assignmentDetail.correct === '已批改') {
    scoreDrafts.value[scoreKey] = nextScore;
    return;
  }
  if (isScoreSaving(assignmentDetail)) {
    return;
  }
  scoreSavingMap.value = {
    ...scoreSavingMap.value,
    [scoreKey]: true
  };
  try {
    const response = await axios.post('http://localhost:8080/correct-assignment', {
      accountId: assignmentDetail.accountId,
      id: assignmentDetail.id,
      assignmentId: assignmentDetail.assignmentId,
      score: nextScore,
    });
    const data = response.data;
    if (data.success) {
      successMessage.value = '成绩修改成功';
      userStore.setAssignmentDetails(data.assignments);
      scoreDrafts.value[scoreKey] = nextScore;
      ElMessage.success(successMessage.value);
    } else {
      errorMessage.value = data.message || '成绩修改失败';
      ElMessage.error(errorMessage.value);
      scoreDrafts.value[scoreKey] = assignmentDetail.score ?? '';
    }
  } catch (error) {
    console.log('成绩修改失败：', error);
    errorMessage.value = '服务器错误，请稍后重试';
    ElMessage.error(errorMessage.value);
    scoreDrafts.value[scoreKey] = assignmentDetail.score ?? '';
  } finally {
    scoreSavingMap.value = {
      ...scoreSavingMap.value,
      [scoreKey]: false
    };
  }
};

const submitContent = ref('');
const submissionFileInput = ref(null);

const triggerSubmissionFilePicker = () => {
  submissionFileInput.value?.click();
};

const handleSubmissionFileChange = (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  selectedSubmissionFile.value = {
    name: file.name,
    size: file.size,
    sizeText: formatFileSize(file.size),
    downloadUrl: '',
    rawFile: file
  };
  event.target.value = '';
};

const startResubmit = () => {
  studentSubmitEditing.value = true;
  submitContent.value = LearnAssignmentDetail.value.submitContent || '';
};

const downloadSubmittedFile = () => {
  if (!selectedSubmissionFile.value?.downloadUrl) {
    ElMessage.info('当前没有可下载的附件');
    return;
  }
  const link = document.createElement('a');
  link.href = selectedSubmissionFile.value.downloadUrl;
  link.target = '_blank';
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const buildAssignmentFileUrl = (assignmentDetail) => {
  const accountId = assignmentDetail?.accountId;
  const id = assignmentDetail?.id;
  const assignmentId = assignmentDetail?.assignmentId;
  if (!accountId || !id || !assignmentId) {
    return '';
  }
  const qs = new URLSearchParams({
    accountId: String(accountId),
    id: String(id),
    assignmentId: String(assignmentId)
  });
  return `http://localhost:8080/assignment-file?${qs.toString()}`;
};

const downloadTeacherSubmissionFile = (assignmentDetail) => {
  if (!assignmentDetail?.fileName) {
    ElMessage.info('该学生未上传附件');
    return;
  }
  const url = assignmentDetail?.fileDownloadUrl || buildAssignmentFileUrl(assignmentDetail);
  if (!url) {
    ElMessage.error('附件下载链接生成失败');
    return;
  }
  window.open(url, '_blank', 'noopener');
};

const fetchLatestAssignments = async () => {
  const id = currentCourseId.value;
  if (!id) return;
  try {
    const response = await axios.post('http://localhost:8080/assignment-details', {
      id,
      accountId: userStore.account?.accountId,
    });
    if (response.data.success) {
      userStore.setAssignmentDetails(response.data.assignments);
      if (props.iTeach) {
        await loadTeacherAssignmentStats(response.data.assignments || [], id);
      }
    }
  } catch (error) {
    console.error("返回时刷新作业失败：", error);
  }
};

const handleConfirmSubmit = async () => {
  const actualSubmitContent = submitContent.value?.trim() || '';
  const hasExistingFile = Boolean(LearnAssignmentDetail.value?.fileName);
  const hasNewFile = Boolean(selectedSubmissionFile.value?.rawFile);
  if (!hasExistingFile && !hasNewFile) {
    errorMessage.value = "请上传作业附件";
    ElMessage.error(errorMessage.value);
    return;
  }
  try {
    const formData = new FormData();
    formData.append('id', LearnAssignmentDetail.value.id);
    formData.append('accountId', userStore.account?.accountId || '');
    formData.append('assignmentId', LearnAssignmentDetail.value.assignmentId);
    formData.append('submitContent', actualSubmitContent);
    if (selectedSubmissionFile.value?.rawFile) {
      formData.append('file', selectedSubmissionFile.value.rawFile);
    }
    const response = await axios.post("http://localhost:8080/assignment-submit", formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    const data = response.data;
    if (data.success) {
      successMessage.value = data.message;
      userStore.setAssignmentSubmit(data.assignment || {});
      LearnAssignmentDetail.value = {
        ...LearnAssignmentDetail.value,
        submit: '已提交',
        submitContent: actualSubmitContent,
        fileName: data.assignment?.fileName || selectedSubmissionFile.value?.name || '',
        fileSize: data.assignment?.fileSize ?? selectedSubmissionFile.value?.size ?? null,
        fileDownloadUrl: data.assignment?.fileDownloadUrl || ''
      };
      selectedSubmissionFile.value = buildSubmissionFileMeta(LearnAssignmentDetail.value);
      studentSubmitEditing.value = false;
      studentSubmitHasSubmitted.value = true;
      await fetchLatestAssignments();
      ElMessage.success(successMessage.value);
    } else {
      errorMessage.value = data.message;
      ElMessage.error(errorMessage.value);
      console.log(errorMessage.value);
    }
  } catch (error) {
    console.log("查询作业详情失败：", error);
    errorMessage.value = "服务器错误，请稍后重试";
    ElMessage.error(errorMessage.value);
  }
};

const openLearnAssignmentPage = (assignmentDetail, tab = 'detail') => {
  LearnAssignmentDetail.value = assignmentDetail;
  learnAssignmentTab.value = tab;
  submitContent.value = assignmentDetail.submitContent || '';
  selectedSubmissionFile.value = buildSubmissionFileMeta(assignmentDetail);
  studentSubmitEditing.value = assignmentDetail.submit !== '已提交';
  studentSubmitHasSubmitted.value = assignmentDetail.submit === '已提交';
  showLearnAssignmentModel.value = true;
};

function handleViewLearnAssignmentDetail(assignmentDetail){
  openLearnAssignmentPage(assignmentDetail, 'detail');
}

function handleAssignmentSubmit(assignmentDetail){
  openLearnAssignmentPage(assignmentDetail, 'submit');
}

const handleCheckAssignmentSubmit = async(assignmentDetail) => {
  try{
    const response = await axios.post('http://localhost:8080/check-assignment-submit',{
      accountId: userStore.account?.accountId,
      id: currentCourseId.value,
      assignmentId: assignmentDetail.assignmentId
    });
    const data = response.data;
    if(data.success){
      successMessage.value = data.message;
      userStore.setAssignmentDetails(data.assignments);
      currentAssignmentDetail.value = assignmentDetail;
      teacherReviewFilter.value = 'all';
      teacherReviewKeyword.value = '';
      scoreDrafts.value = {};
      ElMessage.success(successMessage.value);
      showTeacherAssignmentModel.value = true;
    }else {
      errorMessage.value = data.message;
      ElMessage.error(errorMessage.value);
      console.log(errorMessage.value);
    }
  }catch(error){
    console.log("已提交作业页面加载失败：",error);
    errorMessage.value="服务器错误，请稍后重试";
    ElMessage.error(errorMessage.value);
  }
};

const openTeacherAssignmentDetail = (assignmentDetail) => {
  activeTeacherAssignmentMenu.value = '';
  teacherAssignmentTab.value = 'detail';
  teacherCommentDraft.value = '';
  teacherCommentRealName.value = true;
  teacherCommentAttachmentOnly.value = false;
  if (assignmentDetail?.assignmentId && !(assignmentDetail.assignmentId in teacherAiReviewEnabledMap.value)) {
    teacherAiReviewEnabledMap.value = {
      ...teacherAiReviewEnabledMap.value,
      [assignmentDetail.assignmentId]: false
    };
  }
  handleCheckAssignmentSubmit(assignmentDetail);
};

function fromTeachBack(){
  showTeacherAssignmentModel.value = false;
  fetchLatestAssignments();
}

function fromLearnBack(){
  fetchLatestAssignments();
  showLearnAssignmentModel.value = false;
  LearnAssignmentDetail.value = {};
  learnAssignmentTab.value = 'detail';
  studentSubmitEditing.value = false;
  selectedSubmissionFile.value = null;
}

const teacherHomeworkFilter = ref('all');

const isAssignmentPublished = (assignmentDetail) => {
  return !!assignmentDetail?.deadline && assignmentDetail.deadline !== '待发布';
};

const studentVisibleAssignmentDetails = computed(() => (
  validAssignmentDetails.value.filter(item => isAssignmentPublished(item))
));

const getTeacherAssignmentStageText = (assignmentDetail) => {
  if (!isAssignmentPublished(assignmentDetail)) {
    return '未发布';
  }
  if (!assignmentDetail?.deadline) {
    return '';
  }
  const deadlineTime = new Date(assignmentDetail.deadline).getTime();
  if (Number.isNaN(deadlineTime)) {
    return '';
  }
  return deadlineTime < Date.now() ? '已结束' : '';
};

const formatTeacherDeadlineShort = (deadline) => {
  if (!deadline) {
    return '暂无';
  }
  const normalized = String(deadline).trim().replace('T', ' ');
  const parsed = new Date(normalized.replace(/-/g, '/'));
  if (Number.isNaN(parsed.getTime())) {
    return deadline;
  }
  const year = String(parsed.getFullYear()).slice(2);
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  const hours = String(parsed.getHours()).padStart(2, '0');
  const minutes = String(parsed.getMinutes()).padStart(2, '0');
  return `${year}/${month}/${day} ${hours}:${minutes}`;
};

const filteredTeacherAssignments = computed(() => {
  if (teacherHomeworkFilter.value === 'pending') {
    return validAssignmentDetails.value.filter(item => getTeacherAssignmentStats(item).pending > 0);
  }
  if (teacherHomeworkFilter.value === 'corrected') {
    return validAssignmentDetails.value.filter(item => getTeacherAssignmentStats(item).corrected > 0);
  }
  return validAssignmentDetails.value;
});

const toggleTeacherAssignmentMenu = (assignmentId) => {
  activeTeacherAssignmentMenu.value = activeTeacherAssignmentMenu.value === assignmentId ? '' : assignmentId;
};

const handleDeleteCourseAssignment = async (assignmentDetail) => {
  if (!assignmentDetail?.assignmentId) return;
  activeTeacherAssignmentMenu.value = '';
  try {
    await ElMessageBox.confirm('删除后该作业及其学生记录将一并移除，是否继续？', '删除作业', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    });
    const response = await axios.post('http://localhost:8080/delete-course-assignment', {
      id: assignmentDetail.id,
      assignmentId: assignmentDetail.assignmentId
    });
    const data = response.data;
    if (data.success) {
      ElMessage.success(data.message || '作业删除成功');
      await fetchLatestAssignments();
      return;
    }
    ElMessage.error(data.message || '作业删除失败');
  } catch (error) {
    if (error === 'cancel' || error === 'close') {
      return;
    }
    console.log('删除作业失败：', error);
    ElMessage.error('删除作业失败，请稍后重试');
  }
};

const releaseImmediate = ref(false);
const releaseEnvironment = ref('');
const releaseChapter = ref('');
const releasePublishTime = ref('');
const releaseAllowFormat = ref('all');
const releaseLateForbidden = ref(false);
const releaseDuplicateCheck = ref(true);
const releaseDuplicateThreshold = ref('30');
const releaseAutoReturn = ref(false);
const releaseTag = ref('作业');
const releaseKnowledgeAgreement = ref('不使用');

const formatDateTimeLocal = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const releaseTitle = ref('');
const releaseDeadline = ref('');
const releaseType = ref('');
const releaseDetail = ref('');
const releaseScore = ref('');

const resetReleaseForm = () => {
  releaseEditMode.value = false;
  editingAssignmentId.value = '';
  releaseLockPublishSettings.value = false;
  releaseSubmitAction.value = 'create';
  releaseTitle.value = '';
  releaseDeadline.value = '';
  releaseType.value = '个人作业';
  releaseDetail.value = '';
  releaseScore.value = '100';
  releaseEnvironment.value = '';
  releaseChapter.value = '';
  releaseImmediate.value = false;
  releasePublishTime.value = formatDateTimeLocal();
  releaseAllowFormat.value = 'all';
  releaseLateForbidden.value = false;
  releaseDuplicateCheck.value = true;
  releaseDuplicateThreshold.value = '30';
  releaseAutoReturn.value = false;
  releaseTag.value = '作业';
  releaseKnowledgeAgreement.value = '不使用';
};

const showReleaseSwitch = computed(() => !releaseLockPublishSettings.value);
const showReleasePublishSettings = computed(() => releaseLockPublishSettings.value || releaseImmediate.value);
const releasePublishTimeReadonly = computed(() => releaseEditMode.value && releaseSubmitAction.value === 'edit' && releaseLockPublishSettings.value);
const releaseSubmitButtonText = computed(() => {
  if (releaseSubmitAction.value === 'publish') return '发布';
  if (releaseEditMode.value) return '保存';
  return '确认';
});

watch(releaseImmediate, (value) => {
  if (value && !releasePublishTime.value) {
    releasePublishTime.value = formatDateTimeLocal();
  }
});

const openCreateAssignmentDialog = () => {
  resetReleaseForm();
  displayReleaseAssignmentModel.value = true;
};

const openEditAssignmentDialog = (assignmentDetail, options = {}) => {
  if (!assignmentDetail) return;
  const published = isAssignmentPublished(assignmentDetail);
  const forcePublish = !!options.publish;
  releaseEditMode.value = true;
  editingAssignmentId.value = assignmentDetail.assignmentId || '';
  releaseSubmitAction.value = forcePublish ? 'publish' : 'edit';
  releaseTitle.value = assignmentDetail.title || '';
  releaseType.value = assignmentDetail.assignmentType || '个人作业';
  releaseDetail.value = assignmentDetail.content || '';
  releaseScore.value = String(assignmentDetail.totalScore || 100);
  releaseLockPublishSettings.value = published || forcePublish;
  releaseImmediate.value = published || forcePublish;
  releaseDeadline.value = published ? assignmentDetail.deadline : '';
  releasePublishTime.value = formatDateTimeLocal();
  displayReleaseAssignmentModel.value = true;
  activeTeacherAssignmentMenu.value = '';
};

const openPublishAssignmentDialog = (assignmentDetail) => {
  openEditAssignmentDialog(assignmentDetail, { publish: true });
};

const confirmReleaseAssignment = async () => {
  try {
    if (!releaseTitle.value || !releaseType.value || !releaseDetail.value || !releaseScore.value) {
      errorMessage.value = "请填写完整作业信息";
      ElMessage.error(errorMessage.value);
      return;
    }
    if (showReleasePublishSettings.value && !releaseDeadline.value) {
      errorMessage.value = "请填写截止日期";
      ElMessage.error(errorMessage.value);
      return;
    }
    const totalScore = parseInt(releaseScore.value, 10);
    if (isNaN(totalScore) || totalScore <= 0) {
      errorMessage.value = "总分必须是有效的正数";
      ElMessage.error(errorMessage.value);
      return;
    }
    const id = currentCourseId.value;
    if (!id) {
      errorMessage.value = "未获取到课程信息，请重新进入课程";
      ElMessage.error(errorMessage.value);
      return;
    }

    const assignment = {
      title: releaseTitle.value,
      deadline: showReleasePublishSettings.value ? releaseDeadline.value : '待发布',
      assignmentType: releaseType.value,
      content: releaseDetail.value,
      totalScore
    };

    const requestUrl = releaseEditMode.value
      ? "http://localhost:8080/update-course-assignment"
      : "http://localhost:8080/release-assignment";
    const payload = releaseEditMode.value
      ? {
        id,
        assignmentId: editingAssignmentId.value,
        assignment
      }
      : {
        accountId: userStore.account?.accountId,
        id,
        assignment
      };

    const response = await axios.post(requestUrl, payload);
    const data = response.data;
    if (data.success) {
      successMessage.value = data.message;
      ElMessage.success(successMessage.value);
      resetReleaseForm();
      await fetchLatestAssignments();
      displayReleaseAssignmentModel.value = false;
    } else {
      errorMessage.value = data.message;
      ElMessage.error(errorMessage.value);
    }
  } catch (error) {
    console.log("发布作业失败：", error);
    if (error.response) {
      if (releaseEditMode.value && error.response.status === 404) {
        errorMessage.value = "编辑作业接口未生效，请重启后端服务后重试";
        ElMessage.error(errorMessage.value);
        return;
      }
      errorMessage.value = `发布失败（${error.response.status}）：${error.response.data?.message || '参数错误'}`;
    } else if (error.request) {
      errorMessage.value = "服务器无响应，请检查网络";
    } else {
      errorMessage.value = "请求配置错误，请刷新页面重试";
    }
    ElMessage.error(errorMessage.value);
  }
};

function fromReleaseBack(){
  displayReleaseAssignmentModel.value = false;
  resetReleaseForm();
}

watch(
  () => currentCourseId.value,
  async (value) => {
    if (!value) return;
    if (props.iTeach && validAssignmentDetails.value.length) {
      await loadTeacherAssignmentStats(validAssignmentDetails.value, value);
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="course-learning-body" v-if="!showTeacherAssignmentModel && !showLearnAssignmentModel && !displayReleaseAssignmentModel">
    <div class="homework-toolbar">
      <div class="activity-number">共{{ iTeach ? validAssignmentDetails.length : studentVisibleAssignmentDetails.length }}个活动</div>
      <div v-if="iTeach" class="teacher-homework-toolbar">
        <div class="teacher-filter-group">
          <button
            class="teacher-filter-button"
            :class="{ active: teacherHomeworkFilter === 'all' }"
            @click="teacherHomeworkFilter = 'all'"
          >
            全部作业
          </button>
          <button
            class="teacher-filter-button"
            :class="{ active: teacherHomeworkFilter === 'pending' }"
            @click="teacherHomeworkFilter = 'pending'"
          >
            未批作业
          </button>
          <button
            class="teacher-filter-button"
            :class="{ active: teacherHomeworkFilter === 'corrected' }"
            @click="teacherHomeworkFilter = 'corrected'"
          >
            已批作业
          </button>
        </div>
        <button class="releaseAssignment" @click="openCreateAssignmentDialog">+ 添加作业</button>
      </div>
    </div>
    <div class="homework-box">
      <div
        class="homework-item"
        v-if="iLearn"
        v-for="assignmentDetail in studentVisibleAssignmentDetails"
        :key="assignmentDetail.assignmentId"
      >
        <div class="homework-logo">
          <img src="@/assets/课堂派作业图片.png" alt="课堂派作业图片">
          <span>作业</span>
        </div>
        <div class="assignment-info">
          <button class="assignment-title-button" @click="handleViewLearnAssignmentDetail(assignmentDetail)">
            <div class="assignment-title">{{ assignmentDetail.title }}</div>
          </button>
          <div class="assignment-meta">
            <span>提交截止时间：{{ assignmentDetail.deadline || '暂无' }}</span>
            <span>{{ assignmentDetail.assignmentType || '个人作业' }}</span>
          </div>
          <div class="assignment-status-row">
            <span :class="assignmentDetail.submit === '已提交' ? 'status-done' : 'status-pending'">
              {{ assignmentDetail.submit === '已提交' ? '已提交' : '未提交' }}
            </span>
            <span :class="assignmentDetail.correct === '已批改' ? 'status-done' : 'status-pending'">
              {{ assignmentDetail.correct === '已批改' ? '已批改' : '未批改' }}
            </span>
            <span v-if="assignmentDetail.correct === '已批改'">{{ assignmentDetail.score }}分</span>
          </div>
        </div>
        <button
          class="submit-button"
          :class="{ 'is-submitted': assignmentDetail.submit === '已提交' }"
          @click="handleAssignmentSubmit(assignmentDetail)"
        >
          {{ assignmentDetail.submit === '已提交' ? '已提交' : '提交作业' }}
        </button>
      </div>
      <div
        class="homework-item teacher-homework-item"
        v-if="iTeach"
        v-for="assignmentDetail in filteredTeacherAssignments"
        :key="`${assignmentDetail.id}-${assignmentDetail.assignmentId}-${assignmentDetail.accountId}`"
      >
        <div class="homework-logo">
          <img src="@/assets/课堂派作业图片.png" alt="课堂派作业图片">
          <span>作业</span>
        </div>
        <div class="assignment-info teacher-assignment-info">
          <button class="assignment-title-button" @click="openTeacherAssignmentDetail(assignmentDetail)">
            <div class="assignment-title">{{ assignmentDetail.title }}</div>
          </button>
          <div class="assignment-meta teacher-assignment-meta">
            <span v-if="getTeacherAssignmentStageText(assignmentDetail)">{{ getTeacherAssignmentStageText(assignmentDetail) }}</span>
            <span v-if="isAssignmentPublished(assignmentDetail)" class="teacher-deadline-meta">
              <span class="teacher-deadline-label">提交截止时间：</span>
              <span class="teacher-deadline-value">{{ formatTeacherDeadlineShort(assignmentDetail.deadline) }}</span>
            </span>
            <span>{{ assignmentDetail.assignmentType || '个人作业' }}</span>
          </div>
        </div>
        <div v-if="isAssignmentPublished(assignmentDetail)" class="teacher-assignment-stats">
          <div class="teacher-stat-item">
            <span class="teacher-stat-number">{{ getTeacherAssignmentStats(assignmentDetail).corrected }}</span>
            <span class="teacher-stat-label">已批完</span>
          </div>
          <div class="teacher-stat-item">
            <span class="teacher-stat-number">{{ getTeacherAssignmentStats(assignmentDetail).pending }}</span>
            <span class="teacher-stat-label">未批完</span>
          </div>
          <div class="teacher-stat-item">
            <span class="teacher-stat-number">{{ getTeacherAssignmentStats(assignmentDetail).missing }}</span>
            <span class="teacher-stat-label">未交</span>
          </div>
        </div>
        <div class="teacher-assignment-actions">
          <button
            v-if="!isAssignmentPublished(assignmentDetail)"
            class="teacher-publish-button"
            @click.stop="openPublishAssignmentDialog(assignmentDetail)"
          >
            <span class="teacher-action-icon">✈</span>
            <span class="teacher-action-text">发布</span>
          </button>
          <button class="teacher-more-button" @click.stop="toggleTeacherAssignmentMenu(assignmentDetail.assignmentId)">
            <span class="teacher-action-icon">...</span>
            <span class="teacher-action-text">更多</span>
          </button>
          <div v-if="activeTeacherAssignmentMenu === assignmentDetail.assignmentId" class="teacher-more-menu" @click.stop>
            <button class="teacher-more-item" @click="openEditAssignmentDialog(assignmentDetail)">编辑</button>
            <button class="teacher-more-item danger" @click="handleDeleteCourseAssignment(assignmentDetail)">删除</button>
          </div>
        </div>
      </div>
      <div v-if="(iTeach ? filteredTeacherAssignments.length : studentVisibleAssignmentDetails.length) === 0" class="homework-empty">
        暂无作业
      </div>
    </div>
  </div>

  <teleport to="#course-assignments-overlay-target">
    <div class="assignment-page teacher-assignment-page" v-if="iTeach && showTeacherAssignmentModel">
      <div class="assignment-page-tabs">
        <button class="assignment-page-tab" :class="{ active: teacherAssignmentTab === 'detail' }" @click="teacherAssignmentTab = 'detail'">详情</button>
        <button class="assignment-page-tab" :class="{ active: teacherAssignmentTab === 'ai' }" @click="teacherAssignmentTab = 'ai'">AI批阅设置</button>
        <button class="assignment-page-tab" :class="{ active: teacherAssignmentTab === 'review' }" @click="teacherAssignmentTab = 'review'">批阅</button>
        <button class="assignment-page-tab" @click="fromTeachBack">返回</button>
      </div>

      <template v-if="teacherAssignmentTab === 'detail'">
        <div class="teacher-assignment-summary">
          <div class="teacher-assignment-summary-title">{{ currentAssignmentDetail?.title }}</div>
          <div class="teacher-assignment-summary-meta">
            <span>截止：{{ currentAssignmentDetail?.deadline || '暂无' }}</span>
            <span>{{ currentAssignmentDetail?.assignmentType || '个人作业' }}</span>
            <span>{{ currentAssignmentDetail?.totalScore || 100 }}分</span>
          </div>
          <div class="teacher-assignment-summary-desc">{{ currentAssignmentDetail?.content || '暂无作业说明' }}</div>
        </div>

        <div class="student-comment-card teacher-detail-comment-card">
          <textarea v-model="teacherCommentDraft" class="student-comment-input" placeholder="说点什么吧"></textarea>
          <div class="student-comment-actions">
            <label><input v-model="teacherCommentRealName" type="checkbox"> 实名发表</label>
            <label><input v-model="teacherCommentAttachmentOnly" type="checkbox"> 添加附件</label>
            <button class="student-comment-publish">发表评论</button>
          </div>
        </div>

        <div class="teacher-comment-section-title">全部评论 <span>共0条</span></div>
        <div class="student-comment-empty teacher-comment-empty">
          <img src="@/assets/课堂派课程详情空白页.png" alt="空白">
          <span>暂无数据</span>
        </div>
      </template>

      <template v-else-if="teacherAssignmentTab === 'ai'">
        <div class="teacher-ai-setting-card">
          <div class="teacher-ai-setting-title">批阅设置</div>
          <div class="teacher-ai-setting-row">
            <label class="release-switch">
              <input
                :checked="getTeacherAiReviewEnabled()"
                type="checkbox"
                @change="handleTeacherAiReviewToggle(currentAssignmentDetail, $event.target.checked)"
              >
              <span class="release-switch-slider"></span>
            </label>
            <span class="teacher-ai-setting-label">AI预批阅</span>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="teacher-assignment-summary">
          <div class="teacher-assignment-summary-title">{{ currentAssignmentDetail?.title }}</div>
          <div class="teacher-assignment-summary-meta">
            <span>截止：{{ currentAssignmentDetail?.deadline || '暂无' }}</span>
            <span>{{ currentAssignmentDetail?.assignmentType || '个人作业' }}</span>
            <span>{{ currentAssignmentDetail?.totalScore || 100 }}分</span>
          </div>
          <div class="teacher-assignment-summary-desc">{{ currentAssignmentDetail?.content || '暂无作业说明' }}</div>
        </div>

        <div class="teacher-review-panel">
          <div class="teacher-review-chip-row">
            <button class="teacher-review-chip" :class="{ active: teacherReviewFilter === 'all' }" @click="teacherReviewFilter = 'all'">全部({{ teacherSubmissionStats.all }})</button>
            <button class="teacher-review-chip" :class="{ active: teacherReviewFilter === 'unreviewed' }" @click="teacherReviewFilter = 'unreviewed'">未批({{ teacherSubmissionStats.unreviewed }})</button>
            <button class="teacher-review-chip" :class="{ active: teacherReviewFilter === 'reviewed' }" @click="teacherReviewFilter = 'reviewed'">已批({{ teacherSubmissionStats.reviewed }})</button>
            <button class="teacher-review-chip" :class="{ active: teacherReviewFilter === 'unsubmitted' }" @click="teacherReviewFilter = 'unsubmitted'">未交({{ teacherSubmissionStats.unsubmitted }})</button>
            <input v-model="teacherReviewKeyword" class="teacher-review-search" placeholder="学生姓名/学号搜索">
          </div>

          <div class="teacher-review-actions">
            <button class="teacher-review-action">批量给分</button>
            <button class="teacher-review-action">打印作业</button>
            <button class="teacher-review-action">下载</button>
            <button class="teacher-review-action">AI辅助</button>
            <button class="teacher-review-action primary">一键批改</button>
          </div>

          <div class="teacher-review-table">
            <div class="teacher-review-header">
              <span></span>
              <span>姓名/学号</span>
              <span>提交状态</span>
              <span>字数</span>
              <span>附件</span>
              <span>批阅次数</span>
              <span>成绩</span>
              <span>操作</span>
            </div>

            <div class="teacher-review-row" v-for="assignmentDetail in filteredTeacherSubmissionDetails" :key="`${assignmentDetail.assignmentId}_${assignmentDetail.accountId || 'none'}`">
              <span><input type="checkbox"></span>
              <span class="teacher-student-cell">
                <strong>{{ assignmentDetail.accountId || '未分配学生' }}</strong>
                <small>{{ assignmentDetail.id }}</small>
              </span>
              <span :class="assignmentDetail.submit === '已提交' ? 'status-done' : 'status-danger'">
                {{ assignmentDetail.submit === '已提交' ? '已提交' : '未交' }}
              </span>
              <span>{{ assignmentDetail.submitContent ? assignmentDetail.submitContent.length : 0 }}</span>
              <span class="teacher-file-cell">
                <button v-if="assignmentDetail.fileName" class="teacher-op-link" @click="downloadTeacherSubmissionFile(assignmentDetail)">下载</button>
                <span v-else class="teacher-file-empty">-</span>
              </span>
              <span>{{ assignmentDetail.correct === '已批改' ? 1 : 0 }}</span>
              <span class="teacher-score-cell">
                <template v-if="assignmentDetail.submit === '已提交'">
                  <input
                    v-model="scoreDrafts[getDraftScore(assignmentDetail)]"
                    class="teacher-score-input"
                    :class="{ saving: isScoreSaving(assignmentDetail) }"
                    placeholder="分数"
                    @blur="handleScoreBlur(assignmentDetail)"
                  >
                  <span>/{{ currentAssignmentDetail?.totalScore || 100 }}</span>
                </template>
                <template v-else>
                  <span class="status-danger">未交</span>
                </template>
              </span>
              <span class="teacher-review-ops">
                <button v-if="assignmentDetail.submit === '已提交'" class="teacher-op-link">进入批阅</button>
                <button v-else class="teacher-op-link danger">催交</button>
              </span>
            </div>

            <div v-if="!filteredTeacherSubmissionDetails.length" class="teacher-review-empty">暂无提交记录</div>
          </div>
        </div>
      </template>
    </div>

    <div class="assignment-page student-assignment-page" v-if="iLearn && showLearnAssignmentModel">
      <div class="assignment-page-tabs">
        <button class="assignment-page-tab" :class="{ active: learnAssignmentTab === 'detail' }" @click="learnAssignmentTab = 'detail'">详情</button>
        <button class="assignment-page-tab" :class="{ active: learnAssignmentTab === 'submit' }" @click="learnAssignmentTab = 'submit'">提交作业</button>
        <button class="assignment-page-tab" @click="fromLearnBack">返回</button>
      </div>

      <div class="student-assignment-hero">
        <div class="student-assignment-hero-icon">
          <img src="@/assets/课堂派作业图片.png" alt="课堂派作业图片">
        </div>
        <div class="student-assignment-hero-info">
          <div class="student-assignment-hero-title">{{ LearnAssignmentDetail.title }}</div>
          <div class="student-assignment-hero-meta">
            <span>{{ LearnAssignmentDetail.assignmentType || '个人作业' }}</span>
            <span>提交截止时间：{{ LearnAssignmentDetail.deadline || '暂无' }}</span>
            <span>{{ LearnAssignmentDetail.totalScore || 100 }}分</span>
            <span>查重</span>
          </div>
        </div>
      </div>

      <div v-if="learnAssignmentTab === 'detail'" class="student-assignment-content-page">
        <div class="student-detail-card">
          <div class="student-detail-title">作业内容</div>
          <div class="student-detail-text">{{ LearnAssignmentDetail.content || '暂无作业内容' }}</div>
        </div>

        <div class="student-comment-card">
          <textarea class="student-comment-input" placeholder="说点什么吧"></textarea>
          <div class="student-comment-actions">
            <label><input type="checkbox" checked> 实名发表</label>
            <label><input type="checkbox"> 仅知附件</label>
            <button class="student-comment-publish">发表评论</button>
          </div>
        </div>

        <div class="student-comment-empty">
          <img src="@/assets/课堂派课程详情空白页.png" alt="空白">
          <span>暂无数据</span>
        </div>
      </div>

      <div v-else class="student-assignment-submit-page">
        <div class="student-submit-card">
          <div class="student-submit-header">
            <div class="student-submit-heading">
              <div class="student-submit-title">提交内容</div>
              <div class="student-submit-tip">支持上传附件和填写留言，确认后老师即可查看你的提交内容。</div>
            </div>
            <button
              class="student-submit-confirm"
              @click="(studentSubmitHasSubmitted && !studentSubmitEditing) ? startResubmit() : handleConfirmSubmit()"
            >
              {{ studentSubmitEditing ? '确认提交' : (studentSubmitHasSubmitted ? '更新提交' : '确认提交') }}
            </button>
          </div>

          <template v-if="studentSubmitHasSubmitted && !studentSubmitEditing">
            <div class="student-submit-section">
              <div class="student-submit-section-title">提交状态</div>
              <div class="student-submitted-banner">已提交，等待老师批改</div>
            </div>

            <div class="student-submit-section">
              <div class="student-submit-section-title">作业附件 <span>{{ selectedSubmissionFile ? '1个' : '0个' }}</span></div>
              <div v-if="selectedSubmissionFile" class="student-submitted-file-card">
                <div class="student-file-icon">W</div>
                <div class="student-file-meta">
                  <div class="student-file-name">{{ selectedSubmissionFile.name }}</div>
                  <div class="student-file-size">{{ selectedSubmissionFile.sizeText }}</div>
                </div>
                <button class="student-file-download" @click="downloadSubmittedFile">下载</button>
              </div>
              <div v-else class="student-submitted-empty-file">未上传附件</div>
            </div>

            <div class="student-submit-section" v-if="(LearnAssignmentDetail.submitContent || '').trim()">
              <div class="student-submit-section-title">作业留言</div>
              <div class="student-submitted-preview">
                {{ LearnAssignmentDetail.submitContent }}
              </div>
            </div>
          </template>

          <template v-else>
            <div class="student-submit-section">
              <div class="student-submit-section-title">作业附件</div>
              <input
                ref="submissionFileInput"
                type="file"
                class="student-hidden-file-input"
                @change="handleSubmissionFileChange"
              >
              <div class="student-upload-box" @click="triggerSubmissionFilePicker">
                <div class="student-upload-icon">⇪</div>
                <div>点击上传添加作业文件</div>
                <small>支持各类文档、图片、代码、压缩包等格式</small>
              </div>
              <div v-if="selectedSubmissionFile" class="student-selected-file-tip">
                已选择：{{ selectedSubmissionFile.name }} {{ selectedSubmissionFile.sizeText ? `(${selectedSubmissionFile.sizeText})` : '' }}
              </div>
            </div>

            <div class="student-submit-section">
              <div class="student-submit-section-title">作业留言 <span>选填</span></div>
              <textarea
                class="student-submit-textarea"
                placeholder="作业说明作补充或留言使用哦！"
                v-model="submitContent"
              ></textarea>
            </div>
          </template>
        </div>
      </div>
    </div>

    <div class="release-assignment-mask" v-if="displayReleaseAssignmentModel">
      <div class="release-assignment">
        <div class="release-header">
          <span>{{ releaseEditMode ? '编辑作业' : '添加作业' }}</span>
          <button class="release-close" @click="fromReleaseBack">×</button>
        </div>

        <div class="release-tabs">
          <button class="release-tab active">日常作业</button>
        </div>

        <div class="release-section">
          <div class="release-section-title">
            <span class="release-step">1</span>
            <span>基本信息</span>
          </div>
          <div class="release-form-row">
            <label class="release-required">作业主题</label>
            <input v-model="releaseTitle" class="release-input full" placeholder="请输入作业主题" maxlength="20">
          </div>
          <div class="release-tag-row">
            <button class="release-type-chip" :class="{ active: releaseType === '个人作业' }" @click="releaseType='个人作业'">个人作业</button>
            <button class="release-type-chip" :class="{ active: releaseType === '小组作业' }" @click="releaseType='小组作业'">小组作业</button>
            <button class="release-type-chip" :class="{ active: releaseType === '测验作业' }" @click="releaseType='测验作业'">测验作业</button>
          </div>
        </div>

        <div class="release-section">
          <div class="release-section-title">
            <span class="release-step">2</span>
            <span>作业内容</span>
          </div>
          <textarea
            v-model="releaseDetail"
            class="release-textarea"
            placeholder="请输入作业内容、说明和要求"
            maxlength="1000"
          ></textarea>
          <div class="release-text-count">{{ releaseDetail.length }}/1000</div>
        </div>

        <div class="release-collapse">参考答案设置</div>

        <div class="release-section">
          <div class="release-section-title">
            <span class="release-step">3</span>
            <span>标签与版权</span>
          </div>
          <div class="release-grid">
            <div class="release-grid-item">
              <label>活动类型标签</label>
              <input v-model="releaseTag" class="release-input" placeholder="请输入标签">
            </div>
            <div class="release-grid-item">
              <label>知识共享协议</label>
              <select v-model="releaseKnowledgeAgreement" class="release-select">
                <option value="不使用">不使用</option>
                <option value="署名">署名</option>
                <option value="署名-非商业性使用">署名-非商业性使用</option>
              </select>
            </div>
          </div>
        </div>

        <div class="release-section">
          <div class="release-section-title">
            <span class="release-step">4</span>
            <span>发布设置</span>
          </div>
          <div class="release-grid">
            <div class="release-grid-item">
              <label>应用环节</label>
              <select v-model="releaseEnvironment" class="release-select">
                <option value="">请选择</option>
                <option value="课前预习">课前预习</option>
                <option value="课堂学习">课堂学习</option>
                <option value="课后巩固">课后巩固</option>
              </select>
            </div>
            <div class="release-grid-item">
              <label>所属章节</label>
              <select v-model="releaseChapter" class="release-select">
                <option value="">请选择</option>
                <option value="第一章">第一章</option>
                <option value="第二章">第二章</option>
                <option value="第三章">第三章</option>
              </select>
            </div>
          </div>

          <div v-if="showReleaseSwitch" class="release-switch-row">
            <label class="release-switch">
              <input v-model="releaseImmediate" type="checkbox">
              <span class="release-switch-slider"></span>
            </label>
            <span class="release-switch-label">是否立即发布</span>
          </div>

          <div v-if="showReleasePublishSettings" class="release-publish-settings">
            <div class="release-grid">
              <div class="release-grid-item">
                <label class="release-required">发布时间</label>
                <input
                  v-model="releasePublishTime"
                  class="release-input"
                  :class="{ 'release-input-readonly': releasePublishTimeReadonly }"
                  type="datetime-local"
                  :readonly="releasePublishTimeReadonly"
                >
              </div>
              <div class="release-grid-item">
                <label class="release-required">截止日期</label>
                <input v-model="releaseDeadline" class="release-input" type="datetime-local">
              </div>
            </div>

            <div class="release-format-group">
              <div class="release-format-title release-required">作业提交格式</div>
              <label class="release-radio">
                <input v-model="releaseAllowFormat" type="radio" value="all">
                <span>所有格式</span>
              </label>
              <label class="release-radio">
                <input v-model="releaseAllowFormat" type="radio" value="document">
                <span>查看文档格式</span>
              </label>
              <label class="release-radio">
                <input v-model="releaseAllowFormat" type="radio" value="restricted">
                <span>限制学生文档格式</span>
              </label>
            </div>

            <div class="release-grid compact">
              <div class="release-grid-item">
                <label class="release-required">总分</label>
                <input v-model="releaseScore" class="release-input" type="number" min="1" placeholder="100">
              </div>
              <div class="release-grid-item release-inline-switch">
                <label class="release-switch">
                  <input v-model="releaseLateForbidden" type="checkbox">
                  <span class="release-switch-slider"></span>
                </label>
                <span>若超时，禁止提交</span>
              </div>
            </div>

            <div class="release-grid compact">
              <div class="release-grid-item release-inline-switch">
                <label class="release-switch">
                  <input v-model="releaseDuplicateCheck" type="checkbox">
                  <span class="release-switch-slider"></span>
                </label>
                <span>进行查重</span>
              </div>
              <div class="release-grid-item release-inline-switch">
                <label>查重警戒值</label>
                <input v-model="releaseDuplicateThreshold" class="release-input threshold" type="number" min="0" max="100">
                <span>%</span>
                <label class="release-switch">
                  <input v-model="releaseAutoReturn" type="checkbox">
                  <span class="release-switch-slider"></span>
                </label>
                <span>自动打回</span>
              </div>
            </div>
          </div>
        </div>

        <div class="release-footer">
          <button class="release-footer-btn cancel" @click="fromReleaseBack">取消</button>
          <button class="release-footer-btn confirm" @click="confirmReleaseAssignment">{{ releaseSubmitButtonText }}</button>
        </div>
      </div>
    </div>
  </teleport>
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
