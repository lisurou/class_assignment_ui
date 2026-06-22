<script setup>
import {ref} from 'vue';
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

const errorMessage=ref('');
const handleLogin=async()=>{
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
      alert('登录成功');
      router.push('/course');
    }else{
      errorMessage.value = data.message;
      console.log(errorMessage.value);
      alert(errorMessage.value)
    }
  }catch(error){
    console.log("登录失败：",error)
    errorMessage.value = '服务器连接失败，请稍后重试';
    alert(errorMessage.value)
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
      <div class="title"><h1>账号登录</h1></div>

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
            <div class="form-group"><input class="account"  v-model="form.phone" placeholder="请输入手机号" type="text"></div>
            <div class="form-group"> <input class="password" v-model="form.password" placeholder="请输入密码" type="password" /></div>
          </div>
        </form>


        <div class="login-forgot">
          <div class="auto-login"><input type="checkbox">
            <label>下次自动登录</label></div>
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
  width:600px;
  height:538px;
  overflow: hidden;
}
.view-login {
  font-size:14px;
  display:flex;
  width:100%;
  height:100%;
}
.right{
  float:right;
  width:431px;
  height:477px;
  background:rgb(255, 255, 255);
  padding:0 35px;
  box-shadow:0 0 61px 0 rgba(85, 108, 144, .07);
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
.account,.password{
  border-radius:4px;
  border: 1px solid #dadce0;
  padding:4px 15px;
  height:48px;
  margin-top:10px;
  width:100%;
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

.phone{
  padding:4px 15px;
  height:48px;
  width:100%;
  margin-top:10px;
}
.verification{
  display:flex;
  gap:15px;
  margin-top:10px;
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