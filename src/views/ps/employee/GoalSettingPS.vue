<template>
  <div class="ps-page">
    <div class="ps-page__header">
      <div>
        <div class="ps-page__title">试用期目标设定</div>
        <div class="ps-page__subtitle">采用传统表格录入方式维护考核目标与权重。</div>
      </div>
      <div class="ps-badge">权重合计：{{ totalWeight }}%</div>
    </div>

    <section class="ps-panel">
      <div class="ps-toolbar">
        <a-button size="small" @click="addGoal" :disabled="locked || formState.goals.length >= 5">新增目标</a-button>
        <div class="ps-toolbar__spacer"></div>
        <a-button size="small" @click="handleSave" :disabled="locked" :loading="saving">保存草稿</a-button>
        <a-button type="primary" size="small" @click="handleSubmit" :disabled="locked || totalWeight !== 100" :loading="saving">提交确认</a-button>
      </div>

      <table class="ps-table">
        <thead>
          <tr>
            <th>维度</th>
            <th>目标内容</th>
            <th>权重</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(goal, index) in formState.goals" :key="goal.goal_id">
            <td>
              <a-select v-model:value="goal.dimension" size="small" style="width: 120px" :disabled="locked">
                <a-select-option value="业绩">业绩</a-select-option>
                <a-select-option value="能力">能力</a-select-option>
                <a-select-option value="融入">融入</a-select-option>
              </a-select>
            </td>
            <td>
              <a-textarea v-model:value="goal.content" :rows="2" :disabled="locked" />
            </td>
            <td>
              <a-input-number v-model:value="goal.weight" size="small" :min="1" :max="100" :disabled="locked" />
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
import { computed, onMounted, reactive, ref } from 'vue'
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

onMounted(() => {
  formState.goals = JSON.parse(JSON.stringify(record.value?.goals || []))
  if (formState.goals.length === 0 && !locked.value) {
    addGoal()
  }
})

const totalWeight = computed(() => formState.goals.reduce((sum, item) => sum + (item.weight || 0), 0))

function addGoal() {
  formState.goals.push({
    goal_id: `G${Date.now()}`,
    dimension: '业绩',
    content: '',
    weight: 20
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
  if (totalWeight.value !== 100) {
    message.error('权重合计必须为 100%')
    return
  }
  if (formState.goals.some(item => !item.content.trim())) {
    message.error('请补充完整目标内容')
    return
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
