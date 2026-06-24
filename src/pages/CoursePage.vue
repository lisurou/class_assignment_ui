<script setup>
//路由实例
import {useRouter} from "vue-router";
import {ref, watch, onMounted, onUnmounted} from 'vue';
import {useUserStore} from '@/stores/userStore';
import { ElMessage } from 'element-plus';
import { ArrowRight } from '@element-plus/icons-vue';
import axios from 'axios';
import CourseAssignments from '@/components/CourseAssignments.vue';
import CourseMaterials from '@/components/CourseMaterials.vue';

const router = useRouter()
const isSearchFocused = ref(false);
let isFold=ref(true);
const userStore = useUserStore();
const joinDialogVisible=ref(false);
const createDialogVisible=ref(false);
const taughtCourses = computed(() => userStore.taught || []);
const learnedCourses = computed(() => userStore.learned || []);
const topCourses = computed(() => userStore.top || []);
const course=computed(() => userStore.course || []);
const showCourseDetails=ref(false);
const showTeacherAssignment=ref(false);
const displayReleaseAssignment=ref(false);
let iTeach=ref(userStore.account?.identity === '老师');
let iLearn=ref(userStore.account?.identity !== '老师');
const showLearnAssignment=ref(false);
const currentCourseId = ref('');

let courseCode=ref('');
let courseName=ref('');
let teachClass=ref('');
let newTime=ref('');
let studentNumber=ref('');


let errorMessage=ref('');
let successMessage=ref('');

const pendingTopCourseIds = ref([]);
const normalizeCourseId = (courseId) => String(courseId ?? '');
const showArchiveMenu = ref(null);
const archiveMenuPosition = ref({ x: 0, y: 0 });
const showArchiveManager = ref(false);
const archivedCourseType = ref('learned');
const archivedLearnedCourses = ref([]);
const archivedTaughtCourses = ref([]);
const learnedSemesterGroups = ref([]);
const taughtSemesterGroups = ref([]);

const isCourseTop = (courseId) => {
  const normalizedCourseId = normalizeCourseId(courseId);
  return topCourses.value.some(course => normalizeCourseId(course?.id) === normalizedCourseId);
};

const isTopActionLoading = (courseId) => {
  const normalizedCourseId = normalizeCourseId(courseId);
  return pendingTopCourseIds.value.includes(normalizedCourseId);
};

const startTopAction = (courseId) => {
  const normalizedCourseId = normalizeCourseId(courseId);
  if (isTopActionLoading(normalizedCourseId)) {
    return false;
  }
  pendingTopCourseIds.value = [...pendingTopCourseIds.value, normalizedCourseId];
  return true;
};

const finishTopAction = (courseId) => {
  const normalizedCourseId = normalizeCourseId(courseId);
  pendingTopCourseIds.value = pendingTopCourseIds.value.filter(id => id !== normalizedCourseId);
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
  if (!startTopAction(course?.id)) return;
  // 将要置顶的课程传回后端，后端将其插入，并返回所有要置顶的课程
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
  } finally {
    finishTopAction(course?.id);
  }

}
// 取消置顶
const handleCancelTop = async (course) => {
  if (!startTopAction(course?.id)) return;
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
  } finally {
    finishTopAction(course?.id);
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
function goToCourse(){
  // 清除所有子页面状态，返回到主列表
  showCourseDetails.value = false;
  showTeacherAssignment.value = false;
  showLearnAssignment.value = false;
  displayReleaseAssignment.value = false;
  currentCourseId.value = '';
}
function goToCourseContent(){
  showCourseDetails.value = true;
  showTeacherAssignment.value = false;
  showLearnAssignment.value = false;
  displayReleaseAssignment.value = false;
  fetchLatestAssignments();
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
const fetchLatestAssignments = async () => {
  if (!currentCourseId.value) return;
  try {
    const response = await axios.post('http://localhost:8080/assignment-details', {
      id: currentCourseId.value,
      accountId: userStore.account?.accountId,
    });
    if (response.data.success) {
      userStore.setAssignmentDetails(response.data.assignments);
      if (response.data.course) {
        userStore.setCourse(response.data.course);
      }
    }
  } catch (error) {
    console.error("返回时刷新作业失败：", error);
  }
};

const handleDetail = async(id) => {
  currentCourseId.value = id;
  showTeacherAssignment.value = false;
  showLearnAssignment.value = false;
  displayReleaseAssignment.value = false;
  try{
    userStore.setAssignmentDetails([]);
    const response = await axios.post('http://localhost:8080/assignment-details',{
      id,
      accountId: userStore.account?.accountId,
    });
    const data = response.data;
    if(data.success){
      successMessage.value = data.message;
      userStore.setAssignmentDetails(data.assignments);
      userStore.setCourse(data.course);
      showCourseDetails.value = true;
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
};
</script>

<template>
  <div class="header">
    <div class="head-left">
      <img src="@/assets/logo_blue.png">
      <!-- 根据页面状态动态显示面包屑 -->
      <template v-if="showTeacherAssignment || showLearnAssignment">
        <span class="breadcrumb" @click="goToCourse">我的课堂</span>
        <span class="breadcrumb-separator"><el-icon><ArrowRight /></el-icon></span>
        <span class="breadcrumb" @click="goToCourseContent">课程内容</span>
        <span class="breadcrumb-separator"><el-icon><ArrowRight /></el-icon></span>
        <span class="breadcrumb-current">作业详情</span>
      </template>
      <template v-else-if="displayReleaseAssignment">
        <span class="breadcrumb" @click="goToCourse">我的课堂</span>
        <span class="breadcrumb-separator"><el-icon><ArrowRight /></el-icon></span>
        <span class="breadcrumb" @click="goToCourseContent">课程内容</span>
        <span class="breadcrumb-separator"><el-icon><ArrowRight /></el-icon></span>
        <span class="breadcrumb-current">添加作业</span>
      </template>
      <template v-else-if="showCourseDetails">
        <span class="breadcrumb" @click="goToCourse">我的课堂</span>
        <span class="breadcrumb-separator"><el-icon><ArrowRight /></el-icon></span>
        <span class="breadcrumb-current">课程内容</span>
      </template>
      <template v-else>
        <span class="breadcrumb-current">我的课堂</span>
      </template>
    </div>
    <div class="head-right">
      <span>Ai工具集</span>
      <span>论文查重</span>
      <span>任务管理</span>
      <span>提醒</span>
      <div class="dropdown">
        <button class="dropdown=button">
          <img alt="用户头像" src="@/assets/课堂派头像.jpg"/>
        </button>
        <div class="dropdown-content">
          <button @click="goToCourse">我的课堂</button>
          <button>开通VIP</button>
          <button>机构用户认证</button>
          <button @click="goToPersonalSetting">个人设置</button>
          <button @click="goToLogin">退出登录</button>
        </div>
      </div>
    </div>
  </div>

  <div id="course-assignments-overlay-target"></div>

  <div class="body-container"  v-if="!showCourseDetails&&!showTeacherAssignment&&!showLearnAssignment&&!displayReleaseAssignment">
    <div class="top-course-container">
      <div class="top-course-container-header">
        <h2>置顶课程</h2>
        <div class="course-dropdown">
          <button class="create-join-course">
            {{ userStore.account?.identity === '老师' ? '＋创建/加入课程' : '＋加入课程' }}
          </button>
          <div class="course-dropdown-content">
            <el-button v-if="userStore.account?.identity === '老师'" @click="createDialogVisible=true">创建课程</el-button>
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
                  @click.stop="isCourseTop(course.id) ? handleCancelTop(course) : handleTop(course)"
                  class="top-placement"
                  :disabled="isTopActionLoading(course.id)">
                {{ isCourseTop(course.id) ? '取消置顶' : '置顶' }}
              </button>
            </div>
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
                    @click.stop="isCourseTop(course.id) ? handleCancelTop(course) : handleTop(course)"
                    class="top-placement"
                    :disabled="isTopActionLoading(course.id)"
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
                    @click.stop="isCourseTop(course.id) ? handleCancelTop(course) : handleTop(course)"
                    class="top-placement"
                    :disabled="isTopActionLoading(course.id)"
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
    <div v-show="!showTeacherAssignment && !showLearnAssignment && !displayReleaseAssignment">
    <div class="course-details-header">
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
    <div class="course-details-blank" v-if="learningAnalysis||gradeManagement||courseIntroduction||knowledgeGraph">
      <img src="@/assets/课堂派课程详情空白页.png" alt="课堂派课程详情空白页">
      <span>这里是一片荒地</span>
    </div>
    <div>
      <div class="course-learning-container" v-if="courseLearning">
        <div class="course-learning-header" >
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
        <div class="course-details-blank" v-if="content||interactiveCourseware||test||tencentConference||givePublicNotice||topic||interactiveAnswer">
          <img src="@/assets/课堂派课程详情空白页.png" alt="课堂派课程详情空白页">
          <span>这里是一片荒地</span>
        </div>
        <CourseMaterials v-if="data" :course-id="course.id" :i-teach="iTeach" />
        <CourseAssignments
          v-if="homework"
          v-model:showTeacherAssignment="showTeacherAssignment"
          v-model:showLearnAssignment="showLearnAssignment"
          v-model:displayReleaseAssignment="displayReleaseAssignment"
          :course-id="course.id"
          :course="course"
          :i-teach="iTeach"
          :i-learn="iLearn"
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
  <div class="release-assignment" v-if="displayReleaseAssignment">
    <button @click="fromReleaseBack" >◀返回</button>
    <input v-model="releaseTitle" placeholder="标题">
    <input v-model="releaseDeadline" placeholder="提交截至时间">
    <input v-model="releaseType" placeholder="作业类型">
    <input v-model="releaseDetail" placeholder="作业详情">
    <input v-model="releaseScore" placeholder="总分">
    <label class="ai-switch"><input type="checkbox" v-model="releaseAiEnabled"> 开启AI评价</label>
    <button class="confirm-release-assignment" @click="confirmReleaseAssignment">确认发布作业</button>
  </div>
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
  display:inline-flex;
  align-items:center;
}
.course-dropdown-content{
  display:none;
  position:absolute;
  top:calc(100% + 8px);
  right:0;
  background-color:white;
  min-width:120px;
  padding:6px 0;
  border-radius:8px;
  border:1px solid rgb(226, 230, 237);
  box-shadow:0 8px 16px 0 rgba(0,0,0,0.12);
  z-index:20;
}
.course-dropdown-content button{
  color:black;
  padding:0 16px;
  display:block;
  width:100%;
  height:36px;
  text-align:left;
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
  padding:0 16px;
  font-size:14px;
  line-height:36px;
  color:white;
  background-color:rgb(66, 133, 244);
  cursor:pointer;
  border-radius:4px;
  white-space:nowrap;
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
  flex-direction: column;
  color:white;
}
.course-details-header-content{
  display:flex;
  justify-content: center;
  align-items: center;
  margin-top:10px;
  border-bottom-left-radius:8px;
  border-bottom-right-radius:8px;
}
.course-details-header-content button{
  font-size: 18px;
  color: #3c4043;
  cursor: pointer;
  margin-left: 10px;
  margin-right: 10px;
}
.course-details-header-content button.active{
  background: #e8f0ff;
  color: #4285f4;
  border-radius: 10px;
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

.personal-setting img {
  width: 114px;
  padding: 16px;
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
