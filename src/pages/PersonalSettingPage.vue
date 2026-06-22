<script setup>
import { ElMessage, ElIcon } from 'element-plus';
import { ArrowRight } from '@element-plus/icons-vue';
//路由实例
import {useRouter} from "vue-router";
import {ref} from "vue";
import {useUserStore} from '@/stores/userStore';
import '@/iconfont/font_4980648_74xoiknacif/iconfont.css';
import axios from 'axios';

const userStore = useUserStore();
const selectedRole = ref("学生");
const originalRole = ref("学生");

let newPhone = ref('');
let newName = ref('');
let newStudentId = ref('');
let newSchool = ref('');
let newCollege = ref('');
let newMajor = ref('');
let newClasses = ref('');
let newGrade = ref('');
let newEnrollment = ref('');

let isGoToSet = ref(false);
let isEdit = ref(false);
let isChangePhone = ref(false);
let isChangePassword = ref(false);
const router = useRouter()
const state = ref('账户设置');

function goToLogin() {
  userStore.logout(); // 调用退出登录的方法，清除信息
  router.push('/login')
}

function goToCourse() {
  router.push('/course')
}

function handleEdit() {
  isEdit.value = true;
  newName.value = userStore.account?.name || '';
  newStudentId.value = userStore.account?.studentId || '';
  newSchool.value = userStore.account?.school || '';
  newCollege.value = userStore.account?.college || '';
  newMajor.value = userStore.account?.major || '';
  newClasses.value = userStore.account?.classes || '';
  newGrade.value = userStore.account?.grade || '1年级'; // 默认值
  newEnrollment.value = userStore.account?.enrollment || '';
}

if (userStore.account?.identity) {
  selectedRole.value = userStore.account?.identity;
  originalRole.value = userStore.account?.identity; // 同时更新原始角色
}
const successMessage = ref('');
const handleConfirmChangeIdentity = async () => {

  try {
    const identityResponse = await axios.post('http://localhost:8080/change-identity', {
      accountId: userStore.account?.accountId,
      identity: selectedRole.value
    });
    const data = identityResponse.data
    if (data.success) {
     userStore.setAccount(data.account);
      isGoToSet.value = false;
      successMessage.value = data.message;
      ElMessage.success(successMessage.value);
      userStore.setAccount(userStore.account);
    } else {
      errorMessage.value = data.message
      console.log(errorMessage.value)
      ElMessage.error(errorMessage.value);
    }
  } catch (error) {
    console.error('角色变更请求失败:', error);
    errorMessage.value = '服务器连接失败，请稍后重试';
    ElMessage.error(errorMessage.value);
  } finally {
    isLoading.value = false
  }
};


const errorMessage = ref('')
const isLoading = ref(false);

const handleSaveBasicInformation = async () => {
  isLoading.value = true
  try {
    const requestData = {
      accountId: userStore.account?.accountId,
      name: newName.value,
      studentId: newStudentId.value,
      school: newSchool.value,
      college: newCollege.value,
      major: newMajor.value,
      classes: newClasses.value,
      grade: newGrade.value,
      enrollment: newEnrollment.value,
    }
    const basicInformationResponse = await axios.post("http://localhost:8080/change-basic-information", requestData)
    const data = basicInformationResponse.data
    if (data.success && userStore.account) {
      userStore.account.name = newName.value;
      userStore.account.studentId = newStudentId.value;
      userStore.account.school = newSchool.value;
      userStore.account.college = newCollege.value;
      userStore.account.major = newMajor.value;
      userStore.account.classes = newClasses.value;
      userStore.account.grade = newGrade.value;
      userStore.account.enrollment = newEnrollment.value;
      isEdit.value = false;

      newName.value = '';
      newStudentId.value = '';
      newSchool.value = '';
      newCollege.value = '';
      newMajor.value = '';
      newClasses.value = '';
      newGrade.value = '';
      newEnrollment.value = '';
      ElMessage.success('基础信息编辑保存成功');
    } else {
      errorMessage.value = data.message;
      console.log(errorMessage.value)
      ElMessage.error(errorMessage.value);
    }
  } catch (error) {
    console.error('基础信息编辑保存失败', error);
    errorMessage.value = '服务器连接失败，请稍后重试';
    ElMessage.error(errorMessage.value);
  } finally {
    isLoading.value = false;
  }
}

const newPassword = ref('');
const confirmNewPassword = ref('');
const validatePassword = (newPassword, confirmNewPassword) => {
  if (newPassword.value !== confirmNewPassword.value) {
    errorMessage.value = '两次输入的密码不一致';
    return false;
  } else if (newPassword.value.length < 6) {
    errorMessage.value = '密码长度应不少于6位';
    return false;
  }
  return true;
}
const handleSaveChangePassword = async () => {
  if (!validatePassword(newPassword, confirmNewPassword)) {
    return;
  }
  isLoading.value = true
  try {
    const changePasswordResponse = await axios.post("http://localhost:8080/change-password", {
      accountId: userStore.account?.accountId,
      password: newPassword.value
    });
    const data = changePasswordResponse.data
    if (data.success) {
      ElMessage.success('密码修改成功');
      if (userStore.account) userStore.account.password = newPassword.value;
      isChangePassword = false;
    } else {
      errorMessage.value = data.message;
      ElMessage.error(errorMessage.value);
    }
  } catch (error) {
    console.error('修改密码请求失败', error)
    errorMessage.value = '服务器连接失败，请稍后重试'
    ElMessage.error(errorMessage.value);
  } finally {
    isLoading.value = false
  }
}
// 验证手机号
const validatePhone = (newPhone) => {
  const regex = /^1[3-9]\d{9}$/; // 中国大陆手机号规则
  if (!regex.test(newPhone.value)) {
    errorMessage.value = '请输入有效的11位手机号';
    return false;
  }
  if (newPhone.value === userStore.account?.phone) {
    errorMessage.value = '新旧手机号一致';
    return false;
  }
  return true;
};
// 新增：处理更换手机号的确认逻辑
const handleConfirmChangePhone = async () => {
  if (!validatePhone(newPhone)) {
    return;
  }
  isLoading.value = true;
  try {
    const response = await axios.post('http://localhost:8080/change-phone', {
      accountId: userStore.account?.accountId,
      phone: newPhone.value
    });
    const data = response.data
    if (data.success) {
      if (userStore.account) userStore.account.phone = newPhone.value;
      ElMessage.success('手机号更新成功');
      newPhone.value = '';
      isChangePhone.value = false;
    } else {
      errorMessage.value = data.message;
      ElMessage.error(errorMessage.value);
    }
  } catch (error) {
    console.error('手机号更新失败', error);
    errorMessage.value = '服务器连接失败，请稍后重试';
    ElMessage.error(errorMessage.value);
  } finally {
    isLoading.value = false;
  }
};

function goToPersonalSetting() {
  router.push('/personalSettingPage');
}
</script>

<template>
  <div class="header">
    <div class="head-left">
      <img src="@/assets/logo_blue.png">
      <span class="breadcrumb" @click="goToCourse">我的课堂</span>
      <span class="breadcrumb-separator"><el-icon><ArrowRight /></el-icon></span>
      <span class="breadcrumb-current">用户设置</span>
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
  <div class="personal-setting">
    <div class="head-div">
      <div>
        <img src="@/assets/课堂派头像.jpg">
      </div>
      <div>
        <h6 class="name">{{ userStore.account?.name }}</h6>
        <button class="activate-VIP">开通课堂派VIP</button>
      </div>
    </div>
    <div class="account-table">
      <div class="table-nav">
        <button :class="{'active':state==='账户设置'}" class="account-setting" @click="state='账户设置'">账户设置
        </button>
        <button :class="{'active':state==='通知设置'}" class="notification-setting" @click="state='通知设置'">通知设置
        </button>
      </div>
      <div v-if="state==='账户设置'" class="table-content">
        <h3>账号设置</h3>
        <ul class="account-number-setting">
          <li class="account-li"><label>账号</label>
            <p>
              <template v-if="userStore.account?.accountId">
                {{ userStore.account?.accountId }}
              </template>
              <template v-else>
                <i class="iconfont">&#xe642;</i>
                <span>&emsp;未完善</span>
              </template>
            </p>
          </li>
          <li v-if="isGoToSet" class="belonging-role-after"><label>所属角色</label>
            <div class="belonging-role-between">
              <div class="teacher-student">
                <div><input v-model="selectedRole" class="radio-input" type="radio" value="老师"><label
                    class="teacher-label">老师</label></div>
                <div><input v-model="selectedRole" class="radio-input" type="radio" value="学生"><label
                    class="student-label">学生</label></div>
              </div>
              <div class="cancel-confirm">
                <button class="cancel-button" @click="isGoToSet=false">取消</button>
                <button class="confirm-button" @click="handleConfirmChangeIdentity">确认</button>
              </div>
            </div>
          </li>
          <li v-else class="belonging-role-before"><label>所属角色</label>
            <div class="table-between">
              <p>
                <template v-if="userStore.account?.identity">
                  {{ userStore.account?.identity }}
                </template>
                <template v-else>
                  <i class="iconfont">&#xe642;</i>
                  <span>&emsp;未完善</span>
                </template>
              </p>
              <button class="go-to-set" @click="isGoToSet=true">去设置</button>
            </div>
          </li>

          <li><label>手机号</label>
            <div class="table-between">
              <p>
                <template v-if="userStore.account?.phone">
                  {{ userStore.account?.phone }}
                </template>
                <template v-else>
                  <i class="iconfont">&#xe642;</i>
                  <span>&emsp;未完善</span>
                </template>
              </p>
              <div class="change-phone-number-unbind">
                <button @click="isChangePhone=true">更换手机号</button>
                <button class="unbind-button" @click="isChangePhone=false">解绑</button>
              </div>
              <div v-if="isChangePhone" class="change-phone-div">
                <div class="change-phone-modal-header">
                  <h3>修改手机号</h3> <span class="close-button" @click="isChangePhone=false">×</span>
                </div>
                <div class="form-body">
                  <div class="form-item">
                    <label class="form-label">原手机号：</label>
                    <span>{{ userStore.account?.phone }}</span>
                  </div>
                  <div class="form-item">
                    <label class="form-label">新手机号</label>
                    <input v-model="newPhone" :maxlength="11" class="input-field" type="tel">
                  </div>
                  <div class="change-phone-button">
                    <button class="cancel-button" @click="isChangePhone=false">取消</button>
                    <button class="confirm-button" @click="handleConfirmChangePhone">确定</button>
                  </div>
                </div>
              </div>
            </div>
          </li>
          <li class="password-li"><label>密码</label>
            <div class="table-between">
              <p>
                <template v-if="userStore.account?.password">
                  {{ userStore.account?.password }}
                </template>
                <template v-else>
                  <i class="iconfont">&#xe642;</i>
                  <span>&emsp;未完善</span>
                </template>
              </p>
              <button class="change-password" @click="isChangePassword=true">修改密码</button>
              <div v-if="isChangePassword" class="change-password-div">
                <div class="change-password-modal-header">
                  <h3>修改密码</h3><span class="close-button" @click="isChangePassword=false">×</span>
                </div>
                <div class="form-body">
                  <div class="form-item">
                    <label class="form-label">新密码</label><input v-model="newPassword" placeholder="请输入新密码"
                                                                   type="password">
                  </div>
                  <div class="form-item">
                    <label class="form-label">确认新密码</label><input v-model="confirmNewPassword" placeholder="请确认新密码"
                                                                       type="password">
                  </div>
                  <div class="change-password-button">
                    <button class="cancel-button" @click="isChangePassword=false">取消</button>
                    <button class="confirm-button" @click="handleSaveChangePassword">保存</button>
                  </div>
                </div>

              </div>
            </div>
          </li>
        </ul>
        <div class="table-between">
          <h3>基础信息</h3>
          <div v-if="isEdit" class="edit-buttons">
            <button class="cancel-button" @click="isEdit=false">取消</button>
            <button class="confirm-button" @click="handleSaveBasicInformation">保存</button>
          </div>
          <button v-else @click="handleEdit">编辑</button>
        </div>
        <ul v-if="isEdit" class="basic-information-edit">
          <li class="name-li"><label>姓名</label>
            <input v-model="newName" placeholder="请输入内容" type="text">
          </li>
          <li v-if="userStore.account?.identity === '学生'"><label>学号</label>
            <input v-model="newStudentId" placeholder="请输入内容" type="text">
          </li>
          <li v-if="userStore.account?.identity === '老师'"><label>工号</label>
            <input v-model="newStudentId" placeholder="请输入内容" type="text">
          </li>
          <li><label>学校</label>
            <input v-model="newSchool" placeholder="请输入内容" type="text">
          </li>
          <li><label>院系</label>
            <input v-model="newCollege" placeholder="请输入内容" type="text">
          </li>
          <li><label>专业</label>

            <input v-model="newMajor" placeholder="请输入内容" type="text">
          </li>
          <li v-if="userStore.account?.identity === '学生'"><label>班级</label>
            <input v-model="newClasses" placeholder="请输入内容" type="text">
          </li>
          <li v-if="userStore.account?.identity === '学生'"><label>年级</label>
            <select v-model="newGrade">
              <option>1年级</option>
              <option>2年级</option>
              <option>3年级</option>
              <option>4年级</option>
              <option>5年级</option>
              <option>6年级</option>
            </select>
          </li>
          <li v-if="userStore.account?.identity === '学生'" class="enrollment-time-li"><label>入学时间</label>
            <input v-model="newEnrollment" placeholder="请输入内容" type="text">
          </li>
        </ul>
        <ul v-else class="basic-information">
          <li class="name-li"><label>姓名</label>
            <p>
              <template v-if="userStore.account?.name">
                {{ userStore.account?.name }}
              </template>
              <template v-else>
                <i class="iconfont">&#xe642;</i>
                <span>&emsp;未完善</span>
              </template>
            </p>
          </li>
          <li v-if="userStore.account?.identity === '学生'"><label>学号</label>
            <p>
              <template v-if="userStore.account?.studentId">
                {{ userStore.account?.studentId }}
              </template>
              <template v-else>
                <i class="iconfont">&#xe642;</i>
                <span>&emsp;未完善</span>
              </template>
            </p>
          </li>
          <li v-if="userStore.account?.identity === '老师'"><label>工号</label>
            <p>
              <template v-if="userStore.account?.studentId">
                {{ userStore.account?.studentId }}
              </template>
              <template v-else>
                <i class="iconfont">&#xe642;</i>
                <span>&emsp;未完善</span>
              </template>
            </p>
          </li>
          <li><label>学校</label>
            <p>
              <template v-if="userStore.account?.school">
                {{ userStore.account?.school }}
              </template>
              <template v-else>
                <i class="iconfont">&#xe642;</i>
                <span>&emsp;未完善</span>
              </template>
            </p>
          </li>
          <li><label>院系</label>
            <p>
              <template v-if="userStore.account?.college">
                {{ userStore.account?.college }}
              </template>
              <template v-else>
                <i class="iconfont">&#xe642;</i>
                <span>&emsp;未完善</span>
              </template>
            </p>
          </li>
          <li><label>专业</label>
            <p>
              <template v-if="userStore.account?.major">
                {{ userStore.account?.major }}
              </template>
              <template v-else>
                <i class="iconfont">&#xe642;</i>
                <span>&emsp;未完善</span>
              </template>
            </p>
          </li>
          <li v-if="userStore.account?.identity === '学生'"><label>班级</label>
            <p>
              <template v-if="userStore.account?.classes">
                {{ userStore.account?.classes }}
              </template>
              <template v-else>
                <i class="iconfont">&#xe642;</i>
                <span>&emsp;未完善</span>
              </template>
            </p>
          </li>
          <li v-if="userStore.account?.identity === '学生'"><label>年级</label>
            <p>
              <template v-if="userStore.account?.grade">
                {{ userStore.account?.grade }}
              </template>
              <template v-else>
                <i class="iconfont">&#xe642;</i>
                <span>&emsp;未完善</span>
              </template>
            </p>
          </li>
          <li v-if="userStore.account?.identity === '学生'" class="enrollment-time-li"><label>入学时间</label>
            <p>
              <template v-if="userStore.account?.enrollment">
                {{ userStore.account?.enrollment }}
              </template>
              <template v-else>
                <i class="iconfont">&#xe642;</i>
                <span>&emsp;未完善</span>
              </template>
            </p>
          </li>
        </ul>
        <h3 class="third-part-account-binding">第三方账号绑定</h3>
        <ul class="basic information">
          <li class="email-li"><label>邮箱绑定</label>
            <div class="table-between">
              <p>
                <template v-if="userStore.account?.email">
                  {{ userStore.account?.email }}
                </template>
                <template v-else>
                  <i class="iconfont">&#xe642;</i>
                  <span>&emsp;未完善</span>
                </template>
              </p>
              <button>立即绑定</button>
            </div>

          </li>
          <li class="WeChat-li"><label>微信绑定</label>
            <div class="table-between">
              <p>未绑定</p>
              <button>立即绑定</button>
            </div>
          </li>
        </ul>
        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>
      </div>
      <div v-if="state==='通知设置'" class="table-content">
        <h3>作业推送</h3>
        <ul class="homework-push">
          <li class="homework-due"><label class="homework-due-label">作业到期</label>
            <div class="table-between">
              <p>作业到截至日期接受消息推送</p>
              <label class="toggle-container">
                <input type="checkbox">
                <span class="toggle-slider"></span>
              </label>
            </div>
          </li>
          <li class="course-private-message"><label class="topic-reminder-label">课堂私信</label>
            <div class="table-between">
              <p>有老师/同学私信后接受消息推送</p>
              <label class="toggle-container">
                <input type="checkbox">
                <span class="toggle-slider"></span>
              </label>
            </div>
          </li>
          <li class="topic-reminder"><label class="course-private-message-label">话题题型</label>
            <div class="table-between">
              <p>有老师/同学发起话题后接受消息推送</p>
              <label class="toggle-container">
                <input type="checkbox">
                <span class="toggle-slider"></span>
              </label>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
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

.table-nav {
  display: flex;
  gap: 40px;
  height: 40px;
  margin: 20px 0;
}

.table-nav button {
  font-size: 16px;
  color: black;
}

.table-nav button:hover {
  color: #4285F4;
}

.table-nav button.active {
  color: #4285F4;
  border-bottom: 2px solid #4285f4;
}

.account-setting, .notification-setting {
  border: none;
  background-color: transparent;
  color: black;
  cursor: pointer;
  font-size: 14px;
}

.header span {
  font-size: 16px;
}

.head-left span {
  color: #4285F4;
  border-bottom: 3px solid #4285f4;
  padding: 19px 5px;
}

.head-left {
  display: flex;
  align-items: center;
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

.head-left, .head-right {
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

.head-right span {
  cursor: pointer;
}

.personal-setting {
  width: 900px;
  position: absolute;
  left: 50%;
  top: 80px;
  transform: translateX(-50%);
}

.head-div {
  background-color: rgb(248, 249, 250);
  display: flex;
  flex-direction: row;
  align-items: center;
  width: 100%;
  margin: 0 auto;
  border-radius: 8px;
}

button {
  border: none;
  background-color: transparent;
  color: #4285F4;
  cursor: pointer;
  font-size: 14px;
}

.account-setting.router-link-active, .notification-setting.router-link-active {
  color: #4285F4;
  border-bottom: 2px solid #4285f4;
}

.account-table {
  width: 100%;
  justify-content: center;
}

body, html {
  font-size: 14px;
  margin: 0;
  padding: 0;

  position: relative;
}

.activate-VIP:hover {
  color: #689df6;
}

.name {
  font-size: 22px;
}

.personal-setting img {
  width: 114px;
  padding: 16px;
}

.radio-input {
  width: 50px;
  height: 15px;
}

.form-label {
  margin: 0;
  padding: 0;
  width: 40px;
}

.change-password-div, .change-phone-div {
  display: flex;
  justify-content: center;
  flex-direction: column;
  align-items: center;
  border: 2px solid #4285f4;
}

.change-password-div {
  position: fixed;
  top: 40px;
  left: 30%;
  width: 500px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  z-index: 1001;
  padding-bottom: 20px;
}

.change-phone label {
  font-size: 14px;
  color: rgb(112, 114, 118);
}

.change-phone-button, .change-password-button {
  display: flex;
  justify-content: center;
}

.change-phone-div {
  position: fixed;
  top: 25px;
  left: 30%;
  width: 500px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  z-index: 1001;
  padding-bottom: 20px;
}

.change-phone-modal-header, .change-password-modal-header {
  height: 25px;
  padding: 25px;
  margin-bottom: 25px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #ccc;
  width: 100%;
}

.change-phone-modal-header h3 {
  font-size: 16px;
  margin: 0;
  padding: 0;
}

.close-button {
  cursor: pointer;
  font-size: 35px;
  color: #999;
}

.close-button:hover {
  color: #4285f4;
}

.form-item {
  display: flex;
  align-items: center;
  margin-bottom: 25px;
  gap: 0;
}

.form-item label {
  width: 80px;
  text-align: right;
  color: rgb(96, 98, 102);
  font-size: 14px;
}

.teacher-label, .student-label {
  margin: 0;
  padding: 0;
}

.teacher-student, .teacher-student div {
  display: flex;
  justify-content: center;
  align-items: center;
}

.teacher-student div {
  gap: 10px;
}

.belonging-role-between {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.belonging-role-after {
  height: 60px;
  width: 100%;
}

select {
  width: 200px;
  outline: none;
  color: rgb(96, 98, 102);
  padding: 0 15px;
  margin-right: 10px;
  border: 1px solid rgb(218, 220, 224);
}

select:focus {
  border: 1px solid #4285F4;
}

option:checked {
  color: #4285F4;
  font-weight: bold;
}

option {
  height: 34px;
}

select option:hover {
  background-color: rgb(245, 247, 250) !important;
  color: white !important;
}

::placeholder {
  color: rgb(218, 220, 224);
}

.basic-information-edit li {
  height: 64px;
}

.basic-information-edit input, .form-body input {
  color: rgb(96, 98, 102);
  border-radius: 4px;
  width: 200px;
  height: 32px;
  padding: 0 15px;
  border: 1px solid rgb(218, 220, 224);
}

.basic-information-edit input:focus, .form-body input:focus {
  outline: none;
  border: 1px solid #4285F4;
}

.basic-information-edit input:hover {
  border: 1px solid rgb(192, 196, 204);
}

.iconfont {
  color: rgb(255, 148, 31);
}

.cancel-confirm {
  display: flex;
  align-items: center;
  margin-right: 10px;

}

.cancel-button, .confirm-button {
  height: 65px;
}

.cancel-button {
  color: black;
  border: 1px solid rgb(218, 220, 224);
}

.cancel-button:hover {
  background-color: rgb(236, 243, 254);
  color: #4285F4;

}

.confirm-button {
  color: white;
  background-color: #4285F4;
  border: none;
}

.confirm-button:hover {
  background-color: rgb(104, 157, 246);
  border: none;
}

.confirm-button, .cancel-button {
  width: 56px;
  height: 28px;
  margin-left: 10px;
  font-size: 12px;
  border-radius: 2px;
  padding: 3px 15px;
  margin-right: 8px;
}

.unbind-button {
  border-left: 1px solid #ccc;
}

.change-phone-number-unbind {
  display: flex;
}

.table-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding-right: 15px;
}

.account-li, .name-li, .email-li {
  border-top: 1px solid #ccc;
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
}

.enrollment-time-li, .WeChat-li, .password-li {
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
}

.account-li::before,
.name-li::before,
.email-li::before {
  display: none;
}

.password-li::after,
.enrollment-time-li::after,
.WeChat-li::after {
  display: none;
}

.table-content {
  padding: 0 24px 24px;
  margin: 16px 0 0;
  background-color: rgb(248, 249, 250);
}

button {
  border: none;
  background-color: transparent;
  color: #4285F4;
  cursor: pointer;
  font-size: 14px;
}

h3 {
  font-size: 16px;
  padding: 24px 0;
}

ul {
  padding-left: 0;
  margin: 0;
}

li {
  position: relative;
  display: flex;
  width: 100%;
  height: 53px;
  padding: 16px 0;
  border-top: 1px solid #ccc;
  border-bottom: 1px solid #ccc;
  border-left: 4px solid #4285f4;
  border-right: 1px solid #ccc;
  background-color: white;
  margin-top: -1px;
}

Li::before {
  content: "";
  position: absolute;
  left: -4px;
  width: 4px;
  height: 1px;
  background-color: #4285f4;
  top: -1px;
}

li::after {
  content: "";
  position: absolute;
  left: -4px;
  width: 4px;
  height: 1px;
  background-color: #4285f4;
}

label {
  display: flex;
  padding: 0 24px;
  width: 150px;
}

.form-label {
  width: 60px;
}

/* 通知设置列表项圆角 */
.homework-push li:first-child {
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
}

.homework-push li:last-child {
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
}

.homework-push li:first-child::before,
.homework-push li:last-child::after {
  display: none;
}

/* 开关样式 */
.toggle-container {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
}

.toggle-container input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  border-radius: 20px;
  transition: .3s;
}

.toggle-slider::before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 2px;
  background-color: white;
  border-radius: 50%;
  transition: .3s;
}

input:checked + .toggle-slider {
  background-color: #4285F4;
}

input:checked + .toggle-slider::before {
  transform: translateX(27px);
}
</style>