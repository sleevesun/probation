<template>
  <div class="ps-page">
    <div class="ps-page__header">
      <div>
        <div class="ps-page__title">转正评估</div>
        <div class="ps-page__subtitle">列表进入详情页的传统评估模式，按信息区块展示考核依据与主管决策。</div>
      </div>
      <a-button size="small" @click="router.push('/manager/team')">返回列表</a-button>
    </div>

    <section class="ps-panel">
      <div class="ps-alert" :class="cannotEval ? 'ps-alert--warning' : 'ps-alert--info'">
        {{ cannotEval ? readonlyHint : '当前记录可进行主管评估，提交后将等待 HRBP 完成评价。' }}
      </div>
    </section>

    <section class="ps-panel">
      <div class="ps-section-title">员工信息</div>
      <div class="ps-form-grid">
        <div class="ps-field"><label>姓名</label><div>{{ record?.emp_name }}</div></div>
        <div class="ps-field"><label>工号</label><div>{{ record?.emp_id }}</div></div>
        <div class="ps-field"><label>岗位</label><div>{{ record?.position }}</div></div>
        <div class="ps-field"><label>部门</label><div>{{ record?.parent_dept }}\{{ record?.dept_name }}</div></div>
      </div>
    </section>

    <section class="ps-panel">
      <div class="ps-section-title">考核目标</div>
      <table class="ps-table">
        <thead><tr><th>维度</th><th>内容</th><th>权重</th></tr></thead>
        <tbody>
          <tr v-for="goal in record?.goals || []" :key="goal.goal_id">
            <td>{{ goal.dimension }}</td>
            <td>{{ goal.content }}</td>
            <td>{{ goal.weight }}%</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="ps-panel">
      <div class="ps-section-title">员工自评与历史评价</div>
      <table class="ps-table">
        <thead><tr><th>类型</th><th>评价人</th><th>内容</th><th>时间</th></tr></thead>
        <tbody>
          <tr v-for="item in record?.evaluations || []" :key="item.eval_id">
            <td>{{ psEvalTypeLabel(item.eval_type) }}</td>
            <td>{{ item.evaluator_name }}</td>
            <td>{{ item.content }}</td>
            <td>{{ item.create_time }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="ps-panel">
      <div class="ps-section-title">主管评估</div>
      <div class="ps-filter-bar">
        <label>结论</label>
        <a-radio-group v-model:value="decision" :disabled="cannotEval">
          <a-radio value="超出预期">超出预期</a-radio>
          <a-radio value="符合预期">符合预期</a-radio>
          <a-radio value="不符合录用条件">不符合录用条件</a-radio>
        </a-radio-group>
      </div>
      <a-textarea v-model:value="reason" :rows="6" :disabled="cannotEval" placeholder="填写主管评估意见" />
      <div class="ps-toolbar" style="margin-top: 16px">
        <div class="ps-toolbar__spacer"></div>
        <a-button size="small" @click="router.push('/manager/team')">取消</a-button>
        <a-button type="primary" size="small" :disabled="cannotEval" :loading="saving" @click="handleSubmit">提交评估</a-button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { useProbationStore } from '@/store/probation'
import { psEvalTypeLabel } from '@/views/ps/shared/PSHelpers'

const route = useRoute()
const router = useRouter()
const store = useProbationStore()
const saving = ref(false)

const record = computed(() => store.records.find(item => item.master_id === route.params.id))
const cannotEval = computed(() => !record.value || record.value.probation_status !== '06' || record.value.manager_eval_done)
const readonlyHint = computed(() => {
  if (!record.value) return '未找到对应记录。'
  if (record.value.manager_eval_done) return '该记录已完成主管评估，目前为只读状态。'
  return `当前状态为 ${record.value.probation_status}，暂不可提交主管评估。`
})
const decision = ref<'超出预期' | '符合预期' | '不符合录用条件'>('符合预期')
const reason = ref('')

function handleSubmit() {
  if (decision.value === '不符合录用条件' && !reason.value.trim()) {
    message.error('不符合录用条件时必须填写说明')
    return
  }
  saving.value = true
  setTimeout(() => {
    store.submitManagerEval(record.value!.master_id, reason.value || '主管评估通过', decision.value)
    message.success('主管评估已提交')
    saving.value = false
    router.push('/manager/team')
  }, 350)
}
</script>
