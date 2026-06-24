<script setup>
//路由实例
import {useRouter} from "vue-router";
import {ref, watch} from 'vue';
import {useUserStore} from '@/stores/userStore';
import {  ElDialog,ElButton, ElMessage, ElIcon } from 'element-plus';
import { ArrowRight } from '@element-plus/icons-vue';
import {computed} from 'vue';
import axios from 'axios';
import CourseMaterials from '@/components/CourseMaterials.vue';
import CourseAssignments from '@/components/CourseAssignments.vue';
import TopicPage from '@/components/TopicPage.vue';

const router = useRouter()
const isSearchFocused = ref(false);
let isFold=ref(true);
const userStore = useUserStore();
const identity=computed(()=>userStore.account?.identity||"学生");
const joinDialogVisible=ref(false);
const createDialogVisible=ref(false);
const taughtCourses = computed(() => userStore.taught || []);
const learnedCourses = computed(() => userStore.learned || []);
const topCourses = computed(() => userStore.top || []);
const assignmentDetails = computed(() => userStore.assignmentDetails || []);
const course=computed(() => userStore.course || []);
const showCourseDetails=ref(false);
const showAssignmentSubmit=ref(false);
const showTeacherAssignment=ref(false);
const currentAssignmentDetail = ref(null);
const score=ref('');
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
let LearnAssignmentDetail = ref({});
//点击提交作业，展示提交作业的页面
function handleAssignmentSubmit(assignmentDetail){
  showLearnAssignment.value = true;
  LearnAssignmentDetail.value = assignmentDetail;
}
//点击查看已提交作业，展示批改作业页面
const handleCheckAssignmentSubmit=async(assignmentDetail)=>{
 //点击查看，就到数据库中进行查询操作，课程码，作业码，已提交，共同确认，不用携带参数，用pinia，账号，返回我教的的作业
  try{
    const response=await axios.post('http://localhost:8080/check-assignment-submit',{
      accountId:userStore.account?.accountId,
      id:course.value.id,
      assignmentId:assignmentDetail.assignmentId
    });
    const data=response.data;
    if(data.success){
      successMessage.value=data.message;
      userStore.setAssignmentDetails(data.assignments);
      // 保存当前查看的作业详情
      currentAssignmentDetail.value = assignmentDetail;
      console.log("已提交的作业有："+data.assignments);
      ElMessage.success(successMessage.value);
      //所有assignment的title和content相同，
      showTeacherAssignment.value=true;
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
}

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
//批改作业
const handleConfirmCorrect=async(assignmentDetail)=>{
  try{
    //将分数储存到对应账号\对应课程\对应作业\的\分数\里，批改好，将已经提交的作业从后端返回再渲染一次
    const response=await axios.post('http://localhost:8080/correct-assignment',{
      accountId:assignmentDetail.accountId,
      id:assignmentDetail.id,
      assignmentId:assignmentDetail.assignmentId,
      score:score.value,
    });
    const data=response.data;
    if(data.success){
      successMessage.value=data.message;
      // 先关闭显示
      showTeacherAssignment.value = false;
      userStore.setAssignmentDetails(data.assignments);
      // 重置分数输入
      score.value = '';
      // 重新打开显示（触发重新渲染）
      setTimeout(() => {
        showTeacherAssignment.value = true;
      }, 0);
      // 保存当前查看的作业详情
      currentAssignmentDetail.value = assignmentDetail;
      console.log("已提交的作业有："+data.assignments);
      ElMessage.success(successMessage.value);
      showTeacherAssignment.value=true;
    }else {
      errorMessage.value = data.message;
      ElMessage.error(errorMessage.value);
      console.log(errorMessage.value);
    }
  }catch(error){
    console.log("批改作业失败：",error);
    errorMessage.value="服务器错误，请稍后重试";
    ElMessage.error(errorMessage.value);
  }
}

const submitContent = ref('');
//提交作业
const handleConfirmSubmit=async()=>{
  // 验证提交内容不为空
  if (!submitContent.value) {
    errorMessage.value = "提交内容不能为空";
    ElMessage.error(errorMessage.value);
    return;
  }
  //点击确认提交，将课程码，账号，作业码,提交内容返回给后端储存起来
  try{
    const response=await axios.post("http://localhost:8080/assignment-submit",{
      id: LearnAssignmentDetail.value.id,
      accountId: userStore.account?.accountId,
      assignmentId: LearnAssignmentDetail.value.assignmentId,
      submitContent: submitContent.value
    });
    const data=response.data;
    if (data.success) {
      successMessage.value = data.message;
      userStore.setAssignmentSubmit(data.assignment || {});  // 确保设置一个对象
      ElMessage.success(successMessage.value);
      showLearnAssignment.value = false;
      submitContent.value='';
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
  // 返回时重新请求当前课程的最新作业数据
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
    }
  } catch (error) {
    console.error("返回时刷新作业失败：", error);
  }
};
function fromLearnBack(){
  showLearnAssignment.value=false;
 LearnAssignmentDetail.value={};
}

const releaseTitle=ref('');
const releaseDeadline=ref('');
const releaseType=ref('');
const releaseDetail=ref('');
const releaseScore=ref('');
const releaseAiEnabled=ref(false);
// 修改 CoursePage.vue 中 confirmReleaseAssignment 方法
const confirmReleaseAssignment = async () => {
  try {
    // 1. 增加参数校验
    if (!releaseTitle.value || !releaseDeadline.value || !releaseType.value || !releaseDetail.value || !releaseScore.value) {
      errorMessage.value = "请填写完整作业信息";
      ElMessage.error(errorMessage.value);
      return;
    }

    // 2. 确保总分是数字类型
    const totalScore = parseInt(releaseScore.value, 10);
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

    const assignment = {
      title: releaseTitle.value,
      deadline: releaseDeadline.value,
      assignmentType: releaseType.value,
      content: releaseDetail.value,
      totalScore: totalScore,  // 使用转换后的数字类型
      aiEnabled: releaseAiEnabled.value
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
      // 重置表单
      releaseTitle.value = '';
      releaseDeadline.value = '';
      releaseType.value = '';
      releaseDetail.value = '';
      releaseScore.value = '';
      releaseAiEnabled.value = false;
      displayReleaseAssignment.value = false;
    } else {
      //发布成功后立即刷新作业列表
      await fetchLatestAssignments();
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
const displayReleaseAssignment=ref(false);
function fromReleaseBack(){
 displayReleaseAssignment.value=false;
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
  <div class="header">
    <div class="head-left">
      <img src="@/assets/logo_blue.png">
      <!-- 根据页面状态动态显示面包屑 -->
      <template v-if="showCourseDetails">
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
            </div>
          </div>
      </div>
    </div>
    <div class="nav">
      <div class="teach-learn">
        <button class="teach-button" @click="handleITeachClick" v-if="userStore.account?.identity==='老师'" :class="{'active':iTeach}"  >我教的</button>
        <button class="learn-button" @click="handleILearnClick" :class="{'active':iLearn}">我学的</button>
      </div>
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
        <div class="course-details-blank" v-if="content||interactiveCourseware||test||tencentConference||givePublicNotice||interactiveAnswer">
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
            :course-id="course.id || currentCourseId"
            :is-teacher-view="iTeach"
            :is-student-view="iLearn"
          />
        </div>
      </div>
    </div>
  </div>
  <div class="teach-assignment" v-if="iTeach&&showTeacherAssignment">
    <button @click="fromTeachBack">◀返回</button>
    <div class="assignment-details">
      <div class="title">作业题目：{{ currentAssignmentDetail.title }}</div>
      <div class="assignment-description">作业详情：{{ currentAssignmentDetail.content }}</div>
      <div>----------------------</div>
    </div>

    <div class="assignment-submit-account" v-for="assignmentDetail in assignmentDetails.filter(c=>c)" :key="assignmentDetail.assignmentId"  >
      <!-- 提交内容展示区域 - 添加空值判断 -->
      <div class="assignment-submit-content"  v-if="userStore.assignmentSubmit && userStore.assignmentSubmit.submitContent">
        学生：{{assignmentDetail.accountId}}
      </div>
      <div>
        提交的内容：{{ assignmentDetail.submitContent }}
      </div>
      <div class="assignment-grade" v-if="assignmentDetail.correct==='已批改'">
        成绩：{{ assignmentDetail.score }}
      </div>
      <div class="ai-comment" v-if="assignmentDetail.aiComment">
        <div>AI评分：{{ assignmentDetail.aiScore }}</div>
        <div>AI评语：{{ assignmentDetail.aiComment }}</div>
      </div>
      <div v-if="!assignmentDetail.correct ||assignmentDetail.correct==='未批改'">
        <input placeholder="请输入分值" v-model="score">
        <button @click="handleConfirmCorrect(assignmentDetail)">确认批改</button>
      </div>
      <div>---------------------</div>
    </div>
    <!-- 成绩展示区域 - 添加空值判断 -->
  </div>
  <div class="learn-assignment" v-if="iLearn&&showLearnAssignment">
    <button @click="fromLearnBack">◀返回</button>
    <div class="assignment-details" >
      <div class="title">{{LearnAssignmentDetail.title}}</div>
      <div class="assignment-description">{{LearnAssignmentDetail.content}}</div>
    </div>
    <div class="assignment-submit" v-if="!LearnAssignmentDetail.submit || LearnAssignmentDetail.submit==='未提交'"  >
      <input placeholder="请输入完成的作业" v-model="submitContent">
      <button class="confirm-assignment-submit" @click="handleConfirmSubmit">确认提交</button>
    </div>
    <!-- 成绩展示区域 - 添加空值判断 -->
    <div class="assignment-grade" v-if="LearnAssignmentDetail.correct==='已批改'">
      成绩：{{ LearnAssignmentDetail.score }}
    </div>
    <div class="ai-comment" v-if="LearnAssignmentDetail.aiComment">
      <div>AI评分：{{ LearnAssignmentDetail.aiScore }}</div>
      <div>AI评语：{{ LearnAssignmentDetail.aiComment }}</div>
    </div>
    <div v-if="LearnAssignmentDetail.submit==='已提交'">已提交</div>
    <div v-else>未提交</div>
    <div v-if="LearnAssignmentDetail.correct==='已批改'">已批改</div>
    <div v-else>未批改</div>
    <!-- 提交内容展示区域 - 添加空值判断 -->
    <div class="assignment-submit-content" v-if="LearnAssignmentDetail.submitContent">
      提交的内容：{{LearnAssignmentDetail.submitContent }}
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
</template>
<style>
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
.release-assignment{
  position: absolute;
  display: flex;
  flex-direction: column;
  width: 600px;
  top: 100px;
  left: 50%;
  transform: translateX(-50%);
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px 0 rgba(0, 0, 0, .1);
  z-index: 100;
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
</style>
