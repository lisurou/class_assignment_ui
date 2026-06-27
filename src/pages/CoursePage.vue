<script setup>
//路由实例
import {useRouter} from "vue-router";
import { computed, onBeforeUnmount, onMounted, onUnmounted, ref, watch } from 'vue';
import {useUserStore} from '@/stores/userStore';
import { ElDialog, ElButton, ElMessage } from 'element-plus';
import axios from 'axios';
import CourseMaterials from '@/components/CourseMaterials.vue';
import CourseAssignments from '@/components/CourseAssignments.vue';
import TopicPage from '@/components/TopicPage.vue';

const router = useRouter()
const isSearchFocused = ref(false);
let isFold=ref(true);
const userStore = useUserStore();
const topMenus = [
  { key: 'course', label: '我的课堂' },
  { key: 'prep', label: '备课区', teacherOnly: true },
  { key: 'lab', label: '虚拟教研室' },
  { key: 'agent', label: 'π 智能体（AI）' },
  { key: 'analysis', label: 'AI学情分析' },
  { key: 'graph', label: '知识图谱' },
  { key: 'knowledge', label: '多模态知识库' }
];
const identity=computed(()=>userStore.account?.identity||"学生");
const displayName = computed(() => userStore.account?.name || '教师用户');
const userMenuOpen = ref(false);
const userMenuRef = ref(null);
const joinDialogVisible=ref(false);
const createDialogVisible=ref(false);
const taughtCourses = computed(() => userStore.taught || []);
const learnedCourses = computed(() => userStore.learned || []);
const topCourses = computed(() => userStore.top || []);
const assignmentDetails = computed(() => (userStore.assignmentDetails || []).filter(Boolean));
const course=computed(() => userStore.course || []);
const showCourseDetails=ref(false);
const showTeacherAssignment=ref(false);
const showLearnAssignment=ref(false);
const displayReleaseAssignment=ref(false);
const currentAssignmentDetail = ref(null);
let iTeach=ref(userStore.account?.identity === '老师');
let iLearn=ref(userStore.account?.identity !== '老师');
const currentCourseId = ref('');
const learnAssignmentDetail = ref({});
const submitContent = ref('');
const selectedSubmissionFile = ref(null);
const studentSubmitEditing = ref(false);
const teacherAssignmentTab = ref('detail');
const learnAssignmentTab = ref('detail');
const teacherHomeworkFilter = ref('all');
const teacherReviewFilter = ref('all');
const teacherReviewKeyword = ref('');
const teacherCommentDraft = ref('');
const teacherCommentRealName = ref(true);
const teacherCommentAttachmentOnly = ref(false);
const activeTeacherAssignmentMenu = ref('');
const teacherSubmissionDetails = ref([]);
const scoreDrafts = ref({});
const savingScoreKeys = ref([]);
const releaseEditMode = ref(false);
const editingAssignmentId = ref('');
const releaseTitle=ref('');
const releaseDeadline=ref('');
const releaseType=ref('个人作业');
const releaseDetail=ref('');
const releaseTag=ref('');
const releaseKnowledgeAgreement=ref('');
const releaseEnvironment=ref('');
const releaseChapter=ref('');
const showReleaseSwitch = ref(true);
const showReleasePublishSettings = ref(true);
const releaseImmediate = ref(true);
const releasePublishTime = ref('');
const releasePublishTimeReadonly = ref(true);
const releaseAllowFormat = ref('all');
const releaseScore=ref('');
const releaseLateForbidden = ref(false);
const releaseDuplicateCheck = ref(false);
const releaseDuplicateThreshold = ref('');
const releaseAutoReturn = ref(false);
const releaseAiEnabled=ref(false);

let courseCode=ref('');
let courseName=ref('');
let teachClass=ref('');
let newTime=ref('');
let studentNumber=ref('');


let errorMessage=ref('');
let successMessage=ref('');

const showArchiveMenu = ref(null);
const archiveMenuPosition = ref({ x: 0, y: 0 });
const showArchiveManager = ref(false);
const archivedCourseType = ref('learned');
const archivedLearnedCourses = ref([]);
const archivedTaughtCourses = ref([]);
const learnedSemesterGroups = ref([]);
const taughtSemesterGroups = ref([]);

// 移除了之前 watch(releaseImmediate) 清空时间的逻辑，让它保留初始化时生成的当前时间

const isCourseTop = (courseId) => {
  // 检查 topCourses 中是否包含当前课程的 id
  return topCourses.value.some(course => course && course.id === courseId);
};
const handleJoinConfirm=async()=>{
  try{
    console.log('输入的课程码：',courseCode.value);
    console.log(userStore.account?.accountId)
    console.log(courseCode.value);
    const response=await axios.post('http://localhost:8080/join-course',{
      accountId:userStore.account?.accountId,
      id:courseCode.value
    });
    const data=response.data;
    if(data.success){
      successMessage.value=data.message;
      userStore.setLearned(data.learned);
      joinDialogVisible.value=false;
      ElMessage.success(successMessage.value);
    }else{
      errorMessage.value=data.message;
      console.log(errorMessage.value);
      ElMessage.error(errorMessage.value);
    }
  }catch(error){
    console.log("加入课程失败：",error);
    errorMessage.value="服务器错误，请稍后重试"
    ElMessage.error(errorMessage.value);
  }
};

const handleCreateConfirm=async()=>{
try{
  const newCourse={
    time:newTime.value,
    name:courseName.value,
    classes:teachClass.value,
    number:studentNumber.value,
    teacher:userStore.account?.name
  }
  console.log("账号：",userStore.account?.accountId)
const response=await axios.post('http://localhost:8080/create-course', {
  accountId:userStore.account?.accountId,
  course:newCourse
});
const data=response.data;
if(data.success){
  successMessage.value=data.message;
  if(data.taught!=null){
    userStore.setTaught(data.taught);
  }
  // 新增：如果当前用户是老师，创建的课程也应出现在"我学的"列表中
  if (data.learned != null) {
    userStore.setLearned(data.learned);
  }
  createDialogVisible.value=false;
 ElMessage.success(successMessage.value);

}else{
  errorMessage.value=data.message;
  console.log(errorMessage.value);
  ElMessage.error(errorMessage.value);
}
}catch(error){
  console.log("创建课程失败：",error);
  errorMessage.value="服务器错误，请稍后重试";
  ElMessage.error(errorMessage.value);
}
}
const handleTop=async(course)=>{
//将要置顶的课程传回后端，后端将其插入，并返回所有要置顶的课程
  try{
    const response=await axios.post('http://localhost:8080/top',{
      accountId:userStore.account?.accountId,
      id:course.id
    });
    const data=response.data;
    if(data.success){
      successMessage.value=data.message;
      userStore.setTop(data.top);
      ElMessage.success(successMessage.value);
    } else{
      errorMessage.value=data.message;
      console.log(errorMessage.value);
      ElMessage.error(errorMessage.value);
    }
  }catch(error){
    console.log("置顶失败：", error);
    errorMessage.value = "服务器错误，请稍后重试";
    ElMessage.error(errorMessage.value);
  }

}
// 取消置顶
const handleCancelTop = async (course) => {
  try {
    const response = await axios.post('http://localhost:8080/cancel-top', {
      accountId: userStore.account?.accountId,
      id: course.id // 传递要取消置顶的课程id
    });
    const data = response.data;
    if (data.success) {
      successMessage.value = data.message;
      userStore.setTop(data.top); // 更新置顶列表
      ElMessage.success(successMessage.value);
    } else {
      errorMessage.value = data.message;
      ElMessage.error(errorMessage.value);
    }
  } catch (error) {
    console.log("取消置顶失败：", error);
    errorMessage.value = "服务器错误，请稍后重试";
    ElMessage.error(errorMessage.value);
  }
};

const openArchiveMenu = (event, course) => {
  event.preventDefault();
  event.stopPropagation();
  showArchiveMenu.value = course;
  archiveMenuPosition.value = { x: event.clientX, y: event.clientY };
};

const closeArchiveMenu = () => {
  showArchiveMenu.value = null;
  archiveMenuPosition.value = { x: 0, y: 0 };
};

const handleGlobalClick = () => { closeArchiveMenu(); };
onMounted(() => { document.addEventListener('click', handleGlobalClick); });
onUnmounted(() => { document.removeEventListener('click', handleGlobalClick); });

const handleArchive = async (courseId, archiveType) => {
  try {
    closeArchiveMenu();
    const response = await axios.post('http://localhost:8080/archive-course', {
      accountId: userStore.account?.accountId,
      courseId: courseId,
      archiveType: archiveType
    });
    const data = response.data;
    if (data.success) {
      ElMessage.success(data.message);
      await refreshCourseList();
    } else {
      ElMessage.error(data.message);
    }
  } catch (error) {
    console.log("归档失败：", error);
    ElMessage.error("服务器错误，请稍后重试");
  }
};

const refreshCourseList = async () => {
  try {
    const phone = userStore.account?.phone || localStorage.getItem('autoLoginPhone');
    const password = userStore.account?.password || localStorage.getItem('autoLoginPassword');
    if (!phone || !password) return;
    const loginResponse = await axios.post('http://localhost:8080/login', { phone, password });
    const loginData = loginResponse.data;
    if (loginData.success) {
      userStore.setTaught(loginData.taught);
      userStore.setLearned(loginData.learned);
      userStore.setTop(loginData.top);
    }
  } catch (error) {
    console.log("刷新课程列表失败：", error);
  }
};

const openArchiveManager = async (type) => {
  archivedCourseType.value = type;
  showArchiveManager.value = true;
  await loadArchivedCourses(type);
};

const loadArchivedCourses = async (type) => {
  try {
    const response = await axios.post('http://localhost:8080/get-archived-courses', {
      accountId: userStore.account?.accountId,
      courseType: type
    });
    const data = response.data;
    if (data.success) {
      const courses = (type === 'taught' ? data.taught : data.learned) || [];
      const groups = groupBySemester(courses);
      if (type === 'taught') {
        archivedTaughtCourses.value = courses;
        taughtSemesterGroups.value = groups;
      } else {
        archivedLearnedCourses.value = courses;
        learnedSemesterGroups.value = groups;
      }
    }
  } catch (error) {
    console.log("加载归档课程失败：", error);
    ElMessage.error("加载归档课程失败");
  }
};

const groupBySemester = (courses) => {
  const groups = {};
  courses.forEach(course => {
    const semesterMatch = course.name.match(/(\d{4}-\d{4}第[一二]学期)/);
    const semester = semesterMatch ? semesterMatch[1] : '其他';
    if (!groups[semester]) groups[semester] = [];
    groups[semester].push(course);
  });
  return Object.entries(groups)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([name, courses]) => ({ name, courses }));
};

const unarchiveCourse = async (courseId) => {
  try {
    const response = await axios.post('http://localhost:8080/unarchive-course', {
      accountId: userStore.account?.accountId,
      courseId: courseId,
      restoreType: archivedCourseType.value
    });
    const data = response.data;
    if (data.success) {
      ElMessage.success(data.message);
      await loadArchivedCourses(archivedCourseType.value);
      await refreshCourseList();
    } else {
      ElMessage.error(data.message);
    }
  } catch (error) {
    console.log("取消归档失败：", error);
    ElMessage.error("取消归档失败");
  }
};

const goToLogin = () => {
  userStore.logout(); // 调用退出登录的方法，清除信息
  router.push('/login');
}
function goToPersonalSetting() {
  router.push('/personal-setting')
}
function goToLessonPrep() {
  router.push('/lesson-prep')
}
function handleTopMenuClick(menuKey) {
  if (menuKey === 'course') {
    goToCourse();
    return;
  }

  if (menuKey === 'prep' && userStore.account?.identity === '老师') {
    goToLessonPrep();
  }
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
onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
});
onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick);
});
function goToCourse(){
  // 清除所有子页面状态，返回到主列表
  showCourseDetails.value = false;
  showTeacherAssignment.value = false;
  showLearnAssignment.value = false;
  displayReleaseAssignment.value = false;
  currentCourseId.value = '';
}
function backToCourseContent(){
  showTeacherAssignment.value = false;
  showLearnAssignment.value = false;
  displayReleaseAssignment.value = false;
}
function handleITeachClick(){
  iTeach.value=true;
  iLearn.value=false;
}
function handleILearnClick(){
  iLearn.value=true;
  iTeach.value=false;
}
//课程详情页面
let courseLearning=ref(true);
let learningAnalysis=ref(false);
let gradeManagement=ref(false);
let courseIntroduction=ref(false);
let knowledgeGraph=ref(false);
function handleClickCourseLearning(){
  courseLearning.value=true;
 learningAnalysis.value=false;
 gradeManagement.value=false;
 courseIntroduction.value=false;
 knowledgeGraph.value=false;
}
function handleClickLearningAnalysis(){
  courseLearning.value=false;
  learningAnalysis.value=true;
  gradeManagement.value=false;
  courseIntroduction.value=false;
  knowledgeGraph.value=false;
}
function handleClickGradeManagement(){
  courseLearning.value=false;
  learningAnalysis.value=false;
  gradeManagement.value=true;
  courseIntroduction.value=false;
  knowledgeGraph.value=false;
}
function handleClickCourseIntroduction(){
  courseLearning.value=false;
  learningAnalysis.value=false;
  gradeManagement.value=false;
  courseIntroduction.value=true;
  knowledgeGraph.value=false;
}
function handleClickKnowledgeGraph(){
  courseLearning.value=false;
  learningAnalysis.value=false;
  gradeManagement.value=false;
  courseIntroduction.value=false;
  knowledgeGraph.value=true;
}
//处理课程学习按钮下的按钮切换
let content=ref(true);
let interactiveCourseware=ref(false);
let homework=ref(false);
let test=ref(false);
let data=ref(false);
let tencentConference=ref(false);
let givePublicNotice=ref(false);
let topic=ref(false);
let interactiveAnswer=ref(false);

function handleClickContent(){
 content.value=true;
 interactiveCourseware.value=false;
 homework.value=false;
 test.value=false;
 data.value=false;
 tencentConference.value=false;
 givePublicNotice.value=false;
 topic.value=false;
 interactiveAnswer.value=false;
}
function handleClickInteractiveCourseware(){
  content.value=false;
  interactiveCourseware.value=true;
  homework.value=false;
  test.value=false;
  data.value=false;
  tencentConference.value=false;
  givePublicNotice.value=false;
  topic.value=false;
  interactiveAnswer.value=false;
}
function handleClickHomework(){
  content.value=false;
  interactiveCourseware.value=false;
  homework.value=true;
  test.value=false;
  data.value=false;
  tencentConference.value=false;
  givePublicNotice.value=false;
  topic.value=false;
  interactiveAnswer.value=false;
}
function handleClickTest(){
  content.value=false;
  interactiveCourseware.value=false;
  homework.value=false;
  test.value=true;
  data.value=false;
  tencentConference.value=false;
  givePublicNotice.value=false;
  topic.value=false;
  interactiveAnswer.value=false;
}
function handleClickData(){
  content.value=false;
  interactiveCourseware.value=false;
  homework.value=false;
  test.value=false;
  data.value=true;
  tencentConference.value=false;
  givePublicNotice.value=false;
  topic.value=false;
  interactiveAnswer.value=false;
}
function handleClickTencentConference(){
  content.value=false;
  interactiveCourseware.value=false;
  homework.value=false;
  test.value=false;
  data.value=false;
  tencentConference.value=true;
  givePublicNotice.value=false;
  topic.value=false;
  interactiveAnswer.value=false;
}
function handleClickGivePublicNotice(){
  content.value=false;
  interactiveCourseware.value=false;
  homework.value=false;
  test.value=false;
  data.value=false;
  tencentConference.value=false;
  givePublicNotice.value=true;
  topic.value=false;
  interactiveAnswer.value=false;
}
function handleClickTopic(){
  content.value=false;
  interactiveCourseware.value=false;
  homework.value=false;
  test.value=false;
  data.value=false;
  tencentConference.value=false;
  givePublicNotice.value=false;
  topic.value=true;
  interactiveAnswer.value=false;
}
function handleClickInteractiveAnswer(){
  content.value=false;
  interactiveCourseware.value=false;
  homework.value=false;
  test.value=false;
  data.value=false;
  tencentConference.value=false
  givePublicNotice.value=false;
  topic.value=false;
  interactiveAnswer.value=true;
}
const courseAssignmentsMode = computed(() => (
  showTeacherAssignment.value || showLearnAssignment.value || displayReleaseAssignment.value
) ? 'detail' : 'list');
const assignmentOverlayActive = computed(() => (
  showTeacherAssignment.value || showLearnAssignment.value || displayReleaseAssignment.value
));
const currentHeaderThirdCrumb = computed(() => {
  if (showTeacherAssignment.value || showLearnAssignment.value) {
    return '作业详情';
  }
  if (displayReleaseAssignment.value) {
    return releaseEditMode.value ? '编辑作业' : '添加作业';
  }
  return '';
});

const validAssignmentDetails = computed(() => assignmentDetails.value);

const studentVisibleAssignmentDetails = computed(() => validAssignmentDetails.value.filter(detail => detail?.assignmentId));

const filteredTeacherAssignments = computed(() => {
  const list = validAssignmentDetails.value.filter(detail => detail?.assignmentId);
  if (teacherHomeworkFilter.value === 'pending') {
    return list.filter(detail => getTeacherAssignmentStageText(detail) !== '已批完');
  }
  if (teacherHomeworkFilter.value === 'corrected') {
    return list.filter(detail => getTeacherAssignmentStageText(detail) === '已批完');
  }
  return list;
});

const teacherSubmissionStats = computed(() => {
  const stats = { all: 0, unreviewed: 0, reviewed: 0, unsubmitted: 0 };
  teacherSubmissionDetails.value.forEach(detail => {
    stats.all += 1;
    if (detail?.submit === '已提交') {
      if (detail?.correct === '已批改') {
        stats.reviewed += 1;
      } else {
        stats.unreviewed += 1;
      }
    } else {
      stats.unsubmitted += 1;
    }
  });
  return stats;
});

const filteredTeacherSubmissionDetails = computed(() => teacherSubmissionDetails.value.filter(detail => {
  const keyword = teacherReviewKeyword.value.trim();
  const keywordMatched = !keyword || [detail?.accountId, detail?.studentId, detail?.studentName, detail?.id]
    .filter(Boolean)
    .some(value => String(value).includes(keyword));

  if (!keywordMatched) {
    return false;
  }
  if (teacherReviewFilter.value === 'reviewed') {
    return detail?.correct === '已批改';
  }
  if (teacherReviewFilter.value === 'unreviewed') {
    return detail?.submit === '已提交' && detail?.correct !== '已批改';
  }
  if (teacherReviewFilter.value === 'unsubmitted') {
    return detail?.submit !== '已提交';
  }
  return true;
}));

const studentSubmitHasSubmitted = computed(() => learnAssignmentDetail.value?.submit === '已提交');

const releaseSubmitButtonText = computed(() => releaseEditMode.value ? '保存' : '确认');

const normalizeUploadedFile = (file) => {
  if (!file) return null;
  const size = Number(file.size || 0);
  const sizeText = size < 1024 * 1024
    ? `${Math.max(size / 1024, 0.1).toFixed(1)} KB`
    : `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return {
    name: file.name,
    size,
    sizeText,
    rawFile: file
  };
};

const extractAssignmentFileNameFromHeaders = (headers, fallbackName) => {
  const disposition = headers?.['content-disposition'] || headers?.['Content-Disposition'];
  if (!disposition) return fallbackName;
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) return decodeURIComponent(utf8Match[1]);
  const normalMatch = disposition.match(/filename="?([^"]+)"?/i);
  return normalMatch?.[1] || fallbackName;
};

const normalizeAssignmentFile = (assignmentDetail) => {
  if (!assignmentDetail?.fileName) return null;
  const size = Number(assignmentDetail?.fileSize || 0);
  const sizeText = size
    ? (size < 1024 * 1024
      ? `${Math.max(size / 1024, 0.1).toFixed(1)} KB`
      : `${(size / (1024 * 1024)).toFixed(1)} MB`)
    : '';
  return {
    name: assignmentDetail.fileName,
    size,
    sizeText,
    rawFile: null,
    fileDownloadUrl: assignmentDetail?.fileDownloadUrl || ''
  };
};

const syncScoreDrafts = (list) => {
  const nextDrafts = { ...scoreDrafts.value };
  (list || []).forEach(detail => {
    nextDrafts[getDraftScore(detail)] = detail?.score ?? '';
  });
  scoreDrafts.value = nextDrafts;
};

const syncCurrentAssignmentFromList = () => {
  if (!currentAssignmentDetail.value?.assignmentId) {
  } else {
    const latest = assignmentDetails.value.find(detail => detail?.assignmentId === currentAssignmentDetail.value.assignmentId);
    if (latest) {
      currentAssignmentDetail.value = { ...latest };
    }
  }
  if (!learnAssignmentDetail.value?.assignmentId) {
    return;
  }
  const latestLearnAssignment = assignmentDetails.value.find(detail => detail?.assignmentId === learnAssignmentDetail.value.assignmentId);
  if (latestLearnAssignment) {
    learnAssignmentDetail.value = { ...latestLearnAssignment };
    selectedSubmissionFile.value = normalizeAssignmentFile(latestLearnAssignment);
  }
};

const resetReleaseForm = (assignmentDetail = null) => {
  releaseTitle.value = assignmentDetail?.title || '';
  releaseType.value = assignmentDetail?.assignmentType || '个人作业';
  releaseDetail.value = assignmentDetail?.content || '';
  releaseTag.value = assignmentDetail?.tag || '';
  releaseKnowledgeAgreement.value = assignmentDetail?.knowledgeAgreement || '';
  releaseEnvironment.value = assignmentDetail?.environment || '';
  releaseChapter.value = assignmentDetail?.chapter || '';
  releaseScore.value = assignmentDetail?.totalScore || '100';
  releaseAiEnabled.value = Boolean(assignmentDetail?.aiEnabled);
  // Default to false (closed) when creating a new assignment, otherwise use existing state
  releaseImmediate.value = assignmentDetail ? !assignmentDetail.publishTime : false;
  // Initialize to current time for publishTime and empty for deadline if not set
  if (!assignmentDetail) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    releasePublishTime.value = `${year}-${month}-${day} ${hours}:${minutes}`;
    releaseDeadline.value = '';
  } else {
    // 确保从后端获取的时间字符串被正确格式化为 YYYY-MM-DD HH:mm，以便 el-date-picker 能够正确回显
    const formatTime = (timeStr) => {
      if (!timeStr) return '';
      // 处理可能带有 'T' 或秒数 '.000Z' 的时间字符串
      return timeStr.replace('T', ' ').substring(0, 16);
    };
    releasePublishTime.value = formatTime(assignmentDetail?.publishTime);
    releaseDeadline.value = formatTime(assignmentDetail?.deadline);
  }
  releaseAllowFormat.value = assignmentDetail?.allowFormat || 'all';
  releaseLateForbidden.value = Boolean(assignmentDetail?.lateForbidden);
  releaseDuplicateCheck.value = Boolean(assignmentDetail?.duplicateCheck);
  releaseDuplicateThreshold.value = assignmentDetail?.duplicateThreshold || '30';
  releaseAutoReturn.value = Boolean(assignmentDetail?.autoReturn);
};

const getTeacherAssignmentStageText = (assignmentDetail) => {
  if (!isAssignmentPublished(assignmentDetail)) {
    return '未发布';
  }
  const stats = getTeacherAssignmentStats(assignmentDetail);
  if (stats.pending === 0 && stats.missing === 0 && (stats.corrected > 0 || assignmentDetail?.correct === '已批改')) {
    return '已批完';
  }
  if (stats.pending > 0 || stats.missing > 0) {
    return '未批完';
  }
  if (stats.corrected > 0) {
    return '已批作业';
  }
  return '已发布';
};

const isAssignmentPublished = (assignmentDetail) => Boolean(
  assignmentDetail?.assignmentId && (assignmentDetail?.title || assignmentDetail?.deadline || assignmentDetail?.content)
);

const formatTeacherDeadlineShort = (deadline) => {
  if (!deadline) return '暂无';
  return String(deadline).replace('T', ' ').slice(0, 16);
};

const getTeacherAssignmentStats = (assignmentDetail) => {
  const corrected = Number(assignmentDetail?.correctedCount);
  const pending = Number(assignmentDetail?.pendingCount);
  const missing = Number(assignmentDetail?.missingCount);
  return {
    corrected: Number.isFinite(corrected) ? corrected : (assignmentDetail?.correct === '已批改' ? 1 : 0),
    pending: Number.isFinite(pending) ? pending : (assignmentDetail?.submit === '已提交' && assignmentDetail?.correct !== '已批改' ? 1 : 0),
    missing: Number.isFinite(missing) ? missing : (assignmentDetail?.submit !== '已提交' ? 1 : 0),
  };
};

const getDraftScore = (assignmentDetail) => `${assignmentDetail?.assignmentId || 'assignment'}_${assignmentDetail?.accountId || assignmentDetail?.id || 'unknown'}`;

const isScoreSaving = (assignmentDetail) => savingScoreKeys.value.includes(getDraftScore(assignmentDetail));

const handleSubmissionFileChange = (event) => {
  const file = event?.target?.files?.[0];
  if (!file) return;
  selectedSubmissionFile.value = normalizeUploadedFile(file);
};

const downloadAssignmentFile = async (assignmentDetail, fallbackName) => {
  if (!assignmentDetail?.assignmentId) {
    ElMessage.warning('未找到作业附件信息');
    return;
  }
  try {
    const response = await axios.get(`${API_BASE}/assignment-file`, {
      params: {
        accountId: assignmentDetail?.accountId || userStore.account?.accountId,
        id: assignmentDetail?.id || currentCourseId.value,
        assignmentId: assignmentDetail.assignmentId
      },
      responseType: 'blob'
    });
    const blob = new Blob([response.data]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = extractAssignmentFileNameFromHeaders(response.headers, fallbackName || assignmentDetail?.fileName || 'assignment-file');
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.log('下载作业附件失败：', error);
    ElMessage.error('下载作业附件失败，请稍后重试');
  }
};

const downloadSubmittedFile = async () => {
  if (!learnAssignmentDetail.value?.fileName && !selectedSubmissionFile.value?.rawFile) {
    ElMessage.warning('当前没有可下载的附件');
    return;
  }
  if (selectedSubmissionFile.value?.rawFile && !learnAssignmentDetail.value?.fileName) {
    const objectUrl = URL.createObjectURL(selectedSubmissionFile.value.rawFile);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = selectedSubmissionFile.value.name || '作业附件';
    link.click();
    URL.revokeObjectURL(objectUrl);
    return;
  }
  await downloadAssignmentFile(learnAssignmentDetail.value, selectedSubmissionFile.value?.name);
};

const downloadTeacherSubmissionFile = async (assignmentDetail) => {
  if (!assignmentDetail?.fileName) {
    ElMessage.info('该提交没有附件');
    return;
  }
  await downloadAssignmentFile(assignmentDetail, assignmentDetail.fileName);
};

const getTeacherAiReviewEnabled = () => Boolean(currentAssignmentDetail.value?.aiEnabled);

const handleTeacherAiReviewToggle = async (assignmentDetail, checked) => {
  if (!assignmentDetail?.assignmentId) return;
  try {
    const response = await axios.post(`${API_BASE}/toggle-assignment-ai`, {
      id: currentCourseId.value,
      assignmentId: assignmentDetail.assignmentId,
      assignment: {
        aiEnabled: checked
      }
    });
    const data = response.data;
    if (!data.success) {
      ElMessage.error(data.message || 'AI预批阅设置失败');
      return;
    }
    await fetchLatestAssignments();
    currentAssignmentDetail.value = { ...(currentAssignmentDetail.value || assignmentDetail), aiEnabled: checked };
    await loadTeacherSubmissionDetails(currentAssignmentDetail.value);
    ElMessage.success(data.message || (checked ? '已开启AI预批阅' : '已关闭AI预批阅'));
  } catch (error) {
    console.log('AI预批阅设置失败：', error);
    ElMessage.error('AI预批阅设置失败，请稍后重试');
  }
};

const loadTeacherSubmissionDetails = async (assignmentDetail) => {
  try{
    const response=await axios.post('http://localhost:8080/check-assignment-submit',{
      accountId:userStore.account?.accountId,
      id:course.value?.id || currentCourseId.value,
      assignmentId:assignmentDetail.assignmentId
    });
    const data=response.data;
    if(data.success){
      successMessage.value=data.message;
      teacherSubmissionDetails.value = (data.assignments || []).filter(Boolean);
      syncScoreDrafts(teacherSubmissionDetails.value);
    }else {
      errorMessage.value = data.message;
      teacherSubmissionDetails.value = [];
      ElMessage.error(errorMessage.value);
    }
  }catch(error){
    console.log("已提交作业页面加载失败：",error);
    errorMessage.value="服务器错误，请稍后重试";
    teacherSubmissionDetails.value = [];
    ElMessage.error(errorMessage.value);
  }
};

const handleViewLearnAssignmentDetail = (assignmentDetail) => {
  learnAssignmentDetail.value = { ...assignmentDetail };
  showLearnAssignment.value = true;
  learnAssignmentTab.value = 'detail';
  submitContent.value = assignmentDetail?.submitContent || '';
  studentSubmitEditing.value = assignmentDetail?.submit !== '已提交';
  selectedSubmissionFile.value = normalizeAssignmentFile(assignmentDetail);
};

function handleAssignmentSubmit(assignmentDetail){
  handleViewLearnAssignmentDetail(assignmentDetail);
  learnAssignmentTab.value = 'submit';
}

const openTeacherAssignmentDetail = async (assignmentDetail) => {
  currentAssignmentDetail.value = { ...assignmentDetail };
  teacherAssignmentTab.value = 'detail';
  teacherReviewFilter.value = 'all';
  teacherReviewKeyword.value = '';
  activeTeacherAssignmentMenu.value = '';
  await loadTeacherSubmissionDetails(assignmentDetail);
  showTeacherAssignment.value = true;
};

//展示作业的详情
const handleDetail=async(id)=>{
  currentCourseId.value = id; // 记录当前课程ID
  try{
    // 清空旧数据
    userStore.setAssignmentDetails([]);
   const response=await axios.post('http://localhost:8080/assignment-details',{
     id:id,
     accountId:userStore.account?.accountId,
   });
   const data=response.data;
   if(data.success){
     successMessage.value=data.message;
     userStore.setAssignmentDetails(data.assignments);
     console.log(data.assignments);
     userStore.setCourse(data.course);
     showCourseDetails.value=true;
     ElMessage.success(successMessage.value);
   }else {
      errorMessage.value = data.message;
      ElMessage.error(errorMessage.value);
      console.log(errorMessage.value);
    }
  }catch(error){
    console.log("课程信息加载失败：",error);
    errorMessage.value="服务器错误，请稍后重试";
    ElMessage.error(errorMessage.value);
  }
}

const handleScoreBlur = async (assignmentDetail) => {
  if (assignmentDetail?.submit !== '已提交') return;
  const draftKey = getDraftScore(assignmentDetail);
  const nextScore = scoreDrafts.value[draftKey];
  if (nextScore === '' || nextScore === null || nextScore === undefined) {
    return;
  }
  const numericScore = Number(nextScore);
  if (Number.isNaN(numericScore)) {
    ElMessage.error('请输入有效分数');
    scoreDrafts.value[draftKey] = assignmentDetail?.score ?? '';
    return;
  }
  if (String(assignmentDetail?.score ?? '') === String(numericScore)) {
    return;
  }

  savingScoreKeys.value = [...savingScoreKeys.value, draftKey];
  try{
    const response=await axios.post('http://localhost:8080/correct-assignment',{
      accountId:assignmentDetail.accountId,
      id:assignmentDetail.id,
      assignmentId:assignmentDetail.assignmentId,
      score:numericScore,
    });
    const data=response.data;
    if(data.success){
      successMessage.value=data.message;
      if (Array.isArray(data.assignments)) {
        teacherSubmissionDetails.value = data.assignments.filter(Boolean);
        syncScoreDrafts(teacherSubmissionDetails.value);
      } else {
        teacherSubmissionDetails.value = teacherSubmissionDetails.value.map(detail => (
          getDraftScore(detail) === draftKey ? { ...detail, score: numericScore, correct: '已批改' } : detail
        ));
      }
      await fetchLatestAssignments();
      syncCurrentAssignmentFromList();
      ElMessage.success(successMessage.value);
    }else {
      errorMessage.value = data.message;
      ElMessage.error(errorMessage.value);
      scoreDrafts.value[draftKey] = assignmentDetail?.score ?? '';
    }
  }catch(error){
    console.log("批改作业失败：",error);
    errorMessage.value="服务器错误，请稍后重试";
    scoreDrafts.value[draftKey] = assignmentDetail?.score ?? '';
    ElMessage.error(errorMessage.value);
  } finally {
    savingScoreKeys.value = savingScoreKeys.value.filter(key => key !== draftKey);
  }
};

const startResubmit = () => {
  studentSubmitEditing.value = true;
  learnAssignmentTab.value = 'submit';
  submitContent.value = learnAssignmentDetail.value?.submitContent || '';
};

const handleDeleteSubmittedFile = async () => {
  if (selectedSubmissionFile.value?.rawFile) {
    selectedSubmissionFile.value = learnAssignmentDetail.value?.fileName
      ? normalizeAssignmentFile(learnAssignmentDetail.value)
      : null;
    ElMessage.success('已移除待上传附件');
    return;
  }
  if (!learnAssignmentDetail.value?.fileName) {
    selectedSubmissionFile.value = null;
    return;
  }
  try {
    const response = await axios.delete(`${API_BASE}/assignment-submission-file`, {
      params: {
        accountId: userStore.account?.accountId,
        id: learnAssignmentDetail.value.id || currentCourseId.value,
        assignmentId: learnAssignmentDetail.value.assignmentId
      }
    });
    const data = response.data;
    if (!data.success) {
      ElMessage.error(data.message || '删除附件失败');
      return;
    }
    const assignment = data.assignment || {};
    learnAssignmentDetail.value = {
      ...learnAssignmentDetail.value,
      ...assignment,
      fileName: '',
      fileStoredName: '',
      fileSize: null,
      fileContentType: '',
      fileDownloadUrl: ''
    };
    selectedSubmissionFile.value = null;
    studentSubmitEditing.value = true;
    learnAssignmentTab.value = 'submit';
    await fetchLatestAssignments();
    ElMessage.success(data.message || '附件删除成功');
  } catch (error) {
    console.log('删除附件失败：', error);
    ElMessage.error('删除附件失败，请稍后重试');
  }
};

//提交作业
const handleConfirmSubmit=async()=>{
  const trimmedSubmitContent = submitContent.value.trim();
  if (!trimmedSubmitContent && !selectedSubmissionFile.value?.rawFile && !learnAssignmentDetail.value?.fileName) {
    errorMessage.value = "请至少填写留言或上传附件";
    ElMessage.error(errorMessage.value);
    return;
  }
  try{
    const formData = new FormData();
    formData.append('id', learnAssignmentDetail.value.id || currentCourseId.value);
    formData.append('accountId', userStore.account?.accountId || '');
    formData.append('assignmentId', learnAssignmentDetail.value.assignmentId || '');
    if (trimmedSubmitContent) {
      formData.append('submitContent', trimmedSubmitContent);
    }
    if (selectedSubmissionFile.value?.rawFile) {
      formData.append('file', selectedSubmissionFile.value.rawFile);
    }
    const response=await axios.post(`${API_BASE}/assignment-submit`, formData);
    const data=response.data;
    if (data.success) {
      successMessage.value = data.message;
      userStore.setAssignmentSubmit(data.assignment || {});  // 确保设置一个对象
      learnAssignmentDetail.value = {
        ...learnAssignmentDetail.value,
        ...(data.assignment || {}),
        submit: '已提交',
        submitContent: trimmedSubmitContent,
        fileName: selectedSubmissionFile.value?.name || learnAssignmentDetail.value?.fileName
      };
      selectedSubmissionFile.value = normalizeAssignmentFile({
        ...learnAssignmentDetail.value,
        fileName: selectedSubmissionFile.value?.name || learnAssignmentDetail.value?.fileName
      }) || selectedSubmissionFile.value;
      studentSubmitEditing.value = false;
      learnAssignmentTab.value = 'submit';
      await fetchLatestAssignments();
      syncCurrentAssignmentFromList();
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
//返回按钮
function fromTeachBack(){
  showTeacherAssignment.value=false;
  teacherAssignmentTab.value = 'detail';
  teacherSubmissionDetails.value = [];
  activeTeacherAssignmentMenu.value = '';
  fetchLatestAssignments();
}
// 新增：重新获取当前课程作业数据的方法
const fetchLatestAssignments = async () => {
  if (!currentCourseId.value) return; // 确保有课程ID
  try {
    const response = await axios.post('http://localhost:8080/assignment-details', {
      id: currentCourseId.value,
      accountId: userStore.account?.accountId,
    });
    if (response.data.success) {
      // 用最新数据更新Pinia状态
      userStore.setAssignmentDetails(response.data.assignments);
      syncCurrentAssignmentFromList();
    }
  } catch (error) {
    console.error("返回时刷新作业失败：", error);
  }
};
function fromLearnBack(){
  showLearnAssignment.value=false;
  learnAssignmentTab.value = 'detail';
  studentSubmitEditing.value = false;
  learnAssignmentDetail.value={};
  submitContent.value = '';
  selectedSubmissionFile.value = null;
}

const openCreateAssignmentDialog = () => {
  releaseEditMode.value = false;
  editingAssignmentId.value = '';
  resetReleaseForm();
  releasePublishTimeReadonly.value = releaseImmediate.value;
  displayReleaseAssignment.value = true;
  activeTeacherAssignmentMenu.value = '';
};

const openPublishAssignmentDialog = (assignmentDetail) => {
  currentAssignmentDetail.value = assignmentDetail ? { ...assignmentDetail } : currentAssignmentDetail.value;
  openCreateAssignmentDialog();
};

const openEditAssignmentDialog = (assignmentDetail) => {
  releaseEditMode.value = true;
  editingAssignmentId.value = assignmentDetail?.assignmentId || '';
  resetReleaseForm(assignmentDetail);
  releasePublishTimeReadonly.value = releaseImmediate.value;
  displayReleaseAssignment.value = true;
  activeTeacherAssignmentMenu.value = '';
};

const toggleTeacherAssignmentMenu = (assignmentId) => {
  activeTeacherAssignmentMenu.value = activeTeacherAssignmentMenu.value === assignmentId ? '' : assignmentId;
};

const handleDeleteCourseAssignment = (assignmentDetail) => {
  if (!assignmentDetail?.assignmentId || !currentCourseId.value) return;
  if (!window.confirm(`确认删除“${assignmentDetail.title || '该作业'}”吗？`)) return;
  activeTeacherAssignmentMenu.value = '';
  axios.post(`${API_BASE}/delete-course-assignment`, {
    id: currentCourseId.value,
    assignmentId: assignmentDetail.assignmentId
  }).then(async (response) => {
    const data = response.data;
    if (data.success) {
      if (currentAssignmentDetail.value?.assignmentId === assignmentDetail.assignmentId) {
        showTeacherAssignment.value = false;
        currentAssignmentDetail.value = null;
        teacherSubmissionDetails.value = [];
      }
      await fetchLatestAssignments();
      ElMessage.success(data.message || '作业删除成功');
      return;
    }
    ElMessage.error(data.message || '作业删除失败');
  }).catch((error) => {
    console.log('删除作业失败：', error);
    ElMessage.error('删除作业失败，请稍后重试');
  });
};

// 修改 CoursePage.vue 中 confirmReleaseAssignment 方法
const confirmReleaseAssignment = async () => {
  try {
    // 1. 增加参数校验
    if (!releaseTitle.value) {
      errorMessage.value = "请填写作业主题";
      ElMessage.error(errorMessage.value);
      return;
    }

    // 当需要立即发布时，进行严格的参数校验
    if (releaseImmediate.value || releaseEditMode.value) {
      if (!releaseDeadline.value || !releaseType.value || !releaseDetail.value || !releaseScore.value) {
        errorMessage.value = "请填写完整的作业信息（包含内容、截止日期和总分）";
        ElMessage.error(errorMessage.value);
        return;
      }
    }

    // 2. 确保总分是数字类型，未填时默认为100分（避免草稿状态下后端报错）
    const totalScoreStr = releaseScore.value || '100';
    const totalScore = parseInt(totalScoreStr, 10);
    if (isNaN(totalScore) || totalScore <= 0) {
      errorMessage.value = "总分必须是有效的正数";
      ElMessage.error(errorMessage.value);
      return;
    }

    // 3. 验证当前课程ID是否存在
    if (!currentCourseId.value) {
      errorMessage.value = "未获取到课程信息，请重新进入课程";
      ElMessage.error(errorMessage.value);
      return;
    }

    if (releaseEditMode.value && editingAssignmentId.value) {
      const response = await axios.post(`${API_BASE}/update-course-assignment`, {
        id: currentCourseId.value,
        assignmentId: editingAssignmentId.value,
        assignment: {
          title: releaseTitle.value,
          deadline: releaseDeadline.value,
          assignmentType: releaseType.value,
          content: releaseDetail.value,
          totalScore,
          aiEnabled: releaseAiEnabled.value
        }
      });
      const data = response.data;
      if (!data.success) {
        errorMessage.value = data.message || '作业更新失败';
        ElMessage.error(errorMessage.value);
        return;
      }
      await fetchLatestAssignments();
      displayReleaseAssignment.value = false;
      releaseEditMode.value = false;
      editingAssignmentId.value = '';
      ElMessage.success(data.message || '作业更新成功');
      return;
    }

    const assignment = {
      title: releaseTitle.value,
      deadline: releaseDeadline.value,
      assignmentType: releaseType.value,
      content: releaseDetail.value,
      totalScore: totalScore,  // 使用转换后的数字类型
      aiEnabled: releaseAiEnabled.value,
      tag: releaseTag.value,
      knowledgeAgreement: releaseKnowledgeAgreement.value,
      environment: releaseEnvironment.value,
      chapter: releaseChapter.value,
      allowFormat: releaseAllowFormat.value,
      lateForbidden: releaseLateForbidden.value,
      duplicateCheck: releaseDuplicateCheck.value,
      duplicateThreshold: releaseDuplicateThreshold.value,
      autoReturn: releaseAutoReturn.value,
      publishTime: releaseImmediate.value ? releasePublishTime.value : ''
    };

    const response = await axios.post("http://localhost:8080/release-assignment", {
      accountId:userStore.account?.accountId,
      id: currentCourseId.value,
      assignment: assignment
    });

    const data = response.data;
    if (data.success) {
      successMessage.value = data.message;
      ElMessage.success(successMessage.value);
      await fetchLatestAssignments();
      // 重置表单
      resetReleaseForm();
      displayReleaseAssignment.value = false;
    } else {
      errorMessage.value = data.message;
      ElMessage.error(errorMessage.value);
    }
  } catch (error) {
    console.log("发布作业失败：", error);
    // 4. 更详细的错误提示
    if (error.response) {
      // 服务器返回了错误响应
      errorMessage.value = `发布失败（${error.response.status}）：${error.response.data?.message || '参数错误'}`;
    } else if (error.request) {
      // 没有收到响应
      errorMessage.value = "服务器无响应，请检查网络";
    } else {
      // 请求配置错误
      errorMessage.value = "请求配置错误，请刷新页面重试";
    }
    ElMessage.error(errorMessage.value);
  }
};
function fromReleaseBack(){
  displayReleaseAssignment.value=false;
  releaseEditMode.value = false;
  editingAssignmentId.value = '';
  activeTeacherAssignmentMenu.value = '';
}

const API_BASE = 'http://localhost:8080';
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
  const courseId = currentCourseKey.value;
  if (!courseId) return [];
  const response = await axios.get(`${API_BASE}/courses/${courseId}/materials/folders`, {
    params: getMaterialsRequestParams()
  });
  const list = parseListResponse(response.data, 'folders', 'data', 'list');
  return list.map(normalizeFolder).filter((item) => item.id);
}

async function fetchMaterialAttachments() {
  const courseId = currentCourseKey.value;
  if (!courseId) return [];
  const response = await axios.get(`${API_BASE}/courses/${courseId}/materials/attachments`, {
    params: getMaterialsRequestParams()
  });
  const list = parseListResponse(response.data, 'attachments', 'data', 'list');
  return list.map(normalizeAttachment).filter((item) => item.id);
}

async function fetchMaterialLinks() {
  const courseId = currentCourseKey.value;
  if (!courseId) return [];
  const response = await axios.get(`${API_BASE}/courses/${courseId}/materials/links`, {
    params: getMaterialsRequestParams()
  });
  const list = parseListResponse(response.data, 'links', 'data', 'list');
  return list.map(normalizeLink).filter((item) => item.id);
}

async function refreshMaterials() {
  const courseId = currentCourseKey.value;
  if (!courseId || !userStore.account?.accountId) return;
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

const currentCourseKey = computed(() => course.value?.id || currentCourseId.value || '');
watch(
  [currentCourseKey, materialsCategory],
  ([key]) => {
    if (!key) return;
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
  const courseId = currentCourseKey.value;
  if (!courseId) return;
  try {
    for (const file of files) {
      const formData = new FormData();
      formData.append('accountId', userStore.account?.accountId || '');
      formData.append('category', materialsCategory.value);
      if (currentFolderId.value !== 'root') {
        formData.append('folderId', currentFolderId.value);
      }
      formData.append('file', file);
      await axios.post(`${API_BASE}/courses/${courseId}/materials/attachments`, formData);
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
  const courseId = currentCourseKey.value;
  if (!courseId) return;
  try {
    await axios.post(`${API_BASE}/courses/${courseId}/materials/folders`, {
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
  const courseId = currentCourseKey.value;
  if (!courseId || !movingFolderId.value) return;
  try {
    const targetId = moveTargetParentId.value === 'root' ? null : moveTargetParentId.value;
    await axios.put(`${API_BASE}/courses/${courseId}/materials/folders/${movingFolderId.value}/move`, {
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
  if (!item) return;
  if (!window.confirm(`确认删除“${item.name}”吗？`)) return;
  const courseId = currentCourseKey.value;
  if (!courseId) return;
  try {
    if (item.type === 'folder') {
      await axios.delete(`${API_BASE}/courses/${courseId}/materials/folders/${item.id}`, {
        params: { accountId: userStore.account?.accountId }
      });
      if (currentFolderId.value === item.id || getDescendantFolderIds(item.id).has(currentFolderId.value)) {
        folderPath.value = ['root'];
        currentFolderId.value = 'root';
      }
    } else {
      await axios.delete(`${API_BASE}/courses/${courseId}/materials/attachments/${item.id}`, {
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
  if (!fileItem || fileItem.type !== 'file') return;
  const courseId = currentCourseKey.value;
  if (!courseId) return;
  try {
    const response = await axios.get(`${API_BASE}/courses/${courseId}/materials/attachments/${fileItem.id}/download`, {
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
  const courseId = currentCourseKey.value;
  if (!courseId) return;
  try {
    await axios.post(`${API_BASE}/courses/${courseId}/materials/links`, {
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
  if (!linkItem) return;
  if (!window.confirm(`确认删除外链“${linkItem.title}”吗？`)) return;
  const courseId = currentCourseKey.value;
  if (!courseId) return;
  try {
    await axios.delete(`${API_BASE}/courses/${courseId}/materials/links/${linkItem.id}`, {
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
  <header class="prep-topbar course-topbar">
    <div class="prep-topbar__left">
      <img class="prep-topbar__logo" src="@/assets/logo_blue.png" alt="Ai课堂派">
      <nav class="prep-topbar__nav">
        <button
          v-for="item in topMenus"
          :key="item.key"
          v-show="!item.teacherOnly || userStore.account?.identity === '老师'"
          type="button"
          class="prep-topbar__nav-item"
          :class="{ 'is-active': item.key === 'course' }"
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
          <img alt="用户头像" src="@/assets/课堂派头像.jpg"/>
          <span>{{ displayName }}</span>
        </button>
        <div v-show="userMenuOpen" class="dropdown-content is-open">
          <button @click="handleUserMenuAction(goToCourse)">我的课堂</button>
          <button v-if="userStore.account?.identity==='老师'" @click="handleUserMenuAction(goToLessonPrep)">备课区</button>
          <button @click="closeUserMenu">开通VIP</button>
          <button @click="closeUserMenu">机构用户认证</button>
          <button @click="handleUserMenuAction(goToPersonalSetting)">个人设置</button>
          <button @click="handleUserMenuAction(goToLogin)">退出登录</button>
        </div>
      </div>
    </div>
  </header>

  <div class="body-container"  v-if="!showCourseDetails">
    <div class="top-course-container">
      <div class="top-course-container-header">
        <h2>置顶课程</h2>
        <div class="course-dropdown">
          <button class="create-join-course">＋创建/加入课程</button>
          <div class="course-dropdown-content">
            <el-button @click="createDialogVisible=true">创建课程</el-button>
            <el-button @click="joinDialogVisible=true">加入课程</el-button>
          </div>
        </div>
      </div>
      <div class="top-course-container-body">
          <div class="course-container"  v-for="course in topCourses.filter(c => c)" :key="course&&course.id" @click="handleDetail(course.id)">
            <div class="course-information-header">
              <label class="course-time">{{course&&course.time}}</label>
              <label class="course-name">{{course&&course.name}}</label>
              <label class="course-classes">{{course&&course.classes}}</label>
              <label class="course-code">{{course&&course.id}}</label>
            </div>
            <div class="course-information-footer">
              <div class="learn-div">
                <div><span>负责人:{{course&&course.teacher}}</span></div>
                <!-- 动态按钮：已置顶则显示“取消置顶”，否则显示“置顶” -->
                <button
                    @click="isCourseTop(course.id) ? handleCancelTop(course) : handleTop(course, 'teacher')"
                    class="top-placement">
                  {{ isCourseTop(course.id) ? '取消置顶' : '置顶' }}
                </button>
              </div>
              <div class="course-menu-dots" @click.stop="openArchiveMenu($event, course)">⋮</div>
            </div>
          </div>
      </div>
    </div>
    <div class="nav">
      <div class="teach-learn">
        <button class="teach-button" @click="handleITeachClick" v-if="userStore.account?.identity==='老师'" :class="{'active':iTeach}"  >我教的</button>
        <button class="learn-button" @click="handleILearnClick" :class="{'active':iLearn}">我学的</button>
      </div>
      <button class="archive-manager-btn" @click="openArchiveManager(identity === '老师' ? 'taught' : 'learned')">归档课程</button>
      <div class="search" :class="{ 'search-focused': isSearchFocused }">
        <input   @focus="isSearchFocused = true"  @blur="isSearchFocused = false" placeholder="搜索我学的课程">
        <button>搜</button>
      </div>
    </div>
    <div class="teach-display-div" v-if="iTeach&&userStore.account?.identity==='老师'" >
      <div class="bottom-course-container">
        <div class="bottom-course-container-header">
          <button @click="isFold=false" v-if="isFold">收起</button>
          <button @click="isFold=true" v-if="!isFold" >展开</button>
        </div>
        <div class="bottom-course-container-body" v-if="isFold">
          <div class="course-container" v-for="course in taughtCourses.filter(c => c)" :key="course && course.id" @click="handleDetail(course.id)" >
            <div class="course-information-header">
              <label class="course-time">{{course&&course.time}}</label>
              <label class="course-name">{{course&&course.name}}</label>
              <label class="course-classes">{{course&&course.classes}}</label>
              <label class="course-code">{{course&&course.id}}</label>
            </div>
            <div class="course-information-footer">
              <div class="teach-div">
                <div ><span>成员{{course.number}}人</span></div>
                <!-- 动态按钮：已置顶则显示“取消置顶”，否则显示“置顶” -->
                <button
                    @click="isCourseTop(course.id) ? handleCancelTop(course) : handleTop(course, 'teacher')"
                    class="top-placement"
                >
                  {{ isCourseTop(course.id) ? '取消置顶' : '置顶' }}
                </button>
              </div>
              <div class="course-menu-dots" @click.stop="openArchiveMenu($event, course)">⋮</div>
            </div>
          </div>
        </div>
      </div>
      <!-- 全部无课程提示 -->
      <div v-if="!taughtCourses || taughtCourses.length === 0" class="empty-state">
        <p>暂无教授的课程</p>
      </div>
    </div>
    <div class="learn-display-div" v-if="iLearn">
      <div class="bottom-course-container">
        <div class="bottom-course-container-header">
          <button @click="isFold=false" v-if="isFold">收起</button>
          <button @click="isFold=true" v-if="!isFold" >展开</button>
        </div>
        <div class="bottom-course-container-body" v-if="isFold">
          <div class="course-container"  v-for="course in learnedCourses.filter(c => c)" :key="course.id" @click="handleDetail(course.id)" >
            <div class="course-information-header">
              <label class="course-time">{{course.time}}</label>
              <label class="course-name">{{course.name}}</label>
              <label class="course-classes">{{course.classes}}</label>
              <label class="course-code">{{course.id}}</label>
            </div>
            <div class="course-information-footer">
              <div class="learn-div">
                <div><span>负责人:{{course.teacher}}</span></div>
                <!-- 动态按钮：已置顶则显示“取消置顶”，否则显示“置顶” -->
                <button
                    @click="isCourseTop(course.id) ? handleCancelTop(course) : handleTop(course, 'teacher')"
                    class="top-placement"
                >
                  {{ isCourseTop(course.id) ? '取消置顶' : '置顶' }}
                </button>
              </div>
              <div class="course-menu-dots" @click.stop="openArchiveMenu($event, course)">⋮</div>
            </div>
          </div>
        </div>
      </div>
      <!-- 全部无课程提示 -->
      <div v-if="!learnedCourses || learnedCourses.length === 0" class="empty-state">
        <p>暂无学习的课程</p>
      </div>
    </div>

  </div>
  <div class="course-details" v-if="showCourseDetails">
    <div class="course-details-header" v-if="!assignmentOverlayActive">
      <div class="course-details-header-title">
       <div>{{course.id}}</div>
        <div>{{course.name}}</div>
      </div>
      <div class="course-details-header-content">
        <button class="course-learning" @click="handleClickCourseLearning" :class="{'active':courseLearning}" >课程学习</button>
        <button class="learning-analysis" @click="handleClickLearningAnalysis" :class="{'active':learningAnalysis}">学情分析</button>
        <button class="grade-management"  @click="handleClickGradeManagement" :class="{'active':gradeManagement}">成绩管理</button>
        <button class="course-introduction" @click="handleClickCourseIntroduction" :class="{'active':courseIntroduction}">课程介绍</button>
        <button class="knowledge-graph" @click="handleClickKnowledgeGraph" :class="{'active':knowledgeGraph}">知识图谱</button>
      </div>
    </div>
    <div class="course-details-blank" v-if="!assignmentOverlayActive && (learningAnalysis||gradeManagement||courseIntroduction||knowledgeGraph)">
      <img src="@/assets/课堂派课程详情空白页.png" alt="课堂派课程详情空白页">
      <span>这里是一片荒地</span>
    </div>
    <div>
      <div class="course-learning-container" v-if="courseLearning">
        <div class="course-learning-header" v-if="!assignmentOverlayActive">
          <button class="" @click="handleClickContent" :class="{'active':content}">目录</button>
          <button class="" @click="handleClickInteractiveCourseware" :class="{'active':interactiveCourseware}">互动课件</button>
          <button class="" @click="handleClickHomework" :class="{'active':homework}">作业</button>
          <button class="" @click="handleClickTest" :class="{'active':test}">测试</button>
          <button class="" @click="handleClickData" :class="{'active':data}">资料</button>
          <button class="" @click="handleClickTencentConference" :class="{'active':tencentConference}">腾讯会议</button>
          <button class="" @click="handleClickGivePublicNotice" :class="{'active':givePublicNotice}">公告</button>
          <button class="" @click="handleClickTopic" :class="{'active':topic}">话题</button>
          <button class="" @click="handleClickInteractiveAnswer" :class="{'active':interactiveAnswer}">互动答题</button>
        </div>
        <div class="course-details-blank" v-if="!assignmentOverlayActive && (content||interactiveCourseware||test||tencentConference||givePublicNotice||interactiveAnswer)">
          <img src="@/assets/课堂派课程详情空白页.png" alt="课堂派课程详情空白页">
          <span>这里是一片荒地</span>
        </div>
        <div class="course-learning-body" v-if="topic">
          <TopicPage :course-id="currentCourseKey" :course-name="courseName" />
        </div>
        <div class="course-learning-body" v-if="data">
          <CourseMaterials :course-id="course.id || currentCourseId" :is-teacher-view="iTeach" />
        </div>
        <div class="course-learning-body" v-if="homework">
          <CourseAssignments
            :mode="courseAssignmentsMode"
            :i-teach="iTeach"
            :i-learn="iLearn"
            :valid-assignment-details="validAssignmentDetails"
            :student-visible-assignment-details="studentVisibleAssignmentDetails"
            :filtered-teacher-assignments="filteredTeacherAssignments"
            v-model:teacher-homework-filter="teacherHomeworkFilter"
            :show-teacher-assignment="showTeacherAssignment"
            :show-learn-assignment="showLearnAssignment"
            :current-assignment-detail="currentAssignmentDetail"
            v-model:teacher-assignment-tab="teacherAssignmentTab"
            v-model:teacher-comment-draft="teacherCommentDraft"
            v-model:teacher-comment-real-name="teacherCommentRealName"
            v-model:teacher-comment-attachment-only="teacherCommentAttachmentOnly"
            v-model:teacher-review-filter="teacherReviewFilter"
            v-model:teacher-review-keyword="teacherReviewKeyword"
            :teacher-submission-stats="teacherSubmissionStats"
            :filtered-teacher-submission-details="filteredTeacherSubmissionDetails"
            :score-drafts="scoreDrafts"
            v-model:learn-assignment-tab="learnAssignmentTab"
            :learn-assignment-detail="learnAssignmentDetail"
            :student-submit-has-submitted="studentSubmitHasSubmitted"
            :student-submit-editing="studentSubmitEditing"
            :selected-submission-file="selectedSubmissionFile"
            v-model:submit-content="submitContent"
            :active-teacher-assignment-menu="activeTeacherAssignmentMenu"
            :display-release-assignment="displayReleaseAssignment"
            :release-edit-mode="releaseEditMode"
            v-model:release-title="releaseTitle"
            v-model:release-type="releaseType"
            v-model:release-detail="releaseDetail"
            v-model:release-tag="releaseTag"
            v-model:release-knowledge-agreement="releaseKnowledgeAgreement"
            v-model:release-environment="releaseEnvironment"
            v-model:release-chapter="releaseChapter"
            :show-release-switch="showReleaseSwitch"
            :show-release-publish-settings="showReleasePublishSettings"
            v-model:release-immediate="releaseImmediate"
            v-model:release-publish-time="releasePublishTime"
            :release-publish-time-readonly="releasePublishTimeReadonly"
            v-model:release-deadline="releaseDeadline"
            v-model:release-allow-format="releaseAllowFormat"
            v-model:release-score="releaseScore"
            v-model:release-late-forbidden="releaseLateForbidden"
            v-model:release-duplicate-check="releaseDuplicateCheck"
            v-model:release-duplicate-threshold="releaseDuplicateThreshold"
            v-model:release-auto-return="releaseAutoReturn"
            v-model:release-ai-enabled="releaseAiEnabled"
            :release-submit-button-text="releaseSubmitButtonText"
            :get-teacher-assignment-stage-text="getTeacherAssignmentStageText"
            :is-assignment-published="isAssignmentPublished"
            :format-teacher-deadline-short="formatTeacherDeadlineShort"
            :get-teacher-assignment-stats="getTeacherAssignmentStats"
            :handle-view-learn-assignment-detail="handleViewLearnAssignmentDetail"
            :handle-assignment-submit="handleAssignmentSubmit"
            :open-teacher-assignment-detail="openTeacherAssignmentDetail"
            :open-publish-assignment-dialog="openPublishAssignmentDialog"
            :open-create-assignment-dialog="openCreateAssignmentDialog"
            :toggle-teacher-assignment-menu="toggleTeacherAssignmentMenu"
            :open-edit-assignment-dialog="openEditAssignmentDialog"
            :handle-delete-course-assignment="handleDeleteCourseAssignment"
            :from-teach-back="fromTeachBack"
            :from-learn-back="fromLearnBack"
            :get-teacher-ai-review-enabled="getTeacherAiReviewEnabled"
            :handle-teacher-ai-review-toggle="handleTeacherAiReviewToggle"
            :download-teacher-submission-file="downloadTeacherSubmissionFile"
            :get-draft-score="getDraftScore"
            :is-score-saving="isScoreSaving"
            :handle-score-blur="handleScoreBlur"
            :start-resubmit="startResubmit"
            :handle-delete-submitted-file="handleDeleteSubmittedFile"
            :handle-confirm-submit="handleConfirmSubmit"
            :download-submitted-file="downloadSubmittedFile"
            :confirm-release-assignment="confirmReleaseAssignment"
            :from-release-back="fromReleaseBack"
            @submission-file-change="handleSubmissionFileChange"
          />
        </div>
      </div>
    </div>
  </div>
  <el-dialog v-model="joinDialogVisible" draggable :close-on-click-modal="false" :append-to-body="false" :show-close="false">
    <template #header>
      <div class="dialog-header">
        <span class="join-course-span">加入课程</span>
        <span class="cancel-span" @click="joinDialogVisible = false">×</span>
      </div>
    </template>
    <div class="dialog-body">
      <div class="input-div">
        <div><span>*</span><label>加课码</label></div>
        <input v-model="courseCode" placeholder="请输入课程加课码"/>
      </div>
    </div>
    <!-- 底部按钮 -->
    <template #footer>
        <span class="dialog-footer">
          <div class="cancel-confirm">
           <el-button class="cancel-button" @click="joinDialogVisible = false">取消</el-button>
          <el-button class="confirm-button" type="primary" @click="handleJoinConfirm">确认</el-button>
          </div>
        </span>
    </template>
  </el-dialog>
  <el-dialog v-model="createDialogVisible" draggable :close-on-click-modal="false" :show-close="false">
    <template #header>
      <div class="dialog-header">
        <span class="join-course-span">创建课程</span>
        <span class="cancel-span" @click="createDialogVisible = false">×</span>
      </div>
    </template>
    <div class="dialog-body">
      <div class="input-div">
        <div><span>*</span><label>课程名称</label></div>
        <input v-model="courseName"/>
      </div>
      <div class="input-div">
        <div><span>*</span><label>教学班级</label></div>
        <input v-model="teachClass"/>
      </div>
      <div class="input-div">
        <div><span>*</span><label>学年-学期</label></div>
        <input v-model="newTime"/>
      </div>
      <div class="input-div">
        <div><span>*</span><label>成员个数</label></div>
        <input v-model="studentNumber"/>
      </div>
    </div>
    <!-- 底部按钮 -->
    <template #footer>
        <span class="dialog-footer">
          <div class="cancel-confirm">
           <el-button class="cancel-button" @click="createDialogVisible = false">取消</el-button>
          <el-button class="confirm-button" type="primary" @click="handleCreateConfirm">确认</el-button>
          </div>
        </span>
    </template>
  </el-dialog>
<!-- 归档菜单弹窗 -->
<teleport to="body">
  <div v-if="showArchiveMenu"
       class="archive-menu"
       :style="{ left: archiveMenuPosition.x + 'px', top: archiveMenuPosition.y + 'px' }"
       @click.stop>
    <div v-if="identity !== '老师'" class="archive-menu-item" @click="handleArchive(showArchiveMenu.id, 'student')">归档</div>
    <div v-if="identity === '老师'" class="archive-menu-item" @click="handleArchive(showArchiveMenu.id, 'teacher_self')">归档自己</div>
    <div v-if="identity === '老师'" class="archive-menu-item" @click="handleArchive(showArchiveMenu.id, 'teacher_student')">全部归档</div>
  </div>
</teleport>
<!-- 归档管理对话框 -->
<el-dialog v-model="showArchiveManager" title="归档课程" width="70%" :before-close="() => showArchiveManager = false">
  <div class="archive-manager-container">
    <div class="archive-tabs">
      <div :class="['archive-tab', { active: archivedCourseType === 'learned' }]" @click="loadArchivedCourses('learned')">我学的({{ archivedLearnedCourses.length }})</div>
      <div v-if="identity === '老师'" :class="['archive-tab', { active: archivedCourseType === 'taught' }]" @click="loadArchivedCourses('taught')">我教的({{ archivedTaughtCourses.length }})</div>
    </div>
    <div class="archive-content">
      <div class="semester-sidebar">
        <div v-for="group in (archivedCourseType === 'taught' ? taughtSemesterGroups : learnedSemesterGroups)" :key="group.name" class="semester-item">{{ group.name }}</div>
      </div>
      <div class="archive-courses-list">
        <div v-for="group in (archivedCourseType === 'taught' ? taughtSemesterGroups : learnedSemesterGroups)" :key="group.name" class="semester-courses-section">
          <div class="semester-header">{{ group.name }}</div>
          <div class="course-cards">
            <div v-for="course in group.courses" :key="course.id" class="archived-course-card">
              <div class="course-icon" :style="{ backgroundColor: archivedCourseType === 'taught' ? '#2563eb' : '#8b5cf6' }">
                <span class="course-badge">{{ archivedCourseType === 'taught' ? '教' : '学' }}</span>
              </div>
              <div class="course-info">
                <div class="course-id">{{ course.id }}</div>
                <div class="course-name">{{ course.name }}</div>
                <div class="course-members">成员{{ course.number }}人</div>
              </div>
              <div class="course-actions">
                <button class="restore-btn" @click="unarchiveCourse(course.id)">恢复</button>
              </div>
            </div>
          </div>
        </div>
        <div v-if="(archivedCourseType === 'taught' ? taughtSemesterGroups : learnedSemesterGroups).length === 0" class="no-courses">暂无归档课程</div>
      </div>
    </div>
  </div>
</el-dialog>
</template>
<style>
.top-nav-current {
  color: #4285F4;
  font-size: 16px;
  line-height: 65px;
  border-bottom: none;
  padding: 0 5px;
}

.course-breadcrumb-link {
  cursor: pointer;
  color: #606266;
  font-size: 14px;
  font-weight: 400;
  line-height: 65px;
  padding: 0 2px;
  transition: color 0.2s ease;
}

.course-breadcrumb-link:hover {
  color: #4285f4;
}

.course-breadcrumb-separator {
  margin: 0 4px;
  color: #c0c4cc;
  display: flex;
  align-items: center;
  font-size: 12px;
  line-height: 65px;
}

.course-breadcrumb-current {
  color: #303133;
  font-size: 14px;
  font-weight: 400;
  line-height: 65px;
  padding: 0 2px;
}
.submit-button{
  border:none;
  height: 36px;
  font-size:14px;
  color:white;
  background-color:rgb(66, 133, 244) !important;
  cursor:pointer;
  border-radius:4px;
}
.submit-button:hover{
  background-color:rgb(104, 157, 246);
}
.assignment-content{
  display:flex;
  width:360px;
  justify-content:space-between;
}
.homework-container{
  display:flex;
  align-items: center;
}
.assignment-info{
  display:flex;
  flex-direction:column;
  font-size:14px;
}
.course-details-header-title{
  display:flex;
  flex-direction: column;
  color:white;
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
.el-dialog{
  width:784px;
  border:2px solid #4285F4;
  background-color:white;
  border-radius:8px;
  display:flex;
  flex-direction:column;
  justify-content:center;
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
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  background-color: white;
  min-width: 160px;
  padding: 8px 0;
  border-radius: 2px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
  z-index: 1200;
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

.head-left img {
  width: auto;
  height: 28px;
  margin-right: 15px;
}

.prep-topbar {
  width: 100%;
  height: 60px;
  padding: 0 14px 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 0 0 #dfdfdf;
  background-color: #fff;
  z-index: 999;
  top: 0;
  left: 0;
  position: fixed;
}

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
  color: #4a556a;
  font-size: 13px;
}

.prep-topbar__user img {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  padding: 0;
}

.prep-topbar__user-menu {
  display: flex;
  align-items: center;
}

.head-right > span {
  font-size: 14px;
}

.header-course-mode .head-left img {
  margin-right: 12px;
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
.ai-comment{
  margin-top: 10px;
  padding: 10px;
  background-color: #f0f7ff;
  border-radius: 6px;
  border: 1px solid #d4e8ff;
}
.ai-comment div{
  font-size: 13px;
  line-height: 1.6;
}
.ai-switch{
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0;
  font-size: 14px;
  cursor: pointer;
}
.archive-manager-btn{background:#fff;border:1px solid #d1d5db;padding:10px 20px;border-radius:6px;font-size:14px;color:#374151;cursor:pointer;margin-left:auto;margin-right:16px}
.archive-manager-btn:hover{background:#f9fafb;border-color:#9ca3af}
.course-menu-dots{font-size:20px;color:#6b7280;cursor:pointer;padding:4px 8px}
.course-menu-dots:hover{color:#374151}
.archive-menu{position:fixed;background:#fff;border:1px solid #e5e7eb;border-radius:8px;box-shadow:0 10px 25px rgba(0,0,0,.1);z-index:1000;min-width:120px}
.archive-menu-item{padding:10px 16px;cursor:pointer;font-size:14px;color:#374151;transition:background .2s}
.archive-menu-item:hover{background:#f3f4f6}
.archive-manager-container{display:flex;flex-direction:column;gap:16px}
.archive-tabs{display:flex;gap:20px;border-bottom:1px solid #e5e7eb;padding-bottom:12px}
.archive-tab{padding:8px 16px;cursor:pointer;font-size:14px;color:#6b7280;border-bottom:2px solid transparent;transition:all .2s}
.archive-tab.active{color:#2563eb;border-bottom-color:#2563eb}
.archive-tab:hover{color:#374151}
.archive-content{display:flex;gap:20px;min-height:400px}
.semester-sidebar{width:200px;border-right:1px solid #e5e7eb;padding-right:16px}
.semester-item{padding:12px 16px;cursor:pointer;font-size:14px;color:#374151;border-radius:6px;margin-bottom:8px;transition:background .2s}
.semester-item:hover{background:#f3f4f6}
.archive-courses-list{flex:1}
.semester-courses-section{margin-bottom:24px}
.semester-header{font-size:16px;font-weight:600;color:#111827;margin-bottom:12px}
.course-cards{display:flex;flex-direction:column;gap:12px}
.archived-course-card{display:flex;align-items:center;gap:16px;padding:16px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;transition:box-shadow .2s}
.archived-course-card:hover{box-shadow:0 4px 12px rgba(0,0,0,.05)}
.course-icon{width:60px;height:60px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.course-badge{background:rgba(255,255,255,.9);color:#6b21a8;padding:4px 8px;border-radius:4px;font-size:12px;font-weight:600}
.course-info{flex:1}
.course-id{font-size:12px;color:#6b7280;margin-bottom:4px}
.course-name{font-size:16px;font-weight:600;color:#111827;margin-bottom:4px}
.course-members{font-size:12px;color:#6b7280}
.course-actions{display:flex;align-items:center;gap:12px}
.restore-btn{background:#2563eb;color:#fff;border:none;padding:8px 16px;border-radius:6px;font-size:14px;cursor:pointer;transition:background .2s}
.restore-btn:hover{background:#1d4ed8}
.no-courses{text-align:center;color:#9ca3af;padding:40px;font-size:14px}
</style>
