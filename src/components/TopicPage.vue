<script setup>
import { ref, computed, onMounted } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { ElMessage, ElMessageBox } from 'element-plus';
import axios from 'axios';
import CreateTopicDialog from './CreateTopicDialog.vue';
import TopicDetailDialog from './TopicDetailDialog.vue';

const props = defineProps({
  courseId: String,
  courseName: String
});

const userStore = useUserStore();
const identity = computed(() => userStore.account?.identity || '学生');
const topics = ref([]);
const loading = ref(false);
const showCreateDialog = ref(false);
const showDetailDialog = ref(false);
const currentTopic = ref(null);
const courseLocked = ref(false);
const showDropdown = ref(null);

const fetchTopics = async () => {
  loading.value = true;
  try {
    const response = await axios.post('http://localhost:8080/topic/list', {
      courseId: props.courseId
    });
    const data = response.data;
    if (data.success) {
      topics.value = data.topics || [];
    } else {
      ElMessage.error(data.message || '获取话题列表失败');
    }
  } catch (error) {
    console.error('获取话题列表失败:', error);
    ElMessage.error('服务器错误，请稍后重试');
  } finally {
    loading.value = false;
  }
};

const handleCreateTopic = () => {
  currentTopic.value = null;
  showCreateDialog.value = true;
};

const handleTopicCreated = () => {
  showCreateDialog.value = false;
  fetchTopics();
};

const handleViewTopic = (topic) => {
  currentTopic.value = topic;
  showDetailDialog.value = true;
};

const handleTopicUpdated = () => {
  showDetailDialog.value = false;
  currentTopic.value = null;
  fetchTopics();
};

const handlePinTopic = async (topic) => {
  try {
    const response = await axios.post('http://localhost:8080/topic/pin', {
      topicId: topic.topicId,
      isPinned: !topic.isPinned
    });
    const data = response.data;
    if (data.success) {
      ElMessage.success(data.message);
      fetchTopics();
    } else {
      ElMessage.error(data.message || '操作失败');
    }
  } catch (error) {
    console.error('置顶操作失败:', error);
    ElMessage.error('服务器错误，请稍后重试');
  }
  showDropdown.value = null;
};

const handleLockTopic = async (topic) => {
  try {
    const response = await axios.post('http://localhost:8080/topic/lock', {
      topicId: topic.topicId,
      isLocked: !topic.isLocked
    });
    const data = response.data;
    if (data.success) {
      ElMessage.success(data.message);
      fetchTopics();
    } else {
      ElMessage.error(data.message || '操作失败');
    }
  } catch (error) {
    console.error('锁定操作失败:', error);
    ElMessage.error('服务器错误，请稍后重试');
  }
  showDropdown.value = null;
};

const handleDeleteTopic = async (topic) => {
  showDropdown.value = null;
  try {
    await ElMessageBox.confirm('确定要删除这个话题吗？', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    });

    const response = await axios.post('http://localhost:8080/topic/delete', {
      topicId: topic.topicId,
      authorId: userStore.account?.accountId,
      identity: identity.value
    });
    const data = response.data;
    if (data.success) {
      ElMessage.success(data.message);
      fetchTopics();
    } else {
      ElMessage.error(data.message || '删除失败');
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除话题失败:', error);
      ElMessage.error('服务器错误，请稍后重试');
    }
  }
};

const handleEditTopic = (topic) => {
  showDropdown.value = null;
  currentTopic.value = topic;
  showCreateDialog.value = true;
};

const canEditTopic = (topic) => {
  return identity.value === '老师' || topic.authorId === userStore.account?.accountId;
};

const canDeleteTopic = (topic) => {
  return identity.value === '老师' || topic.authorId === userStore.account?.accountId;
};

const toggleDropdown = (topicId) => {
  showDropdown.value = showDropdown.value === topicId ? null : topicId;
};

const handleToggleAllDiscussion = async () => {
  // This would lock/unlock all topics in the course
  // For now, we'll just show a message
  ElMessage.info(courseLocked.value ? '已禁止学生讨论' : '已允许学生讨论');
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
  fetchTopics();
});
</script>

<template>
  <div class="topic-page">
    <!-- 教师控制栏 -->
    <div class="teacher-controls" v-if="identity === '老师'">
      <label class="lock-toggle">
        <input type="checkbox" v-model="courseLocked" @change="handleToggleAllDiscussion" />
        <span>禁止学生讨论</span>
      </label>
    </div>

    <!-- 话题列表头部 -->
    <div class="topic-header">
      <div class="topic-count">共{{ topics.length }}个活动</div>
      <button class="add-topic-btn" @click="handleCreateTopic">
        + 添加话题
      </button>
    </div>

    <!-- 话题列表 -->
    <div class="topic-list" v-loading="loading">
      <div v-if="topics.length === 0 && !loading" class="no-topics">
        <!-- 空状态不显示内容，由外部控制 -->
      </div>

      <div v-for="topic in topics" :key="topic.topicId" class="topic-item">
        <div class="topic-icon">
          <div class="icon-circle">
            <span>#</span>
          </div>
          <span class="icon-label">话题</span>
        </div>
        <div class="topic-info" @click="handleViewTopic(topic)">
          <div class="topic-title">{{ topic.title }}</div>
          <div class="topic-status">
            <span class="status-tag">未参与</span>
          </div>
        </div>
        <div class="topic-menu">
          <button class="more-btn" @click.stop="toggleDropdown(topic.topicId)">
            •••
          </button>
          <span class="more-label">更多</span>
          
          <!-- 下拉菜单 -->
          <div class="dropdown-menu" v-if="showDropdown === topic.topicId">
            <button v-if="identity === '老师'" @click="handlePinTopic(topic)">
              {{ topic.isPinned ? '取消置顶' : '置顶' }}
            </button>
            <button v-if="canEditTopic(topic)" @click="handleEditTopic(topic)">
              编辑
            </button>
            <button v-if="canDeleteTopic(topic)" @click="handleDeleteTopic(topic)" class="delete-btn">
              删除
            </button>
          </div>
        </div>
      </div>
    </div>

    <CreateTopicDialog
      v-if="showCreateDialog"
      :course-id="courseId"
      :edit-topic="currentTopic"
      @close="showCreateDialog = false"
      @created="handleTopicCreated"
    />

    <TopicDetailDialog
      v-if="showDetailDialog && currentTopic"
      :topic="currentTopic"
      @close="showDetailDialog = false"
      @updated="handleTopicUpdated"
    />
  </div>
</template>

<style scoped>
.topic-page {
  padding: 20px;
  background-color: #fff;
}

.teacher-controls {
  padding: 12px 0;
  border-bottom: 1px solid #e8e8e8;
  margin-bottom: 15px;
}

.lock-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #606266;
}

.lock-toggle input {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.topic-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.topic-count {
  font-size: 14px;
  color: #909399;
}

.add-topic-btn {
  background-color: #67c23a;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.add-topic-btn:hover {
  background-color: #85ce61;
}

.topic-list {
  min-height: 100px;
}

.topic-item {
  display: flex;
  align-items: center;
  padding: 15px;
  margin-bottom: 10px;
  background-color: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  transition: all 0.3s;
}

.topic-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.topic-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: 15px;
}

.icon-circle {
  width: 48px;
  height: 48px;
  background-color: #f5a623;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  font-size: 20px;
  font-weight: bold;
}

.icon-label {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.topic-info {
  flex: 1;
  cursor: pointer;
}

.topic-title {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 6px;
}

.topic-status {
  display: flex;
  gap: 10px;
}

.status-tag {
  background-color: #f0f0f0;
  color: #909399;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.topic-menu {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-left: 15px;
}

.more-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: #909399;
  cursor: pointer;
  padding: 5px;
  letter-spacing: 2px;
}

.more-btn:hover {
  color: #303133;
}

.more-label {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  z-index: 100;
  min-width: 100px;
}

.dropdown-menu button {
  display: block;
  width: 100%;
  padding: 10px 15px;
  text-align: left;
  background: none;
  border: none;
  font-size: 14px;
  color: #303133;
  cursor: pointer;
}

.dropdown-menu button:hover {
  background-color: #f5f7fa;
}

.dropdown-menu .delete-btn {
  color: #f56c6c;
}

.dropdown-menu .delete-btn:hover {
  background-color: #fef0f0;
}
</style>
