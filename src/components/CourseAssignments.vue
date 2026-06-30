<script setup>
import { computed, ref } from 'vue';
import { ElDatePicker } from 'element-plus';

const props = defineProps({
  mode: { type: String, default: 'list' },
  iTeach: { type: Boolean, default: false },
  iLearn: { type: Boolean, default: false },
  validAssignmentDetails: { type: Array, default: () => [] },
  studentVisibleAssignmentDetails: { type: Array, default: () => [] },
  filteredTeacherAssignments: { type: Array, default: () => [] },
  teacherHomeworkFilter: { type: String, default: 'all' },
  showTeacherAssignment: { type: Boolean, default: false },
  showLearnAssignment: { type: Boolean, default: false },
  currentAssignmentDetail: { type: Object, default: null },
  teacherAssignmentTab: { type: String, default: 'detail' },
  teacherCommentDraft: { type: String, default: '' },
  teacherCommentRealName: { type: Boolean, default: true },
  teacherCommentAttachmentOnly: { type: Boolean, default: false },
  teacherReviewFilter: { type: String, default: 'all' },
  teacherReviewKeyword: { type: String, default: '' },
  teacherSubmissionStats: { type: Object, default: () => ({ all: 0, unreviewed: 0, reviewed: 0, unsubmitted: 0 }) },
  filteredTeacherSubmissionDetails: { type: Array, default: () => [] },
  scoreDrafts: { type: Object, default: () => ({}) },
  learnAssignmentTab: { type: String, default: 'detail' },
  learnAssignmentDetail: { type: Object, default: () => ({}) },
  studentSubmitHasSubmitted: { type: Boolean, default: false },
  studentSubmitEditing: { type: Boolean, default: false },
  selectedSubmissionFile: { type: Object, default: null },
  submitContent: { type: String, default: '' },
  activeTeacherAssignmentMenu: { type: String, default: '' },
  displayReleaseAssignment: { type: Boolean, default: false },
  releaseEditMode: { type: Boolean, default: false },
  releaseTitle: { type: String, default: '' },
  releaseType: { type: String, default: '' },
  releaseDetail: { type: String, default: '' },
  releaseTag: { type: String, default: '' },
  releaseKnowledgeAgreement: { type: String, default: '' },
  releaseEnvironment: { type: String, default: '' },
  releaseChapter: { type: String, default: '' },
  showReleaseSwitch: { type: Boolean, default: false },
  showReleasePublishSettings: { type: Boolean, default: false },
  releaseImmediate: { type: Boolean, default: false },
  releasePublishTime: { type: String, default: '' },
  releasePublishTimeReadonly: { type: Boolean, default: false },
  releaseDeadline: { type: String, default: '' },
  releaseAllowFormat: { type: String, default: 'all' },
  releaseScore: { type: [String, Number], default: '' },
  releaseLateForbidden: { type: Boolean, default: false },
  releaseDuplicateCheck: { type: Boolean, default: false },
  releaseDuplicateThreshold: { type: [String, Number], default: '' },
  releaseAutoReturn: { type: Boolean, default: false },
  releaseAiEnabled: { type: Boolean, default: false },
  releaseAttachmentFile: { type: Object, default: null },
  releaseSubmitButtonText: { type: String, default: '确认' },
  getTeacherAssignmentStageText: { type: Function, required: true },
  isAssignmentPublished: { type: Function, required: true },
  formatTeacherDeadlineShort: { type: Function, required: true },
  getTeacherAssignmentStats: { type: Function, required: true },
  handleViewLearnAssignmentDetail: { type: Function, required: true },
  handleAssignmentSubmit: { type: Function, required: true },
  openTeacherAssignmentDetail: { type: Function, required: true },
  openPublishAssignmentDialog: { type: Function, required: true },
  openCreateAssignmentDialog: { type: Function, required: false, default: null },
  toggleTeacherAssignmentMenu: { type: Function, required: true },
  openEditAssignmentDialog: { type: Function, required: true },
  handleDeleteCourseAssignment: { type: Function, required: true },
  fromTeachBack: { type: Function, required: true },
  fromLearnBack: { type: Function, required: true },
  getTeacherAiReviewEnabled: { type: Function, required: true },
  handleTeacherAiReviewToggle: { type: Function, required: true },
  downloadTeacherSubmissionFile: { type: Function, required: true },
  getDraftScore: { type: Function, required: true },
  isScoreSaving: { type: Function, required: true },
  handleScoreBlur: { type: Function, required: true },
  startResubmit: { type: Function, required: true },
  handleDeleteSubmittedFile: { type: Function, required: true },
  handleConfirmSubmit: { type: Function, required: true },
  downloadSubmittedFile: { type: Function, required: true },
  downloadAssignmentResource: { type: Function, required: true },
  handleReleaseAttachmentChange: { type: Function, required: true },
  removeReleaseAttachment: { type: Function, required: true },
  handleOpenTeacherReview: { type: Function, required: true },
  handleRemindStudent: { type: Function, required: true },
  confirmReleaseAssignment: { type: Function, required: true },
  fromReleaseBack: { type: Function, required: true },
});

const emit = defineEmits([
  'update:teacherHomeworkFilter',
  'update:teacherAssignmentTab',
  'update:teacherCommentDraft',
  'update:teacherCommentRealName',
  'update:teacherCommentAttachmentOnly',
  'update:teacherReviewFilter',
  'update:teacherReviewKeyword',
  'update:learnAssignmentTab',
  'update:submitContent',
  'submission-file-change',
  'update:releaseTitle',
  'update:releaseType',
  'update:releaseDetail',
  'update:releaseTag',
  'update:releaseKnowledgeAgreement',
  'update:releaseEnvironment',
  'update:releaseChapter',
  'update:releaseImmediate',
  'update:releasePublishTime',
  'update:releaseDeadline',
  'update:releaseAllowFormat',
  'update:releaseScore',
  'update:releaseLateForbidden',
  'update:releaseDuplicateCheck',
  'update:releaseDuplicateThreshold',
  'update:releaseAutoReturn',
  'update:releaseAiEnabled',
]);

const teacherHomeworkFilterModel = computed({
  get: () => props.teacherHomeworkFilter,
  set: (value) => emit('update:teacherHomeworkFilter', value),
});

const teacherAssignmentTabModel = computed({
  get: () => props.teacherAssignmentTab,
  set: (value) => emit('update:teacherAssignmentTab', value),
});

const teacherCommentDraftModel = computed({
  get: () => props.teacherCommentDraft,
  set: (value) => emit('update:teacherCommentDraft', value),
});

const teacherCommentRealNameModel = computed({
  get: () => props.teacherCommentRealName,
  set: (value) => emit('update:teacherCommentRealName', value),
});

const teacherCommentAttachmentOnlyModel = computed({
  get: () => props.teacherCommentAttachmentOnly,
  set: (value) => emit('update:teacherCommentAttachmentOnly', value),
});

const teacherReviewFilterModel = computed({
  get: () => props.teacherReviewFilter,
  set: (value) => emit('update:teacherReviewFilter', value),
});

const teacherReviewKeywordModel = computed({
  get: () => props.teacherReviewKeyword,
  set: (value) => emit('update:teacherReviewKeyword', value),
});

const learnAssignmentTabModel = computed({
  get: () => props.learnAssignmentTab,
  set: (value) => emit('update:learnAssignmentTab', value),
});

const submitContentModel = computed({
  get: () => props.submitContent,
  set: (value) => emit('update:submitContent', value),
});

const releaseTitleModel = computed({
  get: () => props.releaseTitle,
  set: (value) => emit('update:releaseTitle', value),
});

const releaseTypeModel = computed({
  get: () => props.releaseType,
  set: (value) => emit('update:releaseType', value),
});

const releaseDetailModel = computed({
  get: () => props.releaseDetail,
  set: (value) => emit('update:releaseDetail', value),
});

const releaseTagModel = computed({
  get: () => props.releaseTag,
  set: (value) => emit('update:releaseTag', value),
});

const releaseKnowledgeAgreementModel = computed({
  get: () => props.releaseKnowledgeAgreement,
  set: (value) => emit('update:releaseKnowledgeAgreement', value),
});

const releaseEnvironmentModel = computed({
  get: () => props.releaseEnvironment,
  set: (value) => emit('update:releaseEnvironment', value),
});

const releaseChapterModel = computed({
  get: () => props.releaseChapter,
  set: (value) => emit('update:releaseChapter', value),
});

const releaseImmediateModel = computed({
  get: () => props.releaseImmediate,
  set: (value) => emit('update:releaseImmediate', value),
});

const releasePublishTimeModel = computed({
  get: () => props.releasePublishTime,
  set: (value) => emit('update:releasePublishTime', value),
});

const releaseDeadlineModel = computed({
  get: () => props.releaseDeadline,
  set: (value) => emit('update:releaseDeadline', value),
});

const releaseAllowFormatModel = computed({
  get: () => props.releaseAllowFormat,
  set: (value) => emit('update:releaseAllowFormat', value),
});

const releaseScoreModel = computed({
  get: () => props.releaseScore,
  set: (value) => emit('update:releaseScore', value),
});

const releaseLateForbiddenModel = computed({
  get: () => props.releaseLateForbidden,
  set: (value) => emit('update:releaseLateForbidden', value),
});

const releaseDuplicateCheckModel = computed({
  get: () => props.releaseDuplicateCheck,
  set: (value) => emit('update:releaseDuplicateCheck', value),
});

const releaseDuplicateThresholdModel = computed({
  get: () => props.releaseDuplicateThreshold,
  set: (value) => emit('update:releaseDuplicateThreshold', value),
});

const releaseAutoReturnModel = computed({
  get: () => props.releaseAutoReturn,
  set: (value) => emit('update:releaseAutoReturn', value),
});

const releaseAiEnabledModel = computed({
  get: () => props.releaseAiEnabled,
  set: (value) => emit('update:releaseAiEnabled', value),
});

const submissionFileInput = ref(null);
const releaseAttachmentInput = ref(null);

const triggerSubmissionFilePicker = () => {
  submissionFileInput.value?.click();
};

const handleSubmissionFileChange = (event) => {
  emit('submission-file-change', event);
};

const triggerReleaseAttachmentPicker = () => {
  releaseAttachmentInput.value?.click();
};

const updateDraftScore = (assignmentDetail, value) => {
  props.scoreDrafts[props.getDraftScore(assignmentDetail)] = value;
};
</script>

<template>
  <template v-if="mode === 'list'">
    <div class="course-learning-body">
      <div class="homework-toolbar">
        <div class="activity-number">共{{ iTeach ? validAssignmentDetails.length : studentVisibleAssignmentDetails.length }}个活动</div>
        <div v-if="iTeach" class="teacher-homework-toolbar">
          <div class="teacher-filter-group">
            <button class="teacher-filter-button" :class="{ active: teacherHomeworkFilterModel === 'all' }" @click="teacherHomeworkFilterModel = 'all'">全部作业</button>
            <button class="teacher-filter-button" :class="{ active: teacherHomeworkFilterModel === 'pending' }" @click="teacherHomeworkFilterModel = 'pending'">未批作业</button>
            <button class="teacher-filter-button" :class="{ active: teacherHomeworkFilterModel === 'corrected' }" @click="teacherHomeworkFilterModel = 'corrected'">已批作业</button>
          </div>
          <button class="releaseAssignment" @click="openCreateAssignmentDialog">+ 添加作业</button>
        </div>
      </div>

      <div class="homework-box">
        <div
            v-for="assignmentDetail in studentVisibleAssignmentDetails"
            v-if="iLearn"
            :key="assignmentDetail.assignmentId"
            class="homework-item"
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
              <span :class="assignmentDetail.submit === '已提交' ? 'status-done' : 'status-pending'">{{ assignmentDetail.submit === '已提交' ? '已提交' : '未提交' }}</span>
              <span :class="assignmentDetail.correct === '已批改' ? 'status-done' : 'status-pending'">{{ assignmentDetail.correct === '已批改' ? '已批改' : '未批改' }}</span>
              <span v-if="assignmentDetail.correct === '已批改'">{{ assignmentDetail.score }}分</span>
            </div>
          </div>
          <button class="submit-button" :class="{ 'is-submitted': assignmentDetail.submit === '已提交' }" @click="handleAssignmentSubmit(assignmentDetail)">
            {{ assignmentDetail.submit === '已提交' ? '已提交' : '提交作业' }}
          </button>
        </div>

        <div
            v-for="assignmentDetail in filteredTeacherAssignments"
            v-if="iTeach"
            :key="`${assignmentDetail.id}-${assignmentDetail.assignmentId}-${assignmentDetail.accountId}`"
            class="homework-item teacher-homework-item"
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
            <button v-if="!isAssignmentPublished(assignmentDetail)" class="teacher-publish-button" @click.stop="openPublishAssignmentDialog(assignmentDetail)">
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

        <div v-if="(iTeach ? filteredTeacherAssignments.length : studentVisibleAssignmentDetails.length) === 0" class="homework-empty">暂无作业</div>
      </div>
    </div>
  </template>

  <template v-else>
    <div v-if="iTeach && showTeacherAssignment" class="assignment-page teacher-assignment-page">
      <div class="assignment-page-tabs">
        <button class="assignment-page-tab" :class="{ active: teacherAssignmentTabModel === 'detail' }" @click="teacherAssignmentTabModel = 'detail'">详情</button>
        <button class="assignment-page-tab" :class="{ active: teacherAssignmentTabModel === 'ai' }" @click="teacherAssignmentTabModel = 'ai'">AI批阅设置</button>
        <button class="assignment-page-tab" :class="{ active: teacherAssignmentTabModel === 'review' }" @click="teacherAssignmentTabModel = 'review'">批阅</button>
      </div>

      <template v-if="teacherAssignmentTabModel === 'detail'">
        <div class="teacher-assignment-summary">
          <div class="teacher-assignment-summary-title">{{ currentAssignmentDetail?.title }}</div>
          <div class="teacher-assignment-summary-meta">
            <span>截止：{{ currentAssignmentDetail?.deadline || '暂无' }}</span>
            <span>{{ currentAssignmentDetail?.assignmentType || '个人作业' }}</span>
            <span>{{ currentAssignmentDetail?.totalScore || 100 }}分</span>
          </div>
          <div class="teacher-assignment-summary-desc">{{ currentAssignmentDetail?.content || '暂无作业说明' }}</div>
          <div v-if="currentAssignmentDetail?.attachmentName" class="assignment-resource-row">
            <span class="assignment-resource-label">附件：</span>
            <button class="teacher-op-link" @click="downloadAssignmentResource(currentAssignmentDetail)">
              {{ currentAssignmentDetail.attachmentName }}
            </button>
          </div>
        </div>

        <div class="student-comment-card teacher-detail-comment-card">
          <textarea v-model="teacherCommentDraftModel" class="student-comment-input" placeholder="说点什么吧"></textarea>
          <div class="student-comment-actions">
            <label><input v-model="teacherCommentRealNameModel" type="checkbox"> 实名发表</label>
            <label><input v-model="teacherCommentAttachmentOnlyModel" type="checkbox"> 添加附件</label>
            <button class="student-comment-publish">发表评论</button>
          </div>
        </div>

        <div class="teacher-comment-section-title">全部评论 <span>共0条</span></div>
        <div class="student-comment-empty teacher-comment-empty">
          <img src="@/assets/课堂派课程详情空白页.png" alt="空白">
          <span>暂无数据</span>
        </div>
      </template>

      <template v-else-if="teacherAssignmentTabModel === 'ai'">
        <div class="teacher-ai-setting-card">
          <div class="teacher-ai-setting-title">批阅设置</div>
          <div class="teacher-ai-setting-row">
            <label class="release-switch">
              <input :checked="getTeacherAiReviewEnabled()" type="checkbox" @change="handleTeacherAiReviewToggle(currentAssignmentDetail, $event.target.checked)">
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
          <div v-if="currentAssignmentDetail?.attachmentName" class="assignment-resource-row">
            <span class="assignment-resource-label">附件：</span>
            <button class="teacher-op-link" @click="downloadAssignmentResource(currentAssignmentDetail)">
              {{ currentAssignmentDetail.attachmentName }}
            </button>
          </div>
        </div>

        <div class="teacher-review-panel">
          <div class="teacher-review-chip-row">
            <button class="teacher-review-chip" :class="{ active: teacherReviewFilterModel === 'all' }" @click="teacherReviewFilterModel = 'all'">全部({{ teacherSubmissionStats.all }})</button>
            <button class="teacher-review-chip" :class="{ active: teacherReviewFilterModel === 'unreviewed' }" @click="teacherReviewFilterModel = 'unreviewed'">未批({{ teacherSubmissionStats.unreviewed }})</button>
            <button class="teacher-review-chip" :class="{ active: teacherReviewFilterModel === 'reviewed' }" @click="teacherReviewFilterModel = 'reviewed'">已批({{ teacherSubmissionStats.reviewed }})</button>
            <button class="teacher-review-chip" :class="{ active: teacherReviewFilterModel === 'unsubmitted' }" @click="teacherReviewFilterModel = 'unsubmitted'">未交({{ teacherSubmissionStats.unsubmitted }})</button>
            <input v-model="teacherReviewKeywordModel" class="teacher-review-search" placeholder="学生姓名/学号搜索">
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

            <div v-for="assignmentDetail in filteredTeacherSubmissionDetails" :key="`${assignmentDetail.assignmentId}_${assignmentDetail.accountId || 'none'}`" class="teacher-review-row">
              <span><input type="checkbox"></span>
              <span class="teacher-student-cell">
                <strong>{{ assignmentDetail.studentName || assignmentDetail.accountId || '未分配学生' }}</strong>
                <small>{{ assignmentDetail.studentId || assignmentDetail.accountId || assignmentDetail.id }}</small>
              </span>
              <span :class="assignmentDetail.submit === '已提交' ? 'status-done' : 'status-danger'">{{ assignmentDetail.submit === '已提交' ? '已提交' : '未交' }}</span>
              <span>{{ assignmentDetail.submitContent ? assignmentDetail.submitContent.length : 0 }}</span>
              <span class="teacher-file-cell">
                <button v-if="assignmentDetail.fileName" class="teacher-op-link" @click="downloadTeacherSubmissionFile(assignmentDetail)">下载</button>
                <span v-else class="teacher-file-empty">-</span>
              </span>
              <span>{{ assignmentDetail.correct === '已批改' ? 1 : 0 }}</span>
              <span class="teacher-score-cell">
                <template v-if="assignmentDetail.submit === '已提交'">
                  <input
                      :value="scoreDrafts[getDraftScore(assignmentDetail)]"
                      class="teacher-score-input"
                      :class="{ saving: isScoreSaving(assignmentDetail) }"
                      placeholder="分数"
                      @input="updateDraftScore(assignmentDetail, $event.target.value)"
                      @blur="handleScoreBlur(assignmentDetail)"
                  >
                  <span>/{{ currentAssignmentDetail?.totalScore || 100 }}</span>
                </template>
                <template v-else>
                  <span class="status-danger">未交</span>
                </template>
              </span>
              <span class="teacher-review-ops">
                <button v-if="assignmentDetail.submit === '已提交'" class="teacher-op-link" @click="handleOpenTeacherReview(assignmentDetail)">进入批阅</button>
                <button v-else class="teacher-op-link danger" @click="handleRemindStudent(assignmentDetail)">催交</button>
              </span>
            </div>

            <div v-if="!filteredTeacherSubmissionDetails.length" class="teacher-review-empty">暂无提交记录</div>
          </div>
        </div>
      </template>
    </div>

    <div v-if="iLearn && showLearnAssignment" class="assignment-page student-assignment-page">
      <div class="assignment-page-tabs">
        <button class="assignment-page-tab" :class="{ active: learnAssignmentTabModel === 'detail' }" @click="learnAssignmentTabModel = 'detail'">详情</button>
        <button class="assignment-page-tab" :class="{ active: learnAssignmentTabModel === 'submit' }" @click="learnAssignmentTabModel = 'submit'">提交作业</button>
      </div>

      <div class="student-assignment-hero">
        <div class="student-assignment-hero-icon">
          <img src="@/assets/课堂派作业图片.png" alt="课堂派作业图片">
        </div>
        <div class="student-assignment-hero-info">
          <div class="student-assignment-hero-title">{{ learnAssignmentDetail.title }}</div>
          <div class="student-assignment-hero-meta">
            <span>{{ learnAssignmentDetail.assignmentType || '个人作业' }}</span>
            <span>提交截止时间：{{ learnAssignmentDetail.deadline || '暂无' }}</span>
            <span>{{ learnAssignmentDetail.totalScore || 100 }}分</span>
            <span>查重</span>
          </div>
        </div>
      </div>

      <div v-if="learnAssignmentTabModel === 'detail'" class="student-assignment-content-page">
        <div class="student-detail-card">
          <div class="student-detail-title">作业内容</div>
          <div class="student-detail-text">{{ learnAssignmentDetail.content || '暂无作业内容' }}</div>
          <div v-if="learnAssignmentDetail.attachmentName" class="assignment-resource-row student-resource-row">
            <span class="assignment-resource-label">作业附件：</span>
            <button class="teacher-op-link" @click="downloadAssignmentResource(learnAssignmentDetail)">
              {{ learnAssignmentDetail.attachmentName }}
            </button>
          </div>
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
            <button class="student-submit-confirm" @click="handleConfirmSubmit()">
              {{ studentSubmitHasSubmitted ? '再次提交' : '确认提交' }}
            </button>
          </div>

          <template v-if="studentSubmitHasSubmitted">
            <div class="student-submit-section">
              <div class="student-submit-section-title">提交状态</div>
              <div class="student-submitted-banner">已提交，可根据 AI 批阅结果继续修改后再次提交</div>
            </div>

            <div v-if="learnAssignmentDetail.aiEnabled && (learnAssignmentDetail.aiComment || learnAssignmentDetail.aiScore !== null && learnAssignmentDetail.aiScore !== undefined)" class="student-submit-section">
              <div class="student-submit-section-title">AI预批阅结果</div>
              <div class="student-result-box">
                <div class="student-result-score">{{ learnAssignmentDetail.aiScore ?? '--' }} / {{ learnAssignmentDetail.totalScore || 100 }}</div>
                <div v-if="learnAssignmentDetail.aiComment" class="student-result-comment">{{ learnAssignmentDetail.aiComment }}</div>
              </div>
            </div>

            <div v-if="learnAssignmentDetail.correct === '已批改'" class="student-submit-section">
              <div class="student-submit-section-title">教师批改结果</div>
              <div class="student-result-box">
                <div class="student-result-score">{{ learnAssignmentDetail.score ?? '--' }} / {{ learnAssignmentDetail.totalScore || 100 }}</div>
                <div v-if="learnAssignmentDetail.teacherComment" class="student-result-comment">{{ learnAssignmentDetail.teacherComment }}</div>
              </div>
            </div>
          </template>

          <div class="student-submit-section">
            <div class="student-submit-section-title">作业附件</div>
            <input ref="submissionFileInput" type="file" class="student-hidden-file-input" @change="handleSubmissionFileChange">
            <div class="student-upload-box" @click="triggerSubmissionFilePicker">
              <div class="student-upload-icon">⇪</div>
              <div>点击上传添加作业文件</div>
              <small>支持各类文档、图片、代码、压缩包等格式</small>
            </div>
            <div v-if="selectedSubmissionFile" class="student-selected-file-tip">
              已选择：{{ selectedSubmissionFile.name }} {{ selectedSubmissionFile.sizeText ? `(${selectedSubmissionFile.sizeText})` : '' }}
              <button v-if="studentSubmitHasSubmitted && !selectedSubmissionFile.rawFile" class="student-inline-link" @click="downloadSubmittedFile">下载附件</button>
              <button class="student-inline-link danger" @click="handleDeleteSubmittedFile">删除附件</button>
            </div>
          </div>

          <div class="student-submit-section">
            <div class="student-submit-section-title">作业留言 <span>选填</span></div>
            <textarea v-model="submitContentModel" class="student-submit-textarea" placeholder="作业说明作补充或留言使用哦！"></textarea>
          </div>
        </div>
      </div>
    </div>

    <teleport to="body">
      <div v-if="displayReleaseAssignment" class="release-assignment-mask">
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
            <input v-model="releaseTitleModel" class="release-input full" placeholder="请输入作业主题" maxlength="20">
          </div>
          <div class="release-tag-row">
            <button class="release-type-chip" :class="{ active: releaseTypeModel === '个人作业' }" @click="releaseTypeModel = '个人作业'">个人作业</button>
            <button class="release-type-chip" :class="{ active: releaseTypeModel === '小组作业' }" @click="releaseTypeModel = '小组作业'">小组作业</button>
            <button class="release-type-chip" :class="{ active: releaseTypeModel === '测验作业' }" @click="releaseTypeModel = '测验作业'">测验作业</button>
          </div>
        </div>

        <div class="release-section">
          <div class="release-section-title">
            <span class="release-step">2</span>
            <span>作业内容</span>
          </div>
          <textarea v-model="releaseDetailModel" class="release-textarea" placeholder="请输入作业内容、说明和要求" maxlength="1000"></textarea>
          <div class="release-text-count">{{ releaseDetailModel.length }}/1000</div>
          <div class="release-attachment-panel">
            <input ref="releaseAttachmentInput" type="file" class="student-hidden-file-input" @change="handleReleaseAttachmentChange">
            <button class="release-upload-btn" @click="triggerReleaseAttachmentPicker">添加附件</button>
            <div v-if="releaseAttachmentFile" class="release-selected-file">
              <span>{{ releaseAttachmentFile.name }}<template v-if="releaseAttachmentFile.sizeText">（{{ releaseAttachmentFile.sizeText }}）</template></span>
              <button class="student-inline-link danger" @click="removeReleaseAttachment">删除附件</button>
            </div>
          </div>
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
              <input v-model="releaseTagModel" class="release-input" placeholder="请输入标签">
            </div>
            <div class="release-grid-item">
              <label>知识共享协议</label>
              <select v-model="releaseKnowledgeAgreementModel" class="release-select">
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
              <select v-model="releaseEnvironmentModel" class="release-select">
                <option value="">请选择</option>
                <option value="课前预习">课前预习</option>
                <option value="课堂学习">课堂学习</option>
                <option value="课后巩固">课后巩固</option>
              </select>
            </div>
            <div class="release-grid-item">
              <label>所属章节</label>
              <select v-model="releaseChapterModel" class="release-select">
                <option value="">请选择</option>
                <option value="第一章">第一章</option>
                <option value="第二章">第二章</option>
                <option value="第三章">第三章</option>
              </select>
            </div>
          </div>

          <div v-if="!releaseEditMode" class="release-switch-row">
            <label class="release-switch">
              <input v-model="releaseImmediateModel" type="checkbox">
              <span class="release-switch-slider"></span>
            </label>
            <span class="release-switch-label">是否立即发布</span>
          </div>

          <div v-if="releaseEditMode || releaseImmediateModel" class="release-publish-settings">
            <div class="time-settings-row">
              <div class="time-setting-item">
                <label class="release-required">发布时间</label>
                <el-date-picker
                  v-model="releasePublishTimeModel"
                  type="datetime"
                  placeholder="选择日期时间"
                  format="YYYY-MM-DD HH:mm"
                  value-format="YYYY-MM-DD HH:mm"
                  :readonly="releaseEditMode"
                  class="custom-date-picker"
                />
              </div>
              <div class="time-setting-item">
                <label class="release-required">截止日期</label>
                <el-date-picker
                  v-model="releaseDeadlineModel"
                  type="datetime"
                  placeholder="选择日期时间"
                  format="YYYY-MM-DD HH:mm"
                  value-format="YYYY-MM-DD HH:mm"
                  class="custom-date-picker"
                />
              </div>
            </div>

            <div class="release-format-group">
              <div class="release-format-title release-required">作业提交格式</div>
              <label class="release-radio">
                <input v-model="releaseAllowFormatModel" type="radio" value="all">
                <span>所有格式</span>
              </label>
              <label class="release-radio">
                <input v-model="releaseAllowFormatModel" type="radio" value="document">
                <span>查看文档格式</span>
              </label>
              <label class="release-radio">
                <input v-model="releaseAllowFormatModel" type="radio" value="restricted">
                <span>限制学生文档格式</span>
              </label>
            </div>

            <div class="release-grid compact align-center">
              <div class="release-grid-item">
                <label class="release-required">总分</label>
                <input v-model="releaseScoreModel" class="release-input" type="number" min="1" placeholder="100">
              </div>
              <div class="release-grid-item release-inline-switch">
                <label class="release-switch">
                  <input v-model="releaseLateForbiddenModel" type="checkbox">
                  <span class="release-switch-slider"></span>
                </label>
                <span>若超时，禁止提交</span>
              </div>
            </div>

            <div class="release-grid compact">
              <div class="release-grid-item release-inline-switch">
                <label class="release-switch">
                  <input v-model="releaseAiEnabledModel" type="checkbox">
                  <span class="release-switch-slider"></span>
                </label>
                <span>开启AI预批阅</span>
              </div>
            </div>

            <div class="release-grid compact">
              <div class="release-grid-item release-inline-switch">
                <label class="release-switch">
                  <input v-model="releaseDuplicateCheckModel" type="checkbox">
                  <span class="release-switch-slider"></span>
                </label>
                <span>进行查重</span>
              </div>
              <div class="release-grid-item release-inline-switch">
                <label>查重警戒值</label>
                <input v-model="releaseDuplicateThresholdModel" class="release-input threshold" type="number" min="0" max="100">
                <span>%</span>
                <label class="release-switch">
                  <input v-model="releaseAutoReturnModel" type="checkbox">
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
</template>

<style scoped>
button {
  border: none;
  background: transparent;
  cursor: pointer;
}

.releaseAssignment {
  height: 32px;
  padding: 0 16px;
  border-radius: 16px;
  background: #19be6b;
  color: #fff;
  font-size: 13px;
}

.homework-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 8px 0 10px;
}

.activity-number {
  font-size: 13px;
  color: #606266;
}

.teacher-homework-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.teacher-filter-group {
  display: flex;
  gap: 8px;
}

.teacher-filter-button {
  height: 28px;
  padding: 0 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fff;
  color: #606266;
  font-size: 12px;
}

.teacher-filter-button.active {
  color: #409eff;
  border-color: #a0cfff;
  background: #ecf5ff;
}

.homework-box {
  width: 100%;
  margin: 0 0 10px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fff;
  display: flex;
  flex-direction: column;
  overflow: visible;
}

.homework-item {
  width: 100%;
  min-height: 95px;
  padding: 14px 18px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid #f0f2f5;
  box-sizing: border-box;
}

.homework-item:last-child {
  border-bottom: none;
}

.teacher-homework-item {
  min-height: 104px;
}

.homework-logo {
  width: 52px;
  margin: 0 18px 0 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
}

.homework-logo img {
  width: 28px;
  margin: 0 0 8px;
  display: flex;
}

.homework-logo span {
  display: flex;
  font-size: 12px;
  color: #8c8c8c;
}

.assignment-info {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  font-size: 14px;
}

.teacher-assignment-info {
  flex: 1;
  padding-right: 18px;
}

.teacher-assignment-meta {
  margin-top: 8px;
}

.assignment-title-button {
  padding: 0;
  text-align: left;
}

.assignment-title-button:hover .assignment-title {
  color: #409eff;
}

.assignment-title {
  font-size: 16px;
  color: #303133;
  line-height: 1.4;
  margin-bottom: 6px;
}

.assignment-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
}

.assignment-status-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 6px;
  font-size: 12px;
  color: #606266;
}

.teacher-deadline-meta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.teacher-deadline-label,
.teacher-deadline-value {
  color: #8c8c8c;
  font-size: 12px;
  line-height: 1.6;
}

.teacher-deadline-value {
  font-weight: 400;
}

.teacher-assignment-stats {
  min-width: 132px;
  display: flex;
  justify-content: space-between;
  gap: 18px;
  margin-right: 18px;
}

.teacher-stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.teacher-stat-number {
  font-size: 18px;
  color: #409eff;
  line-height: 1;
}

.teacher-stat-label {
  font-size: 12px;
  color: #909399;
}

.teacher-assignment-actions {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-shrink: 0;
  padding-left: 18px;
  border-left: 1px solid #ebeef5;
}

.teacher-publish-button {
  min-width: 52px;
  padding: 0 6px;
  color: #409eff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  line-height: 1.1;
}

.teacher-publish-button:hover {
  color: #66b1ff;
}

.teacher-more-button {
  min-width: 44px;
  padding: 0 8px;
  border-radius: 4px;
  color: #606266;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  line-height: 1;
}

.teacher-more-button:hover {
  color: #409eff;
  background: #f5f7fa;
}

.teacher-action-icon {
  font-size: 18px;
  line-height: 1;
}

.teacher-action-text {
  font-size: 12px;
  line-height: 1;
}

.teacher-more-menu {
  position: absolute;
  top: 36px;
  right: 0;
  z-index: 20;
  width: 108px;
  padding: 6px 0;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
}

.teacher-more-item {
  width: 100%;
  height: 34px;
  padding: 0 14px;
  text-align: left;
  color: #303133;
  font-size: 13px;
  background: #fff;
}

.teacher-more-item:hover {
  background: #f5f7fa;
}

.teacher-more-item.danger {
  color: #f56c6c;
}

.submit-button {
  width: 76px;
  height: 30px;
  margin-left: 18px;
  border: 1px solid #409eff;
  border-radius: 4px;
  background: #409eff;
  color: #fff;
  font-size: 12px;
  flex-shrink: 0;
}

.submit-button:hover {
  background: #66b1ff;
  border-color: #66b1ff;
}

.submit-button.is-submitted {
  border-color: #d9ecff;
  background: #f4faff;
  color: #409eff;
}

.submit-button.is-submitted:hover {
  background: #ecf5ff;
  border-color: #bcd3ff;
}

.homework-empty {
  min-height: 140px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #909399;
  font-size: 14px;
}

.assignment-page {
  position: relative;
  width: 100%;
  padding-bottom: 32px;
  display: flex;
  flex-direction: column;
}

.assignment-page-tabs {
  display: flex;
  gap: 24px;
  border-bottom: 1px solid #ebeef5;
  margin-bottom: 16px;
}

.assignment-page-tab {
  padding: 10px 0;
  font-size: 14px;
  color: #606266;
  border-bottom: 2px solid transparent;
}

.assignment-page-tab.active {
  color: #409eff;
  border-bottom-color: #409eff;
}

.teacher-assignment-summary,
.teacher-ai-setting-card,
.student-assignment-hero,
.student-detail-card,
.student-comment-card,
.student-submit-card,
.teacher-review-panel {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 6px;
}

.teacher-assignment-summary {
  padding: 18px 20px;
  margin-bottom: 16px;
}

.teacher-assignment-summary-title {
  font-size: 28px;
  color: #303133;
  margin-bottom: 10px;
}

.teacher-assignment-summary-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
  font-size: 12px;
  color: #909399;
}

.teacher-assignment-summary-desc {
  font-size: 14px;
  color: #606266;
  line-height: 1.7;
}

.teacher-detail-comment-card {
  margin-bottom: 16px;
}

.teacher-comment-section-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 8px 0 12px;
  font-size: 16px;
  color: #303133;
}

.teacher-comment-section-title span {
  font-size: 12px;
  color: #909399;
}

.teacher-comment-empty {
  margin-top: 0;
}

.teacher-ai-setting-card {
  padding: 20px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.teacher-ai-setting-title {
  font-size: 16px;
  color: #303133;
  line-height: 1.5;
  margin: 0;
}

.teacher-ai-setting-row {
  display: flex;
  align-items: center;
  gap: 14px;
  min-height: 32px;
  padding-left: 2px;
}

.teacher-ai-setting-row .release-switch {
  flex-shrink: 0;
}

.teacher-ai-setting-label {
  font-size: 14px;
  color: #606266;
  line-height: 20px;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}

.teacher-review-panel {
  padding: 16px;
}

.teacher-review-chip-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}

.teacher-review-chip {
  height: 30px;
  padding: 0 14px;
  border-radius: 15px;
  border: 1px solid #dcdfe6;
  background: #fff;
  color: #606266;
  font-size: 12px;
}

.teacher-review-chip.active {
  color: #409eff;
  border-color: #a0cfff;
  background: #ecf5ff;
}

.teacher-review-search {
  margin-left: auto;
  width: 220px;
  height: 32px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 0 10px;
  box-sizing: border-box;
}

.teacher-review-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
}

.teacher-review-action {
  height: 30px;
  padding: 0 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fff;
  color: #606266;
  font-size: 12px;
}

.teacher-review-action.primary {
  background: #409eff;
  border-color: #409eff;
  color: #fff;
}

.teacher-review-table {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  overflow: hidden;
}

.teacher-review-header,
.teacher-review-row {
  display: grid;
  grid-template-columns: 40px 1.4fr 0.8fr 0.7fr 0.7fr 0.7fr 1fr 0.9fr;
  align-items: center;
}

.teacher-review-header {
  min-height: 42px;
  background: #f5f7fa;
  font-size: 12px;
  color: #606266;
  padding: 0 14px;
}

.teacher-review-row {
  min-height: 58px;
  padding: 0 14px;
  border-top: 1px solid #f0f2f5;
  font-size: 13px;
  color: #303133;
}

.teacher-student-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.teacher-student-cell small {
  color: #909399;
}

.teacher-score-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.teacher-score-input {
  width: 52px;
  height: 28px;
  border: none;
  border-bottom: 1px solid #c0c4cc;
  outline: none;
  text-align: center;
}

.teacher-score-input.saving {
  color: #409eff;
  border-bottom-color: #409eff;
}

.teacher-review-ops,
.teacher-file-cell {
  display: flex;
  align-items: center;
}

.teacher-file-cell {
  gap: 6px;
}

.teacher-file-empty {
  color: #909399;
}

.teacher-op-link {
  color: #409eff;
  font-size: 12px;
}

.teacher-op-link.danger {
  color: #f56c6c;
}

.teacher-review-empty {
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 14px;
}

.student-assignment-hero {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
  margin-bottom: 14px;
}

.student-assignment-hero-icon img {
  width: 38px;
  height: 38px;
}

.student-assignment-hero-info {
  flex: 1;
}

.student-assignment-hero-title {
  font-size: 22px;
  color: #303133;
  margin-bottom: 8px;
}

.student-assignment-hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 12px;
  color: #909399;
}

.student-detail-card,
.student-comment-card,
.student-submit-card {
  padding: 20px 24px 18px;
  margin-bottom: 16px;
}

.student-assignment-submit-page {
  margin-top: 16px;
}

.student-submit-heading {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.student-submit-title {
  font-size: 20px;
  color: #303133;
  line-height: 1;
}

.student-submit-tip {
  font-size: 13px;
  color: #909399;
}

.student-detail-title {
  font-size: 18px;
  color: #303133;
  margin-bottom: 12px;
}

.student-detail-text {
  min-height: 120px;
  line-height: 1.8;
  font-size: 14px;
  color: #606266;
}

.student-comment-input {
  width: 100%;
  min-height: 78px;
  padding: 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  box-sizing: border-box;
  resize: vertical;
}

.student-comment-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 14px;
  margin-top: 12px;
  font-size: 12px;
  color: #606266;
}

.student-comment-publish,
.student-submit-confirm {
  height: 32px;
  padding: 0 16px;
  border-radius: 4px;
  background: #409eff;
  color: #fff;
  font-size: 12px;
}

.student-comment-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #909399;
  margin-top: 60px;
}

.student-comment-empty img {
  width: 180px;
  opacity: 0.85;
}

.student-submit-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}

.time-settings-row {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-top: 14px;
}

.time-setting-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #606266;
}

.custom-date-picker {
  width: 220px !important;
}

.student-inline-link,
.student-file-download,
.student-file-delete {
  color: #409eff;
  font-size: 12px;
}

.student-submit-section {
  padding: 18px 0;
  border-top: 1px solid #f0f2f5;
}

.student-submit-section:first-of-type {
  border-top: none;
  padding-top: 0;
}

.student-submit-section-title {
  font-size: 15px;
  color: #303133;
  margin-bottom: 14px;
}

.student-submit-section-title span {
  margin-left: 6px;
  color: #909399;
  font-size: 12px;
}

.student-upload-box {
  min-height: 156px;
  border: 1px dashed #c9d7ee;
  border-radius: 8px;
  background: #fafcff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 8px;
  color: #409eff;
  margin-bottom: 14px;
}

.student-upload-box small {
  color: #909399;
}

.student-hidden-file-input {
  display: none;
}

.student-upload-icon {
  font-size: 34px;
  line-height: 1;
}

.student-submit-textarea {
  width: 100%;
  min-height: 140px;
  padding: 14px 16px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  box-sizing: border-box;
  resize: vertical;
}

.student-submitted-preview {
  font-size: 13px;
  color: #606266;
  line-height: 1.7;
  padding: 14px 16px;
  background: #fafafa;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}

.student-submitted-banner {
  height: 88px;
  border-radius: 8px;
  background: #f5f9ff;
  color: #409eff;
  border: 1px solid #d9ecff;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.student-submitted-file-card {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.student-file-icon {
  width: 34px;
  height: 40px;
  border-radius: 4px;
  background: #ecf5ff;
  color: #409eff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
}

.student-file-meta {
  flex: 1;
}

.student-file-name {
  font-size: 14px;
  color: #303133;
  margin-bottom: 4px;
}

.student-file-size {
  font-size: 12px;
  color: #909399;
}

.student-file-download,
.student-file-delete {
  flex-shrink: 0;
}

.student-file-delete,
.student-inline-link.danger {
  color: #f56c6c;
}

.student-submitted-empty-file {
  font-size: 13px;
  color: #909399;
}

.student-selected-file-tip {
  margin: 12px 0 0;
  color: #606266;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.student-result-box {
  padding: 16px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fafcff;
}

.student-result-score {
  font-size: 20px;
  color: #409eff;
  font-weight: 600;
}

.student-result-comment {
  margin-top: 10px;
  font-size: 13px;
  color: #606266;
  line-height: 1.8;
}

.status-done {
  color: #67c23a;
}

.status-pending {
  color: #e6a23c;
}

.status-danger {
  color: #f56c6c;
}

.release-assignment-mask {
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

.release-assignment {
  width: 700px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.12);
  padding: 0 0 18px;
}

.release-header {
  height: 44px;
  padding: 0 16px;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  color: #303133;
}

.release-close {
  font-size: 22px;
  color: #909399;
}

.release-tabs {
  padding: 12px 16px 0;
}

.release-tab {
  color: #409eff;
  font-size: 13px;
  padding-bottom: 8px;
  border-bottom: 2px solid #409eff;
}

.release-section {
  margin: 12px 16px 0;
  padding: 14px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #fff;
}

.release-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #303133;
  margin-bottom: 14px;
}

.release-step {
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

.release-form-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.release-required::before {
  content: '*';
  color: #f56c6c;
  margin-right: 4px;
}

.release-input,
.release-select,
.release-textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 13px;
  color: #303133;
  background: #fff;
}

.release-input,
.release-select {
  height: 36px;
  padding: 0 12px;
}

.release-textarea {
  min-height: 110px;
  padding: 10px 12px;
  resize: vertical;
  line-height: 1.6;
}

.release-text-count {
  text-align: right;
  font-size: 12px;
  color: #909399;
  margin-top: 6px;
}

.assignment-resource-row {
  margin-top: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 13px;
  color: #606266;
}

.assignment-resource-label {
  color: #909399;
}

.student-resource-row {
  margin-top: 18px;
}

.release-attachment-panel {
  margin-top: 14px;
  padding: 14px;
  border: 1px dashed #dbeafe;
  border-radius: 8px;
  background: #f8fbff;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}

.release-upload-btn {
  height: 34px;
  padding: 0 16px;
  border: 1px solid #bfdcff;
  border-radius: 6px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 13px;
}

.release-selected-file {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 13px;
  color: #374151;
}

.release-tag-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.release-type-chip {
  height: 30px;
  padding: 0 14px;
  border: 1px solid #dcdfe6;
  border-radius: 15px;
  font-size: 12px;
  color: #606266;
  background: #fff;
}

.release-type-chip.active {
  color: #409eff;
  border-color: #a0cfff;
  background: #ecf5ff;
}

.release-collapse {
  margin: 12px 16px 0;
  height: 42px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  background: #fafafa;
  font-size: 13px;
  color: #606266;
}

.release-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 16px;
}

.release-grid.compact {
  align-items: center;
  margin-top: 12px;
}

.release-grid.compact.align-center {
  align-items: center;
}

.release-grid-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 13px;
  color: #606266;
}

.release-inline-switch {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.release-grid.compact.align-center .release-inline-switch {
  margin-top: 22px; /* Align switch vertically with input */
}

.release-switch-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 18px;
}

.release-switch {
  position: relative;
  display: inline-flex;
  width: 40px;
  height: 22px;
}

.release-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.release-switch-slider {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: #dcdfe6;
  transition: all 0.2s ease;
}

.release-switch-slider::before {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  left: 3px;
  top: 3px;
  border-radius: 50%;
  background: #fff;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.release-switch input:checked + .release-switch-slider {
  background: #409eff;
}

.release-switch input:checked + .release-switch-slider::before {
  transform: translateX(18px);
}

.release-switch-label {
  font-size: 13px;
  color: #f56c6c;
}

.release-input-readonly {
  background: #f5f7fa;
  color: #909399;
  border-color: #e4e7ed;
  cursor: not-allowed;
}

.release-publish-settings {
  margin-top: 14px;
}

.release-format-group {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.release-format-title {
  font-size: 13px;
  color: #606266;
}

.release-radio {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #606266;
}

.release-inline-switch {
  flex-direction: row;
  align-items: center;
  gap: 10px;
}

.release-input.threshold {
  width: 70px;
}

.release-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 16px 0;
}

.release-footer-btn {
  min-width: 56px;
  height: 32px;
  padding: 0 16px;
  border-radius: 4px;
  font-size: 13px;
}

.release-footer-btn.cancel {
  border: 1px solid #dcdfe6;
  color: #606266;
  background: #fff;
}

.release-footer-btn.confirm {
  background: #409eff;
  color: #fff;
}
</style>
