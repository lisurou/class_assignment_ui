import {defineStore} from 'pinia'
export const useUserStore=defineStore('user',{
    state:()=>({
        // 存储用户信息（初始值从 localStorage 读取，避免刷新丢失）
        account:JSON.parse(localStorage.getItem('account'))||null,
        learned:JSON.parse(localStorage.getItem('learned'))||null,
        taught:JSON.parse(localStorage.getItem('taught'))||null,
        top:JSON.parse(localStorage.getItem('top'))||null,
        //课程详细信息
        assignmentDetails:JSON.parse(localStorage.getItem('assignmentDetails'))||null,
        course:JSON.parse(localStorage.getItem('course'))||null,
        assignmentSubmit:JSON.parse(localStorage.getItem('assignmentSubmit'))||null,
    }),
    actions:{
        // 登录时设置用户信息（同步到 localStorage）
        setAccount(account){
            this.account=account;
            localStorage.setItem('account',JSON.stringify(account));
        },
        setLearned(learned){
            this.learned=learned;
            localStorage.setItem('learned',JSON.stringify(learned));
        },
        setTaught(taught){
            this.taught=taught;
            localStorage.setItem('taught',JSON.stringify(taught));
        },
        setTop(top){
            this.top=top;
            localStorage.setItem('top',JSON.stringify(top));
        },
        setAssignmentDetails(assignmentDetails){
            this.assignmentDetails=assignmentDetails;
            localStorage.setItem('assignmentDetails',JSON.stringify(assignmentDetails));
        },
        setCourse(course){
            this.course=course;
            localStorage.setItem('course',JSON.stringify(course));
        },
        setAssignmentSubmit(assignmentSubmit){
            this.assignmentSubmit=assignmentSubmit;
            localStorage.setItem('assignmentSubmit',JSON.stringify(assignmentSubmit));
        },
        // 退出登录时清除用户信息
        logout(){
            console.log('logout method is called');
            this.account=null;
            localStorage.removeItem('account');
            this.learned=null;
            localStorage.removeItem('learned');
            this.taught=null;
            localStorage.removeItem('taught');
            this.top=null;
            localStorage.removeItem('top');
            this.assignmentDetails=null;
            localStorage.removeItem('assignmentDetails');
            this.course=null;
            localStorage.removeItem('course');
            this.assignmentSubmit=null;
            localStorage.removeItem('assignmentSubmit');
            
            // 清除自动登录状态，否则退出后又会自动登录回来
            localStorage.removeItem('autoLoginPhone');
            localStorage.removeItem('autoLoginPassword');
        }
    }
})







































































































































































































































































































































































































































































































