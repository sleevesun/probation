<template>
  <div class="ps-page">
    <div class="ps-page__header">
      <div>
        <div class="ps-page__title">试用期自我评价</div>
        <div class="ps-page__subtitle">以传统表单分区展示目标回顾与员工自评输入。</div>
      </div>
    </div>

    <section class="ps-panel">
      <div class="ps-section-title">已确认目标</div>
      <table class="ps-table">
        <thead>
          <tr>
            <th>维度</th>
            <th>目标内容</th>
            <th>权重</th>
          </tr>
        </thead>
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
      <div class="ps-section-title">自评内容</div>
      <a-textarea
        v-model:value="selfEvalContent"
        :rows="8"
        placeholder="请填写试用期工作产出、亮点与待改进项"
        :disabled="record?.probation_status !== '05'"
      />

      <div class="ps-toolbar" style="margin-top: 16px">
        <div class="ps-toolbar__spacer"></div>
        <a-button size="small" @click="router.back()">返回</a-button>
        <a-button type="primary" size="small" @click="handleSubmit" :disabled="record?.probation_status !== '05'" :loading="saving">提交自评</a-button>
      </div>
    </section>

    <section class="ps-panel" v-if="historyEvals.length">
      <div class="ps-section-title">历史评价记录</div>
      <table class="ps-table">
        <thead>
          <tr>
            <th>类型</th>
            <th>评价人</th>
            <th>内容</th>
            <th>时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in historyEvals" :key="item.eval_id">
            <td>{{ item.eval_type }}</td>
            <td>{{ item.evaluator_name }}</td>
            <td>{{ item.content }}</td>
            <td>{{ item.create_time }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { useProbationStore } from '@/store/probation'

const router = useRouter()
const store = useProbationStore()
const saving = ref(false)
const selfEvalContent = ref('')
const record = computed(() => store.records.find(item => item.emp_id === store.currentEmpId))
const historyEvals = computed(() => record.value?.evaluations || [])

function handleSubmit() {
  if (!selfEvalContent.value.trim()) {
    message.error('自评内容不能为空')
    return
  }
  saving.value = true
  setTimeout(() => {
    store.submitSelfEval(record.value!.master_id, selfEvalContent.value, record.value!.emp_name)
    message.success('自评已提交')
    saving.value = false
    router.push('/employee/dashboard')
  }, 350)
}
</script>
