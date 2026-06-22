<script setup>
import { ElMessage } from 'element-plus';
import {useRouter} from 'vue-router'
import axios from 'axios'
import {ref, onMounted, nextTick} from 'vue'

const router = useRouter()
const errorMessage = ref('')
const isLoading = ref(false);
const form = ref({
  phone: '',
  password: '',
  confirmPassword: '',
  name: '',
  school: '',
  studentId: '',
  captchaInput: ''
})
const captchaCanvas = ref(null);
const captchaResult = ref(0);
const captchaErrorMsg = ref('');
const phoneErrorMsg = ref('');
const passwordErrorMsg = ref('');
const confirmPasswordErrorMsg = ref('');
const nameErrorMsg = ref('');
const schoolErrorMsg = ref('');
const studentIdErrorMsg = ref('');

const validatePhoneOnBlur = () => {
  if (!form.value.phone.trim()) {
    phoneErrorMsg.value = '请输入邮箱/手机号';
    return false;
  }
  phoneErrorMsg.value = '';
  return true;
};

const validatePasswordOnBlur = () => {
  if (!form.value.password) {
    passwordErrorMsg.value = '请输入密码';
    return false;
  }
  if (form.value.password.length < 6) {
    passwordErrorMsg.value = '密码长度不能少于6位';
    return false;
  }
  passwordErrorMsg.value = '';
  return true;
};

const validateConfirmPasswordOnBlur = () => {
  if (form.value.password !== form.value.confirmPassword) {
    confirmPasswordErrorMsg.value = '两次输入的密码不一致';
    return false;
  }
  confirmPasswordErrorMsg.value = '';
  return true;
};

const validateNameOnBlur = () => {
  if (!form.value.name.trim()) {
    nameErrorMsg.value = '请输入姓名';
    return false;
  }
  nameErrorMsg.value = '';
  return true;
};

const validateSchoolOnBlur = () => {
  if (!form.value.school.trim()) {
    schoolErrorMsg.value = '请输入学校/机构';
    return false;
  }
  schoolErrorMsg.value = '';
  return true;
};

const validateStudentIdOnBlur = () => {
  if (form.value.identity === '学生' && !form.value.studentId.trim()) {
    studentIdErrorMsg.value = '请输入学号';
    return false;
  }
  studentIdErrorMsg.value = '';
  return true;
};

const validateCaptchaOnBlur = () => {
  if (!form.value.captchaInput) {
    captchaErrorMsg.value = '请输入计算结果';
    return false;
  }
  if (parseInt(form.value.captchaInput) !== captchaResult.value) {
    captchaErrorMsg.value = '计算结果错误，请重新输入';
    generateCaptcha(); // 错误时刷新验证码
    form.value.captchaInput = '';
    return false;
  }
  captchaErrorMsg.value = '';
  return true;
};

const generateCaptcha = () => {
  const num1 = Math.floor(Math.random() * 10) + 1;
  const num2 = Math.floor(Math.random() * 10) + 1;
  captchaResult.value = num1 + num2;
  
  nextTick(() => {
    if (!captchaCanvas.value) return;
    const ctx = captchaCanvas.value.getContext('2d');
    const width = 120;
    const height = 48;
    
    // 清除画布
    ctx.clearRect(0, 0, width, height);
    
    // 背景色
    ctx.fillStyle = '#f0f2f5';
    ctx.fillRect(0, 0, width, height);
    
    // 干扰线
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = `rgba(${Math.random()*150},${Math.random()*150},${Math.random()*150}, 0.5)`;
      ctx.beginPath();
      ctx.moveTo(Math.random() * width, Math.random() * height);
      ctx.lineTo(Math.random() * width, Math.random() * height);
      ctx.stroke();
    }
    
    // 干扰点
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = `rgba(${Math.random()*150},${Math.random()*150},${Math.random()*150}, 0.5)`;
      ctx.beginPath();
      ctx.arc(Math.random() * width, Math.random() * height, 1, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    // 绘制文字
    const text = `${num1} 加 ${num2} =`;
    ctx.font = 'bold 18px "Microsoft YaHei", sans-serif';
    ctx.fillStyle = '#333';
    ctx.textBaseline = 'middle';
    
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate((Math.random() - 0.5) * 0.2); // 轻微旋转
    ctx.fillText(text, 0, 0);
    ctx.restore();
  });
};

onMounted(() => {
  generateCaptcha();
});

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
  const isPhoneValid = validatePhoneOnBlur();
  const isPasswordValid = validatePasswordOnBlur();
  const isConfirmPasswordValid = validateConfirmPasswordOnBlur();
  const isNameValid = validateNameOnBlur();
  const isSchoolValid = validateSchoolOnBlur();
  const isStudentIdValid = validateStudentIdOnBlur();
  const isCaptchaValid = validateCaptchaOnBlur();

  if (!form.value.identity) {
    ElMessage.error('请选择身份（老师/学生）')
    return false
  }

  return isPhoneValid && isPasswordValid && isConfirmPasswordValid && isNameValid && isSchoolValid && isStudentIdValid && isCaptchaValid;
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
      ElMessage.success('注册成功，请登录');
      router.push('/login')
    } else {
      errorMessage.value = response.data.message
      console.log(errorMessage.value)
      ElMessage.error(errorMessage.value);
    }
  } catch (error) {
    console.error('注册失败:', error)
    errorMessage.value = '服务器连接失败，请稍后重试'
    ElMessage.error(errorMessage.value);
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
        <div class="input-wrapper">
          <input v-model="form.phone" placeholder="请输入邮箱/手机号" type="text" @blur="validatePhoneOnBlur">
          <div v-if="phoneErrorMsg" class="error-text">{{ phoneErrorMsg }}</div>
        </div>

        <div class="input-wrapper">
          <input v-model="form.password" placeholder="请输入密码" type="password" @blur="validatePasswordOnBlur">
          <div v-if="passwordErrorMsg" class="error-text">{{ passwordErrorMsg }}</div>
        </div>

        <div class="input-wrapper">
          <input v-model="form.confirmPassword" placeholder="请再次输入密码确认" type="password" @blur="validateConfirmPasswordOnBlur">
          <div v-if="confirmPasswordErrorMsg" class="error-text">{{ confirmPasswordErrorMsg }}</div>
        </div>

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

        <div class="input-wrapper">
          <input v-model="form.name" placeholder="请输入姓名" type="text" @blur="validateNameOnBlur">
          <div v-if="nameErrorMsg" class="error-text">{{ nameErrorMsg }}</div>
        </div>

        <div class="input-wrapper">
          <input v-model="form.school" placeholder="请输入学校/机构" type="text" @blur="validateSchoolOnBlur">
          <div v-if="schoolErrorMsg" class="error-text">{{ schoolErrorMsg }}</div>
        </div>

        <!-- 新增：学生身份时显示学号输入框 -->
        <template v-if="form.identity === '学生'">
          <div class="input-wrapper">
            <input
                v-model="form.studentId"
                placeholder="请输入学号"
                type="text"
                @blur="validateStudentIdOnBlur"
            >
            <div v-if="studentIdErrorMsg" class="error-text">{{ studentIdErrorMsg }}</div>
          </div>
        </template>
        <!-- 验证码区域 -->
        <div class="input-wrapper">
          <div class="captcha-container">
            <input class="captcha-input" 
                   v-model="form.captchaInput" 
                   placeholder="请输入计算结果" 
                   type="text"
                   @blur="validateCaptchaOnBlur">
            <div class="captcha-display" @click="generateCaptcha" title="点击刷新验证码">
              <canvas ref="captchaCanvas" width="120" height="48"></canvas>
            </div>
          </div>
          <div v-if="captchaErrorMsg" class="error-text">{{ captchaErrorMsg }}</div>
        </div>
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

.captcha-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0;
  gap: 15px;
}

.captcha-input {
  flex: 1;
}

.captcha-display {
  width: 120px;
  height: 48px;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid #dadce0;
}

.error-text {
  color: #f56c6c;
  font-size: 12px;
  position: absolute;
  bottom: -16px;
  left: 2px;
}

.register-input {
  display: flex;
  flex-direction: column;
}

.input-wrapper {
  position: relative;
  margin-top: 15px;
}

.input-wrapper input {
  width: 100%;
  margin-top: 0;
}

input {
  border-radius: 4px;
  border: 1px solid #dadce0;
  padding: 4px 15px;
  height: 48px;
  box-sizing: border-box;
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