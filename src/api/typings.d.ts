declare namespace API {
  type Account = {
    accountId?: string;
    phone?: string;
    password?: string;
    identity?: string;
    name?: string;
    school?: string;
    studentId?: string;
    college?: string;
    major?: string;
    classes?: string;
    grade?: string;
    enrollment?: string;
    email?: string;
    learned?: string;
    taught?: string;
    homeworkDue?: boolean;
    coursePrivateMessage?: boolean;
    topicReminder?: boolean;
    top?: string;
    weChat?: string;
  };

  type Assignment = {
    accountId?: string;
    id?: string;
    assignmentId?: string;
    title?: string;
    deadline?: string;
    assignmentType?: string;
    content?: string;
    totalScore?: number;
    submit?: string;
    correct?: string;
    score?: number;
    submitContent?: string;
    aiEnabled?: boolean;
    aiScore?: number;
    aiComment?: string;
  };

  type Course = {
    accountId?: string;
    id?: string;
    name?: string;
    students?: string;
    classes?: string;
    time?: string;
    number?: number;
    teacher?: string;
  };

  type CourseAndAccount = {
    accountId?: string;
    id?: string;
    assignmentId?: string;
    submitContent?: string;
    score?: number;
    assignment?: Assignment;
  };

  type CourseRequest = {
    accountId?: string;
    course?: Course;
  };

  type Result = {
    success?: boolean;
    message?: string;
    account?: Account;
    learned?: Course[];
    taught?: Course[];
    top?: Course[];
    assignments?: Assignment[];
    course?: Course;
    assignment?: Assignment;
  };
}
