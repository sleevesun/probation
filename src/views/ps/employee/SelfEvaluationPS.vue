<template>
  <div class="ps-page">
    <EmployeeSwitcher />
    <div class="ps-page__header">
      <div>
        <div class="ps-page__title">试用期自我评价</div>
        <div class="ps-page__subtitle">逐目标回顾 + 总体评价。</div>
      </div>
    </div>

    <!-- 逐目标自评 -->
    <section
      v-for="(goal, index) in record?.goals || []"
      :key="goal.goal_id"
      class="ps-panel"
    >
      <div class="ps-section-title">目标 {{ index + 1 }}：{{ goal.content }}</div>
      <table class="ps-table" style="margin-bottom: 16px">
        <tbody>
          <tr>
            <th style="width: 100px">目标维度</th>
            <td>{{ goal.dimension }}</td>
          </tr>
          <tr>
            <th>衡量方式/预期结果</th>
            <td>{{ goal.measure }}</td>
          </tr>
        </tbody>
      </table>

      <!-- 目标回顾（必填） -->
      <div class="ps-section-title" style="font-size: 13px">目标回顾 <span style="color: #ff4d4f">*</span></div>
      <a-textarea
        v-model:value="goalReviews[index]"
        :rows="3"
        placeholder="请回顾该项目标的完成情况，如实际产出、关键成果等..."
        :disabled="record?.probation_status !== '05'"
        style="margin-bottom: 16px"
      />

    </section>

    <!-- 总体评价 -->
    <section class="ps-panel">
      <div class="ps-section-title">总体评价</div>
      <a-textarea
        v-model:value="overallEval"
        :rows="6"
        placeholder="请从工作产出、能力成长、团队协作等方面进行总体自评..."
        :disabled="record?.probation_status !== '05'"
      />

      <div class="ps-toolbar" style="margin-top: 16px">
        <div class="ps-toolbar__spacer"></div>
        <a-button size="small" @click="router.back()">返回</a-button>
        <a-button type="primary" size="small" @click="handleSubmit" :disabled="record?.probation_status !== '05'" :loading="saving">提交自评</a-button>
      </div>
    </section>

    <!-- 历史评价记录 -->
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
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { useProbationStore } from '@/store/probation'
import EmployeeSwitcher from '@/components/EmployeeSwitcher.vue'

const router = useRouter()
const store = useProbationStore()
const saving = ref(false)
const record = computed(() => store.records.find(item => item.emp_id === store.currentEmpId))
const historyEvals = computed(() => record.value?.evaluations || [])

// 逐目标回顾内容
const goalReviews = ref<string[]>([])
// 总体评价
const overallEval = ref('')

function initForm() {
  const goals = record.value?.goals || []
  goalReviews.value = goals.map(() => '')
  overallEval.value = ''
}

onMounted(initForm)

watch(() => store.currentEmpId, () => {
  initForm()
})

function handleSubmit() {
  const goals = record.value?.goals || []

  // 校验逐目标回顾
  for (let i = 0; i < goals.length; i++) {
    if (!goalReviews.value[i] || !goalReviews.value[i].trim()) {
      message.error(`请完成目标 ${i + 1} 的目标回顾`)
      return
    }
  }

  // 校验总体评价
  if (!overallEval.value.trim()) {
    message.error('请填写总体评价')
    return
  }

  // 组装自评内容
  const evalData = {
    goal_evaluations: goals.map((goal, i) => ({
      goal_id: goal.goal_id,
      dimension: goal.dimension,
      content: goal.content,
      goal_review: goalReviews.value[i]
    })),
    overall_eval: overallEval.value
  }

  saving.value = true
  setTimeout(() => {
    store.submitSelfEval(record.value!.master_id, JSON.stringify(evalData), record.value!.emp_name)
    message.success('自评已提交')
    saving.value = false
    router.push('/employee/dashboard')
  }, 350)
}
</script>
