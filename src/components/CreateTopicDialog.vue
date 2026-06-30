<script setup>
import { ref, onMounted, computed, watch, nextTick } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { ElMessage } from 'element-plus';
import axios from 'axios';
import { QuillEditor } from '@vueup/vue-quill';
import '@vueup/vue-quill/dist/vue-quill.snow.css';

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
const quillRef = ref(null);

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
  if (!content.value.trim() || content.value === '<p><br></p>') {
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

        <!-- 内容编辑区 - 使用 Quill 编辑器（启用默认工具栏） -->
        <div class="form-group">
          <div class="editor-container">
            <QuillEditor 
              ref="quillRef"
              v-model:content="content"
              content-type="html"
              :options="{
                theme: 'snow',
                modules: {
                  toolbar: [
                    ['bold', 'italic', 'underline', 'strike'],
                    ['code-block', 'blockquote'],
                    [{ 'header': 2 }, { 'header': 3 }],
                    [{ 'align': [] }],
                    ['clean']
                  ]
                },
                placeholder: '请输入话题内容...'
              }"
              style="min-height: 350px;"
            />
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

/* 内容编辑区 */
.editor-container {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: white;
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
  transition: all 0.15s ease;
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

/* Quill 编辑器样式覆盖 */
:deep(.ql-container) {
  border: none !important;
  font-size: 14px;
}

:deep(.ql-toolbar) {
  border: none !important;
  border-bottom: 1px solid #dcdfe6 !important;
  background-color: #f5f7fa;
}

:deep(.ql-editor) {
  min-height: 350px;
  padding: 15px;
}

:deep(.ql-editor.ql-blank::before) {
  color: #c0c4cc;
  font-style: normal;
}

/* ========== 关键修复：强制显示格式化文字 ========== */
:deep(.ql-editor strong) {
  font-weight: 700 !important;
  color: inherit;
}

:deep(.ql-editor b) {
  font-weight: 700 !important;
  color: inherit;
}

:deep(.ql-editor em) {
  font-style: italic !important;
  color: inherit;
}

:deep(.ql-editor i) {
  font-style: italic !important;
  color: inherit;
}

:deep(.ql-editor u) {
  text-decoration: underline !important;
  color: inherit;
}

:deep(.ql-editor s) {
  text-decoration: line-through !important;
  color: inherit;
}

:deep(.ql-editor code) {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  background-color: rgba(0, 0, 0, 0.06);
  padding: 2px 4px;
  border-radius: 3px;
  font-size: 0.9em;
}

:deep(.ql-editor blockquote) {
  border-left: 4px solid #409eff;
  padding-left: 16px;
  margin-left: 0;
  color: #606266;
  font-style: italic;
}
</style>
