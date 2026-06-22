// @ts-ignore
/* eslint-disable */
import request from "@/libs/request";

/** 此处后端没有提供注释 POST /assignment-details */
export async function assignmentDetails(
  body: API.CourseAndAccount,
  options?: { [key: string]: any }
) {
  return request<API.Result>("/assignment-details", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 此处后端没有提供注释 POST /assignment-submit */
export async function assignmentSubmit(
  body: API.CourseAndAccount,
  options?: { [key: string]: any }
) {
  return request<API.Result>("/assignment-submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 此处后端没有提供注释 POST /cancel-top */
export async function cancelTop(
  body: Record<string, any>,
  options?: { [key: string]: any }
) {
  return request<API.Result>("/cancel-top", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 此处后端没有提供注释 POST /change-basic-information */
export async function changeBasicInformation(
  body: API.Account,
  options?: { [key: string]: any }
) {
  return request<API.Result>("/change-basic-information", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 此处后端没有提供注释 POST /change-identity */
export async function changeIdentity(
  body: API.Account,
  options?: { [key: string]: any }
) {
  return request<API.Result>("/change-identity", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 此处后端没有提供注释 POST /change-password */
export async function changePassword(
  body: API.Account,
  options?: { [key: string]: any }
) {
  return request<API.Result>("/change-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 此处后端没有提供注释 POST /change-phone */
export async function changePhone(
  body: API.Account,
  options?: { [key: string]: any }
) {
  return request<API.Result>("/change-phone", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 此处后端没有提供注释 POST /check-assignment-submit */
export async function checkAssignmentSubmit(
  body: API.CourseAndAccount,
  options?: { [key: string]: any }
) {
  return request<API.Result>("/check-assignment-submit", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 此处后端没有提供注释 POST /correct-assignment */
export async function correctAssignment(
  body: API.CourseAndAccount,
  options?: { [key: string]: any }
) {
  return request<API.Result>("/correct-assignment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 此处后端没有提供注释 POST /create-course */
export async function createCourse(
  body: API.CourseRequest,
  options?: { [key: string]: any }
) {
  return request<API.Result>("/create-course", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 此处后端没有提供注释 POST /join-course */
export async function joinCourse(
  body: Record<string, any>,
  options?: { [key: string]: any }
) {
  return request<API.Result>("/join-course", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 此处后端没有提供注释 POST /login */
export async function login(
  body: API.Account,
  options?: { [key: string]: any }
) {
  return request<API.Result>("/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 此处后端没有提供注释 POST /register */
export async function register(
  body: API.Account,
  options?: { [key: string]: any }
) {
  return request<API.Result>("/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 此处后端没有提供注释 POST /release-assignment */
export async function releaseAssignment(
  body: API.CourseAndAccount,
  options?: { [key: string]: any }
) {
  return request<API.Result>("/release-assignment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}

/** 此处后端没有提供注释 POST /top */
export async function updateTop(
  body: Record<string, any>,
  options?: { [key: string]: any }
) {
  return request<API.Result>("/top", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    data: body,
    ...(options || {}),
  });
}
