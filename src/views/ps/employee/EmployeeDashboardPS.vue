<template>
  <div class="ps-page">
    <div class="ps-page__header">
      <div>
        <div class="ps-page__title">我的试用期</div>
        <div class="ps-page__subtitle">已入职 {{ daysSinceHire }} 天</div>
      </div>
      <div class="ps-badge">当前状态：{{ statusText }}</div>
    </div>

    <div class="ps-grid ps-grid--2">
      <section class="ps-panel">
        <div class="ps-section-title">当前进展</div>
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
              <td style="white-space: pre-line">{{ item.desc }}</td>
              <td>
                <a-button v-if="item.path" size="small" type="primary" @click="router.push(item.path)">{{ item.actionText || '进入' }}</a-button>
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
import { psEmployeeStatusText } from '@/views/ps/shared/PSHelpers'

const router = useRouter()
const store = useProbationStore()
const record = computed(() => store.records.find(item => item.emp_id === store.currentEmpId))

const daysSinceHire = computed(() => {
  if (!record.value) return 0
  const now = new Date()
  const hire = new Date(record.value.hire_date)
  return Math.floor((now.getTime() - hire.getTime()) / (1000 * 60 * 60 * 24))
})

const statusText = computed(() => psEmployeeStatusText(record.value?.probation_status || '01'))

const todoRows = computed(() => {
  const status = record.value?.probation_status

  switch (status) {
    case '01': {
      const isReturned = !!record.value?.return_comment
      return [{
        title: isReturned ? '目标被退回，请修改后重新提交' : '填写试用期目标',
        desc: isReturned
          ? `退回意见：${record.value.return_comment}\n请根据上级意见调整目标内容，修改完成后重新提交。`
          : '请在入职 2 周内完成试用期目标的设定并提交上级确认。',
        path: '/employee/goals',
        actionText: isReturned ? '去修改' : '进入'
      }]
    }
    case '02':
      return [
        { title: '等待上级确认目标', desc: '您的试用期目标已提交，正在等待上级确认。', path: '', actionText: '进入' }
      ]
    case '03':
    case '04':
      return [
        { title: '【进行中】目标已确认', desc: '目标已确认，等待试用期评估开启。', path: '', actionText: '进入' }
      ]
    case '05':
      return [
        { title: '填写试用期自评', desc: '转正流程已开启，请尽快完成转正自评。', path: '/employee/self-eval', actionText: '进入' }
      ]
    case '06':
    case '07':
    case '08':
    case '09':
      return [
        { title: '【进行中】试用期评估中', desc: '您的试用期评估正在进行中，请耐心等待结果。', path: '', actionText: '进入' }
      ]
    case '10': {
      const isPassed = record.value?.final_decision !== '不符合转正条件'
      return [
        { title: isPassed ? '转正通过' : '转正未通过', desc: isPassed ? '恭喜您通过试用期转正！' : '很遗憾，您未通过试用期转正。', path: '', actionText: '进入' }
      ]
    }
    default:
      return []
  }
})
</script>
