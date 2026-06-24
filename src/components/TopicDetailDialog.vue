<script setup>
import { ref, computed, onMounted } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { ElMessage, ElMessageBox } from 'element-plus';
import axios from 'axios';

const props = defineProps({
  topic: Object
});

const emit = defineEmits(['close', 'updated']);

const userStore = useUserStore();
const identity = computed(() => userStore.account?.identity || '学生');
const topicDetail = ref(null);
const replies = ref([]);
const loading = ref(false);
const replyContent = ref('');
const isAnonymous = ref(false);
const submittingReply = ref(false);

const fetchTopicDetail = async () => {
  loading.value = true;
  try {
    const response = await axios.post('http://localhost:8080/topic/detail', {
      topicId: props.topic.topicId
    });
    const data = response.data;
    if (data.success) {
      topicDetail.value = data.topic;
      replies.value = data.replies || [];
    } else {
      ElMessage.error(data.message || '获取话题详情失败');
    }
  } catch (error) {
    console.error('获取话题详情失败:', error);
    ElMessage.error('服务器错误，请稍后重试');
  } finally {
    loading.value = false;
  }
};

const handleSubmitReply = async () => {
  if (!replyContent.value.trim()) {
    ElMessage.warning('请输入回复内容');
    return;
  }

  submittingReply.value = true;
  try {
    const response = await axios.post('http://localhost:8080/topic/reply/add', {
      topicId: props.topic.topicId,
      authorId: userStore.account?.accountId,
      authorName: userStore.account?.name,
      content: replyContent.value.trim(),
      isAnonymous: isAnonymous.value
    });
    const data = response.data;
    if (data.success) {
      ElMessage.success(data.message);
      replyContent.value = '';
      isAnonymous.value = false;
      fetchTopicDetail();
    } else {
      ElMessage.error(data.message || '回复失败');
    }
  } catch (error) {
    console.error('回复失败:', error);
    ElMessage.error('服务器错误，请稍后重试');
  } finally {
    submittingReply.value = false;
  }
};

const handleDeleteReply = async (reply) => {
  try {
    await ElMessageBox.confirm('确定要删除这条回复吗？', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    });

    const response = await axios.post('http://localhost:8080/topic/reply/delete', {
      replyId: reply.replyId,
      authorId: userStore.account?.accountId,
      identity: identity.value
    });
    const data = response.data;
    if (data.success) {
      ElMessage.success(data.message);
      fetchTopicDetail();
    } else {
      ElMessage.error(data.message || '删除失败');
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除回复失败:', error);
      ElMessage.error('服务器错误，请稍后重试');
    }
  }
};

const canDeleteReply = (reply) => {
  return identity.value === '老师' || reply.authorId === userStore.account?.accountId;
};

const handleClose = () => {
  emit('close');
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

onMounted(() => {
  fetchTopicDetail();
});
</script>

<template>
  <!-- 灰色遮罩层 - 覆盖整个页面 -->
  <div class="modal-mask"></div>
  
  <!-- 表单内容 - 显示在遮罩层上面 -->
  <div class="modal-wrapper">
    <div class="modal-container">
      <div class="dialog-header">
        <div class="header-left">
          <div class="topic-icon">
            <div class="icon-circle">
              <span>#</span>
            </div>
          </div>
          <h3>{{ topicDetail?.title }}</h3>
        </div>
        <button class="close-btn" @click="handleClose">&times;</button>
      </div>
      <div class="dialog-body" v-loading="loading">
        <div v-if="topicDetail" class="topic-detail">
          <div class="topic-meta">
            <span class="author">{{ topicDetail.isAnonymous ? '匿名用户' : topicDetail.authorName }}</span>
            <span class="divider">|</span>
            <span class="time">{{ formatDate(topicDetail.createTime) }}</span>
            <span class="divider">|</span>
            <span class="reply-count">{{ topicDetail.replyCount || 0 }} 回复</span>
          </div>
          <div class="topic-content">
            {{ topicDetail.content }}
          </div>

          <!-- 回复输入框 -->
          <div class="reply-form" v-if="!topicDetail.isLocked">
            <textarea 
              v-model="replyContent" 
              placeholder="输入回复内容..." 
              rows="4"
            ></textarea>
            <div class="reply-form-footer">
              <label class="anonymous-checkbox">
                <input type="checkbox" v-model="isAnonymous" />
                匿名回复
              </label>
              <button 
                class="btn-submit-reply" 
                @click="handleSubmitReply" 
                :disabled="submittingReply"
              >
                {{ submittingReply ? '发送中...' : '回复' }}
              </button>
            </div>
          </div>
          <div v-else class="locked-notice">
            话题已锁定，无法回复
          </div>

          <!-- 回复列表 -->
          <div class="replies-section">
            <h4>全部回复 ({{ replies.length }})</h4>
            
            <div v-for="reply in replies" :key="reply.replyId" class="reply-item">
              <div class="reply-header">
                <div class="reply-author-info">
                  <div class="reply-avatar">
                    {{ reply.isAnonymous ? '匿' : (reply.authorName?.[0] || '用') }}
                  </div>
                  <div class="reply-author-details">
                    <span class="reply-author">{{ reply.isAnonymous ? '匿名用户' : reply.authorName }}</span>
                    <span class="reply-time">{{ formatDate(reply.createTime) }}</span>
                  </div>
                </div>
                <button 
                  v-if="canDeleteReply(reply)" 
                  class="btn-delete-reply" 
                  @click="handleDeleteReply(reply)"
                >
                  删除
                </button>
              </div>
              <div class="reply-content">
                {{ reply.content }}
              </div>
            </div>

            <div v-if="replies.length === 0" class="no-replies">
              暂无回复，快来发表第一条评论吧！
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 灰色遮罩层 - 覆盖整个页面 */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999;
}

/* 表单容器 - 显示在遮罩层上面 */
.modal-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  pointer-events: none;
}

/* 表单内容 */
.modal-container {
  background: white;
  border-radius: 8px;
  width: 650px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  pointer-events: auto;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e8e8e8;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.topic-icon .icon-circle {
  width: 36px;
  height: 36px;
  background-color: #f5a623;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  font-size: 16px;
  font-weight: bold;
}

.dialog-header h3 {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #909399;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: #303133;
}

.dialog-body {
  padding: 20px;
}

.topic-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #909399;
  margin-bottom: 15px;
}

.divider {
  color: #dcdfe6;
}

.topic-content {
  font-size: 15px;
  color: #303133;
  line-height: 1.6;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 25px;
  white-space: pre-wrap;
}

.reply-form {
  margin-bottom: 25px;
  padding-bottom: 25px;
  border-bottom: 1px solid #e8e8e8;
}

.reply-form textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  font-size: 14px;
  color: #303133;
  box-sizing: border-box;
  resize: vertical;
  margin-bottom: 10px;
}

.reply-form textarea:focus {
  outline: none;
  border-color: #409eff;
}

.reply-form-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.anonymous-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #606266;
  cursor: pointer;
}

.anonymous-checkbox input {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.btn-submit-reply {
  padding: 8px 20px;
  background-color: #409eff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
}

.btn-submit-reply:hover {
  background-color: #66b1ff;
}

.btn-submit-reply:disabled {
  background-color: #a0cfff;
  cursor: not-allowed;
}

.locked-notice {
  text-align: center;
  color: #ffa94d;
  padding: 20px;
  background-color: #fff8f0;
  border-radius: 8px;
  margin-bottom: 25px;
}

.replies-section h4 {
  margin: 0 0 15px 0;
  font-size: 16px;
  color: #303133;
  font-weight: 500;
}

.reply-item {
  padding: 15px;
  margin-bottom: 15px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.reply-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}

.reply-author-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.reply-avatar {
  width: 36px;
  height: 36px;
  background-color: #409eff;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  font-size: 14px;
  font-weight: 500;
}

.reply-author-details {
  display: flex;
  flex-direction: column;
}

.reply-author {
  font-weight: 500;
  color: #303133;
  font-size: 14px;
}

.reply-time {
  font-size: 12px;
  color: #909399;
}

.btn-delete-reply {
  padding: 4px 10px;
  background-color: #fff;
  color: #f56c6c;
  border: 1px solid #f56c6c;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.btn-delete-reply:hover {
  background-color: #fef0f0;
}

.reply-content {
  font-size: 14px;
  color: #303133;
  line-height: 1.5;
  white-space: pre-wrap;
  padding-left: 46px;
}

.no-replies {
  text-align: center;
  color: #909399;
  padding: 30px;
  font-size: 14px;
}
</style>
