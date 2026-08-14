<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { getToken, getAdminToken, clearAuth, clearAdminAuth } from './api/client.js';

const router = useRouter();
const isLoggedIn = computed(() => Boolean(getToken()));
const isAdmin = computed(() => Boolean(getAdminToken()));

function logout() {
  clearAuth();
  router.push('/');
}

function logoutAdmin() {
  clearAdminAuth();
  router.push('/');
}
</script>

<template>
  <header class="navbar">
    <div class="navbar-inner">
      <router-link to="/" class="brand">港拼代購</router-link>
      <nav class="nav-links">
        <router-link v-if="isAdmin" to="/admin" class="link">管理後台</router-link>
        <template v-else>
          <router-link to="/" class="link">首頁</router-link>
          <router-link v-if="isLoggedIn" to="/orders" class="link">我的訂單</router-link>
          <router-link v-if="!isLoggedIn" to="/login" class="link">登入</router-link>
          <router-link v-if="!isLoggedIn" to="/register" class="link">註冊</router-link>
          <a v-else class="link" href="#" @click.prevent="logout">登出</a>
        </template>
        <router-link v-if="!isAdmin" to="/admin/login" class="link muted">管理員入口</router-link>
        <a v-if="isAdmin" class="link muted" href="#" @click.prevent="logoutAdmin">登出後台</a>
      </nav>
    </div>
  </header>
  <main class="container">
    <router-view />
  </main>
</template>
