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
import LessonPrepPage from "@/pages/LessonPrepPage.vue"
import LessonPrepMembersPage from "@/pages/LessonPrepMembersPage.vue"
import LessonPrepLogsPage from "@/pages/LessonPrepLogsPage.vue"

import {createPinia} from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

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
    {
        path:'/lesson-prep/:spaceId/members',
        component:LessonPrepMembersPage,
    },
    {
        path:'/lesson-prep/:spaceId/logs',
        component:LessonPrepLogsPage,
    },
    {
        path:'/lesson-prep/:spaceId',
        component:LessonPrepPage,
    },
    {
        path:'/lesson-prep',
        component:LessonPrepPage,
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
app.use(ElementPlus, {
  locale: zhCn,
})
app.mount('#app')
