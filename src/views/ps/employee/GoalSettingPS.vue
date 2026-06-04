<template>
  <div class="ps-page">
    <div class="ps-page__header">
      <div>
        <div class="ps-page__title">试用期目标设定</div>
        <div class="ps-page__subtitle">采用传统表格录入方式维护考核目标。</div>
      </div>
    </div>

    <section class="ps-panel">
      <div class="ps-toolbar">
        <a-button size="small" @click="addGoal" :disabled="locked || formState.goals.length >= 5">新增目标</a-button>
        <div class="ps-toolbar__spacer"></div>
        <a-button size="small" @click="handleSave" :disabled="locked" :loading="saving">保存草稿</a-button>
        <a-button type="primary" size="small" @click="handleSubmit" :disabled="locked" :loading="saving">提交确认</a-button>
      </div>

      <table class="ps-table">
        <thead>
          <tr>
            <th style="width: 100px">目标维度</th>
            <th>目标内容</th>
            <th>衡量方式/预期结果</th>
            <th style="width: 110px">权重</th>
            <th style="width: 70px">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(goal, index) in formState.goals" :key="goal.goal_id">
            <td>
              <a-select v-model:value="goal.dimension" size="small" style="width: 100%" :disabled="locked">
                <a-select-option value="业绩">业绩</a-select-option>
                <a-select-option value="能力">能力</a-select-option>
                <a-select-option value="融入">融入</a-select-option>
              </a-select>
            </td>
            <td>
              <a-textarea v-model:value="goal.content" :rows="2" :disabled="locked" placeholder="请输入具体目标内容" />
            </td>
            <td>
              <a-textarea v-model:value="goal.measure" :rows="2" :disabled="locked" placeholder="请输入衡量方式或预期结果" />
            </td>
            <td>
              <a-input-number v-model:value="goal.weight" :min="1" :max="100" :disabled="locked" placeholder="%" size="small" style="width: 80px" addonAfter="%" />
            </td>
            <td>
              <a-button type="link" danger size="small" @click="removeGoal(index)" :disabled="locked">删除</a-button>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { useProbationStore, type GoalItem } from '@/store/probation'

const router = useRouter()
const store = useProbationStore()
const saving = ref(false)
const record = computed(() => store.records.find(item => item.emp_id === store.currentEmpId))
const locked = computed(() => parseInt(record.value?.probation_status || '01', 10) >= 3)

const formState = reactive({
  goals: [] as GoalItem[]
})

function initForm() {
  formState.goals = JSON.parse(JSON.stringify(record.value?.goals || []))
  if (formState.goals.length === 0 && !locked.value) {
    addGoal()
  }
}

onMounted(initForm)

watch(() => store.currentEmpId, () => {
  initForm()
})

function addGoal() {
  formState.goals.push({
    goal_id: `G${Date.now()}`,
    dimension: '业绩',
    content: '',
    measure: '',
    weight: undefined
  })
}

function removeGoal(index: number) {
  formState.goals.splice(index, 1)
}

function handleSave() {
  saving.value = true
  setTimeout(() => {
    store.saveGoals(record.value!.master_id, formState.goals, false)
    message.success('目标草稿已保存')
    saving.value = false
  }, 300)
}

function handleSubmit() {
  if (formState.goals.some(item => !item.content.trim())) {
    message.error('请补充完整目标内容')
    return
  }
  if (formState.goals.some(item => !item.measure.trim())) {
    message.error('请补充完整衡量方式/预期结果')
    return
  }
  // 权重校验
  const goalsWithWeight = formState.goals.filter(g => g.weight != null && g.weight > 0)
  if (goalsWithWeight.length > 0) {
    if (goalsWithWeight.length !== formState.goals.length) {
      message.error('若填写权重，请为所有目标均填写权重')
      return
    }
    const totalWeight = formState.goals.reduce((sum, g) => sum + (g.weight || 0), 0)
    if (totalWeight !== 100) {
      message.error(`权重合计必须为 100%，当前合计 ${totalWeight}%`)
      return
    }
  }
  saving.value = true
  setTimeout(() => {
    store.saveGoals(record.value!.master_id, formState.goals, true)
    message.success('目标已提交，等待主管确认')
    saving.value = false
    router.push('/employee/dashboard')
  }, 400)
}
</script>
