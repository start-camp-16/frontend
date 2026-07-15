import { request } from '../../api/client.js';

export const suggestCourse = (body, { signal } = {}) => request('/api/course-suggestions', { method: 'POST', body, signal });
export const createCourse = (body, { signal } = {}) => request('/api/courses', { method: 'POST', body, signal });
export const getCourse = (publicId, { signal } = {}) => request(`/api/courses/${publicId}`, { signal });
export const updateCourse = (publicId, body, { signal } = {}) => request(`/api/courses/${publicId}`, { method: 'PUT', body, signal });
export const deleteCourse = (publicId, body, { signal } = {}) => request(`/api/courses/${publicId}`, { method: 'DELETE', body, signal });
