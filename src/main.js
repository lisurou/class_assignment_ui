import './assets/main.css'
import 'element-plus/dist/index.css'

import { createApp } from 'vue'
import App from './App.vue'
import {createRouter,createWebHistory} from 'vue-router'
import RegisterPage from"@/pages/RegisterPage.vue"
import LoginPage from "@/pages/LoginPage.vue";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage.vue";
import PersonalSettingPage from "@/pages/PersonalSettingPage.vue";
import CoursePage from "@/pages/CoursePage.vue"
import HomePage from "@/pages/HomePage.vue"

import {createPinia} from 'pinia'
//1.配置路由规则

const routes = [
    {
        path: '/',
        component: HomePage,
    },
    {
        path: '/login',
        component:LoginPage,
    },
    {
        path: '/register',
        component:RegisterPage
    },
    {
        path:'/forgot-password',
        component:ForgotPasswordPage
    },
    {
        path:'/personal-setting',
        component:PersonalSettingPage,
    },

    {
        path:'/course',
        component:CoursePage,
    },
]
//2.创建路由器
const router=createRouter({
    history:createWebHistory(),
    routes
})
//3.加载路由器
const app=createApp(App)
app.use(createPinia());
app.use(router)
app.mount('#app')
