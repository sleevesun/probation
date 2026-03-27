<template>
  <div class="ps-page">
    <div class="ps-page__header">
      <div>
        <div class="ps-page__title">我的试用期</div>
        <div class="ps-page__subtitle">以传统员工自助页形式展示当前状态、待办事项和个人信息。</div>
      </div>
      <div class="ps-badge">当前状态：{{ statusText }}</div>
    </div>

    <div class="ps-grid ps-grid--2">
      <section class="ps-panel">
        <div class="ps-section-title">待办事项</div>
        <table class="ps-table">
          <thead>
            <tr>
              <th>事项</th>
              <th>说明</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in todoRows" :key="item.title">
              <td>{{ item.title }}</td>
              <td>{{ item.desc }}</td>
              <td>
                <a-button v-if="item.path" size="small" @click="router.push(item.path)">进入</a-button>
                <span v-else>-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="ps-panel">
        <div class="ps-section-title">员工信息</div>
        <div class="ps-form-grid">
          <div class="ps-field"><label>姓名</label><div>{{ record?.emp_name }}</div></div>
          <div class="ps-field"><label>工号</label><div>{{ record?.emp_id }}</div></div>
          <div class="ps-field"><label>岗位</label><div>{{ record?.position }}</div></div>
          <div class="ps-field"><label>部门</label><div>{{ record?.parent_dept }}\{{ record?.dept_name }}</div></div>
          <div class="ps-field"><label>直属主管</label><div>{{ record?.manager_name }}</div></div>
          <div class="ps-field"><label>入职日期</label><div>{{ record?.hire_date }}</div></div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useProbationStore } from '@/store/probation'
import { psStatusText } from '@/views/ps/shared/PSHelpers'

const router = useRouter()
const store = useProbationStore()
const record = computed(() => store.records.find(item => item.emp_id === store.currentEmpId))

const statusText = computed(() => psStatusText(record.value?.probation_status || '01'))

const todoRows = computed(() => {
  const status = record.value?.probation_status
  return [
    {
      title: '目标设定',
      desc: status === '01' || status === '02' ? '请确认并提交试用期目标。' : '目标阶段已完成。',
      path: status === '01' || status === '02' ? '/employee/goals' : ''
    },
    {
      title: '自我评价',
      desc: status === '05' ? '已进入自评阶段，请填写自评内容。' : '未到自评阶段或已提交。',
      path: status === '05' ? '/employee/self-eval' : ''
    },
    {
      title: '结果查看',
      desc: status === '10' ? '转正结果已发布，可查看状态。' : '结果尚未发布。',
      path: ''
    }
  ]
})
</script>
