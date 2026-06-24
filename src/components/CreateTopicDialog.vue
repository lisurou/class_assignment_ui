<script setup>
import { ref, onMounted, computed } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { ElMessage } from 'element-plus';
import axios from 'axios';

const props = defineProps({
  courseId: String,
  editTopic: Object
});

const emit = defineEmits(['close', 'created']);

const userStore = useUserStore();
const title = ref('');
const content = ref('');
const isAnonymous = ref(false);
const loading = ref(false);
const isEditMode = ref(false);

const titleCharCount = computed(() => title.value.length);

onMounted(() => {
  if (props.editTopic) {
    isEditMode.value = true;
    title.value = props.editTopic.title || '';
    content.value = props.editTopic.content || '';
    isAnonymous.value = props.editTopic.isAnonymous || false;
  }
});

const handleSubmit = async () => {
  if (!title.value.trim()) {
    ElMessage.warning('请输入话题标题');
    return;
  }
  if (!content.value.trim()) {
    ElMessage.warning('请输入话题内容');
    return;
  }

  loading.value = true;
  try {
    let response;
    if (isEditMode.value) {
      response = await axios.post('http://localhost:8080/topic/update', {
        topicId: props.editTopic.topicId,
        authorId: userStore.account?.accountId,
        title: title.value.trim(),
        content: content.value.trim()
      });
    } else {
      response = await axios.post('http://localhost:8080/topic/create', {
        courseId: props.courseId,
        authorId: userStore.account?.accountId,
        authorName: userStore.account?.name,
        title: title.value.trim(),
        content: content.value.trim(),
        isAnonymous: isAnonymous.value
      });
    }
    const data = response.data;
    if (data.success) {
      ElMessage.success(data.message);
      emit('created');
    } else {
      ElMessage.error(data.message || (isEditMode.value ? '修改话题失败' : '创建话题失败'));
    }
  } catch (error) {
    console.error(isEditMode.value ? '修改话题失败:' : '创建话题失败:', error);
    ElMessage.error('服务器错误，请稍后重试');
  } finally {
    loading.value = false;
  }
};

const handleClose = () => {
  emit('close');
};
</script>

<template>
  <Teleport to="body">
    <!-- 灰色遮罩层 - 覆盖整个页面 -->
    <div class="modal-mask"></div>
    
    <!-- 表单内容 - 显示在遮罩层上面 -->
    <div class="modal-wrapper">
      <div class="modal-container">
      <div class="dialog-header">
        <h3>{{ isEditMode ? '编辑话题' : '添加话题' }}</h3>
        <button class="close-btn" @click="handleClose">&times;</button>
      </div>
      <div class="dialog-body">
        <!-- 标题输入 -->
        <div class="form-group">
          <div class="title-input-wrapper">
            <span class="required-mark">*</span>
            <label>话题标题</label>
            <div class="title-input-container">
              <input 
                v-model="title" 
                type="text" 
                placeholder="请输入话题标题" 
                maxlength="75"
                class="title-input"
              />
              <span class="char-count">{{ titleCharCount }}/75</span>
            </div>
          </div>
        </div>

        <!-- 编辑器工具栏 -->
        <div class="editor-toolbar">
          <div class="toolbar-group">
            <button class="toolbar-btn" title="清除格式">
              <span>T</span>
            </button>
            <button class="toolbar-btn" title="字体颜色">
              <span>A</span>
            </button>
            <button class="toolbar-btn" title="背景颜色">
              <span>A</span>
            </button>
          </div>
          <div class="toolbar-divider"></div>
          <div class="toolbar-group">
            <button class="toolbar-btn" title="加粗">
              <span class="bold-text">B</span>
            </button>
            <button class="toolbar-btn" title="斜体">
              <span class="italic-text">I</span>
            </button>
            <button class="toolbar-btn" title="下划线">
              <span class="underline-text">U</span>
            </button>
          </div>
          <div class="toolbar-divider"></div>
          <div class="toolbar-group">
            <button class="toolbar-btn" title="代码">
              <span>{}</span>
            </button>
            <button class="toolbar-btn" title="全屏">
              <span>⛶</span>
            </button>
          </div>
        </div>

        <!-- 内容编辑区 -->
        <div class="form-group">
          <div class="editor-container">
            <textarea 
              v-model="content" 
              placeholder="请输入话题内容" 
              rows="12"
              class="content-editor"
            ></textarea>
          </div>
        </div>

        <!-- 底部工具栏 -->
        <div class="editor-footer">
          <div class="footer-left">
            <button class="footer-btn" title="左对齐">
              <span>≡</span>
            </button>
            <button class="footer-btn" title="居中">
              <span>≡</span>
            </button>
            <button class="footer-btn" title="右对齐">
              <span>≡</span>
            </button>
          </div>
          <div class="footer-divider"></div>
          <div class="footer-group">
            <button class="footer-btn" title="标题">
              <span>H2</span>
            </button>
            <button class="footer-btn" title="标题3">
              <span>H3</span>
            </button>
          </div>
          <div class="footer-divider"></div>
          <div class="footer-group">
            <button class="footer-btn" title="引用">
              <span>❝</span>
            </button>
            <button class="footer-btn" title="分割线">
              <span>—</span>
            </button>
          </div>
          <div class="footer-divider"></div>
          <div class="footer-group">
            <button class="footer-btn" title="插入图片">
              <span>🖼</span>
            </button>
            <button class="footer-btn" title="附件">
              <span>📎 附件</span>
            </button>
            <button class="footer-btn" title="公式">
              <span>∑ 公式</span>
            </button>
          </div>
        </div>
      </div>
      <div class="dialog-footer">
        <button class="btn-cancel" @click="handleClose">取消</button>
        <button class="btn-submit" @click="handleSubmit" :disabled="loading">
          {{ loading ? '提交中...' : '确定' }}
        </button>
      </div>
    </div>
  </div>
  </Teleport>
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
  width: 550px;
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

.form-group {
  margin-bottom: 15px;
}

.title-input-wrapper {
  display: flex;
  align-items: center;
  gap: 10px;
}

.required-mark {
  color: #f56c6c;
  font-size: 14px;
}

.title-input-wrapper label {
  font-weight: 500;
  color: #303133;
  font-size: 14px;
  white-space: nowrap;
}

.title-input-container {
  flex: 1;
  display: flex;
  align-items: center;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 0 12px;
}

.title-input {
  flex: 1;
  border: none;
  padding: 10px 0;
  font-size: 14px;
  color: #303133;
  outline: none;
}

.title-input::placeholder {
  color: #c0c4cc;
}

.char-count {
  color: #909399;
  font-size: 12px;
  margin-left: 10px;
}

/* 编辑器工具栏 */
.editor-toolbar {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background-color: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-bottom: none;
  border-radius: 4px 4px 0 0;
  gap: 5px;
  flex-wrap: wrap;
}

.toolbar-group {
  display: flex;
  gap: 2px;
}

.toolbar-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: #606266;
}

.toolbar-btn:hover {
  background-color: #e9ecef;
  border-color: #dcdfe6;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background-color: #dcdfe6;
  margin: 0 5px;
}

.bold-text {
  font-weight: bold;
}

.italic-text {
  font-style: italic;
}

.underline-text {
  text-decoration: underline;
}

/* 内容编辑区 */
.editor-container {
  border: 1px solid #dcdfe6;
  border-top: none;
  border-radius: 0 0 4px 4px;
}

.content-editor {
  width: 100%;
  min-height: 350px;
  padding: 15px;
  border: none;
  font-size: 14px;
  color: #303133;
  box-sizing: border-box;
  resize: vertical;
  outline: none;
  font-family: inherit;
  line-height: 1.6;
}

.content-editor::placeholder {
  color: #c0c4cc;
}

/* 底部工具栏 */
.editor-footer {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background-color: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-top: none;
  border-radius: 0 0 4px 4px;
  gap: 5px;
  flex-wrap: wrap;
}

.footer-left {
  display: flex;
  gap: 2px;
}

.footer-group {
  display: flex;
  gap: 2px;
}

.footer-divider {
  width: 1px;
  height: 24px;
  background-color: #dcdfe6;
  margin: 0 5px;
}

.footer-btn {
  height: 32px;
  padding: 0 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
}

.footer-btn:hover {
  background-color: #e9ecef;
  border-color: #dcdfe6;
}

.footer-left .footer-btn {
  width: 32px;
  padding: 0;
}

/* 对话框底部 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 15px 20px;
  border-top: 1px solid #e8e8e8;
}

.btn-cancel,
.btn-submit {
  padding: 8px 24px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  border: none;
}

.btn-cancel {
  background-color: #fff;
  color: #606266;
  border: 1px solid #dcdfe6;
}

.btn-cancel:hover {
  background-color: #f5f7fa;
}

.btn-submit {
  background-color: #409eff;
  color: white;
}

.btn-submit:hover {
  background-color: #66b1ff;
}

.btn-submit:disabled {
  background-color: #a0cfff;
  cursor: not-allowed;
}
</style>
