import { apiRequest } from "./client";
import type { User } from "../types";

type AuthResponse = {
  accessToken: string;
  user: User;
};

type SignupResponse = {
  message: string;
  user: User;
};

export async function loginUser(email: string, password: string) {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function signupUser(
  name: string,
  email: string,
  password: string,
) {
  return apiRequest<SignupResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}
