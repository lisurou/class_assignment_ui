<script setup>

</script>

<template>
  <div class="container">
    <h1>忘记密码</h1>
    <input placeholder="请输入邮箱/手机号">
    <button>下一步</button>
  </div>

</template>

<style scoped>
input{
  border-radius:4px;
  border: 1px solid #dadce0;
  padding:4px 15px;
  height:48px;
  margin-top:10px;
}
input::placeholder{
  color:rgb(192, 196, 204);
  font-size:15px;
}
input:focus{
  outline:none;
  border:1px solid #4285f4;
}
h1{
  display:flex;
  justify-content: center;
  align-items: center;
  font-size:24px;
  padding:12px 0 0;
}
body,html{
  margin:0;
  padding:0;
  width:100%;
  height:100%;
  display:flex;
  background:rgb(248, 249, 250);
  justify-content: center;
  align-items: center;
}
.container{
  display:flex;
  position: absolute;
  top: 35%;
  left: 35%;
  flex-direction:column;
  padding:0 35px;
  width:431px;
  background: #fff;
  border: 1px solid #eee;
  box-shadow: 0 0 61px 0 rgba(85, 108, 144, .07);
  gap:15px;
}
button{
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
  margin-bottom:20px;
}
</style>