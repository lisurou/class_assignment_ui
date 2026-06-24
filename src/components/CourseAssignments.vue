<script setup>
import { computed, ref, watch } from 'vue';
import axios from 'axios';
import { ElMessage } from 'element-plus';
import { useUserStore } from '@/stores/userStore';

const props = defineProps({
  courseId: {
    type: String,
    default: ''
  },
  isTeacherView: {
    type: Boolean,
    default: false
  },
  isStudentView: {
    type: Boolean,
    default: false
  }
});

const userStore = useUserStore();
const assignmentDetails = computed(() => userStore.assignmentDetails || []);
const showTeacherAssignment = ref(false);
const showLearnAssignment = ref(false);
const displayReleaseAssignment = ref(false);
const currentAssignmentDetail = ref(null);
const score = ref('');
const learnAssignmentDetail = ref({});
const submitContent = ref('');
const releaseTitle = ref('');
const releaseDeadline = ref('');
const releaseType = ref('');
const releaseDetail = ref('');
const releaseScore = ref('');

function getCourseId() {
  return String(props.courseId || '').trim();
}

watch(
  () => props.courseId,
  () => {
    showTeacherAssignment.value = false;
    showLearnAssignment.value = false;
    displayReleaseAssignment.value = false;
    currentAssignmentDetail.value = null;
    learnAssignmentDetail.value = {};
    score.value = '';
    submitContent.value = '';
  }
);

function handleAssignmentSubmit(assignmentDetail) {
  showLearnAssignment.value = true;
  learnAssignmentDetail.value = assignmentDetail;
}

async function handleCheckAssignmentSubmit(assignmentDetail) {
  try {
    const response = await axios.post('http://localhost:8080/check-assignment-submit', {
      accountId: userStore.account?.accountId,
      id: getCourseId(),
      assignmentId: assignmentDetail.assignmentId
    });
    const data = response.data;
    if (data.success) {
      userStore.setAssignmentDetails(data.assignments);
      currentAssignmentDetail.value = assignmentDetail;
      ElMessage.success(data.message);
      showTeacherAssignment.value = true;
    } else {
      ElMessage.error(data.message);
    }
  } catch (error) {
    console.log('已提交作业页面加载失败：', error);
    ElMessage.error('服务器错误，请稍后重试');
  }
}

async function handleConfirmCorrect(assignmentDetail) {
  try {
    const response = await axios.post('http://localhost:8080/correct-assignment', {
      accountId: assignmentDetail.accountId,
      id: assignmentDetail.id,
      assignmentId: assignmentDetail.assignmentId,
      score: score.value
    });
    const data = response.data;
    if (data.success) {
      showTeacherAssignment.value = false;
      userStore.setAssignmentDetails(data.assignments);
      score.value = '';
      setTimeout(() => {
        showTeacherAssignment.value = true;
      }, 0);
      currentAssignmentDetail.value = assignmentDetail;
      ElMessage.success(data.message);
    } else {
      ElMessage.error(data.message);
    }
  } catch (error) {
    console.log('批改作业失败：', error);
    ElMessage.error('服务器错误，请稍后重试');
  }
}

async function fetchLatestAssignments() {
  if (!getCourseId()) return;
  try {
    const response = await axios.post('http://localhost:8080/assignment-details', {
      id: getCourseId(),
      accountId: userStore.account?.accountId
    });
    if (response.data.success) {
      userStore.setAssignmentDetails(response.data.assignments);
    }
  } catch (error) {
    console.error('返回时刷新作业失败：', error);
  }
}

function fromTeachBack() {
  showTeacherAssignment.value = false;
  fetchLatestAssignments();
}

function fromLearnBack() {
  showLearnAssignment.value = false;
  learnAssignmentDetail.value = {};
}

async function handleConfirmSubmit() {
  if (!submitContent.value) {
    ElMessage.error('提交内容不能为空');
    return;
  }
  try {
    const response = await axios.post('http://localhost:8080/assignment-submit', {
      id: learnAssignmentDetail.value.id,
      accountId: userStore.account?.accountId,
      assignmentId: learnAssignmentDetail.value.assignmentId,
      submitContent: submitContent.value
    });
    const data = response.data;
    if (data.success) {
      userStore.setAssignmentSubmit(data.assignment || {});
      ElMessage.success(data.message);
      showLearnAssignment.value = false;
      submitContent.value = '';
      await fetchLatestAssignments();
    } else {
      ElMessage.error(data.message);
    }
  } catch (error) {
    console.log('查询作业详情失败：', error);
    ElMessage.error('服务器错误，请稍后重试');
  }
}

async function confirmReleaseAssignment() {
  try {
    if (!releaseTitle.value || !releaseDeadline.value || !releaseType.value || !releaseDetail.value || !releaseScore.value) {
      ElMessage.error('请填写完整作业信息');
      return;
    }

    const totalScore = parseInt(releaseScore.value, 10);
    if (isNaN(totalScore) || totalScore <= 0) {
      ElMessage.error('总分必须是有效的正数');
      return;
    }

    if (!getCourseId()) {
      ElMessage.error('未获取到课程信息，请重新进入课程');
      return;
    }

    const assignment = {
      title: releaseTitle.value,
      deadline: releaseDeadline.value,
      assignmentType: releaseType.value,
      content: releaseDetail.value,
      totalScore
    };

    const response = await axios.post('http://localhost:8080/release-assignment', {
      accountId: userStore.account?.accountId,
      id: getCourseId(),
      assignment
    });

    const data = response.data;
    if (data.success) {
      ElMessage.success(data.message);
      releaseTitle.value = '';
      releaseDeadline.value = '';
      releaseType.value = '';
      releaseDetail.value = '';
      releaseScore.value = '';
      displayReleaseAssignment.value = false;
      await fetchLatestAssignments();
    } else {
      ElMessage.error(data.message);
    }
  } catch (error) {
    console.log('发布作业失败：', error);
    if (error.response) {
      ElMessage.error(`发布失败（${error.response.status}）：${error.response.data?.message || '参数错误'}`);
    } else if (error.request) {
      ElMessage.error('服务器无响应，请检查网络');
    } else {
      ElMessage.error('请求配置错误，请刷新页面重试');
    }
  }
}

function fromReleaseBack() {
  displayReleaseAssignment.value = false;
}
</script>

<template>
  <div class="course-assignments-panel">
    <div v-if="!showTeacherAssignment && !showLearnAssignment && !displayReleaseAssignment">
      <div class="activity-number">共{{ assignmentDetails.length }}个活动</div>
      <button class="releaseAssignment" v-if="isTeacherView" @click="displayReleaseAssignment = true">发布作业</button>
      <div class="homework-box">
        <div class="homework-container" v-if="isStudentView" v-for="assignmentDetail in assignmentDetails.filter(c => c)" :key="assignmentDetail.assignmentId">
          <div class="homework-logo">
            <img src="@/assets/课堂派作业图片.png" alt="课堂派作业图片">
            <span>作业</span>
          </div>
          <div class="assignment-info">
            <div class="assignment-title">{{ assignmentDetail.title }}</div>
            <div class="assignment-content">
              <div>提交截止时间：{{ assignmentDetail.deadline }}</div>
              <div>{{ assignmentDetail.assignmentType }}</div>
              <div v-if="assignmentDetail.submit === '已提交'">已提交</div>
              <div v-else>未提交</div>
              <div v-if="assignmentDetail.correct === '已批改'">已批改</div>
              <div v-else>未批改</div>
              <div v-if="assignmentDetail.correct === '已批改'">{{ assignmentDetail.score }}分</div>
            </div>
          </div>
          <button class="submit-button" @click="handleAssignmentSubmit(assignmentDetail)">提交作业</button>
        </div>
        <div
          class="homework-container"
          v-if="isTeacherView"
          v-for="assignmentDetail in assignmentDetails.filter(c => c)"
          :key="`${assignmentDetail.id}-${assignmentDetail.assignmentId}-${assignmentDetail.accountId}`"
        >
          <div class="homework-logo">
            <img src="@/assets/课堂派作业图片.png" alt="课堂派作业图片">
            <span>作业</span>
          </div>
          <div class="assignment-info">
            <div class="assignment-title">{{ assignmentDetail.title }}</div>
            <div class="assignment-content">
              <div>提交截止时间：{{ assignmentDetail.deadline }}</div>
            </div>
          </div>
          <button class="submit-button" @click="handleCheckAssignmentSubmit(assignmentDetail)">查看已提交作业</button>
        </div>
      </div>
    </div>

    <div class="teach-assignment" v-if="isTeacherView && showTeacherAssignment">
      <button @click="fromTeachBack">◀返回</button>
      <div class="assignment-details">
        <div class="title">作业题目：{{ currentAssignmentDetail?.title }}</div>
        <div class="assignment-description">作业详情：{{ currentAssignmentDetail?.content }}</div>
        <div>----------------------</div>
      </div>

      <div class="assignment-submit-account" v-for="assignmentDetail in assignmentDetails.filter(c => c)" :key="assignmentDetail.assignmentId">
        <div class="assignment-submit-content" v-if="userStore.assignmentSubmit && userStore.assignmentSubmit.submitContent">
          学生：{{ assignmentDetail.accountId }}
        </div>
        <div>
          提交的内容：{{ assignmentDetail.submitContent }}
        </div>
        <div class="assignment-grade" v-if="assignmentDetail.correct === '已批改'">
          成绩：{{ assignmentDetail.score }}
        </div>
        <div v-if="!assignmentDetail.correct || assignmentDetail.correct === '未批改'">
          <input placeholder="请输入分值" v-model="score">
          <button @click="handleConfirmCorrect(assignmentDetail)">确认批改</button>
        </div>
        <div>---------------------</div>
      </div>
    </div>

    <div class="learn-assignment" v-if="isStudentView && showLearnAssignment">
      <button @click="fromLearnBack">◀返回</button>
      <div class="assignment-details">
        <div class="title">{{ learnAssignmentDetail.title }}</div>
        <div class="assignment-description">{{ learnAssignmentDetail.content }}</div>
      </div>
      <div class="assignment-submit" v-if="!learnAssignmentDetail.submit || learnAssignmentDetail.submit === '未提交'">
        <input placeholder="请输入完成的作业" v-model="submitContent">
        <button class="confirm-assignment-submit" @click="handleConfirmSubmit">确认提交</button>
      </div>
      <div class="assignment-grade" v-if="learnAssignmentDetail.correct === '已批改'">
        成绩：{{ learnAssignmentDetail.score }}
      </div>
      <div v-if="learnAssignmentDetail.submit === '已提交'">已提交</div>
      <div v-else>未提交</div>
      <div v-if="learnAssignmentDetail.correct === '已批改'">已批改</div>
      <div v-else>未批改</div>
      <div class="assignment-submit-content" v-if="learnAssignmentDetail.submitContent">
        提交的内容：{{ learnAssignmentDetail.submitContent }}
      </div>
    </div>

    <div class="release-assignment" v-if="displayReleaseAssignment">
      <button @click="fromReleaseBack">◀返回</button>
      <input v-model="releaseTitle" placeholder="标题">
      <input v-model="releaseDeadline" placeholder="提交截至时间">
      <input v-model="releaseType" placeholder="作业类型">
      <input v-model="releaseDetail" placeholder="作业详情">
      <input v-model="releaseScore" placeholder="总分">
      <button class="confirm-release-assignment" @click="confirmReleaseAssignment">确认发布作业</button>
    </div>
  </div>
</template>

<style scoped>
.course-assignments-panel {
  margin-top: 16px;
}

.activity-number {
  margin-bottom: 12px;
  font-size: 13px;
  color: #5f6368;
}

.releaseAssignment,
.submit-button,
.confirm-assignment-submit,
.confirm-release-assignment,
.teach-assignment > button,
.learn-assignment > button,
.release-assignment > button:not(.confirm-release-assignment) {
  height: 36px;
  padding: 0 16px;
  font-size: 14px;
  color: #fff;
  cursor: pointer;
  background: #4285f4;
  border: none;
  border-radius: 4px;
}

.releaseAssignment {
  margin-bottom: 12px;
}

.releaseAssignment:hover,
.submit-button:hover,
.confirm-assignment-submit:hover,
.confirm-release-assignment:hover,
.teach-assignment > button:hover,
.learn-assignment > button:hover,
.release-assignment > button:not(.confirm-release-assignment):hover {
  background: rgb(104, 157, 246);
}

.homework-box {
  display: flex;
  flex-direction: column;
  width: 100%;
  margin: 8px 0 10px;
  padding: 16px 0 0;
  background: #fff;
  border: 1px solid #e4e4e4;
  border-radius: 8px;
}

.homework-container {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 95px;
  padding: 10px 16px 14px;
  border-bottom: 1px solid #eef0f2;
  gap: 16px;
}

.homework-container:last-child {
  border-bottom: none;
}

.homework-logo {
  display: flex;
  flex: 0 0 85px;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.homework-logo img {
  width: 40px;
  margin-bottom: 10px;
}

.homework-logo span {
  font-size: 14px;
  color: #202124;
}

.assignment-info {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
  font-size: 14px;
}

.assignment-title,
.title {
  font-size: 16px;
  font-weight: 600;
  color: #202124;
}

.assignment-content {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 24px;
  color: #5f6368;
}

.teach-assignment,
.learn-assignment,
.release-assignment {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.assignment-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px 20px;
  background: #fff;
  border: 1px solid #e4e4e4;
  border-radius: 8px;
}

.assignment-description {
  font-size: 14px;
  line-height: 1.7;
  color: #3c4043;
  word-break: break-word;
}

.assignment-submit-account,
.assignment-submit {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px 20px;
  background: #fff;
  border: 1px solid #e4e4e4;
  border-radius: 8px;
  font-size: 14px;
  color: #202124;
}

.assignment-submit-content,
.assignment-grade {
  font-size: 14px;
  color: #202124;
  word-break: break-word;
}

.assignment-submit-account input,
.assignment-submit input,
.release-assignment input {
  width: 100%;
  min-height: 40px;
  padding: 0 12px;
  font-size: 14px;
  color: #202124;
  border: 1px solid #d0d7de;
  border-radius: 4px;
  outline: none;
}

.assignment-submit-account input:focus,
.assignment-submit input:focus,
.release-assignment input:focus {
  border-color: #4285f4;
}

.release-assignment {
  padding: 18px 20px;
  background: #fff;
  border: 1px solid #e4e4e4;
  border-radius: 8px;
}
</style>
