<script setup>
import {useRouter} from 'vue-router'
import axios from 'axios'
import {ref} from 'vue'

const router = useRouter()
const errorMessage = ref('')
const isLoading = ref(false);
const form = ref({
  phone: '',
  password: '',
  confirmPassword: '',
  name: '',
  school: '',
  studentId: ''
})
const goToLogin = () => {
  router.push('/login')
}
const chooseIdentity = (type) => {
  form.value.identity = type;
  if (type !== '学生') {
    form.value.studentId = ''
  }
}
//表单验证函数
const validateForm = () => {
  // 验证密码
  if (!form.value.password) {
    errorMessage.value = '请输入密码'
    return false
  }
  // 验证密码长度
  if (form.value.password.length < 6) {
    errorMessage.value = '密码长度不能少于6位'
    return false
  }
  // 验证确认密码
  if (form.value.password !== form.value.confirmPassword) {
    errorMessage.value = '两次输入的密码不一致'
    return false
  }
  // 验证身份选择
  if (!form.value.identity) {
    errorMessage.value = '请选择身份（老师/学生）'
    return false
  }
  // 验证姓名
  if (!form.value.name.trim()) {
    errorMessage.value = '请输入姓名'
    return false
  }
  // 验证学校
  if (!form.value.school.trim()) {
    errorMessage.value = '请输入学校或机构'
    return false
  }
  //验证学号
  if (form.value.identity === '学生' && !form.value.studentId.trim()) {
    errorMessage.value = '请输入学号'
    return false
  }
  errorMessage.value = ''
  return true
}
//注册提交函数
const handleRegister = async () => {
  if (!validateForm()) {
    return
  }
  isLoading.value = true
  try {
    //构建请求参数
    const requestData = {
      phone: form.value.phone,
      password: form.value.password,
      identity: form.value.identity,
      name: form.value.name,
      school: form.value.school,
      // 仅学生身份添加学号字段
      ...(form.value.identity === '学生' && {studentId: form.value.studentId})
    }

    const response = await axios.post('http://localhost:8080/register', requestData)
    if (response.data.success) {
      alert('注册成功，请登录')
      router.push('/login')
    } else {
      errorMessage.value = response.data.message
      console.log(errorMessage.value)
      alert(errorMessage.value)
    }
  } catch (error) {
    console.error('注册失败:', error)
    errorMessage.value = '服务器连接失败，请稍后重试'
    alert(errorMessage.value)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="view-login">
    <div class="logo-img">
      <img alt="课堂派logo" src="@/assets/logo_blue.png">
    </div>
    <div class="left">
      <img alt="课堂派注册图片" class="register-img" src="@/assets/课堂派注册图片.png">
    </div>
    <div class="right">
      <div class="title"><h1>注册账号</h1></div>
      <div class="register-input">
        <input v-model="form.phone" placeholder="请输入邮箱/手机号" type="text">
        <input v-model="form.password" placeholder="请输入密码" type="password">
        <input v-model="form.confirmPassword" placeholder="请再次输入密码确认" type="password">
        <div class="choose-identity-div">
          <span class="choose-identity-title">选择身份</span>
          <div class="choose-identity">
            <div :class="{ 'selected': form.identity === '老师' }" class="choose-teacher"
                 @click="chooseIdentity('老师')">
              <img alt="课堂派老师图片" src="@/assets/课堂派老师图片.svg">
              <span>老师</span>
            </div>
            <div :class="{ 'selected': form.identity === '学生' }" class="choose-student"
                 @click="chooseIdentity('学生')">
              <img alt="课堂派学生图片" src="@/assets/课堂派学生图片.svg">
              <span>学生</span>
            </div>
          </div>
        </div>
        <input v-model="form.name" placeholder="请输入姓名" type="text">
        <input v-model="form.school" placeholder="请输入学校/机构" type="text">
        <!-- 新增：学生身份时显示学号输入框 -->
        <input
            v-if="form.identity === '学生'"
            v-model="form.studentId"
            placeholder="请输入学号"
            type="text"
        >
        <button :disabled="isLoading" class="register-button"
                @click="handleRegister">注册
        </button>
        <div class="login-div">
          <label>已有账号? </label>
          <button class="login-button" @click="goToLogin">去登录</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.choose-teacher img, .choose-student img {
  display: flex;
  margin-right: 9px;
}

.choose-identity-div {
  margin: 15px 0 0 0;
  gap: 15px;
}

.choose-identity-title {
  font-size: 16px;
  font-weight: bold;
}

.choose-identity {
  padding: 8px 16px;
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
}

.choose-teacher, .choose-student {
  padding: 5px;
  display: flex;
  align-items: center;
  width: 100%;
  margin-right: 5px;
  cursor: pointer;
}

/* 选中状态样式 */
.choose-teacher.selected, .choose-student.selected {
  background-color: #e8f0fe;
  border: 1px solid #4285f4;
  border-radius: 4px;
}

.register-input {
  display: flex;
  flex-direction: column;
}

input {
  border-radius: 4px;
  border: 1px solid #dadce0;
  padding: 4px 15px;
  height: 48px;
  margin-top: 15px;
}

input::placeholder {
  color: rgb(192, 196, 204);
  font-size: 15px;
}

input:focus {
  outline: none;
  border: 1px solid #4285f4;
}

.register-button {
  margin-top: 15px;
  display: flex;
  width: 100%;
  height: 48px;
  padding: 4px 20px;
  color: #fff;
  background-color: #4285f4;
  border: none;
  border-radius: 4px;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.login-div {
  display: flex;
  justify-content: flex-end;
  margin: 24px 0 0;
}

.login-button {
  color: #4285f4;
  border: none;
  background: transparent;
  font-size: 14px;
  cursor: pointer;
}

body, html {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  display: flex;
  background: rgb(248, 249, 250);
}

.logo-img {
  display: block;
  position: fixed;
  top: 60px;
  left: 60px;
}

.left {
  height: 538px;
  overflow: hidden;
}

.register-img {
  width: auto;
  height: 100%;
  object-fit: contain;
}

.view-login {
  font-size: 14px;
  display: flex;
  width: 100%;
  height: 100%;
}

.right {
  float: right;
  width: 431px;
  height: 656px;
  background: rgb(255, 255, 255);
  padding: 0 35px;
  box-shadow: 0 0 61px 0 rgba(85, 108, 144, .07);
}

h1 {
  text-align: center;
  font-size: 22px;
  font-weight: bold;
  padding: 18px 0;
}

</style>