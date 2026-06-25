<script setup>
import { ElMessage } from 'element-plus';
import {ref, onMounted} from 'vue';
const loginState=ref('account')
import { useRouter } from 'vue-router'
import axios from 'axios';
import {useUserStore} from "@/stores/userStore.js";
const router = useRouter()
const userStore=useUserStore();
const goToRegister = () => {
  router.push('/register')
}
const goToForgotPassword = () => {
  router.push('/forgot-password')
}

const form=ref({
  phone:'',
  password:'',
})
const autoLogin=ref(false);

const phoneErrorMsg = ref('');
const passwordErrorMsg = ref('');

const validatePhoneOnBlur = () => {
  if (!form.value.phone.trim()) {
    phoneErrorMsg.value = '请输入手机号';
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
  passwordErrorMsg.value = '';
  return true;
};

onMounted(() => {
  const savedPhone = localStorage.getItem('autoLoginPhone');
  const savedPassword = localStorage.getItem('autoLoginPassword');
  if (savedPhone && savedPassword) {
    form.value.phone = savedPhone;
    form.value.password = savedPassword;
    autoLogin.value = true;
    handleLogin(true); // 传入 true 表示自动登录
  }
});

const errorMessage=ref('');
const handleLogin=async(isAuto = false)=>{
  if (isAuto !== true) {
    const isPhoneValid = validatePhoneOnBlur();
    const isPasswordValid = validatePasswordOnBlur();
    if (!isPhoneValid || !isPasswordValid) {
      return;
    }
  }

  try{
    const response=await axios.post('http://localhost:8080/login',{
      phone:form.value.phone,
      password:form.value.password
    });
    const data=response.data;
    if(data.success){
      userStore.setAccount(data.account)
      userStore.setLearned(data.learned)
      userStore.setTaught(data.taught)
      userStore.setTop(data.top)
      
      if (autoLogin.value) {
        localStorage.setItem('autoLoginPhone', form.value.phone);
        localStorage.setItem('autoLoginPassword', form.value.password);
      } else {
        localStorage.removeItem('autoLoginPhone');
        localStorage.removeItem('autoLoginPassword');
      }

      if (isAuto !== true) {
        ElMessage.success('登录成功');
      }
      router.push('/course');
    }else{
      errorMessage.value = data.message;
      console.log(errorMessage.value);
      if (isAuto !== true) {
        ElMessage.error(errorMessage.value);
      } else {
        localStorage.removeItem('autoLoginPhone');
        localStorage.removeItem('autoLoginPassword');
        autoLogin.value = false;
      }
    }
  }catch(error){
    console.log("登录失败：",error)
    errorMessage.value = '服务器连接失败，请稍后重试';
    if (isAuto !== true) {
      ElMessage.error(errorMessage.value);
    }
  }
};
</script>

<template>

  <div class="view-login">
    <div class="logo-img">
      <img src="@/assets/logo_blue.png" alt="课堂派logo">
    </div>
    <div class="left">
      <img src="@/assets/课堂派.png" alt="课堂派图片">
    </div>
    <div class="right">
      <div class="title">
        <h1>
          {{ loginState === 'account' ? '账号登录' : (loginState === 'phone' ? '手机短信登录' : '微信登录') }}
        </h1>
      </div>

      <div class="tool-bar">
        <div class="account-login">
          <button class="tool" @click="loginState='account'" :class="{ 'active': loginState === 'account' }">账号登录</button>
        </div>
        <div class="phone-login">
          <button class="tool" @click="loginState='phone'" :class="{ 'active': loginState=== 'phone' }">手机短信登录</button>
        </div>
        <div class="WeChat-login">
          <button class="tool" @click="loginState='WeChat'"  :class="{ 'active': loginState === 'WeChat' }">微信登录</button>
        </div>
      </div>

      <div class="account-div" v-if="loginState==='account'">
        <form @submit.prevent="handleLogin">
          <div class="input-box">
            <div class="form-group input-wrapper">
              <input class="account" v-model="form.phone" placeholder="请输入手机号" type="text" @blur="validatePhoneOnBlur">
              <div v-if="phoneErrorMsg" class="error-text">{{ phoneErrorMsg }}</div>
            </div>
            <div class="form-group input-wrapper"> 
              <input class="password" v-model="form.password" placeholder="请输入密码" type="password" @blur="validatePasswordOnBlur" />
              <div v-if="passwordErrorMsg" class="error-text">{{ passwordErrorMsg }}</div>
            </div>
          </div>
        </form>


        <div class="login-forgot">
          <div class="auto-login"><input type="checkbox" v-model="autoLogin" id="autoLoginCheck">
            <label for="autoLoginCheck">下次自动登录</label></div>
          <div class="forgot-password" @click="goToForgotPassword"><span>忘记密码?</span></div>
        </div>

        <button @click="handleLogin" class="login-button">登录</button>

        <div class="register-div">
          <label>还没有账号?</label><button @click="goToRegister" class="register-button">去注册</button>
        </div>
      </div>
      <div class="phone-div" v-if="loginState==='phone'">
        <div class="input-box">
          <input class="phone" placeholder="请输入手机号" type="text">
          <div class="verification">
            <input class="input-verification-code" placeholder="请输入验证码" type="text" />
            <button class="send-verification-code" >发送验证码</button>
          </div>
        </div>
        <div class="login-forgot">
          <div class="auto-login"><input type="checkbox"><span>下次自动登录</span></div>
          <div class="forgot-password"><span>忘记密码?</span></div>
        </div>

        <button class="login-button">登录</button>

        <div class="register-div">
          <label>还没有账号? </label><label class="register-label">去注册</label>
        </div>
      </div>
      <div class="WeChat-div" v-if="loginState==='WeChat'">
        <div class="two-dimensional-code-div" >
          <img class="two-dimensional-code" src="@/assets/课堂派二维码.png" alt="二维码">
          <label>二维码2分钟失效</label>
        </div>
        <div class="auto-login"><input type="checkbox"><span>下次自动登录</span></div>
      </div>
    </div>
  </div>
</template>

<style scoped>

.tool{
  cursor:pointer;
  font-size:18px;
  color:#74787c;
  background-color: transparent !important;
  padding:9px;
  border:none;
}
.active{
  border-bottom:2px solid  #4285f4;
}
body,html{
  margin:0;
  padding:0;
  width:100%;
  height:100%;
  display:flex;
  background:rgb(248, 249, 250);
}
.logo-img{
  display: block;
  position:fixed;
  top:60px;
  left:60px;
}
.left{
  flex:1;
  display:flex;
  align-items:center;
  justify-content:center;
  overflow:hidden;
  min-width:0;
}
.left img{
  width:100%;
  height:auto;
  object-fit:contain;
}
.view-login {
  font-size:14px;
  display:flex;
  align-items:center;
  justify-content:center;
  width:85%;
  max-width:1200px;
  min-height:500px;
  margin:100px auto 0;
  padding:40px 60px;
  background:transparent;
  border-radius:16px;
  box-sizing:border-box;
}
.right{
  flex: 0 0 431px;
  background:rgb(255, 255, 255);
  padding:0 35px;
  border-radius:8px;
}
h1{
  text-align:center;
  font-size:22px;
  font-weight:bold;
  padding:18px 0;
}
.tool-bar{
  padding-bottom:9px;
  margin:0 0 0 12px;
  display:flex;
  justify-content: space-between;
}



.login-forgot input,.login-forgot label{
  cursor:pointer;
}
.auto-login input:hover{
  outline:none;
  border:2px solid #4285f4;
}
.input-box{
  display:flex;
  flex-direction:column;
}

.input-wrapper {
  position: relative;
  margin-top: 10px;
  padding-bottom: 20px;
}

.input-wrapper input {
  margin-top: 0;
}

.error-text {
  color: #f56c6c;
  font-size: 12px;
  position: absolute;
  bottom: 0;
  left: 2px;
}

.account,.password{
  border-radius:4px;
  border: 1px solid #dadce0;
  padding:4px 15px;
  height:48px;
  width:100%;
  box-sizing: border-box;
}
input:focus{
  outline:none;
  border:1px solid #4285f4;
}
input::placeholder{
  color:rgb(192, 196, 204);
  font-size:15px;
}
.register-div{
  display:flex;
  justify-content:flex-end;
  align-items:center;
  margin:24px 0 0;
}
.register-button{
  color:#4285f4;
  border:none;
  background:transparent;
  font-size:14px;
  cursor:pointer;
}
.login-forgot{
  display:flex;
  justify-content: space-between;
  height:62px;
  padding:4px 0;
  align-items: center;
}
.auto-login{
  color:#606266;
  display:flex;
  justify-content:center;
  align-items: center;
}
.forgot-password {
  width:70px;
  height:17px;
  color:#74787c;
  cursor:pointer;
}
.login-button{
  display:flex;
  width:100%;
  height:48px;
  padding:4px 20px;
  color: #fff;
  background-color: #4285f4;
  border:none;
  border-radius: 4px;
  align-items: center;
  justify-content: center;
  cursor:pointer;
}


input{
  border-radius:4px;
  border: 1px solid #dadce0;
}

.phone-div .input-box {
  margin-top: 10px;
}

.phone{
  padding:4px 15px;
  height:48px;
  width:100%;
  margin-top: 0;
  border-radius:4px;
  border: 1px solid #dadce0;
  box-sizing: border-box;
}
.verification{
  display:flex;
  gap:15px;
  margin-top: 10px;
}
.input-verification-code{
  padding:4px 15px;
  height:48px;
  width:100%;
}
.send-verification-code{
  width:120px;
  border:none;
  color:white;
  background-color:#4285f4;
  border-radius:4px;
}

.register-div{
  display:flex;
  justify-content:flex-end;
  align-items:center;
  margin:24px 0 0;
}
.register-label{
  color:#4285f4;
}
.login-forgot{
  display:flex;
  justify-content: space-between;
  height:62px;
  padding:4px 0;
  align-items: center;
}
.auto-login{
  color:#606266;
}
.forgot-password {
  width:70px;
  height:17px;
  color:#74787c;
}
.login-button{
  display:flex;
  width:100%;
  height:48px;
  padding:4px 20px;
  color: #fff;
  background-color: #4285f4;
  border:none;
  border-radius: 4px;
  align-items: center;
  justify-content: center;
}

.auto-login{
  color:#606266;
}
.two-dimensional-code-div {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin-bottom:10px;
}
.two-dimensional-code{
  width:290px;
  height:290px;
}
.two-dimensional-code-div label{
  font-size:16px;
}
</style>