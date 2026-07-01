import {defineStore} from 'pinia'
export const useUserStore=defineStore('user',{
    state:()=>({
        // 存储用户信息（初始值从 localStorage 读取，避免刷新丢失）
        account:JSON.parse(localStorage.getItem('account'))||null,
        learned:[],
        taught:[],
        top:[],
        // 课程数据只以当前接口返回结果为准，不再恢复旧缓存
        assignmentDetails:[],
        course:null,
        assignmentSubmit:null,
    }),
    actions:{
        // 登录时设置用户信息（同步到 localStorage）
        setAccount(account){
            this.account=account;
            localStorage.setItem('account',JSON.stringify(account));
        },
        setLearned(learned){
            this.learned=Array.isArray(learned)?learned:[];
        },
        setTaught(taught){
            this.taught=Array.isArray(taught)?taught:[];
        },
        setTop(top){
            this.top=Array.isArray(top)?top:[];
        },
        setAssignmentDetails(assignmentDetails){
            this.assignmentDetails=Array.isArray(assignmentDetails)?assignmentDetails:[];
        },
        setCourse(course){
            this.course=course;
        },
        setAssignmentSubmit(assignmentSubmit){
            this.assignmentSubmit=assignmentSubmit;
        },
        clearLegacyCourseCache(){
            localStorage.removeItem('learned');
            localStorage.removeItem('taught');
            localStorage.removeItem('top');
            localStorage.removeItem('assignmentDetails');
            localStorage.removeItem('course');
            localStorage.removeItem('assignmentSubmit');
        },
        // 退出登录时清除用户信息
        logout(){
            console.log('logout method is called');
            this.account=null;
            localStorage.removeItem('account');
            this.learned=[];
            this.taught=[];
            this.top=[];
            this.assignmentDetails=[];
            this.course=null;
            this.assignmentSubmit=null;
            this.clearLegacyCourseCache();
            
            // 清除自动登录状态，否则退出后又会自动登录回来
            localStorage.removeItem('autoLoginPhone');
            localStorage.removeItem('autoLoginPassword');
        }
    }
})






































































































































































































































































































































































































































































































