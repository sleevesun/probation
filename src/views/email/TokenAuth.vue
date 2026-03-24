<template>
  <div style="height: 100vh; display: flex; align-items: center; justify-content: center; background: #f0f2f5;">
    <a-card style="width: 400px; text-align: center; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <div v-if="loading">
        <a-spin size="large" />
        <p style="margin-top: 24px; color: #666;">正在验证访问权限，请稍候...</p>
      </div>
      <div v-else-if="error">
        <a-result
          status="error"
          title="链接已失效"
          sub-title="该访问链接可能已过期或被使用过，请重新从系统中获取。"
        >
          <template #extra>
            <a-button type="primary" @click="router.push('/')">返回首页</a-button>
          </template>
        </a-result>
      </div>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { message } from 'ant-design-vue';

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const error = ref(false);

onMounted(() => {
  const token = route.query.token as string;
  const redirect = route.query.redirect as string;

  // 模拟异步 Token 验证过程
  setTimeout(() => {
    if (token && token.startsWith('mock_token_')) {
      loading.value = false;
      message.success('Token 验证成功，正在跳转...');
      
      // 模拟根据 Token 自动切换角色的逻辑 (仅 Demo 演示)
      if (token.includes('_emp')) {
        localStorage.setItem('mock_role', 'employee');
      } else if (token.includes('_mgr')) {
        localStorage.setItem('mock_role', 'manager');
      } else if (token.includes('_hr')) {
        localStorage.setItem('mock_role', 'hrbp');
      }

      setTimeout(() => {
        router.push(redirect || '/');
      }, 500);
    } else {
      loading.value = false;
      error.value = true;
    }
  }, 1000);
});
</script>