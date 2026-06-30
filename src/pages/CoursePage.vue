<script setup>
//路由实例
import {useRouter} from "vue-router";
import { computed, nextTick, onBeforeUnmount, onMounted, onUnmounted, ref, watch } from 'vue';
import {useUserStore} from '@/stores/userStore';
import { ElDialog, ElButton, ElMessage } from 'element-plus';
import axios from 'axios';
import mammoth from 'mammoth/mammoth.browser';
import CourseMaterials from '@/components/CourseMaterials.vue';
import CourseAssignments from '@/components/CourseAssignments.vue';
import TopicPage from '@/components/TopicPage.vue';
import defaultCourseBanner from '@/assets/课堂派课程详情图片.png';
import courseCodeQrIcon from '@/assets/course-code-qrcode.svg';

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
const createJoinDropdownOpen = ref(false);
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
const releaseAttachmentFile = ref(null);
const releaseAttachmentRemoved = ref(false);
const notificationPanelVisible = ref(false);
const notificationPanelRef = ref(null);
const notifications = ref([]);
const notificationsLoading = ref(false);
const courseMembers = ref([]);
const courseMembersLoading = ref(false);
const members = ref(false);
const teacherReviewDialogVisible = ref(false);
const teacherReviewLoading = ref(false);
const teacherReviewTarget = ref(null);
const teacherReviewScore = ref('');
const teacherReviewComment = ref('');
const teacherReviewPreviewType = ref('none');
const teacherReviewPreviewText = ref('');
const teacherReviewPreviewHtml = ref('');
const teacherReviewPreviewUrl = ref('');
const teacherReviewUnsupportedMessage = ref('');
const courseSkinInputRef = ref(null);
const courseLearningHeaderRef = ref(null);
const courseLearningTabRefs = ref({});
const courseLearningIndicatorStyle = ref({
  width: '0px',
  transform: 'translateX(0px)',
  opacity: '0'
});

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
const draggedArchivedCourseId = ref('');
const archiveSortSaving = ref(false);
const activeArchivedCourseMenuId = ref('');
const COURSE_SKIN_STORAGE_KEY = 'course_detail_skin_map';

const loadCourseSkinMap = () => {
  try {
    return JSON.parse(localStorage.getItem(COURSE_SKIN_STORAGE_KEY) || '{}');
  } catch (error) {
    console.log('读取课程皮肤失败：', error);
    return {};
  }
};

const courseSkinMap = ref(loadCourseSkinMap());
const courseSearchKeyword = ref('');

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

const handleGlobalClick = () => {
  closeArchiveMenu();
  activeArchivedCourseMenuId.value = '';
  createJoinDropdownOpen.value = false;
};
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
  activeArchivedCourseMenuId.value = '';
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
      updateArchivedCourseState(type, courses);
    }
  } catch (error) {
    console.log("加载归档课程失败：", error);
    ElMessage.error("加载归档课程失败");
  }
};

const updateArchivedCourseState = (type, courses) => {
  const groups = groupBySemester(courses);
  if (type === 'taught') {
    archivedTaughtCourses.value = courses;
    taughtSemesterGroups.value = groups;
  } else {
    archivedLearnedCourses.value = courses;
    learnedSemesterGroups.value = groups;
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

const getCurrentArchivedCourses = () => (
  archivedCourseType.value === 'taught' ? archivedTaughtCourses.value : archivedLearnedCourses.value
);

const reorderArchivedCourses = (courses, draggedId, targetId) => {
  const fromIndex = courses.findIndex(course => course?.id === draggedId);
  const toIndex = courses.findIndex(course => course?.id === targetId);
  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
    return courses;
  }
  const nextCourses = [...courses];
  const [movedCourse] = nextCourses.splice(fromIndex, 1);
  nextCourses.splice(toIndex, 0, movedCourse);
  return nextCourses;
};

const persistArchivedCourseOrder = async (type, courses) => {
  archiveSortSaving.value = true;
  try {
    const response = await axios.post(`${API_BASE}/reorder-archived-courses`, {
      accountId: userStore.account?.accountId,
      courseType: type,
      orderedCourseIds: courses.map(course => course?.id).filter(Boolean)
    });
    const data = response.data;
    if (!data.success) {
      ElMessage.error(data.message || '归档课程排序保存失败');
      await loadArchivedCourses(type);
      return;
    }
    const latestCourses = (type === 'taught' ? data.taught : data.learned) || courses;
    updateArchivedCourseState(type, latestCourses);
    ElMessage.success(data.message || '归档课程排序已更新');
  } catch (error) {
    console.log('归档课程排序保存失败：', error);
    ElMessage.error('归档课程排序保存失败，请稍后重试');
    await loadArchivedCourses(type);
  } finally {
    archiveSortSaving.value = false;
  }
};

const handleArchivedCourseDragStart = (courseId) => {
  activeArchivedCourseMenuId.value = '';
  draggedArchivedCourseId.value = courseId;
};

const handleArchivedCourseDragOver = (event) => {
  event.preventDefault();
};

const handleArchivedCourseDrop = async (targetCourseId) => {
  const draggedCourseId = draggedArchivedCourseId.value;
  draggedArchivedCourseId.value = '';
  if (!draggedCourseId || !targetCourseId || draggedCourseId === targetCourseId || archiveSortSaving.value) {
    return;
  }
  const currentCourses = getCurrentArchivedCourses();
  const nextCourses = reorderArchivedCourses(currentCourses, draggedCourseId, targetCourseId);
  if (nextCourses === currentCourses) {
    return;
  }
  updateArchivedCourseState(archivedCourseType.value, nextCourses);
  await persistArchivedCourseOrder(archivedCourseType.value, nextCourses);
};

const handleArchivedCourseDragEnd = () => {
  draggedArchivedCourseId.value = '';
};

const toggleArchivedCourseMenu = (event, courseId) => {
  event.preventDefault();
  event.stopPropagation();
  activeArchivedCourseMenuId.value = activeArchivedCourseMenuId.value === courseId ? '' : courseId;
};

const closeArchivedCourseMenu = () => {
  activeArchivedCourseMenuId.value = '';
};

const handleArchivedCourseAction = async (action, course) => {
  closeArchivedCourseMenu();
  if (!course?.id) {
    ElMessage.error('未找到课程信息');
    return;
  }
  if (action === 'restore') {
    await unarchiveCourse(course.id);
    return;
  }
  const actionText = action === 'finish' ? '结课' : '删除';
  const confirmText = archivedCourseType.value === 'taught'
    ? `确认${actionText}课程“${course.name || course.id}”吗？操作后首页将不再显示。`
    : `确认删除课程“${course.name || course.id}”吗？操作后归档和首页都不再显示。`;
  if (!window.confirm(confirmText)) {
    return;
  }
  try {
    const response = await axios.post(`${API_BASE}/archived-course-action`, {
      accountId: userStore.account?.accountId,
      courseId: course.id,
      courseType: archivedCourseType.value,
      action
    });
    const data = response.data;
    if (!data.success) {
      ElMessage.error(data.message || `${actionText}失败`);
      return;
    }
    const latestCourses = (archivedCourseType.value === 'taught' ? data.taught : data.learned) || [];
    updateArchivedCourseState(archivedCourseType.value, latestCourses);
    await refreshCourseList();
    ElMessage.success(data.message || `${actionText}成功`);
  } catch (error) {
    console.log(`${actionText}课程失败：`, error);
    ElMessage.error(`${actionText}失败，请稍后重试`);
  }
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
  if (!notificationPanelRef.value?.contains(event.target)) {
    notificationPanelVisible.value = false;
  }
}
function handleUserMenuAction(action) {
  closeUserMenu();
  action?.();
}
onMounted(() => {
  document.addEventListener('click', handleDocumentClick);
  loadNotifications();
  window.addEventListener('resize', updateCourseLearningIndicator);
});
onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick);
  cleanupTeacherReviewPreview();
  window.removeEventListener('resize', updateCourseLearningIndicator);
});

watch(teacherReviewDialogVisible, (value) => {
  if (!value) {
    cleanupTeacherReviewPreview();
  }
});
function goToCourse(){
  // 清除所有子页面状态，返回到主列表
  showCourseDetails.value = false;
  showTeacherAssignment.value = false;
  showLearnAssignment.value = false;
  displayReleaseAssignment.value = false;
  currentCourseId.value = '';
  members.value = false;
}
function backToCourseContent(){
  showTeacherAssignment.value = false;
  showLearnAssignment.value = false;
  displayReleaseAssignment.value = false;
  members.value = false;
}
function handleITeachClick(){
  iTeach.value=true;
  iLearn.value=false;
}
function handleILearnClick(){
  iLearn.value=true;
  iTeach.value=false;
}
const syncMainCourseTabByIdentity = (currentIdentity) => {
  if (currentIdentity === '老师') {
    iTeach.value = true;
    iLearn.value = false;
    return;
  }
  iTeach.value = false;
  iLearn.value = true;
};
watch(identity, (currentIdentity) => {
  syncMainCourseTabByIdentity(currentIdentity);
}, { immediate: true });
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
 members.value=false;
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
  members.value=false;
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
  members.value=false;
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
  members.value=false;
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
  members.value=false;
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
  members.value=false;
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
  members.value=false;
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
  members.value=false;
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
  members.value=false;
}
async function handleClickMembers(){
  content.value=false;
  interactiveCourseware.value=false;
  homework.value=false;
  test.value=false;
  data.value=false;
  tencentConference.value=false;
  givePublicNotice.value=false;
  topic.value=false;
  interactiveAnswer.value=false;
  members.value=true;
  await loadCourseMembers();
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
const activeCourseLearningTabKey = computed(() => {
  if (interactiveCourseware.value) return 'interactiveCourseware';
  if (homework.value) return 'homework';
  if (test.value) return 'test';
  if (data.value) return 'data';
  if (tencentConference.value) return 'tencentConference';
  if (givePublicNotice.value) return 'givePublicNotice';
  if (topic.value) return 'topic';
  if (interactiveAnswer.value) return 'interactiveAnswer';
  if (members.value) return 'members';
  return 'content';
});
const currentCourseTopLabel = computed(() => {
  if (learningAnalysis.value) return '学情分析';
  if (gradeManagement.value) return '成绩管理';
  if (courseIntroduction.value) return '课程介绍';
  if (knowledgeGraph.value) return '知识图谱';
  return '课程内容';
});
const searchPlaceholder = computed(() => (
  userStore.account?.identity === '老师' && iTeach.value ? '搜索我教的课程' : '搜索我学的课程'
));
const normalizedCourseSearchKeyword = computed(() => courseSearchKeyword.value.trim().toLowerCase());
const matchCourseSearch = (courseItem, keyword) => {
  if (!keyword) {
    return true;
  }
  const haystack = [
    courseItem?.name,
    courseItem?.classes,
    courseItem?.id,
    courseItem?.teacher,
    courseItem?.time
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(keyword);
};
const filteredTaughtCourses = computed(() => taughtCourses.value.filter(courseItem => (
  courseItem && matchCourseSearch(courseItem, normalizedCourseSearchKeyword.value)
)));
const filteredLearnedCourses = computed(() => learnedCourses.value.filter(courseItem => (
  courseItem && matchCourseSearch(courseItem, normalizedCourseSearchKeyword.value)
)));
const setCourseLearningTabRef = (key) => (element) => {
  if (element) {
    courseLearningTabRefs.value[key] = element;
    return;
  }
  delete courseLearningTabRefs.value[key];
};
const updateCourseLearningIndicator = async () => {
  await nextTick();
  const container = courseLearningHeaderRef.value;
  const activeKey = activeCourseLearningTabKey.value;
  const activeButton = courseLearningTabRefs.value[activeKey];
  if (!container || !activeButton || assignmentOverlayActive.value || !courseLearning.value) {
    courseLearningIndicatorStyle.value = {
      width: '0px',
      transform: 'translateX(0px)',
      opacity: '0'
    };
    return;
  }
  const containerRect = container.getBoundingClientRect();
  const activeRect = activeButton.getBoundingClientRect();
  courseLearningIndicatorStyle.value = {
    width: `${Math.round(activeRect.width)}px`,
    transform: `translateX(${Math.round(activeRect.left - containerRect.left)}px)`,
    opacity: '1'
  };
};
watch([activeCourseLearningTabKey, assignmentOverlayActive, courseLearning, showCourseDetails], () => {
  updateCourseLearningIndicator();
}, { immediate: true });

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

const normalizeServerAttachmentFile = (assignmentDetail) => {
  if (!assignmentDetail?.attachmentName) return null;
  const size = Number(assignmentDetail?.attachmentSize || 0);
  const sizeText = size
    ? (size < 1024 * 1024
      ? `${Math.max(size / 1024, 0.1).toFixed(1)} KB`
      : `${(size / (1024 * 1024)).toFixed(1)} MB`)
    : '';
  return {
    name: assignmentDetail.attachmentName,
    size,
    sizeText,
    rawFile: null,
    fileDownloadUrl: assignmentDetail?.attachmentDownloadUrl || ''
  };
};

const getFileExtension = (fileName = '') => {
  const safeName = String(fileName || '').trim().toLowerCase();
  const dotIndex = safeName.lastIndexOf('.');
  return dotIndex >= 0 ? safeName.substring(dotIndex + 1) : '';
};

const isArchiveExtension = (extension) => ['zip', 'rar', '7z', 'tar', 'gz'].includes(extension);
const isImageExtension = (extension) => ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'].includes(extension);
const isTextExtension = (extension) => ['txt', 'md', 'json', 'js', 'ts', 'java', 'py', 'xml', 'html', 'css', 'scss', 'sql', 'csv', 'log', 'yml', 'yaml'].includes(extension);
const isPdfExtension = (extension) => extension === 'pdf';
const isDocxExtension = (extension) => extension === 'docx';
const isDocExtension = (extension) => extension === 'doc';

const unreadNotificationCount = computed(() => notifications.value.filter(item => !item?.readStatus).length);
const teacherMemberCount = computed(() => courseMembers.value.length);

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

const cleanupTeacherReviewPreview = () => {
  if (teacherReviewPreviewUrl.value) {
    URL.revokeObjectURL(teacherReviewPreviewUrl.value);
  }
  teacherReviewPreviewUrl.value = '';
  teacherReviewPreviewType.value = 'none';
  teacherReviewPreviewText.value = '';
  teacherReviewPreviewHtml.value = '';
  teacherReviewUnsupportedMessage.value = '';
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
  releaseAttachmentFile.value = normalizeServerAttachmentFile(assignmentDetail);
  releaseAttachmentRemoved.value = false;
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

const handleReleaseAttachmentChange = (event) => {
  const file = event?.target?.files?.[0];
  if (!file) return;
  releaseAttachmentFile.value = normalizeUploadedFile(file);
  releaseAttachmentRemoved.value = false;
  if (event?.target) {
    event.target.value = '';
  }
};

const removeReleaseAttachment = () => {
  if (!releaseAttachmentFile.value) return;
  releaseAttachmentRemoved.value = Boolean(releaseEditMode.value && !releaseAttachmentFile.value?.rawFile);
  releaseAttachmentFile.value = null;
};

const fetchAssignmentFileResponse = async (assignmentDetail) => {
  return axios.get(`${API_BASE}/assignment-file`, {
    params: {
      accountId: assignmentDetail?.accountId || userStore.account?.accountId,
      id: assignmentDetail?.id || currentCourseId.value,
      assignmentId: assignmentDetail?.assignmentId
    },
    responseType: 'blob'
  });
};

const downloadAssignmentFile = async (assignmentDetail, fallbackName) => {
  if (!assignmentDetail?.assignmentId) {
    ElMessage.warning('未找到作业附件信息');
    return;
  }
  try {
    const response = await fetchAssignmentFileResponse(assignmentDetail);
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

const downloadAssignmentResource = async (assignmentDetail) => {
  if (!assignmentDetail?.assignmentId) {
    ElMessage.warning('未找到作业附件信息');
    return;
  }
  try {
    const response = await axios.get(`${API_BASE}/assignment-resource`, {
      params: {
        id: assignmentDetail?.id || currentCourseId.value,
        assignmentId: assignmentDetail.assignmentId
      },
      responseType: 'blob'
    });
    const blob = new Blob([response.data]);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = extractAssignmentFileNameFromHeaders(response.headers, assignmentDetail?.attachmentName || 'assignment-resource');
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.log('下载作业资源失败：', error);
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

const toggleNotificationPanel = async () => {
  notificationPanelVisible.value = !notificationPanelVisible.value;
  if (notificationPanelVisible.value) {
    await loadNotifications();
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

const loadCourseMembers = async (courseId = currentCourseId.value) => {
  if (!courseId || userStore.account?.identity !== '老师') {
    courseMembers.value = [];
    return;
  }
  courseMembersLoading.value = true;
  try {
    const response = await axios.get(`${API_BASE}/course-members`, {
      params: {
        courseId
      }
    });
    const data = response.data;
    if (data.success) {
      courseMembers.value = (data.accounts || []).filter(Boolean);
      return;
    }
    ElMessage.error(data.message || '成员加载失败');
  } catch (error) {
    console.log('课程成员加载失败：', error);
    ElMessage.error('课程成员加载失败，请稍后重试');
  } finally {
    courseMembersLoading.value = false;
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

const handleNotificationClick = async (notification) => {
  if (!notification) return;
  await markNotificationAsRead(notification, true);
  notificationPanelVisible.value = false;
  if (!notification.courseId) {
    return;
  }
  await handleDetail(notification.courseId);
  if (userStore.account?.identity === '老师') {
    handleClickHomework();
    if (notification.assignmentId) {
      const targetAssignment = assignmentDetails.value.find(item => item?.assignmentId === notification.assignmentId);
      if (targetAssignment) {
        await openTeacherAssignmentDetail(targetAssignment);
      }
    }
    return;
  }
  handleClickHomework();
  if (notification.assignmentId) {
    const targetAssignment = assignmentDetails.value.find(item => item?.assignmentId === notification.assignmentId);
    if (targetAssignment) {
      handleViewLearnAssignmentDetail(targetAssignment);
    }
  }
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
     if (userStore.account?.identity === '老师') {
       await loadCourseMembers(id);
     }
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

    const publishTime = releaseEditMode.value
      ? releasePublishTime.value
      : (releaseImmediate.value ? releasePublishTime.value : '');
    const formData = new FormData();
    formData.append('title', releaseTitle.value);
    formData.append('publishTime', publishTime);
    formData.append('deadline', releaseDeadline.value || '');
    formData.append('assignmentType', releaseType.value || '个人作业');
    formData.append('content', releaseDetail.value || '');
    formData.append('totalScore', String(totalScore));
    formData.append('aiEnabled', String(Boolean(releaseAiEnabled.value)));
    if (releaseAttachmentFile.value?.rawFile) {
      formData.append('file', releaseAttachmentFile.value.rawFile);
    }

    if (releaseEditMode.value && editingAssignmentId.value) {
      formData.append('id', currentCourseId.value);
      formData.append('assignmentId', editingAssignmentId.value);
      formData.append('removeAttachment', String(Boolean(releaseAttachmentRemoved.value)));
      const response = await axios.post(`${API_BASE}/update-course-assignment-form`, formData);
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
      cleanupTeacherReviewPreview();
      ElMessage.success(data.message || '作业更新成功');
      return;
    }
    formData.append('accountId', userStore.account?.accountId || '');
    formData.append('id', currentCourseId.value);
    const response = await axios.post(`${API_BASE}/release-assignment-form`, formData);

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
  releaseAttachmentRemoved.value = false;
}

const handleRemindStudent = async (assignmentDetail) => {
  if (!assignmentDetail?.accountId) {
    ElMessage.warning('未找到需要催交的学生');
    return;
  }
  try {
    const response = await axios.post(`${API_BASE}/remind-assignment`, {
      id: assignmentDetail?.id || currentCourseId.value,
      assignmentId: assignmentDetail.assignmentId,
      targetAccountId: assignmentDetail.accountId,
      teacherAccountId: userStore.account?.accountId
    });
    const data = response.data;
    if (!data.success) {
      ElMessage.error(data.message || '催交失败');
      return;
    }
    ElMessage.success(data.message || '催交成功');
  } catch (error) {
    console.log('催交失败：', error);
    ElMessage.error('催交失败，请稍后重试');
  }
};

const saveTeacherReview = async () => {
  if (!teacherReviewTarget.value?.assignmentId) {
    ElMessage.warning('未找到待批改作业');
    return;
  }
  const nextScore = String(teacherReviewScore.value).trim();
  if (!nextScore) {
    ElMessage.warning('请输入分数');
    return;
  }
  const numericScore = Number(nextScore);
  if (Number.isNaN(numericScore)) {
    ElMessage.warning('请输入有效分数');
    return;
  }
  try {
    const response = await axios.post(`${API_BASE}/correct-assignment`, {
      accountId: teacherReviewTarget.value.accountId,
      id: teacherReviewTarget.value.id,
      assignmentId: teacherReviewTarget.value.assignmentId,
      score: numericScore,
      teacherComment: teacherReviewComment.value.trim()
    });
    const data = response.data;
    if (!data.success) {
      ElMessage.error(data.message || '保存批阅失败');
      return;
    }
    if (Array.isArray(data.assignments)) {
      teacherSubmissionDetails.value = data.assignments.filter(Boolean);
      syncScoreDrafts(teacherSubmissionDetails.value);
    }
    await fetchLatestAssignments();
    syncCurrentAssignmentFromList();
    teacherReviewDialogVisible.value = false;
    ElMessage.success(data.message || '批阅已保存');
  } catch (error) {
    console.log('保存批阅失败：', error);
    ElMessage.error('保存批阅失败，请稍后重试');
  }
};

const handleOpenTeacherReview = async (assignmentDetail) => {
  if (!assignmentDetail?.assignmentId) {
    ElMessage.warning('未找到提交记录');
    return;
  }
  const extension = getFileExtension(assignmentDetail?.fileName);
  if (assignmentDetail?.fileName && isArchiveExtension(extension)) {
    await downloadTeacherSubmissionFile(assignmentDetail);
    ElMessage.info('压缩包附件已开始下载，请离线查看');
    return;
  }

  teacherReviewDialogVisible.value = true;
  teacherReviewLoading.value = true;
  teacherReviewTarget.value = { ...assignmentDetail };
  teacherReviewScore.value = assignmentDetail?.score ?? '';
  teacherReviewComment.value = assignmentDetail?.teacherComment || '';
  cleanupTeacherReviewPreview();

  try {
    if (!assignmentDetail?.fileName) {
      teacherReviewPreviewType.value = 'text-only';
      teacherReviewPreviewText.value = assignmentDetail?.submitContent || '该学生未上传附件，可直接填写评语与分数。';
      return;
    }
    const response = await fetchAssignmentFileResponse(assignmentDetail);
    const blob = new Blob([response.data], {
      type: response.data?.type || assignmentDetail?.fileContentType || 'application/octet-stream'
    });
    if (isPdfExtension(extension)) {
      teacherReviewPreviewType.value = 'pdf';
      teacherReviewPreviewUrl.value = URL.createObjectURL(blob);
      return;
    }
    if (isImageExtension(extension)) {
      teacherReviewPreviewType.value = 'image';
      teacherReviewPreviewUrl.value = URL.createObjectURL(blob);
      return;
    }
    if (isTextExtension(extension)) {
      teacherReviewPreviewType.value = 'text';
      teacherReviewPreviewText.value = await blob.text();
      return;
    }
    if (isDocxExtension(extension)) {
      const arrayBuffer = await blob.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      teacherReviewPreviewType.value = 'docx';
      teacherReviewPreviewHtml.value = result.value || '<p>文档内容为空</p>';
      return;
    }
    if (isDocExtension(extension)) {
      teacherReviewPreviewType.value = 'unsupported';
      teacherReviewUnsupportedMessage.value = '当前支持在线预览 docx、pdf、图片和文本文件，旧版 doc 请下载后查看。';
      return;
    }
    teacherReviewPreviewType.value = 'unsupported';
    teacherReviewUnsupportedMessage.value = '当前文件类型暂不支持在线预览，请下载后查看。';
  } catch (error) {
    console.log('加载批阅预览失败：', error);
    teacherReviewPreviewType.value = 'unsupported';
    teacherReviewUnsupportedMessage.value = '附件预览失败，请下载后查看原文件。';
  } finally {
    teacherReviewLoading.value = false;
  }
};

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
const currentCourseMemberCount = computed(() => {
  if (courseMembers.value?.length) {
    return courseMembers.value.length;
  }
  const count = Number(course.value?.number);
  return Number.isFinite(count) ? count : 0;
});
const currentCourseBanner = computed(() => {
  return courseSkinMap.value[currentCourseKey.value] || defaultCourseBanner;
});
const getCourseBannerById = (courseId) => {
  if (!courseId) {
    return defaultCourseBanner;
  }
  return courseSkinMap.value[courseId] || defaultCourseBanner;
};
const currentCourseBannerStyle = computed(() => ({
  backgroundImage: `linear-gradient(rgba(78, 120, 157, 0.32), rgba(78, 120, 157, 0.32)), url("${currentCourseBanner.value}")`
}));
const getCourseCardHeaderStyle = (courseItem) => ({
  backgroundImage: `linear-gradient(rgba(78, 120, 157, 0.18), rgba(78, 120, 157, 0.18)), url("${getCourseBannerById(courseItem?.id)}")`
});

const persistCourseSkinMap = () => {
  localStorage.setItem(COURSE_SKIN_STORAGE_KEY, JSON.stringify(courseSkinMap.value));
};

const triggerCourseSkinPicker = () => {
  courseSkinInputRef.value?.click();
};

const handleCourseSkinChange = (event) => {
  const file = event?.target?.files?.[0];
  if (!file) {
    return;
  }
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件');
    event.target.value = '';
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    ElMessage.error('图片大小请控制在 2MB 以内');
    event.target.value = '';
    return;
  }
  const courseId = currentCourseKey.value;
  if (!courseId) {
    ElMessage.error('未找到当前课程');
    event.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    courseSkinMap.value = {
      ...courseSkinMap.value,
      [courseId]: reader.result
    };
    persistCourseSkinMap();
    ElMessage.success('课程皮肤已更新');
  };
  reader.onerror = () => {
    ElMessage.error('读取图片失败，请重试');
  };
  reader.readAsDataURL(file);
  event.target.value = '';
};

const resetCourseSkin = () => {
  const courseId = currentCourseKey.value;
  if (!courseId || !courseSkinMap.value[courseId]) {
    return;
  }
  const nextMap = { ...courseSkinMap.value };
  delete nextMap[courseId];
  courseSkinMap.value = nextMap;
  persistCourseSkinMap();
  ElMessage.success('已恢复默认皮肤');
};
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
  <header v-if="!showCourseDetails" class="prep-topbar course-topbar">
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
      <div ref="notificationPanelRef" class="prep-topbar__notification">
        <button type="button" class="prep-topbar__bell" @click.stop="toggleNotificationPanel">
          🔔
          <span v-if="unreadNotificationCount" class="prep-topbar__bell-badge">
            {{ unreadNotificationCount > 99 ? '99+' : unreadNotificationCount }}
          </span>
        </button>
        <div v-if="notificationPanelVisible" class="notification-panel" @click.stop>
          <div class="notification-panel__header">
            <span>通知</span>
            <button type="button" class="notification-panel__action" @click="markAllNotificationsAsRead">全部已读</button>
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
  <header v-else class="course-detail-topbar">
    <div class="course-detail-topbar__left">
      <button type="button" class="course-detail-topbar__menu" @click="goToCourse">☰</button>
      <button type="button" class="top-nav-current" @click="goToCourse">我的课堂</button>
      <span class="course-breadcrumb-separator">〉</span>
      <span class="course-breadcrumb-current">{{ currentCourseTopLabel }}</span>
    </div>
    <div class="course-detail-topbar__right">
      <div ref="notificationPanelRef" class="prep-topbar__notification">
        <button type="button" class="prep-topbar__bell" @click.stop="toggleNotificationPanel">
          🔔
          <span v-if="unreadNotificationCount" class="prep-topbar__bell-badge">
            {{ unreadNotificationCount > 99 ? '99+' : unreadNotificationCount }}
          </span>
        </button>
        <div v-if="notificationPanelVisible" class="notification-panel" @click.stop>
          <div class="notification-panel__header">
            <span>通知</span>
            <button type="button" class="notification-panel__action" @click="markAllNotificationsAsRead">全部已读</button>
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
        <div class="course-dropdown" @click.stop>
          <button class="create-join-course" @click="createJoinDropdownOpen = !createJoinDropdownOpen">＋创建/加入课程</button>
          <div v-show="createJoinDropdownOpen" class="course-dropdown-content">
            <el-button @click="createDialogVisible=true; createJoinDropdownOpen = false">创建课程</el-button>
            <el-button @click="joinDialogVisible=true; createJoinDropdownOpen = false">加入课程</el-button>
          </div>
        </div>
      </div>
      <div class="top-course-container-body">
          <div class="course-container"  v-for="course in topCourses.filter(c => c)" :key="course&&course.id" @click="handleDetail(course.id)">
            <div class="course-information-header" :style="getCourseCardHeaderStyle(course)">
              <label class="course-time">{{course&&course.time}}</label>
              <label class="course-name">{{course&&course.name}}</label>
              <label class="course-classes">{{course&&course.classes}}</label>
              <label class="course-code">
                <img class="course-code-icon" :src="courseCodeQrIcon" alt="" aria-hidden="true">
                <span class="course-code-text">加课码:{{ course && course.id }}</span>
              </label>
            </div>
            <div class="course-information-footer">
              <div class="learn-div">
                <div><span>负责人:{{course&&course.teacher}}</span></div>
                <!-- 动态按钮：已置顶则显示“取消置顶”，否则显示“置顶” -->
                <button
                    @click.stop="isCourseTop(course.id) ? handleCancelTop(course) : handleTop(course, 'teacher')"
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
        <input
          v-model.trim="courseSearchKeyword"
          @focus="isSearchFocused = true"
          @blur="isSearchFocused = false"
          :placeholder="searchPlaceholder"
        >
        <button type="button" class="search-icon-btn" aria-label="搜索">
          <span class="search-icon"></span>
        </button>
      </div>
    </div>
    <div class="teach-display-div" v-if="iTeach&&userStore.account?.identity==='老师'" >
      <div class="bottom-course-container">
        <div class="bottom-course-container-header">
          <button @click="isFold=false" v-if="isFold">收起</button>
          <button @click="isFold=true" v-if="!isFold" >展开</button>
        </div>
        <div class="bottom-course-container-body" v-if="isFold">
          <div class="course-container" v-for="course in filteredTaughtCourses" :key="course && course.id" @click="handleDetail(course.id)" >
            <div class="course-information-header" :style="getCourseCardHeaderStyle(course)">
              <label class="course-time">{{course&&course.time}}</label>
              <label class="course-name">{{course&&course.name}}</label>
              <label class="course-classes">{{course&&course.classes}}</label>
              <label class="course-code">
                <img class="course-code-icon" :src="courseCodeQrIcon" alt="" aria-hidden="true">
                <span class="course-code-text">加课码:{{ course && course.id }}</span>
              </label>
            </div>
            <div class="course-information-footer">
              <div class="teach-div">
                <div ><span>成员{{course.number}}人</span></div>
                <!-- 动态按钮：已置顶则显示“取消置顶”，否则显示“置顶” -->
                <button
                    @click.stop="isCourseTop(course.id) ? handleCancelTop(course) : handleTop(course, 'teacher')"
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
      <div v-else-if="!filteredTaughtCourses.length" class="empty-state">
        <p>未找到相关课程</p>
      </div>
    </div>
    <div class="learn-display-div" v-if="iLearn">
      <div class="bottom-course-container">
        <div class="bottom-course-container-header">
          <button @click="isFold=false" v-if="isFold">收起</button>
          <button @click="isFold=true" v-if="!isFold" >展开</button>
        </div>
        <div class="bottom-course-container-body" v-if="isFold">
          <div class="course-container"  v-for="course in filteredLearnedCourses" :key="course.id" @click="handleDetail(course.id)" >
            <div class="course-information-header" :style="getCourseCardHeaderStyle(course)">
              <label class="course-time">{{course.time}}</label>
              <label class="course-name">{{course.name}}</label>
              <label class="course-classes">{{course.classes}}</label>
              <label class="course-code">
                <img class="course-code-icon" :src="courseCodeQrIcon" alt="" aria-hidden="true">
                <span class="course-code-text">加课码:{{ course.id }}</span>
              </label>
            </div>
            <div class="course-information-footer">
              <div class="learn-div">
                <div><span>负责人:{{course.teacher}}</span></div>
                <!-- 动态按钮：已置顶则显示“取消置顶”，否则显示“置顶” -->
                <button
                    @click.stop="isCourseTop(course.id) ? handleCancelTop(course) : handleTop(course, 'teacher')"
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
      <div v-else-if="!filteredLearnedCourses.length" class="empty-state">
        <p>未找到相关课程</p>
      </div>
    </div>

  </div>
  <div class="course-details" v-if="showCourseDetails">
    <div class="course-details-header" v-if="!assignmentOverlayActive">
      <div class="course-details-hero" :style="currentCourseBannerStyle">
        <div class="course-details-hero__content">
          <div class="course-details-hero__summary">
            <div class="course-details-hero__title">{{ course.name || '未命名课程' }}</div>
            <div class="course-details-hero__class">{{ course.classes || '未设置班级' }}</div>
            <div class="course-details-hero__meta">
              <span>加课码 {{ course.id || '--' }}</span>
              <span>已加入{{ currentCourseMemberCount }}人</span>
            </div>
          </div>
          <div v-if="userStore.account?.identity === '老师'" class="course-details-hero__actions">
            <input
              ref="courseSkinInputRef"
              type="file"
              accept="image/*"
              class="student-hidden-file-input"
              @change="handleCourseSkinChange"
            >
            <button class="course-skin-btn" @click="triggerCourseSkinPicker">更换皮肤</button>
            <button
              v-if="courseSkinMap[currentCourseKey]"
              class="course-skin-btn is-secondary"
              @click="resetCourseSkin"
            >
              恢复默认
            </button>
          </div>
        </div>
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
        <div ref="courseLearningHeaderRef" class="course-learning-header" v-if="!assignmentOverlayActive">
          <button :ref="setCourseLearningTabRef('content')" @click="handleClickContent" :class="{'active':content}">目录</button>
          <button :ref="setCourseLearningTabRef('interactiveCourseware')" @click="handleClickInteractiveCourseware" :class="{'active':interactiveCourseware}">互动课件</button>
          <button :ref="setCourseLearningTabRef('homework')" @click="handleClickHomework" :class="{'active':homework}">作业</button>
          <button :ref="setCourseLearningTabRef('test')" @click="handleClickTest" :class="{'active':test}">测试</button>
          <button :ref="setCourseLearningTabRef('data')" @click="handleClickData" :class="{'active':data}">资料</button>
          <button :ref="setCourseLearningTabRef('tencentConference')" @click="handleClickTencentConference" :class="{'active':tencentConference}">腾讯会议</button>
          <button :ref="setCourseLearningTabRef('givePublicNotice')" @click="handleClickGivePublicNotice" :class="{'active':givePublicNotice}">公告</button>
          <button :ref="setCourseLearningTabRef('topic')" @click="handleClickTopic" :class="{'active':topic}">话题</button>
          <button :ref="setCourseLearningTabRef('interactiveAnswer')" @click="handleClickInteractiveAnswer" :class="{'active':interactiveAnswer}">互动答题</button>
          <button v-if="userStore.account?.identity==='老师'" :ref="setCourseLearningTabRef('members')" @click="handleClickMembers" :class="{'active':members}">成员</button>
          <span class="course-learning-header__indicator" :style="courseLearningIndicatorStyle"></span>
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
        <div class="course-learning-body" v-if="members && iTeach">
          <div class="course-members-panel">
            <div class="course-members-panel__header">
              <div>
                <div class="course-members-panel__title">课程成员</div>
                <div class="course-members-panel__subtitle">共 {{ teacherMemberCount }} 名学生</div>
              </div>
              <button type="button" class="course-members-panel__refresh" @click="loadCourseMembers()">刷新</button>
            </div>
            <div class="course-members-table">
              <div class="course-members-table__head">
                <span>姓名</span>
                <span>学号</span>
                <span>账号</span>
                <span>学校</span>
                <span>班级</span>
              </div>
              <div v-if="courseMembersLoading" class="course-members-table__empty">成员加载中...</div>
              <div v-else-if="!courseMembers.length" class="course-members-table__empty">当前课程还没有学生加入</div>
              <div v-else>
                <div v-for="member in courseMembers" :key="member.accountId" class="course-members-table__row">
                  <span>{{ member.name || '-' }}</span>
                  <span>{{ member.studentId || '-' }}</span>
                  <span>{{ member.accountId || '-' }}</span>
                  <span>{{ member.school || '-' }}</span>
                  <span>{{ member.classes || '-' }}</span>
                </div>
              </div>
            </div>
          </div>
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
            :release-attachment-file="releaseAttachmentFile"
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
            :download-assignment-resource="downloadAssignmentResource"
            :handle-release-attachment-change="handleReleaseAttachmentChange"
            :remove-release-attachment="removeReleaseAttachment"
            :handle-open-teacher-review="handleOpenTeacherReview"
            :handle-remind-student="handleRemindStudent"
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
        <div class="archive-sort-tip">
          <span>可直接拖动课程卡片调整顺序</span>
          <span v-if="archiveSortSaving">保存中...</span>
        </div>
        <div v-for="group in (archivedCourseType === 'taught' ? taughtSemesterGroups : learnedSemesterGroups)" :key="group.name" class="semester-courses-section">
          <div class="semester-header">{{ group.name }}</div>
          <div class="course-cards">
            <div
              v-for="course in group.courses"
              :key="course.id"
              class="archived-course-card"
              :class="{ 'is-dragging': draggedArchivedCourseId === course.id }"
              draggable="true"
              @dragstart="handleArchivedCourseDragStart(course.id)"
              @dragover="handleArchivedCourseDragOver"
              @drop="handleArchivedCourseDrop(course.id)"
              @dragend="handleArchivedCourseDragEnd"
            >
              <div class="course-icon" :style="{ backgroundColor: archivedCourseType === 'taught' ? '#2563eb' : '#8b5cf6' }">
                <span class="course-badge">{{ archivedCourseType === 'taught' ? '教' : '学' }}</span>
              </div>
              <div class="course-info">
                <div class="course-id">{{ course.id }}</div>
                <div class="course-name">{{ course.name }}</div>
                <div class="course-members">成员{{ course.number }}人</div>
              </div>
              <div class="course-actions" @click.stop>
                <button class="archive-course-more" @click="toggleArchivedCourseMenu($event, course.id)">⋮</button>
                <div v-if="activeArchivedCourseMenuId === course.id" class="archive-course-menu">
                  <button v-if="archivedCourseType === 'taught'" class="archive-course-menu__item" @click="handleArchivedCourseAction('finish', course)">结课</button>
                  <button class="archive-course-menu__item" @click="handleArchivedCourseAction('delete', course)">删除</button>
                  <button class="archive-course-menu__item" @click="handleArchivedCourseAction('restore', course)">恢复</button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="(archivedCourseType === 'taught' ? taughtSemesterGroups : learnedSemesterGroups).length === 0" class="no-courses">暂无归档课程</div>
      </div>
    </div>
  </div>
</el-dialog>
<el-dialog
  v-model="teacherReviewDialogVisible"
  title="在线批阅"
  width="1180px"
  destroy-on-close
  append-to-body
>
  <div class="teacher-review-dialog">
    <div class="teacher-review-dialog__preview">
      <div class="teacher-review-dialog__meta">
        <div>
          <div class="teacher-review-dialog__title">{{ teacherReviewTarget?.studentName || teacherReviewTarget?.accountId || '学生作业' }}</div>
          <div class="teacher-review-dialog__subtitle">
            <span>{{ teacherReviewTarget?.fileName || '仅提交文本内容' }}</span>
            <span v-if="teacherReviewTarget?.submittedAt">提交时间：{{ teacherReviewTarget.submittedAt }}</span>
          </div>
        </div>
        <button
          v-if="teacherReviewTarget?.fileName"
          type="button"
          class="teacher-review-dialog__download"
          @click="downloadTeacherSubmissionFile(teacherReviewTarget)"
        >
          下载原文件
        </button>
      </div>
      <div v-if="teacherReviewLoading" class="teacher-review-preview teacher-review-preview--empty">预览加载中...</div>
      <div v-else class="teacher-review-preview">
        <iframe v-if="teacherReviewPreviewType === 'pdf'" :src="teacherReviewPreviewUrl" class="teacher-review-preview__frame"></iframe>
        <div v-else-if="teacherReviewPreviewType === 'image'" class="teacher-review-preview__image-wrap">
          <img :src="teacherReviewPreviewUrl" alt="作业预览" class="teacher-review-preview__image">
        </div>
        <pre v-else-if="teacherReviewPreviewType === 'text'" class="teacher-review-preview__text">{{ teacherReviewPreviewText }}</pre>
        <div v-else-if="teacherReviewPreviewType === 'docx'" class="teacher-review-preview__docx" v-html="teacherReviewPreviewHtml"></div>
        <pre v-else-if="teacherReviewPreviewType === 'text-only'" class="teacher-review-preview__text">{{ teacherReviewPreviewText }}</pre>
        <div v-else class="teacher-review-preview teacher-review-preview--empty">
          {{ teacherReviewUnsupportedMessage || '当前暂无可预览内容，请下载原文件后查看。' }}
        </div>
      </div>
    </div>
    <div class="teacher-review-dialog__side">
      <div class="teacher-review-dialog__score">
        <label>评分</label>
        <div class="teacher-review-dialog__score-input">
          <input v-model="teacherReviewScore" type="number" min="0" :max="currentAssignmentDetail?.totalScore || 100">
          <span>/ {{ currentAssignmentDetail?.totalScore || 100 }}</span>
        </div>
      </div>
      <div class="teacher-review-dialog__comment">
        <label>教师评语</label>
        <textarea v-model="teacherReviewComment" placeholder="请输入批改意见、批注说明等内容"></textarea>
      </div>
      <div v-if="teacherReviewTarget?.submitContent" class="teacher-review-dialog__comment">
        <label>学生留言</label>
        <div class="teacher-review-dialog__student-message">{{ teacherReviewTarget.submitContent }}</div>
      </div>
      <div class="teacher-review-dialog__actions">
        <button type="button" class="teacher-review-dialog__cancel" @click="teacherReviewDialogVisible = false">关闭</button>
        <button type="button" class="teacher-review-dialog__save" @click="saveTeacherReview">保存批阅</button>
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
.course-detail-topbar{
  width:100%;
  height:60px;
  padding:0 22px 0 18px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  background:#fff;
  box-shadow:0 1px 0 0 #dfdfdf;
  position:fixed;
  top:0;
  left:0;
  z-index:999;
}
.course-detail-topbar__left,
.course-detail-topbar__right{
  display:flex;
  align-items:center;
}
.course-detail-topbar__left{
  gap:14px;
}
.course-detail-topbar__right{
  gap:10px;
}
.course-detail-topbar__menu{
  width:36px;
  height:36px;
  display:flex;
  align-items:center;
  justify-content:center;
  color:#303133;
  font-size:24px;
}
.course-detail-topbar .top-nav-current,
.course-detail-topbar .course-breadcrumb-current,
.course-detail-topbar .course-breadcrumb-separator{
  line-height:60px;
}
.course-detail-topbar .top-nav-current{
  color:#303133;
  font-size:16px;
  font-weight:500;
  padding:0;
}
.course-detail-topbar .course-breadcrumb-current{
  font-size:16px;
  color:#303133;
}
.course-detail-topbar .course-breadcrumb-separator{
  margin:0 2px;
  font-size:14px;
  color:#c0c4cc;
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
  position:relative;
  display: flex;
  height:45px;
  align-items: center;
  gap:25px;
  padding-bottom:2px;
}
.course-learning-header button{
  position:relative;
  margin-right:0;
  padding-left:0;
  padding-right:0;
  padding-bottom:10px;
  padding-top:10px;
  font-size:14px;
  color:#303133;
  transition:color .25s ease;
}
.course-learning-header button.active{
  font-size:14px;
  color: #4285f4;
}
.course-learning-header__indicator{
  position:absolute;
  left:0;
  bottom:0;
  height:2px;
  background:#4285f4;
  border-radius:999px;
  transition:transform .28s ease, width .28s ease, opacity .2s ease;
  pointer-events:none;
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
  min-height:250px;
  border-radius:8px;
  box-shadow: 0 2px 4px 0 rgba(0, 0, 0, .1);
  overflow:hidden;
}
.course-details-hero{
  min-height:186px;
  padding:28px 24px 18px;
  display:flex;
  align-items:stretch;
  background-size:cover;
  background-position:center;
  border-top-left-radius:8px;
  border-top-right-radius:8px;
}
.course-details-hero__content{
  width:100%;
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:24px;
}
.course-details-hero__summary{
  display:flex;
  flex-direction:column;
  justify-content:space-between;
  min-height:140px;
  color:#fff;
}
.course-details-hero__title{
  font-size:22px;
  line-height:1.35;
  font-weight:600;
  text-shadow:0 1px 2px rgba(0,0,0,.16);
}
.course-details-hero__class{
  margin-top:6px;
  font-size:14px;
  color:rgba(255,255,255,.92);
}
.course-details-hero__meta{
  margin-top:auto;
  display:flex;
  align-items:center;
  gap:20px;
  flex-wrap:wrap;
  font-size:14px;
  color:rgba(255,255,255,.95);
}
.course-details-hero__actions{
  display:flex;
  align-items:center;
  gap:10px;
}
.course-skin-btn{
  height:34px;
  padding:0 16px;
  border-radius:17px;
  color:#3a4a5f;
  background:rgba(255,255,255,.92);
  font-size:13px;
  transition:all .2s ease;
}
.course-skin-btn:hover{
  background:#fff;
}
.course-skin-btn.is-secondary{
  background:rgba(255,255,255,.18);
  color:#fff;
  border:1px solid rgba(255,255,255,.38);
}
.course-skin-btn.is-secondary:hover{
  background:rgba(255,255,255,.26);
}
.course-details-header-content{
  display:flex;
  min-height:64px;
  padding:0 18px;
  gap:8px;
  align-items:center;
  background:#fff;
  border-bottom-left-radius:8px;
  border-bottom-right-radius:8px;
}
.student-hidden-file-input{
  display:none;
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
  position:absolute;
  top:calc(100% + 4px);
  left:0;
  background-color:white;
  width:100%;
  box-shadow:0 8px 16px 0 rgba(0,0,0,0.2);
  z-index:20;
}
.course-dropdown-content button{
  color:black;
  padding:0 17px;
  display:block;
  width:100%;
  height:36px;
  cursor: pointer;
}
.course-dropdown-content :deep(.el-button){
  margin:0;
  border:none;
  border-radius:0;
  justify-content:flex-start;
  text-align:left;
  padding-left:17px;
  padding-right:17px;
}
.course-dropdown-content button:hover{
  background-color:rgb(236, 243, 254);
  color:rgb(66, 133, 244);
}
.teach-div,.learn-div{
 font-size:12px;
 display:flex;
 width:100%;
 justify-content: space-between;
 align-items:center;
 line-height:1;
}
.teach-div{
}
.learn-div{
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
  align-items:center;
  color:rgb(60, 64, 67);
  font-size:12px;
}
.course-information-footer .learn-div > div,
.course-information-footer .teach-div > div{
  display:flex;
  align-items:center;
  line-height:1;
}
.course-information-footer .learn-div span,
.course-information-footer .teach-div span{
  font-size:12px;
  line-height:1;
}
.top-placement{
  display:inline-flex;
  align-items:center;
  height:20px;
  line-height:1;
}
.cancel-top-placement{
  border:none;
  font-size:12px;
}
.course-information-header{
  display:flex;
  align-items: flex-start;
  flex-direction: column;
  justify-content:space-between;
  gap:8px;
  overflow:hidden;
}
.course-information-header{
  height:152px;
  padding:15px 20px;
  background-color:rgb(160, 62, 59);
  background-size:cover;
  background-position:center;
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
}
.course-information-header .course-time{
  width:100%;
  color:rgba(255,255,255,.72);
  font-size:12px;
  line-height:1.3;
  white-space:normal;
  word-break:break-word;
}
.course-information-header .course-name{
  width:100%;
  color:#fff;
  font-size:18px;
  line-height:1.35;
  font-weight:600;
  white-space:normal;
  word-break:break-word;
}
.course-information-header .course-classes{
  width:100%;
  color:rgba(255,255,255,.9);
  font-size:12px;
  line-height:1.35;
  white-space:normal;
  word-break:break-word;
}
.course-information-header .course-code{
  width:100%;
  margin-top:auto;
  color:#fff;
  font-size:14px;
  line-height:1.35;
  display:flex;
  align-items:center;
  gap:8px;
  white-space:normal;
  word-break:break-word;
  overflow:hidden;
}
.course-information-header .course-code-icon{
  width:16px;
  height:16px;
  flex-shrink:0;
  display:block;
  object-fit:contain;
  opacity:.98;
}
.course-information-header .course-code-text{
  flex:1;
  min-width:0;
  color:#fff;
  white-space:normal;
  word-break:break-all;
}
.course-container{
  margin-top: 20px; /* 仅保留顶部间距 */
  box-sizing: border-box; /* 确保边框不增加宽度 */
  width:224px;
  height:230px;
  border-radius:8px;
  border:1px solid rgb(226, 230, 237);
}

.bottom-course-container-body{
  display:flex;
  flex-direction:row;
  flex-wrap: wrap; /* 核心：超出一行自动换行 */
  gap: 20px; /* 用gap统一控制课程间距（替代margin-right） */
  padding: 10px;
  box-sizing: border-box;
}
.top-course-container-body{
  display:grid;
  grid-template-columns:repeat(4, 224px);
  gap: 20px;
  padding: 10px 10px 14px;
  box-sizing: border-box;
  max-height: 360px;
  overflow-x:hidden;
  overflow-y:auto;
  align-content:flex-start;
  justify-content:space-between;
  scrollbar-width: thin;
  scrollbar-color: #c7ccd4 transparent;
}
.top-course-container-body .course-container{
  margin-top:0;
}
.top-course-container-body::-webkit-scrollbar{
  width:10px;
}
.top-course-container-body::-webkit-scrollbar-track{
  background:transparent;
}
.top-course-container-body::-webkit-scrollbar-thumb{
  background:#c7ccd4;
  border-radius:999px;
}
.top-course-container-body::-webkit-scrollbar-thumb:hover{
  background:#adb5c0;
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
  flex:1;
  min-width:0;
  border:none;
  background:transparent;
  color:#8b95a7;
  font-size:14px;
  font-weight:500;
  outline:none;
}
.search input::placeholder{
  color:#c4cad4;
}
.nav .search-focused {
  border: 2px solid #4a90ff;
  box-shadow: 0 0 0 2px rgba(74, 144, 255, 0.12);
}
.search-icon-btn{
  width:26px;
  height:26px;
  flex-shrink:0;
  display:flex;
  align-items:center;
  justify-content:center;
  color:#b9c0cc;
}
.search-icon{
  position:relative;
  width:12px;
  height:12px;
  border:2px solid currentColor;
  border-radius:50%;
  box-sizing:border-box;
}
.search-icon::after{
  content:'';
  position:absolute;
  right:-5px;
  bottom:-3px;
  width:7px;
  height:2px;
  background:currentColor;
  border-radius:999px;
  transform:rotate(45deg);
  transform-origin:center;
}
.nav{
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.search{
  width:238px;
  height:38px;
  display:flex;
  justify-content: space-between;
  padding:0 10px 0 15px;
  border:2px solid #c9cfd8;
  align-items:center;
  border-radius:19px;
  background:#fff;
  box-sizing:border-box;
}
.teach-learn{
  display:flex;
  align-items: center;
  gap:28px;
}
.teach-learn button{
  position:relative;
  border-bottom:none;
  background-color: transparent;
  color:#303133;
  font-size:16px;
  padding:10px 0 12px;
  padding-top:10px;
  transition:color .2s ease;
}
.teach-learn button.active{
  color:rgb(66, 133, 244);
}
.teach-learn button.active::after{
  content:'';
  position:absolute;
  left:0;
  right:0;
  bottom:0;
  height:2px;
  background:rgb(66, 133, 244);
  border-radius:999px;
}
.top-course-container-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

}
.create-join-course{
  border:none;
  height: 36px;
  padding:0 20px;
  font-size:14px;
  color:white;
  background-color:rgb(66, 133, 244);
  cursor:pointer;
  border-radius:4px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  white-space:nowrap;
  box-sizing:border-box;
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
.archive-sort-tip{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;color:#6b7280;font-size:12px}
.semester-courses-section{margin-bottom:24px}
.semester-header{font-size:16px;font-weight:600;color:#111827;margin-bottom:12px}
.course-cards{display:flex;flex-direction:column;gap:12px}
.archived-course-card{display:flex;align-items:center;gap:16px;padding:16px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;transition:box-shadow .2s}
.archived-course-card:hover{box-shadow:0 4px 12px rgba(0,0,0,.05)}
.archived-course-card.is-dragging{opacity:.55;border-color:#60a5fa;background:#f8fbff}
.course-icon{width:60px;height:60px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.course-badge{background:rgba(255,255,255,.9);color:#6b21a8;padding:4px 8px;border-radius:4px;font-size:12px;font-weight:600}
.course-info{flex:1}
.course-id{font-size:12px;color:#6b7280;margin-bottom:4px}
.course-name{font-size:16px;font-weight:600;color:#111827;margin-bottom:4px}
.course-members{font-size:12px;color:#6b7280}
.course-actions{position:relative;display:flex;align-items:flex-start;justify-content:flex-end;gap:12px}
.archive-course-more{width:30px;height:30px;border:none;border-radius:50%;background:transparent;color:#6b7280;font-size:22px;line-height:1}
.archive-course-more:hover{background:#f3f4f6;color:#374151}
.archive-course-menu{position:absolute;top:34px;right:0;min-width:108px;padding:6px 0;border:1px solid #e5e7eb;border-radius:8px;background:#fff;box-shadow:0 10px 24px rgba(15,23,42,.12);z-index:20}
.archive-course-menu__item{display:block;width:100%;height:34px;padding:0 14px;text-align:left;color:#374151;font-size:13px;background:#fff}
.archive-course-menu__item:hover{background:#f9fafb;color:#111827}
.no-courses{text-align:center;color:#9ca3af;padding:40px;font-size:14px}
.prep-topbar__notification{position:relative;display:flex;align-items:center}
.prep-topbar__bell{position:relative}
.prep-topbar__bell-badge{position:absolute;top:-6px;right:-10px;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:#f56c6c;color:#fff;font-size:11px;line-height:18px;text-align:center}
.notification-panel{position:absolute;top:42px;right:-18px;width:360px;max-height:460px;padding:12px 0;background:#fff;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 12px 30px rgba(15,23,42,.15);z-index:1200;overflow:hidden}
.notification-panel__header{display:flex;align-items:center;justify-content:space-between;padding:0 16px 10px;border-bottom:1px solid #edf2f7;font-size:15px;color:#1f2937;font-weight:600}
.notification-panel__action{font-size:12px;color:#409eff}
.notification-panel__list{max-height:396px;overflow:auto}
.notification-panel__item{width:100%;padding:12px 16px;text-align:left;border-bottom:1px solid #f3f4f6;background:#fff}
.notification-panel__item:last-child{border-bottom:none}
.notification-panel__item.unread{background:#f7fbff}
.notification-panel__item-top{display:flex;justify-content:space-between;gap:12px;margin-bottom:6px}
.notification-panel__title{font-size:14px;color:#1f2937;font-weight:600}
.notification-panel__time{font-size:11px;color:#9ca3af;white-space:nowrap}
.notification-panel__content{font-size:12px;line-height:1.7;color:#4b5563}
.notification-panel__empty{padding:28px 16px;text-align:center;color:#9ca3af;font-size:13px}
.course-members-panel{background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:18px 20px}
.course-members-panel__header{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
.course-members-panel__title{font-size:20px;color:#111827;font-weight:600}
.course-members-panel__subtitle{margin-top:6px;font-size:12px;color:#6b7280}
.course-members-panel__refresh{height:32px;padding:0 14px;border:1px solid #d1d5db;border-radius:6px;background:#fff;color:#374151}
.course-members-table{border:1px solid #ebeef5;border-radius:10px;overflow:hidden}
.course-members-table__head,.course-members-table__row{display:grid;grid-template-columns:1fr 1fr 1fr 1fr 1fr;gap:12px;align-items:center;padding:14px 16px}
.course-members-table__head{background:#f9fafb;color:#6b7280;font-size:12px}
.course-members-table__row{border-top:1px solid #f3f4f6;color:#1f2937;font-size:13px}
.course-members-table__empty{padding:36px 16px;text-align:center;color:#9ca3af;font-size:13px}
.teacher-review-dialog{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:18px;min-height:620px}
.teacher-review-dialog__preview,.teacher-review-dialog__side{border:1px solid #ebeef5;border-radius:10px;background:#fff}
.teacher-review-dialog__preview{display:flex;flex-direction:column;overflow:hidden}
.teacher-review-dialog__meta{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;border-bottom:1px solid #f3f4f6}
.teacher-review-dialog__title{font-size:18px;color:#111827;font-weight:600}
.teacher-review-dialog__subtitle{display:flex;flex-direction:column;gap:4px;margin-top:6px;font-size:12px;color:#6b7280}
.teacher-review-dialog__download{height:32px;padding:0 14px;border:1px solid #dbeafe;border-radius:6px;background:#eff6ff;color:#2563eb;flex-shrink:0}
.teacher-review-preview{flex:1;min-height:540px;background:#f8fafc}
.teacher-review-preview--empty{display:flex;align-items:center;justify-content:center;padding:24px;color:#9ca3af;font-size:14px}
.teacher-review-preview__frame{width:100%;height:540px;border:none;background:#fff}
.teacher-review-preview__image-wrap{display:flex;align-items:flex-start;justify-content:center;height:540px;padding:20px;overflow:auto}
.teacher-review-preview__image{max-width:100%;height:auto;box-shadow:0 4px 12px rgba(15,23,42,.08)}
.teacher-review-preview__text{height:540px;margin:0;padding:20px;overflow:auto;white-space:pre-wrap;word-break:break-word;font-size:13px;line-height:1.8;color:#1f2937;background:#fff}
.teacher-review-preview__docx{height:540px;padding:24px;overflow:auto;background:#fff;color:#1f2937;line-height:1.8}
.teacher-review-dialog__side{display:flex;flex-direction:column;gap:18px;padding:18px}
.teacher-review-dialog__score label,.teacher-review-dialog__comment label{display:block;margin-bottom:10px;font-size:14px;color:#374151;font-weight:600}
.teacher-review-dialog__score-input{display:flex;align-items:center;gap:8px}
.teacher-review-dialog__score-input input{width:120px;height:38px;padding:0 12px;border:1px solid #d1d5db;border-radius:8px;outline:none}
.teacher-review-dialog__comment textarea{width:100%;min-height:180px;padding:12px 14px;border:1px solid #d1d5db;border-radius:10px;resize:vertical;box-sizing:border-box;outline:none}
.teacher-review-dialog__student-message{padding:12px 14px;border:1px solid #e5e7eb;border-radius:10px;background:#f9fafb;font-size:13px;line-height:1.7;color:#374151;white-space:pre-wrap}
.teacher-review-dialog__actions{display:flex;justify-content:flex-end;gap:12px;margin-top:auto}
.teacher-review-dialog__cancel,.teacher-review-dialog__save{height:34px;padding:0 18px;border-radius:6px}
.teacher-review-dialog__cancel{border:1px solid #d1d5db;background:#fff;color:#4b5563}
.teacher-review-dialog__save{background:#409eff;color:#fff}
</style>
