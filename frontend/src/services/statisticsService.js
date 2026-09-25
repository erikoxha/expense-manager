import { api } from "./api";
export const statisticsService = {
  summary: () => api("/statistics/summary/"),
  expenses: () => api("/statistics/expenses-by-category/"),
  income: () => api("/statistics/income-by-category/"),
  monthly: () => api("/statistics/monthly/"),
  budgets: () => api("/statistics/budgets/"),
};
